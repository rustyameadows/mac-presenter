import {
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
      <div className="empty-hero">
        <span className="eyebrow">Presenter</span>
        <h1>Drop files or folders onto the menu bar icon.</h1>
        <p>
          The main workflow starts from anywhere on your Mac. Use these fallbacks
          when you want to pick files manually.
        </p>
        <div className="empty-actions">
          <button type="button" className="button button-primary" onClick={() => void props.onOpenFiles()}>
            Open Files
          </button>
          <button type="button" className="button" onClick={() => void props.onOpenFolder()}>
            Open Folder
          </button>
        </div>
      </div>

      <div className="recent-stack">
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
      </div>
    </div>
  );
}

export function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<Record<string, string>>({});
  const [playbackCommand, setPlaybackCommand] = useState<PlaybackCommand | null>(null);

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
  const capability = getCompareCapability(selectedAssets);
  const family = deriveCurrentFamily(selectedAssets);

  if (!bootstrap) {
    return <div className="loading-shell" data-testid="surface-loading">Loading Presenter…</div>;
  }

  if (!session) {
    return (
      <EmptyState
        recentTitles={bootstrap.recentSessions.map((item) => item.title)}
        onOpenFiles={() => window.presenter.openFilesDialog().then(applyResponse)}
        onOpenFolder={() => window.presenter.openFolderDialog().then(applyResponse)}
      />
    );
  }

  return (
    <div className="app-shell" data-testid={`surface-${session.surface}`}>
      <TopRail
        family={family}
        assetCount={selectedAssets.length}
        capability={capability}
        view={session.view}
        showBackToGrid={shouldShowBackToGrid(session)}
        notice={notice}
        onLayoutChange={(layout) => updateView({ layout })}
        onToggleDiff={() => {
          const nextLayout =
            session.view.layout === "diff"
              ? capability.layouts.find((layout) => layout !== "diff") ?? "side-by-side"
              : "diff";
          updateView({ layout: nextLayout, diffEnabled: nextLayout === "diff" });
        }}
        onBackgroundChange={(background, backgroundColor) => updateView({ background, backgroundColor })}
        onZoomChange={(zoom) => updateView({ zoom })}
        onFitModeChange={(fitMode) => updateView({ fitMode })}
        onMetadataToggle={() => updateView({ metadataOpen: !session.view.metadataOpen })}
        onTextDiffModeChange={(textDiffMode) => updateView({ textDiffMode })}
        onSyncPanChange={() => updateView({ syncPan: !session.view.syncPan })}
        onSyncPlaybackChange={() => updateView({ syncPlayback: !session.view.syncPlayback })}
        onBackToGrid={() => void window.presenter.backToGrid().then(applyResponse)}
        onOpenFiles={() => void window.presenter.openFilesDialog().then(applyResponse)}
        onOpenFolder={() => void window.presenter.openFolderDialog().then(applyResponse)}
        onPlaybackCommand={(command) => setPlaybackCommand(command)}
      />

      <div className="content-shell">
        {session.surface === "grid" ? (
          <GridBrowser
            session={session}
            onSelect={(assetIds) =>
              void window.presenter.setSelection(assetIds).then(applyResponse)
            }
            onViewChange={(patch) => updateView(patch)}
            onCompare={(assetIds) =>
              void window.presenter.openSelection(assetIds).then(applyResponse)
            }
            onOpenRecent={(id) =>
              void window.presenter.openRecentSession(id).then(applyResponse)
            }
            recentSessions={bootstrap.recentSessions}
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
            {session.view.metadataOpen ? (
              <MetadataPanel assets={selectedAssets} />
            ) : null}
          </div>
        )}
      </div>

      {session.surface === "grid" ? (
        <footer className="grid-footer">
          {(() => {
            const selection = session.assets.filter((asset) =>
              session.selectedAssetIds.includes(asset.id)
            );
            const eligibility = getSelectionEligibility(selection);
            return (
              <>
                <div>
                  {selection.length} selected
                  {eligibility.reason ? (
                    <span className="muted"> · {eligibility.reason}</span>
                  ) : null}
                </div>
                <div className="footer-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => void window.presenter.openFilesDialog().then(applyResponse)}
                  >
                    Add Files
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={!eligibility.enabled}
                    onClick={() =>
                      void window.presenter
                        .openSelection(session.selectedAssetIds)
                        .then(applyResponse)
                    }
                  >
                    Compare Selected
                  </button>
                </div>
              </>
            );
          })()}
        </footer>
      ) : null}
    </div>
  );
}
