import { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { UserRoles, insertUserSchema } from "@shared/schema";
import { handleApiError, validateRequest } from "./utils";
import { hashPassword } from "../auth";
import { SecureLogger } from "../security/logger";

// SECURITY: Strong password requirements
const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Create a schema for user updates
const updateUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  fullName: z.string().min(2, "Full name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  role: z.enum([
    UserRoles.HIRING_MANAGER,
    UserRoles.PROJECT_MANAGER,
    UserRoles.COO,
    UserRoles.CEO,
    UserRoles.DIRECTOR,
    UserRoles.ADMIN
  ]).optional(),
  password: passwordSchema.optional(),
  calendarLink: z.string().url("Invalid calendar URL").optional().or(z.literal("")),
  calendarProvider: z.enum(["calendly", "cal.com", "google", "custom"]).optional(),
  calendlyToken: z.string().optional(),
  calendlyWebhookId: z.string().optional(),
  openRouterApiKey: z.string().optional(),
  slackWebhookUrl: z.string().url("Invalid Slack webhook URL").optional().or(z.literal("")),
  slackNotificationScope: z.enum(["all_users", "specific_roles"]).optional(),
  slackNotificationRoles: z.array(z.string()).optional(),
  slackNotificationEvents: z.array(z.string()).optional(),
  emailTemplates: z.record(z.any()).optional(), // JSONB field for all email templates
});

export function setupUserRoutes(app: Express) {
  // Get all users (COO/CEO/Admin only)
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId and filter users by account
      const accountId = await storage.getUserAccountId((req.user as any).id);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const users = await storage.getAllUsers(accountId);
      
      // Remove passwords from response
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get a specific user by ID (COO/CEO/Admin only)
  app.get("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Create a new user (COO/CEO/Admin only)
  app.post("/api/users", validateRequest(insertUserSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // SECURITY: Validate password strength before hashing
      try {
        passwordSchema.parse(req.body.password);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Password does not meet security requirements",
            errors: error.errors.map(err => err.message)
          });
        }
      }

      // Hash the password
      const hashedPassword = await hashPassword(req.body.password);

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      // MULTI-TENANT: Get accountId for activity log
      const accountId = await storage.getUserAccountId((req.user as any).id);
      
      // Log activity (sanitized)
      SecureLogger.info("User created", { userId: user.id, username: user.username, role: user.role });
      if (accountId) {
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id,
          action: "Created user",
          entityType: "user",
          entityId: user.id,
          details: { 
            username: user.username,
            role: user.role
          },
          timestamp: new Date()
        });
      }

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Update a user (COO/CEO/Admin only)
  app.patch("/api/users/:id", validateRequest(updateUserSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If password is being updated, validate and hash it
      let updateData = {...req.body};
      if (updateData.password) {
        // SECURITY: Validate password strength
        try {
          passwordSchema.parse(updateData.password);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return res.status(400).json({
              message: "Password does not meet security requirements",
              errors: error.errors.map(err => err.message)
            });
          }
        }
        updateData.password = await hashPassword(updateData.password);
      }

      const updatedUser = await storage.updateUser(userId, updateData);

      // MULTI-TENANT: Get accountId for activity log
      const accountId = await storage.getUserAccountId((req.user as any).id);

      // Log activity
      if (accountId) {
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id,
          action: "Updated user",
          entityType: "user",
          entityId: userId,
          details: { 
            username: user.username,
            fieldsUpdated: Object.keys(req.body),
          },
          timestamp: new Date()
        });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Delete a user (COO/CEO/Admin only)
  app.delete("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Prevent self-deletion
      if (userId === req.user?.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(userId);

      // MULTI-TENANT: Get accountId for activity log
      const accountId = await storage.getUserAccountId((req.user as any).id);

      // Log activity
      if (accountId) {
        await storage.createActivityLog({
          accountId,
          userId: req.user?.id,
          action: "Deleted user",
          entityType: "user",
          entityId: userId,
          details: { 
            username: user.username,
            role: user.role
          },
          timestamp: new Date()
        });
      }

      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get current user's roles and permissions
  app.get("/api/users/me/permissions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const isAdmin = req.user?.role === UserRoles.ADMIN;
      const isCEO = req.user?.role === UserRoles.CEO;
      const isCOO = req.user?.role === UserRoles.COO;
      const isDirector = req.user?.role === UserRoles.DIRECTOR;
      const isProjectManager = req.user?.role === UserRoles.PROJECT_MANAGER;
      const isHiringManager = req.user?.role === UserRoles.HIRING_MANAGER;

      // Calculate permissions based on role
      const permissions = {
        canCreateUsers: isAdmin || isCEO || isCOO || isDirector,
        canUpdateUsers: isAdmin || isCEO || isCOO || isDirector,
        canDeleteUsers: isAdmin || isCEO || isCOO || isDirector,
        canViewAnalytics: isAdmin || isCEO || isCOO || isDirector || isProjectManager,
        canApproveJobs: isAdmin || isCEO || isCOO || isDirector || isProjectManager,
        canApproveOffers: isAdmin || isCEO || isCOO || isDirector,
        canManageRoles: isAdmin || isCEO || isCOO || isDirector,
        isSystemAdmin: isAdmin,
        role: req.user?.role
      };
      
      res.json(permissions);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}