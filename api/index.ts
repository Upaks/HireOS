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
    
    // Vercel rewrites /api/* to /api/index.mjs
    // The original request URL should be in req.url
    const expressReq = req as any;
    
    // Log the incoming request for debugging
    console.log('[API Handler] Incoming request:', {
      method: req.method,
      url: expressReq.url,
      path: expressReq.path,
      originalUrl: expressReq.originalUrl,
      query: req.query
    });
    
    // Vercel should preserve the original URL, but ensure it has /api prefix
    const originalPath = expressReq.url || expressReq.path || req.url || '/';
    const apiPath = originalPath.startsWith('/api') ? originalPath : '/api' + (originalPath.startsWith('/') ? originalPath : '/' + originalPath);
    
    // Set Express request properties
    expressReq.url = apiPath;
    expressReq.originalUrl = apiPath;
    expressReq.path = apiPath.split('?')[0];
    expressReq.baseUrl = '';
    
    console.log('[API Handler] Processed path:', apiPath);
    
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
