import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createRequestValidator,
  validationIssue,
} from "@/lib/backend/api/api-request-validator";
import { createAgentRuntimeService } from "@/lib/backend/runtime/agent-runtime-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type { AgentTaskCancelResponse } from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ agentId: string; taskId: string }>;
};

type CancelTaskRequest = {
  workspaceId: string;
};

const runtimeService = createAgentRuntimeService();

export async function POST(request: Request, context: RouteContext) {
  const { agentId, taskId } = await context.params;

  return apiHandler<CancelTaskRequest, AgentTaskCancelResponse>({
    handler: ({ body, requestId, trace, traceId }) =>
      runtimeService.cancelTask(
        {
          agentId,
          taskId,
          workspaceId: body.workspaceId,
        },
        {
          requestId,
          traceId,
          userId: trace.userId,
        },
      ),
    idempotency: {
      enabled: true,
    },
    methods: ["POST"],
    permission: {
      action: "workspace.update",
      permissionService: createWorkspaceStatePermissionService(),
      resourceId: () => taskId,
      resourceType: "workspace",
    },
    route: "/api/v1/agents/[agentId]/tasks/[taskId]/cancel",
    validator: createRequestValidator(validateCancelTaskRequest),
    workspaceId: (_request, body) =>
      isRecord(body) && typeof body.workspaceId === "string"
        ? body.workspaceId
        : undefined,
  })(request);
}

function validateCancelTaskRequest(value: unknown) {
  if (!isRecord(value)) {
    return {
      issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
      ok: false as const,
    };
  }

  if (typeof value.workspaceId !== "string" || !value.workspaceId.trim()) {
    return {
      issues: [validationIssue(["workspaceId"], "required", "workspaceId is required.")],
      ok: false as const,
    };
  }

  return {
    data: value as CancelTaskRequest,
    ok: true as const,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
