import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  validationIssue,
  type ApiRequestValidationResult,
  type ApiValidationIssue,
} from "@/lib/backend/api/api-request-validator";
import { createSyncQueueService } from "@/lib/backend/sync/sync-queue-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type { SyncOperationRequest, SyncOperationResponse } from "@/lib/nexus-types";

export const runtime = "nodejs";

const syncQueueService = createSyncQueueService();

export const POST = apiHandler<SyncOperationRequest, SyncOperationResponse>({
  handler: ({ body, requestId, trace, traceId }) =>
    syncQueueService.createOperation(body, {
      requestId,
      traceId,
      userId: trace.userId,
    }),
  idempotency: {
    enabled: true,
  },
  methods: ["POST"],
  permission: {
    action: "workspace.update",
    permissionService: createWorkspaceStatePermissionService(),
    resourceType: "workspace",
  },
  route: "/api/v1/sync/operations",
  validator: validateSyncOperationRequest,
  workspaceId: (_request, body) =>
    body && typeof body === "object" && "workspaceId" in body
      ? (body as { workspaceId?: string }).workspaceId
      : undefined,
});

function validateSyncOperationRequest(
  value: unknown,
): ApiRequestValidationResult<SyncOperationRequest> {
  const issues: ApiValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
      ok: false,
    };
  }

  for (const key of [
    "clientMutationId",
    "workspaceId",
    "entityType",
    "entityId",
    "operationType",
  ] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      issues.push(validationIssue([key], "required", `${key} is required.`));
    }
  }

  if (!isRecord(value.payload)) {
    issues.push(validationIssue(["payload"], "invalid_type", "payload must be an object."));
  }

  if (
    value.baseVersion !== undefined &&
    value.baseVersion !== null &&
    typeof value.baseVersion !== "string"
  ) {
    issues.push(validationIssue(["baseVersion"], "invalid_type", "baseVersion must be a string or null."));
  }

  if (value.payloadHash !== undefined && typeof value.payloadHash !== "string") {
    issues.push(validationIssue(["payloadHash"], "invalid_type", "payloadHash must be a string."));
  }

  return issues.length
    ? { issues, ok: false }
    : { data: value as SyncOperationRequest, ok: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
