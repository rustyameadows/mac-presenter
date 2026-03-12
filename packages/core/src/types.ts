export type AssetFamily = "image" | "gif" | "video" | "text" | "unsupported";

export type SessionSurface = "empty" | "grid" | "single" | "compare";

export type CompareLayout =
  | "single"
  | "side-by-side"
  | "top-bottom"
  | "grid-3"
  | "grid-4"
  | "reveal-vertical"
  | "reveal-horizontal"
  | "diff";

export type BackgroundMode = "checker" | "black" | "white" | "custom";
export type FitMode = "fit" | "fill" | "actual";
export type TextDiffMode = "split" | "unified";
export type GridSort = "name" | "created" | "modified" | "size" | "type";
export type GridFilter = AssetFamily | "all";

export interface CommonMetadata {
  filename: string;
  path: string;
  extension: string;
  fileTypeLabel: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
}

export interface TextAssetMetadata extends CommonMetadata {
  family: "text";
  characterCount: number;
  lineCount: number;
  wordCount: number;
  encoding: string | null;
}

export interface ImageAssetMetadata extends CommonMetadata {
  family: "image" | "gif";
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  format: string | null;
}

export interface VideoAssetMetadata extends CommonMetadata {
  family: "video";
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  durationSeconds: number | null;
  frameRate: number | null;
  codec: string | null;
  container: string | null;
}

export interface UnsupportedAssetMetadata extends CommonMetadata {
  family: "unsupported";
}

export type AssetMetadata =
  | TextAssetMetadata
  | ImageAssetMetadata
  | VideoAssetMetadata
  | UnsupportedAssetMetadata;

export interface AssetRecord {
  id: string;
  name: string;
  path: string;
  extension: string;
  family: AssetFamily;
  supported: boolean;
  previewable: boolean;
  metadata: AssetMetadata;
}

export interface CompareCapability {
  enabled: boolean;
  reason?: string;
  family: AssetFamily | "mixed";
  layouts: CompareLayout[];
  canDiff: boolean;
  canReveal: boolean;
  canSyncPan: boolean;
  canSyncPlayback: boolean;
}

export interface SessionViewState {
  layout: CompareLayout;
  background: BackgroundMode;
  backgroundColor: string;
  zoom: 1 | 2 | 4 | 10;
  fitMode: FitMode;
  diffEnabled: boolean;
  syncPan: boolean;
  syncPlayback: boolean;
  metadataOpen: boolean;
  textDiffMode: TextDiffMode;
  gridSort: GridSort;
  gridFilter: GridFilter;
}

export interface SessionRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  source: "files" | "folders" | "mixed" | "restore";
  entryPaths: string[];
  hadFolderInput: boolean;
  assets: AssetRecord[];
  selectedAssetIds: string[];
  surface: SessionSurface;
  view: SessionViewState;
}

export interface RecentSessionSummary {
  id: string;
  title: string;
  updatedAt: string;
  assetCount: number;
  selectedCount: number;
  surface: SessionSurface;
  entryPaths: string[];
  hadFolderInput: boolean;
  source: SessionRecord["source"];
}

export interface PersistedSessionState {
  currentSession: SessionRecord | null;
  recentSessions: RecentSessionSummary[];
}

export interface SelectionEligibility {
  enabled: boolean;
  reason?: string;
  recommendedSurface: SessionSurface;
  recommendedLayout: CompareLayout;
  capability: CompareCapability;
}

export interface IntakeRoute {
  surface: SessionSurface;
  layout: CompareLayout;
  reason?: string;
}

export interface NormalizedAssetBox {
  sourceWidth: number;
  sourceHeight: number;
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
}

export interface ImageNormalizationPlan {
  width: number;
  height: number;
  normalized: boolean;
  left: NormalizedAssetBox;
  right: NormalizedAssetBox;
}
