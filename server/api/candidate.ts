import { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertCandidateSchema, emailLogs } from "@shared/schema";
import { handleApiError, validateRequest } from "./utils";
import { isLikelyInvalidEmail } from "../email-validator";
import { db } from "../db";

export function setupCandidateRoutes(app: Express) {
  // Create a new candidate
  app.post("/api/candidates", validateRequest(insertCandidateSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const candidate = await storage.createCandidate(req.body);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Added candidate",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobId: candidate.jobId },
        timestamp: new Date()
      });

      // If express review is enabled, send assessment immediately
      // Otherwise, schedule it for 3 hours later
      const job = await storage.getJob(candidate.jobId);
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
            hiPeopleLink: job?.hiPeopleLink
          }
        },
        processAfter,
        status: "pending"
      });

      res.status(201).json(candidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get all candidates with optional filtering
  app.get("/api/candidates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
      const status = req.query.status as string | undefined;
      const hiPeoplePercentile = req.query.hiPeoplePercentile 
        ? parseInt(req.query.hiPeoplePercentile as string)
        : undefined;
      
      // Get candidates based on filters
      const candidates = await storage.getCandidates({
        jobId,
        status,
        hiPeoplePercentile
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

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId);
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

      // Check permissions for evaluation criteria updates
      const hasEvaluationFields = 
        req.body.technicalProficiency !== undefined ||
        req.body.leadershipInitiative !== undefined ||
        req.body.problemSolving !== undefined ||
        req.body.communicationSkills !== undefined ||
        req.body.culturalFit !== undefined ||
        req.body.hiPeopleScore !== undefined ||
        req.body.hiPeoplePercentile !== undefined;

      // Only CEO or COO can update evaluation criteria
      if (hasEvaluationFields && 
          req.user?.role !== 'ceo' && 
          req.user?.role !== 'coo' && 
          req.user?.role !== 'admin') {
        return res.status(403).json({ 
          message: "Only CEO or COO can update candidate evaluation criteria" 
        });
      }

      const updatedCandidate = await storage.updateCandidate(candidateId, req.body);

      // If status was changed to "interview sent", queue interview invitation email
      if (
        req.body.status &&
        req.body.status === "45_1st_interview_sent" &&
        req.body.status !== candidate.status
      ) {
        const job = await storage.getJob(candidate.jobId);

        if (job) {
          await storage.createNotification({
            type: "email",
            payload: {
              recipientEmail: candidate.email,
              subject: `${candidate.name}, Let's Discuss Your Fit for Our ${job?.title} Position`,
              template: "custom",
              context: {
                body: `
                Hi ${candidate.name},<br><br>

                It's Aaron Ready from Ready CPA. I came across your profile and would like to chat about your background and how you might fit in our <b>${job?.title}</b> position.<br><br>

                Feel free to grab a time on my calendar when you're available:<br>
                <a href="https://www.calendar.com/aaronready/client-meeting">Schedule your interview here</a><br><br>

                Looking forward to connecting!<br><br>

                Thanks,<br>
                Aaron Ready, CPA<br>
                Ready CPA
                `.trim()
              }
              },
              processAfter: new Date(),
              status: "pending"
              });
        }
      }

      // If status changed to offer_sent OR final decision changed to offer, send offer email
      if ((req.body.status === "95_offer_sent" && candidate.status !== "95_offer_sent") || 
          (req.body.finalDecisionStatus === "offer" && candidate.finalDecisionStatus !== "offer")) {
        
        // Get job details
        const job = await storage.getJob(candidate.jobId);
        
        // Create offer record if none exists
        let offer = await storage.getOfferByCandidate(candidateId);
        if (!offer) {
          offer = await storage.createOffer({
            candidateId,
            offerType: "Full-time", // Default value
            compensation: "Competitive", // Default value
            status: "sent",
            sentDate: new Date(),
            approvedById: req.user?.id,
            contractUrl: `https://talent.firmos.app/web-manager-contract453986`
          });
        }

        // Log activity
        await storage.createActivityLog({
          userId: req.user?.id,
          action: "Sent offer to candidate",
          entityType: "candidate",
          entityId: candidate.id,
          details: { 
            candidateName: candidate.name, 
            jobTitle: job?.title
          },
          timestamp: new Date()
        });

        // Send direct offer email (immediate, no queue)
        const emailSubject = `Excited to Offer You the ${job?.title} Position`;
        const emailBody = `
        <p>Hi ${candidate.name},</p>

        <p>Great news — we'd love to bring you on board for the ${job?.title} position at Ready CPA. After reviewing your experience, we're confident you'll make a strong impact on our team.</p>

        <p>Here's the link to your engagement contract:
        <a href="https://talent.firmos.app/web-manager-contract453986">[Contract Link]</a></p>

        <p>To kick things off, please schedule your onboarding call here:
        <a href="https://www.calendar.com/aaronready/client-meeting">[Onboarding Calendar Link]</a></p>

        <p>If anything's unclear or you'd like to chat, don't hesitate to reach out.</p>

        <p>Welcome aboard — we're excited to get started!</p>

        <p>Best regards,<br>
        Aaron Ready, CPA<br>
        Ready CPA</p>
        `;
        
        await storage.sendDirectEmail(candidate.email, emailSubject, emailBody);
      }
      
      // Log status change activity
      if (req.body.status && req.body.status !== candidate.status) {
        await storage.createActivityLog({
          userId: req.user?.id,
          action: `Updated candidate status to ${req.body.status}`,
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, previousStatus: candidate.status, newStatus: req.body.status },
          timestamp: new Date()
        });
      }

      // Log evaluation update activity
      if (hasEvaluationFields) {
        await storage.createActivityLog({
          userId: req.user?.id,
          action: "Updated candidate evaluation",
          entityType: "candidate",
          entityId: candidate.id,
          details: { 
            candidateName: candidate.name,
            updates: Object.keys(req.body).filter(key => 
              ['technicalProficiency', 'leadershipInitiative', 'problemSolving', 
               'communicationSkills', 'culturalFit', 'hiPeopleScore', 'hiPeoplePercentile'].includes(key)
            )
          },
          timestamp: new Date()
        });
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

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Update candidate status
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "45_1st_interview_sent"
      });

      // Get job details
      const job = await storage.getJob(candidate.jobId);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Invited candidate to interview",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date()
      });

      // Send direct interview invitation email (immediate, no queue)
      const emailSubject = `${candidate.name}, Let's Discuss Your Fit for Our ${job?.title} Position`;
      const emailBody = `
      <p>Hi ${candidate.name},</p>
      
      <p>It's Aaron Ready from Ready CPA. I came across your profile and would like to chat about your background and how you might fit in our <b>${job?.title}</b> position.</p>
      
      <p>Feel free to grab a time on my calendar when you're available:<br>
      <a href="https://www.calendar.com/aaronready/client-meeting">Schedule your interview here</a></p>
      
      <p>Looking forward to connecting!</p>
      
      <p>Thanks,<br>
      Aaron Ready, CPA<br>
      Ready CPA</p>
      `;
      
      // Use direct email sending to leverage our error handling
      await storage.sendDirectEmail(candidate.email, emailSubject, emailBody);

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

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Update candidate status
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "90_talent_pool"
      });

      // Get job details
      const job = await storage.getJob(candidate.jobId);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Added candidate to talent pool",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date()
      });

      // Queue talent pool email (with 2-hour delay)
      await storage.createNotification({
        type: "email",
        payload: {
          recipientEmail: candidate.email,
          subject: `Thank you for your application to ${job?.title}`,
          template: "talent-pool",
          context: {
            candidateName: candidate.name,
            jobTitle: job?.title
          }
        },
        processAfter: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
        status: "pending"
      });

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

      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Get job details first (needed for email)
      const job = await storage.getJob(candidate.jobId);
      
      // IMPORTANT: First check if email exists before updating candidate status
      // Use the same email validation as in sendDirectEmail
      const nodemailer = await import('nodemailer');
      
      // First check if the email is likely invalid
      if (isLikelyInvalidEmail(candidate.email)) {
        console.error(`❌ Rejected likely non-existent email: ${candidate.email}`);
        
        // Do NOT update the candidate status for invalid emails
        
        // Log activity
        await storage.createActivityLog({
          userId: req.user?.id,
          action: "Rejection failed - invalid email",
          entityType: "candidate",
          entityId: candidate.id,
          details: { candidateName: candidate.name, jobTitle: job?.title, email: candidate.email },
          timestamp: new Date()
        });
        
        // Return the error without updating the candidate
        return res.status(422).json({
          message: "Candidate email does not exist",
          errorType: "non_existent_email",
          candidate // Return the original candidate without updates
        });
      }
      
      // Email appears valid, proceed with updating the status
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "200_rejected",
        finalDecisionStatus: "rejected"
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Rejected candidate",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date()
      });

      // Send the email directly (not using sendDirectEmail to avoid error throwing)
      const emailSubject = `Update on Your ${job?.title} Application`;
      const emailBody = `
      <p>Hi ${candidate.name},</p>
      
      <p>Thank you for taking the time to apply for the ${job?.title} position at Ready CPA. We truly appreciate your interest in joining our team and the effort you put into your application.</p>
      
      <p>After careful consideration, we've decided to move forward with other candidates whose experience more closely matches the needs of the role at this time.</p>
      
      <p>We wish you all the best in your job search and future endeavors. We're confident the right opportunity is just around the corner for you.</p>
      
      <p>Thank you again for your interest in Ready CPA.</p>
      
      <p>Best regards,<br>
      Aaron Ready, CPA<br>
      Ready CPA</p>
      `;
      
      // Create a transporter for sending email - same as the working one in offer and interview
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "earyljames.capitle18@gmail.com",
          pass: "fkjl gklg tamh vugj"
        }
      });

      const mailOptions = {
        from: "earyljames.capitle18@gmail.com",
        to: candidate.email,
        subject: emailSubject,
        html: emailBody
      };

      try {
        await transporter.sendMail(mailOptions);
        
        // Log a successful email send
        console.log(`✅ Rejection email sent to ${candidate.email} for job: ${job?.title}`);
        
        // Log the email in the database
        await db
          .insert(emailLogs)
          .values({
            recipientEmail: candidate.email,
            subject: emailSubject,
            template: 'rejection',
            context: { body: emailBody },
            status: 'sent',
            sentAt: new Date(),
            createdAt: new Date()
          });
        
        // Return success with updated candidate
        res.json(updatedCandidate);
      } catch (emailError: any) {
        console.error('❌ Error sending rejection email:', emailError);
        
        // Log the failure in email_logs
        await db
          .insert(emailLogs)
          .values({
            recipientEmail: candidate.email,
            subject: emailSubject,
            template: 'rejection',
            context: { body: emailBody },
            status: 'failed',
            error: String(emailError),
            createdAt: new Date()
          });
        
        // Return a success with the updated candidate but note the email failure
        // We don't want to prevent rejection just because email failed
        res.status(200).json({
          message: "Candidate rejected but email failed to send",
          emailError: String(emailError),
          candidate: updatedCandidate
        });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Send offer to candidate
  app.post("/api/candidates/:id/send-offer", validateRequest(
    z.object({
      offerType: z.string(),
      compensation: z.string(),
      startDate: z.string().optional(),
      notes: z.string().optional()
    })
  ), async (req, res) => {
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

      // Get job details first (needed for email template)
      const job = await storage.getJob(candidate.jobId);

      // First check if email is valid, similar to how reject works
      // Validate email exists before updating status
      try {
        if (isLikelyInvalidEmail(candidate.email)) {
          console.log(`❌ Rejected likely non-existent email: ${candidate.email}`);
          
          // Do not update candidate status or create offer for invalid email
          
          // Log failed attempt
          await storage.createActivityLog({
            userId: req.user?.id,
            action: "Offer send failed - invalid email",
            entityType: "candidate",
            entityId: candidate.id,
            details: { 
              candidateName: candidate.name, 
              jobTitle: job?.title,
              email: candidate.email,
              error: "Invalid or non-existent email address"
            },
            timestamp: new Date()
          });
          
          // Return error with original candidate
          return res.status(422).json({
            message: "Candidate email does not exist",
            errorType: "non_existent_email",
            candidate // Return the original candidate without updates
          });
        }
        
        // Email appears valid, proceed with updating the status
        const updatedCandidate = await storage.updateCandidate(candidateId, {
          status: "95_offer_sent",
          finalDecisionStatus: "offer_sent"  // Also update final decision status
        });
  
        // Create offer record
        const startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
        const offer = await storage.createOffer({
          candidateId,
          offerType: req.body.offerType,
          compensation: req.body.compensation,
          startDate,
          notes: req.body.notes,
          status: "sent",
          sentDate: new Date(),
          approvedById: req.user?.id,
          contractUrl: `https://firmos.ai/contracts/${candidateId}-${Date.now()}.pdf`
        });
        
        // Log activity for successful offer creation
        await storage.createActivityLog({
          userId: req.user?.id,
          action: "Sent offer to candidate",
          entityType: "candidate",
          entityId: candidate.id,
          details: { 
            candidateName: candidate.name, 
            jobTitle: job?.title,
            offerType: req.body.offerType,
            compensation: req.body.compensation 
          },
          timestamp: new Date()
        });
  
        // Send direct offer email (immediate, no queue)
        const emailSubject = `Excited to Offer You the ${job?.title} Position`;
        const emailBody = `
        <p>Hi ${candidate.name},</p>
  
        <p>Great news — we'd love to bring you on board for the ${job?.title} position at Ready CPA. After reviewing your experience, we're confident you'll make a strong impact on our team.</p>
  
        <p>Here's the link to your engagement contract:
        <a href="https://talent.firmos.app/web-manager-contract453986">[Contract Link]</a></p>
  
        <p>To kick things off, please schedule your onboarding call here:  <a href="https://www.calendar.com/aaronready/client-meeting">[Onboarding Calendar Link]</a></p>
  
        <p>If anything's unclear or you'd like to chat, don't hesitate to reach out.</p>
  
        <p>Welcome aboard — we're excited to get started!</p>
  
        <p>Best regards,<br>
        Aaron Ready, CPA<br>
        Ready CPA</p>
        `;
        
        // Send the direct email 
        await storage.sendDirectEmail(candidate.email, emailSubject, emailBody);
  
        // Return success with updated candidate and offer
        res.json({
          candidate: updatedCandidate,
          offer
        });
      } catch (error: any) {
        // Check if this is a non-existent email error from sendDirectEmail
        if (error.isNonExistentEmailError) {
          console.error("API Error:", error);
          
          // Return specific error for non-existent email
          return res.status(422).json({
            message: "Candidate email does not exist",
            errorType: "non_existent_email",
            candidate // Return the original candidate without updates
          });
        }
        
        // Otherwise, let the general error handler deal with it
        throw error;
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Handle offer acceptance
  app.post("/api/candidates/:id/accept-offer", async (req, res) => {
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

      // Update candidate status
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: "100_offer_accepted"
      });

      // Update offer status
      const offer = await storage.getOfferByCandidate(candidateId);
      if (offer) {
        await storage.updateOffer(offer.id, {
          status: "accepted"
        });
      }

      // Get job details
      const job = await storage.getJob(candidate.jobId);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user?.id,
        action: "Candidate accepted offer",
        entityType: "candidate",
        entityId: candidate.id,
        details: { candidateName: candidate.name, jobTitle: job?.title },
        timestamp: new Date()
      });

      // Send Slack notification
      await storage.createNotification({
        type: "slack",
        payload: {
          channel: "onboarding",
          message: `${candidate.name} has accepted the offer for ${job?.title} position!`,
          candidateId: candidate.id,
          jobId: candidate.jobId
        },
        processAfter: new Date(),
        status: "pending"
      });

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
            startDate: offer?.startDate ? new Date(offer.startDate).toLocaleDateString() : "To be determined",
            contractUrl: offer?.contractUrl
          }
        },
        processAfter: new Date(),
        status: "pending"
      });

      res.json(updatedCandidate);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
