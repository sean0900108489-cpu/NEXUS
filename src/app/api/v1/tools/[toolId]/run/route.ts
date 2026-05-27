import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createRequestValidator,
  validationIssue,
  type ApiValidationIssue,
} from "@/lib/backend/api/api-request-validator";
import { getBearerToken } from "@/lib/backend/api/memory-compress-service";
import { createToolExecutionService } from "@/lib/backend/tools/tool-execution-service";
import type { ToolRunRequest, ToolRunResponse } from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ toolId: string }>;
};

const toolExecutionService = createToolExecutionService();

export async function POST(request: Request, context: RouteContext) {
  const { toolId } = await context.params;

  return apiHandler<ToolRunRequest, ToolRunResponse>({
    handler: ({ body, request, requestId, trace, traceId }) =>
      toolExecutionService.runTool(toolId, body, {
        requestId,
        runtimeApiKey: getBearerToken(request.headers.get("authorization")),
        traceId,
        userId: trace.userId,
      }),
    idempotency: {
      enabled: true,
    },
    methods: ["POST"],
    route: "/api/v1/tools/[toolId]/run",
    validator: createRequestValidator(validateToolRunRequest),
    workspaceId: (_request, body) =>
      isRecord(body) && typeof body.workspaceId === "string"
        ? body.workspaceId
        : undefined,
  })(request);
}

function validateToolRunRequest(value: unknown) {
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

  for (const key of ["agentId", "taskId", "scope"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "string") {
      issues.push(validationIssue([key], "invalid_type", `${key} must be a string.`));
    }
  }

  if (value.input !== undefined && !isRecord(value.input)) {
    issues.push(validationIssue(["input"], "invalid_type", "input must be an object."));
  }

  return issues.length
    ? { issues, ok: false as const }
    : { data: value as ToolRunRequest, ok: true as const };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
