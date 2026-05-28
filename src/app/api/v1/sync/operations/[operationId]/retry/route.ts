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

type RetryRequestBody = {
  workspaceId: string;
  baseVersion?: string | null;
};

type RouteContext = {
  params: Promise<{ operationId: string }>;
};

const syncQueueService = createSyncQueueService();

export async function POST(request: Request, context: RouteContext) {
  const { operationId } = await context.params;

  return apiHandler<RetryRequestBody, SyncOperationSummary>({
    handler: ({ body, requestId, trace, traceId }) =>
      syncQueueService.retryOperation(operationId, body, {
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
    route: "/api/v1/sync/operations/[operationId]/retry",
    validator: validateRetryRequest,
    workspaceId: (_request, body) =>
      body && typeof body === "object" && "workspaceId" in body
        ? (body as RetryRequestBody).workspaceId
        : undefined,
  })(request);
}

const validateRetryRequest = createRequestValidator<RetryRequestBody>((value) => {
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

  if (
    value.baseVersion !== undefined &&
    value.baseVersion !== null &&
    typeof value.baseVersion !== "string"
  ) {
    issues.push(validationIssue(["baseVersion"], "invalid_type", "baseVersion must be a string or null."));
  }

  return issues.length
    ? { issues, ok: false }
    : { data: value as RetryRequestBody, ok: true };
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
