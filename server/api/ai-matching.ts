import axios from "axios";
import { ParsedResumeData } from "./resume-parser";

/**
 * AI MATCHING SERVICE
 * 
 * Uses OpenRouter AI to score candidates against job requirements.
 * Returns a match score (0-100) and explanation.
 */

export interface MatchResult {
  score: number; // 0-100
  explanation: string; // Why this score
  strengths: string[]; // What matches well
  weaknesses: string[]; // What's missing
  recommendations: string[]; // Suggestions for improvement
}

export interface CandidateData {
  name: string;
  skills?: string[] | null;
  experienceYears?: number | null;
  parsedResumeData?: ParsedResumeData | null;
  applicationData?: any;
}

export interface JobRequirements {
  title: string;
  skills?: string | null;
  type?: string | null;
  department?: string | null;
  description?: string | null;
}

/**
 * Calculates AI match score between a candidate and job requirements
 * @param candidate Candidate data
 * @param job Job requirements
 * @param apiKey OpenRouter API key
 * @returns Match result with score and explanation
 */
export async function calculateMatchScore(
  candidate: CandidateData,
  job: JobRequirements,
  apiKey: string
): Promise<MatchResult> {
  try {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }

    // Prepare candidate data for analysis
    const candidateSkills = candidate.skills || 
      (candidate.parsedResumeData?.skills || []).map(s => s.toLowerCase());
    const candidateExperience = candidate.experienceYears || 
      candidate.parsedResumeData?.experienceYears || 0;
    
    // Extract job requirements
    const jobSkills = (job.skills || "")
      .split(/[,;]/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);

    // Create prompt for AI matching
    const prompt = `You are an expert recruiter. Analyze how well this candidate matches the job requirements and provide a match score (0-100).

JOB REQUIREMENTS:
Title: ${job.title}
Department: ${job.department || 'Not specified'}
Type: ${job.type || 'Not specified'}
Required Skills: ${jobSkills.length > 0 ? jobSkills.join(', ') : 'Not specified'}
Description: ${job.description?.substring(0, 1000) || 'Not provided'}

CANDIDATE PROFILE:
Name: ${candidate.name}
Skills: ${candidateSkills.length > 0 ? candidateSkills.join(', ') : 'Not specified'}
Years of Experience: ${candidateExperience}
${candidate.parsedResumeData?.summary ? `Summary: ${candidate.parsedResumeData.summary.substring(0, 500)}` : ''}

Please analyze the match and return ONLY valid JSON with this exact structure (no markdown, no code blocks, just JSON):

{
  "score": 85,
  "explanation": "Detailed explanation of why this score was given (2-3 sentences)",
  "strengths": ["Has React experience", "5+ years in software development"],
  "weaknesses": ["Missing Python skills", "No experience with cloud platforms"],
  "recommendations": ["Consider if Python can be learned on the job", "Assess cloud experience in interview"]
}

The score should be:
- 90-100: Excellent match, highly recommended
- 70-89: Good match, strong candidate
- 50-69: Moderate match, some gaps but viable
- 30-49: Weak match, significant gaps
- 0-29: Poor match, not recommended

Be honest and specific in your analysis.`;

    // Call OpenRouter API
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://hireos.app',
      'X-Title': 'HireOS AI Matching'
    };

    const data = {
      model: "google/gemini-2.0-flash-001", // Cost-effective and fast
      messages: [
        {
          role: "system",
          content: "You are an expert recruiter who analyzes candidate-job matches. Return ONLY valid JSON with the match analysis. Do not include any markdown formatting, code blocks, or explanations outside the JSON - just the raw JSON object."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Moderate temperature for balanced analysis
      max_tokens: 1500
    };

    const response = await axios.post(url, data, { headers });
    const content = response.data.choices[0].message.content || "";

    // Parse JSON response (handle markdown code blocks if present)
    let jsonText = content.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    const parsed = JSON.parse(jsonText) as MatchResult;

    // Validate and clamp score
    if (typeof parsed.score !== 'number') {
      parsed.score = 0;
    } else {
      parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));
    }

    // Ensure arrays exist
    parsed.strengths = parsed.strengths || [];
    parsed.weaknesses = parsed.weaknesses || [];
    parsed.recommendations = parsed.recommendations || [];

    return parsed;
  } catch (error: unknown) {
    const axiosError = error as any;
    const errorResponse = axiosError.response?.data;
    const errorMessage = errorResponse 
      ? `${errorResponse.error?.message || JSON.stringify(errorResponse)}`
      : (error instanceof Error ? error.message : String(error));
    
    console.error("Error calculating match score:", errorMessage);
    throw new Error(`Failed to calculate match score: ${errorMessage}`);
  }
}

