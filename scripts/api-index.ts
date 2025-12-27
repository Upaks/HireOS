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
          console.log('Serverless handler created');
        } catch (error) {
          console.error('Failed to initialize app:', error);
          console.error('Error stack:', error instanceof Error ? error.stack : String(error));
          initPromise = null; // Reset on error so we can retry
          throw error;
        }
      })();
    }
    try {
      await initPromise;
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
    res.status(500).json({ error: 'Handler not initialized' });
    return;
  }
  
  try {
    const result = await handler(req, res);
    return result;
  } catch (error) {
    console.error('Error in handler:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
