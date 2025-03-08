#!/usr/bin/env node

import { downloadMP3 } from "./downloader.js";
import path from "path";

const args = process.argv.slice(2);

// Parse options
let url = "";
let outputDir = process.cwd();
let quiet = false;

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === "-q" || arg === "--quiet") {
    quiet = true;
  } else if (arg === "-o" || arg === "--output") {
    // Get the next argument as output directory
    if (i + 1 < args.length) {
      outputDir = args[i + 1];
      i++; // Skip the next argument
    }
  } else if (!url) {
    // First non-option argument is the URL
    url = arg;
  } else if (!outputDir || outputDir === process.cwd()) {
    // Second non-option argument is the output directory
    outputDir = arg;
  }
}

if (!url) {
  console.log("Usage: gimmeytmp3 [options] <youtube-url> [output-directory]");
  console.log("\nOptions:");
  console.log("  -q, --quiet     Suppress progress output");
  console.log("  -o, --output    Specify output directory");
  process.exit(1);
}

if (!quiet) console.log(`Downloading MP3 from ${url}...`);

downloadMP3(url, outputDir, { showProgress: !quiet })
  .then((outputPath) => {
    console.log(`MP3 saved to: ${outputPath}`);
  })
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
