import { apiHandler } from "@/lib/backend/api/api-handler";
import { createToolExecutionService } from "@/lib/backend/tools/tool-execution-service";
import type { ToolRunRecord } from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ toolRunId: string }>;
};

const toolExecutionService = createToolExecutionService();

export async function GET(request: Request, context: RouteContext) {
  const { toolRunId } = await context.params;

  return apiHandler<undefined, { toolRun: ToolRunRecord }>({
    handler: ({ requestId, trace, traceId, workspaceId }) =>
      toolExecutionService.getToolRun(
        toolRunId,
        {
          workspaceId,
        },
        {
          requestId,
          traceId,
          userId: trace.userId,
        },
      ),
    methods: ["GET"],
    route: "/api/v1/tool-runs/[toolRunId]",
    workspaceId: (routeRequest) =>
      new URL(routeRequest.url).searchParams.get("workspaceId") ??
      routeRequest.headers.get("X-Workspace-Id") ??
      undefined,
  })(request);
}
