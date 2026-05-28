import { apiHandler } from "@/lib/backend/api/api-handler";
import { createArtifactService } from "@/lib/backend/artifacts/artifact-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type { ArtifactGetResponse } from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ artifactId: string }>;
};

const artifactService = createArtifactService();
const permissionService = createWorkspaceStatePermissionService();

export async function GET(request: Request, context: RouteContext) {
  const { artifactId } = await context.params;

  return apiHandler<undefined, ArtifactGetResponse>({
    handler: ({ workspaceId }) =>
      artifactService.getArtifact(artifactId, {
        workspaceId,
      }),
    methods: ["GET"],
    permission: {
      action: "workspace.read",
      permissionService,
      resourceId: () => artifactId,
      resourceType: "artifact",
    },
    route: "/api/v1/artifacts/[artifactId]",
    workspaceId: (routeRequest) =>
      new URL(routeRequest.url).searchParams.get("workspaceId") ??
      routeRequest.headers.get("X-Workspace-Id") ??
      undefined,
  })(request);
}
