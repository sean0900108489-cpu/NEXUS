import type {
  ContextPacket,
  NodeExecution,
  WorkflowNodeInstance,
  WorkflowRun,
  WorkflowRuntimeEdge,
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeData,
  WorkflowRuntimeNodeStatus,
  WorkflowRuntimeNodeType,
  WorkflowRuntimeRunStatus,
} from "@/lib/nexus-types";

import {
  WORKFLOW_RUNTIME_LITE_VERSION,
  WORKFLOW_RUNTIME_MAX_METADATA_STRING_CHARS,
  WORKFLOW_RUNTIME_MAX_PACKET_TEXT_CHARS,
  WORKFLOW_RUNTIME_MAX_RUNS,
} from "./constants";
import {
  getWorkflowRuntimeNodeDefinition,
  isWorkflowRuntimeNodeType,
} from "./registry";

const nodeStatuses: WorkflowRuntimeNodeStatus[] = [
  "idle",
  "queued",
  "running",
  "success",
  "failed",
  "failed_interrupted",
];

const runStatuses: WorkflowRuntimeRunStatus[] = [
  "queued",
  "running",
  "success",
  "failed",
  "failed_interrupted",
];

type NormalizeOptions = {
  resetInterrupted?: boolean;
};

export function createWorkflowRuntimeId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}_${random}`;
}

export function createContextPacket({
  displayText,
  metadata,
  rawText,
  runId,
  sourceNodeId,
}: {
  displayText?: string;
  metadata?: Record<string, unknown>;
  rawText: string;
  runId: string;
  sourceNodeId: string;
}): ContextPacket {
  const raw = limitText(rawText);
  const display = limitText(displayText ?? rawText);
  const truncated = raw.truncated || display.truncated;

  return {
    id: createWorkflowRuntimeId("packet"),
    createdAt: new Date().toISOString(),
    displayText: display.value,
    metadata: sanitizePacketMetadata(metadata ?? {}),
    rawText: raw.value,
    runId,
    sourceNodeId,
    tokenEstimate: estimateTokens(raw.value),
    ...(truncated ? { truncated: true } : {}),
  };
}

export function cloneContextPacket(packet: ContextPacket | null | undefined) {
  return packet ? normalizeContextPacket(packet) : null;
}

export function createWorkflowRuntimeNode<TType extends WorkflowRuntimeNodeType>({
  id = createWorkflowRuntimeId("wf_node"),
  position,
  type,
}: {
  id?: string;
  position: { x: number; y: number };
  type: TType;
}): WorkflowNodeInstance<TType> {
  const definition = getWorkflowRuntimeNodeDefinition(type);

  return {
    data: definition.defaultData(),
    error: null,
    id,
    inputSnapshot: null,
    outputSnapshot: null,
    position,
    status: "idle",
    type,
  } as WorkflowNodeInstance<TType>;
}

export function createEmptyWorkflowRuntimeLiteState(): WorkflowRuntimeLiteState {
  return {
    edges: [],
    lastError: null,
    lastRunId: null,
    nodes: [],
    runs: [],
    version: WORKFLOW_RUNTIME_LITE_VERSION,
  };
}

export function normalizeWorkflowRuntimeLiteState(
  value: unknown,
  options: NormalizeOptions = {},
): WorkflowRuntimeLiteState {
  const resetInterrupted = options.resetInterrupted ?? true;

  if (!isRecord(value) || value.version !== WORKFLOW_RUNTIME_LITE_VERSION) {
    return createEmptyWorkflowRuntimeLiteState();
  }

  const nodes = Array.isArray(value.nodes)
    ? value.nodes
        .map((node) => normalizeNode(node, resetInterrupted))
        .filter((node): node is WorkflowNodeInstance => Boolean(node))
    : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = Array.isArray(value.edges)
    ? value.edges
        .map(normalizeEdge)
        .filter((edge): edge is WorkflowRuntimeEdge => Boolean(edge))
        .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    : [];
  const runs = Array.isArray(value.runs)
    ? value.runs
        .map((run) => normalizeRun(run, resetInterrupted))
        .filter((run): run is WorkflowRun => Boolean(run))
        .slice(0, WORKFLOW_RUNTIME_MAX_RUNS)
    : [];

  return {
    edges,
    lastError: typeof value.lastError === "string" ? value.lastError : null,
    lastRunId: typeof value.lastRunId === "string" ? value.lastRunId : null,
    nodes,
    runs,
    version: WORKFLOW_RUNTIME_LITE_VERSION,
  };
}

export function resetInterruptedWorkflowRuntimeLiteState(
  runtimeLite: WorkflowRuntimeLiteState,
) {
  return normalizeWorkflowRuntimeLiteState(runtimeLite, { resetInterrupted: true });
}

export function limitWorkflowRuns(runs: WorkflowRun[]) {
  return runs.slice(0, WORKFLOW_RUNTIME_MAX_RUNS);
}

function normalizeNode(
  value: unknown,
  resetInterrupted: boolean,
): WorkflowNodeInstance | undefined {
  if (!isRecord(value) || !isWorkflowRuntimeNodeType(value.type)) {
    return undefined;
  }

  const definition = getWorkflowRuntimeNodeDefinition(value.type);
  const defaults = definition.defaultData();
  const status = normalizeNodeStatus(value.status, resetInterrupted);

  return {
    data: normalizeNodeData(value.type, value.data, defaults),
    error: typeof value.error === "string" ? value.error : null,
    id: typeof value.id === "string" && value.id ? value.id : createWorkflowRuntimeId("wf_node"),
    inputSnapshot: normalizeContextPacket(value.inputSnapshot),
    outputSnapshot: normalizeContextPacket(value.outputSnapshot),
    position: normalizePosition(value.position),
    status,
    type: value.type,
  } as WorkflowNodeInstance;
}

function normalizeNodeData(
  type: WorkflowRuntimeNodeType,
  value: unknown,
  defaults: WorkflowRuntimeNodeData,
): WorkflowRuntimeNodeData {
  if (!isRecord(value)) {
    return defaults;
  }

  if (type === "input.text") {
    const inputDefaults = defaults as WorkflowNodeInstance<"input.text">["data"];

    return {
      ...inputDefaults,
      label: typeof value.label === "string" ? value.label : inputDefaults.label,
      text: typeof value.text === "string" ? limitText(value.text).value : inputDefaults.text,
    };
  }

  if (type === "model.llm") {
    const modelDefaults = defaults as WorkflowNodeInstance<"model.llm">["data"];

    return {
      ...modelDefaults,
      label: typeof value.label === "string" ? value.label : modelDefaults.label,
      model: typeof value.model === "string" && value.model.trim()
        ? value.model.trim()
        : modelDefaults.model,
      prompt: typeof value.prompt === "string"
        ? limitText(value.prompt).value
        : modelDefaults.prompt,
      provider: typeof value.provider === "string" ? value.provider : modelDefaults.provider,
    };
  }

  const outputDefaults = defaults as WorkflowNodeInstance<"output.text">["data"];

  return {
    ...outputDefaults,
    label: typeof value.label === "string" ? value.label : outputDefaults.label,
    renderMode: value.renderMode === "markdown" ? "markdown" : outputDefaults.renderMode,
  };
}

function normalizeEdge(value: unknown): WorkflowRuntimeEdge | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.source !== "string" ||
    typeof value.sourceHandle !== "string" ||
    typeof value.target !== "string" ||
    typeof value.targetHandle !== "string"
  ) {
    return undefined;
  }

  return {
    animated: typeof value.animated === "boolean" ? value.animated : true,
    id: value.id,
    label: typeof value.label === "string" ? value.label : undefined,
    source: value.source,
    sourceHandle: value.sourceHandle,
    target: value.target,
    targetHandle: value.targetHandle,
  };
}

function normalizeRun(
  value: unknown,
  resetInterrupted: boolean,
): WorkflowRun | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    typeof value.runId !== "string" ||
    typeof value.workflowId !== "string" ||
    typeof value.startedAt !== "string"
  ) {
    return undefined;
  }

  const status = normalizeRunStatus(value.status, resetInterrupted);
  const interrupted =
    resetInterrupted &&
    (value.status === "queued" || value.status === "running");

  return {
    completedAt:
      typeof value.completedAt === "string"
        ? value.completedAt
        : interrupted
          ? new Date().toISOString()
          : null,
    error:
      typeof value.error === "string"
        ? value.error
        : interrupted
          ? "Run interrupted during hydration."
          : null,
    nodeExecutions: Array.isArray(value.nodeExecutions)
      ? value.nodeExecutions
          .map((execution) => normalizeNodeExecution(execution, resetInterrupted))
          .filter((execution): execution is NodeExecution => Boolean(execution))
      : [],
    runId: value.runId,
    startedAt: value.startedAt,
    status,
    workflowId: value.workflowId,
  };
}

function normalizeNodeExecution(
  value: unknown,
  resetInterrupted: boolean,
): NodeExecution | undefined {
  if (!isRecord(value) || typeof value.runId !== "string" || typeof value.nodeId !== "string") {
    return undefined;
  }

  const status = normalizeNodeStatus(value.status, resetInterrupted);
  const interrupted =
    resetInterrupted &&
    (value.status === "queued" || value.status === "running");

  return {
    completedAt:
      typeof value.completedAt === "string"
        ? value.completedAt
        : interrupted
          ? new Date().toISOString()
          : undefined,
    error:
      typeof value.error === "string"
        ? value.error
        : interrupted
          ? "Node interrupted during hydration."
          : null,
    inputSnapshot: normalizeContextPacket(value.inputSnapshot),
    latencyMs: typeof value.latencyMs === "number" ? value.latencyMs : null,
    nodeId: value.nodeId,
    outputSnapshot: normalizeContextPacket(value.outputSnapshot),
    runId: value.runId,
    startedAt: typeof value.startedAt === "string" ? value.startedAt : undefined,
    status,
  };
}

function normalizeContextPacket(value: unknown): ContextPacket | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.rawText !== "string" ||
    typeof value.displayText !== "string" ||
    typeof value.sourceNodeId !== "string" ||
    typeof value.runId !== "string" ||
    typeof value.createdAt !== "string"
  ) {
    return null;
  }

  const raw = limitText(value.rawText);
  const display = limitText(value.displayText);
  const truncated = Boolean(value.truncated) || raw.truncated || display.truncated;

  return {
    createdAt: value.createdAt,
    displayText: display.value,
    id: value.id,
    metadata: sanitizePacketMetadata(
      isRecord(value.metadata) ? value.metadata : {},
    ),
    rawText: raw.value,
    runId: value.runId,
    sourceNodeId: value.sourceNodeId,
    tokenEstimate:
      typeof value.tokenEstimate === "number"
        ? value.tokenEstimate
        : estimateTokens(raw.value),
    ...(truncated ? { truncated: true } : {}),
  };
}

function normalizePosition(value: unknown) {
  if (!isRecord(value)) {
    return { x: 120, y: 120 };
  }

  return {
    x: typeof value.x === "number" && Number.isFinite(value.x) ? value.x : 120,
    y: typeof value.y === "number" && Number.isFinite(value.y) ? value.y : 120,
  };
}

function normalizeNodeStatus(
  value: unknown,
  resetInterrupted: boolean,
): WorkflowRuntimeNodeStatus {
  if (resetInterrupted && (value === "queued" || value === "running")) {
    return "failed_interrupted";
  }

  return nodeStatuses.includes(value as WorkflowRuntimeNodeStatus)
    ? (value as WorkflowRuntimeNodeStatus)
    : "idle";
}

function normalizeRunStatus(
  value: unknown,
  resetInterrupted: boolean,
): WorkflowRuntimeRunStatus {
  if (resetInterrupted && (value === "queued" || value === "running")) {
    return "failed_interrupted";
  }

  return runStatuses.includes(value as WorkflowRuntimeRunStatus)
    ? (value as WorkflowRuntimeRunStatus)
    : "failed";
}

function limitText(value: string) {
  if (value.length <= WORKFLOW_RUNTIME_MAX_PACKET_TEXT_CHARS) {
    return { truncated: false, value };
  }

  return {
    truncated: true,
    value: value.slice(0, WORKFLOW_RUNTIME_MAX_PACKET_TEXT_CHARS),
  };
}

function estimateTokens(value: string) {
  return Math.max(1, Math.ceil(value.length / 4));
}

function sanitizePacketMetadata(metadata: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata).slice(0, 20)) {
    if (/authorization|api[-_]?key|token|secret/i.test(key)) {
      continue;
    }

    if (
      value === null ||
      typeof value === "boolean" ||
      typeof value === "number"
    ) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === "string") {
      sanitized[key] = value.slice(0, WORKFLOW_RUNTIME_MAX_METADATA_STRING_CHARS);
    }
  }

  return sanitized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
