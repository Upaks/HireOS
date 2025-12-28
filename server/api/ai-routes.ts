import { Express } from "express";
import { storage } from "../storage";
import { handleApiError, isAuthorized } from "./utils";
import { parseResume } from "./resume-parser";
import { calculateMatchScore, CandidateData, JobRequirements } from "./ai-matching";
import { db } from "../db";
import { candidates, jobs } from "@shared/schema";
import { eq } from "drizzle-orm";

export function setupAIRoutes(app: Express) {
  // Parse a resume
  app.post("/api/ai/parse-resume", async (req, res) => {
    try {
      if (!isAuthorized(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { resumeUrl, candidateId } = req.body;

      if (!resumeUrl) {
        return res.status(400).json({ message: "resumeUrl is required" });
      }

      // Get user's OpenRouter API key
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.openRouterApiKey) {
        return res.status(400).json({ 
          message: "OpenRouter API key not configured. Please add your API key in Settings." 
        });
      }

      // Parse the resume
      const parsedData = await parseResume(resumeUrl, user.openRouterApiKey);

      // If candidateId is provided, update the candidate with parsed data
      if (candidateId) {
        const candidate = await storage.getCandidate(candidateId);
        if (!candidate) {
          return res.status(404).json({ message: "Candidate not found" });
        }

        const updates: any = {
          parsedResumeData: parsedData,
        };

        // Auto-fill candidate fields if they're empty
        if (parsedData.phone && !candidate.phone) {
          updates.phone = parsedData.phone;
        }
        if (parsedData.location && !candidate.location) {
          updates.location = parsedData.location;
        }
        if (parsedData.skills && parsedData.skills.length > 0) {
          // Merge with existing skills if any
          const existingSkills = Array.isArray(candidate.skills) ? candidate.skills : [];
          const skillsSet = new Set([...existingSkills, ...parsedData.skills]);
          updates.skills = Array.from(skillsSet);
        }
        if (parsedData.experienceYears && !candidate.experienceYears) {
          updates.experienceYears = parsedData.experienceYears;
        }

        await storage.updateCandidate(candidateId, updates);

        // Auto-calculate match score if jobId exists
        if (candidate.jobId) {
          try {
            const job = await storage.getJob(candidate.jobId);
            if (job) {
              const updatedCandidate = await storage.getCandidate(candidateId);
              const matchResult = await calculateMatchScore(
                {
                  name: updatedCandidate!.name,
                  skills: updatedCandidate!.skills as string[] | null,
                  experienceYears: updatedCandidate!.experienceYears,
                  parsedResumeData: parsedData,
                  applicationData: updatedCandidate!.applicationData,
                },
                {
                  title: job.title,
                  skills: job.skills,
                  type: job.type,
                  department: job.department,
                  description: job.description,
                },
                user.openRouterApiKey!
              );
              await storage.updateCandidate(candidateId, { matchScore: matchResult.score });
            }
          } catch (matchError) {
            console.error("Error auto-calculating match score:", matchError);
            // Don't fail the entire request if match score calculation fails
          }
        }
      }

      res.json({
        success: true,
        data: parsedData,
        message: candidateId ? "Resume parsed and candidate updated" : "Resume parsed successfully"
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Calculate match score for a candidate against a job
  app.post("/api/ai/match", async (req, res) => {
    try {
      if (!isAuthorized(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { candidateId, jobId } = req.body;

      if (!candidateId || !jobId) {
        return res.status(400).json({ message: "candidateId and jobId are required" });
      }

      // Get user's OpenRouter API key
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.openRouterApiKey) {
        return res.status(400).json({ 
          message: "OpenRouter API key not configured. Please add your API key in Settings." 
        });
      }

      // Get candidate and job data
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Prepare candidate data
      const candidateData: CandidateData = {
        name: candidate.name,
        skills: candidate.skills as string[] | null,
        experienceYears: candidate.experienceYears,
        parsedResumeData: candidate.parsedResumeData as any,
        applicationData: candidate.applicationData,
      };

      // Prepare job requirements
      const jobRequirements: JobRequirements = {
        title: job.title,
        skills: job.skills,
        type: job.type,
        department: job.department,
        description: job.description,
      };

      // Calculate match score
      const matchResult = await calculateMatchScore(
        candidateData,
        jobRequirements,
        user.openRouterApiKey
      );

      // Update candidate with match score
      await storage.updateCandidate(candidateId, {
        matchScore: matchResult.score,
      });

      res.json({
        success: true,
        data: matchResult,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Batch match all candidates for a job
  app.post("/api/ai/match-job/:jobId", async (req, res) => {
    try {
      if (!isAuthorized(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const jobId = parseInt(req.params.jobId);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      // Get user's OpenRouter API key
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.openRouterApiKey) {
        return res.status(400).json({ 
          message: "OpenRouter API key not configured. Please add your API key in Settings." 
        });
      }

      // Store API key in const so TypeScript knows it's not null
      const apiKey = user.openRouterApiKey;

      // Get job
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Get all candidates for this job
      const candidatesList = await db
        .select()
        .from(candidates)
        .where(eq(candidates.jobId, jobId));

      // Prepare job requirements
      const jobRequirements: JobRequirements = {
        title: job.title,
        skills: job.skills,
        type: job.type,
        department: job.department,
        description: job.description,
      };

      // Calculate match scores for all candidates
      const results = await Promise.allSettled(
        candidatesList.map(async (candidate) => {
          const candidateData: CandidateData = {
            name: candidate.name,
            skills: candidate.skills as string[] | null,
            experienceYears: candidate.experienceYears,
            parsedResumeData: candidate.parsedResumeData as any,
            applicationData: candidate.applicationData,
          };

          const matchResult = await calculateMatchScore(
            candidateData,
            jobRequirements,
            apiKey
          );

          // Update candidate with match score
          await storage.updateCandidate(candidate.id, {
            matchScore: matchResult.score,
          });

          return {
            candidateId: candidate.id,
            candidateName: candidate.name,
            matchResult,
          };
        })
      );

      const successful = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<any>).value);
      const failed = results
        .filter((r) => r.status === "rejected")
        .map((r) => (r as PromiseRejectedResult).reason);

      res.json({
        success: true,
        processed: successful.length,
        failed: failed.length,
        results: successful,
        errors: failed.length > 0 ? failed.map((e) => e.message || String(e)) : undefined,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

