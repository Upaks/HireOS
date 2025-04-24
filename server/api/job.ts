import { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertJobSchema, UserRoles } from "@shared/schema";
import { handleApiError, validateRequest } from "./utils";
import { scrapeHipeople } from "./hipeople";
import { generateJobDescription } from "./openai";

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

      // Generate HiPeople assessment link
      // This would be generated using the HiPeople API in production
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

  // Get all jobs
  app.get("/api/jobs", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const status = req.query.status as string;
      const jobs = await storage.getJobs(status);
      
      res.json(jobs);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get a specific job by ID
  app.get("/api/jobs/:id", async (req, res) => {
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

      res.json(job);
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

      // Post job to platforms
      // This is where you'd integrate with LinkedIn, onlinejobs.ph APIs
      // For now, just create mock platform records
      const platforms = ["LinkedIn", "onlinejobs.ph"];
      for (const platform of platforms) {
        await storage.createJobPlatform({
          jobId,
          platform,
          platformJobId: `${platform}-${Math.random().toString(36).substring(2, 10)}`,
          postUrl: `https://${platform.toLowerCase()}.com/jobs/${Math.random().toString(36).substring(2, 10)}`,
          status: "posted"
        });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Approved and posted job",
        entityType: "job",
        entityId: job.id,
        details: { jobTitle: job.title, platforms },
        timestamp: new Date()
      });

      // Add a notification to send a Slack message
      // In production this would trigger a Slack webhook
      await storage.createNotification({
        type: "slack",
        payload: {
          channel: "hiring-updates",
          message: `Job posted: ${job.title} by ${req.user?.fullName}`,
          jobId: job.id
        },
        processAfter: new Date(),
        status: "pending"
      });

      res.json({
        ...updatedJob,
        platforms: await storage.getJobPlatforms(jobId)
      });
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
  });
}
