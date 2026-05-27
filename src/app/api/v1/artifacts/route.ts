import { apiHandler } from "@/lib/backend/api/api-handler";
import { createRequestValidator } from "@/lib/backend/api/api-request-validator";
import { createArtifactService } from "@/lib/backend/artifacts/artifact-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type {
  ArtifactCreateResponse,
  ArtifactListResponse,
  CreateArtifactRequest,
} from "@/lib/nexus-types";

import { validateCreateArtifactRequest } from "./artifact-route-validation";

export const runtime = "nodejs";

const artifactService = createArtifactService();
const permissionService = createWorkspaceStatePermissionService();

export const GET = apiHandler<undefined, ArtifactListResponse>({
  handler: ({ request, workspaceId }) => {
    const url = new URL(request.url);

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
    permissionService,
    resourceType: "artifact",
  },
  route: "/api/v1/artifacts",
  workspaceId: (request) =>
    new URL(request.url).searchParams.get("workspaceId") ??
    request.headers.get("X-Workspace-Id") ??
    undefined,
});

export const POST = apiHandler<CreateArtifactRequest, ArtifactCreateResponse>({
  handler: ({ body, requestId, trace, traceId }) =>
    artifactService.createArtifact(body, {
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
    permissionService,
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
