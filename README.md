# GimmeYTMP3

A Node.js package to download YouTube videos as MP3 files. This package extracts audio from YouTube videos and converts it to MP3 format.

## Installation

```bash
npm install gimmeytmp3
```

## Requirements

- Node.js 16 or higher
- FFmpeg installed on your system
- Windows PowerShell (for Windows users)

### Installing FFmpeg

FFmpeg is required for audio conversion. Follow these instructions to install it on your system:

#### Windows

1. Download the FFmpeg build from the [official website](https://ffmpeg.org/download.html#build-windows) or use a package manager like [Chocolatey](https://chocolatey.org/):

   ```bash
   choco install ffmpeg
   ```

2. Add FFmpeg to your PATH:
   - Right-click on "This PC" or "My Computer" and select "Properties"
   - Click on "Advanced system settings"
   - Click on "Environment Variables"
   - In the "System variables" section, find and select the "Path" variable, then click "Edit"
   - Click "New" and add the path to the FFmpeg `bin` folder (e.g., `C:\FFmpeg\bin`)
   - Click "OK" on all dialogs to save the changes

#### macOS

Using [Homebrew](https://brew.sh/):

```bash
brew install ffmpeg
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install ffmpeg
```

#### Linux (Fedora)

```bash
sudo dnf install ffmpeg
```

#### Verify Installation

After installing FFmpeg, verify it's working by running:

```bash
ffmpeg -version
```

### Note about yt-dlp

This package uses yt-dlp to download YouTube videos. On Windows, the package will automatically download and use yt-dlp if it's not already installed. On other platforms, you may need to install yt-dlp manually:

#### macOS

```bash
brew install yt-dlp
```

#### Linux

```bash
sudo apt install yt-dlp   # Debian/Ubuntu
sudo dnf install yt-dlp   # Fedora
```

## Usage

### In your Node.js code

```javascript
import { downloadMP3 } from "gimmeytmp3";

// Basic usage
try {
  const mp3Path = await downloadMP3(
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
  console.log(`MP3 saved to: ${mp3Path}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
}

// With custom output directory
const outputDir = "./downloads";
const mp3Path = await downloadMP3(
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  outputDir
);

// With no progress output
const options = { showProgress: false };
const mp3Path = await downloadMP3(
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "./downloads",
  options
);
```

### Command Line

```bash
# Install globally
npm install -g gimmeytmp3

# Basic usage
gimmeytmp3 https://www.youtube.com/watch?v=dQw4w9WgXcQ

# Specify output directory
gimmeytmp3 https://www.youtube.com/watch?v=dQw4w9WgXcQ ./downloads

# Using options
gimmeytmp3 --quiet https://www.youtube.com/watch?v=dQw4w9WgXcQ
gimmeytmp3 -q -o ./downloads https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Available options:

- `-q, --quiet`: Suppress progress output
- `-o, --output`: Specify output directory

### Web Interface

A simple web interface example is included in the `examples/web-interface` directory. To run it:

1. Install the required dependencies:

   ```bash
   cd examples/web-interface
   npm install express
   ```

2. Start the server:

   ```bash
   node index.js
   ```

3. Open `http://localhost:3000` in your browser and use the form to download YouTube videos as MP3 files.

## Troubleshooting

### FFmpeg Not Found

If you get an error like `FFmpeg is not installed` or `spawn ffmpeg ENOENT`:

1. Make sure FFmpeg is installed (see installation instructions above)
2. Verify FFmpeg is in your PATH by running `ffmpeg -version` in your terminal
3. Restart your terminal or command prompt after installing FFmpeg

### PowerShell Issues (Windows)

If you encounter PowerShell execution policy issues:

1. Run PowerShell as Administrator
2. Execute `Set-ExecutionPolicy RemoteSigned` to allow local scripts to run
3. Confirm the change when prompted

## License

[MIT License](LICENSE)
