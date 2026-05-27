import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createRequestValidator,
  validationIssue,
  type ApiValidationIssue,
} from "@/lib/backend/api/api-request-validator";
import { createDeploymentCheckService } from "@/lib/backend/deployment/deployment-check-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type {
  DeploymentCheckRunRequest,
  DeploymentCheckRunResponse,
  DeploymentEnvironment,
} from "@/lib/nexus-types";

export const runtime = "nodejs";

const deploymentCheckService = createDeploymentCheckService();
const environments = new Set<DeploymentEnvironment>([
  "local",
  "staging",
  "production",
]);

export const POST = apiHandler<
  DeploymentCheckRunRequest,
  DeploymentCheckRunResponse
>({
  handler: ({ body, requestId, traceId, workspaceId }) =>
    deploymentCheckService.runPreflight(body, {
      requestId,
      traceId,
      workspaceId,
    }),
  idempotency: {
    enabled: true,
  },
  methods: ["POST"],
  permission: {
    action: "provider_settings.update",
    permissionService: createWorkspaceStatePermissionService(),
    resourceType: "settings",
  },
  route: "/api/v1/deployment/checks/run",
  validator: createRequestValidator(validateDeploymentRunRequest),
  workspaceId: (request, body) =>
    isRecord(body) && typeof body.workspaceId === "string"
      ? body.workspaceId
      : readWorkspaceId(request),
});

function validateDeploymentRunRequest(value: unknown) {
  const issues: ApiValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
      ok: false as const,
    };
  }

  if (
    value.workspaceId !== undefined &&
    typeof value.workspaceId !== "string"
  ) {
    issues.push(validationIssue(["workspaceId"], "invalid_type", "workspaceId must be a string."));
  }

  if (
    value.environment !== undefined &&
    (typeof value.environment !== "string" ||
      !environments.has(value.environment as DeploymentEnvironment))
  ) {
    issues.push(validationIssue(["environment"], "invalid_enum", "environment is invalid."));
  }

  if (
    value.releaseVersion !== undefined &&
    value.releaseVersion !== null &&
    typeof value.releaseVersion !== "string"
  ) {
    issues.push(validationIssue(["releaseVersion"], "invalid_type", "releaseVersion must be a string or null."));
  }

  return issues.length
    ? {
        issues,
        ok: false as const,
      }
    : {
        data: value as DeploymentCheckRunRequest,
        ok: true as const,
      };
}

function readWorkspaceId(request: Request) {
  return request.headers.get("X-Workspace-Id") ?? undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
