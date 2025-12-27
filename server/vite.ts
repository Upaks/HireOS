import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";

// Dynamic import for vite - only load when actually needed (not on Vercel)
// This prevents vite and rollup from being bundled into the serverless function
let viteModule: typeof import("vite") | null = null;
let viteConfig: any = null;

export async function setupVite(app: Express, server: Server) {
  // Dynamically import vite only when needed (not on Vercel)
  // This is never called on Vercel, so vite won't be bundled
  if (!viteModule) {
    viteModule = await import("vite");
    viteConfig = (await import("../vite.config")).default;
  }

  const serverOptions: any = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const viteLogger = viteModule.createLogger();

  const vite = await viteModule.createServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
