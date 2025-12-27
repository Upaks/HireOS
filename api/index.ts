// Vercel serverless function handler
// @ts-ignore - Vercel provides @vercel/node types at runtime
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import without .ts extension - Vercel will resolve TypeScript automatically
// The includeFiles in vercel.json ensures server files are available
import appInstance, { initApp as initAppFn } from '../server/index';

// Initialize app state (shared across invocations in the same container)
let initialized = false;
let initPromise: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize app (only once per container)
    if (!initialized) {
      if (!initPromise) {
        initPromise = initAppFn();
      }
      await initPromise;
      initialized = true;
    }
    
    // Vercel rewrites /api/* to /api/index.mjs, but Express needs the full path
    // Preserve the original path from the request
    const expressReq = req as any;
    if (expressReq.url && !expressReq.url.startsWith('/api')) {
      expressReq.url = '/api' + expressReq.url;
    }
    if (expressReq.originalUrl && !expressReq.originalUrl.startsWith('/api')) {
      expressReq.originalUrl = '/api' + expressReq.originalUrl;
    }
    if (expressReq.path && !expressReq.path.startsWith('/api')) {
      expressReq.path = '/api' + expressReq.path;
    }
    
    // Handle request with Express app
    return new Promise<void>((resolve) => {
      try {
        appInstance(req as any, res as any, (err?: any) => {
          if (err) {
            console.error('[API] Error:', err);
            if (!res.headersSent) {
              res.status(500).json({ 
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
              });
            }
          }
          resolve();
        });
      } catch (error) {
        console.error('[API] Execution error:', error);
        if (!res.headersSent) {
          res.status(500).json({ 
            message: 'Handler execution failed',
            error: error instanceof Error ? error.message : String(error)
          });
        }
        resolve();
      }
    });
  } catch (error) {
    console.error('[API] Initialization error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Server initialization failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
