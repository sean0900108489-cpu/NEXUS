import { SecretBoundaryService } from "../security/secret-boundary-service";

export type SyncConflictInput = {
  baseVersion?: string | null;
  remoteVersion?: string | null;
  payloadHash: string;
  remotePayloadHash?: string | null;
};

export type SyncConflictResult =
  | { conflicted: false }
  | {
      conflicted: true;
      remoteVersion: string | null;
      summary: Record<string, unknown>;
    };

export class SyncConflictResolver {
  constructor(private readonly secretBoundaryService = new SecretBoundaryService()) {}

  detectConflict(input: SyncConflictInput): SyncConflictResult {
    if (
      input.baseVersion &&
      input.remoteVersion &&
      input.baseVersion !== input.remoteVersion
    ) {
      return this.conflict("version_mismatch", input);
    }

    if (
      input.remotePayloadHash &&
      input.remotePayloadHash !== input.payloadHash &&
      input.baseVersion
    ) {
      return this.conflict("checksum_mismatch", input);
    }

    return { conflicted: false };
  }

  private conflict(reason: string, input: SyncConflictInput): SyncConflictResult {
    const summary = this.secretBoundaryService.redact({
      baseVersion: input.baseVersion ?? null,
      conflictType: reason,
      payloadHash: input.payloadHash,
      remotePayloadHash: input.remotePayloadHash ?? null,
      remoteVersion: input.remoteVersion ?? null,
      redactionStatus: "clean",
    });

    return {
      conflicted: true,
      remoteVersion: input.remoteVersion ?? input.remotePayloadHash ?? null,
      summary: summary && typeof summary === "object" && !Array.isArray(summary)
        ? summary
        : { conflictType: reason },
    };
  }
}
