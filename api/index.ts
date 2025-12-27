// Vercel serverless function - uses serverless-http to wrap Express app
// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore  
import serverless from 'serverless-http';

// Import server code - Vercel will bundle this automatically
import app, { initApp } from '../server/index';

let handler: any = null;

export default async function (req: VercelRequest, res: VercelResponse) {
  // Initialize app and create handler on first request
  if (!handler) {
    await initApp();
    handler = serverless(app);
  }
  
  return handler(req, res);
}
