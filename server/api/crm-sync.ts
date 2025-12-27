import { Express, Request, Response } from 'express';
import { syncGHLContacts, previewGHLSync, executeGHLSync } from '../ghl-sync';
import { previewAirtableSync, executeAirtableSync, createAirtableCandidatesWithJobs } from '../airtable-sync';
import { previewGoogleSheetsSync, executeGoogleSheetsSync, createGoogleSheetsCandidatesWithJobs } from '../google-sheets-sync';
import { storage } from '../storage';

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Generic CRM sync handler that routes to the appropriate CRM sync function
 */
export function setupCRMSyncRoutes(app: Express) {
  // Preview CRM sync (dry run) - generic endpoint
  app.get('/api/crm-sync/:platformId/preview', requireAuth, async (req: Request, res: Response) => {
    try {
      const { platformId } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found' });
      }

      // Verify the integration exists and belongs to the user
      const integration = await storage.getPlatformIntegration(platformId, userId);
      if (!integration || integration.status !== 'connected') {
        return res.status(404).json({ 
          error: `CRM integration "${platformId}" not found or not connected` 
        });
      }

      // Route to appropriate sync function based on platform
      let result;
      if (platformId === 'ghl') {
        result = await previewGHLSync(userId);
      } else if (platformId === 'airtable') {
        result = await previewAirtableSync(userId);
      } else if (platformId === 'google-sheets') {
        result = await previewGoogleSheetsSync(userId);
      } else {
        return res.status(400).json({ 
          error: `Sync not yet implemented for platform: ${platformId}` 
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error('Preview CRM sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to preview CRM sync',
        error: error.message
      });
    }
  });

  // Execute CRM sync - generic endpoint
  app.post('/api/crm-sync/:platformId/execute', requireAuth, async (req: Request, res: Response) => {
    try {
      const { platformId } = req.params;
      const userId = (req.user as any)?.id;
      const { selectedContactIds, skipNewCandidates } = req.body; // Optional: array of contact IDs to create, skipNewCandidates to only process existing

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found' });
      }

      // Verify the integration exists and belongs to the user
      const integration = await storage.getPlatformIntegration(platformId, userId);
      if (!integration || integration.status !== 'connected') {
        return res.status(404).json({ 
          error: `CRM integration "${platformId}" not found or not connected` 
        });
      }

      // Route to appropriate sync function based on platform
      let result;
      if (platformId === 'ghl') {
        result = await executeGHLSync(userId);
      } else if (platformId === 'airtable') {
        result = await executeAirtableSync(userId, selectedContactIds, skipNewCandidates);
      } else if (platformId === 'google-sheets') {
        result = await executeGoogleSheetsSync(userId, selectedContactIds, skipNewCandidates);
      } else {
        return res.status(400).json({ 
          error: `Sync not yet implemented for platform: ${platformId}` 
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error('Execute CRM sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute CRM sync',
        error: error.message
      });
    }
  });

  // Create new candidates with job assignments
  app.post('/api/crm-sync/:platformId/create-candidates', requireAuth, async (req: Request, res: Response) => {
    try {
      const { platformId } = req.params;
      const userId = (req.user as any)?.id;
      const { assignments } = req.body; // Array of { contactId: string, jobId: number | null }

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found' });
      }

      // Verify the integration exists and belongs to the user
      const integration = await storage.getPlatformIntegration(platformId, userId);
      if (!integration || integration.status !== 'connected') {
        return res.status(404).json({ 
          error: `CRM integration "${platformId}" not found or not connected` 
        });
      }

      // Route to appropriate function based on platform
      if (platformId === 'airtable') {
        const result = await createAirtableCandidatesWithJobs(userId, assignments);
        res.json(result);
      } else if (platformId === 'google-sheets') {
        const result = await createGoogleSheetsCandidatesWithJobs(userId, assignments);
        res.json(result);
      } else {
        return res.status(400).json({ 
          error: `Create candidates not yet implemented for platform: ${platformId}` 
        });
      }
    } catch (error: any) {
      console.error('Create candidates error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create candidates',
        error: error.message
      });
    }
  });
}

