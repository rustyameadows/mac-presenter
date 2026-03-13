import { createSessionId } from "./assets";
import type {
  AssetFamily,
  AssetRecord,
  CompareCapability,
  CompareLayout,
  IntakeRoute,
  SelectionEligibility,
  SessionRecord,
  SessionViewState
} from "./types";

export const defaultSessionViewState: SessionViewState = {
  layout: "single",
  background: "white",
  backgroundColor: "#ffffff",
  zoom: 1,
  fitMode: "fit",
  diffEnabled: false,
  syncPan: false,
  syncPlayback: true,
  metadataOpen: false,
  textDiffMode: "split",
  gridSort: "name",
  gridFilter: "all"
};

export function getCompareCapability(assets: AssetRecord[]): CompareCapability {
  if (assets.length === 0) {
    return {
      enabled: false,
      reason: "Select at least one asset.",
      family: "mixed",
      layouts: ["single"],
      canDiff: false,
      canReveal: false,
      canSyncPan: false,
      canSyncPlayback: false
    };
  }

  const supportedAssets = assets.filter((asset) => asset.supported);

  if (supportedAssets.length !== assets.length) {
    return {
      enabled: false,
      reason: "Unsupported assets cannot be compared.",
      family: "mixed",
      layouts: ["single"],
      canDiff: false,
      canReveal: false,
      canSyncPan: false,
      canSyncPlayback: false
    };
  }

  const families = new Set(assets.map((asset) => asset.family));
  if (families.size > 1) {
    return {
      enabled: false,
      reason: "Only same-family assets can be compared together.",
      family: "mixed",
      layouts: ["single"],
      canDiff: false,
      canReveal: false,
      canSyncPan: false,
      canSyncPlayback: false
    };
  }

  const family = assets[0]?.family ?? "unsupported";
  const count = assets.length;
  const baseLayouts: CompareLayout[] = count === 1 ? ["single"] : [];

  if (count === 2) {
    baseLayouts.push("side-by-side", "top-bottom");
  }

  if (count === 3) {
    baseLayouts.push("grid-3");
  }

  if (count === 4) {
    baseLayouts.push("grid-4");
  }

  if ((family === "image" || family === "gif") && count === 2) {
    baseLayouts.push("reveal-vertical", "reveal-horizontal", "diff");
  }

  if (family === "text" && count === 2) {
    baseLayouts.push("diff");
  }

  const enabled = count >= 1 && count <= 4;

  return {
    enabled,
    family,
    layouts: baseLayouts,
    canDiff: baseLayouts.includes("diff"),
    canReveal:
      baseLayouts.includes("reveal-vertical") ||
      baseLayouts.includes("reveal-horizontal"),
    canSyncPan: family === "image" || family === "gif",
    canSyncPlayback: family === "video" || family === "gif"
  };
}

export function routeIntake(
  assets: AssetRecord[],
  hadFolderInput: boolean
): IntakeRoute {
  if (assets.length === 0) {
    return {
      surface: "empty",
      layout: "single"
    };
  }

  if (hadFolderInput || assets.length > 4) {
    return {
      surface: "grid",
      layout: assets.length >= 4 ? "grid-4" : "grid-3",
      reason: hadFolderInput
        ? "Folder intake opens in the grid browser."
        : "Only up to four assets can be rendered at once."
    };
  }

  const capability = getCompareCapability(assets);
  if (!capability.enabled) {
    return {
      surface: "grid",
      layout: assets.length >= 4 ? "grid-4" : "grid-3",
      reason: capability.reason ?? "Selection needs refinement before compare."
    };
  }

  if (assets.length === 1) {
    return {
      surface: "single",
      layout: "single"
    };
  }

  if (assets.length === 2) {
    return {
      surface: "compare",
      layout: "side-by-side"
    };
  }

  return {
    surface: "compare",
    layout: assets.length === 3 ? "grid-3" : "grid-4"
  };
}

export function getSelectionEligibility(assets: AssetRecord[]): SelectionEligibility {
  const capability = getCompareCapability(assets);

  if (!capability.enabled) {
    return {
      enabled: false,
      reason: capability.reason,
      recommendedSurface: assets.length <= 1 ? "single" : "grid",
      recommendedLayout: assets.length === 4 ? "grid-4" : "grid-3",
      capability
    };
  }

  const route = routeIntake(assets, false);
  return {
    enabled: true,
    recommendedSurface: route.surface,
    recommendedLayout: route.layout,
    capability
  };
}

export function buildSessionRecord(input: {
  title: string;
  assets: AssetRecord[];
  entryPaths: string[];
  hadFolderInput: boolean;
  source: SessionRecord["source"];
}): SessionRecord {
  const route = routeIntake(input.assets, input.hadFolderInput);
  const now = new Date().toISOString();

  return {
    id: createSessionId(input.entryPaths),
    title: input.title,
    createdAt: now,
    updatedAt: now,
    source: input.source,
    entryPaths: input.entryPaths,
    hadFolderInput: input.hadFolderInput,
    assets: input.assets,
    selectedAssetIds:
      route.surface === "grid" ? [] : input.assets.map((asset) => asset.id),
    surface: route.surface,
    view: {
      ...defaultSessionViewState,
      layout: route.layout
    }
  };
}

export function deriveSelectionSession(
  session: SessionRecord,
  selectedAssetIds: string[]
): SessionRecord {
  const selectedAssets = session.assets.filter((asset) =>
    selectedAssetIds.includes(asset.id)
  );
  const eligibility = getSelectionEligibility(selectedAssets);
  const now = new Date().toISOString();

  return {
    ...session,
    updatedAt: now,
    selectedAssetIds,
    surface: eligibility.recommendedSurface,
    view: {
      ...session.view,
      layout: eligibility.recommendedLayout,
      diffEnabled:
        eligibility.recommendedLayout === "diff" && eligibility.capability.canDiff
    }
  };
}

export function deriveCurrentFamily(assets: AssetRecord[]): AssetFamily | "mixed" {
  if (assets.length === 0) {
    return "mixed";
  }

  const families = new Set(assets.map((asset) => asset.family));
  return families.size === 1 ? assets[0].family : "mixed";
}
