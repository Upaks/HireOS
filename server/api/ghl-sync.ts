import { Express, Request, Response } from 'express';
import { syncGHLContacts, previewGHLSync, executeGHLSync } from '../ghl-sync';

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function setupGHLSyncRoutes(app: Express) {
  // Preview GHL sync (dry run)
  app.get('/api/ghl-sync/preview', requireAuth, async (req: Request, res: Response) => {
    try {
      // Set timeout for response
      const timeoutMs = 120000; // 2 minutes
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
      });

      const result = await Promise.race([
        previewGHLSync(),
        timeoutPromise
      ]);

      res.json(result);
    } catch (error: any) {
      console.error('Preview GHL sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to preview GHL sync',
        error: error.message
      });
    }
  });

  // Execute GHL sync
  app.post('/api/ghl-sync/execute', requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await executeGHLSync();
      res.json(result);
    } catch (error: any) {
      console.error('Execute GHL sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute GHL sync',
        error: error.message
      });
    }
  });

  // Manual sync with dry run option
  app.post('/api/ghl-sync/sync', requireAuth, async (req: Request, res: Response) => {
    try {
      const { dryRun = false } = req.body;
      const result = await syncGHLContacts(dryRun);
      res.json(result);
    } catch (error: any) {
      console.error('Manual GHL sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync GHL contacts',
        error: error.message
      });
    }
  });
}