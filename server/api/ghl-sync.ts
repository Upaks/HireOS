import { Express, Request, Response } from 'express';
import { syncGHLContacts, previewGHLSync, executeGHLSync } from '../ghl-sync';
import { updateCandidateInGHL } from '../ghl-integration';
import { storage } from '../storage';

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

  // Update specific candidate in GHL
  app.post('/api/ghl-sync/update-candidate/:candidateId', requireAuth, async (req: Request, res: Response) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      
      if (isNaN(candidateId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid candidate ID'
        });
      }

      // Get candidate from database
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({
          success: false,
          message: 'Candidate not found'
        });
      }

      // Check if candidate has GHL contact ID
      if (!candidate.ghlContactId) {
        return res.status(400).json({
          success: false,
          message: 'Candidate does not have a GHL contact ID. Run sync first.'
        });
      }

      // Get job details if available
      if (candidate.jobId) {
        const job = await storage.getJob(candidate.jobId);
        if (job) {
          (candidate as any).job = job;
        }
      }

      // Update candidate in GHL
      const result = await updateCandidateInGHL(candidate);

      res.json({
        success: true,
        message: 'Candidate updated successfully in GHL',
        data: {
          candidateId: candidate.id,
          candidateName: candidate.name,
          ghlContactId: candidate.ghlContactId,
          result
        }
      });
    } catch (error: any) {
      console.error('Update candidate in GHL error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update candidate in GHL',
        error: error.message
      });
    }
  });
}