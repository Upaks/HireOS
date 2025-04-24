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

  // Seed admin user if none exists
  const adminUser = await storage.getUserByUsername("admin");
  if (!adminUser) {
    try {
      await storage.createUser({
        username: "admin",
        password: "$2b$10$rQDofbHWiGq.mL0D9I3G4OwCR9OPAR5y4elqaHJ5wMqMAZxqUEsqm", // hashed "adminpassword"
        fullName: "Admin User",
        email: "admin@firmos.ai",
        role: "admin"
      });
      console.log("Admin user created");
    } catch (error) {
      console.error("Error creating admin user:", error);
    }
  }

  const httpServer = createServer(app);

  return httpServer;
}
