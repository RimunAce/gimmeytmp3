import { downloadMP3 } from "../index.js";

// Example YouTube URL
const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

// Download the MP3
downloadMP3(url)
  .then((outputPath) => {
    console.log(`MP3 saved to: ${outputPath}`);
  })
  .catch((error) => {
    console.error(`Error: ${error.message}`);
  });
