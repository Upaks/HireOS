import { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertJobSchema, UserRoles, candidates } from "@shared/schema";
import { handleApiError, validateRequest } from "./utils";
import { scrapeHipeople } from "./hipeople";
import { generateJobDescription } from "./openai";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { count } from "drizzle-orm";
import { notifySlackUsers } from "../slack-notifications";

export function setupJobRoutes(app: Express) {
  // Create a new job draft
  app.post("/api/jobs", validateRequest(insertJobSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Add submitter ID if not provided
      if (!req.body.submitterId) {
        req.body.submitterId = req.user?.id;
      }

      // Using OpenAI to generate job description
      let generatedDescription = "";
      let suggestedTitle = req.body.title;

      try {
        // Generate job description with OpenAI
        const aiResult = await generateJobDescription({
          title: req.body.title,
          type: req.body.type,
          skills: req.body.skills,
          teamContext: req.body.teamContext,
          department: req.body.department
        });
        
        generatedDescription = aiResult.description;
        
        // Use suggested title if available
        if (aiResult.suggestedTitle) {
          suggestedTitle = aiResult.suggestedTitle;
        }
      } catch (error) {
        console.error("Error generating job description:", error);
        // Fallback to basic description if OpenAI fails
        generatedDescription = `# ${req.body.title}\n\nWe are looking for a talented ${req.body.title} to join our team.`;
      }

      // For demo purposes, we're creating a placeholder HiPeople assessment link
      // In production, this would connect to the HiPeople API to create a real assessment
      const hiPeopleLink = `https://app.hipeople.io/assessment/${Math.random().toString(36).substring(2, 10)}`;

      const jobData = {
        ...req.body,
        description: generatedDescription,
        suggestedTitle,
        hiPeopleLink
      };

      const job = await storage.createJob(jobData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Created job draft",
        entityType: "job",
        entityId: job.id,
        details: { jobTitle: job.title },
        timestamp: new Date()
      });

      res.status(201).json(job);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get all jobs with real-time candidate counts
  app.get("/api/jobs", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const status = req.query.status as string;
      const jobs = await storage.getJobs(status);
      
      // Add real-time candidate counts for each job
      const jobsWithCandidateCounts = await Promise.all(
        jobs.map(async (job) => {
          const candidatesResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(eq(candidates.jobId, job.id));
          const candidateCount = Number(candidatesResult[0].count);
          
          return {
            ...job,
            candidateCount
          };
        })
      );
      
      res.json(jobsWithCandidateCounts);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get a specific job by ID
  // Public endpoint - no auth required (for public application page)
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // If authenticated, return full job data
      // If not authenticated (public access), return limited data
      if (req.isAuthenticated()) {
      res.json(job);
      } else {
        res.json({
          id: job.id,
          title: job.title,
          description: job.description,
          type: job.type,
          department: job.department,
          status: job.status,
          formTemplateId: job.formTemplateId,
        });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Update a job
  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const updatedJob = await storage.updateJob(jobId, req.body);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Updated job",
        entityType: "job",
        entityId: job.id,
        details: { jobTitle: job.title },
        timestamp: new Date()
      });

      res.json(updatedJob);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Approve and post a job
  app.post("/api/jobs/:id/approve", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Update job status to active and set posted date
      const updatedJob = await storage.updateJob(jobId, {
        status: "active",
        postedDate: new Date()
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Approved and activated job",
        entityType: "job",
        entityId: job.id,
        details: { jobTitle: job.title },
        timestamp: new Date()
      });

      // Send Slack notification for job posted
      if (req.user?.id) {
        const user = await storage.getUser(req.user.id);
        if (user) {
          await notifySlackUsers(req.user.id, "job_posted", {
            job: updatedJob,
            user,
          });
        }
      }

      res.json(updatedJob);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Close a job
  app.post("/api/jobs/:id/close", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const updatedJob = await storage.updateJob(jobId, {
        status: "closed"
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Closed job",
        entityType: "job",
        entityId: job.id,
        details: { jobTitle: job.title },
        timestamp: new Date()
      });

      res.json(updatedJob);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get job platforms (where it's been posted)
  app.get("/api/jobs/:id/platforms", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const platforms = await storage.getJobPlatforms(jobId);
      res.json(platforms);
    } catch (error) {
      handleApiError(error, res);
    }
  });}
