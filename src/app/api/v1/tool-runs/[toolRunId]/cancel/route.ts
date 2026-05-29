import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createRequestValidator,
  validationIssue,
} from "@/lib/backend/api/api-request-validator";
import { createToolExecutionService } from "@/lib/backend/tools/tool-execution-service";
import type {
  ToolRunCancelRequest,
  ToolRunCancelResponse,
} from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ toolRunId: string }>;
};

const toolExecutionService = createToolExecutionService();

export async function POST(request: Request, context: RouteContext) {
  const { toolRunId } = await context.params;

  return apiHandler<ToolRunCancelRequest, ToolRunCancelResponse>({
    handler: ({ body, requestId, trace, traceId }) =>
      toolExecutionService.cancelToolRun(
        toolRunId,
        {
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
    auth: {
      required: true,
    },
    methods: ["POST"],
    route: "/api/v1/tool-runs/[toolRunId]/cancel",
    validator: createRequestValidator(validateCancelRequest),
    workspaceId: (_request, body) =>
      isRecord(body) && typeof body.workspaceId === "string"
        ? body.workspaceId
        : undefined,
  })(request);
}

function validateCancelRequest(value: unknown) {
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
    data: value as ToolRunCancelRequest,
    ok: true as const,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
