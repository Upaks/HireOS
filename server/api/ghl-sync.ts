import { Express, Request, Response } from 'express';
import { syncGHLContacts, previewGHLSync, executeGHLSync } from '../ghl-sync';

export function setupGHLSyncRoutes(app: Express) {
  // Preview GHL sync (dry run)
  app.get('/api/ghl-sync/preview', async (req: Request, res: Response) => {
    try {
      const result = await previewGHLSync();
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
  app.post('/api/ghl-sync/execute', async (req: Request, res: Response) => {
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
  app.post('/api/ghl-sync/sync', async (req: Request, res: Response) => {
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