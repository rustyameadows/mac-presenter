import type {
  PersistedSessionState,
  RecentSessionSummary,
  SessionRecord
} from "./types";

export function createRecentSessionSummary(
  session: SessionRecord
): RecentSessionSummary {
  return {
    id: session.id,
    title: session.title,
    updatedAt: session.updatedAt,
    assetCount: session.assets.length,
    selectedCount: session.selectedAssetIds.length,
    surface: session.surface,
    entryPaths: session.entryPaths,
    hadFolderInput: session.hadFolderInput,
    source: session.source
  };
}

export function updateRecentSessions(
  existing: RecentSessionSummary[],
  session: SessionRecord,
  maxEntries = 10
): RecentSessionSummary[] {
  const current = createRecentSessionSummary(session);
  return [current, ...existing.filter((item) => item.id !== current.id)].slice(
    0,
    maxEntries
  );
}

export function createInitialPersistedState(): PersistedSessionState {
  return {
    currentSession: null,
    recentSessions: []
  };
}
