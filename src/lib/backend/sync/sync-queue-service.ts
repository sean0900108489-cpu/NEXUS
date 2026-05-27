import type {
  SyncEntityType,
  SyncOperationRequest,
  SyncOperationResponse,
  SyncOperationType,
  SyncStatusResponse,
} from "@/lib/nexus-types";

import { ApiError, sanitizeErrorMessage } from "../api/api-errors";
import { emitBackendEvent } from "../observability/events";
import type { PermissionService } from "../security/permission-service";
import { SecretBoundaryService } from "../security/secret-boundary-service";
import { createWorkspaceStatePermissionService } from "../workspace/workspace-permission";

import {
  calculateSyncRetryAt,
  canTransitionSyncStatus,
  isAutoRetryableSyncError,
  isSyncEntityType,
  isSyncOperationStatus,
  isSyncOperationType,
  SYNC_OPERATION_DEFAULT_MAX_ATTEMPTS,
  SYNC_PAYLOAD_MAX_BYTES,
} from "./sync-constants";
import { SyncConflictResolver } from "./sync-conflict-resolver";
import { createSyncPayloadHash, getPayloadSizeBytes } from "./sync-hash";
import {
  createSyncOperationRepository,
  toSyncOperationSummary,
  type SyncOperationRecord,
  type SyncOperationRepository,
} from "./sync-operation-repository";
import { SyncOperationApplier } from "./sync-operation-applier";

export type SyncQueueServiceDependencies = {
  repository?: SyncOperationRepository;
  applier?: SyncOperationApplier;
  conflictResolver?: SyncConflictResolver;
  secretBoundaryService?: SecretBoundaryService;
  permissionService?: PermissionService;
  inlineApply?: boolean;
};

export type SyncQueueContext = {
  requestId?: string;
  traceId?: string;
  userId?: string;
};

export class SyncQueueService {
  private readonly repository: SyncOperationRepository;
  private readonly applier: SyncOperationApplier;
  private readonly conflictResolver: SyncConflictResolver;
  private readonly secretBoundaryService: SecretBoundaryService;
  private readonly permissionService: PermissionService;
  private readonly inlineApply: boolean;

  constructor(dependencies: SyncQueueServiceDependencies = {}) {
    this.repository = dependencies.repository ?? createSyncOperationRepository();
    this.applier = dependencies.applier ?? new SyncOperationApplier();
    this.conflictResolver = dependencies.conflictResolver ?? new SyncConflictResolver();
    this.secretBoundaryService =
      dependencies.secretBoundaryService ?? new SecretBoundaryService();
    this.permissionService =
      dependencies.permissionService ?? createWorkspaceStatePermissionService();
    this.inlineApply = dependencies.inlineApply ?? process.env.SYNC_QUEUE_INLINE_APPLY !== "false";
  }

  async createOperation(
    input: SyncOperationRequest,
    context: SyncQueueContext = {},
  ): Promise<SyncOperationResponse> {
    const entityType = normalizeEntityType(input.entityType);
    const operationType = normalizeOperationType(input.operationType);

    this.assertPayloadSafe(input.payload);

    const payloadHash = await createSyncPayloadHash(input.payload);
    const existing = await this.repository.findById(input.clientMutationId);

    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw new ApiError(
          "SYNC_OPERATION_CONFLICT",
          "Sync operation conflicts with an existing operation.",
          409,
          {
            operationId: input.clientMutationId,
          },
        );
      }

      return {
        deduplicated: true,
        operation: toSyncOperationSummary(existing),
      };
    }

    if (input.payloadHash && input.payloadHash !== payloadHash) {
      throw new ApiError(
        "SYNC_OPERATION_CONFLICT",
        "Client payload hash does not match canonical server hash.",
        409,
        {
          operationId: input.clientMutationId,
        },
      );
    }

    const conflict = this.conflictResolver.detectConflict({
      baseVersion: input.baseVersion ?? null,
      payloadHash,
    });

    if (conflict.conflicted) {
      const operation = await this.repository.insertOperation({
        baseVersion: input.baseVersion ?? null,
        createdBy: context.userId ?? null,
        entityId: input.entityId,
        entityType,
        id: input.clientMutationId,
        maxAttempts: SYNC_OPERATION_DEFAULT_MAX_ATTEMPTS,
        operationType,
        payload: input.payload,
        payloadHash,
        status: "conflicted",
        workspaceId: input.workspaceId,
      });
      await this.repository.markConflicted(
        operation.id,
        conflict.remoteVersion,
        conflict.summary,
      );

      return {
        deduplicated: false,
        operation: toSyncOperationSummary(operation),
      };
    }

    let operation = await this.repository.insertOperation({
      baseVersion: input.baseVersion ?? null,
      createdBy: context.userId ?? null,
      entityId: input.entityId,
      entityType,
      id: input.clientMutationId,
      maxAttempts: SYNC_OPERATION_DEFAULT_MAX_ATTEMPTS,
      operationType,
      payload: input.payload,
      payloadHash,
      status: "queued",
      workspaceId: input.workspaceId,
    });

    if (this.inlineApply) {
      operation = await this.tryApply(operation, context);
    }

    await this.emitSyncEvent(operation, context);

    return {
      deduplicated: false,
      operation: toSyncOperationSummary(operation),
    };
  }

  async getStatus(query: {
    workspaceId: string;
    status?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    limit?: number | null;
  }): Promise<SyncStatusResponse> {
    const status =
      query.status && isSyncOperationStatus(query.status)
        ? query.status
        : undefined;
    const entityType =
      query.entityType && isSyncEntityType(query.entityType)
        ? query.entityType
        : undefined;
    const operations = await this.repository.findByWorkspace({
      entityId: query.entityId ?? undefined,
      entityType,
      limit: clampLimit(query.limit),
      status,
      workspaceId: query.workspaceId,
    });
    const counts = countStatuses(operations);
    const latestError = operations.find((operation) =>
      ["failed", "conflicted", "retrying"].includes(operation.status),
    );
    const nextRetryAt = operations
      .map((operation) => operation.nextRetryAt)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;

    return {
      counts,
      latestError: latestError?.lastErrorCode
        ? {
            code: latestError.lastErrorCode,
            message: latestError.lastErrorMessage ?? "Sync operation failed.",
            operationId: latestError.id,
            updatedAt: latestError.updatedAt,
          }
        : undefined,
      nextRetryAt,
      operations: operations.map(toSyncOperationSummary),
      workspaceId: query.workspaceId,
    };
  }

  async retryOperation(
    operationId: string,
    input: { workspaceId: string; baseVersion?: string | null },
    context: SyncQueueContext = {},
  ) {
    const operation = await this.requireOperation(operationId, input.workspaceId);

    if (operation.status === "conflicted" && !input.baseVersion) {
      throw new ApiError(
        "SYNC_OPERATION_NOT_RETRYABLE",
        "Conflicted sync operation requires an explicit base version before retry.",
        409,
      );
    }

    if (!["failed", "retrying", "conflicted"].includes(operation.status)) {
      throw new ApiError(
        "SYNC_OPERATION_NOT_RETRYABLE",
        "Sync operation cannot be retried.",
        409,
      );
    }

    let queued = await this.repository.markQueued(operation.id);

    if (this.inlineApply) {
      queued = await this.tryApply(queued, context);
    }

    await this.emitSyncEvent(queued, context);

    return toSyncOperationSummary(queued);
  }

  async cancelOperation(
    operationId: string,
    input: { workspaceId: string },
    context: SyncQueueContext = {},
  ) {
    const operation = await this.requireOperation(operationId, input.workspaceId);

    if (operation.status === "synced" || operation.status === "compacted") {
      return toSyncOperationSummary(operation);
    }

    if (!["pending", "queued", "retrying"].includes(operation.status)) {
      throw new ApiError(
        "SYNC_OPERATION_NOT_CANCELLABLE",
        "Sync operation cannot be cancelled.",
        409,
      );
    }

    if (isHighRiskCancel(operation)) {
      const decision = await this.permissionService.requireWorkspaceRole(
        {
          action: "sync.cancel",
          minRole: "admin",
          resourceId: operation.id,
          resourceType: "workspace",
          userId: context.userId ?? "",
          workspaceId: operation.workspaceId,
        },
        {
          requestId: context.requestId,
          traceId: context.traceId,
        },
      );

      if (decision.decision !== "allow") {
        throw new ApiError("PERMISSION_DENIED", "Permission denied.", 403);
      }
    }

    const cancelled = await this.repository.markCancelled(operation.id);
    await this.emitSyncEvent(cancelled, context);

    return toSyncOperationSummary(cancelled);
  }

  async cleanupSyncedOperations(workspaceId: string, olderThan: Date, keepRecent = 500) {
    return this.repository.cleanupSyncedOperations(workspaceId, olderThan, keepRecent);
  }

  private async tryApply(operation: SyncOperationRecord, context: SyncQueueContext) {
    if (!canTransitionSyncStatus(operation.status, "syncing")) {
      return operation;
    }

    const syncing = await this.repository.markSyncingWithLease(operation.id);

    try {
      const result = await this.applier.apply(syncing);

      if (result.status === "applied") {
        return this.repository.markSynced(syncing.id);
      }

      if (result.status === "queued") {
        return this.repository.markQueued(syncing.id);
      }

      return this.repository.markFailed(
        syncing.id,
        result.code,
        sanitizeErrorMessage(result.message),
      );
    } catch (error) {
      const apiError = normalizeSyncApplyError(error);

      if (apiError.code === "WORKSPACE_STATE_CONFLICT" || apiError.code === "SYNC_CONFLICT") {
        return this.repository.markConflicted(syncing.id, null, {
          conflictType: "checksum_mismatch",
          reasonCode: apiError.code,
        });
      }

      if (
        isAutoRetryableSyncError(apiError.code) &&
        syncing.attemptCount < syncing.maxAttempts
      ) {
        return this.repository.markRetrying(
          syncing.id,
          calculateSyncRetryAt(syncing.attemptCount),
          apiError.code,
          apiError.message,
        );
      }

      return this.repository.markFailed(syncing.id, apiError.code, apiError.message);
    } finally {
      await this.emitSyncEvent(syncing, context);
    }
  }

  private assertPayloadSafe(payload: unknown) {
    const payloadSizeBytes = getPayloadSizeBytes(payload);

    if (payloadSizeBytes > SYNC_PAYLOAD_MAX_BYTES) {
      throw new ApiError(
        "SYNC_PAYLOAD_TOO_LARGE",
        "Sync payload exceeds the allowed size.",
        413,
        {
          maxPayloadSizeBytes: SYNC_PAYLOAD_MAX_BYTES,
          payloadSizeBytes,
        },
      );
    }

    const scan = this.secretBoundaryService.scanForSecrets(payload);

    if (scan.hasSecrets) {
      throw new ApiError(
        "SYNC_SECRET_DETECTED",
        "Sync payload contains a secret and was rejected.",
        400,
        {
          matchCount: scan.matches.length,
          redactionStatus: "redacted",
        },
      );
    }
  }

  private async requireOperation(operationId: string, workspaceId: string) {
    const operation = await this.repository.findById(operationId);

    if (!operation || operation.workspaceId !== workspaceId) {
      throw new ApiError(
        "SYNC_OPERATION_NOT_FOUND",
        "Sync operation was not found.",
        404,
      );
    }

    return operation;
  }

  private async emitSyncEvent(
    operation: SyncOperationRecord,
    context: SyncQueueContext,
  ) {
    try {
      await emitBackendEvent({
        name: "sync.operation.status",
        payload: {
          attemptCount: operation.attemptCount,
          entityId: operation.entityId,
          entityType: operation.entityType,
          errorCode: operation.lastErrorCode ?? undefined,
          operationId: operation.id,
          operationType: operation.operationType,
          source: "sync",
          syncStatus: operation.status,
          workspaceId: operation.workspaceId,
        },
        status: operation.status === "synced" ? "succeeded" : "pending",
        trace: {
          requestId: context.requestId ?? "request-unknown",
          resourceId: operation.id,
          resourceType: "sync_operation",
          source: "sync",
          traceId: context.traceId ?? "trace-unknown",
          workspaceId: operation.workspaceId,
        },
      });
    } catch {
      // V4 emits only through the V0 minimal hook. Event failure must not enqueue work.
    }
  }
}

export function createSyncQueueService(dependencies?: SyncQueueServiceDependencies) {
  return new SyncQueueService(dependencies);
}

function normalizeEntityType(value: string): SyncEntityType {
  if (!isSyncEntityType(value)) {
    throw new ApiError(
      "SYNC_DOMAIN_NOT_SUPPORTED",
      "Sync domain is not supported by the V4 operation applier.",
      400,
      {
        entityType: value,
      },
    );
  }

  return value;
}

function normalizeOperationType(value: string): SyncOperationType {
  if (!isSyncOperationType(value)) {
    throw new ApiError("VALIDATION_FAILED", "Sync operation type is invalid.", 400, {
      operationType: value,
    });
  }

  return value;
}

function normalizeSyncApplyError(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const candidate = error as { code?: unknown; message?: unknown };

    return {
      code: typeof candidate.code === "string" ? candidate.code : "INTERNAL_ERROR",
      message:
        typeof candidate.message === "string"
          ? sanitizeErrorMessage(candidate.message)
          : "Sync operation failed.",
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Sync operation failed.",
  };
}

function countStatuses(operations: SyncOperationRecord[]): SyncStatusResponse["counts"] {
  const counts: SyncStatusResponse["counts"] = {
    conflicted: 0,
    failed: 0,
    pending: 0,
    queued: 0,
    retrying: 0,
    syncing: 0,
  };

  for (const operation of operations) {
    if (operation.status in counts) {
      counts[operation.status as keyof typeof counts] += 1;
    }
  }

  return counts;
}

function clampLimit(limit?: number | null) {
  if (!limit || !Number.isFinite(limit)) {
    return 50;
  }

  return Math.min(100, Math.max(1, Math.floor(limit)));
}

function isHighRiskCancel(operation: SyncOperationRecord) {
  return operation.operationType === "delete" || operation.entityType === "workspace";
}
