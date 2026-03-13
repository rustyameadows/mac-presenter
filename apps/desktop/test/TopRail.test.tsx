import { getCompareCapability, type SessionViewState } from "@presenter/core";
import { fireEvent, render, screen } from "@testing-library/react";

import { TopRail } from "../src/renderer/components/TopRail";

const baseView: SessionViewState = {
  layout: "side-by-side",
  background: "white",
  backgroundColor: "#ffffff",
  zoom: 1,
  fitMode: "fit",
  diffEnabled: false,
  syncPan: false,
  syncPlayback: true,
  metadataOpen: true,
  textDiffMode: "split",
  gridSort: "name",
  gridFilter: "all"
};

describe("TopRail", () => {
  it("renders diff toggle for image pairs", () => {
    render(
      <TopRail
        surface="compare"
        family="image"
        assetCount={2}
        capability={getCompareCapability([
          {
            id: "one",
            name: "one.svg",
            path: "/one.svg",
            extension: ".svg",
            family: "image",
            supported: true,
            previewable: true,
            metadata: {
              filename: "one.svg",
              path: "/one.svg",
              extension: ".svg",
              fileTypeLabel: "SVG",
              sizeBytes: 1,
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
              family: "image",
              width: 100,
              height: 100,
              aspectRatio: 1,
              format: "svg"
            }
          },
          {
            id: "two",
            name: "two.svg",
            path: "/two.svg",
            extension: ".svg",
            family: "image",
            supported: true,
            previewable: true,
            metadata: {
              filename: "two.svg",
              path: "/two.svg",
              extension: ".svg",
              fileTypeLabel: "SVG",
              sizeBytes: 1,
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
              family: "image",
              width: 100,
              height: 100,
              aspectRatio: 1,
              format: "svg"
            }
          }
        ])}
        view={baseView}
        showBackToGrid={false}
        notice={null}
        hasGridVisibleAssets={false}
        hasGridVisibleSelection={false}
        canGridCompare={false}
        onLayoutChange={() => {}}
        onToggleDiff={() => {}}
        onBackgroundChange={() => {}}
        onZoomChange={() => {}}
        onFitModeChange={() => {}}
        onMetadataToggle={() => {}}
        onTextDiffModeChange={() => {}}
        onSyncPanChange={() => {}}
        onSyncPlaybackChange={() => {}}
        onGridSelectAll={() => {}}
        onGridDeselectAll={() => {}}
        onGridCompare={() => {}}
        onBackToGrid={() => {}}
        onOpenFiles={() => {}}
        onOpenFolder={() => {}}
        onPlaybackCommand={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Diff" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync Pan" })).toBeInTheDocument();
  });

  it("dispatches playback commands for videos", () => {
    const calls: string[] = [];
    render(
      <TopRail
        surface="compare"
        family="video"
        assetCount={2}
        capability={{
          enabled: true,
          family: "video",
          layouts: ["side-by-side", "top-bottom"],
          canDiff: false,
          canReveal: false,
          canSyncPan: false,
          canSyncPlayback: true
        }}
        view={baseView}
        showBackToGrid={false}
        notice={null}
        hasGridVisibleAssets={false}
        hasGridVisibleSelection={false}
        canGridCompare={false}
        onLayoutChange={() => {}}
        onToggleDiff={() => {}}
        onBackgroundChange={() => {}}
        onZoomChange={() => {}}
        onFitModeChange={() => {}}
        onMetadataToggle={() => {}}
        onTextDiffModeChange={() => {}}
        onSyncPanChange={() => {}}
        onSyncPlaybackChange={() => {}}
        onGridSelectAll={() => {}}
        onGridDeselectAll={() => {}}
        onGridCompare={() => {}}
        onBackToGrid={() => {}}
        onOpenFiles={() => {}}
        onOpenFolder={() => {}}
        onPlaybackCommand={(command) => calls.push(command.type)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Step Forward" }));
    expect(calls).toContain("step-forward");
  });

  it("surfaces grid selection actions in the fixed rail", () => {
    const calls: string[] = [];

    render(
      <TopRail
        surface="grid"
        family="mixed"
        assetCount={0}
        capability={{
          enabled: false,
          family: "mixed",
          layouts: ["grid-3"],
          canDiff: false,
          canReveal: false,
          canSyncPan: false,
          canSyncPlayback: false
        }}
        view={baseView}
        showBackToGrid={false}
        notice={null}
        hasGridVisibleAssets={true}
        hasGridVisibleSelection={true}
        canGridCompare={true}
        onLayoutChange={() => {}}
        onToggleDiff={() => {}}
        onBackgroundChange={() => {}}
        onZoomChange={() => {}}
        onFitModeChange={() => {}}
        onMetadataToggle={() => {}}
        onTextDiffModeChange={() => {}}
        onSyncPanChange={() => {}}
        onSyncPlaybackChange={() => {}}
        onGridSelectAll={() => calls.push("select")}
        onGridDeselectAll={() => calls.push("clear")}
        onGridCompare={() => calls.push("compare")}
        onBackToGrid={() => {}}
        onOpenFiles={() => {}}
        onOpenFolder={() => {}}
        onPlaybackCommand={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Select All Visible" }));
    fireEvent.click(screen.getByRole("button", { name: "Deselect Visible" }));
    fireEvent.click(screen.getByRole("button", { name: "Compare Visible Selection" }));

    expect(calls).toEqual(["select", "clear", "compare"]);
  });
});
