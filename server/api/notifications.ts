import { Express } from "express";
import { storage } from "../storage";
import { handleApiError } from "./utils";
import { z } from "zod";

// Validation schemas
const createNotificationSchema = z.object({
  userId: z.number().int().positive(),
  type: z.enum([
    "interview_scheduled",
    "offer_sent",
    "offer_accepted",
    "offer_rejected",
    "job_posted",
    "new_application",
    "candidate_status_changed",
    "interview_evaluated",
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  link: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export function setupNotificationRoutes(app: Express) {
  // Get notifications for current user
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const { read, limit } = req.query;

      const filters: { read?: boolean; limit?: number } = {};
      if (read !== undefined) {
        filters.read = read === "true";
      }
      if (limit) {
        filters.limit = parseInt(limit as string);
      }

      const notifications = await storage.getInAppNotifications(userId, filters);
      res.json(notifications);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const userId = (req.user as any).id;

      await storage.markNotificationAsRead(parseInt(id), userId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/read-all", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Create notification (internal use, can be called from other routes)
  app.post("/api/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validationResult = createNotificationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors,
        });
      }

      const data = validationResult.data;
      const notification = await storage.createInAppNotification(data);
      res.status(201).json(notification);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

// Helper function to create notifications (can be imported by other modules)
export async function createNotification(
  userId: number,
  type: "interview_scheduled" | "offer_sent" | "offer_accepted" | "offer_rejected" | "job_posted" | "new_application" | "candidate_status_changed" | "interview_evaluated",
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const notification = await storage.createInAppNotification({
      userId,
      type,
      title,
      message,
      link,
      metadata,
    });
  } catch (error) {
    // Don't throw - we don't want notification failures to break the main flow
    console.error(`[Notification] Failed to create notification for user ${userId}:`, error);
  }
}

