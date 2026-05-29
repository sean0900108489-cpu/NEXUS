import type { WorkspaceRecoveryStateResponse } from "@/lib/nexus-types";
import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createSupabaseBearerAuthSessionVerifier,
  type AuthSessionVerifier,
} from "@/lib/backend/security/auth-session";
import {
  createWorkspaceStateService,
  type WorkspaceStateService,
} from "@/lib/backend/workspace/workspace-state-service";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

let workspaceStateService: WorkspaceStateService = createWorkspaceStateService();
let authSessionVerifier: AuthSessionVerifier =
  createSupabaseBearerAuthSessionVerifier();

export async function GET(request: Request, context: RouteContext) {
  const { workspaceId } = await context.params;

  return apiHandler<undefined, WorkspaceRecoveryStateResponse>({
    auth: {
      required: true,
      verifier: authSessionVerifier,
    },
    handler: async ({ request: routeRequest, requestId, sessionUser, traceId }) => {
      const url = new URL(routeRequest.url);

      return workspaceStateService.getRecoveryStateForWorkspace({
        localChecksum: url.searchParams.get("localChecksum")?.trim() || null,
        localUpdatedAt: url.searchParams.get("localUpdatedAt")?.trim() || null,
        localWorkspaceId: url.searchParams.get("localWorkspaceId")?.trim() || null,
        requestId,
        traceId,
        userId: sessionUser!.id,
        workspaceId,
      });
    },
    methods: ["GET"],
    route: "/api/v1/workspaces/recovery/[workspaceId]",
    workspaceId: () => workspaceId,
  })(request);
}

export function setWorkspaceRecoverySelectionRouteDependenciesForTests(
  dependencies: {
    authVerifier?: AuthSessionVerifier;
    service?: WorkspaceStateService;
  },
) {
  if (dependencies.authVerifier) {
    authSessionVerifier = dependencies.authVerifier;
  }

  if (dependencies.service) {
    workspaceStateService = dependencies.service;
  }
}

export function resetWorkspaceRecoverySelectionRouteDependenciesForTests() {
  authSessionVerifier = createSupabaseBearerAuthSessionVerifier();
  workspaceStateService = createWorkspaceStateService();
}
