import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";

import chardet from "chardet";
// @ts-ignore ffprobe-static does not publish TypeScript declarations.
import ffprobe from "ffprobe-static";
import { imageSize } from "image-size";

import { createAssetId, describeFileType, detectAssetFamily, getExtension } from "./assets";
import type {
  AssetRecord,
  CommonMetadata,
  ImageAssetMetadata,
  TextAssetMetadata,
  UnsupportedAssetMetadata,
  VideoAssetMetadata
} from "./types";

const execFileAsync = promisify(execFile);

function normalizeEncoding(encoding: string | null): string | null {
  if (!encoding) {
    return null;
  }

  return encoding.toLowerCase().replaceAll("_", "-");
}

function decodeText(buffer: Buffer, encoding: string | null): string {
  const normalized = normalizeEncoding(encoding);

  if (!normalized) {
    return buffer.toString("utf8");
  }

  try {
    return new TextDecoder(normalized).decode(buffer);
  } catch {
    return buffer.toString("utf8");
  }
}

function parseFrameRate(input: string | undefined): number | null {
  if (!input) {
    return null;
  }

  const [numerator, denominator] = input.split("/").map(Number);
  if (!numerator || !denominator) {
    return null;
  }

  return Number((numerator / denominator).toFixed(3));
}

function buildCommonMetadata(
  filePath: string,
  family: AssetRecord["family"],
  stats: Awaited<ReturnType<typeof fs.stat>>
): CommonMetadata {
  const extension = getExtension(filePath);
  return {
    filename: path.basename(filePath),
    path: filePath,
    extension,
    fileTypeLabel: describeFileType(extension, family),
    sizeBytes: Number(stats.size),
    createdAt: stats.birthtime.toISOString(),
    modifiedAt: stats.mtime.toISOString()
  };
}

async function readTextMetadata(
  filePath: string,
  stats: Awaited<ReturnType<typeof fs.stat>>
): Promise<TextAssetMetadata> {
  const family = detectAssetFamily(filePath);
  const buffer = await fs.readFile(filePath);
  const encoding = normalizeEncoding(chardet.detect(buffer));
  const content = decodeText(buffer, encoding);
  const common = buildCommonMetadata(filePath, family, stats);

  return {
    ...common,
    family: "text",
    characterCount: content.length,
    lineCount: content.length === 0 ? 0 : content.split(/\r?\n/).length,
    wordCount: content.trim().length === 0 ? 0 : content.trim().split(/\s+/).length,
    encoding
  };
}

async function readImageMetadata(
  filePath: string,
  stats: Awaited<ReturnType<typeof fs.stat>>
): Promise<ImageAssetMetadata> {
  const family = detectAssetFamily(filePath);
  const buffer = await fs.readFile(filePath);
  const dimensions = imageSize(buffer);
  const common = buildCommonMetadata(filePath, family, stats);
  const width = dimensions.width ?? null;
  const height = dimensions.height ?? null;

  return {
    ...common,
    family: family === "gif" ? "gif" : "image",
    width,
    height,
    aspectRatio: width && height ? Number((width / height).toFixed(4)) : null,
    format: dimensions.type ?? common.fileTypeLabel.toLowerCase()
  };
}

async function readVideoMetadata(
  filePath: string,
  stats: Awaited<ReturnType<typeof fs.stat>>
): Promise<VideoAssetMetadata> {
  const { stdout } = await execFileAsync(ffprobe.path, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    filePath
  ]);
  const parsed = JSON.parse(stdout) as {
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      r_frame_rate?: string;
    }>;
    format?: {
      duration?: string;
      format_name?: string;
    };
  };
  const videoStream = parsed.streams?.find((stream) => stream.codec_type === "video");
  const common = buildCommonMetadata(filePath, "video", stats);
  const width = videoStream?.width ?? null;
  const height = videoStream?.height ?? null;

  return {
    ...common,
    family: "video",
    width,
    height,
    aspectRatio: width && height ? Number((width / height).toFixed(4)) : null,
    durationSeconds: parsed.format?.duration
      ? Number.parseFloat(parsed.format.duration)
      : null,
    frameRate: parseFrameRate(videoStream?.r_frame_rate),
    codec: videoStream?.codec_name ?? null,
    container: parsed.format?.format_name ?? null
  };
}

function readUnsupportedMetadata(
  filePath: string,
  stats: Awaited<ReturnType<typeof fs.stat>>
): UnsupportedAssetMetadata {
  return {
    ...buildCommonMetadata(filePath, "unsupported", stats),
    family: "unsupported"
  };
}

export async function readTextAssetContent(filePath: string): Promise<{
  encoding: string | null;
  content: string;
}> {
  const buffer = await fs.readFile(filePath);
  const encoding = normalizeEncoding(chardet.detect(buffer));
  return {
    encoding,
    content: decodeText(buffer, encoding)
  };
}

export async function readAssetRecord(filePath: string): Promise<AssetRecord> {
  const stats = await fs.stat(filePath);
  const family = detectAssetFamily(filePath);

  const metadata =
    family === "text"
      ? await readTextMetadata(filePath, stats)
      : family === "image" || family === "gif"
        ? await readImageMetadata(filePath, stats)
        : family === "video"
          ? await readVideoMetadata(filePath, stats)
          : readUnsupportedMetadata(filePath, stats);

  return {
    id: createAssetId(filePath),
    name: path.basename(filePath),
    path: filePath,
    extension: getExtension(filePath),
    family,
    supported: family !== "unsupported",
    previewable: family !== "unsupported",
    metadata
  };
}
