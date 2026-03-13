import { promises as fs } from "node:fs";
import path from "node:path";

import {
  buildSessionRecord,
  collectFilesRecursive,
  deriveSelectionSession,
  getCompareCapability,
  getSelectionEligibility,
  readAssetRecord,
  readTextAssetContent,
  type AssetLoadWarning,
  type RecentSessionSummary,
  type SessionRecord,
  type SessionViewState
} from "@presenter/core/node";

import type {
  BootstrapPayload,
  PresenterDebugSnapshot,
  SessionResponse
} from "../common/contracts";
import { SessionStore } from "./session-store";

function uniquePaths(pathsToFilter: string[]): string[] {
  return [...new Set(pathsToFilter.map((inputPath) => path.resolve(inputPath)))];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function getSelectedAssets(session: SessionRecord | null) {
  if (!session) {
    return [];
  }

  return session.assets.filter((asset) => session.selectedAssetIds.includes(asset.id));
}

async function classifyInputs(entryPaths: string[]): Promise<{
  source: SessionRecord["source"];
  hadFolderInput: boolean;
  expandedFiles: string[];
  warnings: AssetLoadWarning[];
}> {
  let hadFolderInput = false;
  let hadFileInput = false;
  const warnings: AssetLoadWarning[] = [];
  const expandedSets = await Promise.all(
    uniquePaths(entryPaths).map(async (entryPath) => {
      try {
        const stats = await fs.stat(entryPath);
        if (stats.isDirectory()) {
          hadFolderInput = true;
          try {
            return await collectFilesRecursive(entryPath);
          } catch (error) {
            warnings.push({
              path: entryPath,
              stage: "collect",
              message: errorMessage(error)
            });
            return [];
          }
        }

        hadFileInput = true;
        return [entryPath];
      } catch (error) {
        warnings.push({
          path: entryPath,
          stage: "collect",
          message: errorMessage(error)
        });
        return [];
      }
    })
  );
  const expandedFiles = uniquePaths(expandedSets.flat()).sort((left, right) =>
    left.localeCompare(right)
  );

  return {
    source: hadFolderInput && hadFileInput ? "mixed" : hadFolderInput ? "folders" : "files",
    hadFolderInput,
    expandedFiles,
    warnings
  };
}

function deriveSessionTitle(entryPaths: string[]): string {
  if (entryPaths.length === 1) {
    return path.basename(entryPaths[0]);
  }

  return `${entryPaths.length} selected items`;
}

export class SessionService {
  private lastWarnings: AssetLoadWarning[] = [];

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
      this.lastWarnings = [];
      return this.response(null, "No files were provided.");
    }

    const {
      source,
      hadFolderInput,
      expandedFiles,
      warnings: collectWarnings
    } = await classifyInputs(entryPaths);
    const assetResults: Array<{ asset: Awaited<ReturnType<typeof readAssetRecord>> } | { warning: AssetLoadWarning }> = await Promise.all(
      expandedFiles.map(async (filePath) => {
        try {
          return { asset: await readAssetRecord(filePath) };
        } catch (error) {
          return {
            warning: {
              path: filePath,
              stage: "read" as const,
              message: errorMessage(error)
            }
          };
        }
      })
    );
    const warnings = [...collectWarnings];
    const assets: Awaited<ReturnType<typeof readAssetRecord>>[] = [];
    for (const result of assetResults) {
      if ("warning" in result) {
        warnings.push(result.warning);
      } else {
        assets.push(result.asset);
      }
    }
    assets.sort((left, right) => left.name.localeCompare(right.name));
    this.lastWarnings = warnings;

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

  getDebugSnapshot(): PresenterDebugSnapshot | null {
    if (process.env.PRESENTER_TEST_MODE !== "1") {
      return null;
    }

    const session = this.store.getCurrentSession();
    const selectedAssets = getSelectedAssets(session);
    return {
      enabled: true,
      session,
      warnings: this.lastWarnings,
      selectedAssetIds: selectedAssets.map((asset) => asset.id),
      selectedAssetNames: selectedAssets.map((asset) => asset.name),
      surface: session?.surface ?? "empty",
      capability: getCompareCapability(selectedAssets)
    };
  }

  private response(
    session: SessionRecord | null,
    error?: string
  ): SessionResponse {
    return {
      session,
      recentSessions: this.store.getRecentSessions(),
      warnings: this.lastWarnings,
      error
    };
  }
}
