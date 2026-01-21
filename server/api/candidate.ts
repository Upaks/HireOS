import { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertCandidateSchema, emailLogs } from "@shared/schema";
import { handleApiError, validateRequest, isAuthorized } from "./utils";
import { isLikelyInvalidEmail } from "../email-validator";
import { db } from "../db";
import {
  createGHLContact,
  mapJobTitleToGHLTag,
  parseFullName,
} from "../ghl-integration";
import { Candidate } from "@shared/schema";
import { notifySlackUsers } from "../slack-notifications";
import { createNotification } from "./notifications";
import { sanitizeEmailContent, sanitizeTextInput } from "../security/sanitize";
import { SecureLogger } from "../security/logger";
import { canModifyCandidate, canAccessCandidate } from "../security/authorization";

// SECURITY: Get company name from environment variable
function getCompanyName(): string {
  return process.env.COMPANY_NAME || "Company";
}

// SECURITY: Get contract URL template from environment variable
function getContractUrl(candidateId: number): string {
  const baseUrl = process.env.CONTRACT_BASE_URL || "https://talent.firmos.app";
  const template = process.env.CONTRACT_URL_TEMPLATE || `${baseUrl}/web-manager-contract{candidateId}`;
  return template.replace('{candidateId}', candidateId.toString());
}

// SECURITY: Helper function to sanitize and replace email template placeholders
function sanitizeAndReplaceTemplate(
  template: string,
  candidateName: string,
  jobTitle: string,
  senderName: string,
  companyName: string,
  additionalReplacements?: Record<string, string>
): string {
  const safeCandidateName = sanitizeTextInput(candidateName);
  const safeJobTitle = sanitizeTextInput(jobTitle);
  const safeSenderName = sanitizeTextInput(senderName);
  const safeCompanyName = sanitizeTextInput(companyName);
  
  let result = template
    .replace(/\{\{candidateName\}\}/g, safeCandidateName)
    .replace(/\{\{jobTitle\}\}/g, safeJobTitle)
    .replace(/\{\{senderName\}\}/g, safeSenderName)
    .replace(/\{\{companyName\}\}/g, safeCompanyName);
  
  // Apply additional replacements if provided
  if (additionalReplacements) {
    for (const [key, value] of Object.entries(additionalReplacements)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
  }
  
  return result;
}

export function setupCandidateRoutes(app: Express) {
  // Create a new candidate
  app.post(
    "/api/candidates",
    validateRequest(insertCandidateSchema),
    async (req, res) => {
      try {
        if (!isAuthorized(req)) {
          return res
            .status(401)
            .json({ message: "Authentication or API key required" });
        }

        // MULTI-TENANT: Get user's accountId (if authenticated)
        let accountId: number | null = null;
        if (req.isAuthenticated() && req.user?.id) {
          accountId = await storage.getUserAccountId(req.user.id);
          if (!accountId) {
            return res.status(400).json({ message: "User is not associated with any account" });
          }
        } else {
          // For API key access, we might need accountId from request or return error
          // For now, require authentication for candidate creation
          return res.status(401).json({ message: "Authentication required for candidate creation" });
        }

        // Check for duplicate candidate (same name and email) within account
        const existingCandidate = await storage.getCandidateByNameAndEmail(
          req.body.name,
          req.body.email,
          accountId
        );
        if (existingCandidate) {
          return res.status(409).json({
            message: "Candidate already exists",
            error:
              "A candidate with the same name and email already exists in the system",
            existingCandidateId: existingCandidate.id,
          });
        }

        const candidate = await storage.createCandidate({ ...req.body, accountId });

        // Send Slack notification for new application
        const userId = (req.user as any)?.id;
        if (userId && candidate.jobId) {
          const job = await storage.getJob(candidate.jobId, accountId);
          if (job) {
            await notifySlackUsers(userId, "new_application", {
              candidate,
              job,
            });
          }
        }

        // Auto-parse resume if URL is provided and user has OpenRouter API key
        if (userId && candidate.resumeUrl) {
          try {
            const user = await storage.getUser(userId);
            if (user?.openRouterApiKey) {
              // Parse resume in background (don't block the response)
              import('./resume-parser').then(async ({ parseResume }) => {
                try {
                  const parsedData = await parseResume(candidate.resumeUrl!, user.openRouterApiKey!);
                  const updates: any = {
                    parsedResumeData: parsedData,
                  };
                  
                  // Auto-fill empty fields
                  if (parsedData.phone && !candidate.phone) {
                    updates.phone = parsedData.phone;
                  }
                  if (parsedData.location && !candidate.location) {
                    updates.location = parsedData.location;
                  }
                  if (parsedData.skills && parsedData.skills.length > 0) {
                    updates.skills = parsedData.skills;
                  }
                  if (parsedData.experienceYears) {
                    updates.experienceYears = parsedData.experienceYears;
                  }
                  
                  await storage.updateCandidate(candidate.id, accountId, updates);
                  
                  // Auto-calculate match score if jobId exists
                  if (candidate.jobId) {
                    try {
                      const { calculateMatchScore } = await import('./ai-matching');
                      const job = await storage.getJob(candidate.jobId, accountId);
                      if (job) {
                        const matchResult = await calculateMatchScore(
                          {
                            name: candidate.name,
                            skills: parsedData.skills || null,
                            experienceYears: parsedData.experienceYears || null,
                            parsedResumeData: parsedData,
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
                        await storage.updateCandidate(candidate.id, accountId, { matchScore: matchResult.score });
                      }
                    } catch (matchError) {
                      console.error("Error auto-calculating match score:", matchError);
                    }
                  }
                } catch (parseError) {
                  console.error("Error auto-parsing resume:", parseError);
                }
              });
            }
          } catch (error) {
            console.error("Error setting up auto-parse:", error);
          }
        }

        // Sync to connected CRMs (GHL, Airtable, Google Sheets)
        if (userId && candidate.jobId !== null && candidate.jobId !== undefined) {
          try {
            const job = await storage.getJob(candidate.jobId, accountId);
            if (job) {
              (candidate as any).job = job;
            }

            // Get all connected CRM integrations for this user
            const crmIntegrations = await storage.getCRMIntegrations(userId);
            
            for (const integration of crmIntegrations) {
              if (!integration.isEnabled || integration.status !== 'connected') {
                continue;
              }

              try {
                if (integration.platformId === 'ghl') {
                  const { firstName, lastName } = parseFullName(candidate.name);
                  const tags = ["00_application_submitted"];
                  if (job?.title) {
                    const roleTag = mapJobTitleToGHLTag(job.title);
                    tags.push(roleTag);
                  }

                  const ghlResponse = await createGHLContact({
                    firstName,
                    lastName,
                    email: candidate.email,
                    phone: candidate.phone || undefined,
                    location: candidate.location || undefined,
                    tags,
                    score: candidate.hiPeopleScore || undefined,
                    expectedSalary: candidate.expectedSalary || undefined,
                    experienceYears: candidate.experienceYears || undefined,
                    hiPeopleAssessmentLink: candidate.hiPeopleAssessmentLink || undefined,
                    hiPeoplePercentile: candidate.hiPeoplePercentile || undefined,
                    skills: candidate.skills && Array.isArray(candidate.skills) ? candidate.skills : []
                  });

                  const ghlContactId = ghlResponse.contact?.id;
                  if (ghlContactId) {
                    await storage.updateCandidate(candidate.id, accountId, { ghlContactId });
                  }
                } else if (integration.platformId === 'airtable') {
                  const { updateCandidateInAirtable } = await import('../airtable-integration');
                  await updateCandidateInAirtable(candidate, userId);
                } else if (integration.platformId === 'google-sheets') {
                  const { createOrUpdateGoogleSheetsContact } = await import('../google-sheets-integration');
                  await createOrUpdateGoogleSheetsContact(
                    {
                      id: candidate.id,
                      name: candidate.name,
                      email: candidate.email,
                      phone: candidate.phone || null,
                      location: candidate.location || null,
                      expectedSalary: typeof candidate.expectedSalary === 'number' ? candidate.expectedSalary : (candidate.expectedSalary ? Number(candidate.expectedSalary) : null),
                      experienceYears: typeof candidate.experienceYears === 'number' ? candidate.experienceYears : (candidate.experienceYears ? Number(candidate.experienceYears) : null),
                      skills: Array.isArray(candidate.skills) ? candidate.skills : null,
                      status: candidate.status,
                      jobTitle: job?.title || undefined,
                    },
                    userId
                  );
                }
              } catch (syncError: any) {
                // Log but don't fail the main creation
                await storage.createActivityLog({
                  accountId,
                  userId: req.user?.id ?? null,
                  action: `${integration.platformName} sync failed`,
                  entityType: "candidate",
                  entityId: candidate.id,
                  details: {
                    candidateName: candidate.name,
                    error: syncError.message,
                    jobId: candidate.jobId,
                  },
                  timestamp: new Date(),
                });
              }
            }
          } catch (error) {
            // Don't fail the main creation if CRM sync fails
          }
        }

        // Log activity
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Added candidate",
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, jobId: candidate.jobId },
          timestamp: new Date(),
        });

        // If express review is enabled, send assessment immediately
        // Otherwise, schedule it for 3 hours later
        const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
        const processAfter = job?.expressReview
          ? new Date()
          : new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours later

        // Queue assessment email notification
        await storage.createNotification({
          type: "email",
          payload: {
            recipientEmail: candidate.email,
            subject: `Your Assessment for ${job?.title}`,
            template: "assessment",
            context: {
              candidateName: candidate.name,
              jobTitle: job?.title,
              hiPeopleLink: job?.hiPeopleLink,
            },
          },
          processAfter,
          status: "pending",
        });

        res.status(201).json(candidate);
      } catch (error) {
        handleApiError(error, res);
      }
    },
  );

  // Get all candidates with optional filtering
  app.get("/api/candidates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await storage.getUserAccountId(req.user!.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const jobId = req.query.jobId
        ? parseInt(req.query.jobId as string)
        : undefined;
      const status = req.query.status as string | undefined;

      // Get candidates based on filters
      const candidates = await storage.getCandidates(accountId, {
        jobId,
        status,
      });

      res.json(candidates);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get a specific candidate by ID
  app.get("/api/candidates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await storage.getUserAccountId(req.user!.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      // SECURITY: Check authorization (still useful for additional checks)
      const hasAccess = await canAccessCandidate(req.user!.id, candidateId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this candidate" });
      }

      const candidate = await storage.getCandidate(candidateId, accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      res.json(candidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Update a candidate
  app.patch("/api/candidates/:id", async (req, res) => {
    try {
      if (!isAuthorized(req)) {
        return res
          .status(401)
          .json({ message: "Authentication or API key required" });
      }

      // MULTI-TENANT: Get user's accountId (if authenticated)
      let accountId: number | null = null;
      if (req.isAuthenticated() && req.user?.id) {
        accountId = await storage.getUserAccountId(req.user.id);
        if (!accountId) {
          return res.status(400).json({ message: "User is not associated with any account" });
        }
      } else {
        // For API key access, require authentication for now
        return res.status(401).json({ message: "Authentication required for candidate updates" });
      }

      // Resolve candidate either by numeric ID or GHL Contact ID
      const candidateIdentifier = req.params.id;
      let candidate: Candidate | undefined;

      if (!isNaN(Number(candidateIdentifier))) {
        candidate = await storage.getCandidate(parseInt(candidateIdentifier), accountId);
      } else {
        candidate =
          await storage.getCandidateByGHLContactId(candidateIdentifier, accountId);
      }

      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // SECURITY: Check authorization to access this candidate
      if (req.isAuthenticated()) {
        const hasAccess = await canAccessCandidate(req.user!.id, candidate.id);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied to this candidate" });
        }
      }

      // SECURITY: Check permissions for evaluation fields
      const hasEvaluationFields =
        req.body.technicalProficiency !== undefined ||
        req.body.leadershipInitiative !== undefined ||
        req.body.problemSolving !== undefined ||
        req.body.communicationSkills !== undefined ||
        req.body.culturalFit !== undefined ||
        req.body.hiPeopleScore !== undefined ||
        req.body.hiPeoplePercentile !== undefined;

      if (hasEvaluationFields && req.user) {
        const canModify = canModifyCandidate(req.user, req.body);
        if (!canModify) {
          return res.status(403).json({
            message:
              "Only CEO, COO, Director, or Admin can update candidate evaluation criteria",
          });
        }
      }

      // Prepare update data
      const updateData = { ...req.body };
      if (updateData.lastInterviewDate) {
        updateData.lastInterviewDate = new Date(updateData.lastInterviewDate);
      }

      // Update candidate
      const updatedCandidate = await storage.updateCandidate(
        candidate.id,
        accountId,
        updateData,
      );

      // Auto-parse resume if resumeUrl was just added/updated and user has OpenRouter API key
      const userId = (req.user as any)?.id;
      if (userId && req.body.resumeUrl && req.body.resumeUrl !== candidate.resumeUrl) {
        try {
          const user = await storage.getUser(userId);
          if (user?.openRouterApiKey) {
            // Parse resume in background (don't block the response)
            import('./resume-parser').then(async ({ parseResume }) => {
              try {
                const parsedData = await parseResume(req.body.resumeUrl, user.openRouterApiKey!);
                const updates: any = {
                  parsedResumeData: parsedData,
                };
                
                // Auto-fill empty fields (don't overwrite existing data)
                if (parsedData.phone && !updatedCandidate.phone) {
                  updates.phone = parsedData.phone;
                }
                if (parsedData.location && !updatedCandidate.location) {
                  updates.location = parsedData.location;
                }
                if (parsedData.skills && parsedData.skills.length > 0) {
                  // Merge with existing skills if any
                  const existingSkills = Array.isArray(updatedCandidate.skills) ? updatedCandidate.skills : [];
                  const skillsSet = new Set([...existingSkills, ...parsedData.skills]);
                  updates.skills = Array.from(skillsSet);
                }
                if (parsedData.experienceYears && !updatedCandidate.experienceYears) {
                  updates.experienceYears = parsedData.experienceYears;
                }
                
                await storage.updateCandidate(updatedCandidate.id, accountId, updates);
                
                // Auto-calculate match score if jobId exists
                if (updatedCandidate.jobId) {
                  try {
                    const { calculateMatchScore } = await import('./ai-matching');
                    const job = await storage.getJob(updatedCandidate.jobId, accountId);
                    if (job) {
                      const finalCandidate = await storage.getCandidate(updatedCandidate.id, accountId);
                      const matchResult = await calculateMatchScore(
                        {
                          name: finalCandidate!.name,
                          skills: finalCandidate!.skills as string[] | null,
                          experienceYears: finalCandidate!.experienceYears,
                          parsedResumeData: parsedData,
                          applicationData: finalCandidate!.applicationData,
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
                      await storage.updateCandidate(updatedCandidate.id, accountId, { matchScore: matchResult.score });
                    }
                  } catch (matchError) {
                    console.error("Error auto-calculating match score:", matchError);
                  }
                }
              } catch (parseError) {
                console.error("Error auto-parsing resume:", parseError);
              }
            });
          }
        } catch (error) {
          console.error("Error setting up auto-parse:", error);
        }
      }

      // Sync to connected CRMs (Airtable, GHL, etc.)
      if (userId) {
        try {
          // Get all connected CRM integrations for this user
          const crmIntegrations = await storage.getCRMIntegrations(userId);
          
          for (const integration of crmIntegrations) {
            if (!integration.isEnabled || integration.status !== 'connected') {
              continue;
            }

            try {
              if (integration.platformId === 'airtable') {
                const { updateCandidateInAirtable } = await import('../airtable-integration');
                // Get job details if available
                if (updatedCandidate.jobId) {
                  const job = await storage.getJob(updatedCandidate.jobId, accountId);
                  if (job) {
                    (updatedCandidate as any).job = job;
                  }
                }
                await updateCandidateInAirtable(updatedCandidate, userId);
              } else if (integration.platformId === 'ghl' && updatedCandidate.ghlContactId) {
                const { updateCandidateInGHL } = await import('../ghl-integration');
                // Get job details if available
                if (updatedCandidate.jobId) {
                  const job = await storage.getJob(updatedCandidate.jobId, accountId);
                  if (job) {
                    (updatedCandidate as any).job = job;
                  }
                }
                await updateCandidateInGHL(updatedCandidate, userId);
              } else if (integration.platformId === 'google-sheets') {
                const { createOrUpdateGoogleSheetsContact, findRowByEmail } = await import('../google-sheets-integration');
                // Get job details if available
                if (updatedCandidate.jobId) {
                  const job = await storage.getJob(updatedCandidate.jobId, accountId);
                  if (job) {
                    (updatedCandidate as any).job = job;
                  }
                }
                // Find existing row by email, or create new one
                const rowNumber = await findRowByEmail(updatedCandidate.email, userId);
                await createOrUpdateGoogleSheetsContact(
                  {
                    id: updatedCandidate.id,
                    name: updatedCandidate.name,
                    email: updatedCandidate.email,
                    phone: updatedCandidate.phone || null,
                    location: updatedCandidate.location || null,
                    expectedSalary: typeof updatedCandidate.expectedSalary === 'number' ? updatedCandidate.expectedSalary : (updatedCandidate.expectedSalary ? Number(updatedCandidate.expectedSalary) : null),
                    experienceYears: typeof updatedCandidate.experienceYears === 'number' ? updatedCandidate.experienceYears : (updatedCandidate.experienceYears ? Number(updatedCandidate.experienceYears) : null),
                    skills: Array.isArray(updatedCandidate.skills) ? updatedCandidate.skills : null,
                    status: updatedCandidate.status,
                    jobTitle: (updatedCandidate as any).job?.title || undefined,
                  },
                  userId,
                  rowNumber || undefined
                );
              }
            } catch (syncError: any) {
              // Log but don't fail the main update - errors are logged in activity log
            }
          }
        } catch (error) {
          // Don't fail the main update if CRM sync fails
          console.error('Error syncing to CRMs:', error);
        }
      }

      // Status change to "interview sent"
      if (
        req.body.status === "45_1st_interview_sent" &&
        req.body.status !== candidate.status
      ) {
        const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
        if (job) {
          // SECURITY: Get user info for email template
          const user = req.user ? await storage.getUser(req.user.id) : null;
          const senderName = user?.fullName || "Team Member";
          const companyName = getCompanyName();
          
          // SECURITY: Sanitize email content
          const emailBody = sanitizeEmailContent(`
            Hi ${sanitizeTextInput(candidate.name)},<br><br>
            It's ${sanitizeTextInput(senderName)} from ${sanitizeTextInput(companyName)}. I came across your profile and would like to chat about your background and how you might fit in our <b>${sanitizeTextInput(job.title)}</b> position.<br><br>
            Feel free to grab a time on my calendar when you're available:<br>
            <a href="${user?.calendarLink || '#'}">Schedule your interview here</a><br><br>
            Looking forward to connecting!<br><br>
            Thanks,<br>
            ${sanitizeTextInput(senderName)}<br>
            ${sanitizeTextInput(companyName)}
          `.trim());
          
          await storage.createInAppNotification({
            accountId,
            userId: req.user?.id ?? null,
            type: "email",
            title: "Interview Invite Sent",
            message: `Interview invite sent to ${candidate.name}`,
            link: `/candidates/${candidate.id}`,
            metadata: { candidateId: candidate.id },
          });
        }
      }

      // Status change to "offer sent" or decision "offer"
      if (
        (req.body.status === "95_offer_sent" &&
          candidate.status !== "95_offer_sent") ||
        (req.body.finalDecisionStatus === "offer" &&
          candidate.finalDecisionStatus !== "offer")
      ) {
        const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;

        // Create offer if none exists
        let offer = await storage.getOfferByCandidate(candidate.id, accountId);
        if (!offer) {
          offer = await storage.createOffer({
            accountId,
            candidateId: candidate.id,
            offerType: "Full-time",
            compensation: "Competitive",
            status: "sent",
            sentDate: new Date(),
            approvedById: req.user?.id,
            contractUrl: getContractUrl(candidate.id), // SECURITY: From environment variable
          });
        }

        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Sent offer to candidate",
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, jobTitle: job?.title },
          timestamp: new Date(),
        });

        // SECURITY: Get user info and sanitize email content
        const user = req.user ? await storage.getUser(req.user.id) : null;
        const senderName = user?.fullName || "Team Member";
        const companyName = getCompanyName();
        
        // SECURITY: Sanitize email content
        const emailSubject = sanitizeTextInput(`Excited to Offer You the ${job?.title || "Position"} Position`);
        const emailBody = sanitizeEmailContent(`
          <p>Hi ${sanitizeTextInput(candidate.name)},</p>
          <p>Great news — we'd love to bring you on board for the ${sanitizeTextInput(job?.title || "position")} position at ${sanitizeTextInput(companyName)}. After reviewing your experience, we're confident you'll make a strong impact on our team.</p>
          <p>Here's the link to your engagement contract:
          <a href="${getContractUrl(candidate.id)}">[Contract Link]</a></p>
          <p>To kick things off, please schedule your onboarding call here:
          <a href="${user?.calendarLink || '#'}">[Onboarding Calendar Link]</a></p>
          <p>If anything's unclear or you'd like to chat, don't hesitate to reach out.</p>
          <p>Welcome aboard — we're excited to get started!</p>
          <p>Best regards,<br>
          ${sanitizeTextInput(senderName)}<br>
          ${sanitizeTextInput(companyName)}</p>
        `);
        await storage.sendDirectEmail(candidate.email, emailSubject, emailBody, req.user?.id);
      }

      // Log status change
      if (req.body.status && req.body.status !== candidate.status) {
        // If candidate status changes away from interview status, cancel any scheduled interviews
        const interviewStatuses = ["45_1st_interview_sent", "60_1st_interview_scheduled", "75_2nd_interview_scheduled"];
        const wasInterviewStatus = interviewStatuses.includes(candidate.status);
        const isNoLongerInterviewStatus = !interviewStatuses.includes(req.body.status);
        
        if (wasInterviewStatus && isNoLongerInterviewStatus) {
          // Cancel any scheduled/pending interviews for this candidate
          const existingInterviews = await storage.getInterviews(accountId, { candidateId: candidate.id });
          for (const interview of existingInterviews) {
            if (interview.status === "scheduled" || interview.status === "pending") {
              await storage.updateInterview(interview.id, accountId, {
                status: "cancelled",
                notes: interview.notes ? `${interview.notes}\n\nCancelled: Candidate status changed to ${req.body.status}` : `Cancelled: Candidate status changed to ${req.body.status}`,
                updatedAt: new Date()
              });
            }
          }
        }
        
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: `Updated candidate status to ${req.body.status}`,
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            candidateName: candidate.name,
            previousStatus: candidate.status,
            newStatus: req.body.status,
          },
          timestamp: new Date(),
        });
      }

      // Log evaluation update
      if (hasEvaluationFields) {
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Updated candidate evaluation",
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            candidateName: candidate.name,
            updates: Object.keys(req.body).filter((key) =>
              [
                "technicalProficiency",
                "leadershipInitiative",
                "problemSolving",
                "communicationSkills",
                "culturalFit",
                "hiPeopleScore",
                "hiPeoplePercentile",
              ].includes(key),
            ),
          },
          timestamp: new Date(),
        });
      }

      // Trigger workflows if status changed
      if (req.body.status && req.body.status !== candidate.status) {
        try {
          const { triggerWorkflows } = await import("../workflow-engine");
          const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
          await triggerWorkflows("candidate_status_change", {
            entityType: "candidate",
            entityId: candidate.id,
            candidate: updatedCandidate,
            job,
            user: req.user,
            fromStatus: candidate.status,
            toStatus: req.body.status,
          }, accountId);
        } catch (error) {
          console.error("[Candidate Update] Workflow trigger error:", error);
          // Don't fail the request if workflow trigger fails
        }
      }

      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Invite candidate to interview
  app.post("/api/candidates/:id/invite-to-interview", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await storage.getUserAccountId(req.user!.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId, accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Get job details first (needed for email and logging)
      const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;

      // Check for valid email before sending interview invite
      if (isLikelyInvalidEmail(candidate.email)) {
        console.error(
          `❌ Rejected likely non-existent email: ${candidate.email}`,
        );

        // Log activity about the failed interview invite
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Interview invite failed - invalid email",
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            email: candidate.email,
          },
          timestamp: new Date(),
        });

        // Return a simple error message
        return res.status(422).json({
          message: "Email invalid",
          errorType: "non_existent_email",
        });
      }

      // Only update candidate status if email is valid
      const updatedCandidate = await storage.updateCandidate(candidateId, accountId, {
        status: "45_1st_interview_sent",
      });

      // Log activity
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Invited candidate to interview",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date(),
      });

      // Get user's calendar link - REQUIRED (no fallback)
      const user = req.user ? await storage.getUser(req.user.id) : null;
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Require user to have their own calendar link set
      if (!user.calendarLink || user.calendarLink.trim() === "") {
        return res.status(400).json({ 
          message: "Calendar link not configured",
          errorType: "missing_calendar_link",
          details: "Please set your calendar scheduling link in Settings > User Management before sending interview invitations."
        });
      }
      
      // Build calendar link - if Google Calendar, append candidateId and jobId
      let calendarLink = user.calendarLink;
      if (user.calendarProvider === 'google' && calendarLink) {
        const url = new URL(calendarLink);
        url.searchParams.set('candidateId', candidateId.toString());
        if (candidate.jobId) {
          url.searchParams.set('jobId', candidate.jobId.toString());
        }
        calendarLink = url.toString();
      }
      
      const senderName = user.fullName || "Team Member";
      const companyName = getCompanyName(); // SECURITY: From environment variable
      
      // Default email templates
      const defaultSubject = `{{candidateName}}, Let's Discuss Your Fit for Our {{jobTitle}} Position`;
      const defaultBody = `
      <p>Hi {{candidateName}},</p>
      
      <p>It's {{senderName}} from {{companyName}}. I came across your profile and would like to chat about your background and how you might fit in our <b>{{jobTitle}}</b> position.</p>
      
      <p>Feel free to grab a time on my calendar when you're available:<br>
      <a href="{{calendarLink}}">Schedule your interview here</a></p>
      
      <p>Looking forward to connecting!</p>
      
      <p>Thanks,<br>
      {{senderName}}<br>
      {{companyName}}</p>
      `;
      
      // Use user's custom template or default (from emailTemplates JSONB)
      const userTemplates = (user as any).emailTemplates || {};
      const interviewTemplate = userTemplates.interview || {};
      const subjectTemplate = interviewTemplate.subject || defaultSubject;
      const bodyTemplate = interviewTemplate.body || defaultBody;
      
      // SECURITY: Sanitize input before replacing placeholders
      const safeCandidateName = sanitizeTextInput(candidate.name);
      const safeJobTitle = sanitizeTextInput(job?.title || "the position");
      const safeSenderName = sanitizeTextInput(senderName);
      const safeCompanyName = sanitizeTextInput(companyName);
      
      // Replace placeholders in templates
      const emailSubject = subjectTemplate
        .replace(/\{\{candidateName\}\}/g, safeCandidateName)
        .replace(/\{\{jobTitle\}\}/g, safeJobTitle)
        .replace(/\{\{senderName\}\}/g, safeSenderName)
        .replace(/\{\{companyName\}\}/g, safeCompanyName);
      
      // SECURITY: Sanitize email body HTML
      let emailBody = bodyTemplate
        .replace(/\{\{candidateName\}\}/g, safeCandidateName)
        .replace(/\{\{jobTitle\}\}/g, safeJobTitle)
        .replace(/\{\{senderName\}\}/g, safeSenderName)
        .replace(/\{\{companyName\}\}/g, safeCompanyName)
        .replace(/\{\{calendarLink\}\}/g, calendarLink);
      
      // Sanitize the final HTML content
      emailBody = sanitizeEmailContent(emailBody);

      // Use direct email sending to leverage our error handling
      await storage.sendDirectEmail(candidate.email, emailSubject, emailBody, req.user?.id);

      // Create in-app notification for interview invite sent
      try {
        await createNotification(
          req.user.id,
          "interview_scheduled", // Using interview_scheduled type for invite sent
          "Interview Invite Sent",
          `Interview invite sent to ${candidate.name} for ${job?.title || "a position"}`,
          `/candidates`,
          { candidateId: candidate.id, jobId: job?.id }
        );
      } catch (error) {
        console.error("[Candidate] Failed to create interview invite sent notification:", error);
      }

      // Check if an interview already exists for this candidate to prevent duplicates
      const existingInterviews = await storage.getInterviews(accountId, { candidateId: candidate.id });
      const existingScheduledInterview = existingInterviews.find(i => i.status === "scheduled" || i.status === "pending");
      
      if (!existingScheduledInterview) {
        // Create an interview record so it shows up in the Interviews tab
        // Status is "scheduled" but without a specific date (candidate will book via calendar)
        await storage.createInterview({
          accountId,
          candidateId: candidate.id,
          interviewerId: req.user?.id ?? null,
          type: "video", // Default to video interview
          status: "scheduled", // Will be updated when candidate books
          scheduledDate: null, // Will be set when candidate books on calendar
          notes: "Interview invitation sent - awaiting candidate to book via calendar link"
        });
      } else {
        // Update existing interview instead of creating duplicate
        await storage.updateInterview(existingScheduledInterview.id, accountId, {
          status: "scheduled",
          notes: "Interview invitation sent - awaiting candidate to book via calendar link",
          updatedAt: new Date()
        });
      }

      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Add candidate to talent pool
  app.post("/api/candidates/:id/talent-pool", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await storage.getUserAccountId(req.user!.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId, accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Get job details first
      const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;

      // Check for valid email before adding to talent pool
      if (isLikelyInvalidEmail(candidate.email)) {
        console.error(
          `❌ Rejected likely non-existent email: ${candidate.email}`,
        );

        // Log activity about the failed talent pool add
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Talent pool add failed - invalid email",
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            email: candidate.email,
          },
          timestamp: new Date(),
        });

        // Return a simple error message
        return res.status(422).json({
          message: "Email invalid",
          errorType: "non_existent_email",
        });
      }

      // Only update candidate status if email is valid
      const updatedCandidate = await storage.updateCandidate(candidateId, accountId, {
        status: "90_talent_pool",
        finalDecisionStatus: "talent_pool", // Also keep final decision status in sync
      });

      // Log activity
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Added candidate to talent pool",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date(),
      });

      // Get user's email templates
      const user = req.user ? await storage.getUser(req.user.id) : null;
      const senderName = user?.fullName || "Team Member";
      const companyName = getCompanyName(); // SECURITY: From environment variable
      
      // Default email templates
      const defaultSubject = `Thank you for your application to {{jobTitle}}`;
      const defaultBody = `
      <p>Hi {{candidateName}},</p>
      
      <p>Thank you for your interest in the {{jobTitle}} position at {{companyName}}.</p>
      
      <p>While we've decided to move forward with other candidates for this specific role, we were impressed with your background and would like to keep you in our talent pool for future opportunities.</p>
      
      <p>We'll reach out if a position opens up that matches your skills and experience.</p>
      
      <p>Thanks again for your interest!</p>
      
      <p>Best regards,<br>
      {{senderName}}<br>
      {{companyName}}</p>
      `;
      
      // Use user's custom template or default (from emailTemplates JSONB)
      const userTemplates = (user as any)?.emailTemplates || {};
      const talentPoolTemplate = userTemplates.talentPool || userTemplates.talent_pool || {};
      const subjectTemplate = talentPoolTemplate.subject || defaultSubject;
      const bodyTemplate = talentPoolTemplate.body || defaultBody;
      
      // SECURITY: Sanitize and replace placeholders in templates
      const emailSubject = sanitizeAndReplaceTemplate(
        subjectTemplate,
        candidate.name,
        job?.title || "the position",
        senderName,
        companyName
      );
      
      let emailBody = sanitizeAndReplaceTemplate(
        bodyTemplate,
        candidate.name,
        job?.title || "the position",
        senderName,
        companyName
      );
      
      // SECURITY: Sanitize HTML content
      emailBody = sanitizeEmailContent(emailBody);

      // Send email immediately
      try {
        await storage.sendDirectEmail(candidate.email, emailSubject, emailBody, req.user?.id);
      } catch (emailError: any) {
        // Don't fail the request if email fails - status is already updated
      }

      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Reject candidate
  app.post("/api/candidates/:id/reject", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await storage.getUserAccountId(req.user!.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId, accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Get job details first (needed for email)
      const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;

      // IMPORTANT: First check if email exists before updating candidate status
      // Use the same email validation as in sendDirectEmail
      const nodemailer = await import("nodemailer");

      // First check if the email is likely invalid
      if (isLikelyInvalidEmail(candidate.email)) {
        console.error(
          `❌ Rejected likely non-existent email: ${candidate.email}`,
        );

        // Do NOT update the candidate status for invalid emails

        // Log activity
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id ?? null,
          action: "Rejection failed - invalid email",
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            email: candidate.email,
          },
          timestamp: new Date(),
        });

        // Return a simple error message without any large objects
        return res.status(422).json({
          message: "Email invalid",
          errorType: "non_existent_email",
        });
      }

      // Email appears valid, proceed with updating the status
      const updatedCandidate = await storage.updateCandidate(candidateId, accountId, {
        status: "200_rejected",
        finalDecisionStatus: "rejected",
      });

      // Log activity
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Rejected candidate",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date(),
      });

      // Get user's email templates
      const user = req.user ? await storage.getUser(req.user.id) : null;
      const senderName = user?.fullName || "Team Member";
      const companyName = getCompanyName(); // SECURITY: From environment variable
      
      // Default email templates
      const defaultSubject = `Update on Your {{jobTitle}} Application`;
      const defaultBody = `
      <p>Hi {{candidateName}},</p>
      
      <p>Thanks for taking the time to interview for the {{jobTitle}} role with us. I really enjoyed our conversation and learning about your background and experience.</p>
      
      <p>After careful consideration, we've decided to move forward with another candidate for this position.</p>
      
      <p>I'd love to keep you in mind for future opportunities at {{companyName}}, as your skills and experience would be a great fit for our team. Feel free to stay connected, and I'll reach out if anything opens up that matches your background.</p>
      
      <p>Thanks again for your interest, and I wish you all the best!</p>
      
      <p>Best regards,<br>
      {{senderName}}<br>
      {{companyName}}</p>
      `;
      
      // Use user's custom template or default (from emailTemplates JSONB)
      const userTemplates = (user as any)?.emailTemplates || {};
      const rejectionTemplate = userTemplates.rejection || userTemplates.reject || {};
      const subjectTemplate = rejectionTemplate.subject || defaultSubject;
      const bodyTemplate = rejectionTemplate.body || defaultBody;
      
      // SECURITY: Sanitize and replace placeholders in templates
      const emailSubject = sanitizeAndReplaceTemplate(
        subjectTemplate,
        candidate.name,
        job?.title || "the position",
        senderName,
        companyName
      );
      
      let emailBody = sanitizeAndReplaceTemplate(
        bodyTemplate,
        candidate.name,
        job?.title || "the position",
        senderName,
        companyName
      );
      
      // SECURITY: Sanitize HTML content
      emailBody = sanitizeEmailContent(emailBody);

      // Send email immediately using sendDirectEmail
      try {
        await storage.sendDirectEmail(candidate.email, emailSubject, emailBody, req.user?.id);
      } catch (emailError: any) {
        // Don't fail the request if email fails - status is already updated
      }

      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Send offer to candidate
  app.post(
    "/api/candidates/:id/send-offer",
    validateRequest(
      z.object({
        offerType: z.string(),
        compensation: z.string(),
        startDate: z.string().optional(),
        notes: z.string().optional(),
      }),
    ),
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // MULTI-TENANT: Get user's accountId
        const accountId = await storage.getUserAccountId(req.user!.id);
        if (!accountId) {
          return res.status(400).json({ message: "User is not associated with any account" });
        }

        const candidateId = parseInt(req.params.id);
        if (isNaN(candidateId)) {
          return res.status(400).json({ message: "Invalid candidate ID" });
        }

        const candidate = await storage.getCandidate(candidateId, accountId);
        if (!candidate) {
          return res.status(404).json({ message: "Candidate not found" });
        }

        // Get job details first (needed for email template)
        const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;

        // First check if email is valid, similar to how reject works
        // Validate email exists before updating status
        try {
          if (isLikelyInvalidEmail(candidate.email)) {

            // Do not update candidate status or create offer for invalid email

            // Log failed attempt
            await storage.createActivityLog({
              accountId,
              userId: req.user?.id ?? null,
              action: "Offer send failed - invalid email",
              entityType: "candidate",
              entityId: candidate.id,
              details: {
                candidateName: candidate.name,
                jobTitle: job?.title,
                email: candidate.email,
                error: "Invalid or non-existent email address",
              },
              timestamp: new Date(),
            });

            // Return a simple error message without any large objects
            return res.status(422).json({
              message: "Email invalid",
              errorType: "non_existent_email",
            });
          }

          // Email appears valid, proceed with updating the status
          const updatedCandidate = await storage.updateCandidate(candidateId, accountId, {
            status: "95_offer_sent",
            finalDecisionStatus: "offer_sent", // Also update final decision status
          });

          // Create offer record
          const startDate = req.body.startDate
            ? new Date(req.body.startDate)
            : undefined;
          const offer = await storage.createOffer({
            accountId,
            candidateId,
            offerType: req.body.offerType,
            compensation: req.body.compensation,
            startDate,
            notes: req.body.notes,
            status: "sent",
            sentDate: new Date(),
            approvedById: req.user?.id,
            contractUrl: `https://firmos.ai/contracts/${candidateId}-${Date.now()}.pdf`,
          });

          // Send Slack notification for offer sent
          if (req.user?.id) {
            const user = await storage.getUser(req.user.id);
            const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
            if (user && job) {
              await notifySlackUsers(req.user.id, "offer_sent", {
                candidate: updatedCandidate,
                job,
                offer,
                user,
              });
            }
          }

          // Log activity for successful offer creation
          await storage.createActivityLog({
            accountId,
            userId: req.user?.id ?? null,
            action: "Sent offer to candidate",
            entityType: "candidate",
            entityId: candidate.id,
            details: {
              candidateName: candidate.name,
              jobTitle: job?.title,
              offerType: req.body.offerType,
              compensation: req.body.compensation,
            },
            timestamp: new Date(),
          });

          // Get user's email templates
          const user = req.user ? await storage.getUser(req.user.id) : null;
          const senderName = user?.fullName || "Team Member";
          const companyName = "Ready CPA";
          
          // Get base URL for acceptance link
          // Use PUBLIC_BASE_URL env variable if set (for production/ngrok), otherwise use request host
          const publicBaseUrl = process.env.PUBLIC_BASE_URL;
          let baseUrl: string;
          
          if (publicBaseUrl) {
            // Use configured public URL (remove trailing slash if present)
            baseUrl = publicBaseUrl.replace(/\/$/, '');
          } else {
            // Fall back to request host (works for localhost testing)
            const protocol = req.protocol || (req.secure ? 'https' : 'http');
            const host = req.get('host') || 'localhost:5000';
            baseUrl = `${protocol}://${host}`;
          }
          
          const acceptanceUrl = `${baseUrl}/accept-offer/${offer.acceptanceToken}`;
          
          
          // Default email templates
          const defaultSubject = `Excited to Offer You the {{jobTitle}} Position`;
          const defaultBody = `
          <p>Hi {{candidateName}},</p>
          
          <p>Great news — we'd love to bring you on board for the {{jobTitle}} position at {{companyName}}. After reviewing your experience, we're confident you'll make a strong impact on our team.</p>
          
          <p>Here's the link to your engagement contract: <a href="{{contractLink}}">[Contract Link]</a></p>
          
          <p>Please review and accept your offer here: <a href="{{acceptanceUrl}}">Accept Offer</a></p>
          
          <p>If anything's unclear or you'd like to chat, don't hesitate to reach out.</p>
          
          <p>Welcome aboard — we're excited to get started!</p>
          
          <p>Best regards,<br>
          {{senderName}}<br>
          {{companyName}}</p>
          `;
          
          // Use user's custom template or default (from emailTemplates JSONB)
          const userTemplates = (user as any)?.emailTemplates || {};
          const offerTemplate = userTemplates.offer || {};
          const subjectTemplate = offerTemplate.subject || defaultSubject;
          const bodyTemplate = offerTemplate.body || defaultBody;
          
          // SECURITY: Sanitize and replace placeholders in templates
          const emailSubject = sanitizeAndReplaceTemplate(
            subjectTemplate,
            candidate.name,
            job?.title || "the position",
            senderName,
            companyName
          );
          
          let emailBody = sanitizeAndReplaceTemplate(
            bodyTemplate,
            candidate.name,
            job?.title || "the position",
            senderName,
            companyName,
            { contractLink: offer.contractUrl || "#", acceptanceUrl }
          );
          
          // SECURITY: Sanitize HTML content
          emailBody = sanitizeEmailContent(emailBody);

          // Send the direct email
          await storage.sendDirectEmail(
            candidate.email,
            emailSubject,
            emailBody,
            req.user?.id
          );

          // Return success with updated candidate and offer
          res.json({
            candidate: updatedCandidate,
            offer,
          });
        } catch (error: any) {
          // Check if this is a non-existent email error from sendDirectEmail
          if (error.isNonExistentEmailError) {
            console.error("API Error:", error);

            // Return specific error for non-existent email
            return res.status(422).json({
              message: "Candidate email does not exist",
              errorType: "non_existent_email",
              candidate, // Return the original candidate without updates
            });
          }

          // Otherwise, let the general error handler deal with it
          throw error;
        }
      } catch (error) {
        handleApiError(error, res);
      }
    },
  );

  // Handle offer acceptance
  app.post("/api/candidates/:id/accept-offer", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await storage.getUserAccountId(req.user!.id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId, accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Update candidate status
      const updatedCandidate = await storage.updateCandidate(candidateId, accountId, {
        status: "100_offer_accepted",
      });

      // Update offer status
      const offer = await storage.getOfferByCandidate(candidateId, accountId);
      if (offer) {
        await storage.updateOffer(offer.id, accountId, {
          status: "accepted",
        });
      }

      // Get job details
      const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;

      // Log activity
      await storage.createActivityLog({
        accountId,
        userId: req.user?.id,
        action: "Candidate accepted offer",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date(),
      });

      // Send Slack notification for offer accepted
      if (offer && offer.approvedById) {
        const user = await storage.getUser(offer.approvedById);
        if (user && job) {
          await notifySlackUsers(offer.approvedById, "offer_accepted", {
            candidate,
            job,
            offer,
            user,
          });

          // Create in-app notification for offer accepted
          try {
            await createNotification(
              offer.approvedById,
              "offer_accepted",
              "Offer Accepted",
              `${candidate.name} accepted the offer for ${job.title}`,
              `/candidates`,
              { candidateId: candidate.id, jobId: job.id, offerId: offer.id }
            );
          } catch (error) {
            console.error("[Candidate] Failed to create offer accepted notification:", error);
          }
        }
      }

      // Queue onboarding email
      await storage.createNotification({
        type: "email",
        payload: {
          recipientEmail: candidate.email,
          subject: `Welcome to FirmOS - Onboarding Information`,
          template: "onboarding",
          context: {
            candidateName: candidate.name,
            jobTitle: job?.title,
            startDate: offer?.startDate
              ? new Date(offer.startDate).toLocaleDateString()
              : "To be determined",
            contractUrl: offer?.contractUrl,
          },
        },
        processAfter: new Date(),
        status: "pending",
      });

      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Public endpoint: Get offer details by token (no auth required)
  app.get("/api/offers/:token", async (req, res) => {
    try {
      const token = req.params.token;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const offer = await storage.getOfferByToken(token);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found or invalid token" });
      }

      // Check if offer is already accepted or declined
      if (offer.status === "accepted") {
        return res.status(400).json({ message: "This offer has already been accepted" });
      }
      if (offer.status === "declined") {
        return res.status(400).json({ message: "This offer has already been declined" });
      }
      if (offer.status !== "sent") {
        return res.status(400).json({ message: "This offer is not available for acceptance" });
      }

      // Get candidate and job details (use accountId from offer)
      const candidate = await storage.getCandidate(offer.candidateId, offer.accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const job = candidate.jobId ? await storage.getJob(candidate.jobId, offer.accountId) : null;

      // Return offer details (safe for public viewing)
      res.json({
        offer: {
          id: offer.id,
          offerType: offer.offerType,
          compensation: offer.compensation,
          startDate: offer.startDate,
          notes: offer.notes,
          contractUrl: offer.contractUrl,
        },
        candidate: {
          name: candidate.name,
          email: candidate.email,
        },
        job: job ? {
          title: job.title,
          type: job.type,
        } : null,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Public endpoint: Accept or decline offer by token (no auth required)
  app.post("/api/offers/:token/respond", async (req, res) => {
    try {
      const token = req.params.token;
      const { action } = req.body; // "accept" or "decline"

      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      if (!action || (action !== "accept" && action !== "decline")) {
        return res.status(400).json({ message: "Action must be 'accept' or 'decline'" });
      }

      const offer = await storage.getOfferByToken(token);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found or invalid token" });
      }

      // Check if offer is already processed
      if (offer.status === "accepted") {
        return res.status(400).json({ message: "This offer has already been accepted" });
      }
      if (offer.status === "declined") {
        return res.status(400).json({ message: "This offer has already been declined" });
      }

      // Get candidate and job details (use accountId from offer)
      const candidate = await storage.getCandidate(offer.candidateId, offer.accountId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const job = candidate.jobId ? await storage.getJob(candidate.jobId, offer.accountId) : null;

      if (action === "accept") {
        // Update offer status
        await storage.updateOffer(offer.id, offer.accountId, {
          status: "accepted",
        });

        // Update candidate status
        await storage.updateCandidate(offer.candidateId, offer.accountId, {
          status: "100_offer_accepted",
        });

        // Get the user who sent the offer (for email template)
        const approvingUser = offer.approvedById ? await storage.getUser(offer.approvedById) : null;
        const senderName = approvingUser?.fullName || "Team Member";
        const companyName = getCompanyName(); // SECURITY: From environment variable

        // Get onboarding calendar link from the user who sent the offer
        const onboardingLink = approvingUser?.calendarLink || "#";

        // Default onboarding email template
        const defaultOnboardingSubject = `Welcome to {{companyName}}!`;
        const defaultOnboardingBody = `
        <p>Hi {{candidateName}},</p>
        
        <p>Welcome to {{companyName}}! We're thrilled to have you join our team as {{jobTitle}}.</p>
        
        <p>To get started, please complete the onboarding checklist and schedule your first day.</p>
        
        <p>Schedule your onboarding call here: <a href="{{onboardingLink}}">Schedule Onboarding</a></p>
        
        <p>If you have any questions before your start date, don't hesitate to reach out.</p>
        
        <p>Looking forward to working with you!</p>
        
        <p>Best regards,<br>
        {{senderName}}<br>
        {{companyName}}</p>
        `;

        // Use user's custom onboarding template or default
        const userTemplates = (approvingUser as any)?.emailTemplates || {};
        const onboardingTemplate = userTemplates.onboarding || {};
        const onboardingSubjectTemplate = onboardingTemplate.subject || defaultOnboardingSubject;
        const onboardingBodyTemplate = onboardingTemplate.body || defaultOnboardingBody;

        // Replace placeholders
        const onboardingSubject = onboardingSubjectTemplate
          .replace(/\{\{candidateName\}\}/g, candidate.name)
          .replace(/\{\{jobTitle\}\}/g, job?.title || "the position")
          .replace(/\{\{senderName\}\}/g, senderName)
          .replace(/\{\{companyName\}\}/g, companyName);

        const onboardingBody = onboardingBodyTemplate
          .replace(/\{\{candidateName\}\}/g, candidate.name)
          .replace(/\{\{jobTitle\}\}/g, job?.title || "the position")
          .replace(/\{\{senderName\}\}/g, senderName)
          .replace(/\{\{companyName\}\}/g, companyName)
          .replace(/\{\{onboardingLink\}\}/g, onboardingLink);

        // Send onboarding email immediately
        try {
          await storage.sendDirectEmail(candidate.email, onboardingSubject, onboardingBody, req.user?.id);
        } catch (emailError: any) {
          // Log error but don't fail the request
          console.error("Error sending onboarding email:", emailError);
        }

        // Send Slack notification
        try {
          await storage.createNotification({
            type: "slack",
            payload: {
              channel: "onboarding",
              message: `${candidate.name} has accepted the offer for ${job?.title} position!`,
              candidateId: candidate.id,
              jobId: candidate.jobId,
            },
            processAfter: new Date(),
            status: "pending",
          });
        } catch (slackError: any) {
          // Log error but don't fail the request
          console.error("Error creating Slack notification:", slackError);
        }

        // Log activity
        await storage.createActivityLog({
          accountId: offer.accountId,
          userId: offer.approvedById ?? null,
          action: "Candidate accepted offer",
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, jobTitle: job?.title },
          timestamp: new Date(),
        });

        res.json({
          success: true,
          message: "Offer accepted successfully. Onboarding email has been sent.",
        });
      } else {
        // Decline offer
        await storage.updateOffer(offer.id, offer.accountId, {
          status: "declined",
        });

        await storage.updateCandidate(offer.candidateId, offer.accountId, {
          status: "200_rejected",
          finalDecisionStatus: "rejected",
        });

        // Log activity
        await storage.createActivityLog({
          accountId: offer.accountId,
          userId: offer.approvedById ?? null,
          action: "Candidate declined offer",
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, jobTitle: job?.title },
          timestamp: new Date(),
        });

        res.json({
          success: true,
          message: "Offer declined successfully.",
        });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
