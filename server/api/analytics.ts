    import { Express, Request, Response } from "express";
    import { storage } from "../storage";
    import { handleApiError } from "./utils";
    import { db } from "../db";
    import { jobs, candidates, interviews, activityLogs } from "@shared/schema";
    import { eq, inArray, and, gte, desc } from "drizzle-orm";
    import { count } from "drizzle-orm";


    export function setupAnalyticsRoutes(app: Express) {
      // Get dashboard stats
      app.get("/api/analytics/dashboard", async (req: Request, res: Response) => {
        try {
          if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
          }

          // MULTI-TENANT: Get user's accountId
          const accountId = await storage.getUserAccountId((req.user as any).id);
          if (!accountId) {
            return res.status(400).json({ message: "User is not associated with any account" });
          }

          // Active Jobs
          const activeJobsCountResult = await db
            .select({ count: count() })
            .from(jobs)
            .where(and(eq(jobs.status, "active"), eq(jobs.accountId, accountId)));
          const activeJobs = Number(activeJobsCountResult[0].count);

          // Total Candidates
          const totalCandidatesResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(eq(candidates.accountId, accountId));
          const totalCandidates = Number(totalCandidatesResult[0].count);

          // Scheduled Interviews
          const scheduledInterviewsResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(and(
              eq(candidates.accountId, accountId),
              inArray(candidates.status, ["60_1st_interview_scheduled", "75_2nd_interview_scheduled"])
            ));
          const scheduledInterviews = Number(scheduledInterviewsResult[0].count);


          // Offers Sent
          const offersSentResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(and(
              eq(candidates.accountId, accountId),
              eq(candidates.status, "95_offer_sent")
            ));
          const offersSent = Number(offersSentResult[0].count);

          // Get recent activity logs (last 10, filtered by account)
          const recentActivityLogs = await db
            .select()
            .from(activityLogs)
            .where(eq(activityLogs.accountId, accountId))
            .orderBy(desc(activityLogs.timestamp))
            .limit(10);

          // ✅ Final JSON response
          res.json({
            stats: {
              activeJobs,
              totalCandidates,
              scheduledInterviews,
              offersSent
            },
            recentActivity: recentActivityLogs
          });
        } catch (error) {
          handleApiError(error, res);
        }
      });

      // Get hiring funnel metrics with real data
      app.get("/api/analytics/funnel", async (req: Request, res: Response) => {
        try {
          if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
          }

          // MULTI-TENANT: Get user's accountId
          const accountId = await storage.getUserAccountId((req.user as any).id);
          if (!accountId) {
            return res.status(400).json({ message: "User is not associated with any account" });
          }

          const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
          const dateRange = req.query.dateRange as string || "30"; // Default to 30 days

          // Calculate date filter (always includes accountId)
          const buildConditions = (...conditions: any[]) => {
            const allConditions = [eq(candidates.accountId, accountId)]; // Always filter by account
            if (dateRange !== "all") {
              const days = parseInt(dateRange);
              const startDate = new Date();
              startDate.setDate(startDate.getDate() - days);
              allConditions.push(gte(candidates.createdAt, startDate));
            }
            if (jobId) {
              allConditions.push(eq(candidates.jobId, jobId));
            }
            allConditions.push(...conditions);
            return allConditions.length > 0 ? and(...allConditions) : undefined;
          };

          // Applications: Total candidates (or for specific job)
          const applicationsResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(buildConditions());
          const applications = Number(applicationsResult[0]?.count || 0);

          // Assessments: Candidates who completed assessment (status: 30_assessment_completed)
          const assessmentsResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(buildConditions(eq(candidates.status, "30_assessment_completed")));
          const assessments = Number(assessmentsResult[0]?.count || 0);

          // Qualified: Candidates who passed assessment and moved forward (assessment completed or beyond)
          // This includes: assessment_completed, interview_sent, interview_scheduled, etc.
          const qualifiedStatuses = [
            "30_assessment_completed",
            "45_1st_interview_sent",
            "60_1st_interview_scheduled",
            "75_2nd_interview_scheduled",
            "95_offer_sent",
            "100_offer_accepted"
          ];
          
          const qualifiedResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(buildConditions(inArray(candidates.status, qualifiedStatuses)));
          const qualified = Number(qualifiedResult[0]?.count || 0);

          // Interviews: Candidates who have been interviewed (interview sent or scheduled)
          const interviewStatuses = [
            "45_1st_interview_sent",
            "60_1st_interview_scheduled",
            "75_2nd_interview_scheduled"
          ];
          
          const interviewsResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(buildConditions(inArray(candidates.status, interviewStatuses)));
          const interviews = Number(interviewsResult[0]?.count || 0);

          // Offers: Candidates with offers sent
          const offersResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(buildConditions(eq(candidates.status, "95_offer_sent")));
          const offers = Number(offersResult[0]?.count || 0);

          // Hires: Candidates who accepted offers
          const hiresResult = await db
            .select({ count: count() })
            .from(candidates)
            .where(buildConditions(eq(candidates.status, "100_offer_accepted")));
          const hires = Number(hiresResult[0]?.count || 0);

          // Conversion rate: Hires / Applications * 100
          const conversionRate = applications > 0 ? Number(((hires / applications) * 100).toFixed(1)) : 0;

          const funnelData = {
            applications,
            assessments,
            qualified,
            interviews,
            offers,
            hires,
            conversionRate
          };

          res.json(funnelData);
        } catch (error) {
          handleApiError(error, res);
        }
      });

      // Get job performance metrics with real-time data
      app.get("/api/analytics/job-performance", async (req: Request, res: Response) => {
        try {
          if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
          }

          // MULTI-TENANT: Get user's accountId
          const accountId = await storage.getUserAccountId((req.user as any).id);
          if (!accountId) {
            return res.status(400).json({ message: "User is not associated with any account" });
          }

          const allJobs = await storage.getJobs(accountId);
          const jobPerformance = [];

          for (const job of allJobs) {
            // Applications: COUNT(*) of candidates assigned to the job (within account)
            const allCandidatesResult = await db
              .select({ count: count() })
              .from(candidates)
              .where(and(
                eq(candidates.accountId, accountId),
                eq(candidates.jobId, job.id)
              ));
            const applications = Number(allCandidatesResult[0].count);

            // Assessments: COUNT(*) of candidates with status = '30_assessment_completed'
            const assessmentsResult = await db
              .select({ count: count() })
              .from(candidates)
              .where(and(
                eq(candidates.accountId, accountId),
                eq(candidates.jobId, job.id),
                eq(candidates.status, "30_assessment_completed")
              ));
            const assessments = Number(assessmentsResult[0].count);

            // Interviews: Sum of candidates with interview statuses
            const interviewStatuses = [
              "45_1st_interview_sent",
              "60_1st_interview_scheduled",
              "75_2nd_interview_scheduled"
            ];
            const interviewsResult = await db
              .select({ count: count() })
              .from(candidates)
              .where(and(
                eq(candidates.accountId, accountId),
                eq(candidates.jobId, job.id),
                inArray(candidates.status, interviewStatuses)
              ));
            const interviews = Number(interviewsResult[0].count);

            // Offers: Count of candidates with status = '95_offer_sent'
            const offersResult = await db
              .select({ count: count() })
              .from(candidates)
              .where(and(
                eq(candidates.accountId, accountId),
                eq(candidates.jobId, job.id),
                eq(candidates.status, "95_offer_sent")
              ));
            const offers = Number(offersResult[0].count);

            // Hires: Count of candidates with status = '100_offer_accepted'
            const hiresResult = await db
              .select({ count: count() })
              .from(candidates)
              .where(and(
                eq(candidates.accountId, accountId),
                eq(candidates.jobId, job.id),
                eq(candidates.status, "100_offer_accepted")
              ));
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
      app.get("/api/analytics/time-to-hire", async (req: Request, res: Response) => {
        try {
          if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
          }

          // MULTI-TENANT: Get user's accountId
          const accountId = await storage.getUserAccountId((req.user as any).id);
          if (!accountId) {
            return res.status(400).json({ message: "User is not associated with any account" });
          }

          const hiredCandidates = await storage.getCandidates(accountId, { status: "100_offer_accepted" });
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
      app.get("/api/analytics/activity", async (req: Request, res: Response) => {
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
