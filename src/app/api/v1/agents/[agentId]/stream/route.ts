import { emitBackendEvent } from "@/lib/backend/observability/events";
import {
  createAgentStreamResponse,
  createStreamId,
} from "@/lib/backend/api/agent-stream-service";
import {
  getApiErrorDescriptor,
  toApiError,
} from "@/lib/backend/api/api-errors";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const startedAt = Date.now();
  const { agentId } = await context.params;
  const requestId = request.headers.get("X-Request-Id") ?? createStreamId("req");
  const traceId = request.headers.get("X-Trace-Id") ?? createStreamId("trace");
  const workspaceId = request.headers.get("X-Workspace-Id") ?? undefined;

  try {
    const response = await createAgentStreamResponse({
      agentId,
      eventShape: "v1",
      request,
      requestId,
      traceId,
      workspaceId,
    });

    await emitBackendEvent({
      name: "api.v1.stream.open",
      payload: {
        idempotencyHit: false,
        latencyMs: Date.now() - startedAt,
        method: "POST",
        route: "/api/v1/agents/[agentId]/stream",
        source: "api",
        statusCode: 200,
        workspaceId,
      },
      status: "running",
      trace: {
        requestId,
        resourceId: agentId,
        resourceType: "agent",
        source: "api",
        traceId,
        workspaceId,
      },
    });

    return response;
  } catch (error) {
    const apiError = toApiError(error);
    const descriptor = getApiErrorDescriptor(apiError.code);

    await emitBackendEvent({
      name: "api.v1.stream.open",
      payload: {
        errorCode: apiError.code,
        latencyMs: Date.now() - startedAt,
        method: "POST",
        retryable: descriptor.retryable,
        route: "/api/v1/agents/[agentId]/stream",
        source: "api",
        statusCode: apiError.statusCode,
        workspaceId,
      },
      status: "failed",
      trace: {
        requestId,
        resourceId: agentId,
        resourceType: "agent",
        source: "api",
        traceId,
        userId: request.headers.get("X-User-Id") ?? undefined,
        workspaceId,
      },
    });

    return Response.json(
      {
        error: {
          code: apiError.code,
          details: apiError.details,
          message: apiError.message || descriptor.message,
          retryable: descriptor.retryable,
        },
        type: "error",
      },
      { status: apiError.statusCode },
    );
  }
}
