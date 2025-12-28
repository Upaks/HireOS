import axios from "axios";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * RESUME PARSING SERVICE
 * 
 * Uses OpenRouter AI to extract structured data from resume PDFs.
 * Extracts: name, email, phone, skills, experience, education, etc.
 */

export interface ParsedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  experienceYears?: number;
  experience?: Array<{
    company: string;
    position: string;
    duration: string;
    description?: string;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field?: string;
    year?: string;
  }>;
  summary?: string;
}

/**
 * Extracts text from a PDF file using pdf-parse
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Use createRequire to load CommonJS module pdf-parse
    const pdfParseModule = require('pdf-parse');
    // pdf-parse v2.4.5 uses PDFParse class - instantiate it with the buffer
    const PDFParse = pdfParseModule.PDFParse;
    
    if (!PDFParse || typeof PDFParse !== 'function') {
      throw new Error('PDFParse class not found in pdf-parse module');
    }
    
    // Create instance with PDF buffer
    const parser = new PDFParse({ data: pdfBuffer });
    // Get text using getText method
    const result = await parser.getText();
    return result.text || '';
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF. Please ensure the file is a valid PDF.");
  }
}

/**
 * Parses a resume PDF using OpenRouter AI
 * @param resumeUrl URL to the resume PDF
 * @param apiKey OpenRouter API key
 * @returns Parsed resume data
 */
export async function parseResume(
  resumeUrl: string,
  apiKey: string
): Promise<ParsedResumeData> {
  try {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }

    // Fetch the resume PDF
    const resumeResponse = await axios.get(resumeUrl, {
      responseType: 'arraybuffer',
    });
    const pdfBuffer = Buffer.from(resumeResponse.data);

    // Extract text from PDF
    const resumeText = await extractTextFromPDF(pdfBuffer);

    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error("Could not extract sufficient text from resume PDF");
    }

    // Create prompt for AI to parse the resume
    const prompt = `Please parse the following resume text and extract structured information. Return ONLY valid JSON with this exact structure (no markdown, no code blocks, just JSON):

{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "skills": ["Skill1", "Skill2", "Skill3"],
  "experienceYears": 5,
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "duration": "Jan 2020 - Present",
      "description": "Job description"
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "year": "2020"
    }
  ],
  "summary": "Professional summary"
}

Resume text:
${resumeText.substring(0, 8000)}`;

    // Call OpenRouter API
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://hireos.app',
      'X-Title': 'HireOS Resume Parser'
    };

    const data = {
      model: "google/gemini-2.0-flash-001", // Cost-effective and fast
      messages: [
        {
          role: "system",
          content: "You are an expert resume parser. Extract structured data from resumes and return ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanations - just the raw JSON object."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 2000
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

    const parsed = JSON.parse(jsonText) as ParsedResumeData;

    // Validate and clean the parsed data
    if (parsed.skills && Array.isArray(parsed.skills)) {
      parsed.skills = parsed.skills.filter(skill => skill && typeof skill === 'string');
    }

    return parsed;
  } catch (error: unknown) {
    const axiosError = error as any;
    const errorResponse = axiosError.response?.data;
    const errorMessage = errorResponse 
      ? `${errorResponse.error?.message || JSON.stringify(errorResponse)}`
      : (error instanceof Error ? error.message : String(error));
    
    console.error("Error parsing resume:", errorMessage);
    throw new Error(`Failed to parse resume: ${errorMessage}`);
  }
}

