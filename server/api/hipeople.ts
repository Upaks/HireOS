import { Express } from "express";
import axios from "axios";
import { storage } from "../storage";
import { handleApiError } from "./utils";

// HiPeople scraping service URL
const HIPEOPLE_SCRAPER_URL = "https://firmos-hipeople-scraper-899783477192.europe-west1.run.app/scrape_hipeople";

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
    // If this is a direct call to the scraper service, we don't need to pass a URL
    const isDirect = assessmentUrl === HIPEOPLE_SCRAPER_URL || !assessmentUrl;
    
    // Example URL for demo/test purposes if none provided
    const demoUrl = "https://app.hipeople.io/test-assessment-example";
    
    // URL validation for non-direct calls
    if (!isDirect && !assessmentUrl?.includes("hipeople.io")) {
      throw new Error("Invalid HiPeople URL");
    }

    // Determine which URL to use (or no URL for direct access to demo data)
    const urlToUse = isDirect ? undefined : (assessmentUrl || demoUrl);
    console.log(`Scraping HiPeople assessment${urlToUse ? ': ' + urlToUse : ' (direct access)'}`);

    // Set up the request payload
    let payload: any = {};
    
    if (urlToUse) {
      payload.url = urlToUse;
    }
    
    // Add test data if provided
    if (testData) {
      payload = {
        ...payload,
        ...testData
      };
    } else if (isDirect) {
      // Provide default test data if needed and we're using direct access
      payload = {
        ...payload,
        applicant_name: "Sample Candidate",
        applicant_email: "sample@example.com"
      };
    }
    
    console.log("HiPeople request payload:", payload);
    
    // Call the HiPeople scraper service with POST
    const response = await axios.post(HIPEOPLE_SCRAPER_URL, null, {
      params: payload,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000 // 30 second timeout for the scraping operation
    });

    // Validate response
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Invalid response from HiPeople scraper");
    }

    const results: HiPeopleResult[] = response.data;
    console.log(`Found ${results.length} candidate results`);

    return results;
  } catch (error) {
    console.error("HiPeople scraping error:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Unknown error occurred during scraping";
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`HiPeople scraper error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("HiPeople scraper service is not responding. Please try again later.");
      }
    }
    
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
        // Call the HiPeople scraper
        const hiPeopleResults = await scrapeHipeople(job.hiPeopleLink);
        
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching HiPeople assessment:", errorMessage);
        return res.status(500).json({ message: "Failed to fetch assessment", error: errorMessage });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });
}