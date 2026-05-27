import { SecretBoundaryService } from "../security/secret-boundary-service";

const volatileFieldNames = new Set([
  "requestId",
  "traceId",
  "clientMutationId",
  "idempotencyKey",
  "timestamp",
  "createdAt",
  "updatedAt",
  "transient",
  "uiOnly",
]);

export async function createRequestHash(body: unknown) {
  const secretBoundary = new SecretBoundaryService();
  const redacted = secretBoundary.redact(body);
  const canonical = stableStringify(stripVolatileFields(redacted));
  const digest = await sha256(canonical);

  return `sha256:${digest}`;
}

export function createRequestFingerprint({
  method,
  path,
  requestHash,
  workspaceId,
}: {
  method: string;
  path: string;
  requestHash: string;
  workspaceId: string;
}) {
  return `${method.toUpperCase()} ${path} ${workspaceId} ${requestHash}`;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.entries(record)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

function stripVolatileFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripVolatileFields);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !isVolatileFieldName(key))
      .map(([key, entryValue]) => [key, stripVolatileFields(entryValue)]),
  );
}

function isVolatileFieldName(fieldName: string) {
  return volatileFieldNames.has(fieldName) || /(?:^|_)(timestamp|nonce)$/i.test(fieldName);
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
