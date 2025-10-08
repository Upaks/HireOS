import { Express, Request, Response } from "express";
import { addContactToWorkflow } from "@server/ghl/ghlAutomation";

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function setupGHLAutomationRoutes(app: Express) {
  /**
   * Add a candidate/contact to a GHL workflow
   */
  app.post(
    "/api/ghl-automation/add-to-workflow",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { contactId, action, eventStartTime } = req.body;

        if (!contactId || !action) {
          return res.status(400).json({
            success: false,
            message: "Missing required fields: contactId and action",
          });
        }

        const result = await addContactToWorkflow(
          contactId,
          action,
          eventStartTime,
        );

        res.json({
          success: true,
          message: `Contact ${contactId} added to ${action} workflow`,
          data: result,
        });
      } catch (error: any) {
        console.error("❌ Add to workflow error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to add contact to workflow",
          error: error.message,
        });
      }
    },
  );
}
