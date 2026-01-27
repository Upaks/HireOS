import { Express } from "express";
import { storage } from "../storage";
import { handleApiError } from "./utils";
import { z } from "zod";

// Validation schemas
const createIntegrationSchema = z.object({
  platformId: z.string().min(1),
  platformName: z.string().min(1),
  platformType: z.enum(["builtin", "custom", "ai", "notification", "settings", "crm", "ats"]).default("builtin"),
  credentials: z.record(z.any()).optional(),
  apiEndpoint: z.string().url().optional(),
  apiMethod: z.string().optional(),
});

const updateIntegrationSchema = z.object({
  platformName: z.string().min(1).optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  credentials: z.record(z.any()).nullable().optional(),
  apiEndpoint: z.string().url().optional(),
  apiMethod: z.string().optional(),
  oauthToken: z.string().nullable().optional(),
  oauthRefreshToken: z.string().nullable().optional(),
  oauthExpiresAt: z.string().datetime().optional(),
  isEnabled: z.boolean().optional(),
});

export function setupPlatformIntegrationRoutes(app: Express) {
  // Get all platform integrations for the current account
  app.get("/api/platform-integrations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      if (!accountId) {
        return res.status(400).json({ message: "No active account" });
      }

      const integrations = await storage.getPlatformIntegrations(accountId);
      res.json(integrations);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get a specific platform integration
  app.get("/api/platform-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      if (!accountId) {
        return res.status(400).json({ message: "No active account" });
      }

      const { platformId } = req.params;
      const integration = await storage.getPlatformIntegration(platformId, accountId);
      
      if (!integration) {
        return res.status(404).json({ message: "Platform integration not found" });
      }

      res.json(integration);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Create a new platform integration
  app.post("/api/platform-integrations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      if (!accountId) {
        return res.status(400).json({ message: "No active account" });
      }

      const validationResult = createIntegrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }

      const data = validationResult.data;
      
      // Check if platform already exists for this account
      const existing = await storage.getPlatformIntegration(data.platformId, accountId);
      if (existing) {
        return res.status(400).json({ message: "Platform integration already exists" });
      }

      const integration = await storage.createPlatformIntegration({
        accountId,
        platformId: data.platformId,
        platformName: data.platformName,
        platformType: data.platformType,
        status: "disconnected",
        credentials: data.credentials || null,
        apiEndpoint: data.apiEndpoint || null,
        apiMethod: data.apiMethod || "POST",
        isEnabled: true,
      });

      res.status(201).json(integration);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Update a platform integration
  app.patch("/api/platform-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      if (!accountId) {
        return res.status(400).json({ message: "No active account" });
      }

      const { platformId } = req.params;
      const validationResult = updateIntegrationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }

      const data = validationResult.data;
      
      // Convert oauthExpiresAt string to Date if provided
      const updateData: any = { ...data };
      if (data.oauthExpiresAt) {
        updateData.oauthExpiresAt = new Date(data.oauthExpiresAt);
      }

      const integration = await storage.updatePlatformIntegration(platformId, accountId, updateData);
      
      if (!integration) {
        return res.status(404).json({ message: "Platform integration not found" });
      }

      res.json(integration);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Delete a platform integration
  app.delete("/api/platform-integrations/:platformId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      if (!accountId) {
        return res.status(400).json({ message: "No active account" });
      }

      const { platformId } = req.params;
      await storage.deletePlatformIntegration(platformId, accountId);
      
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // ============================================
  // Convenience endpoints for specific integrations
  // ============================================

  // Get OpenRouter API key status
  app.get("/api/integrations/openrouter", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      if (!accountId) {
        return res.status(400).json({ message: "No active account" });
      }

      const apiKey = await storage.getOpenRouterApiKey(accountId);
      res.json({ 
        configured: !!apiKey,
        // Don't expose the actual key, just indicate if it's set
        maskedKey: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : null
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Set OpenRouter API key
  app.post("/api/integrations/openrouter", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      if (!accountId) {
        return res.status(400).json({ message: "No active account" });
      }

      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== "string") {
        return res.status(400).json({ message: "API key is required" });
      }

      await storage.setOpenRouterApiKey(accountId, apiKey);
      res.json({ success: true, message: "OpenRouter API key saved" });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get Slack config
  app.get("/api/integrations/slack", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      if (!accountId) {
        return res.status(400).json({ message: "No active account" });
      }

      const config = await storage.getSlackConfig(accountId);
      res.json(config || { webhookUrl: "", scope: "all_users", roles: [], events: [] });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Set Slack config
  app.post("/api/integrations/slack", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      if (!accountId) {
        return res.status(400).json({ message: "No active account" });
      }

      const { webhookUrl, scope, roles, events } = req.body;
      
      await storage.setSlackConfig(accountId, {
        webhookUrl: webhookUrl || "",
        scope: scope || "all_users",
        roles: roles || [],
        events: events || [],
      });
      
      res.json({ success: true, message: "Slack configuration saved" });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get email templates
  app.get("/api/integrations/email-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      if (!accountId) {
        return res.status(400).json({ message: "No active account" });
      }

      const templates = await storage.getEmailTemplates(accountId);
      res.json(templates || {});
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Set email templates
  app.post("/api/integrations/email-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      if (!accountId) {
        return res.status(400).json({ message: "No active account" });
      }

      const templates = req.body;
      if (!templates || typeof templates !== "object") {
        return res.status(400).json({ message: "Templates object is required" });
      }

      await storage.setEmailTemplates(accountId, templates);
      res.json({ success: true, message: "Email templates saved" });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
