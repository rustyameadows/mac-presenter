import type { AssetRecord } from "@presenter/core";

function MetadataRows({ asset }: { asset: AssetRecord }) {
  return (
    <dl className="metadata-list">
      <div>
        <dt>Name</dt>
        <dd>{asset.name}</dd>
      </div>
      <div>
        <dt>Path</dt>
        <dd>{asset.path}</dd>
      </div>
      <div>
        <dt>Type</dt>
        <dd>{asset.metadata.fileTypeLabel}</dd>
      </div>
      <div>
        <dt>Size</dt>
        <dd>{asset.metadata.sizeBytes.toLocaleString()} bytes</dd>
      </div>
      <div>
        <dt>Created</dt>
        <dd>{new Date(asset.metadata.createdAt).toLocaleString()}</dd>
      </div>
      <div>
        <dt>Modified</dt>
        <dd>{new Date(asset.metadata.modifiedAt).toLocaleString()}</dd>
      </div>

      {asset.metadata.family === "text" ? (
        <>
          <div>
            <dt>Lines</dt>
            <dd>{asset.metadata.lineCount}</dd>
          </div>
          <div>
            <dt>Words</dt>
            <dd>{asset.metadata.wordCount}</dd>
          </div>
          <div>
            <dt>Encoding</dt>
            <dd>{asset.metadata.encoding ?? "Unknown"}</dd>
          </div>
        </>
      ) : null}

      {asset.metadata.family === "image" || asset.metadata.family === "gif" ? (
        <>
          <div>
            <dt>Dimensions</dt>
            <dd>
              {asset.metadata.width ?? "?"}×{asset.metadata.height ?? "?"}
            </dd>
          </div>
          <div>
            <dt>Aspect</dt>
            <dd>{asset.metadata.aspectRatio ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>{asset.metadata.format ?? "Unknown"}</dd>
          </div>
        </>
      ) : null}

      {asset.metadata.family === "video" ? (
        <>
          <div>
            <dt>Dimensions</dt>
            <dd>
              {asset.metadata.width ?? "?"}×{asset.metadata.height ?? "?"}
            </dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>
              {asset.metadata.durationSeconds
                ? `${asset.metadata.durationSeconds.toFixed(2)}s`
                : "Unknown"}
            </dd>
          </div>
          <div>
            <dt>Frame Rate</dt>
            <dd>{asset.metadata.frameRate ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Codec</dt>
            <dd>{asset.metadata.codec ?? "Unknown"}</dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}

export function MetadataPanel(props: { assets: AssetRecord[] }) {
  return (
    <aside className="metadata-panel" data-testid="metadata-panel">
      <div className="section-title">Metadata</div>
      {props.assets.map((asset) => (
        <section key={asset.id} className="metadata-card" data-testid="metadata-card">
          <div className="metadata-card-title">{asset.name}</div>
          <MetadataRows asset={asset} />
        </section>
      ))}
    </aside>
  );
}
