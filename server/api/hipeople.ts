import { Express } from "express";
import axios from "axios";
import { z } from "zod";
import { storage } from "../storage";
import { handleApiError, validateRequest } from "./utils";

const HI_PEOPLE_SCRAPER_URL = "https://firmos-hipeople-scraper-899783477192.europe-west1.run.app/scrape_hipeople";

export interface HiPeopleResult {
  candidate_id: string;
  name: string;
  email: string;
  score: number;
  percentile: number;
  completed_at: string;
  feedback: {
    category: string;
    score: number;
    feedback: string;
  }[];
}

export async function scrapeHipeople(assessmentUrl: string): Promise<HiPeopleResult[]> {
  try {
    // Call the HiPeople scraper API
    const response = await axios.post(HI_PEOPLE_SCRAPER_URL, { url: assessmentUrl });
    return response.data.results;
  } catch (error) {
    console.error("Error calling HiPeople scraper:", error);
    throw new Error("Failed to fetch HiPeople assessment results");
  }
}

export function setupHiPeopleRoutes(app: Express) {
  // Update candidates with HiPeople assessment results
  app.post("/api/hipeople/update-assessments", validateRequest(
    z.object({
      jobId: z.number()
    })
  ), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const jobId = req.body.jobId;
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      if (!job.hiPeopleLink) {
        return res.status(400).json({ message: "No HiPeople link found for this job" });
      }

      try {
        // Get candidates for this job who need assessment results
        const candidates = await storage.getCandidates({
          jobId,
          status: "assessment_sent"
        });
        
        if (candidates.length === 0) {
          return res.json({
            message: "No candidates found with assessment_sent status",
            updatedCandidates: 0,
            results: []
          });
        }

        // Call the HiPeople scraper API 
        let hiPeopleResults: HiPeopleResult[] = [];
        try {
          hiPeopleResults = await scrapeHipeople(job.hiPeopleLink);
        } catch (error) {
          console.error("Error scraping HiPeople:", error);
          return res.status(500).json({ 
            message: "Failed to scrape HiPeople assessment results", 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
        
        // Match results to candidates by email
        let updatedCount = 0;
        for (const candidate of candidates) {
          // Find matching result by email (case insensitive)
          const result = hiPeopleResults.find(r => 
            r.email.toLowerCase() === candidate.email.toLowerCase()
          );
          
          if (result) {
            // Update candidate with assessment results
            await storage.updateCandidate(candidate.id, {
              hiPeopleScore: result.score,
              hiPeoplePercentile: result.percentile,
              hiPeopleCompletedAt: new Date(result.completed_at),
              status: "assessment_completed",
              // Store skills from the feedback
              skills: result.feedback.map(f => f.category)
            });
            
            // Log activity
            await storage.createActivityLog({
              userId: req.user?.id,
              action: "Updated candidate assessment",
              entityType: "candidate",
              entityId: candidate.id,
              details: { 
                candidateName: candidate.name,
                hiPeopleScore: result.score,
                hiPeoplePercentile: result.percentile
              },
              timestamp: new Date()
            });
            
            updatedCount++;
          }
        }
        
        res.json({
          message: "HiPeople assessments updated",
          updatedCandidates: updatedCount,
          results: hiPeopleResults
        });
      } catch (error) {
        console.error("Error updating HiPeople assessments:", error);
        return res.status(500).json({ message: "Failed to update assessments", error: error.message });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Manually fetch HiPeople results for a specific candidate
  app.post("/api/candidates/:id/fetch-assessment", async (req, res) => {
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

      const job = await storage.getJob(candidate.jobId);
      if (!job || !job.hiPeopleLink) {
        return res.status(400).json({ message: "No HiPeople link found for this candidate's job" });
      }

      try {
        // Call the HiPeople scraper API
        let hiPeopleResults: HiPeopleResult[] = [];
        try {
          hiPeopleResults = await scrapeHipeople(job.hiPeopleLink);
        } catch (error) {
          console.error("Error scraping HiPeople:", error);
          return res.status(500).json({ 
            message: "Failed to scrape HiPeople assessment results", 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
        
        // Find matching result by email
        const result = hiPeopleResults.find(r => 
          r.email.toLowerCase() === candidate.email.toLowerCase()
        );
        
        if (!result) {
          return res.status(404).json({ 
            message: "No assessment results found for this candidate", 
            candidateEmail: candidate.email 
          });
        }
        
        // Update candidate with assessment results
        const updatedCandidate = await storage.updateCandidate(candidateId, {
          hiPeopleScore: result.score,
          hiPeoplePercentile: result.percentile,
          hiPeopleCompletedAt: new Date(result.completed_at),
          status: "assessment_completed",
          // Store skills from the feedback
          skills: result.feedback.map(f => f.category)
        });
        
        // Log activity
        await storage.createActivityLog({
          userId: req.user?.id,
          action: "Manually fetched candidate assessment",
          entityType: "candidate",
          entityId: candidate.id,
          details: { 
            candidateName: candidate.name,
            hiPeopleScore: result.score,
            hiPeoplePercentile: result.percentile
          },
          timestamp: new Date()
        });
        
        res.json({
          message: "Assessment results fetched successfully",
          candidate: updatedCandidate,
          assessmentResults: {
            score: result.score,
            percentile: result.percentile,
            completedAt: result.completed_at,
            feedback: result.feedback
          }
        });
      } catch (error) {
        console.error("Error fetching HiPeople assessment:", error);
        return res.status(500).json({ message: "Failed to fetch assessment", error: error.message });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
