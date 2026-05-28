import {
  normalizeAgentModelSettings,
} from "@/lib/nexus-registry";
import {
  DEFAULT_SANDBOX_CODE,
  DEFAULT_WORKSPACE_BRANCHING_SETTINGS,
  WORKSPACE_SCHEMA_VERSION,
  agentTemplates,
  cloneWorkspace,
  getDefaultCapabilities,
  getDefaultGraphPosition,
  resolveAgentTemplateProfile,
} from "@/lib/nexus-defaults";
import type {
  AgentCapabilities,
  AgentCapabilityType,
  AgentLayout,
  AgentModelSettings,
  AgentTemplateProfile,
  LocalSyncQueueOperation,
  NexusAgent,
  NexusWorkspace,
  NotebookRecord,
  ToolStatus,
  WorkspaceGraphEdge,
  WorkspaceGraphNode,
  WorkspaceCloudSnapshotPayload,
  WorkspaceNotebookRecoveryMetadata,
  WorkspacePanel,
  WorkspaceSnapshot,
  WorkspaceBranchingSettings,
  WorkspaceThemeConfig,
} from "@/lib/nexus-types";
import { normalizeWorkflowRuntimeLiteState } from "@/lib/workflow-runtime-lite/state";

type ValidationResult =
  | { ok: true; workspace: NexusWorkspace }
  | { ok: false; error: string };

const toolStatuses: ToolStatus[] = [
  "available",
  "planned",
  "queued",
  "running",
  "done",
  "error",
  "offline",
];

const capabilityTypes: AgentCapabilityType[] = [
  "chat",
  "image",
  "video",
  "sandbox",
  "audio",
  "search",
  "data-analysis",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isPlainString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateLayout(value: unknown): value is AgentLayout {
  if (!isObject(value)) {
    return false;
  }

  return (
    isNumber(value.x) &&
    isNumber(value.y) &&
    isNumber(value.width) &&
    isNumber(value.height) &&
    isNumber(value.zIndex)
  );
}

function validateCapabilities(value: unknown): value is AgentCapabilities {
  return (
    value === undefined ||
    (isObject(value) &&
      capabilityTypes.includes(value.type as AgentCapabilityType) &&
      Array.isArray(value.supportedModels) &&
      value.supportedModels.every((model) => typeof model === "string"))
  );
}

function validateModelSettings(value: unknown): value is AgentModelSettings {
  if (value === undefined) {
    return true;
  }

  if (!isObject(value)) {
    return false;
  }

  return (
    (value.reasoningEffort === undefined || typeof value.reasoningEffort === "string") &&
    (value.verbosity === undefined || typeof value.verbosity === "string") &&
    (value.reasoningDetail === undefined || typeof value.reasoningDetail === "string") &&
    (value.temperature === undefined || isNumber(value.temperature))
  );
}

function validateAgent(agent: unknown): agent is NexusAgent {
  if (!isObject(agent)) {
    return false;
  }

  const tools = agent.tools;
  const memory = agent.memory;
  const contextNotes = agent.contextNotes;
  const messages = agent.messages;

  return (
    isString(agent.id) &&
    isString(agent.callsign) &&
    isString(agent.title) &&
    isPlainString(agent.identity) &&
    isPlainString(agent.mission) &&
    (agent.executionPrompt === undefined ||
      isPlainString(agent.executionPrompt)) &&
    (agent.profileLocked === undefined || typeof agent.profileLocked === "boolean") &&
    isString(agent.provider) &&
    isString(agent.model) &&
    validateModelSettings(agent.modelSettings) &&
    validateCapabilities(agent.capabilities) &&
    (agent.sandboxCode === undefined || typeof agent.sandboxCode === "string") &&
    (agent.sandboxUrl === undefined || typeof agent.sandboxUrl === "string") &&
    ["idle", "thinking", "streaming", "error"].includes(String(agent.status)) &&
    isString(agent.accent) &&
    Array.isArray(memory) &&
    Array.isArray(contextNotes) &&
    Array.isArray(messages) &&
    Array.isArray(tools) &&
    tools.every(
      (tool) =>
        isObject(tool) &&
        isString(tool.id) &&
        isString(tool.name) &&
        isString(tool.scope) &&
        toolStatuses.includes(tool.status as ToolStatus),
    ) &&
    validateLayout(agent.layout) &&
    typeof agent.minimized === "boolean" &&
    typeof agent.maximized === "boolean" &&
    isString(agent.createdAt) &&
    isString(agent.updatedAt) &&
    isObject(agent.telemetry)
  );
}

function validatePanel(panel: unknown): panel is WorkspacePanel {
  return (
    isObject(panel) &&
    isString(panel.id) &&
    panel.type === "agent" &&
    isString(panel.agentId) &&
    validateLayout(panel.layout) &&
    typeof panel.minimized === "boolean" &&
    typeof panel.maximized === "boolean"
  );
}

function validateGraphNode(node: unknown): node is WorkspaceGraphNode {
  return (
    isObject(node) &&
    isString(node.agentId) &&
    isNumber(node.x) &&
    isNumber(node.y)
  );
}

function validateGraphEdge(edge: unknown): edge is WorkspaceGraphEdge {
  return (
    isObject(edge) &&
    isString(edge.id) &&
    isString(edge.sourceAgentId) &&
    isString(edge.targetAgentId)
  );
}

function sanitizeThemeConfig(value: unknown): WorkspaceThemeConfig | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const next: WorkspaceThemeConfig = {};

  if (typeof value.radius === "string") {
    next.radius = value.radius;
  }

  if (typeof value.blur === "string") {
    next.blur = value.blur;
  }

  if (typeof value.borderWidth === "string") {
    next.borderWidth = value.borderWidth;
  }

  if (typeof value.iconWeight === "string") {
    next.iconWeight = value.iconWeight;
  }

  if (typeof value.fontFamily === "string") {
    next.fontFamily = value.fontFamily;
  }

  if (typeof value.chatOpacity === "string") {
    next.chatOpacity = value.chatOpacity;
  }

  return Object.keys(next).length ? next : undefined;
}

function clampRetentionRatio(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(5, Math.round(value)))
    : DEFAULT_WORKSPACE_BRANCHING_SETTINGS.defaultRetentionRatio;
}

function sanitizeBranchingSettings(value: unknown): WorkspaceBranchingSettings {
  if (!isObject(value)) {
    return { ...DEFAULT_WORKSPACE_BRANCHING_SETTINGS };
  }

  return {
    ...DEFAULT_WORKSPACE_BRANCHING_SETTINGS,
    defaultRetentionRatio: clampRetentionRatio(value.defaultRetentionRatio),
  };
}

function sanitizeAgentTemplateProfiles(
  value: unknown,
): Record<string, AgentTemplateProfile> {
  if (!isObject(value)) {
    return {};
  }

  return Object.fromEntries(
    agentTemplates.flatMap((template) => {
      const rawProfile = value[template.id];

      if (!isObject(rawProfile)) {
        return [];
      }

      return [
        [
          template.id,
          resolveAgentTemplateProfile(
            template,
            rawProfile as Partial<AgentTemplateProfile>,
          ),
        ],
      ];
    }),
  );
}

function sanitizeCheckpoints(value: unknown): NexusWorkspace["checkpoints"] {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter(
      (checkpoint) =>
        isObject(checkpoint) &&
        isString(checkpoint.id) &&
        isString(checkpoint.reason) &&
        isString(checkpoint.timestamp) &&
        isObject(checkpoint.snapshot),
    )
    .map((checkpoint) => {
      const snapshot = cloneWorkspace(checkpoint.snapshot as NexusWorkspace);
      delete (snapshot as NexusWorkspace).checkpoints;

      return {
        id: checkpoint.id as string,
        reason: checkpoint.reason as string,
        snapshot,
        timestamp: checkpoint.timestamp as string,
      };
    })
    .slice(0, 10);
}

export function validateWorkspaceSnapshot(value: unknown): ValidationResult {
  if (!isObject(value)) {
    return { ok: false, error: "Import failed: JSON root must be an object." };
  }

  if (value.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    return { ok: false, error: "Import failed: unsupported schemaVersion." };
  }

  if (!isObject(value.workspace)) {
    return { ok: false, error: "Import failed: workspace missing." };
  }

  const workspace = value.workspace;

  if (
    !isString(workspace.id) ||
    !isString(workspace.name) ||
    !Array.isArray(workspace.agents) ||
    !Array.isArray(workspace.panels) ||
    !isObject(workspace.settings) ||
    !isString(workspace.createdAt) ||
    !isString(workspace.updatedAt)
  ) {
    return { ok: false, error: "Import failed: workspace fields are invalid." };
  }

  if (!workspace.agents.every(validateAgent)) {
    return { ok: false, error: "Import failed: one or more agents are invalid." };
  }

  if (!workspace.panels.every(validatePanel)) {
    return { ok: false, error: "Import failed: one or more panels are invalid." };
  }

  const graph = isObject(workspace.graph) ? workspace.graph : { nodes: [], edges: [] };

  if (
    !Array.isArray(graph.nodes) ||
    !Array.isArray(graph.edges) ||
    !graph.nodes.every(validateGraphNode) ||
    !graph.edges.every(validateGraphEdge)
  ) {
    return { ok: false, error: "Import failed: graph fields are invalid." };
  }

  const agentIds = new Set(workspace.agents.map((agent) => agent.id));
  const panelsAreValid = workspace.panels.every((panel) => agentIds.has(panel.agentId));
  const graphIsValid =
    graph.nodes.every((node) => agentIds.has(node.agentId)) &&
    graph.edges.every(
      (edge) => agentIds.has(edge.sourceAgentId) && agentIds.has(edge.targetAgentId),
    );

  if (!panelsAreValid || !graphIsValid) {
    return { ok: false, error: "Import failed: workspace references unknown agent." };
  }

  return {
    ok: true,
    workspace: sanitizeWorkspace({
      ...(workspace as NexusWorkspace),
      graph: {
        nodes: graph.nodes,
        edges: graph.edges,
        runtimeLite: normalizeWorkflowRuntimeLiteState(graph.runtimeLite),
      },
    }),
  };
}

export function sanitizeWorkspace(workspace: NexusWorkspace): NexusWorkspace {
  const sanitized = cloneWorkspace(workspace);
  const timestamp = new Date().toISOString();

  sanitized.agents = sanitized.agents.map((agent) => {
    const capabilities =
      validateCapabilities(agent.capabilities) && agent.capabilities
        ? {
            type: agent.capabilities.type,
            supportedModels: agent.capabilities.supportedModels.length
              ? [...agent.capabilities.supportedModels]
              : getDefaultCapabilities(agent.capabilities.type).supportedModels,
          }
        : getDefaultCapabilities("chat");
    const tools = agent.tools.map((tool): NexusAgent["tools"][number] => {
      if (tool.status === "queued" && !tool.executorId) {
        return { ...tool, status: "planned" };
      }

      if (tool.status === "running") {
        return { ...tool, status: tool.executorId ? "available" : "planned" };
      }

      return tool;
    });

    if (
      capabilities.type === "image" &&
      !tools.some((tool) => tool.executorId === "real-image-gen")
    ) {
      tools.unshift({
        id: `${agent.id}-tool-real-image-gen`,
        name: "Image Adapter",
        scope: "Image",
        status: "available",
        executorId: "real-image-gen",
      });
    }

    const nextAgent: NexusAgent & { apiKey?: unknown; baseUrl?: unknown } = {
      ...agent,
      capabilities,
      identity: typeof agent.identity === "string" ? agent.identity : "",
      mission: typeof agent.mission === "string" ? agent.mission : "",
      executionPrompt:
        typeof agent.executionPrompt === "string" ? agent.executionPrompt : "",
      profileLocked:
        typeof agent.profileLocked === "boolean" ? agent.profileLocked : false,
      modelSettings: normalizeAgentModelSettings(agent.model, agent.modelSettings),
      sandboxCode:
        typeof agent.sandboxCode === "string"
          ? agent.sandboxCode
          : capabilities.type === "sandbox"
            ? DEFAULT_SANDBOX_CODE
            : undefined,
      sandboxUrl:
        typeof agent.sandboxUrl === "string" && capabilities.type === "sandbox"
          ? agent.sandboxUrl
          : undefined,
      status:
        agent.status === "streaming" || agent.status === "thinking" ? "idle" : agent.status,
      updatedAt: agent.updatedAt || timestamp,
      messages: agent.messages.map((message) => ({
        ...message,
        streaming: false,
      })),
      tools,
    };

    delete nextAgent.apiKey;
    delete nextAgent.baseUrl;

    return nextAgent;
  });

  sanitized.panels = sanitized.agents.map((agent) => ({
    id: `panel-${agent.id}`,
    type: "agent",
    agentId: agent.id,
    layout: agent.layout,
    minimized: agent.minimized,
    maximized: agent.maximized,
  }));

  const knownAgentIds = new Set(sanitized.agents.map((agent) => agent.id));
  const existingGraphNodes = new Map(
    sanitized.graph?.nodes
      ?.filter((node) => knownAgentIds.has(node.agentId))
      .map((node) => [node.agentId, node]) ?? [],
  );

  sanitized.graph = {
    nodes: sanitized.agents.map((agent, index) => {
      const existing = existingGraphNodes.get(agent.id);

      return (
        existing ?? {
          agentId: agent.id,
          ...getDefaultGraphPosition(index),
        }
      );
    }),
    edges:
      sanitized.graph?.edges?.filter(
        (edge) => knownAgentIds.has(edge.sourceAgentId) && knownAgentIds.has(edge.targetAgentId),
      ) ?? [],
    runtimeLite: normalizeWorkflowRuntimeLiteState(sanitized.graph?.runtimeLite),
  };

  sanitized.settings = {
    ...sanitized.settings,
    viewMode: sanitized.settings.viewMode ?? "panels",
    branchingSettings: sanitizeBranchingSettings(
      sanitized.settings.branchingSettings,
    ),
    agentTemplateProfiles: sanitizeAgentTemplateProfiles(
      sanitized.settings.agentTemplateProfiles,
    ),
  };
  sanitized.themeConfig = sanitizeThemeConfig(sanitized.themeConfig);
  sanitized.checkpoints = sanitizeCheckpoints(sanitized.checkpoints);
  delete (sanitized as NexusWorkspace & { globalSettings?: unknown }).globalSettings;
  delete (
    sanitized as NexusWorkspace & { settings: NexusWorkspace["settings"] & { systemApiConfig?: unknown } }
  ).settings.systemApiConfig;

  return sanitized;
}

function sanitizeNotebookRecord(notebook: NotebookRecord): NotebookRecord {
  return {
    id: notebook.id,
    workspace_id: notebook.workspace_id ?? null,
    title: notebook.title,
    content: notebook.content,
    created_at: notebook.created_at,
    updated_at: notebook.updated_at,
  };
}

export function createNotebookRecoveryMetadata(
  operations: LocalSyncQueueOperation[],
  generatedAt = new Date().toISOString(),
): WorkspaceNotebookRecoveryMetadata | undefined {
  const recoveryOperations = operations
    .filter((operation) =>
      operation.entityType === "notebook" &&
      !["synced", "compacted"].includes(operation.status),
    )
    .map((operation) => ({
      clientMutationId: operation.clientMutationId,
      notebookId: operation.entityId,
      operationType: operation.operationType,
      payloadHash: operation.payloadHash,
      queuedAt: operation.createdAt,
      status: operation.status as WorkspaceNotebookRecoveryMetadata["operations"][number]["status"],
      updatedAt: operation.updatedAt,
      workspaceId: operation.workspaceId,
    }));

  if (!recoveryOperations.length) {
    return undefined;
  }

  return {
    generatedAt,
    operationCount: recoveryOperations.length,
    operations: recoveryOperations,
    schemaVersion: 1,
    source: "local_sync_queue",
  };
}

export function materializeWorkspaceFromCloudSnapshot(
  snapshot: WorkspaceCloudSnapshotPayload,
): NexusWorkspace {
  return sanitizeWorkspace({
    ...snapshot.workspace,
    agents: snapshot.workspace.agents.map((agent): NexusAgent => ({
      ...agent,
      messages: [],
      status: "idle",
      telemetry: {
        confidence: 1,
        errors: 0,
        latency: 0,
        tasks: 0,
        tokens: 0,
        toolRuns: 0,
      },
    })),
  });
}

export function createWorkspaceSnapshot(
  workspace: NexusWorkspace,
  options: {
    notebookRecovery?: WorkspaceNotebookRecoveryMetadata;
    notebooks?: NotebookRecord[];
  } = {},
): WorkspaceSnapshot {
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    notebookRecovery: options.notebookRecovery,
    notebooks: options.notebooks?.map(sanitizeNotebookRecord),
    workspace: sanitizeWorkspace(workspace),
  };
}

export function parseWorkspaceSnapshot(jsonText: string): ValidationResult {
  try {
    return validateWorkspaceSnapshot(JSON.parse(jsonText));
  } catch {
    return { ok: false, error: "Import failed: invalid JSON." };
  }
}
