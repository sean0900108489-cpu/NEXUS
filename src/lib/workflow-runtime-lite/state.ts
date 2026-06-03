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
  normalizeWorkspaceComposerImageSettings,
  type WorkspaceComposerImageAspectRatio,
  type WorkspaceComposerImageQuality,
} from "@/lib/composer/image-generation-settings";

import {
  WORKFLOW_RUNTIME_LITE_VERSION,
  WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS,
  WORKFLOW_RUNTIME_MAX_METADATA_STRING_CHARS,
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
  const display = limitDisplayText(displayText ?? rawText);

  return {
    id: createWorkflowRuntimeId("packet"),
    createdAt: new Date().toISOString(),
    displayText: display.value,
    metadata: sanitizePacketMetadata(metadata ?? {}),
    rawText,
    runId,
    sourceNodeId,
    tokenEstimate: estimateTokens(rawText),
    ...(display.truncated ? { truncated: true } : {}),
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
      text: typeof value.text === "string" ? limitConfigText(value.text) : inputDefaults.text,
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
        ? limitConfigText(value.prompt)
        : modelDefaults.prompt,
      provider: typeof value.provider === "string" ? value.provider : modelDefaults.provider,
    };
  }

  if (type === "node.file") {
    const fileDefaults = defaults as WorkflowNodeInstance<"node.file">["data"];

    return {
      ...fileDefaults,
      attachments: Array.isArray(value.attachments)
        ? value.attachments
            .map(normalizeFileNodeAttachment)
            .filter((attachment): attachment is WorkflowNodeInstance<"node.file">["data"]["attachments"][number] => Boolean(attachment))
        : fileDefaults.attachments,
      compilerId: typeof value.compilerId === "string" && value.compilerId.trim()
        ? value.compilerId.trim()
        : fileDefaults.compilerId,
      compilerVersion:
        typeof value.compilerVersion === "string" && value.compilerVersion.trim()
          ? value.compilerVersion.trim()
          : fileDefaults.compilerVersion,
      label: typeof value.label === "string" ? value.label : fileDefaults.label,
      note: typeof value.note === "string" ? limitConfigText(value.note) : fileDefaults.note,
    };
  }

  if (type === "model.image") {
    const imageDefaults = defaults as WorkflowNodeInstance<"model.image">["data"];
    const imageSettings = normalizeWorkspaceComposerImageSettings({
      aspectRatio: value.aspectRatio as WorkspaceComposerImageAspectRatio,
      modelId: typeof value.modelId === "string" ? value.modelId : undefined,
      quality: value.quality as WorkspaceComposerImageQuality,
    });

    return {
      ...imageDefaults,
      aspectRatio: imageSettings.aspectRatio,
      label: typeof value.label === "string" ? value.label : imageDefaults.label,
      modelId: imageSettings.modelId,
      prompt: typeof value.prompt === "string"
        ? limitConfigText(value.prompt)
        : imageDefaults.prompt,
      quality: imageSettings.quality,
    };
  }

  const outputDefaults = defaults as WorkflowNodeInstance<"output.text">["data"];

  return {
    ...outputDefaults,
    label: typeof value.label === "string" ? value.label : outputDefaults.label,
    renderMode: value.renderMode === "markdown" ? "markdown" : outputDefaults.renderMode,
  };
}

function normalizeFileNodeAttachment(
  value: unknown,
): WorkflowNodeInstance<"node.file">["data"]["attachments"][number] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    typeof value.compilerId !== "string" ||
    typeof value.compilerVersion !== "string" ||
    typeof value.mimeType !== "string" ||
    typeof value.name !== "string" ||
    typeof value.sizeBytes !== "number" ||
    !Number.isFinite(value.sizeBytes)
  ) {
    return undefined;
  }

  return {
    artifactId: typeof value.artifactId === "string" ? value.artifactId : undefined,
    compiledArtifactId:
      typeof value.compiledArtifactId === "string" ? value.compiledArtifactId : undefined,
    compilerId: value.compilerId,
    compilerVersion: value.compilerVersion,
    contentKind:
      value.contentKind === "binary" || value.contentKind === "reference"
        ? value.contentKind
        : "text",
    mimeType: value.mimeType,
    name: value.name,
    rawArtifactId: typeof value.rawArtifactId === "string" ? value.rawArtifactId : undefined,
    sizeBytes: Math.max(0, value.sizeBytes),
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

  const display = limitDisplayText(value.displayText);
  const truncated = Boolean(value.truncated) || display.truncated;

  return {
    createdAt: value.createdAt,
    displayText: display.value,
    id: value.id,
    metadata: sanitizePacketMetadata(
      isRecord(value.metadata) ? value.metadata : {},
    ),
    rawText: value.rawText,
    runId: value.runId,
    sourceNodeId: value.sourceNodeId,
    tokenEstimate:
      typeof value.tokenEstimate === "number"
        ? value.tokenEstimate
        : estimateTokens(value.rawText),
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

function limitDisplayText(value: string) {
  if (value.length <= WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS) {
    return { truncated: false, value };
  }

  return {
    truncated: true,
    value: value.slice(0, WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS),
  };
}

function limitConfigText(value: string) {
  return value.length <= WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS
    ? value
    : value.slice(0, WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS);
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

    const nextValue = sanitizePacketMetadataValue(value, 0);

    if (nextValue !== undefined) {
      sanitized[key] = nextValue;
    }
  }

  return sanitized;
}

function sanitizePacketMetadataValue(
  value: unknown,
  depth: number,
): unknown | undefined {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return Number.isFinite(value as number) || typeof value !== "number"
      ? value
      : undefined;
  }

  if (typeof value === "string") {
    return value.slice(0, WORKFLOW_RUNTIME_MAX_METADATA_STRING_CHARS);
  }

  if (depth >= 3) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((entry) => sanitizePacketMetadataValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }

  if (isRecord(value)) {
    const sanitized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value).slice(0, 20)) {
      if (/authorization|api[-_]?key|token|secret/i.test(key)) {
        continue;
      }

      const nextValue = sanitizePacketMetadataValue(entry, depth + 1);

      if (nextValue !== undefined) {
        sanitized[key] = nextValue;
      }
    }

    return sanitized;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
