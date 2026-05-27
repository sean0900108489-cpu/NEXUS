import { apiHandler } from "@/lib/backend/api/api-handler";
import { createRequestValidator } from "@/lib/backend/api/api-request-validator";
import { createArtifactService } from "@/lib/backend/artifacts/artifact-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type {
  ArtifactArchiveRequest,
  ArtifactArchiveResponse,
} from "@/lib/nexus-types";

import { validateArtifactArchiveRequest } from "../../artifact-route-validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ artifactId: string }>;
};

const artifactService = createArtifactService();
const permissionService = createWorkspaceStatePermissionService();

export async function POST(request: Request, context: RouteContext) {
  const { artifactId } = await context.params;

  return apiHandler<ArtifactArchiveRequest, ArtifactArchiveResponse>({
    handler: ({ body, requestId, trace, traceId }) =>
      artifactService.archiveArtifact(
        artifactId,
        {
          workspaceId: body.workspaceId,
        },
        {
          requestId,
          traceId,
          userId: trace.userId,
        },
      ),
    idempotency: {
      enabled: true,
    },
    methods: ["POST"],
    permission: {
      action: "workspace.update",
      permissionService,
      resourceId: () => artifactId,
      resourceType: "artifact",
    },
    route: "/api/v1/artifacts/[artifactId]/archive",
    validator: createRequestValidator(validateArtifactArchiveRequest),
    workspaceId: (_request, body) =>
      isRecord(body) && typeof body.workspaceId === "string"
        ? body.workspaceId
        : undefined,
  })(request);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
