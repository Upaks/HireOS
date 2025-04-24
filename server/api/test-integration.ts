import { Express } from "express";
import { generateJobDescription } from "./openai";
import { scrapeHipeople, HiPeopleResult } from "./hipeople";
import { UserRoles } from "@shared/schema";

// Test endpoints for API integrations
export function setupTestIntegrationRoutes(app: Express) {
  // Test OpenAI integration
  app.post("/api/test/openai", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only admin or COO can access this endpoint
      if (req.user?.role !== UserRoles.ADMIN && req.user?.role !== UserRoles.COO) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { title, type, skills, teamContext, department } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Job title is required" });
      }
      
      console.log(`Generating job description for ${title}`);
      
      const result = await generateJobDescription({
        title,
        type,
        skills,
        teamContext,
        department
      });
      
      res.json({
        success: true,
        description: result.description,
        suggestedTitle: result.suggestedTitle
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error testing OpenAI integration:", errorMessage);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate job description", 
        error: errorMessage 
      });
    }
  });

  // Test HiPeople integration
  app.post("/api/test/hipeople", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only admin or COO can access this endpoint
      if (req.user?.role !== UserRoles.ADMIN && req.user?.role !== UserRoles.COO) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "HiPeople assessment URL is required" });
      }
      
      console.log(`Scraping HiPeople assessment from ${url}`);
      
      const results: HiPeopleResult[] = await scrapeHipeople(url);
      
      res.json({
        success: true,
        count: results.length,
        results
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error testing HiPeople integration:", errorMessage);
      res.status(500).json({ 
        success: false, 
        message: "Failed to scrape HiPeople assessment", 
        error: errorMessage 
      });
    }
  });
}