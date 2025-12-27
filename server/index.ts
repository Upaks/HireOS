// Configure DNS to prefer IPv4 FIRST (before any network imports)
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

// Disable TLS certificate validation for Supabase connections
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import axios from 'axios';
import { backgroundSyncService } from "./background-sync";

const app = express();

// Trust proxy for correct protocol detection (needed for ngrok, production, etc.)
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// ✅ Define this before anything else that could override it
app.post('/send-message', async (req, res) => {
  const { message } = req.body;

  if (!process.env.SLACK_WEBHOOK) {
    return res.status(500).json({ success: false, error: 'Slack webhook not configured' });
  }

  try {
    await axios.post(process.env.SLACK_WEBHOOK, {
      text: message,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending message to Slack:', error);
    res.status(500).json({ success: false, error: 'Failed to send message to Slack' });
  }
});

// Initialize app (async)
let appInitialized = false;
const initApp = async () => {
  if (appInitialized) return;
  
  // ✅ Register all other routes
  const server = await registerRoutes(app);

  // ✅ Global error handler (keep it after route registration)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // ✅ Setup Vite or serve static (ALWAYS last!)
  // On Vercel, static files are served automatically, so we skip this
  if (process.env.VERCEL !== "1") {
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  }

  // ✅ Start the server (only in non-Vercel environments)
  if (process.env.VERCEL !== "1") {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
      
      // Start background sync service for two-way sync
      // Checks every 5 minutes for changes in Google Sheets/Airtable
      const syncInterval = process.env.CRM_SYNC_INTERVAL_MS 
        ? parseInt(process.env.CRM_SYNC_INTERVAL_MS) 
        : 1 * 60 * 1000; // Default: 1 minute
      
      backgroundSyncService.start(syncInterval);
      log(`Background sync service started (interval: ${syncInterval / 1000}s)`);
    });
  }
  
  appInitialized = true;
};

// Initialize immediately if not on Vercel
if (process.env.VERCEL !== "1") {
  initApp();
}

// Export app and init function for Vercel
export default app;
export { initApp };
