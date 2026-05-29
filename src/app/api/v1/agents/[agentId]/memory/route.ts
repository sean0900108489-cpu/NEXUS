import { apiHandler } from "@/lib/backend/api/api-handler";
import { isAgentMemoryRecordType } from "@/lib/backend/history/history-constants";
import { createMessageHistoryService } from "@/lib/backend/history/message-history-service";
import type {
  AgentMemoryRecordType,
  AgentMemoryRecordsResponse,
} from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { agentId } = await context.params;

  return apiHandler<undefined, AgentMemoryRecordsResponse>({
    handler: ({ request: routeRequest, requestId, trace, traceId, workspaceId }) => {
      const type = new URL(routeRequest.url).searchParams.get("type");
      const historyService = createMessageHistoryService();

      return historyService.listMemoryRecords(
        {
          agentId,
          memoryType: isAgentMemoryRecordType(type)
            ? (type as AgentMemoryRecordType)
            : null,
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
    route: "/api/v1/agents/[agentId]/memory",
    workspaceId: (routeRequest) =>
      new URL(routeRequest.url).searchParams.get("workspaceId") ??
      routeRequest.headers.get("X-Workspace-Id") ??
      undefined,
  })(request);
}
