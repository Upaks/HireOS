import { Express } from "express";
import { storage } from "../storage";
import { handleApiError } from "./utils";
import { google } from "googleapis";
import { db } from "../db";
import { platformIntegrations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export function setupGmailIntegrationRoutes(app: Express) {
  // Get Gmail OAuth authorization URL
  app.get("/api/gmail/auth", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Determine redirect URI - use request host to match current ngrok tunnel
      const protocol = req.get('x-forwarded-proto') || req.protocol || (req.secure ? 'https' : 'http');
      const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5000';
      let redirectUri = `${protocol}://${host}/api/gmail/callback`;
      
      // If env variable is set and matches current host, extract base URL and use correct path
      const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (envRedirectUri) {
        try {
          const envUrl = new URL(envRedirectUri);
          const currentUrl = new URL(redirectUri);
          // Only use env variable if it matches the current host (production scenario)
          // For ngrok, always use the current request host
          if (envUrl.hostname === currentUrl.hostname || 
              (!host.includes('ngrok') && !host.includes('localhost'))) {
            // Extract base URL (protocol + hostname) from env variable and append correct path
            redirectUri = `${envUrl.protocol}//${envUrl.host}/api/gmail/callback`;
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
          'https://www.googleapis.com/auth/gmail.send', // Send emails only
        ],
        prompt: 'consent', // Force consent screen to get refresh token
        state: JSON.stringify({ userId: (req.user as any).id }), // Pass user ID in state
      });

      res.json({ authUrl });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Gmail OAuth callback handler
  app.get("/api/gmail/callback", async (req, res) => {
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
      let redirectUri = `${protocol}://${host}/api/gmail/callback`;
      
      const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (envRedirectUri) {
        try {
          const envUrl = new URL(envRedirectUri);
          const currentUrl = new URL(redirectUri);
          if (envUrl.hostname === currentUrl.hostname || 
              (!host.includes('ngrok') && !host.includes('localhost'))) {
            // Extract base URL (protocol + hostname) from env variable and append correct path
            redirectUri = `${envUrl.protocol}//${envUrl.host}/api/gmail/callback`;
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
      const existing = await storage.getPlatformIntegration('gmail', userId);
      
      const credentials = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
      };

      if (existing) {
        // Update existing - delete old and create new to ensure userId is correct
        // Use storage method to delete, then recreate
        const existingId = existing.id;
        if (existingId) {
          // Delete by ID to ensure we delete the right record
          await db.delete(platformIntegrations)
            .where(eq(platformIntegrations.id, existingId));
        }
        await storage.createPlatformIntegration({
          userId,
          platformId: 'gmail',
          platformName: 'Gmail',
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
          platformId: 'gmail',
          platformName: 'Gmail',
          platformType: 'communication',
          status: 'connected',
          credentials,
          syncDirection: 'one-way',
          isEnabled: true,
        });
      }

      // Redirect back to integrations with success
      res.redirect(`/integrations?gmail_connected=true`);
    } catch (error: any) {
      console.error('Gmail OAuth callback error:', error);
      res.redirect(`/integrations?error=${encodeURIComponent(error.message)}`);
    }
  });

  // Get Gmail connection status
  app.get("/api/gmail/status", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const integration = await storage.getPlatformIntegration('gmail', userId);
      
      res.json({
        connected: integration?.status === 'connected' || false,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Disconnect Gmail
  app.post("/api/gmail/disconnect", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const integration = await storage.getPlatformIntegration('gmail', userId);
      
      if (!integration) {
        return res.status(404).json({ message: "Gmail integration not found" });
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
              eq(platformIntegrationsTable.platformId, 'gmail'),
              eq(platformIntegrationsTable.userId, userId)
            )
          );
      }
      res.json({ message: "Gmail disconnected successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Test email sending
  app.post("/api/gmail/test", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { to, subject, body } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ message: "to, subject, and body are required" });
      }

      const userId = (req.user as any).id;
      await sendGmailEmail(userId, to, subject, body);
      
      res.json({ message: "Test email sent successfully" });
    } catch (error: any) {
      handleApiError(error, res);
    }
  });
}

/**
 * Send an email using Gmail API
 * @param userId - User ID who owns the Gmail account
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param body - Email body (HTML or plain text)
 * @param fromName - Optional sender name (defaults to user's full name)
 */
export async function sendGmailEmail(
  userId: number,
  to: string,
  subject: string,
  body: string,
  fromName?: string
): Promise<void> {
  try {
    // Get user's Gmail integration
    const integration = await storage.getPlatformIntegration('gmail', userId);
    if (!integration || !integration.credentials) {
      throw new Error('Gmail integration not found. Please connect your Gmail account first.');
    }

    const credentials = integration.credentials as any;
    if (!credentials.accessToken) {
      throw new Error('Gmail access token not found. Please reconnect your Gmail account.');
    }

    // Get user info for sender name
    const user = await storage.getUser(userId);
    const senderName = fromName || user?.fullName || 'HireOS';

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
          await storage.updatePlatformIntegration('gmail', {
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
        console.warn('Failed to refresh Gmail token, using existing token:', refreshError);
      }
    }

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create email message
    const emailLines = [
      `From: ${senderName} <${user?.email || 'noreply@hireos.com'}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ];

    const email = emailLines.join('\r\n').trim();

    // Encode message in base64url format (Gmail API requirement)
    const encodedMessage = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
  } catch (error: any) {
    console.error('Error sending Gmail email:', error);
    throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
  }
}

