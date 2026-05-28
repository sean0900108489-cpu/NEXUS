import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createRequestValidator,
  validationIssue,
  type ApiValidationIssue,
} from "@/lib/backend/api/api-request-validator";
import { createFeatureFlagService } from "@/lib/backend/deployment/feature-flag-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import type {
  FeatureFlagToggleRequest,
  FeatureFlagToggleResponse,
} from "@/lib/nexus-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ flagKey: string }>;
};

const featureFlagService = createFeatureFlagService();

export async function POST(request: Request, context: RouteContext) {
  const { flagKey } = await context.params;

  return apiHandler<FeatureFlagToggleRequest, FeatureFlagToggleResponse>({
    handler: ({ body }) =>
      featureFlagService.toggleFlag({
        ...body,
        flagKey,
      }).then((flag) => ({ flag })),
    idempotency: {
      enabled: true,
    },
    methods: ["POST"],
    permission: {
      action: "provider_settings.update",
      permissionService: createWorkspaceStatePermissionService(),
      resourceId: () => flagKey,
      resourceType: "settings",
    },
    route: "/api/v1/feature-flags/[flagKey]/toggle",
    validator: createRequestValidator(validateFeatureFlagToggleRequest),
    workspaceId: (routeRequest, body) => readWorkspaceId(routeRequest, body),
  })(request);
}

function validateFeatureFlagToggleRequest(value: unknown) {
  const issues: ApiValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
      ok: false as const,
    };
  }

  if (typeof value.enabled !== "boolean") {
    issues.push(validationIssue(["enabled"], "invalid_type", "enabled must be a boolean."));
  }

  if (
    value.workspaceId !== undefined &&
    typeof value.workspaceId !== "string"
  ) {
    issues.push(validationIssue(["workspaceId"], "invalid_type", "workspaceId must be a string."));
  }

  if (value.scopeKey !== undefined && typeof value.scopeKey !== "string") {
    issues.push(validationIssue(["scopeKey"], "invalid_type", "scopeKey must be a string."));
  }

  const rolloutPercentage = value.rolloutPercentage;

  if (
    rolloutPercentage !== undefined &&
    (typeof rolloutPercentage !== "number" ||
      !Number.isInteger(rolloutPercentage) ||
      rolloutPercentage < 0 ||
      rolloutPercentage > 100)
  ) {
    issues.push(validationIssue(["rolloutPercentage"], "invalid_range", "rolloutPercentage must be 0-100."));
  }

  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    issues.push(validationIssue(["metadata"], "invalid_type", "metadata must be an object."));
  }

  return issues.length
    ? {
        issues,
        ok: false as const,
      }
    : {
        data: value as FeatureFlagToggleRequest,
        ok: true as const,
      };
}

function readWorkspaceId(request: Request, body: unknown) {
  if (isRecord(body) && typeof body.workspaceId === "string") {
    return body.workspaceId;
  }

  const headerWorkspaceId = request.headers.get("X-Workspace-Id");

  return headerWorkspaceId ?? undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
