import {
  createAgentStreamResponse,
  createStreamId,
} from "@/lib/backend/api/agent-stream-service";
import { blockLegacyToolRouteInProduction } from "@/lib/backend/security/legacy-tool-route-boundary";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const blocked = blockLegacyToolRouteInProduction();

  if (blocked) {
    return blocked;
  }

  return createAgentStreamResponse({
    agentId: "legacy-agent",
    eventShape: "legacy",
    request,
    requestId: request.headers.get("X-Request-Id") ?? createStreamId("req"),
    traceId: request.headers.get("X-Trace-Id") ?? createStreamId("trace"),
    workspaceId: request.headers.get("X-Workspace-Id") ?? undefined,
  });
}
