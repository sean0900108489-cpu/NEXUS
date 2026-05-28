import type { NotebookRecord, WorkspaceStatePutRequest } from "@/lib/nexus-types";

import { ApiError } from "../api/api-errors";
import { createNotebookService, type NotebookService } from "../notebooks/notebook-service";
import { createWorkspaceStateService, type WorkspaceStateService } from "../workspace/workspace-state-service";

import type { SyncOperationRecord } from "./sync-operation-repository";

export type SyncOperationApplyResult =
  | { status: "applied"; remoteVersion?: string | null }
  | { status: "queued" }
  | { status: "unsupported"; code: "SYNC_DOMAIN_NOT_SUPPORTED"; message: string };

export type SyncOperationApplierDependencies = {
  notebookService?: NotebookService;
  workspaceStateService?: WorkspaceStateService;
};

export class SyncOperationApplier {
  private readonly notebookService: NotebookService;
  private readonly workspaceStateService: WorkspaceStateService;

  constructor(dependencies: SyncOperationApplierDependencies = {}) {
    this.notebookService = dependencies.notebookService ?? createNotebookService();
    this.workspaceStateService =
      dependencies.workspaceStateService ?? createWorkspaceStateService();
  }

  async apply(operation: SyncOperationRecord): Promise<SyncOperationApplyResult> {
    if (operation.entityType === "workspace" && operation.operationType === "snapshot") {
      const payload = operation.payload;

      if (!isWorkspaceSnapshotSyncPayload(payload)) {
        throw new ApiError(
          "VALIDATION_FAILED",
          "Workspace snapshot sync payload is invalid.",
          400,
        );
      }

      const result = await this.workspaceStateService.saveState({
        baseChecksum: payload.baseChecksum,
        clientMutationId: payload.clientMutationId,
        schemaVersion: payload.schemaVersion,
        snapshot: payload.snapshot,
        snapshotType: payload.snapshotType,
        userId: operation.createdBy ?? "",
        workspaceId: operation.workspaceId,
      });

      return {
        remoteVersion: result.checksum,
        status: "applied",
      };
    }

    if (operation.entityType === "notebook") {
      if (["create", "update", "upsert"].includes(operation.operationType)) {
        const notebook = normalizeNotebookPayload(operation);
        const result = await this.notebookService.upsertNotebook(
          {
            content: notebook.content,
            createdAt: notebook.created_at ?? null,
            id: notebook.id,
            title: notebook.title,
            updatedAt: notebook.updated_at ?? null,
            workspaceId: notebook.workspace_id ?? operation.workspaceId,
          },
          {
            userId: operation.createdBy ?? undefined,
          },
        );

        return {
          remoteVersion: result.updated_at ?? null,
          status: "applied",
        };
      }

      if (operation.operationType === "delete") {
        await this.notebookService.deleteNotebook(
          normalizeNotebookDeletePayload(operation),
          {
            userId: operation.createdBy ?? undefined,
          },
        );

        return {
          status: "applied",
        };
      }

      throw new ApiError(
        "VALIDATION_FAILED",
        "Notebook sync operation type is invalid.",
        400,
      );
    }

    if (
      ["agent", "message", "prompt", "artifact_reference"].includes(
        operation.entityType,
      )
    ) {
      return { status: "queued" };
    }

    return {
      code: "SYNC_DOMAIN_NOT_SUPPORTED",
      message: "Sync domain is not supported by the V4 operation applier.",
      status: "unsupported",
    };
  }
}

function isWorkspaceSnapshotSyncPayload(value: unknown): value is WorkspaceStatePutRequest {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as WorkspaceStatePutRequest).clientMutationId === "string" &&
    typeof (value as WorkspaceStatePutRequest).schemaVersion === "number" &&
    Boolean((value as WorkspaceStatePutRequest).snapshot) &&
    ((value as WorkspaceStatePutRequest).baseChecksum === null ||
      typeof (value as WorkspaceStatePutRequest).baseChecksum === "string")
  );
}

function normalizeNotebookPayload(operation: SyncOperationRecord): NotebookRecord {
  const payload = operation.payload;

  if (!isRecord(payload)) {
    throw new ApiError("VALIDATION_FAILED", "Notebook sync payload is invalid.", 400);
  }

  const id = typeof payload.id === "string" ? payload.id : "";
  const workspaceId =
    typeof payload.workspace_id === "string"
      ? payload.workspace_id
      : typeof payload.workspaceId === "string"
        ? payload.workspaceId
        : operation.workspaceId;
  const title = typeof payload.title === "string" ? payload.title : "";
  const content = typeof payload.content === "string" ? payload.content : "";

  if (id !== operation.entityId || workspaceId !== operation.workspaceId) {
    throw new ApiError(
      "VALIDATION_FAILED",
      "Notebook sync payload identity does not match the sync operation.",
      400,
    );
  }

  return {
    content,
    created_at: typeof payload.created_at === "string" ? payload.created_at : undefined,
    id,
    title,
    updated_at: typeof payload.updated_at === "string" ? payload.updated_at : undefined,
    workspace_id: workspaceId,
  };
}

function normalizeNotebookDeletePayload(operation: SyncOperationRecord) {
  const payload = operation.payload;
  const id = isRecord(payload) && typeof payload.id === "string"
    ? payload.id
    : operation.entityId;
  const workspaceId = isRecord(payload) && typeof payload.workspaceId === "string"
    ? payload.workspaceId
    : operation.workspaceId;

  if (id !== operation.entityId || workspaceId !== operation.workspaceId) {
    throw new ApiError(
      "VALIDATION_FAILED",
      "Notebook delete payload identity does not match the sync operation.",
      400,
    );
  }

  return { id, workspaceId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
