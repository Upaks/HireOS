import { Express } from "express";
import { storage } from "../storage";
import { handleApiError } from "./utils";
import { z } from "zod";

// Validation schema for application submission
const applicationSchema = z.object({
  jobId: z.number().int().positive(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  resumeUrl: z.string().url().nullable().optional(),
  applicationData: z.record(z.any()).optional(), // Custom form field answers
  source: z.string().optional().default("website"),
});

export function setupApplicationRoutes(app: Express) {
  // Public endpoint - submit application (no auth required)
  app.post("/api/applications", async (req, res) => {
    try {
      const validationResult = applicationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors,
        });
      }

      const data = validationResult.data;

      // Verify job exists and is active
      const job = await storage.getJob(data.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.status !== "active") {
        return res.status(400).json({ 
          message: "This job is not currently accepting applications",
          jobStatus: job.status 
        });
      }

      // Check if candidate already exists for this job
      const existingCandidate = await storage.getCandidateByNameAndEmail(data.name, data.email);
      if (existingCandidate && existingCandidate.jobId === data.jobId) {
        return res.status(409).json({ 
          message: "You have already applied for this position" 
        });
      }

      // Create candidate record
      const candidate = await storage.createCandidate({
        jobId: data.jobId,
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        location: data.location || "",
        resumeUrl: data.resumeUrl || null,
        source: data.source || "website",
        status: "new",
        applicationData: data.applicationData || null, // Store custom form answers
      });

      // Get the job to access HiPeople link and expressReview setting
      const jobWithDetails = await storage.getJob(data.jobId);
      
      // Schedule assessment email (3 hours delay or immediately if Express Review is ON)
      const processAfter = jobWithDetails?.expressReview
        ? new Date()
        : new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours later

      // Queue assessment email notification
      await storage.createNotification({
        type: "email",
        payload: {
          recipientEmail: candidate.email,
          subject: `Your Assessment for ${jobWithDetails?.title}`,
          template: "assessment",
          context: {
            candidateName: candidate.name,
            jobTitle: jobWithDetails?.title,
            hiPeopleLink: jobWithDetails?.hiPeopleLink,
          },
        },
        processAfter,
        status: "pending",
      });

      // Log activity
      await storage.createActivityLog({
        userId: null, // Public application, no user
        action: "Application submitted",
        entityType: "candidate",
        entityId: candidate.id,
        details: {
          candidateName: candidate.name,
          jobTitle: jobWithDetails?.title,
          source: data.source,
        },
        timestamp: new Date(),
      });

      res.status(201).json({
        message: "Application submitted successfully",
        candidateId: candidate.id,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

