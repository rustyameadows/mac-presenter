import type { SessionViewState } from "@presenter/core";
import type { CSSProperties } from "react";

export type PresentationTone = "light" | "dark";
type PresentationStyle = CSSProperties & Record<string, string | number>;

interface RGB {
  r: number;
  g: number;
  b: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(input: string): RGB {
  const hex = input.replace("#", "").trim();
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : hex.padEnd(6, "0").slice(0, 6);

  const numeric = Number.parseInt(normalized, 16);

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255
  };
}

function toRgbString(value: RGB, alpha = 1): string {
  return `rgba(${value.r}, ${value.g}, ${value.b}, ${alpha})`;
}

function mixChannel(left: number, right: number, weight: number): number {
  return Math.round(left * (1 - weight) + right * weight);
}

function mixColors(left: RGB, right: RGB, weight: number): RGB {
  return {
    r: mixChannel(left.r, right.r, weight),
    g: mixChannel(left.g, right.g, weight),
    b: mixChannel(left.b, right.b, weight)
  };
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: RGB): number {
  const r = channelToLinear(color.r);
  const g = channelToLinear(color.g);
  const b = channelToLinear(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getCanvasBaseColor(view: SessionViewState): string {
  if (view.background === "checker") {
    return "#f6f6f4";
  }

  if (view.background === "black") {
    return "#050505";
  }

  if (view.background === "white") {
    return "#ffffff";
  }

  return view.backgroundColor;
}

export function getPresentationTone(view: SessionViewState): PresentationTone {
  if (view.background === "checker") {
    return "light";
  }

  const luminance = relativeLuminance(hexToRgb(getCanvasBaseColor(view)));
  return luminance >= 0.58 ? "light" : "dark";
}

export function getPresentationStyle(view: SessionViewState): CSSProperties {
  const tone = getPresentationTone(view);
  const baseHex = getCanvasBaseColor(view);
  const baseRgb = hexToRgb(baseHex);
  const ink = tone === "light" ? hexToRgb("#111827") : hexToRgb("#f8fafc");
  const inverseInk = tone === "light" ? hexToRgb("#ffffff") : hexToRgb("#0b1020");
  const divider = tone === "light" ? toRgbString(ink, 0.18) : toRgbString(ink, 0.16);
  const dividerStrong = tone === "light" ? toRgbString(ink, 0.28) : toRgbString(ink, 0.26);
  const muted = tone === "light" ? toRgbString(ink, 0.58) : toRgbString(ink, 0.62);
  const faint = tone === "light" ? toRgbString(ink, 0.1) : toRgbString(ink, 0.08);
  const sheetRgb = tone === "light"
    ? mixColors(baseRgb, hexToRgb("#ffffff"), 0.35)
    : mixColors(baseRgb, hexToRgb("#020617"), 0.58);
  const regionRgb = tone === "light"
    ? mixColors(baseRgb, hexToRgb("#ffffff"), 0.08)
    : mixColors(baseRgb, hexToRgb("#020617"), 0.22);
  const controlBg = tone === "light"
    ? toRgbString(mixColors(baseRgb, hexToRgb("#ffffff"), 0.18), 0.78)
    : toRgbString(mixColors(baseRgb, hexToRgb("#020617"), 0.3), 0.68);
  const appStyle: PresentationStyle = {
    color: toRgbString(ink),
    backgroundColor: baseHex,
    "--canvas-solid": baseHex,
    "--canvas-ink": toRgbString(ink),
    "--canvas-ink-inverse": toRgbString(inverseInk),
    "--canvas-muted": muted,
    "--canvas-faint": faint,
    "--canvas-divider": divider,
    "--canvas-divider-strong": dividerStrong,
    "--canvas-region": toRgbString(regionRgb, tone === "light" ? 0.78 : 0.58),
    "--canvas-control-bg": controlBg,
    "--canvas-control-border": dividerStrong,
    "--canvas-control-hover":
      tone === "light" ? toRgbString(baseRgb, 0.96) : toRgbString(mixColors(baseRgb, ink, 0.08), 0.82),
    "--canvas-control-active-bg": toRgbString(ink),
    "--canvas-control-active-fg": toRgbString(inverseInk),
    "--canvas-overlay": toRgbString(sheetRgb, tone === "light" ? 0.94 : 0.92),
    "--canvas-shadow":
      tone === "light"
        ? "0 18px 48px rgba(15, 23, 42, 0.12)"
        : "0 18px 48px rgba(2, 6, 23, 0.42)"
  };

  if (view.background === "checker") {
    return {
      ...appStyle,
      backgroundColor: "#f6f6f4",
      backgroundImage:
        "linear-gradient(45deg, rgba(17,24,39,0.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(17,24,39,0.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(17,24,39,0.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(17,24,39,0.08) 75%)",
      backgroundSize: "18px 18px",
      backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0"
    };
  }

  return appStyle;
}

export function getDiffThemeType(view: SessionViewState): "light" | "dark" {
  return getPresentationTone(view);
}

export function getCodeViewerStyle(view: SessionViewState): CSSProperties {
  const tone = getPresentationTone(view);
  const background = getCanvasBaseColor(view);
  const ink = tone === "light" ? "#111827" : "#f8fafc";
  const divider = tone === "light" ? "rgba(17,24,39,0.18)" : "rgba(248,250,252,0.14)";
  const context = tone === "light" ? "rgba(17,24,39,0.04)" : "rgba(248,250,252,0.04)";

  return {
    fontSize: `${12 * view.zoom}px`,
    "--diffs-bg": background,
    "--diffs-light-bg": background,
    "--diffs-dark-bg": background,
    "--diffs-light": ink,
    "--diffs-dark": ink,
    "--diffs-bg-context-override": context,
    "--diffs-bg-buffer-override": context,
    "--diffs-bg-separator-override": divider,
    "--diffs-gap-inline": "10px",
    "--diffs-gap-block": "8px",
    "--diffs-gap-style": `2px solid ${divider}`,
    "--diffs-font-size": `${12 * view.zoom}px`,
    "--diffs-line-height": `${Math.max(18, Math.round(19 * view.zoom))}px`
  } as PresentationStyle;
}

export const codeViewerUnsafeCss = `
[data-diffs-header] {
  display: none !important;
}

[data-code] {
  overflow-x: hidden !important;
}

[data-line] {
  align-items: flex-start !important;
}

[data-column-content] {
  min-width: 0 !important;
  white-space: pre-wrap !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
}

[data-column-content] * {
  white-space: inherit !important;
}

[data-type='split'][data-overflow='scroll'] {
  gap: 1px !important;
  background: var(--diffs-bg-separator);
}

[data-type='split'][data-overflow='scroll'] > * {
  background: var(--diffs-bg);
}

[data-code] {
  scrollbar-width: thin;
}

[data-code]::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

[data-code]::-webkit-scrollbar-thumb {
  background-color: var(--diffs-bg-separator);
  border-radius: 999px;
}

[data-separator='metadata'],
[data-separator='line-info'] {
  display: none !important;
}
`;

export function getPaneTone(view: SessionViewState): PresentationTone {
  return getPresentationTone(view);
}

export function getInsetForSurface(view: SessionViewState): number {
  return clamp(view.zoom === 1 && view.fitMode === "fit" ? 10 : 6, 6, 10);
}
