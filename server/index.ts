// Configure DNS to prefer IPv4 FIRST (before any network imports)
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

// SECURITY FIX: Only disable TLS validation in development for local testing
// In production, proper SSL certificates must be used
if (process.env.NODE_ENV !== 'production' && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  console.warn('⚠️  WARNING: TLS certificate validation disabled in development mode only');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
} else if (process.env.NODE_ENV === 'production') {
  // Force TLS validation in production
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  console.log('✅ TLS certificate validation enabled for production');
}

import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
// Import log and serveStatic from utils (no vite dependency)
import { serveStatic, log } from "./utils";
import axios from 'axios';
import { backgroundSyncService } from "./background-sync";
import helmet from "helmet";
import { apiRateLimiter } from "./security/rate-limit";
import { SecureLogger } from "./security/logger";
import { sanitizeForLogging } from "./security/sanitize";
import { csrfTokenMiddleware, csrfProtection } from "./security/csrf";

const app = express();

// Trust proxy for correct protocol detection (needed for ngrok, production, etc.)
app.set("trust proxy", 1);

// SECURITY: Add security headers
// Relaxed CSP in development to allow Vite HMR and development tools
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for UI components
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
    },
  } : false, // Disable strict CSP in development
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// SECURITY: Add rate limiting to all API routes
app.use("/api", apiRateLimiter);

// SECURITY: Add request size limits to prevent DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// SECURITY: Add CSRF token middleware (before routes)
// NOTE: Currently disabled until frontend is updated to send CSRF tokens
// To enable: Set ENABLE_CSRF=true in environment variables
if (process.env.ENABLE_CSRF === 'true') {
  app.use(csrfTokenMiddleware);
}

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
      // SECURITY: Sanitize response before logging
      const sanitizedResponse = capturedJsonResponse 
        ? sanitizeForLogging(capturedJsonResponse)
        : undefined;
      
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (sanitizedResponse) {
        const responseStr = JSON.stringify(sanitizedResponse);
        if (responseStr.length > 200) {
          logLine += ` :: ${responseStr.slice(0, 199)}…`;
        } else {
          logLine += ` :: ${responseStr}`;
        }
      }

      // Use secure logger for API requests
      if (res.statusCode >= 400) {
        SecureLogger.error(`API ${req.method} ${path}`, { status: res.statusCode, duration });
      } else {
        SecureLogger.debug(`API ${req.method} ${path}`, { status: res.statusCode, duration });
      }
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
    SecureLogger.error('Error sending message to Slack', { error: error instanceof Error ? error.message : String(error) });
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
    // SECURITY: Don't expose internal error messages in production
    const message = process.env.NODE_ENV === 'production' 
      ? (status >= 500 ? "Internal Server Error" : err.message || "An error occurred")
      : (err.message || "Internal Server Error");
    
    // SECURITY: Log error server-side (sanitized)
    SecureLogger.error("Unhandled error", { 
      status, 
      path: _req.path, 
      method: _req.method,
      error: err.message 
    });
    
    res.status(status).json({ message });
  });

  // ✅ Setup Vite or serve static (ALWAYS last!)
  // On Vercel, static files are served automatically, so we skip this
  // NOTE: setupVite is never called on Vercel, so vite.ts is not imported
  // This prevents vite/rollup from being bundled into the serverless function
  if (process.env.VERCEL !== "1") {
    if (app.get("env") === "development") {
      // Only import setupVite in non-Vercel development environment
      // Using eval to prevent static analysis by esbuild
      // eslint-disable-next-line no-eval
      const viteModule = await eval('import("./vite")');
      await viteModule.setupVite(app, server);
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
