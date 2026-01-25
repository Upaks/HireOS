import { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { handleApiError, validateRequest, getActiveAccountId } from "./utils";
import { createNotification } from "./notifications";
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from "./google-calendar";

export function setupInterviewRoutes(app: Express) {
  // Create a new interview
  app.post("/api/interviews", validateRequest(
    z.object({
      candidateId: z.number(),
      scheduledDate: z.string().optional(),
      interviewerId: z.number().optional(),
      type: z.string(),
      videoUrl: z.string().optional(),
      notes: z.string().optional()
    })
  ), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const scheduledDate = req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined;
      
      const interview = await storage.createInterview({
        accountId,
        candidateId: req.body.candidateId,
        scheduledDate,
        interviewerId: req.body.interviewerId || req.user?.id,
        type: req.body.type,
        videoUrl: req.body.videoUrl,
        notes: req.body.notes,
        status: "scheduled"
      });
      
      // Update candidate status if needed
      const candidate = await storage.getCandidate(req.body.candidateId, accountId);
      if (candidate && candidate.status !== "interview_scheduled") {
        await storage.updateCandidate(req.body.candidateId, accountId, {
          status: "interview_scheduled"
        });
      }
      
      // Create in-app notification for interview scheduled
      if (req.user?.id && candidate && scheduledDate) {
        try {
          const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
          const jobTitle = job?.title || "position";
          await createNotification(
            req.user.id,
            "interview_scheduled",
            "Interview Scheduled",
            `Interview scheduled: ${candidate.name} (${jobTitle}) on ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}`,
            `/candidates`,
            { candidateId: candidate.id, jobId: job?.id, interviewId: interview.id }
          );
        } catch (error) {
          console.error("[Interview] Failed to create notification:", error);
          // Don't fail the interview creation if notification fails
        }
      }

      // Trigger workflow for interview scheduled
      try {
        const { triggerWorkflows } = await import("../workflow-engine");
        const job = candidate?.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
        await triggerWorkflows("interview_scheduled", {
          entityType: "interview",
          entityId: interview.id,
          interview,
          candidate,
          job,
          user: req.user,
        }, accountId);
      } catch (error) {
        console.error("[Interview Create] Workflow trigger error:", error);
        // Don't fail the request if workflow trigger fails
      }

      // Create Google Calendar event if Google Calendar is connected
      if (req.user?.id && scheduledDate && candidate) {
        try {
          const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
          const interviewer = interview.interviewerId ? await storage.getUser(interview.interviewerId) : null;
          
          await createGoogleCalendarEvent(req.user.id, {
            id: interview.id,
            candidateId: candidate.id,
            scheduledDate,
            type: interview.type,
            videoUrl: interview.videoUrl || undefined,
            candidate: {
              name: candidate.name,
              email: candidate.email,
            },
            job: job ? { title: job.title } : undefined,
            interviewer: interviewer ? {
              fullName: interviewer.fullName,
              email: interviewer.email,
            } : undefined,
          });
        } catch (error) {
          console.error("[Interview] Failed to create Google Calendar event:", error);
          // Don't fail the interview creation if calendar event fails
        }
      }

      // Log activity
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Scheduled interview",
        entityType: "interview",
        entityId: interview.id,
        details: { 
          candidateId: req.body.candidateId,
          candidateName: candidate?.name,
          scheduledDate: scheduledDate?.toISOString() 
        },
        timestamp: new Date()
      });

      res.status(201).json(interview);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get all interviews with optional filtering
  app.get("/api/interviews", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const candidateId = req.query.candidateId ? parseInt(req.query.candidateId as string) : undefined;
      const interviewerId = req.query.interviewerId ? parseInt(req.query.interviewerId as string) : undefined;
      const status = req.query.status as string | undefined;
      
      const interviews = await storage.getInterviews(accountId, {
        candidateId,
        interviewerId,
        status
      });
      
      res.json(interviews);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get a specific interview by ID
  app.get("/api/interviews/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }

      const interview = await storage.getInterview(interviewId, accountId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      res.json(interview);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Update an interview
  app.patch("/api/interviews/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }

      const interview = await storage.getInterview(interviewId, accountId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      // Convert date strings to Date objects
      if (req.body.scheduledDate) {
        req.body.scheduledDate = new Date(req.body.scheduledDate);
      }
      if (req.body.conductedDate) {
        req.body.conductedDate = new Date(req.body.conductedDate);
      }

      const updatedInterview = await storage.updateInterview(interviewId, accountId, req.body);
      
      // Update Google Calendar event if Google Calendar is connected and scheduledDate changed
      if (req.user?.id && req.body.scheduledDate && updatedInterview) {
        try {
          const candidate = await storage.getCandidate(updatedInterview.candidateId, accountId);
          const job = candidate?.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
          const interviewer = updatedInterview.interviewerId ? await storage.getUser(updatedInterview.interviewerId) : null;
          
          // TODO: Store googleCalendarEventId in interview record for proper update/delete
          // For now, we'll need to search for the event or store ID in notes/metadata
          // This is a simplified version - full implementation would require event ID storage
        } catch (error) {
          console.error("[Interview] Failed to update Google Calendar event:", error);
        }
      }
      
      // Log activity
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Updated interview",
        entityType: "interview",
        entityId: interview.id,
        details: { candidateId: interview.candidateId },
        timestamp: new Date()
      });

      res.json(updatedInterview);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Mark interview as completed
  app.post("/api/interviews/:id/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }

      const interview = await storage.getInterview(interviewId, accountId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      const updatedInterview = await storage.updateInterview(interviewId, accountId, {
        status: "completed",
        conductedDate: new Date()
      });

      // Trigger workflow for interview completed
      try {
        const { triggerWorkflows } = await import("../workflow-engine");
        const candidate = await storage.getCandidate(interview.candidateId, accountId);
        const job = candidate?.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
        await triggerWorkflows("interview_completed", {
          entityType: "interview",
          entityId: interview.id,
          interview: updatedInterview,
          candidate,
          job,
          user: req.user,
        }, accountId);
      } catch (error) {
        console.error("[Interview Complete] Workflow trigger error:", error);
        // Don't fail the request if workflow trigger fails
      }
      
      // Log activity
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Completed interview",
        entityType: "interview",
        entityId: interview.id,
        details: { candidateId: interview.candidateId },
        timestamp: new Date()
      });

      res.json(updatedInterview);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Submit interview evaluation
  app.post("/api/interviews/:id/evaluate", validateRequest(
    z.object({
      technicalScore: z.number().min(1).max(5).optional(),
      communicationScore: z.number().min(1).max(5).optional(),
      problemSolvingScore: z.number().min(1).max(5).optional(),
      culturalFitScore: z.number().min(1).max(5).optional(),
      overallRating: z.string(),
      technicalComments: z.string().optional(),
      communicationComments: z.string().optional(),
      problemSolvingComments: z.string().optional(),
      culturalFitComments: z.string().optional(),
      overallComments: z.string().optional()
    })
  ), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }

      const interview = await storage.getInterview(interviewId, accountId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      // Check if there's an existing evaluation
      const existingEvaluation = await storage.getEvaluationByInterview(interviewId, accountId);
      let evaluation;

      if (existingEvaluation) {
        // Update existing evaluation
        evaluation = await storage.updateEvaluation(existingEvaluation.id, accountId, {
          ...req.body,
          evaluatorId: req.user?.id,
          updatedAt: new Date()
        });
      } else {
        // Create new evaluation
        evaluation = await storage.createEvaluation({
          accountId,
          interviewId,
          ...req.body,
          evaluatorId: req.user?.id
        });
      }
      
      // Mark the interview as completed if it wasn't already
      if (interview.status !== "completed") {
        const updatedInterview = await storage.updateInterview(interviewId, accountId, {
          status: "completed",
          conductedDate: interview.conductedDate || new Date()
        });

        // Trigger workflow for interview completed
        try {
          const { triggerWorkflows } = await import("../workflow-engine");
          const candidate = await storage.getCandidate(interview.candidateId, accountId);
          const job = candidate?.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
          await triggerWorkflows("interview_completed", {
            entityType: "interview",
            entityId: interview.id,
            interview: updatedInterview,
            candidate,
            job,
            user: req.user,
          }, accountId);
        } catch (error) {
          console.error("[Interview Evaluation] Workflow trigger error:", error);
          // Don't fail the request if workflow trigger fails
        }
      }
      
      // Log activity
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Submitted interview evaluation",
        entityType: "evaluation",
        entityId: evaluation.id,
        details: { 
          interviewId,
          candidateId: interview.candidateId,
          overallRating: req.body.overallRating
        },
        timestamp: new Date()
      });

      res.status(201).json(evaluation);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get evaluation for an interview
  app.get("/api/interviews/:id/evaluation", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }

      const evaluation = await storage.getEvaluationByInterview(interviewId, accountId);
      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }

      res.json(evaluation);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Delete an interview (typically for cancelled interviews)
  app.delete("/api/interviews/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }

      const interview = await storage.getInterview(interviewId, accountId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      await storage.deleteInterview(interviewId, accountId);
      
      // Log activity
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Deleted interview",
        entityType: "interview",
        entityId: interviewId,
        details: { candidateId: interview.candidateId },
        timestamp: new Date()
      });

      res.status(200).json({ message: "Interview deleted successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
