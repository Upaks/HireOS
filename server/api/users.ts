import { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { UserRoles, insertUserSchema } from "@shared/schema";
import { handleApiError, validateRequest } from "./utils";
import { hashPassword } from "../auth";

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
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export function setupUserRoutes(app: Express) {
  // Get all users (COO/CEO/Admin only)
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const users = await storage.getAllUsers();
      
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

      // Hash the password
      const hashedPassword = await hashPassword(req.body.password);

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      // Log activity
      await storage.createActivityLog({
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

      // If password is being updated, hash it
      let updateData = {...req.body};
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }

      const updatedUser = await storage.updateUser(userId, updateData);

      // Log activity
      await storage.createActivityLog({
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

      // Log activity
      await storage.createActivityLog({
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