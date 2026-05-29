import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createRequestValidator,
  validationIssue,
  type ApiValidationIssue,
} from "@/lib/backend/api/api-request-validator";
import { createMessageHistoryService } from "@/lib/backend/history/message-history-service";
import type {
  MessageArchiveRequest,
  MessageArchiveResponse,
} from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { agentId } = await context.params;

  return apiHandler<MessageArchiveRequest, MessageArchiveResponse>({
    handler: ({ body, requestId, trace, traceId }) =>
      createMessageHistoryService().archiveMessages(agentId, body, {
        requestId,
        traceId,
        userId: trace.userId,
      }),
    idempotency: {
      enabled: true,
    },
    auth: {
      required: true,
    },
    methods: ["POST"],
    route: "/api/v1/agents/[agentId]/messages/archive",
    validator: createRequestValidator(validateArchiveRequest),
    workspaceId: (_request, body) =>
      isRecord(body) && typeof body.workspaceId === "string"
        ? body.workspaceId
        : undefined,
  })(request);
}

function validateArchiveRequest(value: unknown) {
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
    value.keepLatest !== undefined &&
    (typeof value.keepLatest !== "number" || !Number.isFinite(value.keepLatest))
  ) {
    issues.push(
      validationIssue(["keepLatest"], "invalid_type", "keepLatest must be a number."),
    );
  }

  return issues.length
    ? { issues, ok: false as const }
    : { data: value as MessageArchiveRequest, ok: true as const };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
