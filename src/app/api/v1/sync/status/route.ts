import { apiHandler } from "@/lib/backend/api/api-handler";
import { createSyncQueueService } from "@/lib/backend/sync/sync-queue-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type { SyncStatusResponse } from "@/lib/nexus-types";

export const runtime = "nodejs";

const syncQueueService = createSyncQueueService();

export const GET = apiHandler<undefined, SyncStatusResponse>({
  handler: ({ request }) => {
    const url = new URL(request.url);

    return syncQueueService.getStatus({
      entityId: url.searchParams.get("entityId"),
      entityType: url.searchParams.get("entityType"),
      limit: Number(url.searchParams.get("limit") ?? 50),
      status: url.searchParams.get("status"),
      workspaceId: url.searchParams.get("workspaceId") ?? "__global__",
    });
  },
  methods: ["GET"],
  permission: {
    action: "workspace.read",
    permissionServiceFactory: ({ request: routeRequest }) =>
      createWorkspaceStatePermissionService({ request: routeRequest }),
    resourceType: "workspace",
  },
  route: "/api/v1/sync/status",
  workspaceId: (request) =>
    new URL(request.url).searchParams.get("workspaceId") ?? undefined,
});
