import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createRequestValidator,
  validationIssue,
} from "@/lib/backend/api/api-request-validator";
import { getBearerToken } from "@/lib/backend/api/memory-compress-service";
import { createToolExecutionService } from "@/lib/backend/tools/tool-execution-service";
import type {
  ToolRunConfirmRequest,
  ToolRunConfirmResponse,
} from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ toolRunId: string }>;
};

const toolExecutionService = createToolExecutionService();

export async function POST(request: Request, context: RouteContext) {
  const { toolRunId } = await context.params;

  return apiHandler<ToolRunConfirmRequest, ToolRunConfirmResponse>({
    handler: ({ body, request, requestId, trace, traceId }) =>
      toolExecutionService.confirmToolRun(
        toolRunId,
        {
          workspaceId: body.workspaceId,
        },
        {
          requestId,
          runtimeApiKey: getBearerToken(request.headers.get("authorization")),
          traceId,
          userId: trace.userId,
        },
      ),
    idempotency: {
      enabled: true,
    },
    methods: ["POST"],
    route: "/api/v1/tool-runs/[toolRunId]/confirm",
    validator: createRequestValidator(validateConfirmRequest),
    workspaceId: (_request, body) =>
      isRecord(body) && typeof body.workspaceId === "string"
        ? body.workspaceId
        : undefined,
  })(request);
}

function validateConfirmRequest(value: unknown) {
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
    data: value as ToolRunConfirmRequest,
    ok: true as const,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
