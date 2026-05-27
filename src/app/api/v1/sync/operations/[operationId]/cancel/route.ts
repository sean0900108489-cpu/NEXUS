import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createRequestValidator,
  validationIssue,
  type ApiValidationIssue,
} from "@/lib/backend/api/api-request-validator";
import { createSyncQueueService } from "@/lib/backend/sync/sync-queue-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type { SyncOperationSummary } from "@/lib/nexus-types";

export const runtime = "nodejs";

type CancelRequestBody = {
  workspaceId: string;
};

type RouteContext = {
  params: Promise<{ operationId: string }>;
};

const syncQueueService = createSyncQueueService();

export async function POST(request: Request, context: RouteContext) {
  const { operationId } = await context.params;

  return apiHandler<CancelRequestBody, SyncOperationSummary>({
    handler: ({ body, requestId, trace, traceId }) =>
      syncQueueService.cancelOperation(operationId, body, {
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
      resourceId: () => operationId,
      resourceType: "workspace",
    },
    route: "/api/v1/sync/operations/[operationId]/cancel",
    validator: validateCancelRequest,
    workspaceId: (_request, body) =>
      body && typeof body === "object" && "workspaceId" in body
        ? (body as CancelRequestBody).workspaceId
        : undefined,
  })(request);
}

const validateCancelRequest = createRequestValidator<CancelRequestBody>((value) => {
  const issues: ApiValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
      ok: false,
    };
  }

  if (typeof value.workspaceId !== "string" || !value.workspaceId.trim()) {
    issues.push(validationIssue(["workspaceId"], "required", "workspaceId is required."));
  }

  return issues.length
    ? { issues, ok: false }
    : { data: value as CancelRequestBody, ok: true };
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
