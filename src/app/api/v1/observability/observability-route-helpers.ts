import { ApiError } from "@/lib/backend/api/api-errors";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type { TraceContext } from "@/lib/backend/observability/trace-context";

export async function assertObservabilityAccess(input: {
  action?: string;
  trace: TraceContext;
  workspaceId: string;
}) {
  const userId = input.trace.userId?.trim();

  if (!userId) {
    throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
  }

  const decision = await createWorkspaceStatePermissionService().requireWorkspaceRole(
    {
      action: input.action ?? "workspace.read",
      minRole: "editor",
      resourceType: "workspace",
      userId,
      workspaceId: input.workspaceId,
    },
    {
      requestId: input.trace.requestId,
      traceId: input.trace.traceId,
    },
  );

  if (decision.decision !== "allow") {
    throw new ApiError("PERMISSION_DENIED", "Permission denied.", 403, {
      reasonCode: decision.reasonCode,
    });
  }
}

export function readWorkspaceId(request: Request) {
  return (
    new URL(request.url).searchParams.get("workspaceId") ??
    request.headers.get("X-Workspace-Id") ??
    undefined
  );
}
