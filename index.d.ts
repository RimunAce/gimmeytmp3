/**
 * Downloads a YouTube video as an MP3 file.
 * @param url - The YouTube video URL.
 * @param outputDir - The directory where the MP3 file will be saved. Defaults to current working directory.
 * @param options - Additional options for downloading.
 * @param options.quiet - Suppress logging if true.
 * @param options.filename - Custom filename for the output MP3 file.
 * @param options.quality - Audio quality (high, medium, low).
 * @returns Promise that resolves to the path of the saved MP3 file.
 */
export function downloadMP3(
  url: string,
  outputDir?: string,
  options?: {
    quiet?: boolean;
    filename?: string;
    quality?: "high" | "medium" | "low";
  }
): Promise<string>;

declare module "gimmeytmp3";
