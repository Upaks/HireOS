import { Express } from "express";
import { storage } from "../storage";
import { handleApiError, getActiveAccountId } from "./utils";
import { z } from "zod";

// Validation schemas
const createCommentSchema = z.object({
  entityType: z.enum(["candidate", "job"]),
  entityId: z.number().int().positive(),
  content: z.string().min(1).max(5000),
  mentions: z.array(z.number().int().positive()).optional(),
});

export function setupCommentRoutes(app: Express) {
  // Get comments for an entity
  app.get("/api/comments", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { entityType, entityId } = req.query;

      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }

      if (entityType !== "candidate" && entityType !== "job") {
        return res.status(400).json({ message: "entityType must be 'candidate' or 'job'" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const comments = await storage.getComments(
        entityType as string,
        parseInt(entityId as string),
        accountId
      );

      res.json(comments);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Create a comment
  app.post("/api/comments", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validationResult = createCommentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors,
        });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const userId = (req.user as any).id;
      const data = validationResult.data;

      // Parse mentions from content if not provided
      let mentions = data.mentions || [];
      if (!mentions.length && data.content.includes("@")) {
        // Extract @mentions from content
        const mentionRegex = /@(\w+)/g;
        const matches = data.content.match(mentionRegex);
        if (matches) {
          // Get all users for mention matching (within account)
          const allUsers = await storage.getUsersForMentionAutocomplete(accountId);
          const mentionedUsernames = matches.map(m => m.substring(1).toLowerCase());
          
          // Find user IDs for mentioned usernames
          mentions = allUsers
            .filter(u => 
              mentionedUsernames.some(username => 
                u.username?.toLowerCase() === username ||
                u.fullName?.toLowerCase().includes(username) ||
                u.email?.toLowerCase().includes(username)
              )
            )
            .map(u => u.id);
        }
      }

      const comment = await storage.createComment({
        accountId,
        userId,
        entityType: data.entityType,
        entityId: data.entityId,
        content: data.content,
        mentions: mentions.length > 0 ? mentions : null,
      });

      // Fetch the comment with user info
      const comments = await storage.getComments(data.entityType, data.entityId, accountId);
      const newComment = comments.find(c => c.id === comment.id);

      res.status(201).json(newComment || comment);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Delete a comment
  app.delete("/api/comments/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const { id } = req.params;
      const userId = (req.user as any).id;

      await storage.deleteComment(parseInt(id), accountId, userId);
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get users for mention autocomplete
  app.get("/api/users/mention-autocomplete", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // MULTI-TENANT: Get user's accountId
      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const { q } = req.query;
      const users = await storage.getUsersForMentionAutocomplete(accountId, q as string | undefined);
      res.json(users);
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

