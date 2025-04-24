import { Express } from "express";
import { generateJobDescription } from "./openai";
import { scrapeHipeople, HiPeopleResult } from "./hipeople";

// Test endpoints without authentication for development purposes
export function setupSimpleTestRoutes(app: Express) {
  // Simple test endpoint for OpenAI integration
  app.post("/api/test/simple-openai", async (req, res) => {
    try {
      const { title, type, skills, teamContext, department } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Job title is required" });
      }
      
      console.log(`Generating job description for ${title} (non-authenticated test)`);
      
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

  // Simple test endpoint for HiPeople integration
  app.post("/api/test/simple-hipeople", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "HiPeople assessment URL is required" });
      }
      
      console.log(`Scraping HiPeople assessment from ${url} (non-authenticated test)`);
      
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