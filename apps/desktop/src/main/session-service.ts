import { promises as fs } from "node:fs";
import path from "node:path";

import {
  buildSessionRecord,
  collectFilesRecursive,
  deriveSelectionSession,
  getSelectionEligibility,
  readAssetRecord,
  readTextAssetContent,
  type RecentSessionSummary,
  type SessionRecord,
  type SessionViewState
} from "@presenter/core/node";

import type { BootstrapPayload, SessionResponse } from "../common/contracts";
import { SessionStore } from "./session-store";

function uniquePaths(pathsToFilter: string[]): string[] {
  return [...new Set(pathsToFilter.map((inputPath) => path.resolve(inputPath)))];
}

async function classifyInputs(entryPaths: string[]): Promise<{
  source: SessionRecord["source"];
  hadFolderInput: boolean;
  expandedFiles: string[];
}> {
  let hadFolderInput = false;
  let hadFileInput = false;
  const expandedSets = await Promise.all(
    uniquePaths(entryPaths).map(async (entryPath) => {
      const stats = await fs.stat(entryPath);
      if (stats.isDirectory()) {
        hadFolderInput = true;
        return collectFilesRecursive(entryPath);
      }

      hadFileInput = true;
      return [entryPath];
    })
  );
  const expandedFiles = uniquePaths(expandedSets.flat()).sort((left, right) =>
    left.localeCompare(right)
  );

  return {
    source: hadFolderInput && hadFileInput ? "mixed" : hadFolderInput ? "folders" : "files",
    hadFolderInput,
    expandedFiles
  };
}

function deriveSessionTitle(entryPaths: string[]): string {
  if (entryPaths.length === 1) {
    return path.basename(entryPaths[0]);
  }

  return `${entryPaths.length} selected items`;
}

export class SessionService {
  constructor(private readonly store: SessionStore) {}

  async load(): Promise<void> {
    await this.store.load();
  }

  getBootstrap(): BootstrapPayload {
    return {
      currentSession: this.store.getCurrentSession(),
      recentSessions: this.store.getRecentSessions()
    };
  }

  async loadPaths(
    entryPaths: string[],
    sourceOverride?: SessionRecord["source"]
  ): Promise<SessionResponse> {
    if (entryPaths.length === 0) {
      return this.response(null, "No files were provided.");
    }

    const { source, hadFolderInput, expandedFiles } = await classifyInputs(entryPaths);
    const assetResults = await Promise.allSettled(
      expandedFiles.map(async (filePath) => readAssetRecord(filePath))
    );
    const assets = assetResults
      .flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
      .sort((left, right) => left.name.localeCompare(right.name));

    if (assets.length === 0) {
      return this.response(null, "No supported or readable files were found.");
    }

    const session = buildSessionRecord({
      title: deriveSessionTitle(entryPaths),
      assets,
      entryPaths: uniquePaths(entryPaths),
      hadFolderInput,
      source: sourceOverride ?? source
    });

    await this.store.setCurrentSession(session);
    return this.response(session);
  }

  async setSelection(assetIds: string[]): Promise<SessionResponse> {
    const session = await this.store.updateCurrentSession((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      selectedAssetIds: assetIds
    }));

    return this.response(session);
  }

  async openSelection(assetIds: string[]): Promise<SessionResponse> {
    const current = this.store.getCurrentSession();
    if (!current) {
      return this.response(null, "There is no active session.");
    }

    const selectedAssets = current.assets.filter((asset) => assetIds.includes(asset.id));
    const eligibility = getSelectionEligibility(selectedAssets);

    if (!eligibility.enabled) {
      const nextSession = await this.store.updateCurrentSession((session) => ({
        ...session,
        updatedAt: new Date().toISOString(),
        selectedAssetIds: assetIds,
        surface: "grid"
      }));

      return this.response(nextSession, eligibility.reason);
    }

    const nextSession = await this.store.updateCurrentSession((session) =>
      deriveSelectionSession(session, assetIds)
    );
    return this.response(nextSession);
  }

  async backToGrid(): Promise<SessionResponse> {
    const nextSession = await this.store.updateCurrentSession((session) => ({
      ...session,
      updatedAt: new Date().toISOString(),
      surface: "grid",
      view: {
        ...session.view,
        layout: session.selectedAssetIds.length >= 4 ? "grid-4" : "grid-3",
        diffEnabled: false
      }
    }));

    return this.response(nextSession);
  }

  async updateView(patch: Partial<SessionViewState>): Promise<SessionResponse> {
    const nextSession = await this.store.updateCurrentSession((session) => {
      const layout = patch.layout ?? session.view.layout;
      return {
        ...session,
        updatedAt: new Date().toISOString(),
        view: {
          ...session.view,
          ...patch,
          layout,
          diffEnabled: layout === "diff"
        }
      };
    });

    return this.response(nextSession);
  }

  async readTextAsset(assetPath: string) {
    return {
      path: assetPath,
      ...(await readTextAssetContent(assetPath))
    };
  }

  async openRecentSession(id: string): Promise<SessionResponse> {
    const recent = this.store.getRecentSession(id);
    if (!recent) {
      return this.response(this.store.getCurrentSession(), "Recent session not found.");
    }

    return this.loadPaths(recent.entryPaths, "restore");
  }

  async reopenCurrentSession(): Promise<SessionResponse> {
    return this.response(this.store.getCurrentSession());
  }

  private response(
    session: SessionRecord | null,
    error?: string
  ): SessionResponse {
    return {
      session,
      recentSessions: this.store.getRecentSessions(),
      error
    };
  }
}
