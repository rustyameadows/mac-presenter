import {
  getSelectionEligibility,
  type AssetRecord,
  type RecentSessionSummary,
  type SessionRecord
} from "@presenter/core";

function renderMetaSummary(asset: AssetRecord): string {
  if (asset.metadata.family === "text") {
    return `${asset.metadata.lineCount} lines · ${asset.metadata.wordCount} words`;
  }

  if (asset.metadata.family === "video") {
    return `${asset.metadata.width ?? "?"}×${asset.metadata.height ?? "?"} · ${
      asset.metadata.durationSeconds
        ? `${asset.metadata.durationSeconds.toFixed(1)}s`
        : "duration unknown"
    }`;
  }

  if (asset.metadata.family === "image" || asset.metadata.family === "gif") {
    return `${asset.metadata.width ?? "?"}×${asset.metadata.height ?? "?"}`;
  }

  return asset.metadata.fileTypeLabel;
}

function AssetPreview({ asset }: { asset: AssetRecord }) {
  if (asset.family === "image" || asset.family === "gif") {
    return (
      <img
        className="grid-preview-image"
        data-testid={asset.family === "gif" ? "gif-viewport" : "image-viewport"}
        src={window.presenter.getMediaUrl(asset.path)}
        alt={asset.name}
      />
    );
  }

  if (asset.family === "video") {
    return (
      <video
        className="grid-preview-image"
        data-testid="video-viewport"
        src={window.presenter.getMediaUrl(asset.path)}
        muted
        preload="metadata"
      />
    );
  }

  if (asset.family === "unsupported") {
    return (
      <div className="grid-preview-text" data-testid="unsupported-state">
        <span>Unsupported preview</span>
      </div>
    );
  }

  return (
    <div className="grid-preview-text" data-testid="text-grid-preview">
      <span>{asset.extension.replace(".", "").toUpperCase() || "TEXT"}</span>
    </div>
  );
}

export function GridBrowser(props: {
  session: SessionRecord;
  recentSessions: RecentSessionSummary[];
  onSelect: (assetIds: string[]) => void;
  onViewChange: (patch: Partial<SessionRecord["view"]>) => void;
  onCompare: (assetIds: string[]) => void;
  onOpenFiles: () => void;
  onOpenRecent: (id: string) => void;
}) {
  const filteredAssets = props.session.assets
    .filter((asset) =>
      props.session.view.gridFilter === "all"
        ? true
        : asset.family === props.session.view.gridFilter
    )
    .sort((left, right) => {
      switch (props.session.view.gridSort) {
        case "created":
          return left.metadata.createdAt.localeCompare(right.metadata.createdAt);
        case "modified":
          return left.metadata.modifiedAt.localeCompare(right.metadata.modifiedAt);
        case "size":
          return left.metadata.sizeBytes - right.metadata.sizeBytes;
        case "type":
          return left.family.localeCompare(right.family);
        default:
          return left.name.localeCompare(right.name);
      }
    });

  const selectedAssets = props.session.assets.filter((asset) =>
    props.session.selectedAssetIds.includes(asset.id)
  );
  const eligibility = getSelectionEligibility(selectedAssets);

  return (
    <section className="grid-shell" data-testid="grid-browser">
      <header className="grid-toolbar">
        <div className="grid-toolbar-copy">
          <div className="section-title">Asset Browser</div>
          <div className="muted">
            Recursive folder intake lands here first. Refine the set, then open
            compare.
          </div>
        </div>
        <div className="toolbar-controls">
          <select
            value={props.session.view.gridFilter}
            onChange={(event) =>
              props.onViewChange({
                gridFilter: event.target.value as SessionRecord["view"]["gridFilter"]
              })
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
            value={props.session.view.gridSort}
            onChange={(event) =>
              props.onViewChange({
                gridSort: event.target.value as SessionRecord["view"]["gridSort"]
              })
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
            className="button"
            onClick={props.onOpenFiles}
          >
            Add Files
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={!eligibility.enabled}
            onClick={() => props.onCompare(props.session.selectedAssetIds)}
          >
            Compare Selected
          </button>
        </div>
      </header>

      <div className="grid-status" data-testid="grid-status">
        {selectedAssets.length} selected
        {eligibility.reason ? (
          <span className="muted"> · {eligibility.reason}</span>
        ) : null}
      </div>

      <div className="grid-layout">
        {filteredAssets.map((asset) => {
          const selected = props.session.selectedAssetIds.includes(asset.id);
          return (
            <button
              type="button"
              key={asset.id}
              className={`asset-tile${selected ? " asset-tile-selected" : ""}`}
              data-testid="asset-card"
              onClick={() => {
                const next = selected
                  ? props.session.selectedAssetIds.filter((id) => id !== asset.id)
                  : [...props.session.selectedAssetIds, asset.id];
                props.onSelect(next);
              }}
            >
              <div className="asset-preview">
                <AssetPreview asset={asset} />
              </div>
              <div className="asset-copy">
                <div className="asset-name">{asset.name}</div>
                <div className="asset-meta">
                  <span className={`family-badge family-${asset.family}`}>
                    {asset.family}
                  </span>
                  <span>{renderMetaSummary(asset)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <section className="grid-recents">
        <div className="section-title">Recent sessions</div>
        {props.recentSessions.length === 0 ? (
          <div className="muted">No recents yet.</div>
        ) : (
          props.recentSessions.map((recent) => (
            <button
              key={recent.id}
              type="button"
              className="recent-item"
              onClick={() => props.onOpenRecent(recent.id)}
            >
              <span>{recent.title}</span>
              <span className="muted">{recent.assetCount} assets</span>
            </button>
          ))
        )}
      </section>
    </section>
  );
}
