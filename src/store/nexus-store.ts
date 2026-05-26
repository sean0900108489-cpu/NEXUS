"use client";

import { create } from "zustand";
import { createStore, del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { temporal } from "zundo";

import {
  ACTIVE_WORKSPACE_ID,
  DEFAULT_CHAT_SUPPORTED_MODELS,
  DEFAULT_BASE_URL,
  agentTemplates,
  createAgentFromTemplate,
  createDefaultWorkspace,
  createMediaAgent,
  createSandboxAgent,
  defaultGraphNodes,
  defaultLayouts,
  getDefaultGraphPosition,
  makeId,
} from "@/lib/nexus-defaults";
import { supabaseStateSyncManager } from "@/lib/state-sync";
import { getNexusSupabaseClient } from "@/lib/supabase/client";
import { createWorkspaceSnapshot, sanitizeWorkspace, validateWorkspaceSnapshot } from "@/lib/workspace-kernel";
import { type ToolExecutorInput, toolExecutors } from "@/lib/tool-executors";
import type {
  AgentCreationCapabilityType,
  AgentLayout,
  AgentMessage,
  AgentStatus,
  ArtifactVaultRecord,
  IAuthVault,
  ITransactionLog,
  NexusAgent,
  NexusWorkspace,
  PromptRecord,
  StreamMode,
  WorkflowTemplateAgentBlueprint,
  WorkflowTemplateBlueprintData,
  WorkflowTemplateRecord,
  WorkspaceGraphEdge,
  WorkspaceThemeConfig,
  WorkspaceSnapshot,
  WorkspaceViewMode,
} from "@/lib/nexus-types";

type WorkspaceBounds = {
  width: number;
  height: number;
};

type WorkspaceIdentity = Pick<NexusWorkspace, "id" | "name">;
type WorkspaceThemeConfigUpdate = Partial<WorkspaceThemeConfig>;

const PERSIST_STORAGE_NAME = "nexus-ai-ops-workspace";
const LEGACY_LOCAL_STORAGE_KEYS = ["nexus-workspace-storage", PERSIST_STORAGE_NAME] as const;
const indexedDbStore =
  typeof indexedDB === "undefined"
    ? undefined
    : createStore("nexus-ai-ops", "workspace-state");
let initialStorageReadFinished = false;
let themeConfigSyncTimeout: ReturnType<typeof setTimeout> | undefined;

const DEFAULT_AUTH_VAULT: IAuthVault = {
  user: null,
  globalApiKey: null,
  globalBaseUrl: DEFAULT_BASE_URL,
  isLocked: true,
};

function normalizeAuthVault(value: unknown): IAuthVault {
  if (!value || typeof value !== "object") {
    return DEFAULT_AUTH_VAULT;
  }

  const vault = value as Partial<IAuthVault>;
  const globalApiKey =
    typeof vault.globalApiKey === "string" && vault.globalApiKey.trim()
      ? vault.globalApiKey
      : null;

  return {
    user: vault.user ?? null,
    globalApiKey,
    globalBaseUrl:
      typeof vault.globalBaseUrl === "string" && vault.globalBaseUrl.trim()
        ? vault.globalBaseUrl.trim()
        : DEFAULT_BASE_URL,
    isLocked: vault.isLocked ?? Boolean(globalApiKey),
  };
}

type NexusStore = {
  activeWorkspaceId: string;
  workspaces: NexusWorkspace[];
  selectedAgentId?: string;
  nextZIndex: number;
  streamMode: StreamMode;
  viewMode: WorkspaceViewMode;
  isVaultManagerOpen: boolean;
  authVault: IAuthVault;
  artifactVault: ArtifactVaultRecord[];
  promptsCache: PromptRecord[];
  transactionHistory: ITransactionLog[];
  lastSavedAt?: string;
  lastImportError?: string;
  materializeDefaultWorkspace: () => void;
  saveWorkspaceSnapshot: () => void;
  createWorkspace: () => WorkspaceIdentity;
  switchWorkspace: (workspaceId: string) => void;
  renameWorkspace: (name: string) => void;
  exportActiveWorkspace: () => WorkspaceSnapshot;
  importWorkspace: (snapshot: unknown) => void;
  spawnAgent: (templateId?: string, capabilityType?: AgentCreationCapabilityType) => string;
  saveCurrentCanvasAsMacro: (name: string, description: string) => void;
  instantiateMacro: (template: WorkflowTemplateRecord) => string[];
  spawnMacro: (blueprintData: WorkflowTemplateBlueprintData) => string[];
  createCheckpoint: (reason: string) => string | undefined;
  restoreCheckpoint: (checkpointId: string) => boolean;
  recordTransaction: (entry: ITransactionLog) => void;
  duplicateAgent: (agentId: string) => void;
  removeAgent: (agentId: string) => void;
  focusAgent: (agentId: string) => void;
  selectAgent: (agentId: string) => void;
  updateLayout: (agentId: string, layout: Partial<AgentLayout>) => void;
  updateAgentMission: (agentId: string, mission: string) => void;
  updateAgentModel: (agentId: string, model: string) => void;
  login: (user: IAuthVault["user"]) => void;
  logout: () => void;
  setGlobalApiKey: (key: string) => void;
  setGlobalBaseUrl: (baseUrl: string) => void;
  lockVault: () => void;
  unlockVault: () => void;
  deleteApiKey: () => void;
  updateThemeConfig: (config: WorkspaceThemeConfigUpdate) => void;
  updateSandboxCode: (agentId: string, sandboxCode: string) => void;
  updateSandboxUrl: (agentId: string, sandboxUrl: string) => void;
  saveArtifactToCloud: (agentId: string, content: string, type: string) => void;
  fetchArtifactsFromCloud: () => Promise<ArtifactVaultRecord[]>;
  setPromptsCache: (prompts: PromptRecord[]) => void;
  addPromptToCache: (prompt: PromptRecord) => void;
  updatePrompt: (id: string, newTitle: string, newContent: string) => void;
  deletePrompt: (id: string) => void;
  updateMemoryBlock: (agentId: string, memoryId: string, content: string) => void;
  minimizeAgent: (agentId: string) => void;
  restoreAgent: (agentId: string) => void;
  toggleMaximizeAgent: (agentId: string, bounds: WorkspaceBounds) => void;
  minimizeAll: () => void;
  restoreAll: () => void;
  arrangeAgents: (bounds: WorkspaceBounds) => void;
  addMessage: (agentId: string, message: AgentMessage) => void;
  appendToMessage: (agentId: string, messageId: string, token: string) => void;
  finishMessage: (
    agentId: string,
    messageId: string,
    fallback?: string,
    interrupted?: boolean,
  ) => void;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;
  setStreamMode: (mode: StreamMode) => void;
  setViewMode: (mode: WorkspaceViewMode) => void;
  openVaultManager: () => void;
  closeVaultManager: () => void;
  updateGraphNodePosition: (agentId: string, position: { x: number; y: number }) => void;
  connectGraphAgents: (edge: WorkspaceGraphEdge) => void;
  removeGraphEdges: (edgeIds: string[]) => void;
  updateAgentTelemetry: (agentId: string, generatedCharacters: number) => void;
  clearAgentMessages: (agentId: string) => void;
  runTool: (agentId: string, toolId: string, input?: ToolExecutorInput) => Promise<void>;
  resetWorkspace: () => void;
};

type NexusTemporalState = Pick<
  NexusStore,
  | "activeWorkspaceId"
  | "nextZIndex"
  | "selectedAgentId"
  | "viewMode"
  | "workspaces"
>;

function partializeTemporalState(state: NexusStore): NexusTemporalState {
  return {
    activeWorkspaceId: state.activeWorkspaceId,
    nextZIndex: state.nextZIndex,
    selectedAgentId: state.selectedAgentId,
    viewMode: state.viewMode,
    workspaces: state.workspaces,
  };
}

function temporalWorkspaceSignature(workspace: NexusWorkspace) {
  return {
    activeAgentId: workspace.activeAgentId,
    agents: workspace.agents.map((agent) => ({
      callsign: agent.callsign,
      capabilities: agent.capabilities,
      id: agent.id,
      identity: agent.identity,
      layout: agent.layout,
      maximized: agent.maximized,
      minimized: agent.minimized,
      mission: agent.mission,
      model: agent.model,
      previousLayout: agent.previousLayout,
      provider: agent.provider,
      title: agent.title,
    })),
    graph: workspace.graph,
    id: workspace.id,
    name: workspace.name,
    panels: workspace.panels,
    selectedAgentId: workspace.selectedAgentId,
    settings: {
      autosave: workspace.settings.autosave,
      model: workspace.settings.model,
      provider: workspace.settings.provider,
      viewMode: workspace.settings.viewMode,
    },
    themeConfig: workspace.themeConfig,
  };
}

function temporalSignature(state: NexusTemporalState) {
  return JSON.stringify({
    activeWorkspaceId: state.activeWorkspaceId,
    nextZIndex: state.nextZIndex,
    selectedAgentId: state.selectedAgentId,
    viewMode: state.viewMode,
    workspaces: state.workspaces.map(temporalWorkspaceSignature),
  });
}

function temporalStatesAreEqual(
  pastState: NexusTemporalState,
  currentState: NexusTemporalState,
) {
  return temporalSignature(pastState) === temporalSignature(currentState);
}

function getLegacyPersistKeys(name: string) {
  return Array.from(new Set([name, ...LEGACY_LOCAL_STORAGE_KEYS]));
}

function getLegacyPersistValue(name: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    for (const key of getLegacyPersistKeys(name)) {
      const value = window.localStorage.getItem(key);

      if (value) {
        return value;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function setLegacyPersistValue(name: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(name, value);
  } catch {
    // IndexedDB is the primary store; localStorage is only a best-effort fallback.
  }
}

function clearLegacyPersistValues(name: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    for (const key of getLegacyPersistKeys(name)) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Clearing legacy quota pressure should never block the workbench.
  }
}

const indexedDbStateStorage: StateStorage<Promise<void>> = {
  getItem: async (name) => {
    try {
      if (!indexedDbStore) {
        return getLegacyPersistValue(name);
      }

      const indexedDbValue = await idbGet<string>(name, indexedDbStore);

      if (typeof indexedDbValue === "string") {
        return indexedDbValue;
      }

      const legacyValue = getLegacyPersistValue(name);

      if (!legacyValue) {
        return null;
      }

      await idbSet(name, legacyValue, indexedDbStore);
      clearLegacyPersistValues(name);

      return legacyValue;
    } catch {
      return getLegacyPersistValue(name);
    } finally {
      initialStorageReadFinished = true;
    }
  },
  setItem: async (name, value) => {
    if (!initialStorageReadFinished) {
      return;
    }

    try {
      if (!indexedDbStore) {
        setLegacyPersistValue(name, value);
        return;
      }

      await idbSet(name, value, indexedDbStore);
      clearLegacyPersistValues(name);
    } catch {
      setLegacyPersistValue(name, value);
    }
  },
  removeItem: async (name) => {
    try {
      if (indexedDbStore) {
        await idbDel(name, indexedDbStore);
      }
    } finally {
      clearLegacyPersistValues(name);
    }
  },
};

const initialWorkspace = () => createDefaultWorkspace();

function createWorkspaceId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : makeId("workspace");
}

function getNextWorkspaceName(workspaces: NexusWorkspace[]) {
  return `NEXUS // AI OPS ${String(workspaces.length + 1).padStart(2, "0")}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createCheckpointFromWorkspace(
  workspace: NexusWorkspace,
  reason: string,
): NonNullable<NexusWorkspace["checkpoints"]>[number] {
  const timestamp = new Date().toISOString();
  const snapshot = clone(workspace);
  const { checkpoints: _checkpoints, ...checkpointSnapshot } = snapshot;

  void _checkpoints;

  return {
    id: makeId("checkpoint"),
    reason: reason.trim() || "Manual checkpoint",
    snapshot: checkpointSnapshot,
    timestamp,
  };
}

function createAgentFromMacroBlueprint({
  blueprint,
  id,
  index,
  timestamp,
  zIndex,
}: {
  blueprint: WorkflowTemplateAgentBlueprint;
  id: string;
  index: number;
  timestamp: string;
  zIndex: number;
}): NexusAgent {
  const callsign = blueprint.callsign || `MACRO-${index + 1}`;

  return {
    id,
    callsign,
    title: blueprint.title || "Macro Agent",
    identity: blueprint.identity || "Macro",
    mission: blueprint.mission || "Execute this saved workflow blueprint.",
    provider: blueprint.provider || "openai",
    model: blueprint.model || "gpt-4o-mini",
    capabilities: blueprint.capabilities ?? {
      type: "chat",
      supportedModels: DEFAULT_CHAT_SUPPORTED_MODELS,
    },
    sandboxCode: blueprint.sandboxCode,
    sandboxUrl: blueprint.sandboxUrl ?? "",
    status: "idle",
    accent: blueprint.accent || "#22d3ee",
    avatar: blueprint.avatar || "MX",
    memory: blueprint.memory.map((block, memoryIndex) => ({
      ...block,
      id: `${id}-memory-${memoryIndex}`,
      updatedAt: timestamp,
    })),
    contextNotes: blueprint.contextNotes.map((note, noteIndex) => ({
      ...note,
      id: `${id}-context-${noteIndex}`,
    })),
    messages: [
      {
        id: `${id}-boot`,
        role: "assistant",
        content: `${callsign} online from saved workflow macro.`,
        createdAt: timestamp,
      },
    ],
    tools: blueprint.tools.map((tool, toolIndex) => ({
      ...tool,
      id: `${id}-tool-${toolIndex}`,
      lastRunAt: undefined,
      result: undefined,
      error: undefined,
    })),
    layout: {
      ...blueprint.layout,
      x: blueprint.layout.x + 48,
      y: blueprint.layout.y + 48,
      zIndex,
    },
    previousLayout: undefined,
    minimized: false,
    maximized: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    telemetry: {
      tokens: 0,
      latency: 0.42,
      confidence: 91,
      tasks: 0,
      toolRuns: 0,
      errors: 0,
    },
  };
}

function getActiveWorkspace(state: Pick<NexusStore, "activeWorkspaceId" | "workspaces">) {
  return (
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId) ??
    state.workspaces[0]
  );
}

function queueWorkspaceCloudSync(workspace?: Pick<NexusWorkspace, "id" | "name">) {
  if (!workspace) {
    return;
  }

  void supabaseStateSyncManager
    .upsertWorkspace(workspace.id, workspace.name)
    .catch(() => undefined);
}

function queueThemeConfigCloudSync(workspace?: Pick<NexusWorkspace, "id" | "name">) {
  if (!workspace) {
    return;
  }

  if (themeConfigSyncTimeout) {
    clearTimeout(themeConfigSyncTimeout);
  }

  themeConfigSyncTimeout = setTimeout(() => {
    queueWorkspaceCloudSync(workspace);
    themeConfigSyncTimeout = undefined;
  }, 1000);
}

function queueMessageCloudSync({
  agentId,
  message,
  workspaceId,
}: {
  agentId: string;
  message: AgentMessage;
  workspaceId?: string;
}) {
  if (!workspaceId || message.streaming || !message.content.trim()) {
    return;
  }

  void supabaseStateSyncManager
    .insertMessage(workspaceId, agentId, message)
    .catch(() => undefined);
}

function queuePromptsCacheRefresh(workspaceId?: string) {
  if (!workspaceId) {
    return;
  }

  void supabaseStateSyncManager
    .fetchPrompts(workspaceId)
    .then((prompts) => {
      const state = useNexusStore.getState();

      if (state.activeWorkspaceId === workspaceId) {
        state.setPromptsCache(prompts);
      }
    })
    .catch(() => undefined);
}

function withActiveWorkspace(
  state: NexusStore,
  updater: (workspace: NexusWorkspace) => NexusWorkspace,
) {
  const now = new Date().toISOString();

  return state.workspaces.map((workspace) =>
    workspace.id === state.activeWorkspaceId
      ? (() => {
          const updated = syncPanels({ ...updater(workspace), updatedAt: now });

          return {
            ...updated,
            settings: {
              ...updated.settings,
              streamMode: resolveStreamMode(updated, state.authVault),
            },
          };
        })()
      : workspace,
  );
}

function withAgent(
  workspace: NexusWorkspace,
  agentId: string,
  updater: (agent: NexusAgent) => NexusAgent,
) {
  const updatedAt = new Date().toISOString();

  return {
    ...workspace,
    agents: workspace.agents.map((agent) =>
      agent.id === agentId ? { ...updater(agent), updatedAt } : agent,
    ),
  };
}

function resolveStreamMode(_workspace: NexusWorkspace | undefined, authVault?: IAuthVault): StreamMode {
  return authVault?.globalApiKey?.trim() ? "live" : "mock";
}

function getDefaultChatModelForAgent(agent: Pick<NexusAgent, "callsign">) {
  return agent.callsign === "ARCHITECT"
    ? "gpt-5.5-pro-2026-04-23"
    : "gpt-5.5-2026-04-23";
}

function normalizeAgentModelCatalog(agent: NexusAgent): NexusAgent {
  if ((agent.capabilities?.type ?? "chat") !== "chat") {
    return agent;
  }

  const model = agent.model?.trim() || getDefaultChatModelForAgent(agent);
  const supportedModels = Array.from(
    new Set([
      model,
      ...DEFAULT_CHAT_SUPPORTED_MODELS,
      ...(agent.capabilities?.supportedModels ?? []),
    ]),
  );

  return {
    ...agent,
    model,
    capabilities: {
      ...(agent.capabilities ?? { type: "chat", supportedModels: [] }),
      type: "chat",
      supportedModels,
    },
  };
}

function syncPanels(workspace: NexusWorkspace) {
  const knownAgentIds = new Set(workspace.agents.map((agent) => agent.id));
  const existingGraphNodes = new Map(
    workspace.graph?.nodes
      ?.filter((node) => knownAgentIds.has(node.agentId))
      .map((node) => [node.agentId, node]) ?? [],
  );

  const nextWorkspace = {
    ...workspace,
    panels: workspace.agents.map((agent) => ({
      id: `panel-${agent.id}`,
      type: "agent" as const,
      agentId: agent.id,
      layout: agent.layout,
      minimized: agent.minimized,
      maximized: agent.maximized,
    })),
    graph: {
      nodes: workspace.agents.map((agent, index) => {
        const existing = existingGraphNodes.get(agent.id);

        return (
          existing ?? {
            agentId: agent.id,
            ...getDefaultGraphPosition(index),
          }
        );
      }),
      edges:
        workspace.graph?.edges?.filter(
          (edge) => knownAgentIds.has(edge.sourceAgentId) && knownAgentIds.has(edge.targetAgentId),
        ) ?? [],
    },
  };

  return nextWorkspace;
}

function createWorkflowTemplateBlueprint(
  workspace: NexusWorkspace,
): WorkflowTemplateBlueprintData {
  const knownAgentIds = new Set(workspace.agents.map((agent) => agent.id));

  return {
    schemaVersion: 1,
    agents: workspace.agents.map((agent) => ({
      id: agent.id,
      callsign: agent.callsign,
      title: agent.title,
      identity: agent.identity,
      mission: agent.mission,
      provider: agent.provider,
      model: agent.model,
      capabilities: clone(agent.capabilities),
      sandboxCode: agent.sandboxCode,
      sandboxUrl: agent.sandboxUrl,
      accent: agent.accent,
      avatar: agent.avatar,
      memory: clone(agent.memory),
      contextNotes: clone(agent.contextNotes),
      tools: agent.tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        scope: tool.scope,
        status: tool.executorId ? tool.status : "planned",
        executorId: tool.executorId,
      })),
      layout: clone(agent.layout),
    })),
    graph: {
      nodes: workspace.graph.nodes
        .filter((node) => knownAgentIds.has(node.agentId))
        .map((node) => ({ ...node })),
      edges: workspace.graph.edges
        .filter(
          (edge) =>
            knownAgentIds.has(edge.sourceAgentId) &&
            knownAgentIds.has(edge.targetAgentId),
        )
        .map((edge) => ({ ...edge })),
    },
    metadata: {
      agentCount: workspace.agents.length,
      edgeCount: workspace.graph.edges.length,
      savedAt: new Date().toISOString(),
      sourceWorkspaceId: workspace.id,
      sourceWorkspaceName: workspace.name,
    },
  };
}

function createMacroInstantiation({
  blueprintData,
  startingZIndex,
}: {
  blueprintData: WorkflowTemplateBlueprintData;
  startingZIndex: number;
}) {
  const timestamp = new Date().toISOString();
  const idMap = new Map<string, string>();
  const agents = blueprintData.agents.map((blueprint, index) => {
    const id = makeId("agent");

    idMap.set(blueprint.id, id);

    return normalizeAgentModelCatalog(
      createAgentFromMacroBlueprint({
        blueprint,
        id,
        index,
        timestamp,
        zIndex: startingZIndex + index + 1,
      }),
    );
  });
  const graphNodes = blueprintData.graph.nodes
    .map((node, index) => {
      const agentId = idMap.get(node.agentId);

      return agentId
        ? {
            agentId,
            x: node.x + 72 + index * 12,
            y: node.y + 72 + index * 12,
            nodeType: node.nodeType,
          }
        : undefined;
    })
    .filter((node): node is NonNullable<typeof node> => Boolean(node));
  const graphEdges = blueprintData.graph.edges
    .map((edge) => {
      const sourceAgentId = idMap.get(edge.sourceAgentId);
      const targetAgentId = idMap.get(edge.targetAgentId);

      return sourceAgentId && targetAgentId
        ? {
            id: makeId("edge"),
            sourceAgentId,
            targetAgentId,
          }
        : undefined;
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));

  return {
    agents,
    graphEdges,
    graphNodes,
    selectedAgentId: agents.at(-1)?.id,
    nextZIndex: startingZIndex + blueprintData.agents.length,
  };
}

function isUsableMacroBlueprint(
  blueprintData: WorkflowTemplateBlueprintData | undefined,
): blueprintData is WorkflowTemplateBlueprintData {
  return Boolean(
    blueprintData &&
      blueprintData.schemaVersion === 1 &&
      Array.isArray(blueprintData.agents) &&
      Array.isArray(blueprintData.graph?.nodes) &&
      Array.isArray(blueprintData.graph?.edges),
  );
}

function clampLayout(layout: AgentLayout, bounds: WorkspaceBounds) {
  const width = Math.min(layout.width, Math.max(380, bounds.width - 32));
  const height = Math.min(layout.height, Math.max(340, bounds.height - 32));

  return {
    ...layout,
    width,
    height,
    x: Math.max(12, Math.min(layout.x, Math.max(12, bounds.width - width - 12))),
    y: Math.max(12, Math.min(layout.y, Math.max(12, bounds.height - height - 12))),
  };
}

function normalizeWorkspaces(workspaces: NexusWorkspace[] | undefined) {
  const fallback = initialWorkspace();
  const sanitized = (workspaces?.length ? workspaces : [fallback]).map(sanitizeWorkspace);
  const active = sanitized[0];
  const callsigns = new Set(active.agents.map((agent) => agent.callsign));

  if (!callsigns.has("ARCHIVIST")) {
    const template = agentTemplates.find((agent) => agent.id === "archivist");

    if (template) {
      active.agents.push(
        createAgentFromTemplate(
          template,
          "agent-archivist",
          defaultLayouts[3],
          new Date().toISOString(),
        ),
      );
      active.graph = {
        nodes: [...(active.graph?.nodes ?? []), defaultGraphNodes[3]],
        edges: active.graph?.edges ?? [],
      };
    }
  }

  return sanitized
    .map((workspace) => ({
      ...workspace,
      agents: workspace.agents.map(normalizeAgentModelCatalog),
    }))
    .map(syncPanels);
}

function prepareWorkspacesForLocalPersistence(workspaces: NexusWorkspace[]) {
  return normalizeWorkspaces(workspaces).map((workspace) => ({
    ...workspace,
    settings: {
      ...workspace.settings,
    },
  }));
}

function logHydratedMemoryState(state: NexusStore | undefined) {
  if (typeof window === "undefined" || !state) {
    return;
  }

  console.log("Memory State Loaded:", {
    activeWorkspaceId: state.activeWorkspaceId,
    globalApiKeyLoaded: Boolean(state.authVault.globalApiKey?.trim()),
    storage: indexedDbStore ? "indexedDB:idb-keyval" : "localStorage:fallback",
    userLoaded: Boolean(state.authVault.user),
    workspacesLoaded: state.workspaces.length,
  });
}

export const useNexusStore = create<NexusStore>()(
  persist(
    temporal(
      (set, get) => ({
      activeWorkspaceId: ACTIVE_WORKSPACE_ID,
      workspaces: [initialWorkspace()],
      selectedAgentId: "agent-operator",
      nextZIndex: 10,
      streamMode: "mock",
      viewMode: "panels",
      isVaultManagerOpen: false,
      authVault: DEFAULT_AUTH_VAULT,
      artifactVault: [],
      promptsCache: [],
      transactionHistory: [],

      materializeDefaultWorkspace: () => {
        const now = new Date().toISOString();
        const workspace = getActiveWorkspace(get());

        set((state) => ({
          workspaces: withActiveWorkspace(
            { ...state, workspaces: normalizeWorkspaces(state.workspaces) },
            (workspace) => ({
              ...workspace,
              settings: { ...workspace.settings, streamMode: state.streamMode },
            }),
          ),
          lastSavedAt: state.lastSavedAt ?? now,
        }));
        queueWorkspaceCloudSync(workspace);
        queuePromptsCacheRefresh(workspace?.id);
      },

      saveWorkspaceSnapshot: () => {
        const now = new Date().toISOString();
        const workspace = getActiveWorkspace(get());

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) => ({
            ...workspace,
            settings: { ...workspace.settings, streamMode: state.streamMode },
          })),
          lastSavedAt: now,
        }));
        queueWorkspaceCloudSync(workspace);
      },

      createWorkspace: () => {
        const state = get();
        const workspace = createDefaultWorkspace({
          id: createWorkspaceId(),
          name: getNextWorkspaceName(state.workspaces),
          timestamp: new Date().toISOString(),
        });

        set({
          activeWorkspaceId: workspace.id,
          workspaces: [...state.workspaces, workspace],
          selectedAgentId: workspace.selectedAgentId,
          streamMode: resolveStreamMode(workspace, state.authVault),
          viewMode: workspace.settings.viewMode,
          lastSavedAt: new Date().toISOString(),
          lastImportError: undefined,
        });
        queueWorkspaceCloudSync(workspace);
        queuePromptsCacheRefresh(workspace.id);

        return {
          id: workspace.id,
          name: workspace.name,
        };
      },

      switchWorkspace: (workspaceId) => {
        const state = get();
        const workspace = state.workspaces.find((candidate) => candidate.id === workspaceId);

        if (!workspace || workspace.id === state.activeWorkspaceId) {
          return;
        }

        set({
          activeWorkspaceId: workspace.id,
          selectedAgentId: workspace.selectedAgentId ?? workspace.agents[0]?.id,
          streamMode: resolveStreamMode(workspace, state.authVault),
          viewMode: workspace.settings.viewMode,
        });
        queuePromptsCacheRefresh(workspace.id);
      },

      renameWorkspace: (name) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const nextName = name.trim();

        if (!workspace || !nextName || nextName === workspace.name) {
          return;
        }

        set({
          workspaces: withActiveWorkspace(state, (current) => ({
            ...current,
            name: nextName,
          })),
        });
        queueWorkspaceCloudSync({ id: workspace.id, name: nextName });
      },

      exportActiveWorkspace: () => {
        const workspace = getActiveWorkspace(get());
        return createWorkspaceSnapshot(workspace);
      },

      importWorkspace: (snapshot) => {
        const result = validateWorkspaceSnapshot(snapshot);

        if (!result.ok) {
          set({ lastImportError: result.error });
          throw new Error(result.error);
        }

        const workspace = sanitizeWorkspace(result.workspace);
        const highestZ = Math.max(10, ...workspace.agents.map((agent) => agent.layout.zIndex));

        set({
          activeWorkspaceId: workspace.id,
          workspaces: [workspace],
          selectedAgentId: workspace.selectedAgentId ?? workspace.agents[0]?.id,
          nextZIndex: highestZ + 1,
          streamMode: resolveStreamMode(workspace, get().authVault),
          viewMode: workspace.settings.viewMode,
          lastSavedAt: new Date().toISOString(),
          lastImportError: undefined,
        });
        queueWorkspaceCloudSync(workspace);
        queuePromptsCacheRefresh(workspace.id);
      },

      spawnAgent: (templateId, capabilityType = "chat") => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const template =
          agentTemplates.find((candidate) => candidate.id === templateId) ??
          agentTemplates[workspace.agents.length % agentTemplates.length];
        const id = makeId("agent");
        const nextZIndex = state.nextZIndex + 1;
        const offset = workspace.agents.length * 34;
        const layout: AgentLayout = {
          x: 72 + (offset % 260),
          y: 74 + (offset % 180),
          width: 540,
          height: 600,
          zIndex: nextZIndex,
        };
        const agent =
          capabilityType === "chat"
            ? createAgentFromTemplate(template, id, layout)
            : capabilityType === "sandbox"
              ? createSandboxAgent(id, layout, workspace.agents.length + 1)
              : createMediaAgent(capabilityType, id, layout, workspace.agents.length + 1);
        const graphNode = {
          agentId: id,
          ...getDefaultGraphPosition(workspace.agents.length),
        };

        set({
          workspaces: withActiveWorkspace(state, (current) => ({
            ...current,
            agents: [...current.agents, agent],
            graph: {
              nodes: [...current.graph.nodes, graphNode],
              edges: current.graph.edges,
            },
            activeAgentId: id,
            selectedAgentId: id,
          })),
          selectedAgentId: id,
          nextZIndex,
        });

        return id;
      },

      saveCurrentCanvasAsMacro: (name, description) => {
        const workspace = getActiveWorkspace(get());
        const macroName = name.trim();

        if (!workspace || !macroName) {
          return;
        }

        void supabaseStateSyncManager
          .saveMacro(
            macroName,
            description.trim() || null,
            createWorkflowTemplateBlueprint(workspace),
          )
          .catch(() => undefined);
      },

      instantiateMacro: (template) => {
        const blueprintData = template.blueprintData;

        if (!isUsableMacroBlueprint(blueprintData) || !blueprintData.agents.length) {
          return [];
        }

        get().createCheckpoint("Before Macro Spawn");

        const state = get();
        const {
          agents,
          graphEdges,
          graphNodes,
          nextZIndex,
          selectedAgentId,
        } = createMacroInstantiation({
          blueprintData,
          startingZIndex: state.nextZIndex,
        });

        set({
          workspaces: withActiveWorkspace(state, (current) => ({
            ...current,
            agents: [...current.agents, ...agents],
            graph: {
              nodes: [...current.graph.nodes, ...graphNodes],
              edges: [...current.graph.edges, ...graphEdges],
            },
            activeAgentId: selectedAgentId ?? current.activeAgentId,
            selectedAgentId: selectedAgentId ?? current.selectedAgentId,
          })),
          selectedAgentId: selectedAgentId ?? state.selectedAgentId,
          nextZIndex,
        });

        return agents.map((agent) => agent.id);
      },

      spawnMacro: (blueprintData) =>
        get().instantiateMacro({
          id: makeId("macro"),
          name: "Ad hoc workflow macro",
          description: null,
          blueprintData,
          createdAt: new Date().toISOString(),
        }),

      createCheckpoint: (reason) => {
        const state = get();
        const workspace = getActiveWorkspace(state);

        if (!workspace) {
          return undefined;
        }

        const checkpoint = createCheckpointFromWorkspace(workspace, reason);

        set({
          workspaces: withActiveWorkspace(state, (current) => ({
            ...current,
            checkpoints: [checkpoint, ...(current.checkpoints ?? [])].slice(0, 10),
          })),
        });

        return checkpoint.id;
      },

      restoreCheckpoint: (checkpointId) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const checkpoint = workspace?.checkpoints?.find(
          (candidate) => candidate.id === checkpointId,
        );

        if (!workspace || !checkpoint) {
          return false;
        }

        const restoredWorkspace: NexusWorkspace = {
          ...clone(checkpoint.snapshot),
          checkpoints: workspace.checkpoints,
          updatedAt: new Date().toISOString(),
        };
        const highestZ = Math.max(
          10,
          ...restoredWorkspace.agents.map((agent) => agent.layout.zIndex),
        );

        set({
          activeWorkspaceId: restoredWorkspace.id,
          workspaces: state.workspaces.map((candidate) =>
            candidate.id === workspace.id ? syncPanels(restoredWorkspace) : candidate,
          ),
          selectedAgentId:
            restoredWorkspace.selectedAgentId ?? restoredWorkspace.agents[0]?.id,
          nextZIndex: highestZ + 1,
          streamMode: resolveStreamMode(restoredWorkspace, state.authVault),
          viewMode: restoredWorkspace.settings.viewMode,
          lastSavedAt: new Date().toISOString(),
        });

        return true;
      },

      recordTransaction: (entry) => {
        set((state) => ({
          transactionHistory: [entry, ...(state.transactionHistory ?? [])].slice(0, 100),
        }));
      },

      duplicateAgent: (agentId) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const source = workspace.agents.find((agent) => agent.id === agentId);

        if (!source) {
          return;
        }

        const id = makeId("agent");
        const nextZIndex = state.nextZIndex + 1;
        const duplicate: NexusAgent = {
          ...clone(source),
          id,
          identity: `${source.identity} Prime`,
          callsign: `${source.callsign}-2`,
          status: "idle",
          messages: source.messages.map((message, index) => ({
            ...message,
            id: `${id}-message-${index}`,
            streaming: false,
          })),
          layout: {
            ...source.layout,
            x: source.layout.x + 36,
            y: source.layout.y + 36,
            zIndex: nextZIndex,
          },
          minimized: false,
          maximized: false,
          previousLayout: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set({
          workspaces: withActiveWorkspace(state, (current) => ({
            ...current,
            agents: [...current.agents, duplicate],
            graph: {
              nodes: [
                ...current.graph.nodes,
                {
                  agentId: id,
                  x:
                    (current.graph.nodes.find((node) => node.agentId === source.id)?.x ??
                      100) + 48,
                  y:
                    (current.graph.nodes.find((node) => node.agentId === source.id)?.y ??
                      120) + 48,
                },
              ],
              edges: current.graph.edges,
            },
            activeAgentId: id,
            selectedAgentId: id,
          })),
          selectedAgentId: id,
          nextZIndex,
        });
      },

      removeAgent: (agentId) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const agents = workspace.agents.filter((agent) => agent.id !== agentId);
        const nextSelected = agents.at(-1)?.id;

        set({
          workspaces: withActiveWorkspace(state, (current) => ({
            ...current,
            agents,
            graph: {
              nodes: current.graph.nodes.filter((node) => node.agentId !== agentId),
              edges: current.graph.edges.filter(
                (edge) =>
                  edge.sourceAgentId !== agentId && edge.targetAgentId !== agentId,
              ),
            },
            activeAgentId:
              current.activeAgentId === agentId ? nextSelected : current.activeAgentId,
            selectedAgentId:
              current.selectedAgentId === agentId ? nextSelected : current.selectedAgentId,
          })),
          selectedAgentId:
            state.selectedAgentId === agentId ? nextSelected : state.selectedAgentId,
        });
      },

      focusAgent: (agentId) => {
        const state = get();
        const nextZIndex = state.nextZIndex + 1;

        set({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              minimized: false,
              layout: {
                ...agent.layout,
                zIndex: nextZIndex,
              },
            })),
          ).map((workspace) =>
            workspace.id === state.activeWorkspaceId
              ? { ...workspace, activeAgentId: agentId, selectedAgentId: agentId }
              : workspace,
          ),
          selectedAgentId: agentId,
          nextZIndex,
        });
      },

      selectAgent: (agentId) => {
        const state = get();
        set({
          workspaces: withActiveWorkspace(state, (workspace) => ({
            ...workspace,
            selectedAgentId: agentId,
          })),
          selectedAgentId: agentId,
        });
      },

      updateLayout: (agentId, layout) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              layout: {
                ...agent.layout,
                ...layout,
              },
              maximized: false,
              previousLayout: undefined,
            })),
          ),
        }));
      },

      updateAgentMission: (agentId, mission) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              mission,
            })),
          ),
        }));
      },

      updateAgentModel: (agentId, model) => {
        const nextModel = model.trim();

        if (!nextModel) {
          return;
        }

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              model: nextModel,
              capabilities: {
                ...agent.capabilities,
                supportedModels: Array.from(
                  new Set([nextModel, ...agent.capabilities.supportedModels]),
                ),
              },
            })),
          ),
        }));
      },

      login: (user) => {
        set((state) => ({
          authVault: {
            ...state.authVault,
            user,
          },
        }));
      },

      logout: () => {
        try {
          void getNexusSupabaseClient().auth.signOut();
        } catch {
          // Auth can be unavailable in local envs; local vault state still clears.
        }

        set((state) => ({
          authVault: {
            ...state.authVault,
            user: null,
            isLocked: true,
          },
          streamMode: "mock",
        }));
      },

      setGlobalApiKey: (key) => {
        const sanitizedKey = key.replace(/[^\x20-\x7E]/g, "").trim();
        const globalApiKey = sanitizedKey || null;

        set((state) => {
          return {
            authVault: {
              ...state.authVault,
              globalApiKey,
              isLocked: Boolean(globalApiKey),
            },
            streamMode: globalApiKey ? "live" : "mock",
          };
        });
      },

      setGlobalBaseUrl: (baseUrl) => {
        const sanitizedBaseUrl = baseUrl.replace(/[^\x20-\x7E]/g, "").trim();
        const globalBaseUrl = sanitizedBaseUrl || DEFAULT_BASE_URL;

        set((state) => ({
          authVault: {
            ...state.authVault,
            globalBaseUrl,
          },
        }));
      },

      lockVault: () => {
        set((state) => ({
          authVault: {
            ...state.authVault,
            isLocked: true,
          },
        }));
      },

      unlockVault: () => {
        set((state) => ({
          authVault: {
            ...state.authVault,
            isLocked: false,
          },
        }));
      },

      deleteApiKey: () => {
        set((state) => ({
          authVault: {
            ...state.authVault,
            globalApiKey: null,
            isLocked: false,
          },
          streamMode: "mock",
        }));
      },

      updateSandboxCode: (agentId, sandboxCode) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              sandboxCode,
              updatedAt: new Date().toISOString(),
            })),
          ),
        }));
      },

      updateSandboxUrl: (agentId, sandboxUrl) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              sandboxUrl,
              updatedAt: new Date().toISOString(),
            })),
          ),
        }));
      },

      saveArtifactToCloud: (agentId, content, type) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const agent = workspace?.agents.find((candidate) => candidate.id === agentId);
        const contentUrl = content.trim();

        if (!workspace || !contentUrl) {
          return;
        }

        const now = new Date().toISOString();
        const sourceMessageId = agent?.messages.at(-1)?.id ?? makeId("artifact-source");
        const artifact: ArtifactVaultRecord = {
          id: makeId("artifact"),
          workspaceId: workspace.id,
          sourceMessageId,
          contentUrl,
          type,
          createdAt: now,
        };

        set((current) => ({
          artifactVault: [artifact, ...current.artifactVault].slice(0, 80),
        }));

        void supabaseStateSyncManager
          .saveArtifact(workspace.id, sourceMessageId, contentUrl, type)
          .catch(() => undefined);
      },

      fetchArtifactsFromCloud: async () => {
        const artifacts = await supabaseStateSyncManager.fetchArtifacts();

        set({ artifactVault: artifacts });

        return artifacts;
      },

      setPromptsCache: (prompts) => {
        set({ promptsCache: prompts });
      },

      addPromptToCache: (prompt) => {
        set((state) => ({
          promptsCache: [
            prompt,
            ...state.promptsCache.filter((candidate) => candidate.id !== prompt.id),
          ].sort((left, right) => right.updated_at.localeCompare(left.updated_at)),
        }));
      },

      updatePrompt: (id, newTitle, newContent) => {
        const state = get();
        const prompt = state.promptsCache.find((candidate) => candidate.id === id);

        if (!prompt) {
          return;
        }

        const title = newTitle.trim() || prompt.title;
        const content = newContent;
        const updatedAt = new Date().toISOString();
        const revision = {
          revisionId: makeId("prompt-revision"),
          promptId: prompt.id,
          previousTitle: prompt.title,
          previousContent: prompt.content,
          newTitle: title,
          newContent: content,
          updatedAt,
        };
        const nextPrompt: PromptRecord = {
          ...prompt,
          title,
          content,
          updated_at: updatedAt,
          revisions: [revision, ...(prompt.revisions ?? [])].slice(0, 50),
        };

        set((current) => ({
          promptsCache: [
            nextPrompt,
            ...current.promptsCache.filter((candidate) => candidate.id !== id),
          ].sort((left, right) => right.updated_at.localeCompare(left.updated_at)),
        }));
        void supabaseStateSyncManager.upsertPrompt(nextPrompt).catch(() => undefined);
      },

      deletePrompt: (id) => {
        set((state) => ({
          promptsCache: state.promptsCache.filter((prompt) => prompt.id !== id),
        }));
        void supabaseStateSyncManager.deletePrompt(id).catch(() => undefined);
      },

      updateThemeConfig: (config) => {
        const state = get();
        const workspace = getActiveWorkspace(state);

        set({
          workspaces: withActiveWorkspace(state, (current) => ({
            ...current,
            themeConfig: {
              ...(current.themeConfig ?? {}),
              ...config,
            },
          })),
        });
        queueThemeConfigCloudSync(workspace);
      },

      updateMemoryBlock: (agentId, memoryId, content) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              memory: agent.memory.map((block) =>
                block.id === memoryId
                  ? { ...block, content, updatedAt: new Date().toISOString() }
                  : block,
              ),
            })),
          ),
        }));
      },

      minimizeAgent: (agentId) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              minimized: true,
            })),
          ),
        }));
      },

      restoreAgent: (agentId) => {
        get().focusAgent(agentId);
      },

      toggleMaximizeAgent: (agentId, bounds) => {
        const state = get();
        const nextZIndex = state.nextZIndex + 1;

        set({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => {
              if (agent.maximized && agent.previousLayout) {
                return {
                  ...agent,
                  layout: {
                    ...agent.previousLayout,
                    zIndex: nextZIndex,
                  },
                  minimized: false,
                  maximized: false,
                  previousLayout: undefined,
                };
              }

              return {
                ...agent,
                previousLayout: agent.layout,
                layout: {
                  x: 16,
                  y: 16,
                  width: Math.max(420, bounds.width - 32),
                  height: Math.max(360, bounds.height - 32),
                  zIndex: nextZIndex,
                },
                minimized: false,
                maximized: true,
              };
            }),
          ).map((workspace) =>
            workspace.id === state.activeWorkspaceId
              ? { ...workspace, activeAgentId: agentId, selectedAgentId: agentId }
              : workspace,
          ),
          selectedAgentId: agentId,
          nextZIndex,
        });
      },

      minimizeAll: () => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) => ({
            ...workspace,
            agents: workspace.agents.map((agent) => ({
              ...agent,
              minimized: true,
            })),
          })),
        }));
      },

      restoreAll: () => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) => ({
            ...workspace,
            agents: workspace.agents.map((agent) => ({
              ...agent,
              minimized: false,
            })),
          })),
        }));
      },

      arrangeAgents: (bounds) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) => ({
            ...workspace,
            agents: workspace.agents.map((agent, index) => ({
              ...agent,
              layout: clampLayout(
                {
                  ...agent.layout,
                  x: 28 + (index % 4) * 46,
                  y: 58 + (index % 5) * 42,
                  width: Math.min(560, Math.max(420, bounds.width - 72)),
                  height: Math.min(620, Math.max(380, bounds.height - 116)),
                },
                bounds,
              ),
              minimized: false,
              maximized: false,
              previousLayout: undefined,
            })),
          })),
        }));
      },

      addMessage: (agentId, message) => {
        const state = get();
        const workspace = getActiveWorkspace(state);

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              messages: [...agent.messages, message],
            })),
          ),
        }));
        queueMessageCloudSync({
          agentId,
          message,
          workspaceId: workspace?.id,
        });
      },

      appendToMessage: (agentId, messageId, token) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              messages: agent.messages.map((message) =>
                message.id === messageId
                  ? {
                      ...message,
                      content: `${message.content}${token}`,
                    }
                  : message,
              ),
            })),
          ),
        }));
      },

      finishMessage: (agentId, messageId, fallback, interrupted) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const agent = workspace?.agents.find((candidate) => candidate.id === agentId);
        const sourceMessage = agent?.messages.find(
          (message) => message.id === messageId,
        );
        const finalMessage = sourceMessage
          ? {
              ...sourceMessage,
              content:
                sourceMessage.content ||
                fallback ||
                (interrupted ? "Stream interrupted." : "No signal returned."),
              streaming: false,
              interrupted,
            }
          : undefined;

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              messages: agent.messages.map((message) =>
                message.id === messageId
                  ? finalMessage ?? message
                  : message,
              ),
            })),
          ),
        }));
        if (sourceMessage?.streaming && finalMessage) {
          queueMessageCloudSync({
            agentId,
            message: finalMessage,
            workspaceId: workspace?.id,
          });
        }
      },

      setAgentStatus: (agentId, status) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              status,
              telemetry: {
                ...agent.telemetry,
                errors:
                  status === "error" ? agent.telemetry.errors + 1 : agent.telemetry.errors,
              },
            })),
          ),
        }));
      },

      setStreamMode: (mode) => {
        set((state) => {
          const activeWorkspace = getActiveWorkspace(state);
          const nextStreamMode = activeWorkspace
            ? resolveStreamMode(activeWorkspace, state.authVault)
            : mode;

          return {
            streamMode: nextStreamMode,
            workspaces: withActiveWorkspace(state, (workspace) => ({
              ...workspace,
              settings: {
                ...workspace.settings,
                streamMode: resolveStreamMode(workspace, state.authVault),
              },
            })),
          };
        });
      },

      setViewMode: (mode) => {
        set((state) => ({
          viewMode: mode,
          workspaces: withActiveWorkspace(state, (workspace) => ({
            ...workspace,
            settings: {
              ...workspace.settings,
              viewMode: mode,
            },
          })),
        }));
      },

      openVaultManager: () => {
        set({ isVaultManagerOpen: true });
      },

      closeVaultManager: () => {
        set({ isVaultManagerOpen: false });
      },

      updateGraphNodePosition: (agentId, position) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) => ({
            ...workspace,
            graph: {
              ...workspace.graph,
              nodes: workspace.graph.nodes.map((node) =>
                node.agentId === agentId ? { ...node, ...position } : node,
              ),
            },
          })),
        }));
      },

      connectGraphAgents: (edge) => {
        if (edge.sourceAgentId === edge.targetAgentId) {
          return;
        }

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) => {
            const duplicate = workspace.graph.edges.some(
              (candidate) =>
                candidate.sourceAgentId === edge.sourceAgentId &&
                candidate.targetAgentId === edge.targetAgentId,
            );

            if (duplicate) {
              return workspace;
            }

            return {
              ...workspace,
              graph: {
                ...workspace.graph,
                edges: [...workspace.graph.edges, edge],
              },
            };
          }),
        }));
      },

      removeGraphEdges: (edgeIds) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) => ({
            ...workspace,
            graph: {
              ...workspace.graph,
              edges: workspace.graph.edges.filter((edge) => !edgeIds.includes(edge.id)),
            },
          })),
        }));
      },

      updateAgentTelemetry: (agentId, generatedCharacters) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              telemetry: {
                ...agent.telemetry,
                tokens:
                  agent.telemetry.tokens +
                  Math.max(1, Math.ceil(generatedCharacters / 4)),
                latency: Number((0.28 + Math.random() * 0.78).toFixed(2)),
                confidence: Math.min(99, agent.telemetry.confidence + 1),
                tasks: agent.telemetry.tasks + 1,
              },
            })),
          ),
        }));
      },

      clearAgentMessages: (agentId) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              messages: [
                {
                  id: makeId("message"),
                  role: "assistant",
                  createdAt: new Date().toISOString(),
                  content: `${agent.callsign} buffer cleared. Mission remains active.`,
                },
              ],
            })),
          ),
        }));
      },

      runTool: async (agentId, toolId, input) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const agent = workspace.agents.find((candidate) => candidate.id === agentId);
        const tool = agent?.tools.find((candidate) => candidate.id === toolId);
        const executor = tool?.executorId ? toolExecutors[tool.executorId] : undefined;

        if (!agent || !tool || !executor) {
          return;
        }

        set((current) => ({
          workspaces: withActiveWorkspace(current, (activeWorkspace) =>
            withAgent(activeWorkspace, agentId, (currentAgent) => ({
              ...currentAgent,
              tools: currentAgent.tools.map((currentTool) =>
                currentTool.id === toolId
                  ? { ...currentTool, status: "running", lastRunAt: new Date().toISOString() }
                  : currentTool,
              ),
            })),
          ),
        }));

        try {
          const safeApiKey =
            state.authVault.globalApiKey?.replace(/[^\x20-\x7E]/g, "").trim() ||
            undefined;
          const result = await executor.run(agent, tool, {
            ...input,
            apiKey: safeApiKey,
          });
          const toolMessage: AgentMessage = {
            id: makeId("message"),
            role: "tool",
            content: result.content,
            createdAt: new Date().toISOString(),
            media: result.media,
          };

          set((current) => ({
            workspaces: withActiveWorkspace(current, (activeWorkspace) =>
              withAgent(activeWorkspace, agentId, (currentAgent) => ({
                ...currentAgent,
                messages: [...currentAgent.messages, toolMessage],
                tools: currentAgent.tools.map((currentTool) =>
                  currentTool.id === toolId
                    ? { ...currentTool, status: "done", result: result.content }
                    : currentTool,
                ),
                telemetry: {
                  ...currentAgent.telemetry,
                  toolRuns: currentAgent.telemetry.toolRuns + 1,
                },
              })),
            ),
          }));
          queueMessageCloudSync({
            agentId,
            message: toolMessage,
            workspaceId: workspace.id,
          });
        } catch (error) {
          const detail = error instanceof Error ? error.message : "Tool executor failed.";
          set((current) => ({
            workspaces: withActiveWorkspace(current, (activeWorkspace) =>
              withAgent(activeWorkspace, agentId, (currentAgent) => ({
                ...currentAgent,
                tools: currentAgent.tools.map((currentTool) =>
                  currentTool.id === toolId
                    ? { ...currentTool, status: "error", error: detail }
                    : currentTool,
                ),
                telemetry: {
                  ...currentAgent.telemetry,
                  errors: currentAgent.telemetry.errors + 1,
                },
              })),
            ),
          }));
        }
      },

      resetWorkspace: () => {
        const workspace = initialWorkspace();

        set({
          activeWorkspaceId: workspace.id,
          workspaces: [workspace],
          selectedAgentId: workspace.selectedAgentId,
          nextZIndex: 10,
          streamMode: "mock",
          viewMode: "panels",
          isVaultManagerOpen: false,
          promptsCache: [],
          lastSavedAt: new Date().toISOString(),
          lastImportError: undefined,
        });
        queueWorkspaceCloudSync(workspace);
        queuePromptsCacheRefresh(workspace.id);
      },
    }),
      {
        equality: temporalStatesAreEqual,
        limit: 50,
        partialize: partializeTemporalState,
      },
    ),
    {
      name: PERSIST_STORAGE_NAME,
      storage: createJSONStorage(() => indexedDbStateStorage),
      version: 9,
      onRehydrateStorage: () => (state) => {
        state?.materializeDefaultWorkspace();
        logHydratedMemoryState(state);
      },
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") {
          return {
            activeWorkspaceId: ACTIVE_WORKSPACE_ID,
            workspaces: [initialWorkspace()],
            selectedAgentId: "agent-operator",
            nextZIndex: 10,
            streamMode: "mock",
            viewMode: "panels",
            isVaultManagerOpen: false,
            authVault: DEFAULT_AUTH_VAULT,
            promptsCache: [],
            transactionHistory: [],
          };
        }

        const value = persisted as Partial<NexusStore> & { agents?: NexusAgent[] };

        if (Array.isArray(value.workspaces)) {
          const workspaces = normalizeWorkspaces(value.workspaces);
          const authVault = normalizeAuthVault(value.authVault);
          const activeWorkspaceId = value.activeWorkspaceId ?? workspaces[0]?.id;
          const activeWorkspace =
            workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
            workspaces[0];

          return {
            ...value,
            activeWorkspaceId,
            workspaces,
            authVault,
            selectedAgentId: value.selectedAgentId ?? activeWorkspace?.selectedAgentId,
            nextZIndex:
              Math.max(
                10,
                ...workspaces.flatMap((workspace) =>
                  workspace.agents.map((agent) => agent.layout.zIndex),
                ),
              ) + 1,
            streamMode: activeWorkspace
              ? resolveStreamMode(activeWorkspace, authVault)
              : "mock",
            viewMode: value.viewMode ?? activeWorkspace?.settings.viewMode ?? "panels",
            isVaultManagerOpen: false,
            promptsCache: [],
            transactionHistory: (value.transactionHistory ?? []).slice(0, 100),
          };
        }

        return {
          activeWorkspaceId: ACTIVE_WORKSPACE_ID,
          workspaces: [initialWorkspace()],
          selectedAgentId: "agent-operator",
          nextZIndex: 10,
          streamMode: "mock",
          viewMode: "panels",
          isVaultManagerOpen: false,
          authVault: DEFAULT_AUTH_VAULT,
          promptsCache: [],
          transactionHistory: [],
        };
      },
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
        authVault: state.authVault,
        workspaces: prepareWorkspacesForLocalPersistence(state.workspaces),
        selectedAgentId: state.selectedAgentId,
        nextZIndex: state.nextZIndex,
        streamMode: state.streamMode,
        viewMode: state.viewMode,
        transactionHistory: state.transactionHistory.slice(0, 100),
        lastSavedAt: state.lastSavedAt,
        lastImportError: state.lastImportError,
      }),
    },
  ),
);

supabaseStateSyncManager.setTransactionLogger((entry) => {
  useNexusStore.getState().recordTransaction(entry);
});
