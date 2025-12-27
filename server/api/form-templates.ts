import { Express } from "express";
import { storage } from "../storage";
import { handleApiError } from "./utils";
import { z } from "zod";

// Field type definitions
const fieldSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "email", "phone", "textarea", "number", "select", "file", "checkbox"]),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // For select/checkbox fields
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
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

      const templates = await storage.getFormTemplates();
      res.json(templates);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get default form template
  // MUST come before /api/form-templates/:id to avoid route conflict
  // Public endpoint - no auth required (for public application page)
  app.get("/api/form-templates/default", async (req, res) => {
    try {
      const template = await storage.getDefaultFormTemplate();
      if (!template) {
        return res.status(404).json({ message: "No default form template found" });
      }
      res.json(template);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get a specific form template
  // Public endpoint - no auth required (for public application page)
  app.get("/api/form-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      const template = await storage.getFormTemplate(id);
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

      const validationResult = createFormTemplateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors,
        });
      }

      const data = validationResult.data;

      // If setting as default, unset other defaults
      if (data.isDefault) {
        const existingDefaults = await storage.getFormTemplates();
        for (const template of existingDefaults) {
          if (template.isDefault && template.id) {
            await storage.updateFormTemplate(template.id, { isDefault: false });
          }
        }
      }

      const template = await storage.createFormTemplate(data);
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

      // If setting as default, unset other defaults
      if (data.isDefault) {
        const existingDefaults = await storage.getFormTemplates();
        for (const template of existingDefaults) {
          if (template.isDefault && template.id && template.id !== id) {
            await storage.updateFormTemplate(template.id, { isDefault: false });
          }
        }
      }

      const template = await storage.updateFormTemplate(id, data);
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

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      await storage.deleteFormTemplate(id);
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

