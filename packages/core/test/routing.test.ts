import { describe, expect, it } from "vitest";

import { createImageNormalizationPlan } from "../src/diff";
import {
  defaultSessionViewState,
  getSelectionEligibility,
  routeIntake,
  updateRecentSessions
} from "../src/index";
import type { AssetRecord, SessionRecord } from "../src/types";

function asset(id: string, family: AssetRecord["family"]): AssetRecord {
  return {
    id,
    name: `${id}.${family}`,
    path: `/tmp/${id}.${family}`,
    extension: `.${family}`,
    family,
    supported: family !== "unsupported",
    previewable: family !== "unsupported",
    metadata: {
      filename: `${id}.${family}`,
      path: `/tmp/${id}.${family}`,
      extension: `.${family}`,
      fileTypeLabel: family.toUpperCase(),
      sizeBytes: 1,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      family: family === "video" ? "video" : family === "text" ? "text" : family === "unsupported" ? "unsupported" : family,
      ...(family === "text"
        ? { characterCount: 1, lineCount: 1, wordCount: 1, encoding: "utf-8" }
        : family === "video"
          ? {
              width: 100,
              height: 100,
              aspectRatio: 1,
              durationSeconds: 1,
              frameRate: 24,
              codec: "h264",
              container: "mov"
            }
          : family === "unsupported"
            ? {}
            : { width: 100, height: 100, aspectRatio: 1, format: family })
    } as AssetRecord["metadata"]
  };
}

describe("routeIntake", () => {
  it("starts sessions with metadata hidden", () => {
    expect(defaultSessionViewState.metadataOpen).toBe(false);
  });

  it("routes folders to grid", () => {
    const route = routeIntake([asset("one", "image")], true);
    expect(route.surface).toBe("grid");
  });

  it("routes pairs to compare", () => {
    const route = routeIntake([asset("one", "image"), asset("two", "image")], false);
    expect(route.surface).toBe("compare");
    expect(route.layout).toBe("side-by-side");
  });

  it("routes mixed assets to grid", () => {
    const route = routeIntake([asset("one", "image"), asset("two", "text")], false);
    expect(route.surface).toBe("grid");
  });
});

describe("selection eligibility", () => {
  it("enables diff for image pairs", () => {
    const eligibility = getSelectionEligibility([
      asset("one", "image"),
      asset("two", "image")
    ]);
    expect(eligibility.enabled).toBe(true);
    expect(eligibility.capability.canDiff).toBe(true);
  });

  it("disables mixed family compare", () => {
    const eligibility = getSelectionEligibility([
      asset("one", "gif"),
      asset("two", "video")
    ]);
    expect(eligibility.enabled).toBe(false);
  });
});

describe("recent sessions", () => {
  it("deduplicates and caps recents", () => {
    const base = {
      title: "Session",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "files",
      entryPaths: ["/tmp/one.png"],
      hadFolderInput: false,
      assets: [asset("one", "image")],
      selectedAssetIds: ["one"],
      surface: "single",
      view: {
        ...defaultSessionViewState,
        syncPlayback: false
      }
    } satisfies Omit<SessionRecord, "id">;

    const recents = updateRecentSessions(
      [],
      { ...base, id: "alpha" },
      1
    );
    expect(recents).toHaveLength(1);
    expect(updateRecentSessions(recents, { ...base, id: "beta" }, 1)[0]?.id).toBe("beta");
  });
});

describe("image normalization", () => {
  it("normalizes images into a shared canvas", () => {
    const plan = createImageNormalizationPlan({
      left: { width: 100, height: 100 },
      right: { width: 50, height: 100 }
    });

    expect(plan.normalized).toBe(true);
    expect(plan.width).toBe(100);
    expect(plan.right.drawWidth).toBe(50);
  });
});
