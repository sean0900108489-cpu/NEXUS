import type { WorkspaceStatePutRequest } from "@/lib/nexus-types";

import { ApiError } from "../api/api-errors";
import { createWorkspaceStateService, type WorkspaceStateService } from "../workspace/workspace-state-service";

import type { SyncOperationRecord } from "./sync-operation-repository";

export type SyncOperationApplyResult =
  | { status: "applied"; remoteVersion?: string | null }
  | { status: "queued" }
  | { status: "unsupported"; code: "SYNC_DOMAIN_NOT_SUPPORTED"; message: string };

export type SyncOperationApplierDependencies = {
  workspaceStateService?: WorkspaceStateService;
};

export class SyncOperationApplier {
  private readonly workspaceStateService: WorkspaceStateService;

  constructor(dependencies: SyncOperationApplierDependencies = {}) {
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

    if (
      ["agent", "message", "prompt", "notebook", "artifact_reference"].includes(
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
