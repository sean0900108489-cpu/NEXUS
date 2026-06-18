import { apiHandler } from "@/lib/backend/api/api-handler";
import { createRequestValidator } from "@/lib/backend/api/api-request-validator";
import { createArtifactServiceForRequest } from "@/lib/backend/artifacts/artifact-route-service";
import { getSupabaseRequestAccessToken } from "@/lib/backend/security/auth-session";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type {
  ArtifactCreateResponse,
  ArtifactListResponse,
  CreateArtifactRequest,
} from "@/lib/nexus-types";

import { validateCreateArtifactRequest } from "./artifact-route-validation";

export const runtime = "nodejs";

export const GET = apiHandler<undefined, ArtifactListResponse>({
  handler: ({ request, workspaceId }) => {
    const url = new URL(request.url);
    const artifactService = createArtifactServiceForRequest(request);

    return artifactService.listArtifacts({
      cursor: url.searchParams.get("cursor"),
      limit: Number(url.searchParams.get("limit") ?? 30),
      q: url.searchParams.get("q"),
      type: url.searchParams.get("type"),
      workspaceId,
    });
  },
  methods: ["GET"],
  permission: {
    action: "workspace.read",
    permissionServiceFactory: ({ request }) =>
      createWorkspaceStatePermissionService({ request }),
    resourceType: "artifact",
  },
  route: "/api/v1/artifacts",
  workspaceId: (request) =>
    new URL(request.url).searchParams.get("workspaceId") ??
    request.headers.get("X-Workspace-Id") ??
    undefined,
});

export const POST = apiHandler<CreateArtifactRequest, ArtifactCreateResponse>({
  handler: ({ body, request, requestId, trace, traceId }) =>
    createArtifactServiceForRequest(request).createArtifact(body, {
      accessToken: getSupabaseRequestAccessToken(request),
      requestId,
      traceId,
      userId: trace.userId,
    }),
  idempotency: {
    enabled: true,
  },
  methods: ["POST"],
  permission: {
    action: "workspace.update",
    permissionServiceFactory: ({ request }) =>
      createWorkspaceStatePermissionService({ request }),
    resourceType: "artifact",
  },
  route: "/api/v1/artifacts",
  validator: createRequestValidator(validateCreateArtifactRequest),
  workspaceId: (_request, body) =>
    isRecord(body) && typeof body.workspaceId === "string"
      ? body.workspaceId
      : undefined,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
