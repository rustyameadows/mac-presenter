import type {
  AssetFamily,
  CompareCapability,
  CompareLayout,
  SessionViewState,
  TextDiffMode
} from "@presenter/core";

export interface PlaybackCommand {
  type: "step-backward" | "step-forward" | "play-pause";
  token: number;
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
  family: AssetFamily | "mixed";
  assetCount: number;
  capability: CompareCapability;
  view: SessionViewState;
  showBackToGrid: boolean;
  notice: string | null;
  onLayoutChange: (layout: CompareLayout) => void;
  onToggleDiff: () => void;
  onBackgroundChange: (background: SessionViewState["background"], backgroundColor: string) => void;
  onZoomChange: (zoom: SessionViewState["zoom"]) => void;
  onFitModeChange: (fitMode: SessionViewState["fitMode"]) => void;
  onMetadataToggle: () => void;
  onTextDiffModeChange: (mode: TextDiffMode) => void;
  onSyncPanChange: () => void;
  onSyncPlaybackChange: () => void;
  onBackToGrid: () => void;
  onOpenFiles: () => void;
  onOpenFolder: () => void;
  onPlaybackCommand: (command: PlaybackCommand) => void;
}) {
  return (
    <header className="top-rail" data-testid="top-rail">
      <div className="top-rail-main" data-testid="top-rail-main">
        <div className="rail-group">
          <button
            type="button"
            className={`button${props.view.background === "checker" ? " is-active" : ""}`}
            onClick={() => props.onBackgroundChange("checker", props.view.backgroundColor)}
          >
            Checker
          </button>
          <button
            type="button"
            className={`button${props.view.background === "black" ? " is-active" : ""}`}
            onClick={() => props.onBackgroundChange("black", "#050505")}
          >
            Black
          </button>
          <button
            type="button"
            className={`button${props.view.background === "white" ? " is-active" : ""}`}
            onClick={() => props.onBackgroundChange("white", "#ffffff")}
          >
            White
          </button>
          <label className="color-picker">
            <span>Custom</span>
            <input
              type="color"
              value={props.view.backgroundColor}
              onChange={(event) =>
                props.onBackgroundChange("custom", event.target.value)
              }
            />
          </label>
        </div>

        <div className="rail-group rail-center">
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
        </div>

        <div className="rail-group rail-wrap">
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
