import type { AssetFamily } from "./types";

const textExtensions = new Set([
  ".txt",
  ".md",
  ".rtf",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".html",
  ".css",
  ".rb",
  ".py",
  ".yml",
  ".yaml",
  ".xml",
  ".toml",
  ".ini",
  ".sh",
  ".c",
  ".cc",
  ".cpp",
  ".go",
  ".java",
  ".swift",
  ".rs"
]);

const imageExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".bmp",
  ".tif",
  ".tiff"
]);

const gifExtensions = new Set([".gif"]);
const videoExtensions = new Set([".mp4", ".mov", ".webm", ".m4v"]);

export function getExtension(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  const filename = normalized.slice(normalized.lastIndexOf("/") + 1);
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex === -1 ? "" : filename.slice(dotIndex).toLowerCase();
}

export function detectAssetFamily(filePath: string): AssetFamily {
  const extension = getExtension(filePath);

  if (gifExtensions.has(extension)) {
    return "gif";
  }

  if (imageExtensions.has(extension)) {
    return "image";
  }

  if (videoExtensions.has(extension)) {
    return "video";
  }

  if (textExtensions.has(extension)) {
    return "text";
  }

  return "unsupported";
}

export function createAssetId(filePath: string): string {
  return createStableHash(filePath);
}

export function createSessionId(entryPaths: string[]): string {
  return createStableHash(`${entryPaths.join("|")}:${Date.now().toString()}`);
}

export function describeFileType(extension: string, family: AssetFamily): string {
  if (family === "unsupported") {
    return extension ? extension.slice(1).toUpperCase() : "Unknown";
  }

  if (!extension) {
    return family;
  }

  return extension.slice(1).toUpperCase();
}

export function isVisualFamily(family: AssetFamily): boolean {
  return family === "image" || family === "gif";
}

function createStableHash(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }

  return Math.abs(hash >>> 0).toString(16);
}
