import { Express } from "express";
import { storage } from "../storage";
import { handleApiError } from "./utils";
import { z } from "zod";
import { google } from "googleapis";

// Validation schemas for CRM integrations
const createCRMIntegrationSchema = z.object({
  platformId: z.string().min(1), // "ghl", "hubspot", "pipedrive", etc.
  platformName: z.string().min(1),
  credentials: z.record(z.any()), // { apiKey, locationId, etc. }
  syncDirection: z.enum(["one-way", "two-way"]).default("one-way"),
});

const updateCRMIntegrationSchema = z.object({
  credentials: z.record(z.any()).nullable().optional(),
  syncDirection: z.enum(["one-way", "two-way"]).optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  isEnabled: z.boolean().optional(),
});

export function setupCRMIntegrationRoutes(app: Express) {
  // Get all CRM integrations for the current user
  app.get("/api/crm-integrations", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const integrations = await storage.getCRMIntegrations(userId);
      res.json(integrations);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get a specific CRM integration
  app.get("/api/crm-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { platformId } = req.params;
      const userId = (req.user as any).id;
      const integration = await storage.getPlatformIntegration(platformId, userId);
      
      if (!integration) {
        return res.status(404).json({ message: "CRM integration not found" });
      }

      res.json(integration);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Create or update a CRM integration
  app.post("/api/crm-integrations", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validationResult = createCRMIntegrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }

      const userId = (req.user as any).id;
      const data = validationResult.data;
      
      // Check if integration already exists for this user
      const existing = await storage.getPlatformIntegration(data.platformId, userId);
      
      if (existing) {
        // Update existing integration
        const updated = await storage.updatePlatformIntegration(
          data.platformId,
          {
            credentials: data.credentials,
            syncDirection: data.syncDirection,
            status: "connected",
            isEnabled: true,
          }
        );
        return res.json(updated);
      }

      // Create new integration
      const integration = await storage.createPlatformIntegration({
        userId,
        platformId: data.platformId,
        platformName: data.platformName,
        platformType: "crm",
        status: "connected",
        credentials: data.credentials,
        syncDirection: data.syncDirection,
        isEnabled: true,
      });

      res.status(201).json(integration);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Update a CRM integration
  app.patch("/api/crm-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { platformId } = req.params;
      const userId = (req.user as any).id;
      const validationResult = updateCRMIntegrationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }

      const data = validationResult.data;

      // Verify the integration belongs to this user
      const existing = await storage.getPlatformIntegration(platformId, userId);
      if (!existing) {
        return res.status(404).json({ message: "CRM integration not found" });
      }

      const updated = await storage.updatePlatformIntegration(platformId, data);
      res.json(updated);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Delete a CRM integration
  app.delete("/api/crm-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { platformId } = req.params;
      const userId = (req.user as any).id;

      // Verify the integration belongs to this user
      const existing = await storage.getPlatformIntegration(platformId, userId);
      if (!existing) {
        return res.status(404).json({ message: "CRM integration not found" });
      }

      await storage.deletePlatformIntegration(platformId);
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get Airtable table schema (field names) for field mapping
  app.get("/api/crm-integrations/airtable/schema", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const integration = await storage.getPlatformIntegration("airtable", userId);
      
      if (!integration || !integration.credentials) {
        return res.status(404).json({ message: "Airtable integration not found" });
      }

      const credentials = integration.credentials as any;
      if (!credentials.apiKey || !credentials.baseId) {
        return res.status(400).json({ message: "Airtable credentials incomplete" });
      }

      const tableName = credentials.tableName || "Candidates";
      const axios = (await import("axios")).default;
      const AIRTABLE_API_BASE = "https://api.airtable.com/v0";

      // Fetch table schema from Airtable Meta API
      try {
        const response = await axios.get(
          `${AIRTABLE_API_BASE}/meta/bases/${credentials.baseId}/tables`,
          {
            headers: {
              Authorization: `Bearer ${credentials.apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Find the table
        const table = response.data.tables?.find((t: any) => t.name === tableName);
        if (!table) {
          return res.status(404).json({ message: `Table "${tableName}" not found in Airtable base` });
        }

        // Get fields from the table
        const fields = table.fields?.map((field: any) => ({
          id: field.id,
          name: field.name,
          type: field.type,
        })) || [];

        res.json({
          tableName: table.name,
          fields,
        });
      } catch (apiError: any) {
        // If Meta API fails, try fetching a sample record to get field names
        try {
          const sampleResponse = await axios.get(
            `${AIRTABLE_API_BASE}/${credentials.baseId}/${tableName}`,
            {
              headers: {
                Authorization: `Bearer ${credentials.apiKey}`,
                "Content-Type": "application/json",
              },
              params: { maxRecords: 1 },
            }
          );

          const sampleRecord = sampleResponse.data.records?.[0];
          const fields = sampleRecord?.fields 
            ? Object.keys(sampleRecord.fields).map(name => ({ name, type: "unknown" }))
            : [];

          res.json({
            tableName,
            fields,
          });
        } catch (fallbackError: any) {
          console.error("Failed to fetch Airtable schema:", fallbackError.message);
          res.status(500).json({
            message: "Failed to fetch Airtable table schema",
            error: fallbackError.response?.data?.message || fallbackError.message,
          });
        }
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Google Sheets OAuth - Get authorization URL
  app.get("/api/crm-integrations/google-sheets/auth", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Determine redirect URI - use request host to match current ngrok tunnel
      // Check for X-Forwarded-Proto header (set by ngrok/proxy)
      const protocol = req.get('x-forwarded-proto') || req.protocol || (req.secure ? 'https' : 'http');
      // Check for X-Forwarded-Host header (set by ngrok/proxy)
      const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5000';
      let redirectUri = `${protocol}://${host}/api/crm-integrations/google-sheets/callback`;
      
      // If env variable is set and matches current host, extract base URL and use correct path
      // Otherwise, use the dynamically detected host (for ngrok/localhost)
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
            redirectUri = `${envUrl.protocol}//${envUrl.host}/api/crm-integrations/google-sheets/callback`;
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
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/spreadsheets',
        ],
        prompt: 'consent', // Force consent screen to get refresh token
        state: JSON.stringify({ userId: (req.user as any).id }), // Pass user ID in state
      });

      res.json({ authUrl });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Google Sheets OAuth - Callback handler
  app.get("/api/crm-integrations/google-sheets/callback", async (req, res) => {
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
      // MUST match exactly what was used in the auth endpoint
      // Check for X-Forwarded-Proto header (set by ngrok/proxy)
      const protocol = req.get('x-forwarded-proto') || req.protocol || (req.secure ? 'https' : 'http');
      // Check for X-Forwarded-Host header (set by ngrok/proxy)
      const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5000';
      let redirectUri = `${protocol}://${host}/api/crm-integrations/google-sheets/callback`;
      
      // If env variable is set and matches current host, extract base URL and use correct path
      // Otherwise, use the dynamically detected host (for ngrok/localhost)
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
            redirectUri = `${envUrl.protocol}//${envUrl.host}/api/crm-integrations/google-sheets/callback`;
          }
        } catch (e) {
          // Invalid env URL, use dynamically detected one
        }
      }
      
      // Remove any trailing slashes
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
      const existing = await storage.getPlatformIntegration('google-sheets', userId);
      
      const credentials = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        spreadsheetId: '', // User will set this in settings
        sheetName: 'Sheet1', // Default
      };

      if (existing) {
        // Update existing
        await storage.updatePlatformIntegration('google-sheets', {
          credentials,
          status: 'connected',
        });
      } else {
        // Create new
        await storage.createPlatformIntegration({
          userId,
          platformId: 'google-sheets',
          platformName: 'Google Sheets',
          platformType: 'crm',
          status: 'connected',
          credentials,
          syncDirection: 'one-way',
          isEnabled: true,
        });
      }

      // Redirect back to integrations with success
      res.redirect(`/integrations?google_sheets_connected=true`);
    } catch (error: any) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`/integrations?error=${encodeURIComponent(error.message)}`);
    }
  });

  // Get Google Sheets schema (headers/columns)
  app.get("/api/crm-integrations/google-sheets/schema", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const integration = await storage.getPlatformIntegration("google-sheets", userId);
      
      if (!integration || !integration.credentials) {
        return res.status(404).json({ message: "Google Sheets integration not found" });
      }

      const credentials = integration.credentials as any;
      if (!credentials.accessToken || !credentials.spreadsheetId) {
        return res.status(400).json({ message: "Google Sheets credentials incomplete. Please configure spreadsheet ID in settings." });
      }

      const { getGoogleSheetsSchema } = await import("../google-sheets-integration");
      const schema = await getGoogleSheetsSchema(userId);
      
      res.json(schema);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

