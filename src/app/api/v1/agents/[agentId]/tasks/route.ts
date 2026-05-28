import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createRequestValidator,
  validationIssue,
  type ApiValidationIssue,
} from "@/lib/backend/api/api-request-validator";
import { createAgentRuntimeService } from "@/lib/backend/runtime/agent-runtime-service";
import { isAgentTaskType } from "@/lib/backend/runtime/runtime-constants";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type {
  AgentTaskCreateRequest,
  AgentTaskCreateResponse,
} from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

const runtimeService = createAgentRuntimeService();

export async function POST(request: Request, context: RouteContext) {
  const { agentId } = await context.params;

  return apiHandler<AgentTaskCreateRequest, AgentTaskCreateResponse>({
    handler: ({ body, requestId, trace, traceId }) =>
      runtimeService.createTask(agentId, body, {
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
      resourceId: () => agentId,
      resourceType: "workspace",
    },
    route: "/api/v1/agents/[agentId]/tasks",
    validator: createRequestValidator(validateCreateTaskRequest),
    workspaceId: (_request, body) =>
      isRecord(body) && typeof body.workspaceId === "string"
        ? body.workspaceId
        : undefined,
  })(request);
}

function validateCreateTaskRequest(value: unknown) {
  const issues: ApiValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
      ok: false as const,
    };
  }

  if (typeof value.workspaceId !== "string" || !value.workspaceId.trim()) {
    issues.push(validationIssue(["workspaceId"], "required", "workspaceId is required."));
  }

  if (
    typeof value.taskType !== "string" ||
    !isAgentTaskType(value.taskType)
  ) {
    issues.push(validationIssue(["taskType"], "invalid_enum", "taskType is invalid."));
  }

  for (const key of ["provider", "model", "inputMessageId", "outputMessageId", "parentTaskId"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "string") {
      issues.push(validationIssue([key], "invalid_type", `${key} must be a string.`));
    }
  }

  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    issues.push(validationIssue(["metadata"], "invalid_type", "metadata must be an object."));
  }

  return issues.length
    ? {
        issues,
        ok: false as const,
      }
    : {
        data: value as AgentTaskCreateRequest,
        ok: true as const,
      };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
