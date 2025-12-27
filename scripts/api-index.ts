// Vercel serverless function - uses serverless-http to wrap Express app
import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';

// Import server code - will be bundled by build script
import app, { initApp } from '../server/index';

let handler: any = null;

export default async function (req: VercelRequest, res: VercelResponse) {
  // Initialize app and create handler on first request
  if (!handler) {
    await initApp();
    // Configure serverless-http to preserve the request path
    handler = serverless(app, {
      binary: ['image/*', 'application/pdf'],
    });
  }
  
  return handler(req, res);
}
