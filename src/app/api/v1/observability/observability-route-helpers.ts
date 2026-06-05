import { ApiError } from "@/lib/backend/api/api-errors";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type { TraceContext } from "@/lib/backend/observability/trace-context";
import type { WorkspaceRole } from "@/lib/backend/security/types";

const WRITE_LIKE_ACTION_TOKENS = [
  "create",
  "delete",
  "emit",
  "insert",
  "mutate",
  "record",
  "run",
  "save",
  "sync",
  "update",
  "upsert",
  "write",
] as const;

export async function assertObservabilityAccess(input: {
  action?: string;
  minRole?: WorkspaceRole;
  trace: TraceContext;
  workspaceId: string;
}) {
  const userId = input.trace.userId?.trim();
  const action = input.action ?? "workspace.read";
  const minRole = input.minRole ?? resolveObservabilityMinRole(action);

  if (!userId) {
    throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
  }

  const decision = await createWorkspaceStatePermissionService().requireWorkspaceRole(
    {
      action,
      minRole,
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

function resolveObservabilityMinRole(action: string): WorkspaceRole {
  return isWriteLikeObservabilityAction(action) ? "editor" : "viewer";
}

function isWriteLikeObservabilityAction(action: string) {
  const normalized = action.toLowerCase().replace(/[^a-z0-9]+/g, "_");

  return WRITE_LIKE_ACTION_TOKENS.some((token) => normalized.includes(token));
}

export function readWorkspaceId(request: Request) {
  return (
    new URL(request.url).searchParams.get("workspaceId") ??
    request.headers.get("X-Workspace-Id") ??
    undefined
  );
}
