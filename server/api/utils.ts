import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details
        });
      }
      next(error);
    }
  };
}

export function handleApiError(error: any, res: Response) {
  console.error("API Error:", error);
  
  if (error.name === "ZodError") {
    const validationError = fromZodError(error);
    return res.status(400).json({ 
      message: "Validation error", 
      errors: validationError.details
    });
  }
  
  const statusCode = error.status || error.statusCode || 500;
  const message = error.message || "Internal server error";
  
  res.status(statusCode).json({ message });
}
