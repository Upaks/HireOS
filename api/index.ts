// Vercel serverless function handler
// @ts-ignore - Vercel provides @vercel/node types at runtime
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import server app - Vercel will handle TypeScript compilation
// Use dynamic import to ensure it works in serverless environment
let serverModule: { default: any; initApp: () => Promise<void> } | null = null;
let app: any;
let initApp: () => Promise<void>;

// Initialize app on first request
let initialized = false;
let initPromise: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Load server module if not already loaded
    if (!serverModule) {
      // Try importing without extension first (Vercel handles this)
      try {
        serverModule = await import('../server/index');
      } catch (error) {
        // Fallback: try with .ts extension
        console.error('Import without extension failed, trying with .ts:', error);
        serverModule = await import('../server/index.ts');
      }
      app = serverModule.default;
      initApp = serverModule.initApp;
    }
    
    // Ensure initialization happens only once, even with concurrent requests
    if (!initialized) {
      if (!initPromise) {
        initPromise = initApp();
      }
      await initPromise;
      initialized = true;
    }
    
    // Convert Vercel request/response to Express-compatible format
    return new Promise<void>((resolve, reject) => {
      try {
        app(req as any, res as any, (err?: any) => {
          if (err) {
            console.error('Express error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (error) {
        console.error('Handler error:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('Initialization error:', error);
    res.status(500).json({ 
      message: 'Server initialization failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

