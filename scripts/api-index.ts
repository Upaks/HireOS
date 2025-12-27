// Vercel serverless function - calls Express app directly
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import server code - will be bundled by build script
import app, { initApp } from '../server/index';

let appInitialized = false;
let initPromise: Promise<void> | null = null;

export default async function (req: VercelRequest, res: VercelResponse) {
  // Initialize app on first request
  if (!appInitialized) {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          await initApp();
          appInitialized = true;
        } catch (error) {
          console.error('Failed to initialize app:', error);
          throw error;
        }
      })();
    }
    try {
      await initPromise;
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to initialize server',
        message: error instanceof Error ? error.message : String(error)
      });
      return;
    }
  }
  
  // Call Express app directly - it handles the request/response
  return new Promise((resolve, reject) => {
    app(req as any, res as any, (err?: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}
