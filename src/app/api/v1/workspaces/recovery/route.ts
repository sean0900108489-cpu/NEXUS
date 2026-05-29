import type { WorkspaceRecoveryListResponse } from "@/lib/nexus-types";
import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createSupabaseBearerAuthSessionVerifier,
  type AuthSessionVerifier,
} from "@/lib/backend/security/auth-session";
import {
  createWorkspaceStateService,
  type WorkspaceStateService,
} from "@/lib/backend/workspace/workspace-state-service";

const WORKSPACE_RECOVERY_LIST_LIMIT = 25;
let workspaceStateService: WorkspaceStateService = createWorkspaceStateService();
let authSessionVerifier: AuthSessionVerifier =
  createSupabaseBearerAuthSessionVerifier();

export async function GET(request: Request) {
  return apiHandler<undefined, WorkspaceRecoveryListResponse>({
    auth: {
      required: true,
      verifier: authSessionVerifier,
    },
    handler: async ({ request: routeRequest, requestId, sessionUser, traceId }) => {
      const url = new URL(routeRequest.url);
      const localChecksum = url.searchParams.get("localChecksum")?.trim() || null;

      return workspaceStateService.listRecoveryStates({
        limit: WORKSPACE_RECOVERY_LIST_LIMIT,
        localChecksum,
        requestId,
        traceId,
        userId: sessionUser!.id,
      });
    },
    methods: ["GET"],
    route: "/api/v1/workspaces/recovery",
  })(request);
}

export function setWorkspaceRecoveryListRouteDependenciesForTests(
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

export function resetWorkspaceRecoveryListRouteDependenciesForTests() {
  authSessionVerifier = createSupabaseBearerAuthSessionVerifier();
  workspaceStateService = createWorkspaceStateService();
}
