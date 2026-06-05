import sharp from "sharp";

import type { WorkspaceComposerImageAspectRatio } from "@/lib/composer/image-generation-settings";

export type GeneratedImagePostprocessResult = {
  bytes: Uint8Array;
  height: number | null;
  mimeType: string;
  processed: boolean;
  width: number | null;
};

const ASPECT_RATIO_UNITS = {
  "1:1": { height: 1, width: 1 },
  "16:9": { height: 9, width: 16 },
  "9:16": { height: 16, width: 9 },
} as const satisfies Record<
  WorkspaceComposerImageAspectRatio,
  { height: number; width: number }
>;

const ASPECT_RATIO_TOLERANCE = 0.01;

export async function normalizeGeneratedPngForAspectRatio(input: {
  aspectRatio: WorkspaceComposerImageAspectRatio;
  bytes: Uint8Array;
  mimeType: string;
}): Promise<GeneratedImagePostprocessResult> {
  if (input.mimeType !== "image/png") {
    return {
      bytes: input.bytes,
      height: null,
      mimeType: input.mimeType,
      processed: false,
      width: null,
    };
  }

  const source = Buffer.from(input.bytes);

  try {
    const metadata = await sharp(source, { failOn: "none" }).metadata();
    const sourceWidth = metadata.width ?? null;
    const sourceHeight = metadata.height ?? null;

    if (!sourceWidth || !sourceHeight) {
      return {
        bytes: input.bytes,
        height: sourceHeight,
        mimeType: input.mimeType,
        processed: false,
        width: sourceWidth,
      };
    }

    const targetUnits = ASPECT_RATIO_UNITS[input.aspectRatio];
    const targetRatio = targetUnits.width / targetUnits.height;
    const currentRatio = sourceWidth / sourceHeight;

    if (Math.abs(currentRatio - targetRatio) <= ASPECT_RATIO_TOLERANCE) {
      return {
        bytes: input.bytes,
        height: sourceHeight,
        mimeType: input.mimeType,
        processed: false,
        width: sourceWidth,
      };
    }

    const targetSize = resolveLargestCenteredCropSize({
      sourceHeight,
      sourceWidth,
      targetRatio,
    });
    const normalized = await sharp(source, { failOn: "none" })
      .resize({
        fit: "cover",
        height: targetSize.height,
        position: "centre",
        width: targetSize.width,
      })
      .png()
      .toBuffer();

    return {
      bytes: Uint8Array.from(normalized),
      height: targetSize.height,
      mimeType: "image/png",
      processed: true,
      width: targetSize.width,
    };
  } catch {
    return {
      bytes: input.bytes,
      height: null,
      mimeType: input.mimeType,
      processed: false,
      width: null,
    };
  }
}

function resolveLargestCenteredCropSize(input: {
  sourceHeight: number;
  sourceWidth: number;
  targetRatio: number;
}) {
  let width = input.sourceWidth;
  let height = Math.round(width / input.targetRatio);

  if (height > input.sourceHeight) {
    height = input.sourceHeight;
    width = Math.round(height * input.targetRatio);
  }

  return {
    height: Math.max(1, height),
    width: Math.max(1, width),
  };
}
