import { apiHandler } from "@/lib/backend/api/api-handler";
import { createRequestValidator } from "@/lib/backend/api/api-request-validator";
import {
  createSupabaseBearerAuthSessionVerifier,
  type AuthSessionVerifier,
} from "@/lib/backend/security/auth-session";
import type { ApiRequestValidationResult } from "@/lib/backend/api/api-request-validator";
import {
  createWorkspaceSessionService,
  type WorkspaceSessionService,
} from "@/lib/backend/workspace/workspace-session-service";
import type {
  WorkspaceSessionEnsureRequest,
  WorkspaceSessionEnsureResponse,
} from "@/lib/nexus-types";

export const runtime = "nodejs";

let workspaceSessionService: WorkspaceSessionService | undefined;
let authSessionVerifier: AuthSessionVerifier =
  createSupabaseBearerAuthSessionVerifier();

export async function POST(request: Request) {
  return apiHandler<WorkspaceSessionEnsureRequest, WorkspaceSessionEnsureResponse>({
    auth: {
      required: true,
      verifier: authSessionVerifier,
    },
    handler: ({ body, sessionUser }) =>
      getWorkspaceSessionService().ensureWorkspaceForSession({
        request: body,
        userId: sessionUser!.id,
      }),
    idempotency: {
      enabled: true,
    },
    methods: ["POST"],
    route: "/api/v1/workspaces/session",
    validator: createRequestValidator(validateWorkspaceSessionEnsureRequest),
    workspaceId: (_request, body) =>
      isRecord(body) && typeof body.preferredWorkspaceId === "string"
        ? body.preferredWorkspaceId
        : "__global__",
  })(request);
}

export function setWorkspaceSessionRouteDependenciesForTests(
  dependencies: {
    authVerifier?: AuthSessionVerifier;
    service?: WorkspaceSessionService;
  },
) {
  if (dependencies.authVerifier) {
    authSessionVerifier = dependencies.authVerifier;
  }

  if (dependencies.service) {
    workspaceSessionService = dependencies.service;
  }
}

export function resetWorkspaceSessionRouteDependenciesForTests() {
  authSessionVerifier = createSupabaseBearerAuthSessionVerifier();
  workspaceSessionService = undefined;
}

function getWorkspaceSessionService() {
  workspaceSessionService ??= createWorkspaceSessionService();

  return workspaceSessionService;
}

function validateWorkspaceSessionEnsureRequest(
  value: unknown,
): ApiRequestValidationResult<WorkspaceSessionEnsureRequest> {
  if (!isRecord(value)) {
    return {
      data: {},
      ok: true,
    };
  }

  return {
    data: {
      preferredWorkspaceId:
        typeof value.preferredWorkspaceId === "string"
          ? value.preferredWorkspaceId
          : null,
      preferredWorkspaceName:
        typeof value.preferredWorkspaceName === "string"
          ? value.preferredWorkspaceName
          : null,
    },
    ok: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
