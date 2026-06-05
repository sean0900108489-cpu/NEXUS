import { apiHandler } from "@/lib/backend/api/api-handler";
import { ApiError } from "@/lib/backend/api/api-errors";
import { createRequestValidator } from "@/lib/backend/api/api-request-validator";
import {
  createSupabaseBearerAuthSessionVerifier,
  getSupabaseRequestAccessToken,
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
import { hasSupabaseServiceRoleConfig } from "@/lib/supabase/admin";
import { hasSupabaseRequestClientConfig } from "@/lib/supabase/request";

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
    handler: ({ body, request, sessionUser }) =>
      ensureWorkspaceSessionForAuthenticatedRoute({
        body,
        request,
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

async function ensureWorkspaceSessionForAuthenticatedRoute({
  body,
  request,
  userId,
}: {
  body: WorkspaceSessionEnsureRequest;
  request: Request;
  userId: string;
}) {
  if (workspaceSessionService || hasSupabaseServiceRoleConfig()) {
    return getWorkspaceSessionService().ensureWorkspaceForSession({
      request: body,
      userId,
    });
  }

  if (hasAuthenticatedSupabaseRequestSession(request)) {
    return ensureWorkspaceSessionViaAuthenticatedRpc({
      body,
      request,
    });
  }

  if (isLocalRuntime()) {
    return getWorkspaceSessionService().ensureWorkspaceForSession({
      request: body,
      userId,
    });
  }

  return ensureWorkspaceSessionViaAuthenticatedRpc({
    body,
    request,
  });
}

async function ensureWorkspaceSessionViaAuthenticatedRpc({
  body,
  request,
}: {
  body: WorkspaceSessionEnsureRequest;
  request: Request;
}): Promise<WorkspaceSessionEnsureResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const accessToken = getSupabaseRequestAccessToken(request);

  if (!accessToken) {
    throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
  }

  if (!supabaseUrl || !anonKey) {
    throw new ApiError(
      "INTERNAL_DEPENDENCY_FAILED",
      "Workspace session RPC requires Supabase public runtime configuration.",
      503,
    );
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/nexus_ensure_workspace_session`,
    {
      body: JSON.stringify({
        p_preferred_workspace_id: body.preferredWorkspaceId ?? null,
        p_preferred_workspace_name: body.preferredWorkspaceName ?? null,
      }),
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new ApiError(
      "INTERNAL_DEPENDENCY_FAILED",
      "Workspace session RPC failed.",
      503,
      {
        status: response.status,
      },
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  const row = Array.isArray(payload) ? payload[0] : payload;

  if (!isRecord(row) || typeof row.workspace_id !== "string") {
    throw new ApiError(
      "INTERNAL_DEPENDENCY_FAILED",
      "Workspace session RPC returned an invalid payload.",
      503,
    );
  }

  return {
    created: row.created === true,
    preferredWorkspaceId:
      typeof row.preferred_workspace_id === "string"
        ? row.preferred_workspace_id
        : body.preferredWorkspaceId ?? null,
    reason:
      typeof row.reason === "string"
        ? (row.reason as WorkspaceSessionEnsureResponse["reason"])
        : "created_user_workspace",
    role:
      typeof row.role === "string"
        ? (row.role as WorkspaceSessionEnsureResponse["role"])
        : "owner",
    workspaceId: row.workspace_id,
    workspaceName:
      typeof row.workspace_name === "string"
        ? row.workspace_name
        : body.preferredWorkspaceName ?? "NEXUS // AI OPS",
  };
}

function hasAuthenticatedSupabaseRequestSession(request: Request) {
  return Boolean(
    hasSupabaseRequestClientConfig() && getSupabaseRequestAccessToken(request),
  );
}

function isLocalRuntime() {
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL_ENV;
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
