import { apiHandler } from "@/lib/backend/api/api-handler";
import { createToolExecutionService } from "@/lib/backend/tools/tool-execution-service";
import type { ToolRunListResponse } from "@/lib/nexus-types";

export const runtime = "nodejs";

const toolExecutionService = createToolExecutionService();

export const GET = apiHandler<undefined, ToolRunListResponse>({
  handler: ({ request, requestId, trace, traceId, workspaceId }) => {
    const url = new URL(request.url);

    return toolExecutionService.listToolRuns(
      {
        agentId: url.searchParams.get("agentId"),
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
  route: "/api/v1/tool-runs",
  workspaceId: (request) =>
    new URL(request.url).searchParams.get("workspaceId") ??
    request.headers.get("X-Workspace-Id") ??
    undefined,
});
