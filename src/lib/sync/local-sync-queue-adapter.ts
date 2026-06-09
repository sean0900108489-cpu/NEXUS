import { get as idbGet, set as idbSet, type UseStore } from "idb-keyval";

import { nexusApiClient, NexusApiError } from "@/lib/api/nexus-api-client";
import {
  findSensitiveStringMatches,
  isSensitiveFieldName,
} from "@/lib/backend/primitives/redaction";
import {
  SYNC_STANDARD_PAYLOAD_MAX_BYTES,
  SYNC_WORKSPACE_SNAPSHOT_PAYLOAD_MAX_BYTES,
} from "@/lib/backend/sync/sync-constants";
import { stableStringify } from "@/lib/backend/workspace/workspace-snapshot-serializer";
import type {
  LocalSyncQueueOperation,
  SyncOperationRequest,
  SyncOperationResponse,
} from "@/lib/nexus-types";
import { getNexusSupabaseClient } from "@/lib/supabase/client";

export const LOCAL_SYNC_QUEUE_MAX_PAYLOAD_BYTES = SYNC_STANDARD_PAYLOAD_MAX_BYTES;
export const LOCAL_SYNC_QUEUE_WORKSPACE_SNAPSHOT_MAX_PAYLOAD_BYTES =
  SYNC_WORKSPACE_SNAPSHOT_PAYLOAD_MAX_BYTES;
const LOCAL_SYNC_QUEUE_KEY = "nexus-local-sync-queue-v4";
export const LOCAL_SYNC_QUEUE_DB = "nexus-ai-ops-sync-queue";
export const LOCAL_SYNC_QUEUE_DB_VERSION = 2;
export const LOCAL_SYNC_QUEUE_STORE = "sync-queue";
const DEFAULT_FLUSH_DELAY_MS = 750;
const WORKSPACE_SNAPSHOT_MANUAL_RECOVERY_COMPACT_ERROR_CODES = new Set([
  "SYNC_PAYLOAD_TOO_LARGE",
  "SYNC_SECRET_DETECTED",
  "WORKSPACE_SNAPSHOT_TOO_LARGE",
  "WORKSPACE_STATE_SCHEMA_MISMATCH",
  "WORKSPACE_STATE_SECRET_DETECTED",
]);

type LocalSyncQueueAdapterOptions = {
  flushDelayMs?: number;
};

type EnqueueSyncOperationInput = Omit<
  SyncOperationRequest,
  "clientMutationId" | "payloadHash"
> & {
  clientMutationId?: string;
  compactKey?: string;
  payloadHash?: string;
};

type QueueStatusProjection = {
  pending: number;
  syncing: number;
  failed: number;
  conflicted: number;
  lastSyncedAt?: string;
};

type QueueStatusInput = {
  workspaceId?: string | null;
};

export type LocalSyncQueueIssueRecoveryResult =
  | "compacted"
  | "missing"
  | "queued";

const memoryStorage = new Map<string, LocalSyncQueueOperation[]>();
let queueStore: UseStore | undefined =
  typeof indexedDB === "undefined"
    ? undefined
    : createVersionedQueueStore(
        LOCAL_SYNC_QUEUE_DB,
        LOCAL_SYNC_QUEUE_STORE,
        LOCAL_SYNC_QUEUE_DB_VERSION,
      );
let queueStoreRepairPromise: Promise<void> | undefined;

export class LocalSyncQueueAdapter {
  private drainPromise?: Promise<void>;
  private flushTimer?: ReturnType<typeof setTimeout>;
  private readonly flushDelayMs: number;
  private readonly readOnlyWorkspaceIds = new Set<string>();

  constructor(options: LocalSyncQueueAdapterOptions = {}) {
    this.flushDelayMs = options.flushDelayMs ?? DEFAULT_FLUSH_DELAY_MS;

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.scheduleFlush(0);
      });
    }
  }

  async enqueue(input: EnqueueSyncOperationInput) {
    assertLocalPayloadSafe(input);
    const payloadHash = input.payloadHash ?? await computeLocalPayloadHash(input.payload);
    const now = new Date().toISOString();
    const operation: LocalSyncQueueOperation = {
      baseVersion: input.baseVersion ?? null,
      clientMutationId: input.clientMutationId ?? createClientMutationId(),
      compactKey: input.compactKey,
      entityId: input.entityId,
      entityType: input.entityType,
      operationType: input.operationType,
      payload: input.payload,
      payloadHash,
      status: "queued",
      attemptCount: 0,
      workspaceId: input.workspaceId,
      createdAt: now,
      updatedAt: now,
    };
    const queue = await this.readQueue();

    if (this.isWorkspaceReadOnly(input.workspaceId)) {
      const compactedOperation: LocalSyncQueueOperation = {
        ...operation,
        lastErrorCode: "WORKSPACE_READ_ONLY",
        lastErrorMessage: "Local sync operation suppressed because the workspace is read-only.",
        status: "compacted",
      };

      await this.writeQueue([
        ...compactReadOnlyWorkspaceQueue(queue, input.workspaceId, now),
        compactedOperation,
      ]);

      return compactedOperation;
    }

    const compactTerminal =
      input.entityType === "workspace" && input.operationType === "snapshot";
    const compactedQueue = input.compactKey
      ? queue.map((candidate) =>
          candidate.compactKey === input.compactKey &&
          candidate.workspaceId === input.workspaceId &&
          candidate.entityType === input.entityType &&
          candidate.entityId === input.entityId &&
          candidate.operationType === input.operationType &&
          !["synced", "compacted"].includes(candidate.status) &&
          (compactTerminal || !["failed", "conflicted"].includes(candidate.status))
            ? {
                ...candidate,
                status: "compacted" as const,
                updatedAt: now,
              }
            : candidate,
        )
      : queue;

    await this.writeQueue([...compactedQueue, operation]);
    this.scheduleFlush();

    return operation;
  }

  async setWorkspaceReadOnly(workspaceId: string | null | undefined, readOnly: boolean) {
    const normalizedWorkspaceId = workspaceId?.trim();

    if (!normalizedWorkspaceId) {
      return;
    }

    if (!readOnly) {
      this.readOnlyWorkspaceIds.delete(normalizedWorkspaceId);
      return;
    }

    this.readOnlyWorkspaceIds.add(normalizedWorkspaceId);

    const queue = await this.readQueue();
    const now = new Date().toISOString();
    await this.writeQueue(
      compactReadOnlyWorkspaceQueue(queue, normalizedWorkspaceId, now),
    );
  }

  async flush() {
    if (this.drainPromise) {
      return this.drainPromise;
    }

    this.drainPromise = this.drain().finally(() => {
      this.drainPromise = undefined;
    });

    return this.drainPromise;
  }

  async retry(clientMutationId: string) {
    const queue = await this.readQueue();
    const now = new Date().toISOString();

    await this.writeQueue(
      queue.map((operation) =>
        operation.clientMutationId === clientMutationId &&
        ["failed", "retrying", "conflicted"].includes(operation.status)
          ? {
              ...operation,
              lastErrorCode: undefined,
              lastErrorMessage: undefined,
              status: "queued" as const,
              updatedAt: now,
            }
          : operation,
      ),
    );
    this.scheduleFlush(0);
  }

  async recoverIssue(
    clientMutationId: string,
  ): Promise<LocalSyncQueueIssueRecoveryResult> {
    const queue = await this.readQueue();
    const operation = queue.find(
      (candidate) => candidate.clientMutationId === clientMutationId,
    );

    if (!operation || !["failed", "retrying", "conflicted"].includes(operation.status)) {
      return "missing";
    }

    if (shouldCompactWorkspaceSnapshotIssueOnManualRecovery(operation)) {
      await this.compactWorkspaceSnapshotIssues(operation.workspaceId);
      return "compacted";
    }

    await this.retry(clientMutationId);
    return "queued";
  }

  async getOperations() {
    return this.readQueue();
  }

  async clear() {
    await this.writeQueue([]);
  }

  async compactWorkspaceSnapshotIssues(workspaceId: string) {
    const queue = await this.readQueue();
    const now = new Date().toISOString();

    await this.writeQueue(
      queue.map((operation) =>
        isWorkspaceSnapshotIssue(operation, workspaceId)
          ? {
              ...operation,
              status: "compacted" as const,
              updatedAt: now,
            }
          : operation,
      ),
    );
  }

  async getStatus(input: QueueStatusInput = {}): Promise<QueueStatusProjection> {
    const queue = filterQueueByWorkspace(await this.readQueue(), input.workspaceId);

    return {
      conflicted: queue.filter((operation) => operation.status === "conflicted").length,
      failed: queue.filter((operation) => operation.status === "failed").length,
      lastSyncedAt: queue
        .filter((operation) => operation.status === "synced")
        .map((operation) => operation.updatedAt)
        .sort()
        .at(-1),
      pending: queue.filter((operation) =>
        ["pending", "queued", "retrying"].includes(operation.status),
      ).length,
      syncing: queue.filter((operation) => operation.status === "syncing").length,
    };
  }

  private scheduleFlush(delayMs = this.flushDelayMs) {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    if (typeof window === "undefined") {
      return;
    }

    this.flushTimer = setTimeout(() => {
      void this.flush();
    }, delayMs);
  }

  private async drain() {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return;
    }

    const queue = await this.readQueue();
    const active = queue.filter((operation) =>
      ["queued", "retrying"].includes(operation.status),
    );

    for (const operation of active) {
      await this.flushOperation(operation.clientMutationId);
    }
  }

  private async flushOperation(clientMutationId: string) {
    const queue = await this.readQueue();
    const operation = queue.find(
      (candidate) => candidate.clientMutationId === clientMutationId,
    );

    if (!operation || !["queued", "retrying"].includes(operation.status)) {
      return;
    }

    if (this.isWorkspaceReadOnly(operation.workspaceId)) {
      await this.patchOperation(clientMutationId, {
        lastErrorCode: "WORKSPACE_READ_ONLY",
        lastErrorMessage:
          "Local sync operation suppressed because the workspace is read-only.",
        status: "compacted",
      });
      return;
    }

    const accessToken =
      typeof window !== "undefined" ? await resolveLocalQueueAccessToken() : undefined;

    if (typeof window !== "undefined" && !accessToken) {
      return;
    }

    await this.patchOperation(clientMutationId, {
      attemptCount: operation.attemptCount + 1,
      status: "syncing",
    });

    try {
      const response = await nexusApiClient.post<
        SyncOperationResponse,
        SyncOperationRequest
      >(
        "/api/v1/sync/operations",
        {
          baseVersion: operation.baseVersion,
          clientMutationId: operation.clientMutationId,
          entityId: operation.entityId,
          entityType: operation.entityType,
          operationType: operation.operationType,
          payload: operation.payload,
          payloadHash: operation.payloadHash,
          workspaceId: operation.workspaceId,
        },
        {
          accessToken,
          idempotencyKey: operation.clientMutationId,
          userId: await resolveLocalQueueUserId(),
          workspaceId: operation.workspaceId,
        },
      );
      const localStatus = mapServerStatusToLocalQueueStatus(response.operation.status);

      await this.patchOperation(clientMutationId, {
        lastErrorCode: response.operation.lastErrorCode ?? undefined,
        lastErrorMessage: response.operation.lastErrorMessage ?? undefined,
        status: localStatus,
      });

      if (
        localStatus === "synced" &&
        operation.entityType === "workspace" &&
        operation.operationType === "snapshot"
      ) {
        await this.compactSupersededWorkspaceSnapshotIssues(
          operation.workspaceId,
          operation.clientMutationId,
        );
      }
    } catch (error) {
      await this.patchOperation(clientMutationId, {
        lastErrorCode: error instanceof NexusApiError ? error.code : "SYNC_BACKEND_UNAVAILABLE",
        lastErrorMessage:
          error instanceof Error ? sanitizeLocalQueueError(error.message) : "Sync flush failed.",
        status: "failed",
      });
    }
  }

  private async patchOperation(
    clientMutationId: string,
    patch: Partial<Pick<
      LocalSyncQueueOperation,
      "attemptCount" | "lastErrorCode" | "lastErrorMessage" | "status"
    >>,
  ) {
    const now = new Date().toISOString();
    const queue = await this.readQueue();

    await this.writeQueue(
      queue.map((operation) =>
        operation.clientMutationId === clientMutationId
          ? {
              ...operation,
              ...patch,
              updatedAt: now,
            }
          : operation,
      ),
    );
  }

  private async compactSupersededWorkspaceSnapshotIssues(
    workspaceId: string,
    activeClientMutationId: string,
  ) {
    const queue = await this.readQueue();
    const now = new Date().toISOString();

    await this.writeQueue(
      queue.map((operation) =>
        operation.clientMutationId !== activeClientMutationId &&
        isWorkspaceSnapshotIssue(operation, workspaceId)
          ? {
              ...operation,
              status: "compacted" as const,
              updatedAt: now,
            }
          : operation,
      ),
    );
  }

  private async readQueue() {
    if (!queueStore) {
      return memoryStorage.get(LOCAL_SYNC_QUEUE_KEY) ?? [];
    }

    try {
      return ((await idbGet(LOCAL_SYNC_QUEUE_KEY, queueStore)) ??
        []) as LocalSyncQueueOperation[];
    } catch (error) {
      if (isMissingQueueStoreError(error)) {
        await repairLocalSyncQueueStore(error);
        return [];
      }

      throw error;
    }
  }

  private async writeQueue(queue: LocalSyncQueueOperation[]) {
    if (!queueStore) {
      memoryStorage.set(LOCAL_SYNC_QUEUE_KEY, queue);
      return;
    }

    try {
      await idbSet(LOCAL_SYNC_QUEUE_KEY, queue, queueStore);
    } catch (error) {
      if (!isMissingQueueStoreError(error)) {
        throw error;
      }

      await repairLocalSyncQueueStore(error);

      if (!queueStore) {
        memoryStorage.set(LOCAL_SYNC_QUEUE_KEY, queue);
        return;
      }

      try {
        await idbSet(LOCAL_SYNC_QUEUE_KEY, queue, queueStore);
      } catch (retryError) {
        console.warn(
          "[Local Sync Queue] IndexedDB migration repair retry failed; falling back to in-memory queue for this session.",
          formatLocalSyncQueueError(retryError),
        );
        queueStore = undefined;
        memoryStorage.set(LOCAL_SYNC_QUEUE_KEY, queue);
      }
    }
  }

  private isWorkspaceReadOnly(workspaceId: string | null | undefined) {
    const normalizedWorkspaceId = workspaceId?.trim();

    return Boolean(
      normalizedWorkspaceId &&
        this.readOnlyWorkspaceIds.has(normalizedWorkspaceId),
    );
  }
}

function filterQueueByWorkspace(
  queue: LocalSyncQueueOperation[],
  workspaceId?: string | null,
) {
  const normalizedWorkspaceId = workspaceId?.trim();

  return normalizedWorkspaceId
    ? queue.filter((operation) => operation.workspaceId === normalizedWorkspaceId)
    : queue;
}

export const localSyncQueueAdapter = new LocalSyncQueueAdapter();

function compactReadOnlyWorkspaceQueue(
  queue: LocalSyncQueueOperation[],
  workspaceId: string | null | undefined,
  updatedAt: string,
) {
  const normalizedWorkspaceId = workspaceId?.trim();

  if (!normalizedWorkspaceId) {
    return queue;
  }

  return queue.map((operation) =>
    operation.workspaceId === normalizedWorkspaceId &&
    !["synced", "compacted", "cancelled"].includes(operation.status)
      ? {
          ...operation,
          lastErrorCode: "WORKSPACE_READ_ONLY",
          lastErrorMessage:
            "Local sync operation suppressed because the workspace is read-only.",
          status: "compacted" as const,
          updatedAt,
        }
      : operation,
  );
}

export async function computeLocalPayloadHash(payload: unknown) {
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

function assertLocalPayloadSafe(input: EnqueueSyncOperationInput) {
  const payloadSizeBytes = new TextEncoder().encode(
    stableStringify(input.payload),
  ).byteLength;
  const maxPayloadSizeBytes = getLocalQueuePayloadMaxBytes(input);

  if (payloadSizeBytes > maxPayloadSizeBytes) {
    throw new Error("SYNC_PAYLOAD_TOO_LARGE");
  }

  if (localPayloadHasSecret(input.payload)) {
    throw new Error("SYNC_SECRET_DETECTED");
  }
}

function getLocalQueuePayloadMaxBytes(input: EnqueueSyncOperationInput) {
  if (input.entityType === "workspace" && input.operationType === "snapshot") {
    return LOCAL_SYNC_QUEUE_WORKSPACE_SNAPSHOT_MAX_PAYLOAD_BYTES;
  }

  return LOCAL_SYNC_QUEUE_MAX_PAYLOAD_BYTES;
}

function localPayloadHasSecret(value: unknown): boolean {
  if (typeof value === "string") {
    return findSensitiveStringMatches(value).length > 0;
  }

  if (Array.isArray(value)) {
    return value.some(localPayloadHasSecret);
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.entries(value as Record<string, unknown>).some(([key, nestedValue]) =>
    isSensitiveFieldName(key) || localPayloadHasSecret(nestedValue),
  );
}

function sanitizeLocalQueueError(message: string) {
  return message.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 180);
}

function isWorkspaceSnapshotIssue(
  operation: LocalSyncQueueOperation,
  workspaceId: string,
) {
  return (
    operation.workspaceId === workspaceId &&
    operation.entityType === "workspace" &&
    operation.operationType === "snapshot" &&
    ["failed", "conflicted"].includes(operation.status)
  );
}

function shouldCompactWorkspaceSnapshotIssueOnManualRecovery(
  operation: LocalSyncQueueOperation,
) {
  if (!isWorkspaceSnapshotIssue(operation, operation.workspaceId)) {
    return false;
  }

  if (operation.status === "conflicted") {
    return true;
  }

  return WORKSPACE_SNAPSHOT_MANUAL_RECOVERY_COMPACT_ERROR_CODES.has(
    operation.lastErrorCode ?? "",
  );
}

function mapServerStatusToLocalQueueStatus(
  status: SyncOperationResponse["operation"]["status"],
): LocalSyncQueueOperation["status"] {
  return status;
}

function createClientMutationId() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `mutation_sync_${random}`;
}

async function resolveLocalQueueUserId() {
  try {
    const { data } = await getNexusSupabaseClient().auth.getUser();

    return data.user?.id ?? "local-owner";
  } catch {
    return "local-owner";
  }
}

async function resolveLocalQueueAccessToken() {
  try {
    const { data } = await getNexusSupabaseClient().auth.getSession();

    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

function createVersionedQueueStore(
  dbName: string,
  storeName: string,
  version: number,
): UseStore {
  let dbPromise: Promise<IDBDatabase> | undefined;

  const getDb = () => {
    if (dbPromise) {
      return dbPromise;
    }

    const request = indexedDB.open(dbName, version);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    dbPromise = promisifyIndexedDbOpenRequest(request);
    dbPromise.then(
      (db) => {
        db.onclose = () => {
          dbPromise = undefined;
        };
        db.onversionchange = () => {
          db.close();
          dbPromise = undefined;
        };
      },
      () => {
        dbPromise = undefined;
      },
    );

    return dbPromise;
  };

  return async (txMode, callback) => {
    const db = await getDb();

    if (!db.objectStoreNames.contains(storeName)) {
      throw new DOMException(
        `Object store ${storeName} is missing from ${dbName}.`,
        "NotFoundError",
      );
    }

    return callback(db.transaction(storeName, txMode).objectStore(storeName));
  };
}

async function repairLocalSyncQueueStore(error: unknown) {
  if (typeof indexedDB === "undefined") {
    queueStore = undefined;
    return;
  }

  if (queueStoreRepairPromise) {
    return queueStoreRepairPromise;
  }

  queueStoreRepairPromise = deleteLocalSyncQueueDb(error).finally(() => {
    queueStoreRepairPromise = undefined;
  });

  return queueStoreRepairPromise;
}

async function deleteLocalSyncQueueDb(error: unknown) {
  console.warn(
    "[Local Sync Queue] IndexedDB migration repair: queue object store missing. Resetting local sync queue only; workspace data is untouched.",
    formatLocalSyncQueueError(error),
  );

  queueStore = undefined;
  memoryStorage.set(LOCAL_SYNC_QUEUE_KEY, []);
  let deleted = false;

  try {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(LOCAL_SYNC_QUEUE_DB);

      request.onblocked = () => {
        console.warn(
          "[Local Sync Queue] IndexedDB migration repair is blocked by another open connection; falling back to in-memory queue for this session.",
        );
        resolve();
      };
      request.onerror = () => {
        console.warn(
          "[Local Sync Queue] IndexedDB migration repair could not delete the queue DB; falling back to in-memory queue for this session.",
          formatLocalSyncQueueError(request.error),
        );
        resolve();
      };
      request.onsuccess = () => {
        deleted = true;
        resolve();
      };
    });
  } finally {
    queueStore = deleted
      ? createVersionedQueueStore(
          LOCAL_SYNC_QUEUE_DB,
          LOCAL_SYNC_QUEUE_STORE,
          LOCAL_SYNC_QUEUE_DB_VERSION,
        )
      : undefined;
  }
}

function isMissingQueueStoreError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { message?: unknown; name?: unknown };
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message = typeof candidate.message === "string" ? candidate.message : "";

  return (
    name === "NotFoundError" ||
    /object store|specified object stores|sync-queue/i.test(message)
  );
}

function promisifyIndexedDbOpenRequest(request: IDBOpenDBRequest) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(
        new DOMException(
          "IndexedDB open request was blocked by another connection.",
          "AbortError",
        ),
      );
  });
}

function formatLocalSyncQueueError(error: unknown) {
  if (error instanceof Error) {
    return {
      cause: error.cause,
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  try {
    return {
      json: JSON.stringify(error),
      message: String(error),
      name: typeof error,
    };
  } catch {
    return {
      message: String(error),
      name: typeof error,
    };
  }
}

export type { EnqueueSyncOperationInput, QueueStatusProjection };
