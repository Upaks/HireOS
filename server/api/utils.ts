import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage";

// Middleware to validate request body with Zod schema
export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors.map(err => ({
            path: err.path.join("."),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

// Standardized API error handler
export function handleApiError(error: any, res: Response) {
  console.error("API Error:", error);

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Invalid request data",
      errors: error.errors.map(err => ({
        path: err.path.join("."),
        message: err.message
      }))
    });
  }

  // Handle specific error types
  if (error instanceof Error) {
    // Check for our special email error (added for non-existent email detection)
    if (error.message === 'Candidate email does not exist' || (error as any).isNonExistentEmailError) {
      return res.status(422).json({ 
        message: "Candidate email does not exist",
        errorType: "non_existent_email"
      });
    }

    // Check for specific error messages that indicate certain HTTP status codes
    if (error.message.includes("not found") || error.message.includes("doesn't exist")) {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes("unauthorized") || error.message.includes("not authenticated")) {
      return res.status(401).json({ message: error.message });
    }

    if (error.message.includes("forbidden") || error.message.includes("not allowed")) {
      return res.status(403).json({ message: error.message });
    }

    if (error.message.includes("already exists") || error.message.includes("duplicate")) {
      return res.status(409).json({ message: error.message });
    }

    // Generic error handler
    return res.status(500).json({ 
      message: "An error occurred while processing your request",
      error: error.message
    });
  }

  // Unknown error
  return res.status(500).json({ 
    message: "An unexpected error occurred",
    error: String(error)
  });
}

// Check if request is authenticated or has valid API key
export function isAuthorized(req: Request): boolean {
  // Check if user is authenticated via session
  if (req.isAuthenticated()) {
    return true;
  }

  // Check for API key in headers
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  // Use the HireOS API key from secrets
  const validApiKey = process.env.HireOS_API_Key;

  return apiKey === validApiKey;
}

// Get the active account ID for the current user
// Checks session first, then falls back to default account
export async function getActiveAccountId(req: Request): Promise<number | null> {
  if (!req.user) {
    return null;
  }

  const userId = (req.user as any).id;
  const sessionAccountId = (req.session as any)?.activeAccountId;

  // If there's an active account in session, verify user is still a member
  if (sessionAccountId) {
    const userAccounts = await storage.getUserAccounts(userId);
    const isMember = userAccounts.find(acc => acc.accountId === sessionAccountId);
    if (isMember) {
      return sessionAccountId;
    }
    // If no longer a member, clear the session value
    delete (req.session as any).activeAccountId;
  }

  // Fall back to the user's default (first) account
  return await storage.getUserAccountId(userId);
}

// Get the user's role for the active account
// This is the key function for multi-tenant role management
export async function getUserRoleForActiveAccount(req: Request): Promise<string | null> {
  if (!req.user) {
    return null;
  }

  const userId = (req.user as any).id;
  const accountId = await getActiveAccountId(req);
  
  if (!accountId) {
    // Fallback to global role if no account context
    return (req.user as any).role;
  }

  // Get the role from account_members for this specific account
  const role = await storage.getUserRoleForAccount(userId, accountId);
  
  // If user is not a member of this account (shouldn't happen), fallback to global role
  return role || (req.user as any).role;
}