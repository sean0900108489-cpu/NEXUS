import { createHash } from "node:crypto";

import { SecretBoundaryService } from "../security/secret-boundary-service";

export const OBSERVABILITY_METADATA_MAX_BYTES = 16 * 1024;
const OBSERVABILITY_STRING_MAX_CHARS = 1024;

const RAW_CONTENT_KEYS = new Set([
  "body",
  "content",
  "delta",
  "input",
  "messages",
  "output",
  "prompt",
  "rawbody",
  "rawerror",
  "rawinput",
  "rawoutput",
  "rawprompt",
  "requestbody",
  "responsebody",
  "stack",
  "stream",
  "token",
]);

export type RedactionPipelineResult = {
  metadata: Record<string, unknown>;
  originalSizeBytes: number;
  redacted: boolean;
  truncated: boolean;
};

export class RedactionPipeline {
  constructor(
    private readonly secretBoundaryService = new SecretBoundaryService(),
    private readonly maxBytes = OBSERVABILITY_METADATA_MAX_BYTES,
  ) {}

  sanitizeMetadata(input: Record<string, unknown> = {}): RedactionPipelineResult {
    const scrubbed = scrubRawContent(input);
    const redacted = this.secretBoundaryService.redact(scrubbed);
    const metadata =
      redacted && typeof redacted === "object" && !Array.isArray(redacted)
        ? (redacted as Record<string, unknown>)
        : {};
    const scan = this.secretBoundaryService.scanForSecrets(input);
    const originalSizeBytes = byteSize(metadata);
    const truncated =
      originalSizeBytes > this.maxBytes
        ? truncateMetadata(metadata, originalSizeBytes, this.maxBytes)
        : metadata;

    this.secretBoundaryService.assertNoSecrets(truncated);

    return {
      metadata: truncated,
      originalSizeBytes,
      redacted: scan.hasSecrets,
      truncated: originalSizeBytes > this.maxBytes,
    };
  }

  sanitizeMessage(message: unknown) {
    if (typeof message !== "string") {
      return null;
    }

    const redacted = this.secretBoundaryService.redact(message);
    const safe = typeof redacted === "string" ? redacted : String(redacted);

    this.secretBoundaryService.assertNoSecrets(safe);

    return safe.slice(0, 500);
  }
}

function scrubRawContent(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubRawContent);
  }

  if (!isRecord(value)) {
    return summarizeLongString(value);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (shouldRedactKey(key)) {
        return [key, summarizeValue(entry)];
      }

      return [key, scrubRawContent(entry)];
    }),
  );
}

function shouldRedactKey(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (normalized.endsWith("tokens") || normalized.endsWith("tokencount")) {
    return false;
  }

  return RAW_CONTENT_KEYS.has(normalized);
}

function summarizeLongString(value: unknown) {
  if (typeof value !== "string" || value.length <= OBSERVABILITY_STRING_MAX_CHARS) {
    return value;
  }

  return summarizeValue(value);
}

function summarizeValue(value: unknown) {
  const serialized = safeStringify(value);

  return {
    hash: hashValue(serialized),
    length: serialized.length,
    redactionStatus: "redacted",
  };
}

function truncateMetadata(
  metadata: Record<string, unknown>,
  originalSizeBytes: number,
  maxBytes: number,
) {
  const serialized = safeStringify(metadata);

  return {
    originalSizeBytes,
    preview: serialized.slice(0, Math.min(1024, maxBytes)),
    redactionStatus: "redacted",
    truncated: true,
  };
}

function byteSize(value: unknown) {
  return new TextEncoder().encode(safeStringify(value)).byteLength;
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function hashValue(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
