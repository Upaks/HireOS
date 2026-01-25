import { Express } from "express";
import { storage } from "../storage";
import { handleApiError, getActiveAccountId } from "./utils";
import { z } from "zod";

// Field type definitions - Enhanced with more field types
const fieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    "text", "email", "phone", "textarea", "number", "select", "multiselect",
    "radio", "checkbox", "file", "date", "time", "datetime", "rating", 
    "scale", "url", "section", "pagebreak"
  ]),
  label: z.string(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // For select, multiselect, radio, checkbox fields
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
  settings: z.object({
    allowMultiple: z.boolean().optional(),
    accept: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    rows: z.number().optional(),
  }).optional(),
});

// Validation schemas
const createFormTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(fieldSchema).min(1),
  isDefault: z.boolean().optional().default(false),
});

const updateFormTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  fields: z.array(fieldSchema).optional(),
  isDefault: z.boolean().optional(),
});

export function setupFormTemplateRoutes(app: Express) {
  // Get all form templates
  app.get("/api/form-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const templates = await storage.getFormTemplates(accountId);
      res.json(templates);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get default form template
  // MUST come before /api/form-templates/:id to avoid route conflict
  // Public endpoint - no auth required (for public application page)
  // NOTE: For public endpoints, we can't filter by accountId - this may need job-specific routing
  app.get("/api/form-templates/default", async (req, res) => {
    try {
      // For public access, we can't determine accountId from jobId in the URL
      // This endpoint might need to be updated to accept jobId and look up accountId
      // For now, return error requiring authentication or accept accountId as query param
      return res.status(401).json({ message: "Authentication required for default template" });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get a specific form template
  // Public endpoint - no auth required (for public application page)
  app.get("/api/form-templates/:id", async (req, res) => {
    try {
      // For public access, we need to get accountId from the template itself or require it
      // For now, require authentication for security
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      const template = await storage.getFormTemplate(id, accountId);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }

      res.json(template);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Create a new form template
  app.post("/api/form-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const validationResult = createFormTemplateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors,
        });
      }

      const data = validationResult.data;

      // If setting as default, unset other defaults (within account)
      if (data.isDefault) {
        const existingDefaults = await storage.getFormTemplates(accountId);
        for (const template of existingDefaults) {
          if (template.isDefault && template.id) {
            await storage.updateFormTemplate(template.id, accountId, { isDefault: false });
          }
        }
      }

      const template = await storage.createFormTemplate({ ...data, accountId });
      res.status(201).json(template);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Update a form template
  app.patch("/api/form-templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      const validationResult = updateFormTemplateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors,
        });
      }

      const data = validationResult.data;

      // If setting as default, unset other defaults (within account)
      if (data.isDefault) {
        const existingDefaults = await storage.getFormTemplates(accountId);
        for (const template of existingDefaults) {
          if (template.isDefault && template.id && template.id !== id) {
            await storage.updateFormTemplate(template.id, accountId, { isDefault: false });
          }
        }
      }

      const template = await storage.updateFormTemplate(id, accountId, data);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }

      res.json(template);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Delete a form template
  app.delete("/api/form-templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      await storage.deleteFormTemplate(id, accountId);
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

