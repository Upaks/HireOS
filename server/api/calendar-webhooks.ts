import { Express } from "express";
import { storage } from "../storage";
import { handleApiError } from "./utils";
import { isLikelyInvalidEmail } from "../email-validator";

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
    // Find candidate by email
    const allCandidates = await storage.getCandidates({});
    const candidate = allCandidates.find(c => c.email.toLowerCase() === candidateEmail.toLowerCase());
    
    if (!candidate) {
      return false;
    }

    // Find scheduled interview for this candidate
    // If userId is provided, prioritize interviews where this user is the interviewer
    const interviews = await storage.getInterviews({ candidateId: candidate.id });
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

    if (!scheduledInterview) {
      return false;
    }

    // Update interview with scheduled date
    await storage.updateInterview(scheduledInterview.id, {
      scheduledDate: scheduledDate,
      status: "scheduled",
      notes: scheduledInterview.notes 
        ? `${scheduledInterview.notes}\n\nAutomatically updated from ${provider} booking on ${new Date().toISOString()}`
        : `Automatically updated from ${provider} booking on ${new Date().toISOString()}`,
      updatedAt: new Date()
    });

    // Update candidate status if needed
    if (candidate.status !== "60_1st_interview_scheduled") {
      await storage.updateCandidate(candidate.id, {
        status: "60_1st_interview_scheduled"
      });
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

    // Calendly webhook structure: 
    // { event: "invitee.created", payload: { email, name, scheduled_event: { start_time, ... } } }
    const eventType = payload.event;
    
    // Only process "invitee.created" events (when someone books)
    if (eventType !== "invitee.created") {
      return res.status(200).json({ message: "Event ignored" });
    }

    // Extract invitee data from payload
    // The payload itself contains the invitee info (email, name) and scheduled_event
    const inviteeData = payload.payload;
    
    if (!inviteeData) {
      return res.status(400).json({ message: "Missing payload data" });
    }

    // Get email and name from payload
    const candidateEmail = inviteeData.email;
    
    if (!candidateEmail) {
      return res.status(400).json({ message: "Missing email in payload" });
    }

    // Get scheduled event data
    const scheduledEvent = inviteeData.scheduled_event;
    
    if (!scheduledEvent || !scheduledEvent.start_time) {
      return res.status(400).json({ message: "Missing scheduled_event.start_time" });
    }

    // Skip if rescheduled or canceled (check status)
    if (inviteeData.rescheduled || inviteeData.status !== 'active') {
      return res.status(200).json({ message: "Event was rescheduled or canceled" });
    }

    const scheduledDate = new Date(scheduledEvent.start_time);

    const updated = await updateInterviewFromBooking(candidateEmail, scheduledDate, "calendly", userId);
    
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

