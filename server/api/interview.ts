import { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { handleApiError, validateRequest } from "./utils";

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

      const scheduledDate = req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined;
      
      const interview = await storage.createInterview({
        candidateId: req.body.candidateId,
        scheduledDate,
        interviewerId: req.body.interviewerId || req.user?.id,
        type: req.body.type,
        videoUrl: req.body.videoUrl,
        notes: req.body.notes,
        status: "scheduled"
      });
      
      // Update candidate status if needed
      const candidate = await storage.getCandidate(req.body.candidateId);
      if (candidate && candidate.status !== "interview_scheduled") {
        await storage.updateCandidate(req.body.candidateId, {
          status: "interview_scheduled"
        });
      }
      
      // Log activity
      await storage.createActivityLog({
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

      const candidateId = req.query.candidateId ? parseInt(req.query.candidateId as string) : undefined;
      const interviewerId = req.query.interviewerId ? parseInt(req.query.interviewerId as string) : undefined;
      const status = req.query.status as string | undefined;
      
      const interviews = await storage.getInterviews({
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

      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }

      const interview = await storage.getInterview(interviewId);
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

      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }

      const interview = await storage.getInterview(interviewId);
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

      const updatedInterview = await storage.updateInterview(interviewId, req.body);
      
      // Log activity
      await storage.createActivityLog({
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

      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }

      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      const updatedInterview = await storage.updateInterview(interviewId, {
        status: "completed",
        conductedDate: new Date()
      });
      
      // Log activity
      await storage.createActivityLog({
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

      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }

      const interview = await storage.getInterview(interviewId);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      // Check if there's an existing evaluation
      const existingEvaluation = await storage.getEvaluationByInterview(interviewId);
      let evaluation;

      if (existingEvaluation) {
        // Update existing evaluation
        evaluation = await storage.updateEvaluation(existingEvaluation.id, {
          ...req.body,
          evaluatorId: req.user?.id,
          updatedAt: new Date()
        });
      } else {
        // Create new evaluation
        evaluation = await storage.createEvaluation({
          interviewId,
          ...req.body,
          evaluatorId: req.user?.id
        });
      }
      
      // Mark the interview as completed if it wasn't already
      if (interview.status !== "completed") {
        await storage.updateInterview(interviewId, {
          status: "completed",
          conductedDate: interview.conductedDate || new Date()
        });
      }
      
      // Log activity
      await storage.createActivityLog({
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

      const interviewId = parseInt(req.params.id);
      if (isNaN(interviewId)) {
        return res.status(400).json({ message: "Invalid interview ID" });
      }

      const evaluation = await storage.getEvaluationByInterview(interviewId);
      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }

      res.json(evaluation);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
