import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildSessionRecord,
  collectFilesRecursive,
  readAssetRecord,
  supportedAssetExtensionsByFamily,
  type AssetRecord,
  type FixtureExpectedMetadata,
  type FixtureManifestEntry
} from "../src/node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureRoot = path.resolve(__dirname, "../../../test/fixtures/supported");
const manifest = JSON.parse(
  readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8")
) as FixtureManifestEntry[];

function resolveFixturePath(relativePath: string) {
  return path.join(fixtureRoot, relativePath);
}

function resolveEntryPaths(entry: FixtureManifestEntry) {
  return entry.entryPaths.map(resolveFixturePath);
}

function selectedNames(session: ReturnType<typeof buildSessionRecord>) {
  return session.assets
    .filter((asset) => session.selectedAssetIds.includes(asset.id))
    .map((asset) => asset.name)
    .sort();
}

function metadataForSelectedAssets(session: ReturnType<typeof buildSessionRecord>) {
  return session.assets.filter((asset) => session.selectedAssetIds.includes(asset.id));
}

function assertMetadata(asset: AssetRecord, expected: FixtureExpectedMetadata) {
  if (expected.fileTypeLabel) {
    expect(asset.metadata.fileTypeLabel).toBe(expected.fileTypeLabel);
  }

  if (asset.metadata.family === "text") {
    if (expected.lineCount !== undefined) {
      expect(asset.metadata.lineCount).toBe(expected.lineCount);
    }
    if (expected.wordCount !== undefined) {
      expect(asset.metadata.wordCount).toBe(expected.wordCount);
    }
    if (expected.characterCountMin !== undefined) {
      expect(asset.metadata.characterCount).toBeGreaterThanOrEqual(expected.characterCountMin);
    }
    if (expected.encoding !== undefined) {
      if (expected.encoding === "ascii") {
        expect(asset.metadata.encoding).toBeTruthy();
      } else {
        expect(asset.metadata.encoding).toBe(expected.encoding);
      }
    }
  }

  if (asset.metadata.family === "image" || asset.metadata.family === "gif") {
    if (expected.width !== undefined) {
      expect(asset.metadata.width).toBe(expected.width);
    }
    if (expected.height !== undefined) {
      expect(asset.metadata.height).toBe(expected.height);
    }
  }

  if (asset.metadata.family === "video") {
    if (expected.width !== undefined) {
      expect(asset.metadata.width).toBe(expected.width);
    }
    if (expected.height !== undefined) {
      expect(asset.metadata.height).toBe(expected.height);
    }
    if (expected.durationSecondsMin !== undefined) {
      expect(asset.metadata.durationSeconds ?? 0).toBeGreaterThanOrEqual(
        expected.durationSecondsMin
      );
    }
    if (expected.codec !== undefined) {
      expect(asset.metadata.codec).toBe(expected.codec);
    }
    if (expected.containerIncludes !== undefined) {
      expect(asset.metadata.container ?? "").toContain(expected.containerIncludes);
    }
  }
}

describe("supported fixture manifest coverage", () => {
  it("covers every supported extension with a single-fixture entry", () => {
    const singleEntries = manifest.filter((entry) => entry.scenario === "single");
    const byFamily = new Map<string, Set<string>>();

    singleEntries.forEach((entry) => {
      const extension = entry.path.slice(entry.path.lastIndexOf(".")).toLowerCase();
      if (!byFamily.has(entry.family)) {
        byFamily.set(entry.family, new Set());
      }
      byFamily.get(entry.family)?.add(extension);
    });

    for (const [family, extensions] of Object.entries(supportedAssetExtensionsByFamily)) {
      const covered = byFamily.get(family) ?? new Set<string>();
      for (const extension of extensions) {
        expect(covered.has(extension)).toBe(true);
      }
    }
  });
});

describe("supported fixtures", () => {
  for (const entry of manifest) {
    const timeoutMs =
      entry.family === "video" || entry.scenario === "folder" ? 45000 : 5000;

    it(
      `${entry.id} loads and routes as declared`,
      async () => {
        const entryPaths = resolveEntryPaths(entry);
        const assets =
          entry.scenario === "folder"
          ? await collectFilesRecursive(entryPaths[0]).then((paths) =>
              Promise.all(paths.map((fixturePath) => readAssetRecord(fixturePath)))
            )
          : await Promise.all(entryPaths.map((fixturePath) => readAssetRecord(fixturePath)));

      const session = buildSessionRecord({
        title: entry.id,
        assets,
        entryPaths,
        hadFolderInput: entry.scenario === "folder",
        source: entry.scenario === "folder" ? "folders" : "files"
      });

      expect(session.surface).toBe(entry.expectedSurface);
      expect(selectedNames(session)).toEqual([...entry.expectedSelection].sort());

      for (const asset of metadataForSelectedAssets(session)) {
        expect(asset.family === "unsupported" ? "unsupported" : asset.family).toBeDefined();
      }

      const firstSelectedAsset = metadataForSelectedAssets(session)[0];
      if (firstSelectedAsset) {
        assertMetadata(firstSelectedAsset, entry.expectedMetadata);
      }
      },
      timeoutMs
    );
  }

  it("every manifest path exists", () => {
    manifest.forEach((entry) => {
      expect(existsSync(resolveFixturePath(entry.path))).toBe(true);
      entry.entryPaths.forEach((entryPath) => {
        expect(existsSync(resolveFixturePath(entryPath))).toBe(true);
      });
    });
  });
});
