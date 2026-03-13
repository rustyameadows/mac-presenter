import type {
  AssetFamily,
  CompareCapability,
  CompareLayout,
  SessionSurface,
  SessionViewState,
  TextDiffMode
} from "@presenter/core";
import type { CSSProperties } from "react";

export interface PlaybackCommand {
  type: "step-backward" | "step-forward" | "play-pause";
  token: number;
}

function CompactLabel(props: { full: string; compact?: string }) {
  return (
    <>
      <span className="label-full">{props.full}</span>
      <span className="label-compact">{props.compact ?? props.full}</span>
    </>
  );
}

function labelForLayout(layout: CompareLayout): string {
  switch (layout) {
    case "side-by-side":
      return "L/R";
    case "top-bottom":
      return "T/B";
    case "grid-3":
      return "3-Up";
    case "grid-4":
      return "4-Up";
    case "reveal-vertical":
      return "V-Rev";
    case "reveal-horizontal":
      return "H-Rev";
    case "diff":
      return "Diff";
    default:
      return "Single";
  }
}

function fullLabelForLayout(layout: CompareLayout): string {
  switch (layout) {
    case "side-by-side":
      return "Left / Right";
    case "top-bottom":
      return "Top / Bottom";
    case "grid-3":
      return "3-Up";
    case "grid-4":
      return "4-Up";
    case "reveal-vertical":
      return "Vertical Reveal";
    case "reveal-horizontal":
      return "Horizontal Reveal";
    case "diff":
      return "Diff";
    default:
      return "Single";
  }
}

export function TopRail(props: {
  surface: SessionSurface | "empty";
  family: AssetFamily | "mixed";
  assetCount: number;
  capability: CompareCapability;
  view: SessionViewState;
  showBackToGrid: boolean;
  notice: string | null;
  gridFilter: SessionViewState["gridFilter"];
  gridSort: SessionViewState["gridSort"];
  gridSelectedCount: number;
  hasGridVisibleAssets: boolean;
  hasGridVisibleSelection: boolean;
  canGridCompare: boolean;
  onLayoutChange: (layout: CompareLayout) => void;
  onToggleDiff: () => void;
  onBackgroundChange: (background: SessionViewState["background"], backgroundColor: string) => void;
  onZoomChange: (zoom: SessionViewState["zoom"]) => void;
  onFitModeChange: (fitMode: SessionViewState["fitMode"]) => void;
  onMetadataToggle: () => void;
  onTextDiffModeChange: (mode: TextDiffMode) => void;
  onSyncPanChange: () => void;
  onSyncPlaybackChange: () => void;
  onGridFilterChange: (filter: SessionViewState["gridFilter"]) => void;
  onGridSortChange: (sort: SessionViewState["gridSort"]) => void;
  onGridSelectAll: () => void;
  onGridDeselectAll: () => void;
  onGridCompare: () => void;
  onBackToGrid: () => void;
  onOpenFiles: () => void;
  onOpenFolder: () => void;
  onPlaybackCommand: (command: PlaybackCommand) => void;
}) {
  const showViewerControls =
    props.surface === "single" || props.surface === "compare";
  const showGridControls = props.surface === "grid";

  return (
    <header className="top-rail" data-testid="top-rail">
      <div className="top-rail-main" data-testid="top-rail-main">
        <div className="rail-group rail-start">
          <button
            type="button"
            className={`button${props.view.background === "checker" ? " is-active" : ""}`}
            onClick={() => props.onBackgroundChange("checker", props.view.backgroundColor)}
          >
            <CompactLabel full="Checker" compact="Chk" />
          </button>
          <button
            type="button"
            className={`button${props.view.background === "black" ? " is-active" : ""}`}
            onClick={() => props.onBackgroundChange("black", "#050505")}
          >
            <CompactLabel full="Black" compact="Blk" />
          </button>
          <button
            type="button"
            className={`button${props.view.background === "white" ? " is-active" : ""}`}
            onClick={() => props.onBackgroundChange("white", "#ffffff")}
          >
            <CompactLabel full="White" compact="Wht" />
          </button>
          <label
            className={`button color-picker-button${props.view.background === "custom" ? " is-active" : ""}`}
            style={{ "--color-picker-value": props.view.backgroundColor } as CSSProperties}
          >
            <CompactLabel full="Custom" compact="Cust" />
            <span className="color-picker-swatch" aria-hidden="true" />
            <input
              type="color"
              aria-label="Custom Background"
              value={props.view.backgroundColor}
              onChange={(event) =>
                props.onBackgroundChange("custom", event.target.value)
              }
            />
          </label>
        </div>

        <div className="rail-group rail-center">
          {showViewerControls ? (
            <>
            {[1, 2, 4, 10].map((zoom) => (
              <button
                key={zoom}
                type="button"
                className={`button${props.view.zoom === zoom ? " is-active" : ""}`}
                onClick={() => props.onZoomChange(zoom as SessionViewState["zoom"])}
              >
                {zoom}x
              </button>
            ))}
              {props.capability.layouts
                .filter((layout) => layout !== "diff")
                .map((layout) => {
                  const fullLabel = fullLabelForLayout(layout);

                  return (
                    <button
                      key={layout}
                      type="button"
                      aria-label={fullLabel}
                      title={fullLabel}
                      className={`button${props.view.layout === layout ? " is-active" : ""}`}
                      onClick={() => props.onLayoutChange(layout)}
                    >
                      {labelForLayout(layout)}
                    </button>
                  );
                })}

              {props.capability.canDiff ? (
                <button
                  type="button"
                  aria-label="Diff"
                  title="Diff"
                  className={`button${props.view.layout === "diff" ? " is-active" : ""}`}
                  onClick={props.onToggleDiff}
                >
                  Diff
                </button>
              ) : null}

              <button
                type="button"
                aria-label="Fit"
                title="Fit"
                className={`button${props.view.fitMode === "fit" ? " is-active" : ""}`}
                onClick={() => props.onFitModeChange("fit")}
              >
                Fit
              </button>
              <button
                type="button"
                aria-label="Fill"
                title="Fill"
                className={`button${props.view.fitMode === "fill" ? " is-active" : ""}`}
                onClick={() => props.onFitModeChange("fill")}
              >
                Fill
              </button>
              <button
                type="button"
                aria-label="Actual"
                title="Actual"
                className={`button${props.view.fitMode === "actual" ? " is-active" : ""}`}
                onClick={() => props.onFitModeChange("actual")}
              >
                1:1
              </button>

              {props.capability.canSyncPan ? (
                <button
                  type="button"
                  aria-label="Sync Pan"
                  title="Sync Pan"
                  className={`button${props.view.syncPan ? " is-active" : ""}`}
                  onClick={props.onSyncPanChange}
                >
                  Pan
                </button>
              ) : null}
              {props.family === "video" ? (
                <>
                  <button
                    type="button"
                    aria-label="Sync Playback"
                    title="Sync Playback"
                    className={`button${props.view.syncPlayback ? " is-active" : ""}`}
                    onClick={props.onSyncPlaybackChange}
                  >
                    Sync
                  </button>
                  <button
                    type="button"
                    aria-label="Step Backward"
                    title="Step Backward"
                    className="button"
                    onClick={() =>
                      props.onPlaybackCommand({
                        type: "step-backward",
                        token: Date.now()
                      })
                    }
                  >
                    -1f
                  </button>
                  <button
                    type="button"
                    aria-label="Play/Pause"
                    title="Play/Pause"
                    className="button"
                    onClick={() =>
                      props.onPlaybackCommand({
                        type: "play-pause",
                        token: Date.now()
                      })
                    }
                  >
                    Play
                  </button>
                  <button
                    type="button"
                    aria-label="Step Forward"
                    title="Step Forward"
                    className="button"
                    onClick={() =>
                      props.onPlaybackCommand({
                        type: "step-forward",
                        token: Date.now()
                      })
                    }
                  >
                    +1f
                  </button>
                </>
              ) : null}

              {props.family === "text" && props.view.layout === "diff" ? (
                <select
                  aria-label="Text Diff Mode"
                  className="rail-select"
                  value={props.view.textDiffMode}
                  onChange={(event) =>
                    props.onTextDiffModeChange(event.target.value as TextDiffMode)
                  }
                >
                  <option value="split">Split</option>
                  <option value="unified">Unified</option>
                </select>
              ) : null}

              <button
                type="button"
                aria-label={props.view.metadataOpen ? "Hide Metadata" : "Show Metadata"}
                title={props.view.metadataOpen ? "Hide Metadata" : "Show Metadata"}
                className="button"
                onClick={props.onMetadataToggle}
              >
                Meta
              </button>
            </>
          ) : null}

          {showGridControls ? (
            <>
              <select
                aria-label="Grid Filter"
                className="rail-select"
                value={props.gridFilter}
                onChange={(event) =>
                  props.onGridFilterChange(
                    event.target.value as SessionViewState["gridFilter"]
                  )
                }
              >
                <option value="all">All families</option>
                <option value="image">Images</option>
                <option value="gif">GIFs</option>
                <option value="video">Videos</option>
                <option value="text">Text</option>
                <option value="unsupported">Unsupported</option>
              </select>
              <select
                aria-label="Grid Sort"
                className="rail-select"
                value={props.gridSort}
                onChange={(event) =>
                  props.onGridSortChange(
                    event.target.value as SessionViewState["gridSort"]
                  )
                }
              >
                <option value="name">Sort by name</option>
                <option value="created">Created</option>
                <option value="modified">Modified</option>
                <option value="size">Size</option>
                <option value="type">Type</option>
              </select>
              <button
                type="button"
                aria-label="Select All Visible"
                title="Select All Visible"
                className="button"
                disabled={!props.hasGridVisibleAssets}
                onClick={props.onGridSelectAll}
              >
                Select All
              </button>
              <button
                type="button"
                aria-label="Clear Visible Selection"
                title="Clear Visible Selection"
                className="button"
                disabled={!props.hasGridVisibleSelection}
                onClick={props.onGridDeselectAll}
              >
                Clear
              </button>
              <button
                type="button"
                aria-label={`Compare ${props.gridSelectedCount}`}
                title={`Compare ${props.gridSelectedCount}`}
                className={`button${props.canGridCompare ? " button-primary" : ""}`}
                disabled={!props.canGridCompare}
                onClick={props.onGridCompare}
              >
                {`Compare ${props.gridSelectedCount}`}
              </button>
            </>
          ) : null}
        </div>

        <div className="rail-group rail-end">
          <button
            type="button"
            aria-label="Open Files"
            title="Open Files"
            className="button"
            onClick={props.onOpenFiles}
          >
            Files
          </button>
          <button
            type="button"
            aria-label="Open Folder"
            title="Open Folder"
            className="button"
            onClick={props.onOpenFolder}
          >
            Folder
          </button>
          {props.showBackToGrid ? (
            <button
              type="button"
              aria-label="Back to Grid"
              title="Back to Grid"
              className="button button-primary"
              onClick={props.onBackToGrid}
            >
              Grid
            </button>
          ) : null}
        </div>
      </div>

      {props.notice ? (
        <div className="notice-bar" data-testid="session-notice">
          {props.notice}
        </div>
      ) : null}
    </header>
  );
}
