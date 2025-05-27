    import { Express } from "express";
    import { storage } from "../storage";
    import { handleApiError } from "./utils";
    import { db } from "../db";
    import { jobs, candidates, interviews } from "@shared/schema";
    import { eq, inArray } from "drizzle-orm";
    import { count } from "drizzle-orm/sql";


    export function setupAnalyticsRoutes(app: Express) {
      // Get dashboard stats
      app.get("/api/analytics/dashboard", async (req, res) => {
        try {
          if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
          }

          // Active Jobs
          const activeJobsCountResult = await db
            .select({ count: count() })
            .from(jobs)
            .where(eq(jobs.status, "active"));
          const activeJobs = Number(activeJobsCountResult[0].count);

          // Total Candidates
          const totalCandidatesResult = await db
            .select({ count: count() })
            .from(candidates);
          const totalCandidates = Number(totalCandidatesResult[0].count);

          // Scheduled Interviews
          const scheduledInterviewsResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(inArray(candidates.status, ["60_1st_interview_scheduled", "75_2nd_interview_scheduled"]));
          const scheduledInterviews = Number(scheduledInterviewsResult[0].count);


          // Offers Sent
          const offersSentResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(eq(candidates.status, "95_offer_sent"));
          const offersSent = Number(offersSentResult[0].count);

          // ✅ Final JSON response
          res.json({
            stats: {
              activeJobs,
              totalCandidates,
              scheduledInterviews,
              offersSent
            }
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

          const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;

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

      // Get job performance metrics with real-time data
      app.get("/api/analytics/job-performance", async (req, res) => {
        try {
          if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
          }

          const allJobs = await storage.getJobs();
          const jobPerformance = [];

          for (const job of allJobs) {
            // Applications: COUNT(*) of candidates assigned to the job
            const allCandidatesResult = await db
              .select({ count: count() })
              .from(candidates)
              .where(eq(candidates.jobId, job.id));
            const applications = Number(allCandidatesResult[0].count);

            // Assessments: COUNT(*) of candidates with status = '30_assessment_completed'
            const assessmentsResult = await db
              .select({ count: count() })
              .from(candidates)
              .where(eq(candidates.jobId, job.id))
              .where(eq(candidates.status, "30_assessment_completed"));
            const assessments = Number(assessmentsResult[0].count);

            // Interviews: Sum of candidates with status = '40_first_interview_scheduled' or '50_second_interview_scheduled'
            const interviewsResult = await db
              .select({ count: count() })
              .from(candidates)
              .where(eq(candidates.jobId, job.id))
              .where(inArray(candidates.status, ["40_first_interview_scheduled", "50_second_interview_scheduled"]));
            const interviews = Number(interviewsResult[0].count);

            // Offers: Count of candidates with status = '90_offer_sent'
            const offersResult = await db
              .select({ count: count() })
              .from(candidates)
              .where(eq(candidates.jobId, job.id))
              .where(eq(candidates.status, "90_offer_sent"));
            const offers = Number(offersResult[0].count);

            // Hires: Count of candidates with status = '100_offer_accepted'
            const hiresResult = await db
              .select({ count: count() })
              .from(candidates)
              .where(eq(candidates.jobId, job.id))
              .where(eq(candidates.status, "100_offer_accepted"));
            const hires = Number(hiresResult[0].count);

            // Conversion: Hires ÷ Total candidates × 100 (as percentage)
            const conversionRate = applications > 0 ? Number(((hires / applications) * 100).toFixed(1)) : 0;

            jobPerformance.push({
              id: job.id,
              title: job.title,
              type: job.type,
              department: job.department,
              status: job.status,
              postedDate: job.postedDate,
              metrics: {
                applications,
                assessments,
                interviews,
                offers,
                hires,
                conversionRate
              }
            });
          }

          res.json(jobPerformance);
        } catch (error) {
          handleApiError(error, res);
        }
      });

      // Get time-to-hire metrics
      app.get("/api/analytics/time-to-hire", async (req, res) => {
        try {
          if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
          }

          const hiredCandidates = await storage.getCandidates({ status: "hired" });
          const candidatesWithData = hiredCandidates.length;

          const sampleData = {
            averageTimeToHire: 22.5,
            totalHires: candidatesWithData || 5,
            hires: hiredCandidates.length > 0
              ? hiredCandidates.map(candidate => ({
                  id: candidate.id,
                  name: candidate.name,
                  jobId: candidate.jobId,
                  hireDate: candidate.updatedAt,
                  applicationDate: candidate.createdAt,
                  timeToHire: 22.5
                }))
              : [{ id: 1, name: "Sample Hire", jobId: 1, timeToHire: 25 }]
          };

          res.json(sampleData);
        } catch (error) {
          handleApiError(error, res);
        }
      });

      // Get activity logs
      app.get("/api/analytics/activity", async (req, res) => {
        try {
          if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
          }

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
