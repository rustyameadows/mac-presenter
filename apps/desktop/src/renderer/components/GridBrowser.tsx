import {
  type AssetRecord,
  type RecentSessionSummary,
  type SessionRecord
} from "@presenter/core";
import { useEffect, useMemo } from "react";

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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true;
  }

  return target.isContentEditable;
}

export function GridBrowser(props: {
  session: SessionRecord;
  recentSessions: RecentSessionSummary[];
  onSelect: (assetIds: string[]) => void;
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
  const visibleAssetIds = useMemo(
    () => filteredAssets.map((asset) => asset.id),
    [filteredAssets]
  );

  const selectVisible = () => {
    props.onSelect([
      ...new Set([...props.session.selectedAssetIds, ...visibleAssetIds])
    ]);
  };

  const deselectVisible = () => {
    props.onSelect(
      props.session.selectedAssetIds.filter((id) => !visibleAssetIds.includes(id))
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key.toLowerCase() !== "a" ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        deselectVisible();
      } else {
        selectVisible();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deselectVisible, selectVisible]);

  return (
    <section className="grid-shell" data-testid="grid-browser">
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
