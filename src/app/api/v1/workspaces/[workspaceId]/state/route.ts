import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createRequestValidator,
  validationIssue,
  type ApiValidationIssue,
} from "@/lib/backend/api/api-request-validator";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import { createWorkspaceStateService } from "@/lib/backend/workspace/workspace-state-service";
import type {
  WorkspaceCloudSnapshotType,
  WorkspaceStateGetResponse,
  WorkspaceStatePutRequest,
  WorkspaceStatePutResponse,
} from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

const workspaceStateService = createWorkspaceStateService();
const validSnapshotTypes = new Set<WorkspaceCloudSnapshotType>([
  "active",
  "checkpoint",
  "imported",
  "recovered",
]);

export async function GET(request: Request, context: RouteContext) {
  const { workspaceId } = await context.params;

  return apiHandler<undefined, WorkspaceStateGetResponse>({
    handler: ({ requestId, traceId }) =>
      workspaceStateService.getLatestState({
        requestId,
        traceId,
        workspaceId,
      }),
    methods: ["GET"],
    permission: {
      action: "workspace.read",
      permissionService: createWorkspaceStatePermissionService(),
      resourceId: () => workspaceId,
      resourceType: "workspace",
    },
    route: "/api/v1/workspaces/[workspaceId]/state",
    workspaceId: () => workspaceId,
  })(request);
}

export async function PUT(request: Request, context: RouteContext) {
  const { workspaceId } = await context.params;

  return apiHandler<WorkspaceStatePutRequest, WorkspaceStatePutResponse>({
    handler: ({ body, requestId, trace, traceId }) =>
      workspaceStateService.saveState({
        baseChecksum: body.baseChecksum,
        clientMutationId: body.clientMutationId,
        requestId,
        schemaVersion: body.schemaVersion,
        snapshot: body.snapshot,
        snapshotType: body.snapshotType ?? "active",
        traceId,
        userId: trace.userId ?? "",
        workspaceId,
      }),
    idempotency: {
      enabled: true,
    },
    methods: ["PUT"],
    permission: {
      action: "workspace.update",
      permissionService: createWorkspaceStatePermissionService(),
      resourceId: () => workspaceId,
      resourceType: "workspace",
    },
    route: "/api/v1/workspaces/[workspaceId]/state",
    validator: validateWorkspaceStatePutRequest,
    workspaceId: () => workspaceId,
  })(request);
}

const validateWorkspaceStatePutRequest = createRequestValidator<WorkspaceStatePutRequest>(
  (value) => {
    const issues: ApiValidationIssue[] = [];

    if (!isRecord(value)) {
      return {
        issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
        ok: false,
      };
    }

    if (typeof value.schemaVersion !== "number") {
      issues.push(validationIssue(["schemaVersion"], "invalid_type", "schemaVersion must be a number."));
    }

    if (!isRecord(value.snapshot)) {
      issues.push(validationIssue(["snapshot"], "invalid_type", "snapshot must be an object."));
    }

    if (value.baseChecksum !== null && typeof value.baseChecksum !== "string") {
      issues.push(validationIssue(["baseChecksum"], "invalid_type", "baseChecksum must be a string or null."));
    }

    if (typeof value.clientMutationId !== "string" || !value.clientMutationId.trim()) {
      issues.push(validationIssue(["clientMutationId"], "required", "clientMutationId is required."));
    }

    if (
      value.snapshotType !== undefined &&
      (typeof value.snapshotType !== "string" ||
        !validSnapshotTypes.has(value.snapshotType as WorkspaceCloudSnapshotType))
    ) {
      issues.push(validationIssue(["snapshotType"], "invalid_enum", "snapshotType is invalid."));
    }

    return issues.length
      ? {
          issues,
          ok: false,
        }
      : {
          data: value as WorkspaceStatePutRequest,
          ok: true,
        };
  },
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
