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
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject
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

interface Size {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: value > 0 && value < 1 ? 2 : 0,
    maximumFractionDigits: 2
  }).format(value);
}

function getAssetSize(asset: AssetRecord): Size | null {
  if (asset.metadata.family === "image" || asset.metadata.family === "gif" || asset.metadata.family === "video") {
    if (asset.metadata.width && asset.metadata.height) {
      return {
        width: asset.metadata.width,
        height: asset.metadata.height
      };
    }
  }

  return null;
}

function getRenderedMediaSize(
  intrinsicSize: Size | null,
  viewportSize: Size,
  view: SessionViewState
): Size {
  if (!intrinsicSize) {
    return { width: 0, height: 0 };
  }

  if (
    view.fitMode === "actual" ||
    viewportSize.width === 0 ||
    viewportSize.height === 0
  ) {
    return {
      width: Math.max(1, Math.round(intrinsicSize.width * view.zoom)),
      height: Math.max(1, Math.round(intrinsicSize.height * view.zoom))
    };
  }

  const widthScale = viewportSize.width / intrinsicSize.width;
  const heightScale = viewportSize.height / intrinsicSize.height;
  const baseScale =
    view.fitMode === "fill"
      ? Math.max(widthScale, heightScale)
      : Math.min(widthScale, heightScale);

  return {
    width: Math.max(1, Math.round(intrinsicSize.width * baseScale * view.zoom)),
    height: Math.max(1, Math.round(intrinsicSize.height * baseScale * view.zoom))
  };
}

function useViewportSize(ref: RefObject<HTMLDivElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function useVisualViewportLayout(input: {
  intrinsicSize: Size | null;
  view: SessionViewState;
  resetKey: string;
  viewportRef: RefObject<HTMLDivElement | null>;
}) {
  const viewportSize = useViewportSize(input.viewportRef);
  const renderedSize = useMemo(
    () => getRenderedMediaSize(input.intrinsicSize, viewportSize, input.view),
    [input.intrinsicSize, input.view, viewportSize]
  );
  const shellSize = useMemo(
    () => ({
      width: Math.max(viewportSize.width, renderedSize.width),
      height: Math.max(viewportSize.height, renderedSize.height)
    }),
    [renderedSize.height, renderedSize.width, viewportSize.height, viewportSize.width]
  );
  const centered =
    viewportSize.width === 0 || viewportSize.height === 0
      ? input.view.zoom === 1 && input.view.fitMode === "fit"
      : renderedSize.width <= viewportSize.width &&
        renderedSize.height <= viewportSize.height;
  const previousRef = useRef<{
    resetKey: string;
    clientWidth: number;
    clientHeight: number;
    renderedWidth: number;
    renderedHeight: number;
  }>({
    resetKey: input.resetKey,
    clientWidth: 0,
    clientHeight: 0,
    renderedWidth: 0,
    renderedHeight: 0
  });

  useLayoutEffect(() => {
    const viewport = input.viewportRef.current;
    if (!viewport) {
      return;
    }

    const previous = previousRef.current;
    const shouldReset = previous.resetKey !== input.resetKey;

    if (shouldReset || centered) {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    } else if (previous.renderedWidth > 0 && previous.renderedHeight > 0) {
      const previousOffsetX =
        previous.renderedWidth < previous.clientWidth
          ? (previous.clientWidth - previous.renderedWidth) / 2
          : 0;
      const previousOffsetY =
        previous.renderedHeight < previous.clientHeight
          ? (previous.clientHeight - previous.renderedHeight) / 2
          : 0;
      const currentOffsetX =
        renderedSize.width < viewport.clientWidth
          ? (viewport.clientWidth - renderedSize.width) / 2
          : 0;
      const currentOffsetY =
        renderedSize.height < viewport.clientHeight
          ? (viewport.clientHeight - renderedSize.height) / 2
          : 0;
      const xRatio =
        previous.renderedWidth > 0
          ? clamp(
              (viewport.scrollLeft + previous.clientWidth / 2 - previousOffsetX) /
                previous.renderedWidth,
              0,
              1
            )
          : 0.5;
      const yRatio =
        previous.renderedHeight > 0
          ? clamp(
              (viewport.scrollTop + previous.clientHeight / 2 - previousOffsetY) /
                previous.renderedHeight,
              0,
              1
            )
          : 0.5;

      viewport.scrollLeft = clamp(
        currentOffsetX + renderedSize.width * xRatio - viewport.clientWidth / 2,
        0,
        Math.max(0, shellSize.width - viewport.clientWidth)
      );
      viewport.scrollTop = clamp(
        currentOffsetY + renderedSize.height * yRatio - viewport.clientHeight / 2,
        0,
        Math.max(0, shellSize.height - viewport.clientHeight)
      );
    }

    previousRef.current = {
      resetKey: input.resetKey,
      clientWidth: viewport.clientWidth,
      clientHeight: viewport.clientHeight,
      renderedWidth: renderedSize.width,
      renderedHeight: renderedSize.height
    };
  }, [
    centered,
    input.resetKey,
    input.viewportRef,
    renderedSize.height,
    renderedSize.width,
    shellSize.height,
    shellSize.width
  ]);

  return {
    centered,
    shellStyle: {
      width: shellSize.width,
      height: shellSize.height
    } satisfies CSSProperties,
    frameStyle: {
      width: renderedSize.width,
      height: renderedSize.height
    } satisfies CSSProperties
  };
}

function mediaFrameStyle(): CSSProperties {
  return {
    width: "100%",
    height: "100%"
  };
}

function ScrollableVisualViewport(props: {
  intrinsicSize: Size | null;
  view: SessionViewState;
  resetKey: string;
  viewportClassName?: string;
  setScrollRef: (element: HTMLDivElement | null) => void;
  children: (style: CSSProperties) => ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const setViewportRef = useCallback(
    (element: HTMLDivElement | null) => {
      viewportRef.current = element;
      props.setScrollRef(element);
    },
    [props.setScrollRef]
  );
  const { centered, frameStyle, shellStyle } = useVisualViewportLayout({
    intrinsicSize: props.intrinsicSize,
    view: props.view,
    resetKey: props.resetKey,
    viewportRef
  });

  return (
    <div
      className={`asset-viewport${props.viewportClassName ? ` ${props.viewportClassName}` : ""}`}
      data-testid="asset-viewport"
      ref={setViewportRef}
    >
      <div
        className={`media-shell ${centered ? "media-shell-centered" : "media-shell-origin"}`}
        data-testid="visual-media-shell"
        style={shellStyle}
      >
        <div className="media-frame" data-testid="visual-media-frame" style={frameStyle}>
          {props.children(mediaFrameStyle())}
        </div>
      </div>
    </div>
  );
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
  trailLabel?: ReactNode;
  note?: ReactNode;
  className?: string;
  dataTestId?: string;
}) {
  return (
    <div className={`stage-region${props.className ? ` ${props.className}` : ""}`} data-testid={props.dataTestId}>
      <OverlayRow
        lead={props.label ? <AssetLabel>{props.label}</AssetLabel> : undefined}
        trail={
          props.trailLabel ? (
            <AssetLabel>{props.trailLabel}</AssetLabel>
          ) : props.note ? (
            <span className="stage-note">{props.note}</span>
          ) : undefined
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
    mismatchPercent: number;
    normalized: boolean;
    size: Size;
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
          mismatchPercent: (mismatchCount / (plan.width * plan.height)) * 100,
          normalized: plan.normalized,
          size: {
            width: plan.width,
            height: plan.height
          }
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
          <span data-testid="diff-summary" className="diff-summary-note">
            {state ? (
              <>
                <span>{state.mismatchCount.toLocaleString()} changed pixels</span>
                <span className="diff-summary-subline">
                  {formatPercent(state.mismatchPercent)}% of pixels changed
                </span>
                {state.normalized ? (
                  <span className="diff-summary-subline">Normalized before diff</span>
                ) : null}
              </>
            ) : (
              "Rendering diff…"
            )}
          </span>
        }
        className="stage-region-diff stage-region-visual"
        dataTestId="diff-viewport"
      >
        <ScrollableVisualViewport
          intrinsicSize={state?.size ?? null}
          view={props.view}
          resetKey={`${props.left.id}:${props.right.id}:${props.view.layout}`}
          viewportClassName="diff-stage"
          setScrollRef={props.setScrollRef}
        >
          {(style) =>
            state ? (
              <img
                className="diff-image"
                data-testid="image-viewport"
                src={state.dataUrl}
                alt="Diff output"
                style={style}
              />
            ) : null
          }
        </ScrollableVisualViewport>
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
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const intrinsicSize = useMemo(() => {
    const leftSize = getAssetSize(props.left);
    const rightSize = getAssetSize(props.right);
    if (!leftSize && !rightSize) {
      return null;
    }

    return {
      width: Math.max(leftSize?.width ?? 0, rightSize?.width ?? 0),
      height: Math.max(leftSize?.height ?? 0, rightSize?.height ?? 0)
    };
  }, [props.left, props.right]);
  const clipStyle = props.vertical
    ? { clipPath: `inset(0 ${100 - reveal}% 0 0)` }
    : { clipPath: `inset(0 0 ${100 - reveal}% 0)` };
  const updateReveal = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const nextReveal = props.vertical
        ? ((clientX - rect.left) / rect.width) * 100
        : ((clientY - rect.top) / rect.height) * 100;
      setReveal(clamp(nextReveal, 0, 100));
    },
    [props.vertical]
  );
  const startRevealDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      updateReveal(event.clientX, event.clientY);

      const pointerId = event.pointerId;
      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }

        updateReveal(moveEvent.clientX, moveEvent.clientY);
      };

      const handleEnd = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== pointerId) {
          return;
        }

        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleEnd);
        window.removeEventListener("pointercancel", handleEnd);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleEnd);
      window.addEventListener("pointercancel", handleEnd);
    },
    [updateReveal]
  );
  const revealHandleStyle = props.vertical
    ? { left: `calc(${reveal}% - 8px)` }
    : { top: `calc(${reveal}% - 8px)` };

  return (
    <section className="stage-grid stage-grid-single" data-testid="compare-stage">
      <StageRegion
        label={props.left.name}
        trailLabel={props.right.name}
        className="stage-region-reveal stage-region-visual"
      >
        <ScrollableVisualViewport
          intrinsicSize={intrinsicSize}
          view={props.view}
          resetKey={`${props.left.id}:${props.right.id}:${props.view.layout}`}
          viewportClassName="reveal-stage-shell"
          setScrollRef={props.setScrollRef}
        >
          {() => (
            <div className="reveal-canvas" ref={canvasRef}>
              <div className="reveal-layer">
                <img
                  className="reveal-image"
                  data-testid="image-viewport"
                  src={window.presenter.getMediaUrl(props.right.path)}
                  alt={props.right.name}
                />
              </div>
              <div className="reveal-layer reveal-top" style={clipStyle}>
                <img
                  className="reveal-image"
                  data-testid="image-viewport"
                  src={window.presenter.getMediaUrl(props.left.path)}
                  alt={props.left.name}
                />
              </div>
              <button
                type="button"
                className={`reveal-handle${props.vertical ? "" : " reveal-handle-horizontal"}`}
                data-testid="reveal-handle"
                aria-label="Adjust Reveal Divider"
                onPointerDown={startRevealDrag}
                style={revealHandleStyle}
              >
                <span className="reveal-handle-line" aria-hidden="true" />
              </button>
            </div>
          )}
        </ScrollableVisualViewport>
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
  const intrinsicSize = getAssetSize(props.asset);

  return (
    <StageRegion
      label={props.asset.name}
      className="stage-region-visual"
      dataTestId="stage-region"
    >
      <ScrollableVisualViewport
        intrinsicSize={intrinsicSize}
        view={props.view}
        resetKey={`${props.asset.id}:${props.view.layout}`}
        setScrollRef={props.setScrollRef}
      >
        {(style) =>
          props.asset.family === "video" ? (
            <video
              ref={props.setVideoRef}
              className="asset-media"
              data-testid="video-viewport"
              src={mediaUrl}
              controls
              preload="metadata"
              style={style}
            />
          ) : (
            <img
              className="asset-media"
              data-testid={props.asset.family === "gif" ? "gif-viewport" : "image-viewport"}
              src={mediaUrl}
              alt={props.asset.name}
              style={style}
            />
          )
        }
      </ScrollableVisualViewport>
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
