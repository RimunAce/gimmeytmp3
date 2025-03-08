import { downloadMP3 } from "../index.js";
import assert from "assert";
import fs from "fs";
import path from "path";

// Test function
async function runTest() {
  console.log("Running test...");

  // Test URL
  const url = "https://www.youtube.com/watch?v=jm5rqq_SP8Q";

  try {
    // Download the MP3
    const outputPath = await downloadMP3(url);

    // Check if the file exists
    assert(fs.existsSync(outputPath), "Output file does not exist");

    // Check if the file size is greater than 0
    const stats = fs.statSync(outputPath);
    assert(stats.size > 0, "Output file is empty");

    console.log("Test passed!");
    console.log(`MP3 saved to: ${outputPath}`);

    return true;
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    return false;
  }
}

// Run the test
runTest();
