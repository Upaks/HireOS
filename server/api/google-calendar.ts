import { Express } from "express";
import { storage } from "../storage";
import { handleApiError } from "./utils";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { db } from "../db";
import { platformIntegrations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export function setupGoogleCalendarRoutes(app: Express) {
  // Get Google Calendar OAuth authorization URL
  app.get("/api/google-calendar/auth", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Determine redirect URI - use request host to match current ngrok tunnel
      const protocol = req.get('x-forwarded-proto') || req.protocol || (req.secure ? 'https' : 'http');
      const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5000';
      let redirectUri = `${protocol}://${host}/api/google-calendar/callback`;
      
      // If env variable is set and matches current host, use it (for production)
      const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (envRedirectUri) {
        try {
          const envUrl = new URL(envRedirectUri);
          const currentUrl = new URL(redirectUri);
          // Only use env variable if it matches the current host (production scenario)
          // For ngrok, always use the current request host
          if (envUrl.hostname === currentUrl.hostname || 
              (!host.includes('ngrok') && !host.includes('localhost'))) {
            redirectUri = envRedirectUri.replace(/\/crm-integrations/, '/api/google-calendar');
            // Ensure it has /api in the path
            if (!redirectUri.includes('/api/google-calendar')) {
              redirectUri = redirectUri.replace(/\/google-calendar/, '/api/google-calendar');
            }
          }
        } catch (e) {
          // Invalid env URL, use dynamically detected one
        }
      }
      
      // Remove any trailing slashes and ensure exact match
      redirectUri = redirectUri.replace(/\/$/, '');
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      // Generate the authorization URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Get refresh token
        scope: [
          'https://www.googleapis.com/auth/calendar.events', // Create/update/delete calendar events
          'https://www.googleapis.com/auth/calendar.readonly', // Read calendar to check availability
        ],
        prompt: 'consent', // Force consent screen to get refresh token
        state: JSON.stringify({ userId: (req.user as any).id }), // Pass user ID in state
      });

      res.json({ authUrl });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Google Calendar OAuth callback handler
  app.get("/api/google-calendar/callback", async (req, res) => {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.redirect(`/integrations?error=oauth_cancelled`);
      }

      // Parse state to get userId
      let userId: number;
      try {
        const stateData = JSON.parse(state as string);
        userId = stateData.userId;
      } catch {
        return res.redirect(`/integrations?error=invalid_state`);
      }

      // Use the same redirect URI logic as the auth endpoint
      const protocol = req.get('x-forwarded-proto') || req.protocol || (req.secure ? 'https' : 'http');
      const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5000';
      let redirectUri = `${protocol}://${host}/api/google-calendar/callback`;
      
      const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (envRedirectUri) {
        try {
          const envUrl = new URL(envRedirectUri);
          const currentUrl = new URL(redirectUri);
          if (envUrl.hostname === currentUrl.hostname || 
              (!host.includes('ngrok') && !host.includes('localhost'))) {
            redirectUri = envRedirectUri.replace(/\/crm-integrations/, '/api/google-calendar');
            if (!redirectUri.includes('/api/google-calendar')) {
              redirectUri = redirectUri.replace(/\/google-calendar/, '/api/google-calendar');
            }
          }
        } catch (e) {
          // Invalid env URL, use dynamically detected one
        }
      }
      
      redirectUri = redirectUri.replace(/\/$/, '');
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code as string);
      
      if (!tokens.access_token) {
        return res.redirect(`/integrations?error=no_access_token`);
      }

      // Check if integration already exists
      const existing = await storage.getPlatformIntegration('google-calendar', userId);
      
      const credentials = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
      };

      if (existing) {
        // Update existing - delete old and create new to ensure userId is correct
        const existingId = existing.id;
        if (existingId) {
          // Delete by ID to ensure we delete the right record
          await db.delete(platformIntegrations)
            .where(eq(platformIntegrations.id, existingId));
        }
        await storage.createPlatformIntegration({
          userId,
          platformId: 'google-calendar',
          platformName: 'Google Calendar',
          platformType: 'communication',
          status: 'connected',
          credentials,
          syncDirection: 'one-way',
          isEnabled: true,
        });
      } else {
        // Create new
        await storage.createPlatformIntegration({
          userId,
          platformId: 'google-calendar',
          platformName: 'Google Calendar',
          platformType: 'communication',
          status: 'connected',
          credentials,
          syncDirection: 'one-way',
          isEnabled: true,
        });
      }

      // Redirect back to integrations with success
      res.redirect(`/integrations?google_calendar_connected=true`);
    } catch (error: any) {
      console.error('Google Calendar OAuth callback error:', error);
      res.redirect(`/integrations?error=${encodeURIComponent(error.message)}`);
    }
  });

  // Get Google Calendar connection status
  app.get("/api/google-calendar/status", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const integration = await storage.getPlatformIntegration('google-calendar', userId);
      
      // Check if sync with Calendly is enabled
      const credentials = integration?.credentials as any;
      const syncWithCalendly = credentials?.syncWithCalendly || false;
      
      res.json({
        connected: integration?.status === 'connected' || false,
        syncWithCalendly,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Update sync with Calendly setting
  app.post("/api/google-calendar/sync-settings", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const { syncWithCalendly } = req.body;

      const integration = await storage.getPlatformIntegration('google-calendar', userId);
      
      if (!integration) {
        return res.status(404).json({ message: "Google Calendar integration not found" });
      }

      // Update credentials with sync setting
      const currentCredentials = (integration.credentials as any) || {};
      const updatedCredentials = {
        ...currentCredentials,
        syncWithCalendly: syncWithCalendly === true,
      };

      await storage.updatePlatformIntegration('google-calendar', {
        credentials: updatedCredentials,
      });

      res.json({ 
        message: "Sync settings updated successfully",
        syncWithCalendly: syncWithCalendly === true,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get availability settings
  app.get("/api/google-calendar/availability", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const integration = await storage.getPlatformIntegration('google-calendar', userId);
      
      if (!integration) {
        return res.status(404).json({ message: "Google Calendar integration not found" });
      }

      const credentials = integration.credentials as any;
      const availability = credentials?.availability || {
        daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
        startTime: "09:00",
        endTime: "17:00",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        slotDuration: 30, // minutes
      };

      res.json(availability);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Update availability settings
  app.post("/api/google-calendar/availability", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const { daysOfWeek, startTime, endTime, timeZone, slotDuration } = req.body;

      const integration = await storage.getPlatformIntegration('google-calendar', userId);
      
      if (!integration) {
        return res.status(404).json({ message: "Google Calendar integration not found" });
      }

      const currentCredentials = integration.credentials as Record<string, any> || {};
      const updatedCredentials: Record<string, any> = {
        ...(currentCredentials || {}),
        availability: {
          daysOfWeek: daysOfWeek || [1, 2, 3, 4, 5],
          startTime: startTime || "09:00",
          endTime: endTime || "17:00",
          timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          slotDuration: slotDuration || 30,
        },
      };

      await storage.updatePlatformIntegration('google-calendar', {
        credentials: updatedCredentials,
      });

      res.json({ message: "Availability settings updated successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get available time slots for a date range
  // No authentication required - this is a public booking page
  app.options("/api/google-calendar/available-slots", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
  });
  
  app.get("/api/google-calendar/available-slots", async (req, res) => {
    // Set CORS headers for public access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    try {
      const { userId, startDate, endDate } = req.query;

      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }

      const integration = await storage.getPlatformIntegration('google-calendar', parseInt(userId as string));
      
      if (!integration || integration.status !== 'connected') {
        return res.status(404).json({ message: "Google Calendar integration not found or not connected" });
      }

      const credentials = integration.credentials as any;
      const availability = credentials?.availability || {
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: "09:00",
        endTime: "17:00",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        slotDuration: 30,
      };

      // Get busy times from Google Calendar
      const oauth2Client = await getGoogleCalendarClient(parseInt(userId as string));
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const busyResponse = await calendar.freebusy.query({
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busyTimes = (busyResponse.data.calendars?.primary?.busy || []).map(busy => ({
        start: (busy.start ?? undefined) as string | undefined,
        end: (busy.end ?? undefined) as string | undefined,
      }));

      // Generate available slots
      const availableSlots = generateAvailableSlots(
        start,
        end,
        availability,
        busyTimes
      );

      res.json({ availableSlots });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Book an interview slot
  // No authentication required - this is a public booking page
  app.options("/api/google-calendar/book", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
  });
  
  app.post("/api/google-calendar/book", async (req, res) => {
    // Set CORS headers for public access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    try {
      const { userId, candidateName, candidateEmail, scheduledDate, jobId, candidateId } = req.body;

      if (!userId || !candidateName || !candidateEmail || !scheduledDate) {
        return res.status(400).json({ message: "userId, candidateName, candidateEmail, and scheduledDate are required" });
      }

      const integration = await storage.getPlatformIntegration('google-calendar', userId);
      
      if (!integration || integration.status !== 'connected') {
        return res.status(404).json({ message: "Google Calendar integration not found or not connected" });
      }

      // MULTI-TENANT: Get accountId from userId
      const accountId = await storage.getUserAccountId(userId);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const scheduledDateTime = new Date(scheduledDate);
      const slotEndTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000); // 1 hour

      // Check if slot is already booked (duplicate prevention)
      // 1. Check Google Calendar for existing events at this time
      const oauth2Client = await getGoogleCalendarClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Check for busy times at this slot
      const busyCheck = await calendar.freebusy.query({
        requestBody: {
          timeMin: scheduledDateTime.toISOString(),
          timeMax: slotEndTime.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const isSlotBusy = busyCheck.data.calendars?.primary?.busy && busyCheck.data.calendars.primary.busy.length > 0;
      if (isSlotBusy) {
        return res.status(409).json({ 
          message: "This time slot is no longer available. Please select another time." 
        });
      }

      // 2. Check HireOS database for existing interviews at this time (within 5 minute window to prevent duplicates)
      const timeWindow = 5 * 60 * 1000; // 5 minutes
      const existingInterviews = await storage.getInterviews(accountId, { interviewerId: userId });
      const conflictingInterview = existingInterviews.find((interview: any) => {
        if (!interview.scheduledDate) return false;
        const interviewTime = new Date(interview.scheduledDate).getTime();
        const scheduledTime = scheduledDateTime.getTime();
        return Math.abs(interviewTime - scheduledTime) < timeWindow;
      });

      if (conflictingInterview) {
        return res.status(409).json({ 
          message: "An interview is already scheduled at this time. Please select another time." 
        });
      }

      const user = await storage.getUser(userId);
      const job = jobId ? await storage.getJob(jobId, accountId) : null;

      const eventTitle = `Interview: ${candidateName}${job ? ` - ${job.title}` : ''}`;
      const eventDescription = `Interview scheduled via HireOS\n\nCandidate: ${candidateName}\nEmail: ${candidateEmail}${job ? `\nPosition: ${job.title}` : ''}\n\nView in HireOS: ${process.env.FRONTEND_URL || 'https://hireos.com'}/candidates${candidateId ? `/${candidateId}` : ''}`;

      const event = {
        summary: eventTitle,
        description: eventDescription,
        start: {
          dateTime: scheduledDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: slotEndTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        // Organizer is automatically set to the authenticated user (userId)
        // Both the interviewer (user) and candidate are added as attendees
        attendees: [
          { email: candidateEmail, displayName: candidateName },
          ...(user?.email ? [{ email: user.email, displayName: user.fullName }] : []),
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
          ],
        },
      };

      const calendarEvent = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
      });

      // Create or update interview in HireOS
      let interview;
      if (candidateId) {
        // If candidate exists, check for existing interview and update or create
        const candidate = await storage.getCandidate(candidateId, accountId);
        if (candidate) {
          // Check if there's an existing interview for this candidate
          const existingInterviews = await storage.getInterviews(accountId, { candidateId: candidate.id });
          const existingInterview = existingInterviews.find((inv: any) => 
            inv.status === 'scheduled' || inv.status === 'pending'
          );

          if (existingInterview) {
            // Update existing interview instead of creating a duplicate
            interview = await storage.updateInterview(existingInterview.id, accountId, {
              scheduledDate: scheduledDateTime,
              interviewerId: userId,
              status: "scheduled",
              notes: existingInterview.notes 
                ? `${existingInterview.notes}\n\nRescheduled via Google Calendar booking page on ${new Date().toISOString()}`
                : `Rescheduled via Google Calendar booking page on ${new Date().toISOString()}`,
            });
          } else {
            // Create new interview if none exists
            interview = await storage.createInterview({
              accountId,
              candidateId: candidate.id,
              scheduledDate: scheduledDateTime,
              interviewerId: userId,
              type: "video",
              status: "scheduled",
              notes: `Booked via Google Calendar booking page on ${new Date().toISOString()}`,
            });
          }

          // Update candidate status
          if (candidate.status !== "60_1st_interview_scheduled") {
            await storage.updateCandidate(candidate.id, accountId, {
              status: "60_1st_interview_scheduled"
            });
          }
        }
      } else {
        // Create new candidate and interview
        const newCandidate = await storage.createCandidate({
          accountId,
          name: candidateName,
          email: candidateEmail,
          status: "60_1st_interview_scheduled",
          jobId: jobId || null,
        });

        interview = await storage.createInterview({
          accountId,
          candidateId: newCandidate.id,
          scheduledDate: scheduledDateTime,
          interviewerId: userId,
          type: "video",
          status: "scheduled",
          notes: `Booked via Google Calendar booking page on ${new Date().toISOString()}`,
        });
      }

      // Create notification
      if (interview && user) {
        try {
          const { createNotification } = await import("./notifications");
          await createNotification(
            userId,
            "interview_scheduled",
            "Interview Scheduled",
            `Interview scheduled: ${candidateName}${job ? ` (${job.title})` : ''} on ${scheduledDateTime.toLocaleDateString()} at ${scheduledDateTime.toLocaleTimeString()}`,
            `/candidates`,
            { candidateId: interview.candidateId, jobId: job?.id, interviewId: interview.id }
          );
        } catch (error) {
          console.error("[Google Calendar Book] Failed to create notification:", error);
        }
      }

      res.json({
        message: "Interview booked successfully",
        interview,
        calendarEventId: calendarEvent.data.id,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Disconnect Google Calendar
  app.post("/api/google-calendar/disconnect", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const integration = await storage.getPlatformIntegration('google-calendar', userId);
      
      if (!integration) {
        return res.status(404).json({ message: "Google Calendar integration not found" });
      }

      // Delete by ID to ensure we delete the correct record
      // Use storage method which handles db internally
      // Since deletePlatformIntegration doesn't filter by userId, we verify ownership first
      if (integration.id) {
        // Import db dynamically to avoid module loading issues
        const { db: dbInstance } = await import("../db");
        const { platformIntegrations: platformIntegrationsTable } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        
        await dbInstance.delete(platformIntegrationsTable)
          .where(eq(platformIntegrationsTable.id, integration.id));
      } else {
        // Fallback: delete by platformId and userId if no ID
        const { db: dbInstance } = await import("../db");
        const { platformIntegrations: platformIntegrationsTable } = await import("@shared/schema");
        const { eq, and } = await import("drizzle-orm");
        
        await dbInstance.delete(platformIntegrationsTable)
          .where(
            and(
              eq(platformIntegrationsTable.platformId, 'google-calendar'),
              eq(platformIntegrationsTable.userId, userId)
            )
          );
      }
      res.json({ message: "Google Calendar disconnected successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

/**
 * Get authenticated Google Calendar OAuth2 client for a user
 * @param userId - User ID who owns the Google Calendar account
 */
export async function getGoogleCalendarClient(userId: number): Promise<OAuth2Client> {
  try {
    // Get user's Google Calendar integration
    const integration = await storage.getPlatformIntegration('google-calendar', userId);
    if (!integration || !integration.credentials) {
      throw new Error('Google Calendar integration not found. Please connect your Google Calendar account first.');
    }

    const credentials = integration.credentials as any;
    if (!credentials.accessToken) {
      throw new Error('Google Calendar access token not found. Please reconnect your Google Calendar account.');
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });

    // Refresh token if needed
    if (credentials.refreshToken) {
      try {
        const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
        if (newCredentials.access_token) {
          // Update stored token
          await storage.updatePlatformIntegration('google-calendar', {
            credentials: {
              ...credentials,
              accessToken: newCredentials.access_token,
              refreshToken: newCredentials.refresh_token || credentials.refreshToken,
            },
          });
          oauth2Client.setCredentials(newCredentials);
        }
      } catch (refreshError) {
        // If refresh fails, try with current token
        console.warn('Failed to refresh Google Calendar token, using existing token:', refreshError);
      }
    }

    return oauth2Client;
  } catch (error: any) {
    console.error('Error getting Google Calendar client:', error);
    throw new Error(`Failed to get Google Calendar client: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Create a Google Calendar event for an interview
 * @param userId - User ID who owns the Google Calendar account
 * @param interview - Interview object with candidate and job details
 */
export async function createGoogleCalendarEvent(
  userId: number,
  interview: {
    id: number;
    candidateId: number;
    scheduledDate: Date;
    type: string;
    videoUrl?: string;
    candidate?: { name: string; email: string };
    job?: { title: string };
    interviewer?: { fullName: string; email: string };
  }
): Promise<string | null> {
  try {
    const oauth2Client = await getGoogleCalendarClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get user info for organizer
    const user = await storage.getUser(userId);
    const organizerEmail = user?.email || '';
    const organizerName = user?.fullName || 'HireOS User';

    // Build event title
    const candidateName = interview.candidate?.name || 'Candidate';
    const jobTitle = interview.job?.title || 'Position';
    const eventTitle = `Interview: ${candidateName} - ${jobTitle}`;

    // Build event description
    let description = `Interview scheduled via HireOS\n\n`;
    description += `Candidate: ${candidateName}\n`;
    description += `Position: ${jobTitle}\n`;
    description += `Type: ${interview.type}\n`;
    if (interview.videoUrl) {
      description += `Video Link: ${interview.videoUrl}\n`;
    }
    description += `\nView in HireOS: ${process.env.FRONTEND_URL || 'https://hireos.com'}/candidates/${interview.candidateId}`;

    // Build attendees list
    const attendees: Array<{ email: string; displayName?: string }> = [];
    
    // Add candidate as attendee
    if (interview.candidate?.email) {
      attendees.push({
        email: interview.candidate.email,
        displayName: interview.candidate.name,
      });
    }

    // Add interviewer as attendee (if different from organizer)
    if (interview.interviewer?.email && interview.interviewer.email !== organizerEmail) {
      attendees.push({
        email: interview.interviewer.email,
        displayName: interview.interviewer.fullName,
      });
    }

    // Create event
    const event = {
      summary: eventTitle,
      description,
      start: {
        dateTime: interview.scheduledDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(interview.scheduledDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour default
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
      ...(interview.videoUrl && {
        location: interview.videoUrl,
      }),
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // Send email notifications to attendees
    });

    return response.data.id || null;
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error);
    // Don't throw - allow interview creation to succeed even if calendar event fails
    return null;
  }
}

/**
 * Update a Google Calendar event for an interview
 * @param userId - User ID who owns the Google Calendar account
 * @param eventId - Google Calendar event ID
 * @param interview - Updated interview object
 */
export async function updateGoogleCalendarEvent(
  userId: number,
  eventId: string,
  interview: {
    id: number;
    candidateId: number;
    scheduledDate: Date;
    type: string;
    videoUrl?: string;
    candidate?: { name: string; email: string };
    job?: { title: string };
    interviewer?: { fullName: string; email: string };
  }
): Promise<boolean> {
  try {
    const oauth2Client = await getGoogleCalendarClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get user info for organizer
    const user = await storage.getUser(userId);
    const organizerEmail = user?.email || '';
    const organizerName = user?.fullName || 'HireOS User';

    // Build event title
    const candidateName = interview.candidate?.name || 'Candidate';
    const jobTitle = interview.job?.title || 'Position';
    const eventTitle = `Interview: ${candidateName} - ${jobTitle}`;

    // Build event description
    let description = `Interview scheduled via HireOS\n\n`;
    description += `Candidate: ${candidateName}\n`;
    description += `Position: ${jobTitle}\n`;
    description += `Type: ${interview.type}\n`;
    if (interview.videoUrl) {
      description += `Video Link: ${interview.videoUrl}\n`;
    }
    description += `\nView in HireOS: ${process.env.FRONTEND_URL || 'https://hireos.com'}/candidates/${interview.candidateId}`;

    // Build attendees list
    const attendees: Array<{ email: string; displayName?: string }> = [];
    
    // Add candidate as attendee
    if (interview.candidate?.email) {
      attendees.push({
        email: interview.candidate.email,
        displayName: interview.candidate.name,
      });
    }

    // Add interviewer as attendee (if different from organizer)
    if (interview.interviewer?.email && interview.interviewer.email !== organizerEmail) {
      attendees.push({
        email: interview.interviewer.email,
        displayName: interview.interviewer.fullName,
      });
    }

    // Update event
    const event = {
      summary: eventTitle,
      description,
      start: {
        dateTime: interview.scheduledDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(interview.scheduledDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour default
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
      ...(interview.videoUrl && {
        location: interview.videoUrl,
      }),
    };

    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: event,
      sendUpdates: 'all', // Send email notifications to attendees
    });

    return true;
  } catch (error: any) {
    console.error('Error updating Google Calendar event:', error);
    // Don't throw - allow interview update to succeed even if calendar event fails
    return false;
  }
}

/**
 * Delete a Google Calendar event for an interview
 * @param userId - User ID who owns the Google Calendar account
 * @param eventId - Google Calendar event ID
 */
export async function deleteGoogleCalendarEvent(
  userId: number,
  eventId: string
): Promise<boolean> {
  try {
    const oauth2Client = await getGoogleCalendarClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all', // Notify attendees of cancellation
    });

    return true;
  } catch (error: any) {
    console.error('Error deleting Google Calendar event:', error);
    // Don't throw - allow interview deletion to succeed even if calendar event fails
    return false;
  }
}

/**
 * Generate available time slots based on availability settings and busy times
 */
function generateAvailableSlots(
  startDate: Date,
  endDate: Date,
  availability: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    timeZone: string;
    slotDuration: number;
  },
  busyTimes: Array<{ start?: string; end?: string }>
): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = [];
  const currentDate = new Date(startDate);
  const slotDurationMs = availability.slotDuration * 60 * 1000;

  // Parse start and end times
  const [startHour, startMinute] = availability.startTime.split(':').map(Number);
  const [endHour, endMinute] = availability.endTime.split(':').map(Number);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // Convert to Monday = 1 format
    const dayOfWeekMondayBased = dayOfWeek === 0 ? 7 : dayOfWeek;

    if (availability.daysOfWeek.includes(dayOfWeekMondayBased)) {
      // Set start time for this day
      const dayStart = new Date(currentDate);
      dayStart.setHours(startHour, startMinute, 0, 0);

      // Set end time for this day
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(endHour, endMinute, 0, 0);

      // Generate slots for this day
      let slotStart = new Date(dayStart);
      while (slotStart < dayEnd) {
        const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

        // Check if this slot overlaps with any busy time
        const isBusy = busyTimes.some(busy => {
          if (!busy.start || !busy.end) return false;
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return (slotStart < busyEnd && slotEnd > busyStart);
        });

        // Only add slot if it's not busy and not in the past
        if (!isBusy && slotStart > new Date()) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }

        slotStart = new Date(slotStart.getTime() + slotDurationMs);
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  return slots;
}
