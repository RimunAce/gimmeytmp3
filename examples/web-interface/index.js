import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { downloadMP3 } from "../../index.js";
import fs from "fs";

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Download endpoint
app.post("/download", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    // Create a directory for downloads if it doesn't exist
    const downloadsDir = path.join(__dirname, "downloads");
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir);
    }

    // Download the MP3
    const mp3Path = await downloadMP3(url, downloadsDir);

    // Get the filename from the path
    const filename = path.basename(mp3Path);

    // Return the download path
    res.json({
      success: true,
      message: "MP3 downloaded successfully",
      downloadUrl: `/download/${filename}`,
    });
  } catch (error) {
    console.error("Error downloading MP3:", error);
    res.status(500).json({ error: error.message });
  }
});

// Serve downloaded files
app.get("/download/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "downloads", filename);

  res.download(filePath, (err) => {
    if (err) {
      console.error("Error serving download:", err);
      res.status(404).send("File not found");
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
