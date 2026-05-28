import { SecretBoundaryService } from "../security/secret-boundary-service";
import { stableStringify } from "../api/request-hash";

export async function createSyncPayloadHash(payload: unknown) {
  const secretBoundary = new SecretBoundaryService();
  secretBoundary.assertNoSecrets(payload);
  const canonical = stableStringify(payload);
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `sha256:${hex}`;
}

export function getPayloadSizeBytes(payload: unknown) {
  return new TextEncoder().encode(stableStringify(payload)).byteLength;
}
