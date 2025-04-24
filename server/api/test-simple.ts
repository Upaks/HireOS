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
        model: "google/gemini-2.0-flash-001", // Using Gemini model for cost effectiveness
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

  // Simple test endpoint for HiPeople integration with mock data
  app.post("/api/test/simple-hipeople", async (req, res) => {
    try {
      console.log("Using mock data for HiPeople testing...");
      
      // For testing purposes only, create a mock response
      const mockResults: HiPeopleResult[] = [
        {
          candidate_id: "test-123",
          name: "Test Candidate",
          email: "test@example.com",
          score: 85,
          percentile: 75,
          completed_at: new Date().toISOString(),
          feedback: [
            {
              category: "Technical Skills",
              score: 4.5,
              feedback: "Strong technical foundation with good problem-solving abilities."
            },
            {
              category: "Communication",
              score: 4.0,
              feedback: "Communicates ideas clearly and effectively."
            },
            {
              category: "Teamwork",
              score: 4.2,
              feedback: "Works well in collaborative environments."
            }
          ]
        }
      ];
      
      res.json({
        success: true,
        count: mockResults.length,
        results: mockResults,
        note: "This is mock data for testing purposes only."
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error in HiPeople test endpoint:", errorMessage);
      res.status(500).json({ 
        success: false, 
        message: "Error in test endpoint", 
        error: errorMessage 
      });
    }
  });
}