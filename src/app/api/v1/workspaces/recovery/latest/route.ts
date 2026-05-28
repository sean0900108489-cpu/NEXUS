import type { WorkspaceRecoveryStateResponse } from "@/lib/nexus-types";
import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createSupabaseBearerAuthSessionVerifier,
  type AuthSessionVerifier,
} from "@/lib/backend/security/auth-session";
import { createWorkspaceStateService } from "@/lib/backend/workspace/workspace-state-service";

const workspaceStateService = createWorkspaceStateService();
let authSessionVerifier: AuthSessionVerifier =
  createSupabaseBearerAuthSessionVerifier();

export async function GET(request: Request) {
  return apiHandler<undefined, WorkspaceRecoveryStateResponse>({
    handler: async ({ request: routeRequest, requestId, traceId }) => {
      const sessionUser = await authSessionVerifier.verifyRequest(routeRequest);
      const url = new URL(routeRequest.url);

      return workspaceStateService.getLatestRecoveryState({
        localChecksum: url.searchParams.get("localChecksum"),
        localUpdatedAt: url.searchParams.get("localUpdatedAt"),
        localWorkspaceId: url.searchParams.get("localWorkspaceId"),
        requestId,
        traceId,
        userId: sessionUser.id,
      });
    },
    methods: ["GET"],
    route: "/api/v1/workspaces/recovery/latest",
  })(request);
}

export function setWorkspaceRecoveryAuthVerifierForTests(
  verifier: AuthSessionVerifier,
) {
  authSessionVerifier = verifier;
}

export function resetWorkspaceRecoveryAuthVerifierForTests() {
  authSessionVerifier = createSupabaseBearerAuthSessionVerifier();
}
