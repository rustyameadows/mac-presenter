import type {
  AssetLoadWarning,
  AssetRecord,
  CompareCapability,
  RecentSessionSummary,
  SessionRecord,
  SessionViewState
} from "@presenter/core";

export interface BootstrapPayload {
  currentSession: SessionRecord | null;
  recentSessions: RecentSessionSummary[];
}

export interface SessionResponse {
  session: SessionRecord | null;
  recentSessions: RecentSessionSummary[];
  warnings: AssetLoadWarning[];
  error?: string;
}

export interface TextAssetPayload {
  path: string;
  content: string;
  encoding: string | null;
}

export interface PresenterDebugSnapshot {
  enabled: boolean;
  session: SessionRecord | null;
  warnings: AssetLoadWarning[];
  selectedAssetIds: string[];
  selectedAssetNames: string[];
  surface: SessionRecord["surface"] | "empty";
  capability: CompareCapability;
}

export interface PresenterApi {
  getBootstrap(): Promise<BootstrapPayload>;
  openFilesDialog(): Promise<SessionResponse>;
  openFolderDialog(): Promise<SessionResponse>;
  loadPaths(paths: string[]): Promise<SessionResponse>;
  setSelection(assetIds: string[]): Promise<SessionResponse>;
  openSelection(assetIds: string[]): Promise<SessionResponse>;
  backToGrid(): Promise<SessionResponse>;
  updateView(patch: Partial<SessionViewState>): Promise<SessionResponse>;
  readTextAsset(path: string): Promise<TextAssetPayload>;
  openRecentSession(id: string): Promise<SessionResponse>;
  reopenCurrentSession(): Promise<SessionResponse>;
  getDebugState(): Promise<PresenterDebugSnapshot | null>;
  getMediaUrl(assetPath: string): string;
  onSessionChanged(listener: (payload: SessionResponse) => void): () => void;
}

declare global {
  interface Window {
    presenter: PresenterApi;
  }
}

export type { AssetRecord };
