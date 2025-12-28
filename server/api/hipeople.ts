import { Express } from "express";
import axios from "axios";
import { storage } from "../storage";
import { handleApiError } from "./utils";


// HiPeople scraping service URL
const HIPEOPLE_SCRAPER_URL = "https://firmos-hipeople-scraper-899783477192.europe-west1.run.app/scrape_hipeople";

/**
 * IMPORTANT NOTES FOR HIPEOPLE SCRAPER API:
 * 
 * The HiPeople scraper API requires specific parameters to function properly:
 * - applicant_name: The candidate's name
 * - applicant_email: The candidate's email address
 * 
 * These parameters should be sent as query parameters with a POST request.
 * 
 * Current implementation issues:
 * - 422 Error: "Field required" when parameters are missing
 * - 405 Error: "Method Not Allowed" when using GET instead of POST
 * - Timeout: No response received within 30 seconds
 * 
 * For development and testing, we're using a mock implementation.
 * In production, the actual API integration will need to be configured properly.
 */

// Interface for HiPeople assessment results
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

/**
 * Scrapes HiPeople assessment results from the given URL
 * @param assessmentUrl HiPeople assessment URL to scrape or the scraper service URL
 * @param testData Optional test data with applicant information
 * @returns Array of HiPeople assessment results
 */
export async function scrapeHipeople(
  assessmentUrl?: string, 
  testData?: { applicant_name: string; applicant_email: string }
): Promise<HiPeopleResult[]> {
  try {
    const candidateName = testData?.applicant_name || "Sample Candidate";
    const candidateEmail = testData?.applicant_email || "sample@example.com";


    const response = await axios.post(HIPEOPLE_SCRAPER_URL, null, {
      params: {
        applicant_name: candidateName,
        applicant_email: candidateEmail
      },
      timeout: 30000
    });

    return response.data;
  } catch (error) {
    console.error("❌ HiPeople scraping error:", error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`HiPeople scraper error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("HiPeople scraper service is not responding. Please try again later.");
      }
    }

    const errorMessage = error instanceof Error 
      ? error.message 
      : "Unknown error occurred during scraping";

    throw new Error(`Failed to scrape HiPeople assessment: ${errorMessage}`);
    
  }
}

export function setupHiPeopleRoutes(app: Express) {
  // Route to update candidate assessments from HiPeople
  app.post("/api/jobs/:id/update-assessments", async (req, res) => {
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
      
      if (!job.hiPeopleLink) {
        return res.status(400).json({ message: "No HiPeople link found for this job" });
      }
      
      // Get all candidates for this job
      const candidates = await storage.getCandidates({ jobId });
      
      if (!candidates.length) {
        return res.status(400).json({ message: "No candidates found for this job" });
      }
      
      try {
        // First, we need to get test data for each candidate
        const candidateTestData = candidates.map(candidate => ({
          applicant_name: candidate.name,
          applicant_email: candidate.email
        }));
        
        // Call the HiPeople scraper - we'll use the first candidate's data for the initial request
        const hiPeopleResults = await scrapeHipeople(job.hiPeopleLink, candidateTestData[0]);
        
        if (!hiPeopleResults.length) {
          return res.status(404).json({ message: "No assessment results found" });
        }
        
        // Update candidates with assessment results
        let updatedCount = 0;
        
        for (const candidate of candidates) {
          // Find matching result by email
          const result = hiPeopleResults.find(r => 
            r.email.toLowerCase() === candidate.email.toLowerCase()
          );
          
          if (result) {
            await storage.updateCandidate(candidate.id, {
              hiPeopleScore: result.score,
              hiPeoplePercentile: result.percentile,
              hiPeopleCompletedAt: new Date(result.completed_at),
              status: "assessment_completed",
              // Store skills from the feedback
              skills: result.feedback.map(f => f.category)
            });
            
            updatedCount++;
          }
        }
        
        // Log activity
        await storage.createActivityLog({
          userId: req.user?.id,
          action: "Updated candidate assessments",
          entityType: "job",
          entityId: job.id,
          details: { 
            jobTitle: job.title,
            candidatesUpdated: updatedCount,
            totalCandidates: candidates.length
          },
          timestamp: new Date()
        });
        
        res.json({
          message: "HiPeople assessments updated",
          updatedCandidates: updatedCount,
          results: hiPeopleResults
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error updating HiPeople assessments:", errorMessage);
        return res.status(500).json({ message: "Failed to update assessments", error: errorMessage });
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

      const job = await storage.getJob(candidate.jobId!);
      if (!job || !job.hiPeopleLink) {
        return res.status(400).json({ message: "No HiPeople link found for this candidate's job" });
      }

      try {
        // Call the HiPeople scraper API
        let hiPeopleResults: HiPeopleResult[] = [];
        try {
          // Provide applicant information to the scraper
          hiPeopleResults = await scrapeHipeople(job.hiPeopleLink, {
            applicant_name: candidate.name,
            applicant_email: candidate.email
          });
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching HiPeople assessment:", errorMessage);
        return res.status(500).json({ message: "Failed to fetch assessment", error: errorMessage });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });
}