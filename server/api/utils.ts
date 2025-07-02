import { Request, Response, NextFunction } from "express";
import { z } from "zod";

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