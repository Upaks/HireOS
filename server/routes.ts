import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupJobRoutes } from "./api/job";
import { setupCandidateRoutes } from "./api/candidate";
import { setupInterviewRoutes } from "./api/interview";
import { setupAnalyticsRoutes } from "./api/analytics";
import { setupHiPeopleRoutes } from "./api/hipeople";
import { setupUserRoutes } from "./api/users";
import { setupTestIntegrationRoutes } from "./api/test-integration";
import { setupSimpleTestRoutes } from "./api/test-simple";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Setup API routes
  setupJobRoutes(app);
  setupCandidateRoutes(app);
  setupInterviewRoutes(app);
  setupAnalyticsRoutes(app);
  setupHiPeopleRoutes(app);
  setupUserRoutes(app);
  setupTestIntegrationRoutes(app);
  setupSimpleTestRoutes(app);

  // We're using the rebuild-users.ts script to create users now
  // The script creates users for each role with the password "justtesting"

  const httpServer = createServer(app);

  return httpServer;
}
