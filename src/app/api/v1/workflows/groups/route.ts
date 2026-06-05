import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  validationIssue,
  type ApiRequestValidationResult,
  type ApiValidationIssue,
} from "@/lib/backend/api/api-request-validator";
import {
  WORKFLOW_GROUP_RECORD_EVENT_SCHEMA,
  createWorkflowGroupRecordEvent,
  getDefaultObservabilityService,
} from "@/lib/backend/observability";
import type {
  WorkflowGroupRecordContractInput,
  WorkflowGroupRecordEdgeInput,
  WorkflowGroupRecordNodeInput,
  WorkflowGroupRecordWriteRequest,
  WorkflowGroupRecordWriteResponse,
  WorkflowRuntimeGroupRef,
  WorkflowRuntimeNodeStatus,
  WorkflowRuntimeNodeType,
} from "@/lib/nexus-types";

import { assertObservabilityAccess } from "../../observability/observability-route-helpers";

export const runtime = "nodejs";

const MAX_NODES = 240;
const MAX_EDGES = 320;
const MAX_GAPS = 80;
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
  "secret",
  "token",
]);
const NODE_TYPES = new Set<WorkflowRuntimeNodeType>([
  "input.text",
  "model.image",
  "model.llm",
  "node.file",
  "output.text",
]);
const NODE_STATUSES = new Set<WorkflowRuntimeNodeStatus>([
  "failed",
  "failed_interrupted",
  "idle",
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
  WorkflowGroupRecordWriteRequest,
  WorkflowGroupRecordWriteResponse
>({
  auth: {
    required: true,
  },
  handler: async ({ body, trace, workspaceId }) => {
    await assertObservabilityAccess({
      action: "workflow.group.upsert",
      trace,
      workspaceId,
    });

    const event = createWorkflowGroupRecordEvent({
      occurredAt: body.occurredAt,
      record: body,
      requestId: trace.requestId,
      traceId: body.traceId ?? trace.traceId,
      userId: trace.userId,
    });
    const record = await getDefaultObservabilityService().recordSystemEvent(event);
    const workflowId = body.workflowId?.trim() || body.group.id;

    return {
      edgeCount: body.edges.length,
      eventId: record.id,
      eventType: record.eventType,
      nodeCount: body.nodes.length,
      schema: WORKFLOW_GROUP_RECORD_EVENT_SCHEMA,
      traceId: record.traceId,
      workflowGroupId: body.group.id,
      workflowId,
      workspaceId,
    };
  },
  idempotency: {
    enabled: false,
  },
  methods: ["POST"],
  route: "/api/v1/workflows/groups",
  validator: validateWorkflowGroupRecordWriteRequest,
  workspaceId: (_request, body) =>
    isRecord(body) && typeof body.workspaceId === "string"
      ? body.workspaceId
      : undefined,
});

function validateWorkflowGroupRecordWriteRequest(
  value: unknown,
): ApiRequestValidationResult<WorkflowGroupRecordWriteRequest> {
  const issues: ApiValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      issues: [validationIssue([], "invalid_type", "Request body must be an object.")],
      ok: false,
    };
  }

  issues.push(...collectForbiddenPayloadKeys(value));

  const workspaceId = readRequiredString(value, "workspaceId", issues);
  const occurredAt = readOptionalString(value, "occurredAt", issues);
  const traceId = readOptionalString(value, "traceId", issues);
  const workflowId = readOptionalString(value, "workflowId", issues);
  const compilerManifestSchema = readOptionalString(
    value,
    "compilerManifestSchema",
    issues,
  );
  const group = validateGroup(value.group, issues);
  const contract = validateContract(value.contract, issues);
  const nodes = validateNodes(value.nodes, issues);
  const edges = validateEdges(value.edges, issues);
  const capabilityGaps = validateStringArray(
    value.capabilityGaps,
    issues,
    "capabilityGaps",
    MAX_GAPS,
  );

  if (issues.length || !workspaceId || !group || !nodes || !edges) {
    return { issues, ok: false };
  }

  return {
    data: {
      ...(capabilityGaps?.length ? { capabilityGaps } : {}),
      ...(compilerManifestSchema ? { compilerManifestSchema } : {}),
      ...(contract ? { contract } : {}),
      edges,
      group,
      nodes,
      ...(occurredAt ? { occurredAt } : {}),
      ...(traceId ? { traceId } : {}),
      ...(workflowId ? { workflowId } : {}),
      workspaceId,
    },
    ok: true,
  };
}

function validateGroup(
  value: unknown,
  issues: ApiValidationIssue[],
): WorkflowRuntimeGroupRef | null {
  if (!isRecord(value)) {
    issues.push(validationIssue(["group"], "invalid_type", "group must be an object."));
    return null;
  }

  const id = readRequiredString(value, "id", issues, ["group"]);
  const createdAt = readOptionalString(value, "createdAt", issues, ["group"]);
  const label = readOptionalString(value, "label", issues, ["group"]);
  const source =
    typeof value.source === "string" && GROUP_SOURCES.has(value.source as never)
      ? (value.source as WorkflowRuntimeGroupRef["source"])
      : undefined;

  if (typeof value.source === "string" && !source) {
    issues.push(
      validationIssue(["group", "source"], "invalid_enum", "group.source is invalid."),
    );
  }

  if (!id) {
    return null;
  }

  return {
    ...(createdAt ? { createdAt } : {}),
    id,
    ...(label ? { label } : {}),
    ...(source ? { source } : {}),
  };
}

function validateContract(
  value: unknown,
  issues: ApiValidationIssue[],
): WorkflowGroupRecordContractInput | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!isRecord(value)) {
    issues.push(
      validationIssue(["contract"], "invalid_type", "contract must be an object."),
    );
    return undefined;
  }

  const schema = readRequiredString(value, "schema", issues, ["contract"]);
  const name = readOptionalString(value, "name", issues, ["contract"]);
  const version = readOptionalString(value, "version", issues, ["contract"]);

  if (!schema) {
    return undefined;
  }

  return {
    ...(name ? { name } : {}),
    schema,
    ...(version ? { version } : {}),
  };
}

function validateNodes(value: unknown, issues: ApiValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push(validationIssue(["nodes"], "invalid_type", "nodes must be an array."));
    return null;
  }

  if (value.length > MAX_NODES) {
    issues.push(validationIssue(["nodes"], "too_large", "nodes exceeds the maximum."));
  }

  const nodes: WorkflowGroupRecordNodeInput[] = [];

  value.slice(0, MAX_NODES).forEach((node, index) => {
    if (!isRecord(node)) {
      issues.push(validationIssue(["nodes", index], "invalid_type", "node must be an object."));
      return;
    }

    const id = readRequiredString(node, "id", issues, ["nodes", index]);
    const label = readOptionalString(node, "label", issues, ["nodes", index]);
    const type =
      typeof node.type === "string" && NODE_TYPES.has(node.type as never)
        ? (node.type as WorkflowRuntimeNodeType)
        : undefined;
    const status =
      typeof node.status === "string" && NODE_STATUSES.has(node.status as never)
        ? (node.status as WorkflowRuntimeNodeStatus)
        : undefined;

    if (!type) {
      issues.push(validationIssue(["nodes", index, "type"], "invalid_enum", "node.type is invalid."));
    }

    if (typeof node.status === "string" && !status) {
      issues.push(
        validationIssue(["nodes", index, "status"], "invalid_enum", "node.status is invalid."),
      );
    }

    if (id && type) {
      nodes.push({
        id,
        ...(label ? { label } : {}),
        ...(status ? { status } : {}),
        type,
      });
    }
  });

  return nodes;
}

function validateEdges(value: unknown, issues: ApiValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push(validationIssue(["edges"], "invalid_type", "edges must be an array."));
    return null;
  }

  if (value.length > MAX_EDGES) {
    issues.push(validationIssue(["edges"], "too_large", "edges exceeds the maximum."));
  }

  const edges: WorkflowGroupRecordEdgeInput[] = [];

  value.slice(0, MAX_EDGES).forEach((edge, index) => {
    if (!isRecord(edge)) {
      issues.push(validationIssue(["edges", index], "invalid_type", "edge must be an object."));
      return;
    }

    const id = readRequiredString(edge, "id", issues, ["edges", index]);
    const source = readRequiredString(edge, "source", issues, ["edges", index]);
    const target = readRequiredString(edge, "target", issues, ["edges", index]);
    const label = readOptionalString(edge, "label", issues, ["edges", index]);

    if (id && source && target) {
      edges.push({
        id,
        ...(label ? { label } : {}),
        source,
        target,
      });
    }
  });

  return edges;
}

function validateStringArray(
  value: unknown,
  issues: ApiValidationIssue[],
  key: string,
  maxLength: number,
) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    issues.push(validationIssue([key], "invalid_type", `${key} must be an array.`));
    return undefined;
  }

  if (value.length > maxLength) {
    issues.push(validationIssue([key], "too_large", `${key} exceeds the maximum.`));
  }

  return value
    .slice(0, maxLength)
    .map((entry) => (typeof entry === "string" ? entry.trim().slice(0, MAX_STRING_LENGTH) : ""))
    .filter(Boolean);
}

function readRequiredString(
  value: Record<string, unknown>,
  key: string,
  issues: ApiValidationIssue[],
  path: Array<string | number> = [],
) {
  const raw = value[key];

  if (typeof raw !== "string" || !raw.trim()) {
    issues.push(
      validationIssue([...path, key], "invalid_type", `${key} must be a string.`),
    );
    return "";
  }

  return raw.trim().slice(0, MAX_STRING_LENGTH);
}

function readOptionalString(
  value: Record<string, unknown>,
  key: string,
  issues: ApiValidationIssue[],
  path: Array<string | number> = [],
) {
  const raw = value[key];

  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }

  if (typeof raw !== "string") {
    issues.push(
      validationIssue([...path, key], "invalid_type", `${key} must be a string.`),
    );
    return undefined;
  }

  return raw.trim().slice(0, MAX_STRING_LENGTH);
}

function collectForbiddenPayloadKeys(
  value: unknown,
  path: Array<string | number> = [],
): ApiValidationIssue[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectForbiddenPayloadKeys(entry, [...path, index]),
    );
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, entry]) => {
    const nextPath = [...path, key];
    const ownIssue = FORBIDDEN_PAYLOAD_KEYS.has(key)
      ? [
          validationIssue(
            nextPath,
            "forbidden_key",
            `${key} is not accepted by the workflow group record route.`,
          ),
        ]
      : [];

    return [...ownIssue, ...collectForbiddenPayloadKeys(entry, nextPath)];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
