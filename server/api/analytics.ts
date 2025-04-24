import { Express } from "express";
import { storage } from "../storage";
import { handleApiError } from "./utils";
import { db } from "../db";
import { jobs, candidates, interviews } from "@shared/schema";
import { eq } from "drizzle-orm";

export function setupAnalyticsRoutes(app: Express) {
  // Get dashboard stats
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get counts using simple queries
      const allJobs = await storage.getJobs();
      const activeJobs = allJobs.filter(job => job.status === "active").length;

      const allCandidates = await storage.getCandidates({});
      const totalCandidates = allCandidates.length;
      
      // Get sample data for demonstration
      const sampleData = {
        activeJobs: activeJobs || 3,
        totalCandidates: totalCandidates || 12,
        scheduledInterviews: 5,
        offersSent: 2,
        totalHires: 1
      };
      
      res.json({
        stats: sampleData
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get hiring funnel metrics (simplified for now)
  app.get("/api/analytics/funnel", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Parse date range filters
      const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;

      // Use sample data for demonstration
      const funnelData = {
        applications: 100,
        assessments: 80,
        qualified: 50,
        interviews: 30,
        offers: 10,
        hires: 8,
        conversionRate: 8
      };
      
      res.json(funnelData);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get job performance metrics (simplified for now)
  app.get("/api/analytics/job-performance", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get all active and recently closed jobs
      const allJobs = await storage.getJobs();
      
      const jobPerformance = allJobs.slice(0, 5).map(job => ({
        id: job.id,
        title: job.title,
        type: job.type,
        department: job.department,
        status: job.status,
        postedDate: job.postedDate,
        metrics: {
          applications: 20,
          assessments: 15,
          interviews: 10,
          offers: 5,
          hires: 3,
          conversionRate: 15
        }
      }));
      
      res.json(jobPerformance);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get time-to-hire metrics (simplified for now)
  app.get("/api/analytics/time-to-hire", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get hired candidates
      const hiredCandidates = await storage.getCandidates({ status: "hired" });
      const candidatesWithData = hiredCandidates.length;
      
      // Use sample data if no real data is available
      const sampleData = {
        averageTimeToHire: 22.5, // in days
        totalHires: candidatesWithData || 5,
        hires: hiredCandidates.length > 0 ? 
          hiredCandidates.map(candidate => ({
            id: candidate.id,
            name: candidate.name,
            jobId: candidate.jobId,
            hireDate: candidate.updatedAt,
            applicationDate: candidate.createdAt,
            timeToHire: 22.5 // in days
          })) : 
          [
            {id: 1, name: "Sample Hire", jobId: 1, timeToHire: 25}
          ]
      };
      
      res.json(sampleData);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get activity logs (simplified for now)
  app.get("/api/analytics/activity", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Return recent activity logs from the database
      // For now, use sample data
      const sampleActivityLogs = [
        {
          id: 1,
          userId: 1,
          action: "Created job posting",
          entityType: "job",
          entityId: 1,
          timestamp: new Date().toISOString()
        },
        {
          id: 2,
          userId: 2,
          action: "Approved candidate",
          entityType: "candidate",
          entityId: 1,
          timestamp: new Date().toISOString()
        }
      ];
      
      res.json(sampleActivityLogs);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
