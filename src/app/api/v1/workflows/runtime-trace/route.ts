import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  validationIssue,
  type ApiRequestValidationResult,
  type ApiValidationIssue,
} from "@/lib/backend/api/api-request-validator";
import {
  WORKFLOW_RUNTIME_TRACE_EVENT_SCHEMA,
  createWorkflowRuntimeRunEvent,
  getDefaultObservabilityService,
} from "@/lib/backend/observability";
import type {
  ContextPacket,
  NodeExecution,
  WorkflowRun,
  WorkflowRuntimeGroupRef,
  WorkflowRuntimeNodeStatus,
  WorkflowRuntimeRunStatus,
  WorkflowRuntimeTraceNodeExecutionInput,
  WorkflowRuntimeTraceRunInput,
  WorkflowRuntimeTraceWriteRequest,
  WorkflowRuntimeTraceWriteResponse,
} from "@/lib/nexus-types";

import { assertObservabilityAccess } from "../../observability/observability-route-helpers";

export const runtime = "nodejs";

const MAX_NODE_EXECUTIONS = 200;
const MAX_STRING_LENGTH = 256;
const FORBIDDEN_PAYLOAD_KEYS = new Set([
  "apiKey",
  "binary",
  "dataUrl",
  "displayText",
  "inputSnapshot",
  "outputSnapshot",
  "prompt",
  "providerKey",
  "rawText",
]);
const NODE_STATUSES = new Set<WorkflowRuntimeNodeStatus>([
  "failed",
  "failed_interrupted",
  "idle",
  "queued",
  "running",
  "success",
]);
const RUN_STATUSES = new Set<WorkflowRuntimeRunStatus>([
  "failed",
  "failed_interrupted",
  "queued",
  "running",
  "success",
]);
const GROUP_SOURCES = new Set<NonNullable<WorkflowRuntimeGroupRef["source"]>>([
  "brain",
  "import",
  "manual",
  "runtime-append",
]);

export const POST = apiHandler<
  WorkflowRuntimeTraceWriteRequest,
  WorkflowRuntimeTraceWriteResponse
>({
  auth: {
    required: true,
  },
  handler: async ({ body, trace, workspaceId }) => {
    await assertObservabilityAccess({
      action: "workflow.trace.write",
      trace,
      workspaceId,
    });

    const run = createSanitizedWorkflowRun(body.run);
    const event = createWorkflowRuntimeRunEvent({
      occurredAt: body.occurredAt,
      requestId: trace.requestId,
      run,
      traceId: body.traceId ?? trace.traceId,
      userId: trace.userId,
      workspaceId,
    });
    const record = await getDefaultObservabilityService().recordSystemEvent(event);

    return {
      eventId: record.id,
      eventType: record.eventType,
      schema: WORKFLOW_RUNTIME_TRACE_EVENT_SCHEMA,
      status: run.status,
      traceId: record.traceId,
      workflowGroupId:
        typeof event.payload?.workflowGroupId === "string"
          ? event.payload.workflowGroupId
          : "workspace-root",
      workflowRunId: run.runId,
      workspaceId,
    };
  },
  idempotency: {
    enabled: false,
  },
  methods: ["POST"],
  route: "/api/v1/workflows/runtime-trace",
  validator: validateWorkflowRuntimeTraceWriteRequest,
  workspaceId: (_request, body) =>
    isRecord(body) && typeof body.workspaceId === "string"
      ? body.workspaceId
      : undefined,
});

function validateWorkflowRuntimeTraceWriteRequest(
  value: unknown,
): ApiRequestValidationResult<WorkflowRuntimeTraceWriteRequest> {
  const issues: ApiValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
      ok: false,
    };
  }

  issues.push(...collectForbiddenPayloadKeys(value));

  const workspaceId = readRequiredString(value, "workspaceId", issues);
  const traceId = readOptionalString(value, "traceId", issues);
  const occurredAt = readOptionalString(value, "occurredAt", issues);
  const run = validateTraceRunInput(value.run, issues);

  if (issues.length || !workspaceId || !run) {
    return { issues, ok: false };
  }

  return {
    data: {
      ...(occurredAt ? { occurredAt } : {}),
      run,
      ...(traceId ? { traceId } : {}),
      workspaceId,
    },
    ok: true,
  };
}

function validateTraceRunInput(
  value: unknown,
  issues: ApiValidationIssue[],
): WorkflowRuntimeTraceRunInput | null {
  if (!isRecord(value)) {
    issues.push(validationIssue(["run"], "invalid_type", "run must be an object."));
    return null;
  }

  const runId = readRequiredString(value, "runId", issues, ["run"]);
  const workflowId = readRequiredString(value, "workflowId", issues, ["run"]);
  const startedAt = readRequiredString(value, "startedAt", issues, ["run"]);
  const completedAt = readOptionalString(value, "completedAt", issues, ["run"]);
  const status = readRequiredRunStatus(value.status, issues);
  const group = validateWorkflowRuntimeGroupRef(value.group, issues);
  const nodeExecutions = validateNodeExecutions(value.nodeExecutions, issues);

  if (!runId || !workflowId || !startedAt || !status || !nodeExecutions) {
    return null;
  }

  return {
    ...(completedAt ? { completedAt } : {}),
    ...(group ? { group } : {}),
    nodeExecutions,
    runId,
    startedAt,
    status,
    workflowId,
  };
}

function validateWorkflowRuntimeGroupRef(
  value: unknown,
  issues: ApiValidationIssue[],
): WorkflowRuntimeGroupRef | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!isRecord(value)) {
    issues.push(validationIssue(["run", "group"], "invalid_type", "group must be an object."));
    return undefined;
  }

  const id = readRequiredString(value, "id", issues, ["run", "group"]);
  const createdAt = readOptionalString(value, "createdAt", issues, ["run", "group"]);
  const label = readOptionalString(value, "label", issues, ["run", "group"]);
  const source = readOptionalGroupSource(value.source, issues);

  if (!id) {
    return undefined;
  }

  return {
    ...(createdAt ? { createdAt } : {}),
    ...(label ? { label } : {}),
    ...(source ? { source } : {}),
    id,
  };
}

function validateNodeExecutions(
  value: unknown,
  issues: ApiValidationIssue[],
): WorkflowRuntimeTraceNodeExecutionInput[] | null {
  if (!Array.isArray(value)) {
    issues.push(
      validationIssue(
        ["run", "nodeExecutions"],
        "invalid_type",
        "nodeExecutions must be an array.",
      ),
    );
    return null;
  }

  if (value.length > MAX_NODE_EXECUTIONS) {
    issues.push(
      validationIssue(
        ["run", "nodeExecutions"],
        "too_large",
        `nodeExecutions cannot exceed ${MAX_NODE_EXECUTIONS} items.`,
      ),
    );
    return null;
  }

  const executions: WorkflowRuntimeTraceNodeExecutionInput[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      issues.push(
        validationIssue(
          ["run", "nodeExecutions", index],
          "invalid_type",
          "node execution must be an object.",
        ),
      );
      continue;
    }

    const path = ["run", "nodeExecutions", index];
    const nodeId = readRequiredString(item, "nodeId", issues, path);
    const status = readRequiredNodeStatus(item.status, issues, path);
    const artifactId = readOptionalString(item, "artifactId", issues, path);
    const artifactVaultRecordId = readOptionalString(
      item,
      "artifactVaultRecordId",
      issues,
      path,
    );
    const completedAt = readOptionalString(item, "completedAt", issues, path);
    const latencyMs = readOptionalNonNegativeNumber(item, "latencyMs", issues, path);
    const runId = readOptionalString(item, "runId", issues, path);
    const startedAt = readOptionalString(item, "startedAt", issues, path);

    if (!nodeId || !status) {
      continue;
    }

    executions.push({
      ...(artifactId ? { artifactId } : {}),
      ...(artifactVaultRecordId ? { artifactVaultRecordId } : {}),
      ...(completedAt ? { completedAt } : {}),
      ...(latencyMs !== undefined ? { latencyMs } : {}),
      ...(runId ? { runId } : {}),
      ...(startedAt ? { startedAt } : {}),
      nodeId,
      status,
    });
  }

  return executions;
}

function createSanitizedWorkflowRun(input: WorkflowRuntimeTraceRunInput): WorkflowRun {
  return {
    completedAt: input.completedAt ?? null,
    group: input.group,
    nodeExecutions: input.nodeExecutions.map((execution) =>
      createSanitizedNodeExecution(input, execution),
    ),
    runId: input.runId,
    startedAt: input.startedAt,
    status: input.status,
    workflowId: input.workflowId,
  };
}

function createSanitizedNodeExecution(
  run: WorkflowRuntimeTraceRunInput,
  execution: WorkflowRuntimeTraceNodeExecutionInput,
): NodeExecution {
  const outputSnapshot = createArtifactSnapshot(run, execution);

  return {
    ...(execution.completedAt ? { completedAt: execution.completedAt } : {}),
    ...(outputSnapshot ? { outputSnapshot } : {}),
    ...(execution.startedAt ? { startedAt: execution.startedAt } : {}),
    latencyMs: execution.latencyMs ?? null,
    nodeId: execution.nodeId,
    runId: execution.runId ?? run.runId,
    status: execution.status,
  };
}

function createArtifactSnapshot(
  run: WorkflowRuntimeTraceRunInput,
  execution: WorkflowRuntimeTraceNodeExecutionInput,
): ContextPacket | undefined {
  const metadata: Record<string, unknown> = {};

  if (execution.artifactId) {
    metadata.artifactId = execution.artifactId;
  }

  if (execution.artifactVaultRecordId) {
    metadata.artifactVaultRecord = {
      id: execution.artifactVaultRecordId,
    };
  }

  if (!Object.keys(metadata).length) {
    return undefined;
  }

  return {
    createdAt: execution.completedAt ?? execution.startedAt ?? run.startedAt,
    displayText: "",
    id: `${run.runId}:${execution.nodeId}:artifact-ref`,
    metadata,
    rawText: "",
    runId: run.runId,
    sourceNodeId: execution.nodeId,
  };
}

function collectForbiddenPayloadKeys(
  value: unknown,
  path: Array<string | number> = [],
): ApiValidationIssue[] {
  if (!isRecord(value)) {
    if (Array.isArray(value)) {
      return value.flatMap((item, index) =>
        collectForbiddenPayloadKeys(item, [...path, index]),
      );
    }

    return [];
  }

  const issues: ApiValidationIssue[] = [];

  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];

    if (FORBIDDEN_PAYLOAD_KEYS.has(key)) {
      issues.push(
        validationIssue(
          childPath,
          "forbidden_payload_key",
          `${key} is not accepted by the workflow runtime trace write route.`,
        ),
      );
    }

    issues.push(...collectForbiddenPayloadKeys(child, childPath));
  }

  return issues;
}

function readRequiredRunStatus(
  value: unknown,
  issues: ApiValidationIssue[],
): WorkflowRuntimeRunStatus | undefined {
  if (typeof value === "string" && RUN_STATUSES.has(value as WorkflowRuntimeRunStatus)) {
    return value as WorkflowRuntimeRunStatus;
  }

  issues.push(validationIssue(["run", "status"], "invalid_enum", "status is invalid."));
  return undefined;
}

function readRequiredNodeStatus(
  value: unknown,
  issues: ApiValidationIssue[],
  path: Array<string | number>,
): WorkflowRuntimeNodeStatus | undefined {
  if (typeof value === "string" && NODE_STATUSES.has(value as WorkflowRuntimeNodeStatus)) {
    return value as WorkflowRuntimeNodeStatus;
  }

  issues.push(validationIssue([...path, "status"], "invalid_enum", "status is invalid."));
  return undefined;
}

function readOptionalGroupSource(
  value: unknown,
  issues: ApiValidationIssue[],
): WorkflowRuntimeGroupRef["source"] | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string" && GROUP_SOURCES.has(value as NonNullable<WorkflowRuntimeGroupRef["source"]>)) {
    return value as WorkflowRuntimeGroupRef["source"];
  }

  issues.push(validationIssue(["run", "group", "source"], "invalid_enum", "group.source is invalid."));
  return undefined;
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  issues: ApiValidationIssue[],
  path: Array<string | number> = [],
) {
  const value = record[key];

  if (typeof value !== "string" || !value.trim()) {
    issues.push(validationIssue([...path, key], "required", `${key} is required.`));
    return undefined;
  }

  if (value.length > MAX_STRING_LENGTH) {
    issues.push(
      validationIssue(
        [...path, key],
        "too_large",
        `${key} cannot exceed ${MAX_STRING_LENGTH} characters.`,
      ),
    );
    return undefined;
  }

  return value.trim();
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  issues: ApiValidationIssue[],
  path: Array<string | number> = [],
) {
  const value = record[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    issues.push(
      validationIssue([...path, key], "invalid_type", `${key} must be a string.`),
    );
    return undefined;
  }

  if (value.length > MAX_STRING_LENGTH) {
    issues.push(
      validationIssue(
        [...path, key],
        "too_large",
        `${key} cannot exceed ${MAX_STRING_LENGTH} characters.`,
      ),
    );
    return undefined;
  }

  return value.trim();
}

function readOptionalNonNegativeNumber(
  record: Record<string, unknown>,
  key: string,
  issues: ApiValidationIssue[],
  path: Array<string | number>,
) {
  const value = record[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push(
      validationIssue(
        [...path, key],
        "invalid_type",
        `${key} must be a non-negative number.`,
      ),
    );
    return undefined;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
