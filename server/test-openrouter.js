// Simple script to test OpenRouter API directly
import axios from 'axios';

async function testOpenRouter() {
  try {
    console.log("Testing OpenRouter API directly...");
    console.log("API Key exists:", !!process.env.OPENAI_API_KEY);
    
    // OpenRouter endpoint for chat completions
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Request headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'HTTP-Referer': 'https://replit.com',
      'X-Title': 'HireOS Test Direct'
    };
    
    // Request body
    const data = {
      model: "google/gemini-2.0-flash-001",
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
    };
    
    // Make the API request
    const response = await axios.post(url, data, { headers });
    
    console.log("OpenRouter Response:", response.data.choices[0].message.content);
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Error testing OpenRouter API:", error.response?.data || error.message);
  }
}

// Run the test
testOpenRouter();