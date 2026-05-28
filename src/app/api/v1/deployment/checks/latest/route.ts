import { apiHandler } from "@/lib/backend/api/api-handler";
import { createDeploymentCheckService } from "@/lib/backend/deployment/deployment-check-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type { LatestDeploymentCheckResult } from "@/lib/backend/deployment/deployment-types";

export const runtime = "nodejs";

const deploymentCheckService = createDeploymentCheckService();

export const GET = apiHandler<undefined, LatestDeploymentCheckResult>({
  handler: () => deploymentCheckService.getLatest(),
  methods: ["GET"],
  permission: {
    action: "provider_settings.update",
    permissionService: createWorkspaceStatePermissionService(),
    resourceType: "settings",
  },
  route: "/api/v1/deployment/checks/latest",
  workspaceId: (request) => readWorkspaceId(request),
});

function readWorkspaceId(request: Request) {
  return (
    new URL(request.url).searchParams.get("workspaceId") ??
    request.headers.get("X-Workspace-Id") ??
    undefined
  );
}
