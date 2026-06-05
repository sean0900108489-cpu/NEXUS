import { apiHandler } from "@/lib/backend/api/api-handler";
import { createRequestValidator } from "@/lib/backend/api/api-request-validator";
import { createArtifactServiceForRequest } from "@/lib/backend/artifacts/artifact-route-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type {
  ArtifactReferenceCreateRequest,
  ArtifactReferenceCreateResponse,
} from "@/lib/nexus-types";

import { validateArtifactReferenceRequest } from "../../artifact-route-validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ artifactId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { artifactId } = await context.params;

  return apiHandler<ArtifactReferenceCreateRequest, ArtifactReferenceCreateResponse>({
    handler: ({ body, request: routeRequest, requestId, trace, traceId }) =>
      createArtifactServiceForRequest(routeRequest).createReference(artifactId, body, {
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
      permissionServiceFactory: ({ request: routeRequest }) =>
        createWorkspaceStatePermissionService({ request: routeRequest }),
      resourceId: () => artifactId,
      resourceType: "artifact",
    },
    route: "/api/v1/artifacts/[artifactId]/references",
    validator: createRequestValidator(validateArtifactReferenceRequest),
    workspaceId: (_request, body) =>
      isRecord(body) && typeof body.workspaceId === "string"
        ? body.workspaceId
        : undefined,
  })(request);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
