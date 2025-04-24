import axios from "axios";

/**
 * OPENROUTER API INTEGRATION NOTES:
 * 
 * This module implements job description generation using the OpenRouter API.
 * OpenRouter allows us to choose from a variety of LLM models with different 
 * pricing and capabilities.
 * 
 * Current configuration:
 * - Model: openai/gpt-3.5-turbo (cost-effective option)
 * - Authentication: Uses OPENAI_API_KEY environment variable
 * - API Endpoint: https://openrouter.ai/api/v1/chat/completions
 * 
 * For authentication:
 * 1. Create an account at https://openrouter.ai/
 * 2. Generate an API key
 * 3. Set the OPENAI_API_KEY environment variable with this value
 * 
 * Alternative models to consider:
 * - openai/gpt-4o (higher quality but more expensive)
 * - google/gemini-pro (good balance of cost and quality) 
 * - anthropic/claude-2 (good for longer content)
 */

/**
 * Generates a job description using OpenRouter API with gpt-3.5-turbo
 * @param jobData Job data containing title, type, skills, and team context
 * @returns Generated job description
 */
export async function generateJobDescription(jobData: {
  title: string;
  type?: string;
  skills?: string;
  teamContext?: string;
  department?: string;
}): Promise<{ description: string; suggestedTitle?: string }> {
  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }
    
    const { title, type, skills, teamContext, department } = jobData;
    
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
    
    console.log("Sending job description prompt to OpenRouter...");
    
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
    
    return { description, suggestedTitle };
  } catch (error: unknown) {
    // Handle error response properly
    const axiosError = error as any; // Type assertion for axios error
    const errorResponse = axiosError.response?.data;
    const errorMessage = errorResponse 
      ? `${errorResponse.error?.message || JSON.stringify(errorResponse)}`
      : (error instanceof Error ? error.message : String(error));
    
    console.error("Error generating job description:", errorMessage);
    throw new Error(errorMessage);
  }
}