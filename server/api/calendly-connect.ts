import { Express } from "express";
import axios from "axios";
import { storage } from "../storage";
import { handleApiError, validateRequest } from "./utils";
import { z } from "zod";

const connectCalendlySchema = z.object({
  token: z.string().min(1, "Calendly token is required"),
});

export function setupCalendlyConnectRoutes(app: Express) {
  // Connect Calendly - verify token and set up webhook automatically
  app.post(
    "/api/calendly/connect",
    validateRequest(connectCalendlySchema),
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const { token } = req.body;

        // Step 1: Verify the token by getting user info
        let userInfo;
        try {
          const userResponse = await axios.get("https://api.calendly.com/users/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          userInfo = userResponse.data.resource;
        } catch (error: any) {
          console.error("[Calendly Connect] Token verification failed:", error.response?.data || error.message);
          return res.status(400).json({
            message: "Invalid Calendly token. Please check your Personal Access Token.",
            error: error.response?.data || error.message,
          });
        }

        const orgUri = userInfo.current_organization;
        const userUri = userInfo.uri;

        // Step 2: Generate webhook URL
        const host = req.get("host");
        if (!host) {
          console.error("[Calendly Connect] Cannot determine server host");
          return res.status(500).json({
            message: "Cannot determine server host. Please ensure your server is properly configured.",
          });
        }
        const webhookUrl = `${req.protocol}://${host}/api/webhooks/calendar?provider=calendly&userId=${userId}`;

        // Step 3: Check for existing webhooks (with pagination)
        let webhookId: string | null = null;
        try {
          let allWebhooks: any[] = [];
          let pageToken: string | null = null;
          
          // Fetch all webhooks with pagination
          do {
            const params: any = {
              organization: orgUri,
              user: userUri,
              scope: "user",
            };
            if (pageToken) {
              params.page_token = pageToken;
            }
            
            const existingWebhooksResponse = await axios.get(
              "https://api.calendly.com/webhook_subscriptions",
              {
                params,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const webhooks = existingWebhooksResponse.data?.collection || [];
            allWebhooks = allWebhooks.concat(webhooks);
            
            pageToken = existingWebhooksResponse.data?.pagination?.next_page_token || null;
          } while (pageToken);

          // Normalize URLs for comparison
          // Calendly API uses 'callback_url' not 'url' for webhook subscriptions
          const normalizeUrl = (url: string) => url.trim().toLowerCase().replace(/\/$/, '');
          const normalizedWebhookUrl = normalizeUrl(webhookUrl);
          
          const existingWebhook = allWebhooks.find((w: any) => {
            const hookUrl = w.callback_url || w.url;
            if (!hookUrl) return false;
            return normalizeUrl(hookUrl) === normalizedWebhookUrl;
          });

          if (existingWebhook) {
            // Extract webhook ID from uri (format: https://api.calendly.com/webhook_subscriptions/{uuid})
            webhookId = existingWebhook.uuid || (existingWebhook.uri ? existingWebhook.uri.split('/').pop() : null);
          }
        } catch (error: any) {
          // Continue to create new webhook
        }

        // Step 4: Create or update webhook
        if (!webhookId) {
          // Calendly API format for user-scoped webhooks
          // Calendly requires organization even for user-scoped webhooks
          const webhookPayload = {
            url: webhookUrl,
            events: ["invitee.created", "invitee.canceled", "invitee.updated"],
            organization: orgUri,
            user: userUri,
            scope: "user",
          };
          
          try {
            const webhookResponse = await axios.post(
              "https://api.calendly.com/webhook_subscriptions",
              webhookPayload,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            // Extract webhook ID from resource uri (format: https://api.calendly.com/webhook_subscriptions/{uuid})
            const resource = webhookResponse.data.resource;
            webhookId = resource?.uuid || (resource?.uri ? resource.uri.split('/').pop() : null);
          } catch (error: any) {
            // If webhook already exists (409), we MUST find it - don't proceed without ID
            if (error.response?.status === 409) {
              // Try multiple times with different search strategies
              let found = false;
              let attempts = 0;
              const maxAttempts = 3;
              
              while (!found && attempts < maxAttempts) {
                try {
                  attempts++;
                  
                  let allWebhooks: any[] = [];
                  let pageToken: string | null = null;
                  
                  // Fetch ALL webhooks with pagination
                  do {
                    const params: any = {
                      organization: orgUri,
                      user: userUri,
                      scope: "user",
                    };
                    if (pageToken) {
                      params.page_token = pageToken;
                    }
                    
                    const existingWebhooksResponse = await axios.get(
                      "https://api.calendly.com/webhook_subscriptions",
                      {
                        params,
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      }
                    );

                    const webhooks = existingWebhooksResponse.data?.collection || [];
                    allWebhooks = allWebhooks.concat(webhooks);
                    
                    pageToken = existingWebhooksResponse.data?.pagination?.next_page_token || null;
                  } while (pageToken);

                  // Calendly API uses 'callback_url' not 'url' for webhook subscriptions
                  const normalizeUrl = (url: string) => url.trim().toLowerCase().replace(/\/$/, '');
                  const normalizedWebhookUrl = normalizeUrl(webhookUrl);
                  
                  // Strategy 1: Exact URL match (normalized)
                  let existingWebhook = allWebhooks.find((w: any) => {
                    const hookUrl = w.callback_url || w.url;
                    if (!hookUrl) return false;
                    return normalizeUrl(hookUrl) === normalizedWebhookUrl;
                  });
                  
                  // Strategy 2: Partial URL match (in case of query param differences)
                  if (!existingWebhook) {
                    const urlPath = new URL(webhookUrl).pathname;
                    existingWebhook = allWebhooks.find((w: any) => {
                      const hookUrl = w.callback_url || w.url;
                      if (!hookUrl) return false;
                      try {
                        return new URL(hookUrl).pathname === urlPath;
                      } catch {
                        return false;
                      }
                    });
                  }
                  
                  // Strategy 3: Match by base URL (without query params)
                  if (!existingWebhook) {
                    const baseUrl = webhookUrl.split('?')[0];
                    existingWebhook = allWebhooks.find((w: any) => {
                      const hookUrl = w.callback_url || w.url;
                      if (!hookUrl) return false;
                      return hookUrl.split('?')[0] === baseUrl;
                    });
                  }
                  
                  if (existingWebhook) {
                    // Extract webhook ID from uri (format: https://api.calendly.com/webhook_subscriptions/{uuid})
                    webhookId = existingWebhook.uuid || (existingWebhook.uri ? existingWebhook.uri.split('/').pop() : null);
                    found = true;
                  } else {
                    if (attempts < maxAttempts) {
                      // Wait a bit before retrying (webhook might still be propagating)
                      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    }
                  }
                } catch (retryError: any) {
                  if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                  }
                }
              }
              
              if (!found) {
                return res.status(500).json({
                  message: "Webhook exists but could not be found. Please delete the existing webhook in Calendly first, then reconnect.",
                  error: "Could not locate webhook ID after multiple attempts",
                  webhookUrl,
                });
              }
            } else {
              // Other errors - log full error and return failure
              const errorDetails = error.response?.data?.details || [];
              console.error("[Calendly Connect] Webhook creation failed:", {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                details: JSON.stringify(errorDetails, null, 2),
                message: error.message,
                webhookUrl,
                payload: webhookPayload,
              });
              return res.status(500).json({
                message: "Failed to create webhook. Please try again.",
                error: error.response?.data || error.message,
                details: errorDetails,
              });
            }
          }
        }

        // Step 5: Update user with token and webhook ID
        await storage.updateUser(userId, {
          calendlyToken: token, // Store token (in production, encrypt this!)
          calendlyWebhookId: webhookId,
          calendarProvider: "calendly",
        });

        // Step 6: Log activity
        await storage.createActivityLog({
          userId,
          action: "Connected Calendly",
          entityType: "user",
          entityId: userId,
          details: {
            calendlyUserUri: userUri,
            webhookId,
          },
          timestamp: new Date(),
        });

        res.json({
          message: "Calendly connected successfully",
          webhookId,
          webhookUrl,
          calendlyUser: {
            name: userInfo.name,
            email: userInfo.email,
            uri: userUri,
          },
        });
      } catch (error) {
        console.error("[Calendly Connect] Error:", error);
        handleApiError(error, res);
      }
    }
  );

  // Disconnect Calendly - remove webhook and clear token
  app.post("/api/calendly/disconnect", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete webhook from Calendly if we have token and webhook ID
      if (user.calendlyToken && user.calendlyWebhookId) {
        try {
          await axios.delete(
            `https://api.calendly.com/webhook_subscriptions/${user.calendlyWebhookId}`,
            {
              headers: {
                Authorization: `Bearer ${user.calendlyToken}`,
              },
            }
          );
        } catch (error: any) {
          // Continue even if webhook deletion fails
        }
      }

      // Clear token and webhook ID from user
      await storage.updateUser(userId, {
        calendlyToken: null,
        calendlyWebhookId: null,
        calendarProvider: null,
      });

      // Log activity
      await storage.createActivityLog({
        userId,
        action: "Disconnected Calendly",
        entityType: "user",
        entityId: userId,
        details: {},
        timestamp: new Date(),
      });

      res.json({ message: "Calendly disconnected successfully" });
    } catch (error) {
      console.error("[Calendly Disconnect] Error:", error);
      handleApiError(error, res);
    }
  });

  // Get Calendly connection status
  app.get("/api/calendly/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Consider connected if token exists (webhook ID is optional for connection to work)
      const isConnected = !!user.calendlyToken;
      const webhookUrl = isConnected
        ? `${req.protocol}://${req.get("host")}/api/webhooks/calendar?provider=calendly&userId=${userId}`
        : null;

      res.json({
        connected: isConnected,
        webhookId: user.calendlyWebhookId || null,
        webhookUrl,
        calendarProvider: user.calendarProvider || null,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
}

