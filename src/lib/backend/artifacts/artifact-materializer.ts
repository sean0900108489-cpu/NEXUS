import type { CreateArtifactRequest } from "@/lib/nexus-types";

import { createNexusSupabaseRequestClient } from "@/lib/supabase/request";
import { ApiError } from "../api/api-errors";
import { stableStringify } from "../api/request-hash";
import { GENERATED_IMAGE_STORAGE_BUCKET } from "../image-generation/generated-image-asset-storage";
import { SecretBoundaryService } from "../security/secret-boundary-service";

import {
  ARTIFACT_CONTENT_TEXT_MAX_BYTES,
  ARTIFACT_PREVIEW_TEXT_MAX_CHARS,
} from "./artifact-constants";

export type MaterializedArtifactContent = {
  contentText: string | null;
  contentUrl: string;
  contentHash: string;
  contentSizeBytes: number;
  mimeType: string;
  previewText: string;
  metadata: Record<string, unknown>;
  inline: boolean;
};

export class ArtifactMaterializer {
  constructor(private readonly secretBoundaryService = new SecretBoundaryService()) {}

  /**
   * If contentUrl is a base64 data URL, upload the decoded bytes to Supabase
   * Storage and return the public bucket path. Otherwise return it unchanged.
   * Best-effort: falls back to the original URL on any upload failure.
   */
  async uploadBase64ContentUrl(
    contentUrl: string,
    artifactId: string,
    workspaceId: string,
    accessToken?: string | null,
  ): Promise<string> {
    if (!contentUrl.startsWith("data:")) {
      return contentUrl;
    }

    const mimeMatch = contentUrl.match(/^data:([^;]*);base64,([\s\S]+)$/);

    if (!mimeMatch) {
      return contentUrl;
    }

    const mimeType = mimeMatch[1] || "image/png";
    const base64Body = mimeMatch[2];

    try {
      const binaryString = atob(base64Body);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const client = createNexusSupabaseRequestClient(accessToken);

      if (!client) {
        return contentUrl;
      }

      const path = `${workspaceId}/artifacts/${artifactId}`;
      const { error } = await client.storage
        .from(GENERATED_IMAGE_STORAGE_BUCKET)
        .upload(path, Buffer.from(bytes), {
          cacheControl: "31536000",
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        return contentUrl;
      }

      return `${GENERATED_IMAGE_STORAGE_BUCKET}/${path}`;
    } catch {
      return contentUrl;
    }
  }

  async materialize(input: CreateArtifactRequest): Promise<MaterializedArtifactContent> {
    const contentText = normalizeText(input.contentText);
    const contentUrl = normalizeText(input.contentUrl);

    if (!contentText && !contentUrl) {
      throw new ApiError("VALIDATION_FAILED", "Artifact content is required.", 400, {
        issues: [
          {
            code: "required",
            message: "contentText or contentUrl is required.",
            path: ["contentText"],
          },
        ],
      });
    }

    this.assertNoContentSecrets(contentText);
    this.assertNoContentSecrets(contentUrl);

    const redactedMetadata = this.secretBoundaryService.redact(input.metadata ?? {});
    const metadata = isRecord(redactedMetadata) ? redactedMetadata : {};
    const hashSource = contentText || contentUrl;
    const contentHash = await createArtifactContentHash(hashSource);
    const contentSizeBytes =
      readGeneratedAssetSizeBytes(metadata) ?? byteSize(contentText || contentUrl);
    const inline = Boolean(contentText) && contentSizeBytes <= ARTIFACT_CONTENT_TEXT_MAX_BYTES;
    const previewText = createPreviewText(contentText || contentUrl);

    this.secretBoundaryService.assertNoSecrets(metadata);
    this.secretBoundaryService.assertNoSecrets(previewText);

    return {
      contentHash,
      contentSizeBytes,
      contentText: inline ? contentText : null,
      contentUrl:
        contentUrl ||
        (inline
          ? `inline://artifact-content/${contentHash.slice("sha256:".length)}`
          : `external://artifact-content/${contentHash.slice("sha256:".length)}`),
      inline,
      metadata,
      mimeType: normalizeMimeType(input.mimeType, contentUrl),
      previewText,
    };
  }

  private assertNoContentSecrets(value: string) {
    if (!value) {
      return;
    }

    const scan = this.secretBoundaryService.scanForSecrets(value);

    if (scan.hasSecrets) {
      throw new ApiError(
        "ARTIFACT_SECRET_DETECTED",
        "Artifact content contains a secret and was rejected.",
        400,
        {
          matchCount: scan.matches.length,
          redactionStatus: "redacted",
        },
      );
    }
  }
}

export async function createArtifactContentHash(value: unknown) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stableStringify(value)),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `sha256:${hex}`;
}

function createPreviewText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, ARTIFACT_PREVIEW_TEXT_MAX_CHARS);
}

function normalizeMimeType(value: string | undefined, contentUrl: string) {
  const candidate = value?.trim();

  if (candidate) {
    return candidate.slice(0, 120);
  }

  if (/^https?:\/\//i.test(contentUrl)) {
    return "text/uri-list";
  }

  return "text/plain";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function readGeneratedAssetSizeBytes(metadata: Record<string, unknown>) {
  const generatedAsset = metadata.generatedAsset;

  if (!isRecord(generatedAsset)) {
    return null;
  }

  const sizeBytes = generatedAsset.sizeBytes;

  return typeof sizeBytes === "number" && Number.isFinite(sizeBytes) && sizeBytes >= 0
    ? Math.floor(sizeBytes)
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
