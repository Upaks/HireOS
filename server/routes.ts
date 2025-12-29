import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupJobRoutes } from "./api/job";
import { setupCandidateRoutes } from "./api/candidate";
import { setupInterviewRoutes } from "./api/interview";
import { setupAnalyticsRoutes } from "./api/analytics";
import { setupHiPeopleRoutes } from "./api/hipeople";
import { setupUserRoutes } from "./api/users";
import { setupGHLSyncRoutes } from "./api/ghl-sync";
import { setupCRMSyncRoutes } from "./api/crm-sync";
import { setupGHLAutomationRoutes } from "./api/ghl-automation";
import { setupPlatformIntegrationRoutes } from "./api/platform-integrations";
import { setupCRMIntegrationRoutes } from "./api/crm-integrations";
import { setupFormTemplateRoutes } from "./api/form-templates";
import { setupApplicationRoutes } from "./api/applications";
import { setupStorageRoutes } from "./api/storage";
import { setupCalendarWebhookRoutes } from "./api/calendar-webhooks";
import { setupCalendlyConnectRoutes } from "./api/calendly-connect";
import { setupAIRoutes } from "./api/ai-routes";
import { setupGmailIntegrationRoutes } from "./api/gmail-integration";
import { setupCommentRoutes } from "./api/comments";
import { setupNotificationRoutes } from "./api/notifications";
import { storage } from "./storage";
import { csrfProtection } from "./security/csrf";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // SECURITY: Apply CSRF protection to all state-changing API routes
  // NOTE: Currently disabled until frontend is updated to send CSRF tokens
  // To enable: Set ENABLE_CSRF=true in environment variables
  // Frontend must send CSRF token in X-CSRF-Token header or _csrf in body/query
  if (process.env.ENABLE_CSRF === 'true') {
    app.use("/api", csrfProtection);
  }

  // Setup API routes
  setupJobRoutes(app);
  setupCandidateRoutes(app);
  setupInterviewRoutes(app);
  setupAnalyticsRoutes(app);
  setupHiPeopleRoutes(app);
  setupUserRoutes(app);
  setupGHLSyncRoutes(app); // Legacy GHL sync routes (kept for backward compatibility)
  setupCRMSyncRoutes(app); // Generic CRM sync routes
  setupGHLAutomationRoutes(app);
  setupPlatformIntegrationRoutes(app);
  setupCRMIntegrationRoutes(app);
  setupFormTemplateRoutes(app);
  setupApplicationRoutes(app);
  setupStorageRoutes(app);
  setupCalendarWebhookRoutes(app);
  setupCalendlyConnectRoutes(app);
  setupAIRoutes(app);
  setupGmailIntegrationRoutes(app);
  setupCommentRoutes(app);
  setupNotificationRoutes(app);

  // We're using the rebuild-users.ts script to create users now
  // The script creates users for each role with the password "justtesting"

  const httpServer = createServer(app);

  return httpServer;
}
