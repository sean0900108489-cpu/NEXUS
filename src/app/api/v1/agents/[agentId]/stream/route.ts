import { emitBackendEvent } from "@/lib/backend/observability/events";
import {
  createAgentStreamResponse,
  createStreamId,
} from "@/lib/backend/api/agent-stream-service";

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
  } catch {
    await emitBackendEvent({
      name: "api.v1.stream.open",
      payload: {
        errorCode: "VALIDATION_FAILED",
        latencyMs: Date.now() - startedAt,
        method: "POST",
        retryable: false,
        route: "/api/v1/agents/[agentId]/stream",
        source: "api",
        statusCode: 400,
        workspaceId,
      },
      status: "failed",
      trace: {
        requestId,
        resourceId: agentId,
        resourceType: "agent",
        source: "api",
        traceId,
        workspaceId,
      },
    });

    return Response.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid stream request.",
          retryable: false,
        },
        type: "error",
      },
      { status: 400 },
    );
  }
}
