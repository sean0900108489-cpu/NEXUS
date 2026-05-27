import type {
  WorkspaceCloudSnapshotPayload,
  WorkspaceCloudSnapshotType,
  WorkspaceStateGetResponse,
  WorkspaceStatePutResponse,
} from "@/lib/nexus-types";

import { ApiError } from "../api/api-errors";
import { emitBackendEvent } from "../observability/events";

import {
  calculateWorkspaceSnapshotPayloadSizeBytes,
  computeWorkspaceSnapshotChecksum,
} from "./workspace-snapshot-serializer";
import {
  createWorkspaceSnapshotRepository,
  type WorkspaceSnapshotRepository,
} from "./workspace-snapshot-repository";
import {
  createWorkspaceStateEntityRepository,
  type WorkspaceStateEntityRepository,
} from "./workspace-state-entity-repository";
import { WorkspaceSnapshotValidator } from "./workspace-snapshot-validator";

export type WorkspaceStateServiceDependencies = {
  snapshots?: WorkspaceSnapshotRepository;
  entities?: WorkspaceStateEntityRepository;
  validator?: WorkspaceSnapshotValidator;
};

export type GetWorkspaceStateInput = {
  workspaceId: string;
  requestId?: string;
  traceId?: string;
};

export type SaveWorkspaceStateInput = {
  workspaceId: string;
  userId: string;
  schemaVersion: number;
  snapshot: WorkspaceCloudSnapshotPayload;
  baseChecksum: string | null;
  clientMutationId: string;
  snapshotType?: WorkspaceCloudSnapshotType;
  requestId?: string;
  traceId?: string;
};

export class WorkspaceStateService {
  private readonly snapshots: WorkspaceSnapshotRepository;
  private readonly entities: WorkspaceStateEntityRepository;
  private readonly validator: WorkspaceSnapshotValidator;

  constructor(dependencies: WorkspaceStateServiceDependencies = {}) {
    this.snapshots = dependencies.snapshots ?? createWorkspaceSnapshotRepository();
    this.entities = dependencies.entities ?? createWorkspaceStateEntityRepository();
    this.validator = dependencies.validator ?? new WorkspaceSnapshotValidator();
  }

  async getLatestState(input: GetWorkspaceStateInput): Promise<WorkspaceStateGetResponse> {
    const snapshot = await this.snapshots.getLatestSnapshot(input.workspaceId);

    if (!snapshot) {
      throw new ApiError(
        "WORKSPACE_STATE_NOT_FOUND",
        "Workspace state was not found.",
        404,
      );
    }

    await this.emitWorkspaceStateEvent({
      checksum: snapshot.checksum,
      requestId: input.requestId,
      schemaVersion: snapshot.schemaVersion,
      snapshotStatus: "read",
      traceId: input.traceId,
      workspaceId: input.workspaceId,
    });

    return {
      checksum: snapshot.checksum,
      payloadSizeBytes: snapshot.payloadSizeBytes,
      schemaVersion: snapshot.schemaVersion,
      snapshot: snapshot.payload,
      snapshotType: snapshot.snapshotType,
      updatedAt: snapshot.updatedAt,
      workspaceId: snapshot.workspaceId,
    };
  }

  async saveState(input: SaveWorkspaceStateInput): Promise<WorkspaceStatePutResponse> {
    const snapshotType = input.snapshotType ?? "active";

    if (!input.clientMutationId.trim()) {
      throw new ApiError("VALIDATION_FAILED", "clientMutationId is required.", 400, {
        issues: [
          {
            code: "required",
            message: "clientMutationId is required.",
            path: ["clientMutationId"],
          },
        ],
      });
    }

    const validation = this.validator.validate({
      payload: input.snapshot,
      schemaVersion: input.schemaVersion,
      snapshotType,
      workspaceId: input.workspaceId,
    });
    const checksum = await computeWorkspaceSnapshotChecksum(input.snapshot);
    const remoteChecksum = await this.snapshots.getLatestChecksum(input.workspaceId);

    if (remoteChecksum && input.baseChecksum !== remoteChecksum) {
      throw new ApiError(
        "WORKSPACE_STATE_CONFLICT",
        "Workspace state has changed remotely. Refusing to overwrite the latest cloud snapshot.",
        409,
        {
          baseChecksum: input.baseChecksum,
          conflictType: "checksum_mismatch",
          remoteChecksum,
        },
      );
    }

    if (remoteChecksum === checksum) {
      await this.emitWorkspaceStateEvent({
        checksum,
        payloadSizeBytes: validation.payloadSizeBytes,
        requestId: input.requestId,
        schemaVersion: input.schemaVersion,
        snapshotStatus: "unchanged",
        traceId: input.traceId,
        workspaceId: input.workspaceId,
      });

      return {
        checksum,
        payloadSizeBytes: validation.payloadSizeBytes,
        previousChecksum: remoteChecksum,
        schemaVersion: input.schemaVersion,
        snapshotStatus: "unchanged",
        workspaceId: input.workspaceId,
      };
    }

    const payloadSizeBytes =
      validation.payloadSizeBytes ??
      calculateWorkspaceSnapshotPayloadSizeBytes(input.snapshot);

    await this.snapshots.insertSnapshot({
      checksum,
      payload: input.snapshot,
      payloadSizeBytes,
      schemaVersion: input.schemaVersion,
      snapshotType,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });

    try {
      await this.entities.rebuildProjectionFromSnapshot({
        snapshot: input.snapshot,
        snapshotChecksum: checksum,
        workspaceId: input.workspaceId,
      });
    } catch {
      await this.emitWorkspaceStateEvent({
        checksum,
        errorCode: "WORKSPACE_STATE_PROJECTION_FAILED",
        payloadSizeBytes,
        projectionStatus: "failed",
        requestId: input.requestId,
        schemaVersion: input.schemaVersion,
        snapshotStatus: "saved",
        traceId: input.traceId,
        workspaceId: input.workspaceId,
      });
    }

    await this.emitWorkspaceStateEvent({
      checksum,
      payloadSizeBytes,
      requestId: input.requestId,
      schemaVersion: input.schemaVersion,
      snapshotStatus: "saved",
      traceId: input.traceId,
      workspaceId: input.workspaceId,
    });

    return {
      checksum,
      payloadSizeBytes,
      previousChecksum: remoteChecksum,
      schemaVersion: input.schemaVersion,
      snapshotStatus: "saved",
      workspaceId: input.workspaceId,
    };
  }

  private async emitWorkspaceStateEvent(event: {
    checksum?: string;
    errorCode?: string;
    payloadSizeBytes?: number;
    projectionStatus?: "failed";
    requestId?: string;
    schemaVersion?: number;
    snapshotStatus: "read" | "saved" | "unchanged";
    traceId?: string;
    workspaceId: string;
  }) {
    try {
      await emitBackendEvent({
        name: "workspace.state.snapshot",
        payload: {
          checksum: event.checksum,
          errorCode: event.errorCode,
          payloadSizeBytes: event.payloadSizeBytes,
          projectionStatus: event.projectionStatus,
          resourceType: "workspace_state",
          schemaVersion: event.schemaVersion,
          snapshotStatus: event.snapshotStatus,
          source: "sync",
          workspaceId: event.workspaceId,
        },
        status: event.errorCode ? "failed" : "succeeded",
        trace: {
          requestId: event.requestId ?? "request-unknown",
          resourceType: "workspace_state",
          source: "sync",
          traceId: event.traceId ?? "trace-unknown",
          workspaceId: event.workspaceId,
        },
      });
    } catch {
      // V3 uses the V0 no-op/minimal hook only. Event failures must not create a queue.
    }
  }
}

export function createWorkspaceStateService(dependencies?: WorkspaceStateServiceDependencies) {
  return new WorkspaceStateService(dependencies);
}
