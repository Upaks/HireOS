// Vercel serverless function handler
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app, { initApp } from '../server/index';

// Initialize app on first request
let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!initialized) {
    await initApp();
    initialized = true;
  }
  return app(req, res);
}

