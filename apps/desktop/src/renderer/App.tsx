import {
  defaultSessionViewState,
  deriveCurrentFamily,
  getCompareCapability,
  getSelectionEligibility,
  type AssetLoadWarning,
  type AssetRecord,
  type SessionRecord,
  type SessionViewState
} from "@presenter/core";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState
} from "react";

import type { BootstrapPayload, SessionResponse } from "../common/contracts";
import { CompareStage } from "./components/CompareStage";
import { GridBrowser } from "./components/GridBrowser";
import { MetadataPanel } from "./components/MetadataPanel";
import { TopRail, type PlaybackCommand } from "./components/TopRail";
import {
  getPresentationStyle,
  getPresentationTone
} from "./presentation";

function buildNotice(error: string | undefined, warnings: AssetLoadWarning[]): string | null {
  if (error && warnings.length > 0) {
    return `${error} ${warnings.length} file${warnings.length === 1 ? "" : "s"} also reported warnings.`;
  }

  if (error) {
    return error;
  }

  if (warnings.length > 0) {
    const first = warnings[0];
    const filename = first.path.split(/[/\\]/).at(-1) ?? first.path;
    return warnings.length === 1
      ? `${filename} could not be fully loaded.`
      : `${warnings.length} files reported load warnings.`;
  }

  return null;
}

function getSelectedAssets(session: SessionRecord | null): AssetRecord[] {
  if (!session) {
    return [];
  }

  const selectedAssets = session.assets.filter((asset) =>
    session.selectedAssetIds.includes(asset.id)
  );
  if (selectedAssets.length > 0) {
    return selectedAssets;
  }

  return session.assets.slice(0, 1);
}

function shouldShowBackToGrid(session: SessionRecord | null): boolean {
  if (!session || session.surface === "grid") {
    return false;
  }

  return session.hadFolderInput || session.assets.length > getSelectedAssets(session).length;
}

function applyViewPatch(
  session: SessionRecord,
  patch: Partial<SessionViewState>
): SessionRecord {
  const layout = patch.layout ?? session.view.layout;

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    view: {
      ...session.view,
      ...patch,
      layout,
      diffEnabled: layout === "diff"
    }
  };
}

function EmptyState(props: {
  recentTitles: string[];
  onOpenFiles: () => Promise<void>;
  onOpenFolder: () => Promise<void>;
}) {
  return (
    <div className="empty-shell" data-testid="surface-empty">
      <section className="empty-section">
        <span className="eyebrow">Presenter</span>
        <h1>Drop files or folders onto the menu bar icon.</h1>
        <p>
          The main workflow starts from anywhere on your Mac. These fallbacks stay
          here when you want to pick files manually.
        </p>
        <div className="empty-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => void props.onOpenFiles()}
          >
            Open Files
          </button>
          <button type="button" className="button" onClick={() => void props.onOpenFolder()}>
            Open Folder
          </button>
        </div>
      </section>

      <section className="empty-section empty-recents">
        <div className="section-title">Recent sessions</div>
        {props.recentTitles.length > 0 ? (
          props.recentTitles.map((title) => (
            <div key={title} className="recent-pill">
              {title}
            </div>
          ))
        ) : (
          <div className="muted">No recent sessions yet.</div>
        )}
      </section>
    </div>
  );
}

export function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<Record<string, string>>({});
  const [playbackCommand, setPlaybackCommand] = useState<PlaybackCommand | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const applyResponse = useEffectEvent((response: SessionResponse) => {
    startTransition(() => {
      setSession(response.session);
      setBootstrap((current) => ({
        currentSession: response.session,
        recentSessions: response.recentSessions
      }));
      setNotice(buildNotice(response.error, response.warnings));
    });
  });

  const updateView = useEffectEvent((patch: Partial<SessionViewState>) => {
    setSession((current) => (current ? applyViewPatch(current, patch) : current));
    void window.presenter.updateView(patch).then(applyResponse);
  });

  useEffect(() => {
    let mounted = true;
    void window.presenter.getBootstrap().then((payload) => {
      if (!mounted) {
        return;
      }

      setBootstrap(payload);
      setSession(payload.currentSession);
    });

    return window.presenter.onSessionChanged((payload) => {
      applyResponse(payload);
    });
  }, [applyResponse]);

  useEffect(() => {
    const activeSession = session;
    if (!activeSession) {
      return;
    }

    const activeAssets = getSelectedAssets(activeSession).filter(
      (asset) => asset.family === "text"
    );

    void Promise.all(
      activeAssets
        .filter((asset) => textContent[asset.path] === undefined)
        .map(async (asset) => {
          const payload = await window.presenter.readTextAsset(asset.path);
          return payload;
        })
    ).then((payloads) => {
      if (payloads.length === 0) {
        return;
      }

      setTextContent((current) => {
        const next = { ...current };
        for (const payload of payloads) {
          next[payload.path] = payload.content;
        }
        return next;
      });
    });
  }, [session, textContent]);

  const selectedAssets = getSelectedAssets(session);
  const gridVisibleAssetIds =
    session?.surface === "grid"
      ? session.assets
          .filter((asset) =>
            session.view.gridFilter === "all"
              ? true
              : asset.family === session.view.gridFilter
          )
          .map((asset) => asset.id)
      : [];
  const gridSelectedAssets =
    session?.surface === "grid"
      ? session.assets.filter((asset) => session.selectedAssetIds.includes(asset.id))
      : [];
  const gridVisibleSelectionCount =
    session?.surface === "grid"
      ? gridVisibleAssetIds.filter((id) => session.selectedAssetIds.includes(id)).length
      : 0;
  const gridEligibility = getSelectionEligibility(gridSelectedAssets);
  const capability = getCompareCapability(selectedAssets);
  const family = deriveCurrentFamily(selectedAssets);
  const activeView = session?.view ?? defaultSessionViewState;
  const presentationStyle = getPresentationStyle(activeView);
  const tone = getPresentationTone(activeView);
  const platform =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/i.test(`${navigator.platform} ${navigator.userAgent}`)
      ? "mac"
      : "other";

  if (!bootstrap) {
    return <div className="loading-shell" data-testid="surface-loading">Loading Presenter…</div>;
  }

  return (
    <div
      className="app-shell"
      data-testid={`surface-${session?.surface ?? "empty"}`}
      data-platform={platform}
      data-tone={tone}
      style={presentationStyle}
    >
      <TopRail
        surface={session?.surface ?? "empty"}
        family={family}
        assetCount={selectedAssets.length}
        capability={capability}
        view={activeView}
        showBackToGrid={shouldShowBackToGrid(session)}
        notice={notice}
        gridFilter={activeView.gridFilter}
        gridSort={activeView.gridSort}
        gridSelectedCount={session?.surface === "grid" ? session.selectedAssetIds.length : 0}
        hasGridVisibleAssets={gridVisibleAssetIds.length > 0}
        hasGridVisibleSelection={gridVisibleSelectionCount > 0}
        canGridCompare={session?.surface === "grid" ? gridEligibility.enabled : false}
        onLayoutChange={(layout) => updateView({ layout })}
        onToggleDiff={() => {
          if (!session) {
            return;
          }

          const nextLayout =
            session.view.layout === "diff"
              ? capability.layouts.find((layout) => layout !== "diff") ?? "side-by-side"
              : "diff";
          updateView({ layout: nextLayout, diffEnabled: nextLayout === "diff" });
        }}
        onBackgroundChange={(background, backgroundColor) => updateView({ background, backgroundColor })}
        onZoomChange={(zoom) => updateView({ zoom })}
        onFitModeChange={(fitMode) => updateView({ fitMode })}
        onMetadataToggle={() =>
          session ? updateView({ metadataOpen: !session.view.metadataOpen }) : undefined
        }
        onTextDiffModeChange={(textDiffMode) => updateView({ textDiffMode })}
        onSyncPanChange={() =>
          session ? updateView({ syncPan: !session.view.syncPan }) : undefined
        }
        onSyncPlaybackChange={() =>
          session ? updateView({ syncPlayback: !session.view.syncPlayback }) : undefined
        }
        onGridFilterChange={(gridFilter) => updateView({ gridFilter })}
        onGridSortChange={(gridSort) => updateView({ gridSort })}
        onGridSelectAll={() => {
          if (!session || session.surface !== "grid") {
            return;
          }

          void window.presenter
            .setSelection([
              ...new Set([...session.selectedAssetIds, ...gridVisibleAssetIds])
            ])
            .then(applyResponse);
        }}
        onGridDeselectAll={() => {
          if (!session || session.surface !== "grid") {
            return;
          }

          void window.presenter
            .setSelection(
              session.selectedAssetIds.filter((id) => !gridVisibleAssetIds.includes(id))
            )
            .then(applyResponse);
        }}
        onGridCompare={() => {
          if (!session || session.surface !== "grid") {
            return;
          }

          void window.presenter.openSelection(session.selectedAssetIds).then(applyResponse);
        }}
        onBackToGrid={() => void window.presenter.backToGrid().then(applyResponse)}

        onDownloadPackage={() => {
          setDownloadBusy(true);
          void window.presenter.downloadPackage().then((response) => {
            if (response.error) {
              setNotice(response.error);
              return;
            }
            if (response.canceled) {
              return;
            }
            setNotice(response.outputPath ? `Share package saved to ${response.outputPath}.` : "Share package created.");
          }).finally(() => {
            setDownloadBusy(false);
          });
        }}
        downloadBusy={downloadBusy}
        onPlaybackCommand={(command) => setPlaybackCommand(command)}
      />

      <div className="content-shell">
        {!session ? (
          <EmptyState
            recentTitles={bootstrap.recentSessions.map((item) => item.title)}
            onOpenFiles={() => window.presenter.openFilesDialog().then(applyResponse)}
            onOpenFolder={() => window.presenter.openFolderDialog().then(applyResponse)}
          />
        ) : session.surface === "grid" ? (
          <GridBrowser
            session={session}
            onSelect={(assetIds) =>
              void window.presenter.setSelection(assetIds).then(applyResponse)
            }
          />
        ) : (
          <div className="workspace-shell" data-testid="workspace-shell">
            <CompareStage
              assets={selectedAssets}
              sessionView={session.view}
              capability={capability}
              textContent={textContent}
              playbackCommand={playbackCommand}
            />
          </div>
        )}

        {session && session.surface !== "grid" && session.view.metadataOpen ? (
          <MetadataPanel
            assets={selectedAssets}
            onDismiss={() => updateView({ metadataOpen: false })}
          />
        ) : null}
      </div>
    </div>
  );
}
