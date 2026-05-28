import type { WorkspaceRecoveryStateResponse } from "@/lib/nexus-types";
import { apiHandler } from "@/lib/backend/api/api-handler";
import { ApiError } from "@/lib/backend/api/api-errors";
import { createWorkspaceStateService } from "@/lib/backend/workspace/workspace-state-service";

const workspaceStateService = createWorkspaceStateService();

export async function GET(request: Request) {
  return apiHandler<undefined, WorkspaceRecoveryStateResponse>({
    handler: ({ request: routeRequest, requestId, traceId }) => {
      const userId = routeRequest.headers.get("X-User-Id")?.trim();

      if (!userId) {
        throw new ApiError(
          "PERMISSION_DENIED",
          "Workspace recovery requires an authenticated user.",
          403,
        );
      }

      const url = new URL(routeRequest.url);

      return workspaceStateService.getLatestRecoveryState({
        localChecksum: url.searchParams.get("localChecksum"),
        localUpdatedAt: url.searchParams.get("localUpdatedAt"),
        localWorkspaceId: url.searchParams.get("localWorkspaceId"),
        requestId,
        traceId,
        userId,
      });
    },
    methods: ["GET"],
    route: "/api/v1/workspaces/recovery/latest",
  })(request);
}
