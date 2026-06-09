import {
  validationIssue,
  type ApiValidationIssue,
} from "@/lib/backend/api/api-request-validator";
import { isArtifactReferencedByType } from "@/lib/backend/artifacts/artifact-constants";
import type {
  ArtifactArchiveRequest,
  ArtifactReferenceCreateRequest,
  ArtifactVersionCreateRequest,
  CreateArtifactRequest,
} from "@/lib/nexus-types";

export function validateCreateArtifactRequest(value: unknown) {
  const issues: ApiValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
      ok: false as const,
    };
  }

  pushWorkspaceIssue(value, issues);

  if (typeof value.type !== "string" || !value.type.trim()) {
    issues.push(validationIssue(["type"], "required", "type is required."));
  }

  if (
    (typeof value.contentText !== "string" || !value.contentText.trim()) &&
    (typeof value.contentUrl !== "string" || !value.contentUrl.trim())
  ) {
    issues.push(validationIssue(["contentText"], "required", "contentText or contentUrl is required."));
  }

  for (const key of [
    "title",
    "contentText",
    "contentUrl",
    "mimeType",
    "sourceMessageId",
    "sourceAgentId",
  ] as const) {
    if (
      value[key] !== undefined &&
      value[key] !== null &&
      typeof value[key] !== "string"
    ) {
      issues.push(validationIssue([key], "invalid_type", `${key} must be a string.`));
    }
  }

  pushNullableUuidIssue(value, "sourceTaskId", issues);
  pushNullableUuidIssue(value, "sourceToolRunId", issues);

  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    issues.push(validationIssue(["metadata"], "invalid_type", "metadata must be an object."));
  }

  return issues.length
    ? { issues, ok: false as const }
    : {
        data: normalizeCreateArtifactRequest(value),
        ok: true as const,
      };
}

export function validateArtifactVersionRequest(value: unknown) {
  const result = validateCreateArtifactRequest(value);

  return result.ok
    ? { data: result.data as ArtifactVersionCreateRequest, ok: true as const }
    : result;
}

export function validateArtifactReferenceRequest(value: unknown) {
  const issues: ApiValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
      ok: false as const,
    };
  }

  pushWorkspaceIssue(value, issues);

  if (
    typeof value.referencedByType !== "string" ||
    !isArtifactReferencedByType(value.referencedByType)
  ) {
    issues.push(
      validationIssue(
        ["referencedByType"],
        "invalid_value",
        "referencedByType is invalid.",
      ),
    );
  }

  if (typeof value.referencedById !== "string" || !value.referencedById.trim()) {
    issues.push(
      validationIssue(["referencedById"], "required", "referencedById is required."),
    );
  }

  return issues.length
    ? { issues, ok: false as const }
    : { data: value as ArtifactReferenceCreateRequest, ok: true as const };
}

export function validateArtifactArchiveRequest(value: unknown) {
  const issues: ApiValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
      ok: false as const,
    };
  }

  pushWorkspaceIssue(value, issues);

  return issues.length
    ? { issues, ok: false as const }
    : { data: value as ArtifactArchiveRequest, ok: true as const };
}

function pushWorkspaceIssue(value: Record<string, unknown>, issues: ApiValidationIssue[]) {
  if (typeof value.workspaceId !== "string" || !value.workspaceId.trim()) {
    issues.push(validationIssue(["workspaceId"], "required", "workspaceId is required."));
  }
}

function pushNullableUuidIssue(
  value: Record<string, unknown>,
  key: "sourceTaskId" | "sourceToolRunId",
  issues: ApiValidationIssue[],
) {
  const raw = value[key];

  if (raw === undefined || raw === null) {
    return;
  }

  if (typeof raw !== "string") {
    issues.push(validationIssue([key], "invalid_type", `${key} must be a string.`));

    return;
  }

  const normalized = raw.trim();

  if (normalized && !isUuid(normalized)) {
    issues.push(validationIssue([key], "invalid_uuid", `${key} must be a UUID.`));
  }
}

function normalizeCreateArtifactRequest(value: Record<string, unknown>) {
  const request = { ...value } as CreateArtifactRequest;

  request.sourceTaskId = normalizeNullableUuid(value.sourceTaskId);
  request.sourceToolRunId = normalizeNullableUuid(value.sourceToolRunId);

  return request;
}

function normalizeNullableUuid(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
