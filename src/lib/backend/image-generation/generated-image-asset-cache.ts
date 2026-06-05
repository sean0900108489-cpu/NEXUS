export type GeneratedImageAsset = {
  bytes: Uint8Array;
  createdAtMs: number;
  id: string;
  mimeType: string;
};

export type GeneratedImageAssetBytesInput = {
  bytes: Uint8Array;
  mimeType: string;
};

export type CreatedGeneratedImageAsset = GeneratedImageAsset & {
  url: string;
};

const GENERATED_IMAGE_ASSET_MAX_AGE_MS = 60 * 60 * 1000;
const GENERATED_IMAGE_ASSET_MAX_COUNT = 40;
const GENERATED_IMAGE_ASSET_MAX_TOTAL_BYTES = 160 * 1024 * 1024;
const generatedImageAssets = new Map<string, GeneratedImageAsset>();

export function createGeneratedImageAssetUrlFromDataUrl(dataUrl: string) {
  const parsed = parseBase64ImageDataUrl(dataUrl);

  if (!parsed) {
    return dataUrl;
  }

  return createGeneratedImageAssetUrlFromBytes({
    bytes: Uint8Array.from(Buffer.from(parsed.base64, "base64")),
    mimeType: parsed.mimeType,
  });
}

export function createGeneratedImageAssetUrlFromBytes(
  input: GeneratedImageAssetBytesInput,
) {
  return createGeneratedImageAssetFromBytes(input).url;
}

export function createGeneratedImageAssetFromBytes(
  input: GeneratedImageAssetBytesInput,
): CreatedGeneratedImageAsset {
  const id = createGeneratedImageAssetId();
  const asset: GeneratedImageAsset = {
    bytes: input.bytes,
    createdAtMs: Date.now(),
    id,
    mimeType: input.mimeType,
  };

  generatedImageAssets.set(id, asset);
  pruneGeneratedImageAssetCache();

  return {
    ...asset,
    url: createGeneratedImageAssetUrl(id),
  };
}

export function createGeneratedImageAssetUrl(
  assetId: string,
  workspaceId?: string | null,
) {
  const baseUrl = `/api/image-gen/assets/${encodeURIComponent(assetId)}`;

  if (!workspaceId?.trim()) {
    return baseUrl;
  }

  return `${baseUrl}?workspaceId=${encodeURIComponent(workspaceId.trim())}`;
}

export function getGeneratedImageAsset(id: string) {
  pruneGeneratedImageAssetCache();

  return generatedImageAssets.get(id) ?? null;
}

export function clearGeneratedImageAssetCacheForTests() {
  generatedImageAssets.clear();
}

export function parseBase64ImageDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/u.exec(
    dataUrl.trim(),
  );

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    base64: match[2],
    mimeType: match[1],
  };
}

function pruneGeneratedImageAssetCache() {
  const now = Date.now();

  for (const [id, asset] of generatedImageAssets) {
    if (now - asset.createdAtMs > GENERATED_IMAGE_ASSET_MAX_AGE_MS) {
      generatedImageAssets.delete(id);
    }
  }

  while (
    generatedImageAssets.size > GENERATED_IMAGE_ASSET_MAX_COUNT ||
    getGeneratedImageAssetTotalBytes() > GENERATED_IMAGE_ASSET_MAX_TOTAL_BYTES
  ) {
    const oldestId = generatedImageAssets.keys().next().value as string | undefined;

    if (!oldestId) {
      return;
    }

    generatedImageAssets.delete(oldestId);
  }
}

function getGeneratedImageAssetTotalBytes() {
  let total = 0;

  for (const asset of generatedImageAssets.values()) {
    total += asset.bytes.byteLength;
  }

  return total;
}

function createGeneratedImageAssetId() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `img_${random}`;
}
