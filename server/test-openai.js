// Simple script to test the OpenAI integration directly

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testOpenAI() {
  try {
    console.log("Testing OpenAI integration...");
    console.log("API Key exists:", !!process.env.OPENAI_API_KEY);
    
    // Simple prompt to test the integration
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Hello, how are you today?"
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    });
    
    console.log("OpenAI Response:", response.choices[0].message.content);
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Error testing OpenAI integration:", error);
  }
}

// Run the test
testOpenAI();