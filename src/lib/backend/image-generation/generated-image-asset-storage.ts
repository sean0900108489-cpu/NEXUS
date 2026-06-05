import { createNexusSupabaseRequestClient } from "@/lib/supabase/request";

export const GENERATED_IMAGE_STORAGE_BUCKET = "nexus-generated-assets";

export type GeneratedImageStorageReference = {
  assetId: string;
  bucket: string;
  mimeType: string;
  path: string;
  provider: "supabase-storage";
  sizeBytes: number;
};

export type GeneratedImageStorageUploadInput = {
  accessToken?: string | null;
  assetId: string;
  bytes: Uint8Array;
  mimeType: string;
  workspaceId?: string | null;
};

export type GeneratedImageStorageDownloadInput = {
  accessToken?: string | null;
  assetId?: string | null;
  path?: string | null;
  workspaceId?: string | null;
};

export type DownloadedGeneratedImageAsset = {
  bytes: Uint8Array;
  mimeType: string;
  path: string;
  sizeBytes: number;
};

type GeneratedImageStorageGateway = {
  download(
    input: GeneratedImageStorageDownloadInput,
  ): Promise<DownloadedGeneratedImageAsset | null>;
  upload(
    input: GeneratedImageStorageUploadInput,
  ): Promise<GeneratedImageStorageReference | null>;
};

let storageGatewayOverride: GeneratedImageStorageGateway | null = null;

export async function uploadGeneratedImageAssetToStorage(
  input: GeneratedImageStorageUploadInput,
) {
  if (storageGatewayOverride) {
    return storageGatewayOverride.upload(input);
  }

  const client = createNexusSupabaseRequestClient(input.accessToken);
  const workspaceId = normalizeStoragePathSegment(input.workspaceId);
  const assetId = normalizeStoragePathSegment(input.assetId);

  if (!client || !workspaceId || !assetId) {
    return null;
  }

  const path = createGeneratedImageStoragePath({ assetId, workspaceId });
  const { error } = await client.storage
    .from(GENERATED_IMAGE_STORAGE_BUCKET)
    .upload(path, Buffer.from(input.bytes), {
      cacheControl: "31536000",
      contentType: input.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    assetId,
    bucket: GENERATED_IMAGE_STORAGE_BUCKET,
    mimeType: input.mimeType,
    path,
    provider: "supabase-storage" as const,
    sizeBytes: input.bytes.byteLength,
  };
}

export async function downloadGeneratedImageAssetFromStorage(
  input: GeneratedImageStorageDownloadInput,
) {
  if (storageGatewayOverride) {
    return storageGatewayOverride.download(input);
  }

  const client = createNexusSupabaseRequestClient(input.accessToken);

  if (!client) {
    return null;
  }

  const path =
    normalizeStoredPath(input.path) ??
    createStoragePathFromWorkspaceAndAsset(input.workspaceId, input.assetId);

  if (!path) {
    return null;
  }

  const { data, error } = await client.storage
    .from(GENERATED_IMAGE_STORAGE_BUCKET)
    .download(path);

  if (error) {
    return null;
  }

  const bytes = new Uint8Array(await data.arrayBuffer());

  return {
    bytes,
    mimeType: data.type || "image/png",
    path,
    sizeBytes: bytes.byteLength,
  };
}

export function createGeneratedImageStoragePath(input: {
  assetId: string;
  workspaceId: string;
}) {
  return `${input.workspaceId}/image-gen/${input.assetId}`;
}

export function setGeneratedImageStorageGatewayForTests(
  gateway: GeneratedImageStorageGateway | null,
) {
  storageGatewayOverride = gateway;
}

function createStoragePathFromWorkspaceAndAsset(
  workspaceId: string | null | undefined,
  assetId: string | null | undefined,
) {
  const normalizedWorkspaceId = normalizeStoragePathSegment(workspaceId);
  const normalizedAssetId = normalizeStoragePathSegment(assetId);

  if (!normalizedWorkspaceId || !normalizedAssetId) {
    return null;
  }

  return createGeneratedImageStoragePath({
    assetId: normalizedAssetId,
    workspaceId: normalizedWorkspaceId,
  });
}

function normalizeStoragePathSegment(value: string | null | undefined) {
  const candidate = value?.trim();

  if (!candidate || !/^[A-Za-z0-9_-]{3,128}$/u.test(candidate)) {
    return null;
  }

  return candidate;
}

function normalizeStoredPath(value: string | null | undefined) {
  const candidate = value?.trim();

  if (!candidate || candidate.includes("..") || candidate.startsWith("/")) {
    return null;
  }

  return candidate;
}
