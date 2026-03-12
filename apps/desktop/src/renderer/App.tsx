import {
  deriveCurrentFamily,
  getCompareCapability,
  getSelectionEligibility,
  type AssetRecord,
  type SessionRecord
} from "@presenter/core";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState
} from "react";

import type { BootstrapPayload, SessionResponse } from "../common/contracts";
import { CompareStage } from "./components/CompareStage";
import { GridBrowser } from "./components/GridBrowser";
import { MetadataPanel } from "./components/MetadataPanel";
import { TopRail, type PlaybackCommand } from "./components/TopRail";

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

function EmptyState(props: {
  recentTitles: string[];
  onOpenFiles: () => Promise<void>;
  onOpenFolder: () => Promise<void>;
}) {
  return (
    <div className="empty-shell">
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

  const deferredSession = useDeferredValue(session);

  const applyResponse = useEffectEvent((response: SessionResponse) => {
    startTransition(() => {
      setSession(response.session);
      setBootstrap((current) => ({
        currentSession: response.session,
        recentSessions: response.recentSessions
      }));
      setNotice(response.error ?? null);
    });
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
    const activeSession = deferredSession;
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
  }, [deferredSession, textContent]);

  const selectedAssets = getSelectedAssets(deferredSession);
  const capability = getCompareCapability(selectedAssets);
  const family = deriveCurrentFamily(selectedAssets);

  if (!bootstrap) {
    return <div className="loading-shell">Loading Presenter…</div>;
  }

  if (!deferredSession) {
    return (
      <EmptyState
        recentTitles={bootstrap.recentSessions.map((item) => item.title)}
        onOpenFiles={() => window.presenter.openFilesDialog().then(applyResponse)}
        onOpenFolder={() => window.presenter.openFolderDialog().then(applyResponse)}
      />
    );
  }

  return (
    <div className="app-shell">
      <TopRail
        family={family}
        assetCount={selectedAssets.length}
        capability={capability}
        view={deferredSession.view}
        showBackToGrid={shouldShowBackToGrid(deferredSession)}
        notice={notice}
        onLayoutChange={(layout) =>
          void window.presenter.updateView({ layout }).then(applyResponse)
        }
        onToggleDiff={() => {
          const nextLayout =
            deferredSession.view.layout === "diff"
              ? capability.layouts.find((layout) => layout !== "diff") ?? "side-by-side"
              : "diff";
          void window.presenter
            .updateView({ layout: nextLayout, diffEnabled: nextLayout === "diff" })
            .then(applyResponse);
        }}
        onBackgroundChange={(background, backgroundColor) =>
          void window.presenter
            .updateView({ background, backgroundColor })
            .then(applyResponse)
        }
        onZoomChange={(zoom) =>
          void window.presenter.updateView({ zoom }).then(applyResponse)
        }
        onFitModeChange={(fitMode) =>
          void window.presenter.updateView({ fitMode }).then(applyResponse)
        }
        onMetadataToggle={() =>
          void window.presenter
            .updateView({ metadataOpen: !deferredSession.view.metadataOpen })
            .then(applyResponse)
        }
        onTextDiffModeChange={(textDiffMode) =>
          void window.presenter.updateView({ textDiffMode }).then(applyResponse)
        }
        onSyncPanChange={() =>
          void window.presenter
            .updateView({ syncPan: !deferredSession.view.syncPan })
            .then(applyResponse)
        }
        onSyncPlaybackChange={() =>
          void window.presenter
            .updateView({ syncPlayback: !deferredSession.view.syncPlayback })
            .then(applyResponse)
        }
        onBackToGrid={() => void window.presenter.backToGrid().then(applyResponse)}
        onOpenFiles={() => void window.presenter.openFilesDialog().then(applyResponse)}
        onOpenFolder={() => void window.presenter.openFolderDialog().then(applyResponse)}
        onPlaybackCommand={(command) => setPlaybackCommand(command)}
      />

      <div className="content-shell">
        {deferredSession.surface === "grid" ? (
          <GridBrowser
            session={deferredSession}
            onSelect={(assetIds) =>
              void window.presenter.setSelection(assetIds).then(applyResponse)
            }
            onViewChange={(patch) =>
              void window.presenter.updateView(patch).then(applyResponse)
            }
            onCompare={(assetIds) =>
              void window.presenter.openSelection(assetIds).then(applyResponse)
            }
            onOpenRecent={(id) =>
              void window.presenter.openRecentSession(id).then(applyResponse)
            }
            recentSessions={bootstrap.recentSessions}
          />
        ) : (
          <div className="workspace-shell">
            <CompareStage
              assets={selectedAssets}
              sessionView={deferredSession.view}
              capability={capability}
              textContent={textContent}
              playbackCommand={playbackCommand}
            />
            {deferredSession.view.metadataOpen ? (
              <MetadataPanel assets={selectedAssets} />
            ) : null}
          </div>
        )}
      </div>

      {deferredSession.surface === "grid" ? (
        <footer className="grid-footer">
          {(() => {
            const selection = deferredSession.assets.filter((asset) =>
              deferredSession.selectedAssetIds.includes(asset.id)
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
                        .openSelection(deferredSession.selectedAssetIds)
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
