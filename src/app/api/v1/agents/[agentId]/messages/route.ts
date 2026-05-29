import { apiHandler } from "@/lib/backend/api/api-handler";
import { createMessageHistoryService } from "@/lib/backend/history/message-history-service";
import type { MessageHistoryPageResponse } from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { agentId } = await context.params;

  return apiHandler<undefined, MessageHistoryPageResponse>({
    handler: ({ request: routeRequest, requestId, trace, traceId, workspaceId }) => {
      const url = new URL(routeRequest.url);
      const historyService = createMessageHistoryService();

      return historyService.listMessages(
        {
          agentId,
          cursor: url.searchParams.get("cursor"),
          limit: Number(url.searchParams.get("limit") ?? 50),
          workspaceId,
        },
        {
          requestId,
          traceId,
          userId: trace.userId,
        },
      );
    },
    methods: ["GET"],
    auth: {
      required: true,
    },
    route: "/api/v1/agents/[agentId]/messages",
    workspaceId: (routeRequest) =>
      new URL(routeRequest.url).searchParams.get("workspaceId") ??
      routeRequest.headers.get("X-Workspace-Id") ??
      undefined,
  })(request);
}
