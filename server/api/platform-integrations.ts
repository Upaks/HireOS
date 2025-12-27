import { Express } from "express";
import { storage } from "../storage";
import { handleApiError } from "./utils";
import { z } from "zod";

// Validation schemas
const createIntegrationSchema = z.object({
  platformId: z.string().min(1),
  platformName: z.string().min(1),
  platformType: z.enum(["builtin", "custom"]).default("builtin"),
  credentials: z.record(z.any()).optional(),
  apiEndpoint: z.string().url().optional(),
  apiMethod: z.string().optional(),
});

const updateIntegrationSchema = z.object({
  platformName: z.string().min(1).optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  credentials: z.record(z.any()).nullable().optional(), // Allow null for disconnecting
  apiEndpoint: z.string().url().optional(),
  apiMethod: z.string().optional(),
  oauthToken: z.string().nullable().optional(),
  oauthRefreshToken: z.string().nullable().optional(),
  oauthExpiresAt: z.string().datetime().optional(),
  isEnabled: z.boolean().optional(),
});

export function setupPlatformIntegrationRoutes(app: Express) {
  // Get all platform integrations
  app.get("/api/platform-integrations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const integrations = await storage.getPlatformIntegrations();
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

      const { platformId } = req.params;
      const integration = await storage.getPlatformIntegration(platformId);
      
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

      const validationResult = createIntegrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }

      const data = validationResult.data;
      
      // Check if platform already exists
      const existing = await storage.getPlatformIntegration(data.platformId);
      if (existing) {
        return res.status(400).json({ message: "Platform integration already exists" });
      }

      const integration = await storage.createPlatformIntegration({
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

      const integration = await storage.updatePlatformIntegration(platformId, updateData);
      
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

      const { platformId } = req.params;
      await storage.deletePlatformIntegration(platformId);
      
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

