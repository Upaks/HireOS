import { Express } from "express";
import { storage } from "../storage";
import { handleApiError, getActiveAccountId, getUserRoleForActiveAccount } from "./utils";
import { hashPassword, comparePasswords } from "../auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { canManageRole, getRoleLevel } from "@shared/schema";

// Validation schemas
const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
});

const acceptNewUserSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const acceptExistingUserSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

// Generate a secure random token
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// Helper to check if user is the account owner
async function isAccountOwner(userId: number, accountId: number): Promise<boolean> {
  const members = await storage.getAccountMembers(accountId);
  const member = members.find(m => m.userId === userId);
  return member?.invitedById === null;
}

// Helper to check if actor can manage target user in this account
async function canManageUser(actorId: number, targetUserId: number, accountId: number): Promise<boolean> {
  const members = await storage.getAccountMembers(accountId);
  const actorMember = members.find(m => m.userId === actorId);
  const targetMember = members.find(m => m.userId === targetUserId);
  
  if (!actorMember) return false;
  
  // Account owner can manage everyone
  if (actorMember.invitedById === null) return true;
  
  // Cannot manage the account owner
  if (targetMember?.invitedById === null) return false;
  
  // Check role hierarchy
  return canManageRole(actorMember.role, targetMember?.role || "");
}

export function setupInvitationRoutes(app: Express) {
  // Get all invitations for current account
  app.get("/api/invitations", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      // Check if user has permission to view invitations (Admin, CEO, COO, Director)
      const userRole = await getUserRoleForActiveAccount(req);
      if (!userRole || getRoleLevel(userRole) > 3) {
        return res.status(403).json({ message: "Access denied" });
      }

      const invitations = await storage.getInvitations(accountId);

      // Get inviter names
      const invitationsWithInviters = await Promise.all(
        invitations.map(async (inv) => {
          const inviter = await storage.getUser(inv.invitedById);
          return {
            ...inv,
            inviterName: inviter?.fullName || "Unknown",
          };
        })
      );

      res.json(invitationsWithInviters);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Create a new invitation
  app.post("/api/invitations", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const validationResult = createInvitationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors,
        });
      }

      const { email, role: invitedRole } = validationResult.data;
      const actorId = (req.user as any).id;

      // Get actor's membership info
      const members = await storage.getAccountMembers(accountId);
      const actorMember = members.find(m => m.userId === actorId);
      
      if (!actorMember) {
        return res.status(403).json({ message: "You are not a member of this account" });
      }

      // HIERARCHY CHECK: Can only invite roles BELOW your level
      // Account owner can invite anyone
      if (actorMember.invitedById !== null) {
        if (!canManageRole(actorMember.role, invitedRole)) {
          return res.status(403).json({ 
            message: `You cannot invite users with role "${invitedRole}". You can only invite roles below your level.` 
          });
        }
      }

      // Check if user is already a member of THIS account
      const allUsers = await storage.getAllUsers(accountId);
      const existingMember = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingMember) {
        return res.status(400).json({ message: "This user is already a member of your account" });
      }

      // Check if there's already a pending invitation for this email in THIS account
      const existingInvitations = await storage.getInvitations(accountId);
      const pendingInvite = existingInvitations.find(
        inv => inv.email.toLowerCase() === email.toLowerCase() && inv.status === "pending"
      );
      if (pendingInvite) {
        return res.status(400).json({ message: "An invitation has already been sent to this email" });
      }

      // Generate token and expiry (72 hours from now)
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const invitation = await storage.createInvitation({
        accountId,
        email,
        role: invitedRole,
        token,
        invitedById: actorId,
        status: "pending",
        expiresAt,
      });

      // Generate the invite link
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const inviteLink = `${baseUrl}/invite/${token}`;

      res.status(201).json({
        ...invitation,
        inviteLink,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Cancel/delete an invitation
  app.delete("/api/invitations/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      // Check if user has permission (Admin, CEO, COO, Director)
      const userRole = await getUserRoleForActiveAccount(req);
      if (!userRole || getRoleLevel(userRole) > 3) {
        return res.status(403).json({ message: "Access denied" });
      }

      const invitationId = parseInt(req.params.id);
      if (isNaN(invitationId)) {
        return res.status(400).json({ message: "Invalid invitation ID" });
      }

      await storage.deleteInvitation(invitationId, accountId);
      res.json({ message: "Invitation cancelled" });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Verify an invitation token (public endpoint)
  app.get("/api/invitations/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ valid: false, message: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ valid: false, message: "Invitation has already been used or cancelled" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        await storage.updateInvitation(invitation.id, { status: "expired" });
        return res.status(400).json({ valid: false, message: "Invitation has expired" });
      }

      // Check if email already has an account globally
      const existingUser = await storage.getUserByEmail(invitation.email);
      
      // Get account name
      const account = await storage.getAccount(invitation.accountId);

      res.json({
        valid: true,
        email: invitation.email,
        role: invitation.role,
        accountId: invitation.accountId,
        accountName: account?.name || "Unknown",
        userExists: !!existingUser,
        existingUserName: existingUser?.fullName || null,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Accept invitation as NEW user (creates account)
  app.post("/api/invitations/accept/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const validationResult = acceptNewUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors,
        });
      }

      const { fullName, username, password } = validationResult.data;

      // Verify the invitation
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation has already been used or cancelled" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        await storage.updateInvitation(invitation.id, { status: "expired" });
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Check if username is already taken globally
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username is already taken" });
      }

      // Check if email already has an account (should use the other endpoint)
      const existingEmail = await storage.getUserByEmail(invitation.email);
      if (existingEmail) {
        return res.status(400).json({ 
          message: "This email already has an account. Please sign in to join this account.",
          useExistingFlow: true 
        });
      }

      // Create the user with the invited role
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        fullName,
        email: invitation.email,
        role: invitation.role, // Set global role to invited role
      });

      // Add user to the account with the invited role
      await storage.addUserToAccount(newUser.id, invitation.accountId, invitation.role);
      
      // Mark invitation as accepted
      await storage.updateInvitation(invitation.id, {
        status: "accepted",
        acceptedAt: new Date(),
      });

      res.status(201).json({
        message: "Account created successfully",
        user: {
          id: newUser.id,
          username: newUser.username,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Accept invitation as EXISTING user (just joins the account)
  app.post("/api/invitations/accept-existing/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const validationResult = acceptExistingUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors,
        });
      }

      const { password } = validationResult.data;

      // Verify the invitation
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation has already been used or cancelled" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        await storage.updateInvitation(invitation.id, { status: "expired" });
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Find the existing user by email
      const existingUser = await storage.getUserByEmail(invitation.email);
      if (!existingUser) {
        return res.status(400).json({ 
          message: "No account found with this email. Please create a new account.",
          useNewFlow: true 
        });
      }

      // Verify password
      const isValidPassword = await comparePasswords(password, existingUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Incorrect password" });
      }

      // Check if already a member of this account
      const userAccounts = await storage.getUserAccounts(existingUser.id);
      const alreadyMember = userAccounts.find(acc => acc.accountId === invitation.accountId);
      if (alreadyMember) {
        return res.status(400).json({ message: "You are already a member of this account" });
      }

      // Add user to the account with the invited role
      await storage.addUserToAccount(existingUser.id, invitation.accountId, invitation.role);
      
      // Mark invitation as accepted
      await storage.updateInvitation(invitation.id, {
        status: "accepted",
        acceptedAt: new Date(),
      });

      // Get account name
      const account = await storage.getAccount(invitation.accountId);

      res.status(200).json({
        message: `Successfully joined ${account?.name || "the account"}`,
        user: {
          id: existingUser.id,
          username: existingUser.username,
          fullName: existingUser.fullName,
          email: existingUser.email,
        },
        accountName: account?.name,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Switch active account
  app.post("/api/user/switch-account", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { accountId } = req.body;
      if (!accountId) {
        return res.status(400).json({ message: "Account ID is required" });
      }

      // Verify user is a member of this account
      const userAccounts = await storage.getUserAccounts((req.user as any).id);
      const membership = userAccounts.find(acc => acc.accountId === accountId);
      
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this account" });
      }

      // Store active account in session
      req.session.activeAccountId = accountId;
      
      // Explicitly save the session to ensure persistence
      req.session.save((err) => {
        if (err) {
          console.error("Failed to save session during account switch:", err);
          return res.status(500).json({ message: "Failed to switch account" });
        }
        
        res.json({ 
          message: "Switched account successfully",
          accountId,
          accountName: membership.accountName,
          role: membership.role,
        });
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get user's accounts with current active account info
  app.get("/api/user/accounts", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const accounts = await storage.getUserAccounts(userId);
      const activeAccountId = await getActiveAccountId(req);

      res.json({
        accounts,
        activeAccountId,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}
