import type { ImageNormalizationPlan } from "./types";

function buildBox(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const drawWidth = Math.round(sourceWidth * scale);
  const drawHeight = Math.round(sourceHeight * scale);

  return {
    sourceWidth,
    sourceHeight,
    drawWidth,
    drawHeight,
    offsetX: Math.floor((targetWidth - drawWidth) / 2),
    offsetY: Math.floor((targetHeight - drawHeight) / 2)
  };
}

export function createImageNormalizationPlan(input: {
  left: { width: number; height: number };
  right: { width: number; height: number };
}): ImageNormalizationPlan {
  const width = Math.max(input.left.width, input.right.width);
  const height = Math.max(input.left.height, input.right.height);

  return {
    width,
    height,
    normalized:
      input.left.width !== input.right.width ||
      input.left.height !== input.right.height,
    left: buildBox(input.left.width, input.left.height, width, height),
    right: buildBox(input.right.width, input.right.height, width, height)
  };
}
