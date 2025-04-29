import axios from "axios";

const testUrl = "https://firmos-hipeople-scraper-899783477192.europe-west1.run.app/scrape_hipeople";

async function testHiPeopleScraper() {
  try {
    const response = await axios.post(testUrl, null, {
      params: {
        applicant_name: "Rodney Reese",
        applicant_email: "rodney@firmos.app"
      },
      timeout:300000, // optional: adjust timeout for slower responses
    });

    console.log("✅ Scraper Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("❌ Axios error:");
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
      } else if (error.request) {
        console.error("No response received.");
        console.error("Request details:", error.request);
        
      } else {
        console.error("Error Message:", error.message);
      }
    } else {
      console.error("❌ Unexpected Error:", error);
      
    }
  }
}

testHiPeopleScraper();
