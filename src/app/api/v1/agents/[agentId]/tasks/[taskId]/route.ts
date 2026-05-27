import { apiHandler } from "@/lib/backend/api/api-handler";
import { createAgentRuntimeService } from "@/lib/backend/runtime/agent-runtime-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type { AgentTaskStatusResponse } from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ agentId: string; taskId: string }>;
};

const runtimeService = createAgentRuntimeService();

export async function GET(request: Request, context: RouteContext) {
  const { agentId, taskId } = await context.params;

  return apiHandler<undefined, AgentTaskStatusResponse>({
    handler: ({ workspaceId }) =>
      runtimeService.getTask({
        agentId,
        taskId,
        workspaceId,
      }),
    methods: ["GET"],
    permission: {
      action: "workspace.read",
      permissionService: createWorkspaceStatePermissionService(),
      resourceId: () => taskId,
      resourceType: "workspace",
    },
    route: "/api/v1/agents/[agentId]/tasks/[taskId]",
    workspaceId: (routeRequest) =>
      new URL(routeRequest.url).searchParams.get("workspaceId") ??
      routeRequest.headers.get("X-Workspace-Id") ??
      undefined,
  })(request);
}
