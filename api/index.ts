// Vercel serverless function handler for Express app
// This file is bundled to api/index.js during build
// @ts-ignore - Vercel provides @vercel/node at runtime
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - Will be installed
import serverless from 'serverless-http';
import app, { initApp } from '../server/index';

// Initialize app once
let appInitialized = false;
let serverlessHandler: any = null;

async function getHandler() {
  if (!appInitialized) {
    await initApp();
    appInitialized = true;
    // Create serverless handler after app is initialized
    serverlessHandler = serverless(app);
  }
  return serverlessHandler;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const handler = await getHandler();
  return handler(req, res);
}
