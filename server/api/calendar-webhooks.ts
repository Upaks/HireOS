import { Express } from "express";
import { storage } from "../storage";
import { handleApiError } from "./utils";
import { isLikelyInvalidEmail } from "../email-validator";
import { notifySlackUsers } from "../slack-notifications";
import { createNotification } from "./notifications";
import { createGoogleCalendarEvent } from "./google-calendar";

// Calendar provider types
type CalendarProvider = "calendly" | "cal.com" | "google" | "custom";

// Webhook payload interfaces for different providers
interface CalendlyWebhookPayload {
  event: string; // "invitee.created", "invitee.canceled"
  payload: {
    event_uri: string;
    invitee: {
      email: string;
      name: string;
      created_at: string;
      canceled: boolean;
    };
    event_type: {
      name: string;
    };
    event: {
      start_time: string;
      end_time: string;
      timezone: string;
    };
  };
}

interface CalComWebhookPayload {
  triggerEvent: string; // "BOOKING_CREATED", "BOOKING_CANCELLED"
  payload: {
    id: number;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    attendee: {
      email: string;
      name: string;
    };
    organizer: {
      email: string;
      name: string;
    };
  };
}

interface GoogleCalendarWebhookPayload {
  kind: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description: string;
  location: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees: Array<{
    email: string;
    displayName: string;
    responseStatus: string;
  }>;
  organizer: {
    email: string;
    displayName: string;
  };
}

/**
 * Find candidate by email and update their interview
 * @param candidateEmail - Email of the candidate who booked
 * @param scheduledDate - Date/time of the booking
 * @param provider - Calendar provider (calendly, cal.com, google, etc.)
 * @param userId - ID of the user whose calendar received the booking (optional, for multi-user scenarios)
 */
async function updateInterviewFromBooking(
  candidateEmail: string,
  scheduledDate: Date,
  provider: CalendarProvider,
  userId?: number
): Promise<boolean> {
  try {
    // MULTI-TENANT: Get accountId from userId (required for multi-tenant data isolation)
    if (!userId) {
      console.error(`[Calendar Webhook] userId is required for multi-tenant data isolation`);
      return false;
    }
    
    const accountId = await storage.getUserAccountId(userId);
    if (!accountId) {
      console.error(`[Calendar Webhook] User ${userId} is not associated with any account`);
      return false;
    }

    // Find candidate by email within the user's account
    const candidates = await storage.getCandidates(accountId, {});
    const candidate = candidates.find(c => c.email.toLowerCase() === candidateEmail.toLowerCase());
    
    if (!candidate) {
      return false;
    }

    // Find scheduled interview for this candidate
    // If userId is provided, prioritize interviews where this user is the interviewer
    const interviews = await storage.getInterviews(accountId, { candidateId: candidate.id });
    
    let scheduledInterview = interviews.find(
      i => (i.status === "scheduled" || i.status === "pending")
    );

    // If userId is provided, try to find interview with matching interviewerId
    if (userId && scheduledInterview) {
      const userSpecificInterview = interviews.find(
        i => (i.status === "scheduled" || i.status === "pending") && i.interviewerId === userId
      );
      if (userSpecificInterview) {
        scheduledInterview = userSpecificInterview;
      }
    }

    // If no interview exists, create one automatically
    if (!scheduledInterview) {
      const newInterview = await storage.createInterview({
        accountId,
        candidateId: candidate.id,
        type: "video",
        status: "scheduled",
        scheduledDate: scheduledDate,
        interviewerId: userId || null,
        notes: `Automatically created from ${provider} booking on ${new Date().toISOString()}`,
      });
      scheduledInterview = newInterview;
    }

    // Update interview with scheduled date
    await storage.updateInterview(scheduledInterview.id, accountId, {
      scheduledDate: scheduledDate,
      status: "scheduled",
      notes: scheduledInterview.notes 
        ? `${scheduledInterview.notes}\n\nAutomatically updated from ${provider} booking on ${new Date().toISOString()}`
        : `Automatically updated from ${provider} booking on ${new Date().toISOString()}`,
      updatedAt: new Date()
    });

    // Update candidate status if needed
    if (candidate.status !== "60_1st_interview_scheduled") {
      await storage.updateCandidate(candidate.id, accountId, {
        status: "60_1st_interview_scheduled"
      });
    }

    // Send Slack notification for interview scheduled
    const job = candidate.jobId ? await storage.getJob(candidate.jobId, accountId) : null;
    const updatedInterview = await storage.getInterview(scheduledInterview.id, accountId);
    if (updatedInterview && candidate && job && userId) {
      await notifySlackUsers(userId, "interview_scheduled", {
        candidate,
        job,
        interview: updatedInterview,
      });

      // Create in-app notification for interview scheduled
      try {
        const jobTitle = job?.title || "position";
        await createNotification(
          userId,
          "interview_scheduled",
          "Interview Scheduled",
          `Interview scheduled: ${candidate.name} (${jobTitle}) on ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}`,
          `/candidates`,
          { candidateId: candidate.id, jobId: job?.id, interviewId: scheduledInterview.id }
        );
      } catch (error) {
        console.error("[Calendar Webhook] Failed to create notification:", error);
        // Don't fail the webhook if notification fails
      }

      // Create Google Calendar event if Google Calendar is connected and sync with Calendly is enabled
      if (provider === "calendly" && userId) {
        try {
          const googleCalendarIntegration = await storage.getPlatformIntegration('google-calendar', userId);
          const credentials = googleCalendarIntegration?.credentials as any;
          const syncWithCalendly = credentials?.syncWithCalendly || false;
          
          if (googleCalendarIntegration?.status === 'connected' && syncWithCalendly && updatedInterview) {
            const interviewer = updatedInterview.interviewerId ? await storage.getUser(updatedInterview.interviewerId) : null;
            
            await createGoogleCalendarEvent(userId, {
              id: updatedInterview.id,
              candidateId: candidate.id,
              scheduledDate,
              type: updatedInterview.type || "video",
              videoUrl: updatedInterview.videoUrl || undefined,
              candidate: {
                name: candidate.name,
                email: candidate.email,
              },
              job: job ? { title: job.title } : undefined,
              interviewer: interviewer ? {
                fullName: interviewer.fullName,
                email: interviewer.email,
              } : undefined,
            });
          }
        } catch (error) {
          console.error("[Calendar Webhook] Failed to create Google Calendar event:", error);
          // Don't fail the webhook if calendar event fails
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating interview from calendar booking:", error);
    return false;
  }
}

/**
 * Handle Calendly webhook
 */
async function handleCalendlyWebhook(req: any, res: any) {
  try {
    const payload = req.body;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    console.log('[Calendly Webhook] Received webhook, userId:', userId);
    console.log('[Calendly Webhook] Payload event:', payload.event);

    // Calendly webhook structure can vary:
    // Option 1: { event: "invitee.created", payload: { ... } }
    // Option 2: { event: "invitee.created", payload: { invitee: { email, ... }, scheduled_event: { start_time, ... } } }
    const eventType = payload.event;
    
    // Handle cancellation events
    if (eventType === "invitee.canceled") {
      console.log('[Calendly Webhook] Processing cancellation event');
      const inviteeData = payload.payload;
      const candidateEmail = inviteeData?.email || inviteeData?.invitee?.email;
      
      if (candidateEmail && userId) {
        // MULTI-TENANT: Get accountId from userId
        const accountId = await storage.getUserAccountId(userId);
        if (!accountId) {
          console.error(`[Calendly Webhook] User ${userId} is not associated with any account`);
          return res.status(400).json({ message: "User is not associated with any account" });
        }
        
        // Find candidate and cancel their interview
        const candidates = await storage.getCandidates(accountId, {});
        const candidate = candidates.find(c => c.email.toLowerCase() === candidateEmail.toLowerCase());
        
        if (candidate) {
          const interviews = await storage.getInterviews(accountId, { candidateId: candidate.id });
          const scheduledInterview = interviews.find(i => i.status === "scheduled" || i.status === "pending");
          
          if (scheduledInterview) {
            // Update interview status to cancelled instead of deleting
            await storage.updateInterview(scheduledInterview.id, accountId, {
              status: "cancelled",
              updatedAt: new Date()
            });
            console.log(`[Calendly Webhook] Cancelled interview ${scheduledInterview.id} for ${candidate.name}`);
            
            // Update candidate status if needed
            if (candidate.status === "60_1st_interview_scheduled") {
              await storage.updateCandidate(candidate.id, accountId, {
                status: "45_1st_interview_sent" // Revert to interview sent status
              });
            }
            
            return res.status(200).json({ message: "Interview cancelled successfully" });
          } else {
            console.log(`[Calendly Webhook] No scheduled interview found for ${candidate.name}`);
            return res.status(200).json({ message: "No scheduled interview found to cancel" });
          }
        } else {
          console.log(`[Calendly Webhook] Candidate not found for email: ${candidateEmail}`);
          return res.status(200).json({ message: "Candidate not found" });
        }
      } else {
        console.error('[Calendly Webhook] Missing email in cancellation payload');
        return res.status(400).json({ message: "Missing email in cancellation payload" });
      }
    }
    
    // Handle rescheduling events (invitee.updated)
    if (eventType === "invitee.updated") {
      console.log('[Calendly Webhook] Processing reschedule event');
      const inviteeData = payload.payload;
      const candidateEmail = inviteeData?.email || inviteeData?.invitee?.email;
      
      if (!candidateEmail) {
        console.error('[Calendly Webhook] Missing email in reschedule payload');
        return res.status(400).json({ message: "Missing email in reschedule payload" });
      }
      
      // Get scheduled event data
      const scheduledEvent = inviteeData.scheduled_event || payload.scheduled_event;
      if (!scheduledEvent || !scheduledEvent.start_time) {
        console.error('[Calendly Webhook] Missing scheduled_event.start_time in reschedule');
        return res.status(400).json({ message: "Missing scheduled_event.start_time in reschedule" });
      }
      
      const newScheduledDate = new Date(scheduledEvent.start_time);
      console.log(`[Calendly Webhook] Rescheduling to: ${newScheduledDate.toISOString()}`);
      
      // Use the same update function as booking - it will update the existing interview
      const updated = await updateInterviewFromBooking(candidateEmail, newScheduledDate, "calendly", userId);
      
      if (updated) {
        console.log('[Calendly Webhook] Interview rescheduled successfully');
        res.status(200).json({ message: "Interview rescheduled successfully" });
      } else {
        console.log('[Calendly Webhook] Failed to reschedule - candidate not found or other error');
        res.status(200).json({ message: "No matching candidate found. Please ensure the candidate exists in HireOS with this email address." });
      }
      return;
    }
    
    // Only process "invitee.created" events (when someone books)
    if (eventType !== "invitee.created") {
      console.log(`[Calendly Webhook] Ignoring event type: ${eventType}`);
      return res.status(200).json({ message: "Event ignored" });
    }

    // Extract invitee data from payload
    const inviteeData = payload.payload;
    
    if (!inviteeData) {
      console.error('[Calendly Webhook] Missing payload data');
      return res.status(400).json({ message: "Missing payload data" });
    }

    // Get email - could be in inviteeData.email or inviteeData.invitee.email
    const candidateEmail = inviteeData.email || inviteeData.invitee?.email;
    
    if (!candidateEmail) {
      console.error('[Calendly Webhook] Missing email in payload');
      return res.status(400).json({ message: "Missing email in payload" });
    }

    // Get scheduled event data - could be in inviteeData.scheduled_event or payload.scheduled_event
    const scheduledEvent = inviteeData.scheduled_event || payload.scheduled_event;
    
    if (!scheduledEvent || !scheduledEvent.start_time) {
      console.error('[Calendly Webhook] Missing scheduled_event.start_time');
      return res.status(400).json({ message: "Missing scheduled_event.start_time" });
    }

    // Skip if canceled (check status) - rescheduling is handled separately via invitee.updated event
    if (inviteeData.status !== 'active') {
      console.log(`[Calendly Webhook] Skipping inactive event with status: ${inviteeData.status}`);
      return res.status(200).json({ message: "Event was canceled or inactive" });
    }

    const scheduledDate = new Date(scheduledEvent.start_time);

    const updated = await updateInterviewFromBooking(candidateEmail, scheduledDate, "calendly", userId);
    
    if (updated) {
      res.status(200).json({ message: "Interview updated successfully" });
    } else {
      res.status(200).json({ message: "No matching candidate found. Please ensure the candidate exists in HireOS with this email address." });
    }
  } catch (error) {
    console.error('[Calendly Webhook] Error:', error);
    handleApiError(error, res);
  }
}

/**
 * Handle Cal.com webhook
 */
async function handleCalComWebhook(req: any, res: any) {
  try {
    const payload: CalComWebhookPayload = req.body;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    // Only process "BOOKING_CREATED" events
    if (payload.triggerEvent !== "BOOKING_CREATED") {
      return res.status(200).json({ message: "Event ignored" });
    }

    const attendee = payload.payload.attendee;
    const candidateEmail = attendee.email;
    const scheduledDate = new Date(payload.payload.startTime);

    const updated = await updateInterviewFromBooking(candidateEmail, scheduledDate, "cal.com", userId);
    
    if (updated) {
      res.status(200).json({ message: "Interview updated successfully" });
    } else {
      res.status(200).json({ message: "No matching candidate or interview found" });
    }
  } catch (error) {
    handleApiError(error, res);
  }
}

/**
 * Handle Google Calendar webhook (via Google Calendar API)
 */
async function handleGoogleCalendarWebhook(req: any, res: any) {
  try {
    const payload: GoogleCalendarWebhookPayload = req.body;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    // Find candidate email in attendees
    const candidateAttendee = payload.attendees?.find(
      a => a.email && !isLikelyInvalidEmail(a.email)
    );

    if (!candidateAttendee) {
      return res.status(200).json({ message: "No candidate email found in attendees" });
    }

    const candidateEmail = candidateAttendee.email;
    const scheduledDate = new Date(payload.start.dateTime);

    const updated = await updateInterviewFromBooking(candidateEmail, scheduledDate, "google", userId);
    
    if (updated) {
      res.status(200).json({ message: "Interview updated successfully" });
    } else {
      res.status(200).json({ message: "No matching candidate or interview found" });
    }
  } catch (error) {
    handleApiError(error, res);
  }
}

/**
 * Generic webhook handler that routes to provider-specific handlers
 */
async function handleGenericWebhook(req: any, res: any) {
  try {
    const provider = req.query.provider as CalendarProvider;
    const webhookSecret = req.query.secret; // Optional: for webhook verification

    // Route to appropriate handler based on provider
    switch (provider) {
      case "calendly":
        return await handleCalendlyWebhook(req, res);
      case "cal.com":
        return await handleCalComWebhook(req, res);
      case "google":
        return await handleGoogleCalendarWebhook(req, res);
      default:
        // Try to auto-detect provider from payload structure
        const body = req.body;
        
        if (body.event && body.payload?.invitee) {
          // Looks like Calendly
          return await handleCalendlyWebhook(req, res);
        } else if (body.triggerEvent && body.payload?.attendee) {
          // Looks like Cal.com
          return await handleCalComWebhook(req, res);
        } else if (body.kind === "calendar#event" && body.attendees) {
          // Looks like Google Calendar
          return await handleGoogleCalendarWebhook(req, res);
        } else {
          return res.status(400).json({ 
            message: "Unknown calendar provider. Please specify ?provider=calendly|cal.com|google" 
          });
        }
    }
  } catch (error) {
    handleApiError(error, res);
  }
}

export function setupCalendarWebhookRoutes(app: Express) {
  // Generic webhook endpoint - works with any calendar provider
  // Usage: POST /api/webhooks/calendar?provider=calendly&userId=123
  //        POST /api/webhooks/calendar?provider=cal.com&userId=123
  //        POST /api/webhooks/calendar?provider=google&userId=123
  //        POST /api/webhooks/calendar (auto-detects provider, userId optional)
  // Note: userId is optional but recommended for multi-user scenarios
  app.post("/api/webhooks/calendar", handleGenericWebhook);

  // Provider-specific endpoints (for convenience)
  // Usage: POST /api/webhooks/calendar/calendly?userId=123
  app.post("/api/webhooks/calendar/calendly", handleCalendlyWebhook);
  app.post("/api/webhooks/calendar/cal.com", handleCalComWebhook);
  app.post("/api/webhooks/calendar/google", handleGoogleCalendarWebhook);
}

