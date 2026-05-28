export type WorkspaceId = string;
export type AgentId = string;
export type TaskId = string;
export type ToolRunId = string;
export type ArtifactId = string;
export type TraceId = string;
export type RequestId = string;
export type ClientMutationId = string;
export type UserId = string;
export type ResourceId = string;

export type BackendIdMap = {
  workspaceId: WorkspaceId;
  agentId: AgentId;
  taskId: TaskId;
  toolRunId: ToolRunId;
  artifactId: ArtifactId;
  traceId: TraceId;
  requestId: RequestId;
  clientMutationId: ClientMutationId;
};

export const BACKEND_ID_FIELD_NAMES = [
  "workspaceId",
  "agentId",
  "taskId",
  "toolRunId",
  "artifactId",
  "traceId",
  "requestId",
  "clientMutationId",
] as const satisfies readonly (keyof BackendIdMap)[];

export type BackendIdFieldName = (typeof BACKEND_ID_FIELD_NAMES)[number];

export const FORBIDDEN_BACKEND_ID_ALIASES = [
  "ws_id",
  "workspaceUid",
  "agentUid",
  "runId",
  "mutationId",
] as const;

export type ForbiddenBackendIdAlias = (typeof FORBIDDEN_BACKEND_ID_ALIASES)[number];

const backendIdFieldNames = new Set<string>(BACKEND_ID_FIELD_NAMES);
const forbiddenBackendIdAliases = new Set<string>(FORBIDDEN_BACKEND_ID_ALIASES);

export function isBackendIdFieldName(value: string): value is BackendIdFieldName {
  return backendIdFieldNames.has(value);
}

export function isForbiddenBackendIdAlias(
  value: string,
): value is ForbiddenBackendIdAlias {
  return forbiddenBackendIdAliases.has(value);
}

export type BackendIdNamingViolation = {
  fieldName: string;
  reason: "forbiddenAlias" | "nonCamelCase";
};

export function findBackendIdNamingViolations(
  fieldNames: Iterable<string>,
): BackendIdNamingViolation[] {
  const violations: BackendIdNamingViolation[] = [];

  for (const fieldName of fieldNames) {
    if (isForbiddenBackendIdAlias(fieldName)) {
      violations.push({ fieldName, reason: "forbiddenAlias" });
      continue;
    }

    if (fieldName.includes("_")) {
      violations.push({ fieldName, reason: "nonCamelCase" });
    }
  }

  return violations;
}

export function hasBackendIdNamingViolation(fieldNames: Iterable<string>) {
  return findBackendIdNamingViolations(fieldNames).length > 0;
}
