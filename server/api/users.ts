import { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { UserRoles, insertUserSchema, canManageRole, getRoleLevel } from "@shared/schema";
import { handleApiError, validateRequest, getActiveAccountId } from "./utils";
import { hashPassword } from "../auth";
import { SecureLogger } from "../security/logger";

// Helper to check if actor can manage target user in an account
async function canActorManageTarget(actorId: number, targetId: number, accountId: number): Promise<{ canManage: boolean; reason?: string }> {
  const members = await storage.getAccountMembers(accountId);
  const actorMember = members.find(m => m.userId === actorId);
  const targetMember = members.find(m => m.userId === targetId);
  
  if (!actorMember) {
    return { canManage: false, reason: "You are not a member of this account" };
  }
  
  if (!targetMember) {
    return { canManage: false, reason: "Target user is not a member of this account" };
  }
  
  // Account owner can manage everyone
  if (actorMember.invitedById === null) {
    return { canManage: true };
  }
  
  // Cannot manage the account owner
  if (targetMember.invitedById === null) {
    return { canManage: false, reason: "Cannot modify the account owner" };
  }
  
  // Check role hierarchy - can only manage roles below your level
  if (!canManageRole(actorMember.role, targetMember.role)) {
    return { canManage: false, reason: "You can only manage users with roles below your level" };
  }
  
  return { canManage: true };
}

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
      const accountId = await getActiveAccountId(req);
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
      const accountId = await getActiveAccountId(req);
      
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

  // Update a user (with hierarchy-based permissions)
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

      // MULTI-TENANT: Get accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const actorId = (req.user as any).id;

      // HIERARCHY CHECK: If modifying another user, verify permissions
      if (actorId !== userId) {
        const { canManage, reason } = await canActorManageTarget(actorId, userId, accountId);
        if (!canManage) {
          return res.status(403).json({ message: reason || "Access denied" });
        }
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

      // MULTI-TENANT: If role is being updated, update account_members.role instead of users.role
      if (updateData.role) {
        const newRole = updateData.role;
        
        // HIERARCHY CHECK: Can only assign roles below your level (unless you're the owner)
        const members = await storage.getAccountMembers(accountId);
        const actorMember = members.find(m => m.userId === actorId);
        
        if (actorMember && actorMember.invitedById !== null) {
          // Not the owner - check if they can assign this role
          if (!canManageRole(actorMember.role, newRole)) {
            return res.status(403).json({ 
              message: `You cannot assign the role "${newRole}". You can only assign roles below your level.` 
            });
          }
        }
        
        await storage.updateUserRoleForAccount(userId, accountId, newRole);
        // Remove role from updateData so we don't update users.role
        delete updateData.role;
      }

      // Update remaining user fields (if any)
      let updatedUser = user;
      if (Object.keys(updateData).length > 0) {
        updatedUser = await storage.updateUser(userId, updateData);
      }

      // Log activity
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

      // Fetch fresh user data with account-specific role
      const allUsers = await storage.getAllUsers(accountId);
      const freshUser = allUsers.find(u => u.id === userId);

      // Remove password from response
      const { password, ...userWithoutPassword } = freshUser || updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Delete/remove a user (with hierarchy-based permissions)
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

      // MULTI-TENANT: Get accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const actorId = (req.user as any).id;

      // HIERARCHY CHECK: Verify actor can manage target user
      const { canManage, reason } = await canActorManageTarget(actorId, userId, accountId);
      if (!canManage) {
        return res.status(403).json({ message: reason || "Access denied" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove user from this account (not delete their entire user record)
      // This preserves their data in their own account if they have one
      await storage.removeUserFromAccount(userId, accountId);

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
  // Public endpoint to get user info for booking page (limited info only)
  // No authentication required - this is a public booking page
  app.options("/api/users/:id/public", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
  });
  
  app.get("/api/users/:id/public", async (req, res) => {
    // Set CORS headers for public access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has Google Calendar connected
      const integration = await storage.getPlatformIntegration('google-calendar', userId);
      if (!integration) {
        return res.status(404).json({ message: "Google Calendar not connected for this user" });
      }
      
      // Check status (case-insensitive check)
      const status = integration.status?.toLowerCase();
      if (status !== 'connected') {
        return res.status(404).json({ message: "Google Calendar not connected for this user" });
      }

      // Return limited public info
      res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

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