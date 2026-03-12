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
    <header className="top-rail">
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
          .map((layout) => (
            <button
              key={layout}
              type="button"
              className={`button${props.view.layout === layout ? " is-active" : ""}`}
              onClick={() => props.onLayoutChange(layout)}
            >
              {labelForLayout(layout)}
            </button>
          ))}

        {props.capability.canDiff ? (
          <button
            type="button"
            className={`button${props.view.layout === "diff" ? " is-active" : ""}`}
            onClick={props.onToggleDiff}
          >
            Diff
          </button>
        ) : null}

        <button
          type="button"
          className={`button${props.view.fitMode === "fit" ? " is-active" : ""}`}
          onClick={() => props.onFitModeChange("fit")}
        >
          Fit
        </button>
        <button
          type="button"
          className={`button${props.view.fitMode === "fill" ? " is-active" : ""}`}
          onClick={() => props.onFitModeChange("fill")}
        >
          Fill
        </button>
        <button
          type="button"
          className={`button${props.view.fitMode === "actual" ? " is-active" : ""}`}
          onClick={() => props.onFitModeChange("actual")}
        >
          Actual
        </button>

        {props.capability.canSyncPan ? (
          <button
            type="button"
            className={`button${props.view.syncPan ? " is-active" : ""}`}
            onClick={props.onSyncPanChange}
          >
            Sync Pan
          </button>
        ) : null}

        {props.family === "video" ? (
          <>
            <button
              type="button"
              className={`button${props.view.syncPlayback ? " is-active" : ""}`}
              onClick={props.onSyncPlaybackChange}
            >
              Sync Playback
            </button>
            <button
              type="button"
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
              className="button"
              onClick={() =>
                props.onPlaybackCommand({
                  type: "play-pause",
                  token: Date.now()
                })
              }
            >
              Play/Pause
            </button>
            <button
              type="button"
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
            className="rail-select"
            value={props.view.textDiffMode}
            onChange={(event) =>
              props.onTextDiffModeChange(event.target.value as TextDiffMode)
            }
          >
            <option value="split">Split Diff</option>
            <option value="unified">Unified Diff</option>
          </select>
        ) : null}

        <button type="button" className="button" onClick={props.onMetadataToggle}>
          {props.view.metadataOpen ? "Hide Metadata" : "Show Metadata"}
        </button>
        <button type="button" className="button" onClick={props.onOpenFiles}>
          Open Files
        </button>
        <button type="button" className="button" onClick={props.onOpenFolder}>
          Open Folder
        </button>
        {props.showBackToGrid ? (
          <button type="button" className="button button-primary" onClick={props.onBackToGrid}>
            Back to Grid
          </button>
        ) : null}
      </div>

      {props.notice ? <div className="notice-bar">{props.notice}</div> : null}
    </header>
  );
}
