// Vercel serverless function - uses serverless-http to wrap Express app
import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';

// Import server code - will be bundled by build script
import app, { initApp } from '../server/index';

let handler: any = null;
let initPromise: Promise<void> | null = null;

export default async function (req: VercelRequest, res: VercelResponse) {
  console.log(`[API] ${req.method} ${req.url}`);
  
  // Initialize app and create handler on first request
  // Use a promise to ensure only one initialization happens at a time
  if (!handler) {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          console.log('Initializing app...');
          await initApp();
          console.log('App initialized, creating serverless handler...');
          handler = serverless(app, {
            binary: ['image/*', 'application/pdf'],
          });
          console.log('Serverless handler created, type:', typeof handler);
        } catch (error) {
          console.error('Failed to initialize app:', error);
          console.error('Error stack:', error instanceof Error ? error.stack : String(error));
          initPromise = null; // Reset on error so we can retry
          throw error;
        }
      })();
    }
    try {
      console.log('Waiting for initialization...');
      await initPromise;
      console.log('Initialization complete, handler exists:', !!handler);
    } catch (error) {
      console.error('Error during initialization:', error);
      res.status(500).json({ 
        error: 'Failed to initialize server',
        message: error instanceof Error ? error.message : String(error)
      });
      return;
    }
  }
  
  if (!handler) {
    console.error(`[API] Handler is null for ${req.method} ${req.url}`);
    res.status(500).json({ error: 'Handler not initialized' });
    return;
  }
  
  console.log(`[API] Handler exists, calling for ${req.method} ${req.url}`);
  try {
    const result = await handler(req, res);
    console.log(`[API] Handler returned for ${req.method} ${req.url}, headersSent: ${res.headersSent}, statusCode: ${res.statusCode}`);
    return result;
  } catch (error) {
    console.error(`[API] Error in handler for ${req.method} ${req.url}:`, error);
    console.error('Error stack:', error instanceof Error ? error.stack : String(error));
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
