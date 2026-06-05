import type {
  SyncEntityType,
  SyncOperationStatus,
  SyncOperationType,
} from "@/lib/nexus-types";

export const SYNC_STANDARD_PAYLOAD_MAX_BYTES = 128 * 1024;
export const SYNC_WORKSPACE_SNAPSHOT_PAYLOAD_MAX_BYTES = 640 * 1024;
export const SYNC_PAYLOAD_MAX_BYTES = SYNC_STANDARD_PAYLOAD_MAX_BYTES;
export const SYNC_OPERATION_LEASE_MS = 2 * 60 * 1000;
export const SYNC_OPERATION_DEFAULT_MAX_ATTEMPTS = 5;
export const SYNC_RETRY_BASE_DELAYS_MS = [
  5_000,
  30_000,
  2 * 60_000,
  10 * 60_000,
] as const;

export const SYNC_ENTITY_TYPES = [
  "workspace",
  "agent",
  "message",
  "prompt",
  "notebook",
  "artifact_reference",
] as const satisfies readonly SyncEntityType[];

export const SYNC_OPERATION_TYPES = [
  "create",
  "update",
  "delete",
  "upsert",
  "patch",
  "reorder",
  "snapshot",
] as const satisfies readonly SyncOperationType[];

export const SYNC_OPERATION_STATUSES = [
  "pending",
  "queued",
  "syncing",
  "synced",
  "retrying",
  "failed",
  "conflicted",
  "cancelled",
  "compacted",
] as const satisfies readonly SyncOperationStatus[];

export const SYNC_STATUS_TRANSITIONS: Record<
  SyncOperationStatus,
  readonly SyncOperationStatus[]
> = {
  cancelled: [],
  compacted: [],
  conflicted: ["queued"],
  failed: ["queued"],
  pending: ["queued", "cancelled"],
  queued: ["syncing", "cancelled"],
  retrying: ["queued", "cancelled"],
  synced: ["compacted"],
  syncing: ["synced", "retrying", "failed", "conflicted"],
};

export function isSyncEntityType(value: string): value is SyncEntityType {
  return (SYNC_ENTITY_TYPES as readonly string[]).includes(value);
}

export function isSyncOperationType(value: string): value is SyncOperationType {
  return (SYNC_OPERATION_TYPES as readonly string[]).includes(value);
}

export function isSyncOperationStatus(value: string): value is SyncOperationStatus {
  return (SYNC_OPERATION_STATUSES as readonly string[]).includes(value);
}

export function canTransitionSyncStatus(
  from: SyncOperationStatus,
  to: SyncOperationStatus,
) {
  return SYNC_STATUS_TRANSITIONS[from].includes(to);
}

export function calculateSyncRetryAt(attemptCount: number, now = new Date()) {
  const delay =
    SYNC_RETRY_BASE_DELAYS_MS[
      Math.min(Math.max(attemptCount - 1, 0), SYNC_RETRY_BASE_DELAYS_MS.length - 1)
    ];
  const jitter = Math.floor(delay * 0.2 * Math.random());

  return new Date(now.getTime() + delay + jitter).toISOString();
}

export function isAutoRetryableSyncError(code: string) {
  if (
    [
      "VALIDATION_FAILED",
      "AUTH_REQUIRED",
      "WORKSPACE_ACCESS_DENIED",
      "PERMISSION_DENIED",
      "SYNC_CONFLICT",
      "SYNC_OPERATION_CONFLICT",
      "SYNC_DOMAIN_NOT_SUPPORTED",
      "SYNC_SECRET_DETECTED",
      "SYNC_PAYLOAD_TOO_LARGE",
    ].includes(code)
  ) {
    return false;
  }

  if (code === "PROVIDER_TIMEOUT" || code.startsWith("PROVIDER_")) {
    return false;
  }

  return (
    code === "INTERNAL_ERROR" ||
    code === "SYNC_BACKEND_UNAVAILABLE" ||
    code.startsWith("INTERNAL_")
  );
}
