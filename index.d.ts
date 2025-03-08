/**
 * Downloads a YouTube video as an MP3 file.
 * @param url - The YouTube video URL.
 * @param outputDir - The directory where the MP3 file will be saved. Defaults to current working directory.
 * @param options - Additional options for downloading.
 * @param options.showProgress - Show progress logs if true (default: true).
 * @returns Promise that resolves to the path of the saved MP3 file.
 */
export function downloadMP3(
  url: string,
  outputDir?: string,
  options?: {
    showProgress?: boolean;
  }
): Promise<string>;

declare module "gimmeytmp3";
