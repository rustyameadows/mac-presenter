import {
  getFiletypeFromFileName,
  parseDiffFromFile,
  type FileContents
} from "@pierre/diffs";
import {
  File,
  FileDiff
} from "@pierre/diffs/react";
import type {
  AssetRecord,
  CompareCapability,
  SessionViewState
} from "@presenter/core";
import { createImageNormalizationPlan } from "@presenter/core";
import pixelmatch from "pixelmatch";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";

import {
  codeViewerUnsafeCss,
  getCodeViewerStyle,
  getDiffThemeType
} from "../presentation";
import type { PlaybackCommand } from "./TopRail";

function resolveTextLanguage(filename: string): FileContents["lang"] {
  return getFiletypeFromFileName(filename) ?? ("text" as FileContents["lang"]);
}

function mediaStyle(view: SessionViewState): CSSProperties {
  return {
    objectFit:
      view.fitMode === "fill"
        ? "cover"
        : view.fitMode === "actual"
          ? "none"
          : "contain",
    transform: `scale(${view.zoom})`,
    transformOrigin: "top left",
    maxWidth: view.fitMode === "actual" ? "none" : "100%",
    maxHeight: view.fitMode === "actual" ? "none" : "100%"
  };
}

function alignMediaToOrigin(view: SessionViewState): boolean {
  return view.zoom !== 1 || view.fitMode === "actual";
}

function mediaShellClassName(view: SessionViewState): string {
  return alignMediaToOrigin(view)
    ? "media-shell media-shell-origin"
    : "media-shell media-shell-centered";
}

function textViewerOptions(view: SessionViewState) {
  return {
    themeType: getDiffThemeType(view),
    overflow: "scroll" as const,
    disableLineNumbers: false,
    disableFileHeader: true,
    unsafeCSS: codeViewerUnsafeCss
  };
}

function textDiffOptions(view: SessionViewState) {
  return {
    themeType: getDiffThemeType(view),
    diffStyle: view.textDiffMode,
    diffIndicators: "bars" as const,
    lineDiffType: "word" as const,
    overflow: "scroll" as const,
    disableFileHeader: true,
    unsafeCSS: codeViewerUnsafeCss
  };
}

function OverlayRow(props: {
  lead?: ReactNode;
  trail?: ReactNode;
}) {
  if (!props.lead && !props.trail) {
    return null;
  }

  return (
    <div className="stage-overlay-row">
      <div className="stage-overlay-lead">{props.lead}</div>
      <div className="stage-overlay-trail">{props.trail}</div>
    </div>
  );
}

function AssetLabel(props: { children: ReactNode }) {
  return <span className="asset-label asset-label-overlay">{props.children}</span>;
}

function StageRegion(props: {
  children: ReactNode;
  label?: ReactNode;
  note?: ReactNode;
  className?: string;
  dataTestId?: string;
}) {
  return (
    <div className={`stage-region${props.className ? ` ${props.className}` : ""}`} data-testid={props.dataTestId}>
      <OverlayRow
        lead={props.label ? <AssetLabel>{props.label}</AssetLabel> : undefined}
        trail={
          props.note ? <span className="stage-note">{props.note}</span> : undefined
        }
      />
      {props.children}
    </div>
  );
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${url}`));
    image.src = url;
  });
}

function TextFilePane(props: {
  asset: AssetRecord;
  content: string;
  view: SessionViewState;
}) {
  const file = useMemo<FileContents>(
    () => ({
      name: props.asset.name,
      contents: props.content,
      lang: resolveTextLanguage(props.asset.name)
    }),
    [props.asset.name, props.content]
  );

  return (
    <StageRegion label={props.asset.name} className="stage-region-text" dataTestId="text-viewport">
      <div className="text-region-body" data-testid="text-body">
        <File
          className="code-viewer"
          file={file}
          options={textViewerOptions(props.view)}
          style={getCodeViewerStyle(props.view)}
        />
      </div>
    </StageRegion>
  );
}

function TextDiffPane(props: {
  left: AssetRecord;
  right: AssetRecord;
  leftContent: string;
  rightContent: string;
  view: SessionViewState;
}) {
  const diff = useMemo(
    () =>
      parseDiffFromFile(
        {
          name: props.left.name,
          contents: props.leftContent,
          lang: resolveTextLanguage(props.left.name)
        },
        {
          name: props.right.name,
          contents: props.rightContent,
          lang: resolveTextLanguage(props.right.name)
        }
      ),
    [props.left.name, props.leftContent, props.right.name, props.rightContent]
  );

  return (
    <section className="stage-grid stage-grid-single" data-testid="compare-stage">
      <StageRegion
        label={`${props.left.name} → ${props.right.name}`}
        note={
          <span data-testid="diff-summary">
            Text/code diff · {props.view.textDiffMode} mode
          </span>
        }
        className="stage-region-text stage-region-diff"
        dataTestId="diff-viewport"
      >
        <div className="text-region-body text-region-body-diff" data-testid="text-body">
          <FileDiff
            className="code-viewer code-viewer-diff"
            fileDiff={diff}
            options={textDiffOptions(props.view)}
            style={getCodeViewerStyle(props.view)}
          />
        </div>
      </StageRegion>
    </section>
  );
}

function VisualDiffPane(props: {
  left: AssetRecord;
  right: AssetRecord;
  view: SessionViewState;
  setScrollRef: (element: HTMLDivElement | null) => void;
}) {
  const [state, setState] = useState<{
    dataUrl: string;
    mismatchCount: number;
    normalized: boolean;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      loadImage(window.presenter.getMediaUrl(props.left.path)),
      loadImage(window.presenter.getMediaUrl(props.right.path))
    ]).then(([leftImage, rightImage]) => {
      const plan = createImageNormalizationPlan({
        left: { width: leftImage.naturalWidth, height: leftImage.naturalHeight },
        right: { width: rightImage.naturalWidth, height: rightImage.naturalHeight }
      });

      const leftCanvas = document.createElement("canvas");
      const rightCanvas = document.createElement("canvas");
      const diffCanvas = document.createElement("canvas");
      [leftCanvas, rightCanvas, diffCanvas].forEach((canvas) => {
        canvas.width = plan.width;
        canvas.height = plan.height;
      });

      const leftContext = leftCanvas.getContext("2d");
      const rightContext = rightCanvas.getContext("2d");
      const diffContext = diffCanvas.getContext("2d");
      if (!leftContext || !rightContext || !diffContext) {
        return;
      }

      leftContext.drawImage(
        leftImage,
        plan.left.offsetX,
        plan.left.offsetY,
        plan.left.drawWidth,
        plan.left.drawHeight
      );
      rightContext.drawImage(
        rightImage,
        plan.right.offsetX,
        plan.right.offsetY,
        plan.right.drawWidth,
        plan.right.drawHeight
      );

      const leftData = leftContext.getImageData(0, 0, plan.width, plan.height);
      const rightData = rightContext.getImageData(0, 0, plan.width, plan.height);
      const diffData = diffContext.createImageData(plan.width, plan.height);
      const mismatchCount = pixelmatch(
        leftData.data,
        rightData.data,
        diffData.data,
        plan.width,
        plan.height,
        {
          threshold: 0.15
        }
      );

      diffContext.putImageData(diffData, 0, 0);
      if (mounted) {
        setState({
          dataUrl: diffCanvas.toDataURL("image/png"),
          mismatchCount,
          normalized: plan.normalized
        });
      }
    });

    return () => {
      mounted = false;
    };
  }, [props.left.path, props.right.path]);

  return (
    <section className="stage-grid stage-grid-single" data-testid="compare-stage">
      <StageRegion
        label={`${props.left.name} → ${props.right.name}`}
        note={
          <span data-testid="diff-summary">
            {state
              ? `${state.mismatchCount.toLocaleString()} changed pixels${
                  state.normalized ? " · normalized before diff" : ""
                }`
              : "Rendering diff…"}
          </span>
        }
        className="stage-region-diff"
        dataTestId="diff-viewport"
      >
        <div
          className="asset-viewport diff-stage"
          data-testid="asset-viewport"
          ref={props.setScrollRef}
        >
          {state ? (
            <div
              className={mediaShellClassName(props.view)}
              data-testid="visual-media-shell"
            >
              <img
                className="diff-image"
                data-testid="image-viewport"
                src={state.dataUrl}
                alt="Diff output"
                style={mediaStyle(props.view)}
              />
            </div>
          ) : null}
        </div>
      </StageRegion>
    </section>
  );
}

function RevealPane(props: {
  left: AssetRecord;
  right: AssetRecord;
  view: SessionViewState;
  vertical: boolean;
  setScrollRef: (element: HTMLDivElement | null) => void;
}) {
  const [reveal, setReveal] = useState(50);
  const clipStyle = props.vertical
    ? { clipPath: `inset(0 ${100 - reveal}% 0 0)` }
    : { clipPath: `inset(0 0 ${100 - reveal}% 0)` };

  return (
    <section className="stage-grid stage-grid-single" data-testid="compare-stage">
      <StageRegion
        label={props.left.name}
        note={<span>{props.right.name}</span>}
        className="stage-region-reveal"
      >
        <div
          className="reveal-stage"
          data-testid="asset-viewport"
          ref={props.setScrollRef}
        >
          <img
            className="reveal-image"
            data-testid="image-viewport"
            src={window.presenter.getMediaUrl(props.right.path)}
            alt={props.right.name}
            style={mediaStyle(props.view)}
          />
          <img
            className="reveal-image reveal-top"
            data-testid="image-viewport"
            src={window.presenter.getMediaUrl(props.left.path)}
            alt={props.left.name}
            style={{ ...mediaStyle(props.view), ...clipStyle }}
          />
        </div>
        <input
          className="reveal-slider"
          type="range"
          min={0}
          max={100}
          value={reveal}
          onChange={(event) => setReveal(Number(event.target.value))}
        />
      </StageRegion>
    </section>
  );
}

function VisualPane(props: {
  asset: AssetRecord;
  view: SessionViewState;
  setVideoRef?: (element: HTMLVideoElement | null) => void;
  setScrollRef: (element: HTMLDivElement | null) => void;
}) {
  const mediaUrl = window.presenter.getMediaUrl(props.asset.path);

  return (
    <StageRegion label={props.asset.name} dataTestId="stage-region">
      <div
        className="asset-viewport"
        data-testid="asset-viewport"
        ref={props.setScrollRef}
      >
        <div className={mediaShellClassName(props.view)} data-testid="visual-media-shell">
          {props.asset.family === "video" ? (
            <video
              ref={props.setVideoRef}
              className="asset-media"
              data-testid="video-viewport"
              src={mediaUrl}
              controls
              preload="metadata"
              style={mediaStyle(props.view)}
            />
          ) : (
            <img
              className="asset-media"
              data-testid={props.asset.family === "gif" ? "gif-viewport" : "image-viewport"}
              src={mediaUrl}
              alt={props.asset.name}
              style={mediaStyle(props.view)}
            />
          )}
        </div>
      </div>
    </StageRegion>
  );
}

export function CompareStage(props: {
  assets: AssetRecord[];
  sessionView: SessionViewState;
  capability: CompareCapability;
  textContent: Record<string, string>;
  playbackCommand: PlaybackCommand | null;
}) {
  const syncingRef = useRef(false);
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const registerStageRef = (id: string) => (element: HTMLDivElement | null) => {
    stageRefs.current[id] = element;
  };

  useEffect(() => {
    Object.values(stageRefs.current).forEach((element) => {
      if (!element) {
        return;
      }

      element.scrollLeft = 0;
      element.scrollTop = 0;
    });
  }, [props.assets, props.sessionView.fitMode, props.sessionView.layout, props.sessionView.zoom]);

  useEffect(() => {
    if (!props.sessionView.syncPan) {
      return;
    }

    const elements = props.assets
      .map((asset) => stageRefs.current[asset.id])
      .filter((element): element is HTMLDivElement => Boolean(element));

    const cleanup = elements.map((element) => {
      const onScroll = () => {
        if (syncingRef.current) {
          return;
        }

        syncingRef.current = true;
        const xRatio =
          element.scrollWidth > element.clientWidth
            ? element.scrollLeft / (element.scrollWidth - element.clientWidth)
            : 0;
        const yRatio =
          element.scrollHeight > element.clientHeight
            ? element.scrollTop / (element.scrollHeight - element.clientHeight)
            : 0;

        elements.forEach((otherElement) => {
          if (otherElement !== element) {
            otherElement.scrollLeft =
              (otherElement.scrollWidth - otherElement.clientWidth) * xRatio;
            otherElement.scrollTop =
              (otherElement.scrollHeight - otherElement.clientHeight) * yRatio;
          }
        });
        requestAnimationFrame(() => {
          syncingRef.current = false;
        });
      };

      element.addEventListener("scroll", onScroll);
      return () => element.removeEventListener("scroll", onScroll);
    });

    return () => {
      cleanup.forEach((dispose) => dispose());
    };
  }, [props.assets, props.sessionView.syncPan]);

  useEffect(() => {
    if (!props.playbackCommand || props.assets[0]?.family !== "video") {
      return;
    }

    const firstVideo = videoRefs.current[props.assets[0].id];
    if (!firstVideo) {
      return;
    }

    const step = 1 / ((props.assets[0].metadata.family === "video" && props.assets[0].metadata.frameRate) || 30);

    props.assets.forEach((asset) => {
      const video = videoRefs.current[asset.id];
      if (!video) {
        return;
      }

      if (props.playbackCommand?.type === "step-backward") {
        video.currentTime = Math.max(0, video.currentTime - step);
      }

      if (props.playbackCommand?.type === "step-forward") {
        video.currentTime = Math.min(
          video.duration || video.currentTime + step,
          video.currentTime + step
        );
      }

      if (props.playbackCommand?.type === "play-pause") {
        if (firstVideo.paused) {
          void video.play();
        } else {
          video.pause();
        }
      }
    });
  }, [props.assets, props.playbackCommand]);

  useEffect(() => {
    if (!props.sessionView.syncPlayback || props.assets[0]?.family !== "video") {
      return;
    }

    const syncing = { current: false };
    const cleanup = props.assets.map((asset) => {
      const element = videoRefs.current[asset.id];
      if (!element) {
        return () => {};
      }

      const sync = (callback: (other: HTMLVideoElement) => void) => {
        if (syncing.current) {
          return;
        }
        syncing.current = true;
        props.assets.forEach((otherAsset) => {
          const otherVideo = videoRefs.current[otherAsset.id];
          if (otherVideo && otherVideo !== element) {
            callback(otherVideo);
          }
        });
        requestAnimationFrame(() => {
          syncing.current = false;
        });
      };

      const onPlay = () => sync((other) => void other.play());
      const onPause = () => sync((other) => other.pause());
      const onSeeked = () => sync((other) => {
        other.currentTime = element.currentTime;
      });

      element.addEventListener("play", onPlay);
      element.addEventListener("pause", onPause);
      element.addEventListener("seeked", onSeeked);

      return () => {
        element.removeEventListener("play", onPlay);
        element.removeEventListener("pause", onPause);
        element.removeEventListener("seeked", onSeeked);
      };
    });

    return () => cleanup.forEach((dispose) => dispose());
  }, [props.assets, props.sessionView.syncPlayback]);

  if (props.assets.length === 0) {
    return <div className="stage-shell" data-testid="compare-stage">Nothing selected.</div>;
  }

  if (props.sessionView.layout === "diff" && props.assets.length === 2) {
    if (props.assets[0].family === "text" && props.assets[1].family === "text") {
      return (
        <TextDiffPane
          left={props.assets[0]}
          right={props.assets[1]}
          leftContent={props.textContent[props.assets[0].path] ?? ""}
          rightContent={props.textContent[props.assets[1].path] ?? ""}
          view={props.sessionView}
        />
      );
    }

    return (
      <VisualDiffPane
        left={props.assets[0]}
        right={props.assets[1]}
        view={props.sessionView}
        setScrollRef={registerStageRef("visual-diff")}
      />
    );
  }

  if (props.sessionView.layout === "reveal-vertical" && props.assets.length === 2) {
    return (
      <RevealPane
        left={props.assets[0]}
        right={props.assets[1]}
        view={props.sessionView}
        vertical={true}
        setScrollRef={registerStageRef("reveal")}
      />
    );
  }

  if (props.sessionView.layout === "reveal-horizontal" && props.assets.length === 2) {
    return (
      <RevealPane
        left={props.assets[0]}
        right={props.assets[1]}
        view={props.sessionView}
        vertical={false}
        setScrollRef={registerStageRef("reveal")}
      />
    );
  }

  const stageClass =
    props.sessionView.layout === "single"
      ? "stage-grid stage-grid-single"
      : props.sessionView.layout === "top-bottom"
      ? "stage-grid stage-grid-top-bottom"
      : props.sessionView.layout === "grid-4"
        ? "stage-grid stage-grid-four"
        : props.sessionView.layout === "grid-3"
          ? "stage-grid stage-grid-three"
          : "stage-grid stage-grid-side";

  return (
    <section className={stageClass} data-testid="compare-stage">
      {props.assets.map((asset) => {
        if (asset.family === "text") {
          return (
            <TextFilePane
              key={asset.id}
              asset={asset}
              content={props.textContent[asset.path] ?? ""}
              view={props.sessionView}
            />
          );
        }

        return (
          <VisualPane
            key={asset.id}
            asset={asset}
            view={props.sessionView}
            setVideoRef={(element) => {
              videoRefs.current[asset.id] = element;
            }}
            setScrollRef={registerStageRef(asset.id)}
          />
        );
      })}
    </section>
  );
}
