import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  SyncOperationInsert,
  Sync_Operations,
} from "@/lib/supabase/database.types";
import type {
  SyncEntityType,
  SyncOperationStatus,
  SyncOperationSummary,
  SyncOperationType,
} from "@/lib/nexus-types";

import {
  SYNC_OPERATION_DEFAULT_MAX_ATTEMPTS,
  SYNC_OPERATION_LEASE_MS,
} from "./sync-constants";

export type SyncOperationRecord = SyncOperationSummary & {
  payload: unknown;
  createdBy?: string | null;
  conflictSummary?: unknown | null;
  lockedAt?: string | null;
  leaseExpiresAt?: string | null;
  compactedAt?: string | null;
  cancelledAt?: string | null;
};

export type InsertSyncOperationInput = {
  id: string;
  workspaceId: string;
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  payload: unknown;
  payloadHash: string;
  baseVersion?: string | null;
  createdBy?: string | null;
  status?: SyncOperationStatus;
  maxAttempts?: number;
};

export type SyncOperationQuery = {
  workspaceId: string;
  status?: SyncOperationStatus;
  entityType?: SyncEntityType;
  entityId?: string;
  limit?: number;
};

export interface SyncOperationRepository {
  insertOperation(input: InsertSyncOperationInput): Promise<SyncOperationRecord>;
  findById(id: string): Promise<SyncOperationRecord | null>;
  findByWorkspace(query: SyncOperationQuery): Promise<SyncOperationRecord[]>;
  markQueued(id: string): Promise<SyncOperationRecord>;
  markSyncingWithLease(id: string, leaseMs?: number): Promise<SyncOperationRecord>;
  markSynced(id: string): Promise<SyncOperationRecord>;
  markRetrying(id: string, nextRetryAt: string, code: string, message: string): Promise<SyncOperationRecord>;
  markFailed(id: string, code: string, message: string): Promise<SyncOperationRecord>;
  markConflicted(id: string, remoteVersion: string | null, conflictSummary: unknown): Promise<SyncOperationRecord>;
  markCancelled(id: string): Promise<SyncOperationRecord>;
  markCompacted(id: string): Promise<SyncOperationRecord>;
  cleanupSyncedOperations(workspaceId: string, olderThan: Date, keepRecent: number): Promise<number>;
}

export class InMemorySyncOperationRepository implements SyncOperationRepository {
  private readonly operations = new Map<string, SyncOperationRecord>();

  async insertOperation(input: InsertSyncOperationInput) {
    if (this.operations.has(input.id)) {
      throw new Error("duplicate sync operation");
    }

    const now = new Date().toISOString();
    const record: SyncOperationRecord = {
      attemptCount: 0,
      baseVersion: input.baseVersion ?? null,
      cancelledAt: null,
      compactedAt: null,
      conflictSummary: null,
      createdAt: now,
      createdBy: input.createdBy ?? null,
      entityId: input.entityId,
      entityType: input.entityType,
      id: input.id,
      lastErrorCode: null,
      lastErrorMessage: null,
      leaseExpiresAt: null,
      lockedAt: null,
      maxAttempts: input.maxAttempts ?? SYNC_OPERATION_DEFAULT_MAX_ATTEMPTS,
      nextRetryAt: null,
      operationType: input.operationType,
      payload: input.payload,
      payloadHash: input.payloadHash,
      remoteVersion: null,
      status: input.status ?? "queued",
      syncedAt: null,
      updatedAt: now,
      workspaceId: input.workspaceId,
    };

    this.operations.set(input.id, record);

    return record;
  }

  async findById(id: string) {
    return this.operations.get(id) ?? null;
  }

  async findByWorkspace(query: SyncOperationQuery) {
    return [...this.operations.values()]
      .filter((operation) => operation.workspaceId === query.workspaceId)
      .filter((operation) => !query.status || operation.status === query.status)
      .filter((operation) => !query.entityType || operation.entityType === query.entityType)
      .filter((operation) => !query.entityId || operation.entityId === query.entityId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, query.limit ?? 50);
  }

  async markQueued(id: string) {
    return this.patch(id, {
      lastErrorCode: null,
      lastErrorMessage: null,
      nextRetryAt: null,
      status: "queued",
    });
  }

  async markSyncingWithLease(id: string, leaseMs = SYNC_OPERATION_LEASE_MS) {
    const now = new Date();

    return this.patch(id, {
      attemptCount: (this.operations.get(id)?.attemptCount ?? 0) + 1,
      leaseExpiresAt: new Date(now.getTime() + leaseMs).toISOString(),
      lockedAt: now.toISOString(),
      status: "syncing",
    });
  }

  async markSynced(id: string) {
    return this.patch(id, {
      leaseExpiresAt: null,
      lockedAt: null,
      status: "synced",
      syncedAt: new Date().toISOString(),
    });
  }

  async markRetrying(id: string, nextRetryAt: string, code: string, message: string) {
    return this.patch(id, {
      lastErrorCode: code,
      lastErrorMessage: message,
      leaseExpiresAt: null,
      lockedAt: null,
      nextRetryAt,
      status: "retrying",
    });
  }

  async markFailed(id: string, code: string, message: string) {
    return this.patch(id, {
      lastErrorCode: code,
      lastErrorMessage: message,
      leaseExpiresAt: null,
      lockedAt: null,
      status: "failed",
    });
  }

  async markConflicted(id: string, remoteVersion: string | null, conflictSummary: unknown) {
    return this.patch(id, {
      conflictSummary,
      leaseExpiresAt: null,
      lockedAt: null,
      remoteVersion,
      status: "conflicted",
    });
  }

  async markCancelled(id: string) {
    return this.patch(id, {
      cancelledAt: new Date().toISOString(),
      status: "cancelled",
    });
  }

  async markCompacted(id: string) {
    return this.patch(id, {
      compactedAt: new Date().toISOString(),
      status: "compacted",
    });
  }

  async cleanupSyncedOperations(workspaceId: string, olderThan: Date, keepRecent: number) {
    const eligible = [...this.operations.values()]
      .filter(
        (operation) =>
          operation.workspaceId === workspaceId &&
          ["synced", "compacted"].includes(operation.status),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const keepIds = new Set(eligible.slice(0, keepRecent).map((operation) => operation.id));
    let deleted = 0;

    for (const operation of eligible) {
      if (keepIds.has(operation.id) || new Date(operation.updatedAt) >= olderThan) {
        continue;
      }

      this.operations.delete(operation.id);
      deleted += 1;
    }

    return deleted;
  }

  private async patch(id: string, patch: Partial<SyncOperationRecord>) {
    const current = this.operations.get(id);

    if (!current) {
      throw new Error("sync operation not found");
    }

    const next = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.operations.set(id, next);

    return next;
  }
}

export class SupabaseSyncOperationRepository implements SyncOperationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async insertOperation(input: InsertSyncOperationInput) {
    const row: SyncOperationInsert = {
      base_version: input.baseVersion ?? null,
      created_by: input.createdBy ?? null,
      entity_id: input.entityId,
      entity_type: input.entityType,
      id: input.id,
      max_attempts: input.maxAttempts ?? SYNC_OPERATION_DEFAULT_MAX_ATTEMPTS,
      operation_type: input.operationType,
      payload: input.payload,
      payload_hash: input.payloadHash,
      status: input.status ?? "queued",
      workspace_id: input.workspaceId,
    };
    const { data, error } = await this.client
      .from("sync_operations")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapRow(data);
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from("sync_operations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapRow(data) : null;
  }

  async findByWorkspace(query: SyncOperationQuery) {
    let request = this.client
      .from("sync_operations")
      .select("*")
      .eq("workspace_id", query.workspaceId)
      .order("created_at", { ascending: false })
      .limit(query.limit ?? 50);

    if (query.status) {
      request = request.eq("status", query.status);
    }

    if (query.entityType) {
      request = request.eq("entity_type", query.entityType);
    }

    if (query.entityId) {
      request = request.eq("entity_id", query.entityId);
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapRow);
  }

  markQueued(id: string) {
    return this.update(id, {
      last_error_code: null,
      last_error_message: null,
      next_retry_at: null,
      status: "queued",
    });
  }

  markSyncingWithLease(id: string, leaseMs = SYNC_OPERATION_LEASE_MS) {
    const now = new Date();

    return this.update(id, {
      attempt_count: undefined,
      lease_expires_at: new Date(now.getTime() + leaseMs).toISOString(),
      locked_at: now.toISOString(),
      status: "syncing",
    }, true);
  }

  markSynced(id: string) {
    return this.update(id, {
      lease_expires_at: null,
      locked_at: null,
      status: "synced",
      synced_at: new Date().toISOString(),
    });
  }

  markRetrying(id: string, nextRetryAt: string, code: string, message: string) {
    return this.update(id, {
      last_error_code: code,
      last_error_message: message,
      lease_expires_at: null,
      locked_at: null,
      next_retry_at: nextRetryAt,
      status: "retrying",
    });
  }

  markFailed(id: string, code: string, message: string) {
    return this.update(id, {
      last_error_code: code,
      last_error_message: message,
      lease_expires_at: null,
      locked_at: null,
      status: "failed",
    });
  }

  markConflicted(id: string, remoteVersion: string | null, conflictSummary: unknown) {
    return this.update(id, {
      conflict_summary: conflictSummary,
      lease_expires_at: null,
      locked_at: null,
      remote_version: remoteVersion,
      status: "conflicted",
    });
  }

  markCancelled(id: string) {
    return this.update(id, {
      cancelled_at: new Date().toISOString(),
      status: "cancelled",
    });
  }

  markCompacted(id: string) {
    return this.update(id, {
      compacted_at: new Date().toISOString(),
      status: "compacted",
    });
  }

  async cleanupSyncedOperations(workspaceId: string, olderThan: Date, keepRecent: number) {
    const { data, error } = await this.client
      .from("sync_operations")
      .select("id,updated_at")
      .eq("workspace_id", workspaceId)
      .in("status", ["synced", "compacted"])
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const ids = (data ?? [])
      .slice(keepRecent)
      .filter((row) => new Date(row.updated_at) < olderThan)
      .map((row) => row.id);

    if (ids.length === 0) {
      return 0;
    }

    const { data: deleted, error: deleteError } = await this.client
      .from("sync_operations")
      .delete()
      .in("id", ids)
      .select("id");

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return deleted?.length ?? 0;
  }

  private async update(
    id: string,
    values: Partial<Sync_Operations>,
    incrementAttempt = false,
  ) {
    const patch = {
      ...values,
      updated_at: new Date().toISOString(),
    };

    if (incrementAttempt) {
      const current = await this.findById(id);
      patch.attempt_count = (current?.attemptCount ?? 0) + 1;
    }

    const { data, error } = await this.client
      .from("sync_operations")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapRow(data);
  }
}

const inMemorySyncOperationRepository = new InMemorySyncOperationRepository();

export function createSyncOperationRepository(): SyncOperationRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseSyncOperationRepository(getNexusSupabaseAdminClient())
    : inMemorySyncOperationRepository;
}

export function toSyncOperationSummary(record: SyncOperationRecord): SyncOperationSummary {
  return {
    attemptCount: record.attemptCount,
    baseVersion: record.baseVersion,
    createdAt: record.createdAt,
    entityId: record.entityId,
    entityType: record.entityType,
    id: record.id,
    lastErrorCode: record.lastErrorCode,
    lastErrorMessage: record.lastErrorMessage,
    maxAttempts: record.maxAttempts,
    nextRetryAt: record.nextRetryAt,
    operationType: record.operationType,
    payloadHash: record.payloadHash,
    remoteVersion: record.remoteVersion,
    status: record.status,
    syncedAt: record.syncedAt,
    updatedAt: record.updatedAt,
    workspaceId: record.workspaceId,
  };
}

function mapRow(row: Sync_Operations): SyncOperationRecord {
  return {
    attemptCount: row.attempt_count,
    baseVersion: row.base_version,
    cancelledAt: row.cancelled_at,
    compactedAt: row.compacted_at,
    conflictSummary: row.conflict_summary,
    createdAt: row.created_at,
    createdBy: row.created_by,
    entityId: row.entity_id,
    entityType: row.entity_type,
    id: row.id,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    leaseExpiresAt: row.lease_expires_at,
    lockedAt: row.locked_at,
    maxAttempts: row.max_attempts,
    nextRetryAt: row.next_retry_at,
    operationType: row.operation_type,
    payload: row.payload,
    payloadHash: row.payload_hash,
    remoteVersion: row.remote_version,
    status: row.status,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
    workspaceId: row.workspace_id,
  };
}
