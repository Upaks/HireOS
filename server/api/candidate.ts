import { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertCandidateSchema } from "@shared/schema";
import { handleApiError, validateRequest } from "./utils";

export function setupCandidateRoutes(app: Express) {
  // Create a new candidate
  app.post("/api/candidates", validateRequest(insertCandidateSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const candidate = await storage.createCandidate(req.body);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Added candidate",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobId: candidate.jobId },
        timestamp: new Date()
      });

      // If express review is enabled, send assessment immediately
      // Otherwise, schedule it for 3 hours later
      const job = await storage.getJob(candidate.jobId);
      const processAfter = job?.expressReview 
        ? new Date() 
        : new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours later
      
      // Queue assessment email notification
      await storage.createNotification({
        type: "email",
        payload: {
          recipientEmail: candidate.email,
          subject: `Your Assessment for ${job?.title}`,
          template: "assessment",
          context: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            hiPeopleLink: job?.hiPeopleLink
          }
        },
        processAfter,
        status: "pending"
      });

      res.status(201).json(candidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get all candidates with optional filtering
  app.get("/api/candidates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
      const status = req.query.status as string | undefined;
      const hiPeoplePercentile = req.query.hiPeoplePercentile 
        ? parseInt(req.query.hiPeoplePercentile as string)
        : undefined;
      
      // Get candidates based on filters
      const candidates = await storage.getCandidates({
        jobId,
        status,
        hiPeoplePercentile
      });
      
      res.json(candidates);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get a specific candidate by ID
  app.get("/api/candidates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      res.json(candidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Update a candidate
  app.patch("/api/candidates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const updatedCandidate = await storage.updateCandidate(candidateId, req.body);
      
      // Log activity
      if (req.body.status && req.body.status !== candidate.status) {
        await storage.createActivityLog({
          userId: req.user?.id,
          action: `Updated candidate status to ${req.body.status}`,
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, previousStatus: candidate.status, newStatus: req.body.status },
          timestamp: new Date()
        });
      }

      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Invite candidate to interview
  app.post("/api/candidates/:id/invite-to-interview", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Update candidate status
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "interview_scheduled"
      });

      // Get job details
      const job = await storage.getJob(candidate.jobId);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Invited candidate to interview",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date()
      });

      // Queue interview invitation email
      await storage.createNotification({
        type: "email",
        payload: {
          recipientEmail: candidate.email,
          subject: `Interview Invitation for ${job?.title}`,
          template: "interview-invitation",
          context: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            schedulingLink: "https://calendly.com/firmos-interviews/candidate-interview"
          }
        },
        processAfter: new Date(),
        status: "pending"
      });

      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Add candidate to talent pool
  app.post("/api/candidates/:id/talent-pool", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Update candidate status
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "talent_pool"
      });

      // Get job details
      const job = await storage.getJob(candidate.jobId);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Added candidate to talent pool",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date()
      });

      // Queue talent pool email (with 2-hour delay)
      await storage.createNotification({
        type: "email",
        payload: {
          recipientEmail: candidate.email,
          subject: `Thank you for your application to ${job?.title}`,
          template: "talent-pool",
          context: {
            candidateName: candidate.name,
            jobTitle: job?.title
          }
        },
        processAfter: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
        status: "pending"
      });

      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Reject candidate
  app.post("/api/candidates/:id/reject", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Update candidate status
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "rejected"
      });

      // Get job details
      const job = await storage.getJob(candidate.jobId);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Rejected candidate",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date()
      });

      // Queue rejection email (with 2-hour delay)
      await storage.createNotification({
        type: "email",
        payload: {
          recipientEmail: candidate.email,
          subject: `Update on your application to ${job?.title}`,
          template: "rejection",
          context: {
            candidateName: candidate.name,
            jobTitle: job?.title
          }
        },
        processAfter: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
        status: "pending"
      });

      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Send offer to candidate
  app.post("/api/candidates/:id/send-offer", validateRequest(
    z.object({
      offerType: z.string(),
      compensation: z.string(),
      startDate: z.string().optional(),
      notes: z.string().optional()
    })
  ), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Update candidate status
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "offer_sent"
      });

      // Create offer record
      const startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
      const offer = await storage.createOffer({
        candidateId,
        offerType: req.body.offerType,
        compensation: req.body.compensation,
        startDate,
        notes: req.body.notes,
        status: "sent",
        sentDate: new Date(),
        approvedById: req.user?.id,
        contractUrl: `https://firmos.ai/contracts/${candidateId}-${Date.now()}.pdf`
      });

      // Get job details
      const job = await storage.getJob(candidate.jobId);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Sent offer to candidate",
        entityType: "candidate",
        entityId: candidate.id,
        details: { 
          candidateName: candidate.name, 
          jobTitle: job?.title,
          offerType: req.body.offerType,
          compensation: req.body.compensation 
        },
        timestamp: new Date()
      });

      // Queue offer email
      await storage.createNotification({
        type: "email",
        payload: {
          recipientEmail: candidate.email,
          subject: `Your Job Offer for ${job?.title}`,
          template: "offer",
          context: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            offerType: req.body.offerType,
            compensation: req.body.compensation,
            startDate: startDate ? startDate.toLocaleDateString() : "To be determined",
            contractUrl: offer.contractUrl
          }
        },
        processAfter: new Date(),
        status: "pending"
      });

      res.json({
        candidate: updatedCandidate,
        offer
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Handle offer acceptance
  app.post("/api/candidates/:id/accept-offer", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Update candidate status
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "hired"
      });

      // Update offer status
      const offer = await storage.getOfferByCandidate(candidateId);
      if (offer) {
        await storage.updateOffer(offer.id, {
          status: "accepted"
        });
      }

      // Get job details
      const job = await storage.getJob(candidate.jobId);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Candidate accepted offer",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date()
      });

      // Send Slack notification
      await storage.createNotification({
        type: "slack",
        payload: {
          channel: "onboarding",
          message: `${candidate.name} has accepted the offer for ${job?.title} position!`,
          candidateId: candidate.id,
          jobId: candidate.jobId
        },
        processAfter: new Date(),
        status: "pending"
      });

      // Queue onboarding email
      await storage.createNotification({
        type: "email",
        payload: {
          recipientEmail: candidate.email,
          subject: `Welcome to FirmOS - Onboarding Information`,
          template: "onboarding",
          context: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            startDate: offer?.startDate ? new Date(offer.startDate).toLocaleDateString() : "To be determined",
            contractUrl: offer?.contractUrl
          }
        },
        processAfter: new Date(),
        status: "pending"
      });

      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
