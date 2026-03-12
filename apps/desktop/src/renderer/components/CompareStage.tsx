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
  useRef,
  useState,
  type CSSProperties
} from "react";

import type { PlaybackCommand } from "./TopRail";

function resolveTextLanguage(filename: string): FileContents["lang"] {
  return getFiletypeFromFileName(filename) ?? ("text" as FileContents["lang"]);
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${url}`));
    image.src = url;
  });
}

function backgroundStyle(view: SessionViewState): CSSProperties {
  if (view.background === "checker") {
    return {
      backgroundImage:
        "linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%)",
      backgroundSize: "20px 20px",
      backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
      backgroundColor: "#151922"
    };
  }

  if (view.background === "black") {
    return { backgroundColor: "#050505" };
  }

  if (view.background === "white") {
    return { backgroundColor: "#ffffff" };
  }

  return { backgroundColor: view.backgroundColor };
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

function TextFilePane(props: {
  asset: AssetRecord;
  content: string;
  view: SessionViewState;
}) {
  const file: FileContents = {
    name: props.asset.name,
    contents: props.content,
    lang: resolveTextLanguage(props.asset.name)
  };

  return (
    <div className="asset-pane asset-pane-text" data-testid="text-viewport">
      <div className="asset-label">{props.asset.name}</div>
      <div data-testid="text-body">
        <File
          file={file}
          options={{
            themeType: "dark",
            overflow: "scroll",
            disableLineNumbers: false
          }}
          style={{
            fontSize: `${12 * props.view.zoom}px`
          }}
        />
      </div>
    </div>
  );
}

function TextDiffPane(props: {
  left: AssetRecord;
  right: AssetRecord;
  leftContent: string;
  rightContent: string;
  view: SessionViewState;
}) {
  const diff = parseDiffFromFile(
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
  );

  return (
    <div className="diff-shell" data-testid="diff-viewport">
      <div className="diff-summary" data-testid="diff-summary">
        Text/code diff · {props.view.textDiffMode === "split" ? "split" : "unified"} mode
      </div>
      <div data-testid="text-body">
        <FileDiff
          fileDiff={diff}
          options={{
            themeType: "dark",
            diffStyle: props.view.textDiffMode,
            lineDiffType: "word",
            overflow: "scroll"
          }}
        />
      </div>
    </div>
  );
}

function VisualDiffPane(props: { left: AssetRecord; right: AssetRecord }) {
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

  if (!state) {
    return <div className="diff-shell" data-testid="diff-viewport">Rendering diff…</div>;
  }

  return (
    <div className="diff-shell" data-testid="diff-viewport">
      <div className="diff-summary" data-testid="diff-summary">
        {state.mismatchCount.toLocaleString()} changed pixels
        {state.normalized ? " · normalized before diff" : ""}
      </div>
      <img className="diff-image" data-testid="image-viewport" src={state.dataUrl} alt="Diff output" />
    </div>
  );
}

function RevealPane(props: {
  left: AssetRecord;
  right: AssetRecord;
  view: SessionViewState;
  vertical: boolean;
}) {
  const [reveal, setReveal] = useState(50);
  const clipStyle = props.vertical
    ? { clipPath: `inset(0 ${100 - reveal}% 0 0)` }
    : { clipPath: `inset(0 0 ${100 - reveal}% 0)` };

  return (
    <div className="reveal-shell" data-testid="compare-stage">
      <div className="reveal-stage" style={backgroundStyle(props.view)} data-testid="asset-viewport">
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
      <div className="reveal-labels">
        <span>{props.left.name}</span>
        <span>{props.right.name}</span>
      </div>
    </div>
  );
}

function VisualPane(props: {
  asset: AssetRecord;
  view: SessionViewState;
  setVideoRef?: (element: HTMLVideoElement | null) => void;
  setScrollRef: (element: HTMLDivElement | null) => void;
}) {
  const baseStyle = mediaStyle(props.view);
  const mediaUrl = window.presenter.getMediaUrl(props.asset.path);

  return (
    <div className="asset-pane" data-testid="compare-stage">
      <div className="asset-label">{props.asset.name}</div>
      <div
        className="asset-viewport"
        data-testid="asset-viewport"
        style={backgroundStyle(props.view)}
        ref={props.setScrollRef}
      >
        {props.asset.family === "video" ? (
          <video
            ref={props.setVideoRef}
            className="asset-media"
            data-testid="video-viewport"
            src={mediaUrl}
            controls
            preload="metadata"
            style={baseStyle}
          />
        ) : (
          <img
            className="asset-media"
            data-testid={props.asset.family === "gif" ? "gif-viewport" : "image-viewport"}
            src={mediaUrl}
            alt={props.asset.name}
            style={baseStyle}
          />
        )}
      </div>
    </div>
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

    return <VisualDiffPane left={props.assets[0]} right={props.assets[1]} />;
  }

  if (props.sessionView.layout === "reveal-vertical" && props.assets.length === 2) {
    return (
      <RevealPane
        left={props.assets[0]}
        right={props.assets[1]}
        view={props.sessionView}
        vertical={true}
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
      />
    );
  }

  const stageClass =
    props.sessionView.layout === "top-bottom"
      ? "stage-grid stage-grid-top-bottom"
      : props.sessionView.layout === "grid-4"
        ? "stage-grid stage-grid-four"
        : props.sessionView.layout === "grid-3"
          ? "stage-grid stage-grid-three"
          : "stage-grid stage-grid-side";

  return (
    <section className={stageClass} data-testid="compare-stage">
      {props.assets.map((asset, index) => {
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
            setScrollRef={(element) => {
              stageRefs.current[asset.id] = element;
            }}
          />
        );
      })}
    </section>
  );
}
