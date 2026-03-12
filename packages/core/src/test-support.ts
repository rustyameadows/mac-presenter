import type { AssetFamily, SessionSurface } from "./types";

export interface FixtureExpectedMetadata {
  fileTypeLabel?: string;
  encoding?: string | null;
  lineCount?: number;
  wordCount?: number;
  characterCountMin?: number;
  width?: number;
  height?: number;
  format?: string | null;
  codec?: string | null;
  containerIncludes?: string;
  durationSecondsMin?: number;
}

export interface FixtureExpectedOutput {
  excerpt?: string;
  excerptAbsent?: string;
  visibleLabels?: string[];
}

export interface FixtureExpectedViewport {
  kind: "text" | "image" | "gif" | "video" | "unsupported" | "grid";
  scrollable?: boolean;
  screenshotName?: string;
}

export interface FixtureManifestEntry {
  id: string;
  scenario: "single" | "compare" | "folder";
  family: AssetFamily | "mixed";
  path: string;
  variantPath?: string;
  entryPaths: string[];
  expectedSurface: SessionSurface;
  expectedSelection: string[];
  expectedMetadata: FixtureExpectedMetadata;
  expectedOutput: FixtureExpectedOutput;
  expectedViewport: FixtureExpectedViewport;
  compareEligible: boolean;
}
