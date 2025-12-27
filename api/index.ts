// Vercel serverless function handler
// This uses static imports so Vercel can properly bundle all dependencies
// @ts-ignore - Vercel provides @vercel/node types at runtime
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Static import - Vercel will bundle all dependencies
// Don't use .ts extension - Vercel handles TypeScript natively
import app, { initApp } from '../server/index';

// Initialize app state
let initialized = false;
let initPromise: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize app (only once, even with concurrent requests)
    if (!initialized) {
      if (!initPromise) {
        initPromise = initApp();
      }
      await initPromise;
      initialized = true;
    }
    
    // Handle the request using Express app
    // Convert Vercel request/response to Express format
    return new Promise<void>((resolve, reject) => {
      try {
        app(req as any, res as any, (err?: any) => {
          if (err) {
            console.error('Express middleware error:', err);
            if (!res.headersSent) {
              res.status(500).json({ 
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
              });
            }
            resolve(); // Always resolve to prevent hanging
          } else {
            resolve();
          }
        });
      } catch (error) {
        console.error('Handler execution error:', error);
        if (!res.headersSent) {
          res.status(500).json({ 
            message: 'Handler execution failed',
            error: error instanceof Error ? error.message : String(error)
          });
        }
        resolve(); // Always resolve to prevent hanging
      }
    });
  } catch (error) {
    console.error('Handler initialization error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Server initialization failed',
        error: error instanceof Error ? error.message : String(error),
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  }
}
