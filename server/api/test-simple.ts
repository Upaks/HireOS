import { Express } from "express";
import axios from "axios";
import { scrapeHipeople, HiPeopleResult } from "./hipeople";

// Test endpoints without authentication for development purposes
export function setupSimpleTestRoutes(app: Express) {
  // Simple test endpoint for OpenRouter integration
  app.post("/api/test/simple-openrouter", async (req, res) => {
    try {
      const { title, type, skills, teamContext, department } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Job title is required" });
      }
      
      console.log(`Generating job description for ${title} (non-authenticated test with OpenRouter)`);
      
      // Create prompt based on available data
      let prompt = `Please write a professional job description for a ${title} position`;
      
      if (type) {
        prompt += ` (${type})`;
      }
      
      if (department) {
        prompt += ` in the ${department} department`;
      }
      
      prompt += ".\n\n";
      
      prompt += "The job description should include the following sections:\n";
      prompt += "1. About the Company (keep this generic and professional)\n";
      prompt += "2. Job Overview\n";
      prompt += "3. Responsibilities\n";
      prompt += "4. Qualifications\n";
      prompt += "5. Benefits (keep these standard and professional)\n\n";
      
      if (skills) {
        prompt += `Required skills include: ${skills}.\n\n`;
      }
      
      if (teamContext) {
        prompt += `Team context: ${teamContext}.\n\n`;
      }
      
      prompt += "Format the job description using markdown syntax. Keep the tone professional and approachable.\n\n";
      
      prompt += "Additionally, if you think the job title could be improved or modernized, suggest a better title in a separate suggestion at the end of your response using the format: SUGGESTED_TITLE: [your title suggestion].";
      
      // OpenRouter endpoint and configuration
      const url = 'https://openrouter.ai/api/v1/chat/completions';
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'HTTP-Referer': 'https://replit.com',
        'X-Title': 'HireOS Job Description Generator'
      };
      
      // Request body
      const data = {
        model: "openai/gpt-3.5-turbo", // Using a more cost-effective model
        messages: [
          {
            role: "system",
            content: "You are an expert HR professional who specializes in writing compelling job descriptions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1200
      };
      
      // Make the API request directly with axios
      const response = await axios.post(url, data, { headers });
      
      // Parse the response
      const content = response.data.choices[0].message.content || "";
      
      // Check if there's a suggested title
      let suggestedTitle: string | undefined;
      const suggestedTitleMatch = content.match(/SUGGESTED_TITLE:\s*(.+?)($|\n)/);
      
      let description = content;
      
      if (suggestedTitleMatch && suggestedTitleMatch[1]) {
        suggestedTitle = suggestedTitleMatch[1].trim();
        // Remove the suggestion from the description
        description = content.replace(/SUGGESTED_TITLE:\s*(.+?)($|\n)/, "").trim();
      }
      
      res.json({
        success: true,
        description: description,
        suggestedTitle: suggestedTitle
      });
    } catch (error: unknown) {
      // Handle error response properly
      const axiosError = error as any; // Type assertion for axios error
      const errorResponse = axiosError.response?.data;
      const errorMessage = errorResponse 
        ? `${errorResponse.error?.message || JSON.stringify(errorResponse)}`
        : (error instanceof Error ? error.message : String(error));
      
      console.error("Error testing OpenRouter integration:", errorMessage);
      
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate job description", 
        error: errorMessage 
      });
    }
  });

  // Simple test endpoint for HiPeople integration with direct access
  app.post("/api/test/simple-hipeople", async (req, res) => {
    try {
      // Use direct access to the HiPeople scraper service
      console.log("Using direct access to HiPeople scraper for testing...");
      
      // Direct access to the scraper service with sample data
      const scraperUrl = "https://firmos-hipeople-scraper-899783477192.europe-west1.run.app/scrape_hipeople";
      
      // Sample data for testing
      const testPayload = {
        applicant_name: "Test Candidate",
        applicant_email: "test@example.com"
      };
      
      // This will provide sample demo data for testing
      const results: HiPeopleResult[] = await scrapeHipeople(scraperUrl, testPayload);
      
      res.json({
        success: true,
        count: results.length,
        results,
        note: "Used direct access to the scraper service which returns sample data."
      });
    } catch (error: unknown) {
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