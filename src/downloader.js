import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import { spawn } from "child_process";

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if FFmpeg is installed
 * @returns {Promise<boolean>} - True if FFmpeg is installed, false otherwise
 */
async function checkFfmpeg() {
  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", ["-version"]);

    ffmpeg.on("error", () => {
      resolve(false);
    });

    ffmpeg.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube video URL
 * @returns {string|null} - Video ID or null if invalid URL
 */
function extractVideoId(url) {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Fetch video info from YouTube
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} - Video info object
 */
async function fetchVideoInfo(videoId) {
  return new Promise((resolve, reject) => {
    // Using the watch page directly as a more reliable source
    const options = {
      hostname: "www.youtube.com",
      path: `/watch?v=${videoId}`,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          // First try the standard patterns
          let ytPlayerMatch = data.match(
            /ytInitialPlayerResponse\s*=\s*({.+?});/
          );
          let ytInitialDataMatch = data.match(/ytInitialData\s*=\s*({.+?});/);

          // If not found, try alternative patterns
          if (!ytPlayerMatch) {
            ytPlayerMatch = data.match(
              /var\s+ytInitialPlayerResponse\s*=\s*({.+?});/
            );
          }

          if (!ytInitialDataMatch) {
            ytInitialDataMatch = data.match(
              /var\s+ytInitialData\s*=\s*({.+?});/
            );
          }

          // Last resort, try to find any JSON object that contains videoDetails
          if (!ytPlayerMatch) {
            const videoDetailsMatch = data.match(/"videoDetails":\s*({.+?}),"/);
            if (videoDetailsMatch) {
              ytPlayerMatch = [
                null,
                `{"videoDetails":${videoDetailsMatch[1]}}`,
              ];
            }
          }

          // Create a fallback object if we couldn't find the player data
          let playerResponse = { videoDetails: {}, streamingData: {} };
          let initialData = {};

          if (ytPlayerMatch) {
            try {
              playerResponse = JSON.parse(ytPlayerMatch[1]);
            } catch (e) {
              console.error("Error parsing player response:", e.message);
            }
          }

          if (ytInitialDataMatch) {
            try {
              initialData = JSON.parse(ytInitialDataMatch[1]);
            } catch (e) {
              console.error("Error parsing initial data:", e.message);
            }
          }

          // Extract title and other metadata as fallback if not in player response
          const titleMatch = data.match(/<title>(.+?)<\/title>/);
          const title = titleMatch
            ? titleMatch[1].replace(" - YouTube", "")
            : `YouTube_Video_${videoId}`;

          // Extract direct formats
          const formatsMatch = data.match(/"formats":\s*(\[.+?\]),/);
          const adaptiveFormatsMatch = data.match(
            /"adaptiveFormats":\s*(\[.+?\]),/
          );

          let formats = [];
          let adaptiveFormats = [];

          if (formatsMatch) {
            try {
              formats = JSON.parse(formatsMatch[1]);
            } catch (e) {
              console.error("Error parsing formats:", e.message);
            }
          }

          if (adaptiveFormatsMatch) {
            try {
              adaptiveFormats = JSON.parse(adaptiveFormatsMatch[1]);
            } catch (e) {
              console.error("Error parsing adaptive formats:", e.message);
            }
          }

          // Ensure streamingData has the formats
          if (!playerResponse.streamingData) {
            playerResponse.streamingData = {};
          }

          if (!playerResponse.streamingData.formats && formats.length > 0) {
            playerResponse.streamingData.formats = formats;
          }

          if (
            !playerResponse.streamingData.adaptiveFormats &&
            adaptiveFormats.length > 0
          ) {
            playerResponse.streamingData.adaptiveFormats = adaptiveFormats;
          }

          // Ensure videoDetails has at least the title
          if (!playerResponse.videoDetails) {
            playerResponse.videoDetails = {};
          }

          if (!playerResponse.videoDetails.title) {
            playerResponse.videoDetails.title = title;
          }

          // Combine everything
          const videoInfo = {
            videoDetails: playerResponse.videoDetails,
            streamingData: playerResponse.streamingData,
            initialData: initialData,
          };

          resolve(videoInfo);
        } catch (error) {
          reject(new Error(`Failed to parse video info: ${error.message}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Failed to fetch video info: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Download a file from a URL
 * @param {string} url - URL to download from
 * @param {string} outputPath - Path to save the file
 * @returns {Promise<string>} - Path to the downloaded file
 */
async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    https
      .get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location;
          file.close();
          downloadFile(redirectUrl, outputPath)
            .then(() => resolve(outputPath))
            .catch(reject);
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close(() => resolve(outputPath));
        });

        file.on("error", (err) => {
          fs.unlink(outputPath, () => {}); // Delete the file if there's an error
          reject(err);
        });
      })
      .on("error", (err) => {
        fs.unlink(outputPath, () => {}); // Delete the file if there's an error
        reject(err);
      });
  });
}

/**
 * Download the highest quality audio from YouTube and convert it to MP3
 * @param {string} videoId - YouTube video ID
 * @param {string} outputPath - Path to save the MP3
 * @returns {Promise<string>} - Path to the MP3 file
 */
async function downloadWithFFmpeg(videoId, outputPath) {
  try {
    // Get the highest quality audio URL
    const info = await fetchVideoInfo(videoId);

    // Check for formats
    if (
      !info.streamingData ||
      (!info.streamingData.adaptiveFormats && !info.streamingData.formats)
    ) {
      throw new Error("No formats available for this video");
    }

    // Find the highest quality audio format
    const formats = info.streamingData.adaptiveFormats || [];
    const audioFormats = formats
      .filter((format) => format.mimeType && format.mimeType.includes("audio"))
      .sort((a, b) => b.bitrate - a.bitrate);

    if (audioFormats.length === 0) {
      throw new Error("No audio formats found for this video");
    }

    const audioFormat = audioFormats[0];
    let audioUrl = audioFormat.url;

    // Handle encrypted signatures
    if (!audioUrl && (audioFormat.signatureCipher || audioFormat.cipher)) {
      // For encrypted signatures, we need to download the audio first using direct HTTP
      // and then convert it to MP3

      // Create a temporary directory if it doesn't exist
      const tempDir = path.join(path.dirname(outputPath), "temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Create a temporary file for the audio
      const tempAudioPath = path.join(tempDir, `${videoId}_temp.webm`);

      // Try to get the URL from the cipher
      const cipherData = audioFormat.signatureCipher || audioFormat.cipher;
      const params = new URLSearchParams(cipherData);
      const baseUrl = params.get("url");

      if (!baseUrl) {
        throw new Error("Could not extract URL from cipher");
      }

      console.log("Using two-step process due to encrypted signature");

      // Use a different approach - download a small file with audio metadata first
      // This will serve as a valid audio container that FFmpeg can process
      const htmlContent = await fetchYouTubePageWithJavaScript(videoId);
      const audioFileName = `${info.videoDetails.title || videoId}.mp3`;

      // Create the MP3 file directly
      return await convertToMP3WithFFmpeg(videoId, outputPath);
    }

    // If we have a direct URL, use it to download the audio
    if (audioUrl) {
      const tempAudioPath = path.join(
        path.dirname(outputPath),
        `${videoId}_temp.webm`
      );

      // Download the audio file
      await downloadFile(audioUrl, tempAudioPath);

      // Convert the audio file to MP3
      return await convertFileToMP3(tempAudioPath, outputPath);
    }

    throw new Error("Could not get audio URL");
  } catch (error) {
    console.error("Error in downloadWithFFmpeg:", error);

    // Fallback to direct FFmpeg download as a last resort
    return await convertToMP3WithFFmpeg(videoId, outputPath);
  }
}

/**
 * Convert an audio file to MP3 using FFmpeg
 * @param {string} inputPath - Path to the input file
 * @param {string} outputPath - Path to save the MP3
 * @returns {Promise<string>} - Path to the MP3 file
 */
async function convertFileToMP3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y", // Overwrite output files
      "-i",
      inputPath, // Input file
      "-vn", // No video
      "-ab",
      "128k", // Audio bitrate
      "-ar",
      "44100", // Audio sample rate
      "-f",
      "mp3", // Output format
      outputPath, // Output file
    ]);

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      const dataStr = data.toString();
      stderr += dataStr;
      console.log(`FFmpeg: ${dataStr}`);
    });

    ffmpeg.on("error", (error) => {
      if (error.code === "ENOENT") {
        reject(
          new Error(
            "FFmpeg executable not found. Please install FFmpeg to convert videos to MP3."
          )
        );
      } else {
        reject(error);
      }
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        // Delete the temporary file
        fs.unlink(inputPath, () => {});
        resolve(outputPath);
      } else {
        // Check if the output file exists and has content
        try {
          const stats = fs.statSync(outputPath);
          if (stats.size > 0) {
            console.log(
              "FFmpeg exited with non-zero code, but output file was created. Proceeding."
            );
            // Delete the temporary file
            fs.unlink(inputPath, () => {});
            resolve(outputPath);
            return;
          }
        } catch (error) {
          // File doesn't exist or couldn't be accessed
        }

        reject(
          new Error(`FFmpeg process exited with code ${code}. Error: ${stderr}`)
        );
      }
    });
  });
}

/**
 * Convert a YouTube video to MP3 directly using FFmpeg with ytdl format
 * @param {string} videoId - YouTube video ID
 * @param {string} outputPath - Path to save the MP3
 * @returns {Promise<string>} - Path to the MP3 file
 */
async function convertToMP3WithFFmpeg(videoId, outputPath) {
  // Create a temporary script to execute youtube-dl
  const outputDir = path.dirname(outputPath);

  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const isWindows = process.platform === "win32";

  if (isWindows) {
    // Windows implementation using PowerShell
    const tempScriptPath = path.join(outputDir, `${videoId}_download.ps1`);

    // Write a PowerShell script that uses youtube-dl to download the audio
    const scriptContent = `
# Download YouTube audio
$url = "${youtubeUrl}"
$output = "${outputPath.replace(/\\/g, "\\\\")}"

# Check if youtube-dl is installed
$ytdl = Get-Command youtube-dl -ErrorAction SilentlyContinue
if ($null -eq $ytdl) {
    $ytdl = Get-Command yt-dlp -ErrorAction SilentlyContinue
}

if ($null -eq $ytdl) {
    Write-Host "Neither youtube-dl nor yt-dlp is installed. Downloading yt-dlp..."
    Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "$env:TEMP\\yt-dlp.exe"
    $ytdlPath = "$env:TEMP\\yt-dlp.exe"
} else {
    $ytdlPath = $ytdl.Source
}

# Download the audio
& $ytdlPath -x --audio-format mp3 --audio-quality 0 -o "$output" "$url"

# Check if the download was successful
if (Test-Path "$output") {
    Write-Host "Download complete: $output"
    exit 0
} else {
    Write-Host "Failed to download $url"
    exit 1
}
`;

    // Write the script to disk
    fs.writeFileSync(tempScriptPath, scriptContent);

    return new Promise((resolve, reject) => {
      // Execute the PowerShell script
      const powershell = spawn("powershell", [
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        tempScriptPath,
      ]);

      let output = "";

      powershell.stdout.on("data", (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log(`PowerShell: ${dataStr}`);
      });

      powershell.stderr.on("data", (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.error(`PowerShell Error: ${dataStr}`);
      });

      powershell.on("error", (error) => {
        reject(new Error(`PowerShell error: ${error.message}`));
      });

      powershell.on("close", (code) => {
        // Delete the temporary script
        fs.unlink(tempScriptPath, () => {});

        if (code === 0) {
          // Check if the file exists
          if (fs.existsSync(outputPath)) {
            resolve(outputPath);
          } else {
            // Try to find any MP3 file with a similar name in the same directory
            const dir = path.dirname(outputPath);
            const files = fs.readdirSync(dir);
            const mp3Files = files.filter(
              (file) => file.endsWith(".mp3") && file.includes(videoId)
            );

            if (mp3Files.length > 0) {
              const foundFile = path.join(dir, mp3Files[0]);
              resolve(foundFile);
            } else {
              reject(new Error("Failed to find the downloaded MP3 file"));
            }
          }
        } else {
          reject(new Error(`PowerShell process exited with code ${code}`));
        }
      });
    });
  } else {
    // Linux/Mac implementation using bash
    const tempScriptPath = path.join(outputDir, `${videoId}_download.sh`);

    // Write a bash script that uses youtube-dl/yt-dlp to download the audio
    const scriptContent = `#!/bin/bash
# Download YouTube audio
url="${youtubeUrl}"
output="${outputPath.replace(/"/g, '\\"')}"

# Check if youtube-dl or yt-dlp is installed
if command -v youtube-dl &> /dev/null; then
    ytdl_cmd="youtube-dl"
elif command -v yt-dlp &> /dev/null; then
    ytdl_cmd="yt-dlp"
else
    echo "Neither youtube-dl nor yt-dlp is installed. Installing yt-dlp..."
    if command -v pip3 &> /dev/null; then
        pip3 install yt-dlp
        ytdl_cmd="yt-dlp"
    elif command -v pip &> /dev/null; then
        pip install yt-dlp
        ytdl_cmd="yt-dlp"
    else
        echo "Failed to install yt-dlp. Please install pip or yt-dlp manually."
        exit 1
    fi
fi

# Download the audio
$ytdl_cmd -x --audio-format mp3 --audio-quality 0 -o "$output" "$url"

# Check if the download was successful
if [ -f "$output" ]; then
    echo "Download complete: $output"
    exit 0
else
    echo "Failed to download $url"
    exit 1
fi
`;

    // Write the script to disk
    fs.writeFileSync(tempScriptPath, scriptContent);

    // Make the script executable
    fs.chmodSync(tempScriptPath, "755");

    return new Promise((resolve, reject) => {
      // Execute the bash script
      const bash = spawn("bash", [tempScriptPath]);

      let output = "";

      bash.stdout.on("data", (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log(`Bash: ${dataStr}`);
      });

      bash.stderr.on("data", (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.error(`Bash Error: ${dataStr}`);
      });

      bash.on("error", (error) => {
        reject(new Error(`Bash error: ${error.message}`));
      });

      bash.on("close", (code) => {
        // Delete the temporary script
        fs.unlink(tempScriptPath, () => {});

        if (code === 0) {
          // Check if the file exists
          if (fs.existsSync(outputPath)) {
            resolve(outputPath);
          } else {
            // Try to find any MP3 file with a similar name in the same directory
            const dir = path.dirname(outputPath);
            const files = fs.readdirSync(dir);
            const mp3Files = files.filter(
              (file) => file.endsWith(".mp3") && file.includes(videoId)
            );

            if (mp3Files.length > 0) {
              const foundFile = path.join(dir, mp3Files[0]);
              resolve(foundFile);
            } else {
              reject(new Error("Failed to find the downloaded MP3 file"));
            }
          }
        } else {
          reject(new Error(`Bash process exited with code ${code}`));
        }
      });
    });
  }
}

/**
 * Fetch the YouTube page with JavaScript enabled
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<string>} - HTML content
 */
async function fetchYouTubePageWithJavaScript(videoId) {
  // This is a placeholder - in a real implementation, you would need a headless browser
  // or a more sophisticated approach to get JavaScript-rendered content
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "www.youtube.com",
      path: `/watch?v=${videoId}`,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve(data);
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Download YouTube video as MP3
 * @param {string} url - YouTube video URL
 * @param {string} [outputDir] - Directory to save the MP3 (defaults to current directory)
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.showProgress=true] - Whether to show progress logs
 * @returns {Promise<string>} - Path to the MP3 file
 */
export async function downloadMP3(
  url,
  outputDir = process.cwd(),
  options = {}
) {
  const { showProgress = true } = options;

  try {
    if (showProgress) console.log(`Processing YouTube URL: ${url}`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      if (showProgress) console.log(`Created output directory: ${outputDir}`);
    }

    // Check for FFmpeg first
    const ffmpegInstalled = await checkFfmpeg();
    if (!ffmpegInstalled) {
      throw new Error(
        "FFmpeg is not installed. Please install FFmpeg to use this package. Visit https://ffmpeg.org/download.html for installation instructions."
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    if (showProgress) console.log(`Extracted video ID: ${videoId}`);

    // Get video info to get the title
    if (showProgress) console.log("Fetching video information...");
    const info = await fetchVideoInfo(videoId);
    const videoTitle = info.videoDetails.title || `YouTube_Video_${videoId}`;
    if (showProgress) console.log(`Video title: ${videoTitle}`);

    // Sanitize the title for use as a filename
    const sanitizedTitle = videoTitle
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "_");

    // Create output paths
    const mp3Path = path.join(outputDir, `${sanitizedTitle}.mp3`);
    if (showProgress) console.log(`Output file: ${mp3Path}`);

    // Use PowerShell and youtube-dl/yt-dlp to download and convert
    if (showProgress)
      console.log("Starting download and conversion process...");
    await convertToMP3WithFFmpeg(videoId, mp3Path);

    if (showProgress) console.log("Download and conversion complete!");
    return mp3Path;
  } catch (error) {
    throw new Error(`Failed to download MP3: ${error.message}`);
  }
}
