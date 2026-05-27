import { createStore, get as idbGet, set as idbSet } from "idb-keyval";

import { nexusApiClient, NexusApiError } from "@/lib/api/nexus-api-client";
import {
  findSensitiveStringMatches,
  isSensitiveFieldName,
} from "@/lib/backend/primitives/redaction";
import { stableStringify } from "@/lib/backend/workspace/workspace-snapshot-serializer";
import type {
  LocalSyncQueueOperation,
  SyncOperationRequest,
  SyncOperationResponse,
} from "@/lib/nexus-types";
import { getNexusSupabaseClient } from "@/lib/supabase/client";

export const LOCAL_SYNC_QUEUE_MAX_PAYLOAD_BYTES = 128 * 1024;
const LOCAL_SYNC_QUEUE_KEY = "nexus-local-sync-queue-v4";
const LOCAL_SYNC_QUEUE_DB = "nexus-ai-ops";
const LOCAL_SYNC_QUEUE_STORE = "sync-queue";
const DEFAULT_FLUSH_DELAY_MS = 750;

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

const memoryStorage = new Map<string, LocalSyncQueueOperation[]>();
const queueStore =
  typeof indexedDB === "undefined"
    ? undefined
    : createStore(LOCAL_SYNC_QUEUE_DB, LOCAL_SYNC_QUEUE_STORE);

export class LocalSyncQueueAdapter {
  private drainPromise?: Promise<void>;
  private flushTimer?: ReturnType<typeof setTimeout>;
  private readonly flushDelayMs: number;

  constructor(options: LocalSyncQueueAdapterOptions = {}) {
    this.flushDelayMs = options.flushDelayMs ?? DEFAULT_FLUSH_DELAY_MS;

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.scheduleFlush(0);
      });
    }
  }

  async enqueue(input: EnqueueSyncOperationInput) {
    assertLocalPayloadSafe(input.payload);
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
    const compactedQueue = input.compactKey
      ? queue.map((candidate) =>
          candidate.compactKey === input.compactKey &&
          candidate.workspaceId === input.workspaceId &&
          candidate.entityType === input.entityType &&
          candidate.entityId === input.entityId &&
          candidate.operationType === input.operationType &&
          !["synced", "failed", "conflicted", "compacted"].includes(candidate.status)
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

  async getOperations() {
    return this.readQueue();
  }

  async clear() {
    await this.writeQueue([]);
  }

  async getStatus(): Promise<QueueStatusProjection> {
    const queue = await this.readQueue();

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
          idempotencyKey: operation.clientMutationId,
          userId: await resolveLocalQueueUserId(),
          workspaceId: operation.workspaceId,
        },
      );
      const serverStatus = response.operation.status;
      const localStatus: LocalSyncQueueOperation["status"] =
        serverStatus === "failed" || serverStatus === "conflicted"
          ? serverStatus
          : "synced";

      await this.patchOperation(clientMutationId, {
        lastErrorCode: response.operation.lastErrorCode ?? undefined,
        lastErrorMessage: response.operation.lastErrorMessage ?? undefined,
        status: localStatus,
      });
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

  private async readQueue() {
    if (!queueStore) {
      return memoryStorage.get(LOCAL_SYNC_QUEUE_KEY) ?? [];
    }

    return ((await idbGet(LOCAL_SYNC_QUEUE_KEY, queueStore)) ??
      []) as LocalSyncQueueOperation[];
  }

  private async writeQueue(queue: LocalSyncQueueOperation[]) {
    if (!queueStore) {
      memoryStorage.set(LOCAL_SYNC_QUEUE_KEY, queue);
      return;
    }

    await idbSet(LOCAL_SYNC_QUEUE_KEY, queue, queueStore);
  }
}

export const localSyncQueueAdapter = new LocalSyncQueueAdapter();

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

function assertLocalPayloadSafe(payload: unknown) {
  const payloadSizeBytes = new TextEncoder().encode(stableStringify(payload)).byteLength;

  if (payloadSizeBytes > LOCAL_SYNC_QUEUE_MAX_PAYLOAD_BYTES) {
    throw new Error("SYNC_PAYLOAD_TOO_LARGE");
  }

  if (localPayloadHasSecret(payload)) {
    throw new Error("SYNC_SECRET_DETECTED");
  }
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

export type { EnqueueSyncOperationInput, QueueStatusProjection };
