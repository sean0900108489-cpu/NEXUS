import { apiHandler } from "@/lib/backend/api/api-handler";
import { createFeatureFlagService } from "@/lib/backend/deployment/feature-flag-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type { FeatureFlagsResponse } from "@/lib/nexus-types";

export const runtime = "nodejs";

const featureFlagService = createFeatureFlagService();

export const GET = apiHandler<undefined, FeatureFlagsResponse>({
  handler: ({ request, trace }) => {
    const workspaceId = readWorkspaceId(request);

    return featureFlagService.listFlags({
      userId: trace.userId,
      workspaceId,
    }).then((flags) => ({
      flags,
      workspaceId,
    }));
  },
  methods: ["GET"],
  permission: {
    action: "workspace.read",
    permissionService: createWorkspaceStatePermissionService(),
    resourceType: "workspace",
  },
  route: "/api/v1/feature-flags",
  workspaceId: (request) => readWorkspaceId(request),
});

function readWorkspaceId(request: Request) {
  return (
    new URL(request.url).searchParams.get("workspaceId") ??
    request.headers.get("X-Workspace-Id") ??
    undefined
  );
}
