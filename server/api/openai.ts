import OpenAI from "openai";
import { Job } from "@shared/schema";

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generates a job description using OpenAI GPT-4o
 * @param jobData Job data containing title, type, skills, and team context
 * @returns Generated job description
 */
export async function generateJobDescription(jobData: {
  title: string;
  type?: string;
  skills?: string;
  teamContext?: string;
  department?: string;
}): Promise<{ description: string; suggestedTitle: string | null }> {
  try {
    const roleType = jobData.type || "Full-time";
    
    // Create a detailed prompt for the AI
    const prompt = `
Please create a professional job description for the following position:

Job Title: ${jobData.title}
Type: ${roleType}
${jobData.department ? `Department: ${jobData.department}` : ''}
${jobData.skills ? `Required Skills: ${jobData.skills}` : ''}
${jobData.teamContext ? `Team Context: ${jobData.teamContext}` : ''}

The job description should include:
1. A concise title (starting with #)
2. A brief overview of the role (starting with ## About the Role)
3. Key responsibilities (starting with ## Responsibilities, using bullet points)
4. Required qualifications (starting with ## Requirements, using bullet points)
5. Benefits and perks (starting with ## Benefits, using bullet points)

Format the output in Markdown.
`;

    // Request a job description from GPT-4o
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert recruiter who creates professional job descriptions that are engaging and informative." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    // Extract the generated text
    const generatedDescription = response.choices[0].message.content || "";

    // Check if there's a suggested alternative title
    let suggestedTitle = null;
    if (generatedDescription.includes("Suggested alternative title:")) {
      const match = generatedDescription.match(/Suggested alternative title:\s*([^\n]+)/);
      if (match && match[1]) {
        suggestedTitle = match[1].trim();
      }
    }

    return {
      description: generatedDescription,
      suggestedTitle
    };
  } catch (error) {
    console.error("Error generating job description with OpenAI:", error);
    throw new Error(
      error instanceof Error 
        ? `Failed to generate job description: ${error.message}` 
        : "Failed to generate job description"
    );
  }
}