"use client";

import { create } from "zustand";
import { createStore, del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { temporal } from "zundo";

import {
  ACTIVE_WORKSPACE_ID,
  DEFAULT_CHAT_SUPPORTED_MODELS,
  DEFAULT_BASE_URL,
  DEFAULT_WORKSPACE_BRANCHING_SETTINGS,
  agentTemplates,
  applyAgentTemplateProfile,
  createAgentFromTemplate,
  createDefaultWorkspace,
  createMediaAgent,
  createSandboxAgent,
  getDefaultGraphPosition,
  makeId,
  resolveAgentTemplateProfile,
} from "@/lib/nexus-defaults";
import {
  NEXUS_RUNTIME_AUTHORIZATION_HEADER,
  NexusApiError,
  nexusApiClient,
} from "@/lib/api/nexus-api-client";
import {
  ACTIVE_WINDOW_DEFAULT_LIMIT,
  ACTIVE_WINDOW_MAX_LIMIT,
  AGENT_MEMORY_CONTENT_MAX_BYTES,
} from "@/lib/backend/history/history-constants";
import { HistoricalDataFetcher } from "@/lib/backend/history/historical-data-fetcher";
import { supabaseStateSyncManager } from "@/lib/state-sync";
import { getNexusSupabaseClient } from "@/lib/supabase/client";
import {
  createWorkspaceSnapshot,
  materializeWorkspaceFromCloudSnapshot,
  sanitizeWorkspace,
  validateWorkspaceSnapshot,
} from "@/lib/workspace-kernel";
import type { ToolExecutorInput } from "@/lib/tool-executors";
import { LlmMemoryCompressor } from "@/lib/adapters/memory-compression-adapter";
import {
  getModelOption,
  getProviderOption,
  normalizeAgentModelSettings,
} from "@/lib/nexus-registry";
import {
  createWorkflowRuntimeLlmCall,
  resolveWorkflowRuntimeExecutionAgent,
} from "@/lib/workflow-runtime-lite/llm-client";
import { createWorkflowRuntimeImageCall } from "@/lib/workflow-runtime-lite/image-client";
import {
  createEmptyWorkflowRuntimeLiteState,
  createWorkflowRuntimeId,
  createWorkflowRuntimeNode,
  limitWorkflowRuns,
  normalizeWorkflowRuntimeLiteState,
} from "@/lib/workflow-runtime-lite/state";
import {
  appendWorkflowRuntimeGroupToRuntime,
  type AppendWorkflowRuntimeGroupOptions,
  type AppendWorkflowRuntimeGroupResult,
} from "@/lib/workflow-runtime-lite/group-append";
import {
  runWorkflowRuntimeLite,
  type WorkflowRuntimeNodePatch,
} from "@/lib/workflow-runtime-lite/runner";
import {
  createWorkflowRuntimeTraceSyncError,
  publishWorkflowRuntimeTrace,
} from "@/lib/workflow-runtime-lite/trace-client";
import { publishWorkflowGroupRecord } from "@/lib/workflow-pro/group-record-client";
import { inferLinearWorkflowRuntimeLiteEdges } from "@/lib/workflow-runtime-lite/topology";
import type {
  ActiveUiStateSnapshot,
  AgentLocalPersistenceMetadata,
  AgentBranchingStatus,
  AgentCreationCapabilityType,
  AgentLayout,
  AgentModelSettings,
  AgentMessage,
  AgentProfileUpdate,
  AgentStatus,
  AgentTemplateProfileUpdate,
  ArtifactVaultCache,
  ArtifactVaultRecord,
  ContextPacket,
  HistoricalDataPage,
  HistoricalMessageRecord,
  IAgentBranchMetadata,
  IAuthVault,
  IMemoryCompressionConfig,
  ITransactionLog,
  NotebookDraftRecord,
  NotebookRecord,
  NexusAgent,
  NexusWorkspace,
  PromptRecord,
  StreamMode,
  ToolRunCancelResponse,
  ToolRunConfirmResponse,
  ToolRunRequest,
  ToolRunResponse,
  ToolStatus,
  WorkflowNodeInstance,
  WorkflowRuntimeGroupRef,
  WorkflowRuntimeTraceSyncState,
  WorkflowRun,
  WorkflowRuntimeEdge,
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeData,
  WorkflowRuntimePosition,
  WorkflowRuntimeNodeType,
  WorkflowTemplateAgentBlueprint,
  WorkflowTemplateBlueprintData,
  WorkflowTemplateRecord,
  WorkspaceNotebookRecoveryMetadata,
  WorkspaceBranchingSettings,
  WorkspaceGraphEdge,
  WorkspaceRecoveryApplyResult,
  WorkspaceRecoveryStateResponse,
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
type AddWorkflowRuntimeNodeOptions = {
  position?: WorkflowRuntimePosition;
};
type AppendWorkflowRuntimeGroupStoreResult = Omit<
  AppendWorkflowRuntimeGroupResult,
  "runtimeLite"
>;
type RunWorkflowRuntimeLiteFlowOptions = {
  startNodeId?: string;
};
type WorkspaceBranchingSettingsUpdate = Partial<WorkspaceBranchingSettings>;
type HistoricalMessageCacheEntry = HistoricalDataPage<HistoricalMessageRecord> & {
  error?: string;
  fetchedAt?: string;
  loading: boolean;
};

const PERSIST_STORAGE_NAME = "nexus-ai-ops-workspace";
const LEGACY_LOCAL_STORAGE_KEYS = ["nexus-workspace-storage", PERSIST_STORAGE_NAME] as const;
const indexedDbStore =
  typeof indexedDB === "undefined"
    ? undefined
    : createStore("nexus-ai-ops", "workspace-state");
let initialStorageReadFinished = false;
let themeConfigSyncTimeout: ReturnType<typeof setTimeout> | undefined;
const HISTORY_FETCH_DEBOUNCE_MS = 350;
const OMITTED_IMAGE_DATA_URL_FOR_LOCAL_PERSISTENCE =
  "[inline image data URL omitted from local persistence]";
const historicalDataFetcher = new HistoricalDataFetcher();
const historyFetchDebounces = new Map<
  string,
  {
    resolve: (shouldRun: boolean) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();
const workflowRuntimeAbortControllers = new Map<string, AbortController>();

const DEFAULT_AUTH_VAULT: IAuthVault = {
  user: null,
  globalApiKey: null,
  globalBaseUrl: DEFAULT_BASE_URL,
  isLocked: true,
  providerCredentials: {},
};

function normalizeAuthVault(value: unknown): IAuthVault {
  if (!value || typeof value !== "object") {
    return DEFAULT_AUTH_VAULT;
  }

  const vault = value as Partial<IAuthVault>;

  return {
    user: vault.user ?? null,
    globalApiKey: null,
    globalBaseUrl:
      typeof vault.globalBaseUrl === "string" && vault.globalBaseUrl.trim()
        ? vault.globalBaseUrl.trim()
        : DEFAULT_BASE_URL,
    isLocked: true,
    providerCredentials: normalizeProviderCredentials(vault.providerCredentials),
  };
}

function normalizeProviderCredentials(value: unknown): IAuthVault["providerCredentials"] {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    NonNullable<IAuthVault["providerCredentials"]>
  >((credentials, [providerId, entry]) => {
    if (!entry || typeof entry !== "object") {
      return credentials;
    }

    const record = entry as NonNullable<IAuthVault["providerCredentials"]>[string];
    const provider = getProviderOption(providerId);
    const baseUrl =
      typeof record.baseUrl === "string" && record.baseUrl.trim()
        ? record.baseUrl.trim()
        : provider?.defaultBaseUrl ?? null;

    credentials[providerId] = {
      apiKey: null,
      baseUrl,
      isLocked: true,
      liveVerifiedAt: null,
      verificationStatus: "untested",
      verificationError: null,
    };

    return credentials;
  }, {});
}

export function prepareAuthVaultForLocalPersistence(authVault: IAuthVault): IAuthVault {
  return normalizeAuthVault(authVault);
}

const EMPTY_ARTIFACT_VAULT_CACHE: ArtifactVaultCache = {
  byId: {},
  hasMore: false,
  ids: [],
  nextCursor: null,
};

function createArtifactVaultCache(
  artifacts: ArtifactVaultRecord[],
  options: Pick<ArtifactVaultCache, "hasMore" | "nextCursor"> = {
    hasMore: false,
    nextCursor: null,
  },
): ArtifactVaultCache {
  const byId: Record<string, ArtifactVaultRecord> = {};
  const ids: string[] = [];

  for (const artifact of artifacts) {
    byId[artifact.id] = artifact;
    ids.push(artifact.id);
  }

  return {
    byId,
    fetchedAt: new Date().toISOString(),
    hasMore: options.hasMore,
    ids,
    nextCursor: options.nextCursor ?? null,
  };
}

function getHistoricalMessageCacheKey(workspaceId: string, agentId: string) {
  return `${workspaceId}::${agentId}`;
}

function waitForHistoryFetchDebounce(key: string) {
  return new Promise<boolean>((resolve) => {
    const existing = historyFetchDebounces.get(key);

    if (existing) {
      clearTimeout(existing.timeout);
      existing.resolve(false);
    }

    const timeout = setTimeout(() => {
      historyFetchDebounces.delete(key);
      resolve(true);
    }, HISTORY_FETCH_DEBOUNCE_MS);

    historyFetchDebounces.set(key, { resolve, timeout });
  });
}

function normalizeArtifactVaultCache(value: unknown): ArtifactVaultCache {
  if (Array.isArray(value)) {
    return createArtifactVaultCache(value.filter(isArtifactVaultRecord));
  }

  if (!value || typeof value !== "object") {
    return EMPTY_ARTIFACT_VAULT_CACHE;
  }

  const candidate = value as Partial<ArtifactVaultCache>;
  const byId = isArtifactVaultRecordMap(candidate.byId) ? candidate.byId : {};
  const ids = Array.isArray(candidate.ids)
    ? candidate.ids.filter((id) => typeof id === "string" && Boolean(byId[id]))
    : Object.keys(byId);

  return {
    byId,
    fetchedAt: typeof candidate.fetchedAt === "string" ? candidate.fetchedAt : undefined,
    hasMore: Boolean(candidate.hasMore),
    ids,
    nextCursor: typeof candidate.nextCursor === "string" ? candidate.nextCursor : null,
  };
}

function isArtifactVaultRecord(value: unknown): value is ArtifactVaultRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ArtifactVaultRecord>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.workspaceId === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.createdAt === "string"
  );
}

function isArtifactVaultRecordMap(value: unknown): value is Record<string, ArtifactVaultRecord> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(isArtifactVaultRecord);
}

export function collectWorkflowGeneratedArtifactVaultRecords(
  run: WorkflowRun,
): ArtifactVaultRecord[] {
  const records: ArtifactVaultRecord[] = [];

  for (const execution of run.nodeExecutions) {
    const output = execution.outputSnapshot;
    const record = output?.metadata.artifactVaultRecord;

    if (isArtifactVaultRecord(record)) {
      records.push(record);
      continue;
    }

    const transientRecord = createTransientWorkflowGeneratedArtifactRecord({
      execution,
      run,
    });

    if (transientRecord) {
      records.push(transientRecord);
    }
  }

  return records;
}

function createTransientWorkflowGeneratedArtifactRecord({
  execution,
  run,
}: {
  execution: WorkflowRun["nodeExecutions"][number];
  run: WorkflowRun;
}): ArtifactVaultRecord | null {
  const output = execution.outputSnapshot;
  const metadata = output?.metadata;
  const generatedAsset = getRecordValue(metadata?.generatedAsset);
  const imageUrl = getStringValue(metadata?.imageUrl);

  if (!output || !imageUrl || !generatedAsset) {
    return null;
  }

  const assetId = getStringValue(generatedAsset.assetId);
  const sourceNodeId = output.sourceNodeId || execution.nodeId;

  if (!assetId || !sourceNodeId) {
    return null;
  }

  const prompt = getStringValue(metadata?.prompt) || output.rawText;
  const mimeType =
    getStringValue(generatedAsset.mimeType) ||
    getStringValue(metadata?.mimeType) ||
    "image/png";
  const sizeBytes = getNumberValue(generatedAsset.sizeBytes);
  const createdAt = output.createdAt || run.completedAt || run.startedAt;

  return {
    contentSizeBytes: sizeBytes,
    contentUrl: imageUrl,
    createdAt,
    id: `transient_${assetId}`,
    mimeType,
    previewText: prompt,
    sourceMessageId: `${run.runId}:${sourceNodeId}:image`,
    status: "saved",
    title: `Workflow image - ${prompt.slice(0, 48)}`,
    type: "generated-image",
    updatedAt: createdAt,
    version: 1,
    workspaceId: run.workflowId,
  };
}

function getRecordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mergeArtifactVaultRecordsIntoCache(
  cache: ArtifactVaultCache,
  records: ArtifactVaultRecord[],
): ArtifactVaultCache {
  if (!records.length) {
    return cache;
  }

  const byId: Record<string, ArtifactVaultRecord> = {};
  const ids: string[] = [];

  for (const record of records) {
    if (byId[record.id]) {
      byId[record.id] = record;
      continue;
    }

    byId[record.id] = record;
    ids.push(record.id);
  }

  for (const id of cache.ids) {
    const record = cache.byId[id];

    if (!record || byId[id]) {
      continue;
    }

    byId[id] = record;
    ids.push(id);
  }

  return {
    byId,
    fetchedAt: new Date().toISOString(),
    hasMore: cache.hasMore,
    ids,
    nextCursor: cache.nextCursor ?? null,
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
  artifactVault: ArtifactVaultCache;
  historicalMessages: Record<string, HistoricalMessageCacheEntry>;
  promptsCache: PromptRecord[];
  notebooksCache: NotebookRecord[];
  deletedNotebooksCache: NotebookRecord[];
  notebookDrafts: Record<string, NotebookDraftRecord>;
  openNotebookIds: string[];
  notebookWindowLayers: Record<string, number>;
  transactionHistory: ITransactionLog[];
  branchingStatus: AgentBranchingStatus;
  lastSavedAt?: string;
  lastImportError?: string;
  materializeDefaultWorkspace: () => void;
  saveWorkspaceSnapshot: () => void;
  createWorkspace: () => WorkspaceIdentity;
  switchWorkspace: (workspaceId: string) => void;
  bindActiveWorkspaceToCloudSession: (input: {
    workspaceId: string;
    workspaceName?: string;
  }) => void;
  renameWorkspace: (name: string) => void;
  exportActiveWorkspace: (options?: {
    notebookRecovery?: WorkspaceNotebookRecoveryMetadata;
  }) => WorkspaceSnapshot;
  importWorkspace: (snapshot: WorkspaceSnapshot) => void;
  applyWorkspaceRecoveryState: (
    recovery: WorkspaceRecoveryStateResponse,
  ) => WorkspaceRecoveryApplyResult;
  spawnAgent: (templateId?: string, capabilityType?: AgentCreationCapabilityType) => string;
  branchAgent: (
    sourceAgentId: string,
    config: IMemoryCompressionConfig,
  ) => Promise<string | null>;
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
  updateAgentProfile: (agentId: string, profile: AgentProfileUpdate) => void;
  updateAgentCallsign: (agentId: string, callsign: string) => void;
  setAgentProfileLocked: (agentId: string, locked: boolean) => void;
  updateAgentMission: (agentId: string, mission: string) => void;
  updateAgentModel: (agentId: string, model: string) => void;
  updateAgentModelSettings: (agentId: string, settings: Partial<AgentModelSettings>) => void;
  updateAgentTemplateProfile: (
    templateId: string,
    profile: AgentTemplateProfileUpdate,
  ) => void;
  login: (user: IAuthVault["user"]) => void;
  logout: () => void;
  setGlobalApiKey: (key: string) => void;
  setGlobalBaseUrl: (baseUrl: string) => void;
  setProviderApiKey: (providerId: string, key: string) => void;
  setProviderBaseUrl: (providerId: string, baseUrl: string) => void;
  setProviderVerificationStatus: (
    providerId: string,
    status: "untested" | "verified" | "failed",
    error?: string,
  ) => void;
  lockProviderCredential: (providerId: string) => void;
  unlockProviderCredential: (providerId: string) => void;
  deleteProviderCredential: (providerId: string) => void;
  lockVault: () => void;
  unlockVault: () => void;
  deleteApiKey: () => void;
  updateThemeConfig: (config: WorkspaceThemeConfigUpdate) => void;
  updateBranchingSettings: (settings: WorkspaceBranchingSettingsUpdate) => void;
  updateSandboxCode: (agentId: string, sandboxCode: string) => void;
  updateSandboxUrl: (agentId: string, sandboxUrl: string) => void;
  saveArtifactToCloud: (agentId: string, content: string, type: string) => void;
  fetchArtifactsFromCloud: () => Promise<ArtifactVaultRecord[]>;
  fetchHistoricalMessages: (agentId: string) => Promise<void>;
  setPromptsCache: (prompts: PromptRecord[]) => void;
  addPromptToCache: (prompt: PromptRecord) => void;
  updatePrompt: (id: string, newTitle: string, newContent: string) => void;
  deletePrompt: (id: string) => void;
  setNotebooksCache: (notebooks: NotebookRecord[]) => void;
  toggleNotebookOpen: (id: string) => void;
  focusNotebookWindow: (id: string) => void;
  createNotebook: () => string;
  saveNotebookDraft: (id: string, title: string, content: string) => void;
  clearNotebookDraft: (id: string) => void;
  updateNotebook: (id: string, title: string, content: string) => void;
  deleteNotebook: (id: string) => void;
  updateMemoryBlock: (agentId: string, memoryId: string, content: string) => void;
  minimizeAgent: (agentId: string) => void;
  restoreAgent: (agentId: string) => void;
  toggleMaximizeAgent: (agentId: string, bounds: WorkspaceBounds) => void;
  minimizeAll: () => void;
  restoreAll: () => void;
  arrangeAgents: (bounds: WorkspaceBounds) => void;
  addMessage: (agentId: string, message: AgentMessage) => void;
  appendToMessage: (agentId: string, messageId: string, token: string) => void;
  appendReasoningToMessage: (agentId: string, messageId: string, token: string) => void;
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
  addWorkflowRuntimeNode: (
    type: WorkflowRuntimeNodeType,
    options?: AddWorkflowRuntimeNodeOptions,
  ) => string;
  updateWorkflowRuntimeNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
  updateWorkflowRuntimeNodePosition: (
    nodeId: string,
    position: { x: number; y: number },
  ) => void;
  connectWorkflowRuntimeNodes: (edge: WorkflowRuntimeEdge) => void;
  appendWorkflowRuntimeGroup: (
    runtimeLite: WorkflowRuntimeLiteState,
    options?: AppendWorkflowRuntimeGroupOptions,
  ) => AppendWorkflowRuntimeGroupStoreResult;
  replaceWorkflowRuntimeLite: (runtimeLite: WorkflowRuntimeLiteState) => void;
  removeWorkflowRuntimeNodes: (nodeIds: string[]) => void;
  removeWorkflowRuntimeEdges: (edgeIds: string[]) => void;
  pauseWorkflowRuntimeLiteFlow: () => void;
  runWorkflowRuntimeLiteFlow: (
    options?: RunWorkflowRuntimeLiteFlowOptions,
  ) => Promise<WorkflowRun | undefined>;
  retryWorkflowRuntimeTraceSync: (runId: string) => Promise<WorkflowRun | undefined>;
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
    workspaces: prepareWorkspacesForTemporalState(state.workspaces),
  };
}

function prepareWorkspacesForTemporalState(workspaces: NexusWorkspace[]) {
  return workspaces.map((workspace) => ({
    ...workspace,
    graph: {
      ...workspace.graph,
      runtimeLite: workspace.graph.runtimeLite
        ? prepareWorkflowRuntimeLiteForTemporalState(workspace.graph.runtimeLite)
        : workspace.graph.runtimeLite,
    },
  }));
}

function prepareWorkflowRuntimeLiteForTemporalState(
  runtimeLite: WorkflowRuntimeLiteState,
): WorkflowRuntimeLiteState {
  return {
    ...runtimeLite,
    lastError: null,
    lastRunId: null,
    nodes: runtimeLite.nodes.map((node) => ({
      ...node,
      error: null,
      inputSnapshot: null,
      outputSnapshot: null,
      status: node.status === "failed_interrupted" ? "failed_interrupted" : "idle",
    })),
    runs: [],
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
        executionPrompt: agent.executionPrompt,
        layout: agent.layout,
        maximized: agent.maximized,
        minimized: agent.minimized,
        mission: agent.mission,
        profileLocked: agent.profileLocked,
        model: agent.model,
        modelSettings: agent.modelSettings,
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
      branchingSettings: workspace.settings.branchingSettings,
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

function clampBranchingRetentionRatio(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(5, Math.round(value)))
    : DEFAULT_WORKSPACE_BRANCHING_SETTINGS.defaultRetentionRatio;
}

function normalizeBranchingSettings(
  value?: WorkspaceBranchingSettingsUpdate,
): WorkspaceBranchingSettings {
  return {
    ...DEFAULT_WORKSPACE_BRANCHING_SETTINGS,
    ...value,
    defaultRetentionRatio: clampBranchingRetentionRatio(
      value?.defaultRetentionRatio,
    ),
  };
}

function createBranchAgentId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : makeId("agent");
}

function createForkCallsign(callsign: string) {
  return `${callsign.replace(/-FORK(?:-\d+)?$/i, "")}-FORK`;
}

function createBranchMetadata({
  config,
  sourceAgent,
  timestamp,
}: {
  config: IMemoryCompressionConfig;
  sourceAgent: NexusAgent;
  timestamp: string;
}): IAgentBranchMetadata {
  return {
    sourceAgentId: sourceAgent.id,
    sourceAgentCallsign: sourceAgent.callsign,
    mode: config.mode,
    createdAt: timestamp,
    compressionConfig: clone(config),
  };
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
    executionPrompt: blueprint.executionPrompt || "",
    profileLocked: blueprint.profileLocked ?? false,
    provider: blueprint.provider || "openai",
    model: blueprint.model || "gpt-4o-mini",
    modelSettings: normalizeAgentModelSettings(
      blueprint.model || "gpt-4o-mini",
      blueprint.modelSettings,
    ),
    capabilities: blueprint.capabilities ?? {
      type: "chat",
      supportedModels: DEFAULT_CHAT_SUPPORTED_MODELS,
    },
    sandboxCode: blueprint.sandboxCode,
    sandboxUrl: blueprint.sandboxUrl ?? "",
    status: "idle",
    accent: blueprint.accent || "#d4d4d4",
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

function createActiveUiStateSnapshot(
  workspace: NexusWorkspace,
): ActiveUiStateSnapshot {
  return {
    activeAgentId: workspace.activeAgentId,
    agents: workspace.agents,
    createdAt: workspace.createdAt,
    graph: workspace.graph,
    id: workspace.id,
    name: workspace.name,
    panels: workspace.panels,
    selectedAgentId: workspace.selectedAgentId,
    settings: workspace.settings,
    themeConfig: workspace.themeConfig,
    updatedAt: workspace.updatedAt,
  };
}

function queueWorkspaceCloudSync(workspace?: Pick<NexusWorkspace, "id" | "name">) {
  if (!workspace) {
    return;
  }

  const fullWorkspace =
    isFullWorkspace(workspace)
      ? workspace
      : useNexusStore.getState().workspaces.find((candidate) => candidate.id === workspace.id);

  if (fullWorkspace) {
    void supabaseStateSyncManager
      .syncActiveUiState(createActiveUiStateSnapshot(fullWorkspace))
      .catch(() => undefined);
    return;
  }

  void supabaseStateSyncManager.upsertWorkspace(workspace.id, workspace.name).catch(() => undefined);
}

function isFullWorkspace(
  workspace: Pick<NexusWorkspace, "id" | "name">,
): workspace is NexusWorkspace {
  return "agents" in workspace && Array.isArray(workspace.agents);
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

function sortNotebooks(notebooks: NotebookRecord[]) {
  return [...notebooks].sort((left, right) => {
    const leftDate = left.updated_at ?? left.created_at ?? "";
    const rightDate = right.updated_at ?? right.created_at ?? "";

    return rightDate.localeCompare(leftDate);
  });
}

function sortPrompts(prompts: PromptRecord[]) {
  return [...prompts].sort((left, right) =>
    right.updated_at.localeCompare(left.updated_at),
  );
}

function mergeRemotePromptsWithLocalCache(
  remotePrompts: PromptRecord[],
  localPrompts: PromptRecord[],
) {
  const visibleRemote = remotePrompts.filter((prompt) => !prompt.deleted_at);
  const mergedById = new Map(visibleRemote.map((prompt) => [prompt.id, prompt]));

  localPrompts
    .filter((prompt) => !prompt.deleted_at)
    .forEach((localPrompt) => {
      const remotePrompt = mergedById.get(localPrompt.id);

      if (
        !remotePrompt ||
        isNewerTimestamp(localPrompt.updated_at, remotePrompt.updated_at)
      ) {
        mergedById.set(localPrompt.id, localPrompt);
      }
    });

  return sortPrompts([...mergedById.values()]);
}

function normalizeNotebookDrafts(drafts: NotebookDraftRecord[]) {
  return Object.fromEntries(
    drafts
      .filter((draft) => draft.notebookId && typeof draft.updatedAt === "string")
      .map((draft) => [
        draft.notebookId,
        {
          baseUpdatedAt: draft.baseUpdatedAt ?? null,
          content: draft.content ?? "",
          notebookId: draft.notebookId,
          title: draft.title ?? "",
          updatedAt: draft.updatedAt,
          workspaceId: draft.workspaceId ?? null,
        },
      ]),
  );
}

function omitNotebookDraft(
  drafts: Record<string, NotebookDraftRecord>,
  notebookId: string,
) {
  const remaining = { ...drafts };
  delete remaining[notebookId];

  return remaining;
}

function mergeRemoteNotebooksWithLocalCache(
  remoteNotebooks: NotebookRecord[],
  localNotebooks: NotebookRecord[],
) {
  if (remoteNotebooks.length === 0 && localNotebooks.length === 0) {
    return sortNotebooks(remoteNotebooks);
  }

  const mergedById = new Map(remoteNotebooks.map((notebook) => [notebook.id, notebook]));

  localNotebooks.forEach((localNotebook) => {
    const remoteNotebook = mergedById.get(localNotebook.id);

    if (
      !remoteNotebook ||
      isNewerTimestamp(
        localNotebook.updated_at ?? localNotebook.created_at,
        remoteNotebook.updated_at ?? remoteNotebook.created_at,
      )
    ) {
      // Without tombstones, remote reads are not authoritative enough to erase newer/local-only Datapads.
      mergedById.set(localNotebook.id, localNotebook);
    }
  });

  return sortNotebooks([...mergedById.values()]);
}

function isNewerTimestamp(left?: string | null, right?: string | null) {
  if (!left || !right) {
    return false;
  }

  return new Date(left).getTime() > new Date(right).getTime();
}

function queueNotebooksCacheRefresh() {
  void supabaseStateSyncManager
    .fetchNotebooks()
    .then((notebooks) => {
      useNexusStore.getState().setNotebooksCache(notebooks);
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

function withWorkspaceById(
  state: NexusStore,
  workspaceId: string,
  updater: (workspace: NexusWorkspace) => NexusWorkspace,
) {
  const now = new Date().toISOString();

  return state.workspaces.map((workspace) =>
    workspace.id === workspaceId
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

function withWorkflowRuntimeLite(
  workspace: NexusWorkspace,
  updater: (
    runtimeLite: ReturnType<typeof normalizeWorkflowRuntimeLiteState>,
  ) => ReturnType<typeof normalizeWorkflowRuntimeLiteState>,
) {
  const runtimeLite = normalizeWorkflowRuntimeLiteState(
    workspace.graph.runtimeLite,
    { resetInterrupted: false },
  );

  return {
    ...workspace,
    graph: {
      ...workspace.graph,
      runtimeLite: updater(runtimeLite),
    },
  };
}

function selectWorkflowRuntimeLiteFromStartNode(
  runtimeLite: WorkflowRuntimeLiteState,
  startNodeId: string | undefined,
) {
  if (!startNodeId) {
    return runtimeLite;
  }

  const startNode = runtimeLite.nodes.find(
    (node) => node.id === startNodeId && node.type === "input.text",
  );

  if (!startNode) {
    return {
      ...runtimeLite,
      edges: [],
      nodes: [],
    };
  }

  const outgoing = new Map<string, WorkflowRuntimeEdge[]>();

  for (const edge of runtimeLite.edges) {
    const group = outgoing.get(edge.source) ?? [];
    group.push(edge);
    outgoing.set(edge.source, group);
  }

  const reachableNodeIds = new Set<string>();
  const stack = [startNode.id];

  while (stack.length) {
    const nodeId = stack.pop();

    if (!nodeId || reachableNodeIds.has(nodeId)) {
      continue;
    }

    reachableNodeIds.add(nodeId);

    for (const edge of outgoing.get(nodeId) ?? []) {
      stack.push(edge.target);
    }
  }

  return {
    ...runtimeLite,
    edges: runtimeLite.edges.filter(
      (edge) => reachableNodeIds.has(edge.source) && reachableNodeIds.has(edge.target),
    ),
    nodes: runtimeLite.nodes.filter((node) => reachableNodeIds.has(node.id)),
  };
}

function resolveWorkflowRuntimeGroupForRun(
  runtimeLite: WorkflowRuntimeLiteState,
): WorkflowRuntimeGroupRef | undefined {
  const groups = new Map<string, WorkflowRuntimeGroupRef>();

  for (const node of runtimeLite.nodes) {
    if (node.group?.id) {
      groups.set(node.group.id, node.group);
    }
  }

  return groups.size === 1 ? [...groups.values()][0] : undefined;
}

function patchWorkflowRuntimeNode(
  node: WorkflowNodeInstance,
  patch: WorkflowRuntimeNodePatch,
): WorkflowNodeInstance {
  return {
    ...node,
    ...patch,
  } as WorkflowNodeInstance;
}

function resetWorkflowRuntimeNodeForRun(
  node: WorkflowNodeInstance,
): WorkflowNodeInstance {
  return {
    ...node,
    error: null,
    inputSnapshot: null,
    outputSnapshot: null,
    status: "idle",
  };
}

function upsertWorkflowRun(runs: WorkflowRun[], run: WorkflowRun) {
  const nextRuns = runs.some((candidate) => candidate.runId === run.runId)
    ? runs.map((candidate) => (candidate.runId === run.runId ? run : candidate))
    : [run, ...runs];

  return limitWorkflowRuns(nextRuns);
}

function markWorkflowRunTraceSync(
  runs: WorkflowRun[],
  runId: string,
  traceSync: WorkflowRuntimeTraceSyncState,
) {
  return runs.map((run) =>
    run.runId === runId
      ? {
          ...run,
          traceSync,
        }
      : run,
  );
}

function resolveStreamMode(_workspace: NexusWorkspace | undefined, authVault?: IAuthVault): StreamMode {
  return authVault?.globalApiKey?.trim() ||
    Object.values(authVault?.providerCredentials ?? {}).some((entry) => entry.apiKey?.trim())
    ? "live"
    : "mock";
}

function getDefaultChatModelForAgent() {
  return DEFAULT_CHAT_SUPPORTED_MODELS.includes("gpt-5.5")
    ? "gpt-5.5"
    : DEFAULT_CHAT_SUPPORTED_MODELS[0] ?? "gpt-4o-mini";
}

function normalizeAgentModelCatalog(agent: NexusAgent): NexusAgent {
  const candidate = agent as NexusAgent & {
    executionPrompt?: unknown;
    profileLocked?: unknown;
  };
  const profileFields = {
    executionPrompt:
      typeof candidate.executionPrompt === "string" ? candidate.executionPrompt : "",
    profileLocked:
      typeof candidate.profileLocked === "boolean" ? candidate.profileLocked : false,
  };

  if ((agent.capabilities?.type ?? "chat") !== "chat") {
    return {
      ...agent,
      ...profileFields,
      modelSettings: normalizeAgentModelSettings(agent.model, agent.modelSettings),
    };
  }

  const model = agent.model?.trim() || getDefaultChatModelForAgent();
  const supportedModels = Array.from(
    new Set([
      model,
      ...DEFAULT_CHAT_SUPPORTED_MODELS,
      ...(agent.capabilities?.supportedModels ?? []),
    ]),
  );

  return {
    ...agent,
    ...profileFields,
    model,
    modelSettings: normalizeAgentModelSettings(model, agent.modelSettings),
    capabilities: {
      ...(agent.capabilities ?? { type: "chat", supportedModels: [] }),
      type: "chat",
      supportedModels,
    },
  };
}

function syncPanels(
  workspace: NexusWorkspace,
  options: { resetInterrupted?: boolean } = {},
) {
  const resetInterrupted = options.resetInterrupted ?? false;
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
      runtimeLite: normalizeWorkflowRuntimeLiteState(workspace.graph?.runtimeLite, {
        resetInterrupted,
      }),
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
      executionPrompt: agent.executionPrompt,
      mission: agent.mission,
      profileLocked: agent.profileLocked,
      provider: agent.provider,
      model: agent.model,
      modelSettings: clone(agent.modelSettings),
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

  return sanitized
    .map((workspace) => ({
      ...workspace,
      agents: workspace.agents.map(normalizeAgentModelCatalog),
      settings: {
        ...workspace.settings,
        agentTemplateProfiles: workspace.settings.agentTemplateProfiles ?? {},
        branchingSettings: normalizeBranchingSettings(
          workspace.settings.branchingSettings,
        ),
      },
    }))
    .map((workspace) => syncPanels(workspace, { resetInterrupted: true }));
}

export function prepareWorkspacesForLocalPersistence(workspaces: NexusWorkspace[]) {
  return normalizeWorkspaces(workspaces).map(prepareWorkspaceForLocalPersistence);
}

function prepareWorkspaceForLocalPersistence(workspace: NexusWorkspace): NexusWorkspace {
  return {
    ...workspace,
    agents: workspace.agents.map(prepareAgentForLocalPersistence),
    graph: {
      ...workspace.graph,
      runtimeLite: workspace.graph.runtimeLite
        ? prepareWorkflowRuntimeLiteForLocalPersistence(workspace.graph.runtimeLite)
        : workspace.graph.runtimeLite,
    },
    settings: {
      ...workspace.settings,
      agentTemplateProfiles: workspace.settings.agentTemplateProfiles ?? {},
    },
  };
}

function prepareWorkflowRuntimeLiteForLocalPersistence(
  runtimeLite: WorkflowRuntimeLiteState,
): WorkflowRuntimeLiteState {
  return {
    ...runtimeLite,
    nodes: runtimeLite.nodes.map((node) => ({
      ...node,
      inputSnapshot: prepareContextPacketForLocalPersistence(node.inputSnapshot),
      outputSnapshot: prepareContextPacketForLocalPersistence(node.outputSnapshot),
    })),
    runs: runtimeLite.runs.map((run) => ({
      ...run,
      nodeExecutions: run.nodeExecutions.map((execution) => ({
        ...execution,
        inputSnapshot: prepareContextPacketForLocalPersistence(
          execution.inputSnapshot,
        ),
        outputSnapshot: prepareContextPacketForLocalPersistence(
          execution.outputSnapshot,
        ),
      })),
    })),
  };
}

function prepareContextPacketForLocalPersistence(
  packet: ContextPacket | null | undefined,
) {
  if (!packet) {
    return packet ?? null;
  }

  return {
    ...packet,
    displayText: omitInlineImageDataUrls(packet.displayText),
    metadata: omitInlineImageDataUrlsFromJson(packet.metadata) as Record<string, unknown>,
    rawText: omitInlineImageDataUrls(packet.rawText),
  };
}

function omitInlineImageDataUrls(value: string) {
  if (!value.includes("data:image/") || !value.includes(";base64,")) {
    return value;
  }

  return value.replace(
    /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gu,
    OMITTED_IMAGE_DATA_URL_FOR_LOCAL_PERSISTENCE,
  );
}

function omitInlineImageDataUrlsFromJson(value: unknown): unknown {
  if (typeof value === "string") {
    return omitInlineImageDataUrls(value);
  }

  if (Array.isArray(value)) {
    return value.map(omitInlineImageDataUrlsFromJson);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      omitInlineImageDataUrlsFromJson(entry),
    ]),
  );
}

function prepareAgentForLocalPersistence(agent: NexusAgent): NexusAgent {
  const messages = prepareMessagesForLocalPersistence(agent.messages);
  const memory = prepareMemoryForLocalPersistence(agent.memory);

  return {
    ...agent,
    localPersistence: createAgentLocalPersistenceMetadata(messages, memory),
    memory,
    messages,
  };
}

function prepareMessagesForLocalPersistence(
  messages: NexusAgent["messages"],
): NexusAgent["messages"] {
  return messages.map((message) => ({ ...message }));
}

function prepareMemoryForLocalPersistence(
  memory: NexusAgent["memory"],
): NexusAgent["memory"] {
  return memory.map((block) => ({ ...block }));
}

function createAgentLocalPersistenceMetadata(
  messages: NexusAgent["messages"],
  memory: NexusAgent["memory"],
): AgentLocalPersistenceMetadata {
  return {
    schemaVersion: 1,
    messages: createMessageRetentionMetadata(messages),
    memory: createMemoryRetentionMetadata(memory),
  };
}

function createMessageRetentionMetadata(
  messages: NexusAgent["messages"],
): AgentLocalPersistenceMetadata["messages"] {
  return {
    activeWindowLimit: ACTIVE_WINDOW_DEFAULT_LIMIT,
    durability: "needs_sync_operation_applier_message_projection",
    maxWindowLimit: ACTIVE_WINDOW_MAX_LIMIT,
    mode: "preserve_full_until_durable_projection",
    omittedCount: 0,
    retainedCount: messages.length,
  };
}

function createMemoryRetentionMetadata(
  memory: NexusAgent["memory"],
): AgentLocalPersistenceMetadata["memory"] {
  return {
    durability: "needs_memory_write_route",
    maxRecordContentBytes: AGENT_MEMORY_CONTENT_MAX_BYTES,
    mode: "preserve_full_until_durable_write",
    omittedBlockCount: 0,
    retainedBlockCount: memory.length,
  };
}

function logHydratedMemoryState(state: NexusStore | undefined) {
  if (typeof window === "undefined" || !state) {
    return;
  }

  console.log("Memory State Loaded:", {
    activeWorkspaceId: state.activeWorkspaceId,
    globalApiKeyLoaded: Boolean(state.authVault.globalApiKey?.trim()),
    notebooksLoaded: state.notebooksCache.length,
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
      selectedAgentId: "agent-nexus-1",
      nextZIndex: 10,
      streamMode: "mock",
      viewMode: "panels",
      isVaultManagerOpen: false,
      authVault: DEFAULT_AUTH_VAULT,
      artifactVault: EMPTY_ARTIFACT_VAULT_CACHE,
      historicalMessages: {},
      promptsCache: [],
      notebooksCache: [],
      deletedNotebooksCache: [],
      notebookDrafts: {},
      openNotebookIds: [],
      notebookWindowLayers: {},
      transactionHistory: [],
      branchingStatus: "idle",

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
        queueNotebooksCacheRefresh();
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
        get().notebooksCache.forEach((notebook) => {
          void supabaseStateSyncManager
            .upsertNotebook(notebook, notebook.workspace_id ?? undefined)
            .catch((error) => {
              console.error("[Datapad Save Sync Error]:", error);
            });
        });
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

      bindActiveWorkspaceToCloudSession: ({ workspaceId, workspaceName }) => {
        const state = get();
        const nextWorkspaceId = workspaceId.trim();
        const activeWorkspace = getActiveWorkspace(state);

        if (!activeWorkspace || !nextWorkspaceId) {
          return;
        }

        const existingWorkspace = state.workspaces.find(
          (candidate) => candidate.id === nextWorkspaceId,
        );

        if (existingWorkspace) {
          if (existingWorkspace.id !== state.activeWorkspaceId) {
            set({
              activeWorkspaceId: existingWorkspace.id,
              selectedAgentId:
                existingWorkspace.selectedAgentId ?? existingWorkspace.agents[0]?.id,
              streamMode: resolveStreamMode(existingWorkspace, state.authVault),
              viewMode: existingWorkspace.settings.viewMode,
            });
          }

          queuePromptsCacheRefresh(existingWorkspace.id);
          return;
        }

        const previousWorkspaceId = activeWorkspace.id;
        const now = new Date().toISOString();
        const reboundWorkspace: NexusWorkspace = {
          ...activeWorkspace,
          id: nextWorkspaceId,
          name: workspaceName?.trim() || activeWorkspace.name,
          updatedAt: now,
        };

        set((current) => ({
          activeWorkspaceId: reboundWorkspace.id,
          lastSavedAt: now,
          notebookDrafts: Object.fromEntries(
            Object.entries(current.notebookDrafts).map(([notebookId, draft]) => [
              notebookId,
              draft.workspaceId === previousWorkspaceId
                ? { ...draft, workspaceId: reboundWorkspace.id }
                : draft,
            ]),
          ),
          notebooksCache: current.notebooksCache.map((notebook) =>
            notebook.workspace_id === previousWorkspaceId
              ? { ...notebook, workspace_id: reboundWorkspace.id }
              : notebook,
          ),
          selectedAgentId:
            reboundWorkspace.selectedAgentId ?? reboundWorkspace.agents[0]?.id,
          streamMode: resolveStreamMode(reboundWorkspace, current.authVault),
          viewMode: reboundWorkspace.settings.viewMode,
          workspaces: current.workspaces.map((workspace) =>
            workspace.id === previousWorkspaceId ? reboundWorkspace : workspace,
          ),
        }));

        queueWorkspaceCloudSync(reboundWorkspace);
        queuePromptsCacheRefresh(reboundWorkspace.id);
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

      exportActiveWorkspace: (options) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        return createWorkspaceSnapshot(workspace, {
          deletedNotebooks: state.deletedNotebooksCache,
          notebookDrafts: Object.values(state.notebookDrafts),
          notebookRecovery: options?.notebookRecovery,
          notebooks: state.notebooksCache,
        });
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
          deletedNotebooksCache: sortNotebooks(
            snapshot.deletedNotebooks ?? get().deletedNotebooksCache,
          ),
          notebookDrafts: normalizeNotebookDrafts(
            snapshot.notebookDrafts ?? Object.values(get().notebookDrafts),
          ),
          notebooksCache: sortNotebooks(snapshot.notebooks ?? get().notebooksCache),
          selectedAgentId: workspace.selectedAgentId ?? workspace.agents[0]?.id,
          nextZIndex: highestZ + 1,
          streamMode: resolveStreamMode(workspace, get().authVault),
          viewMode: workspace.settings.viewMode,
          lastSavedAt: new Date().toISOString(),
          lastImportError: undefined,
        });
        queueWorkspaceCloudSync(workspace);
        queuePromptsCacheRefresh(workspace.id);
        (snapshot.notebooks ?? []).forEach((notebook) => {
          void supabaseStateSyncManager
            .upsertNotebook(notebook, notebook.workspace_id ?? workspace.id)
            .catch((error) => {
              console.error("[Datapad Import Sync Error]:", error);
            });
        });
      },

      applyWorkspaceRecoveryState: (recovery) => {
        if (!recovery.latest || !recovery.plan) {
          return {
            reason: "missing_cloud_state",
            status: "skipped",
          };
        }

        if (recovery.plan.action === "conflict") {
          return {
            checksum: recovery.plan.checksum,
            reason: recovery.plan.reason,
            status: "conflicted",
            workspaceId: recovery.plan.workspaceId,
          };
        }

        if (recovery.plan.action === "skip") {
          return {
            checksum: recovery.plan.checksum,
            reason: recovery.plan.reason,
            status: "skipped",
            workspaceId: recovery.plan.workspaceId,
          };
        }

        const recoveredWorkspace = materializeWorkspaceFromCloudSnapshot(
          recovery.latest.snapshot,
        );
        const state = get();
        const existingWorkspace = state.workspaces.find(
          (workspace) => workspace.id === recoveredWorkspace.id,
        );

        if (
          existingWorkspace &&
          isNewerTimestamp(existingWorkspace.updatedAt, recoveredWorkspace.updatedAt)
        ) {
          return {
            checksum: recovery.plan.checksum,
            reason: "local_newer",
            status: "conflicted",
            workspaceId: recoveredWorkspace.id,
          };
        }

        set((current) => {
          const exists = current.workspaces.some(
            (workspace) => workspace.id === recoveredWorkspace.id,
          );
          const workspaces = exists
            ? current.workspaces.map((workspace) =>
                workspace.id === recoveredWorkspace.id ? recoveredWorkspace : workspace,
              )
            : [recoveredWorkspace, ...current.workspaces];

          return {
            activeWorkspaceId: recoveredWorkspace.id,
            lastSavedAt: new Date().toISOString(),
            selectedAgentId:
              recoveredWorkspace.selectedAgentId ?? recoveredWorkspace.agents[0]?.id,
            streamMode: resolveStreamMode(recoveredWorkspace, current.authVault),
            viewMode: recoveredWorkspace.settings.viewMode,
            workspaces,
          };
        });

        return {
          checksum: recovery.plan.checksum,
          reason: recovery.plan.reason,
          status: "applied",
          workspaceId: recoveredWorkspace.id,
        };
      },

      spawnAgent: (templateId, capabilityType = "chat") => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const baseTemplate =
          agentTemplates.find((candidate) => candidate.id === templateId) ??
          agentTemplates[workspace.agents.length % agentTemplates.length];
        const template = applyAgentTemplateProfile(
          baseTemplate,
          workspace.settings.agentTemplateProfiles?.[baseTemplate.id],
        );
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

      branchAgent: async (sourceAgentId, config) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const sourceAgent = workspace.agents.find((agent) => agent.id === sourceAgentId);

        if (!sourceAgent) {
          set({ branchingStatus: "error" });
          return null;
        }

        const sourceWorkspaceId = workspace.id;
        const sourceSnapshot = clone(sourceAgent);
        const sourceGraphNode = workspace.graph.nodes.find(
          (node) => node.agentId === sourceAgentId,
        );
        const normalizedConfig: IMemoryCompressionConfig = {
          ...config,
          retentionRatio: Math.min(100, Math.max(5, config.retentionRatio)),
          compressorModelId: config.compressorModelId || sourceAgent.model,
        };
        const id = createBranchAgentId();
        const timestamp = new Date().toISOString();

        set({
          branchingStatus:
            normalizedConfig.mode === "summary" ? "compressing" : "creating",
        });

        try {
          const buildBranchedAgent = ({
            branchMetadata,
            contextNotes,
            memory,
            messages,
            zIndex,
          }: {
            branchMetadata: IAgentBranchMetadata;
            contextNotes: NexusAgent["contextNotes"];
            memory: NexusAgent["memory"];
            messages: NexusAgent["messages"];
            zIndex: number;
          }): NexusAgent =>
            normalizeAgentModelCatalog({
              ...sourceSnapshot,
              id,
              callsign: createForkCallsign(sourceSnapshot.callsign),
              identity: `${sourceSnapshot.identity} Fork`,
              status: "idle",
              memory,
              contextNotes,
              messages,
              tools: sourceSnapshot.tools.map((tool, index) => ({
                ...tool,
                id: `${id}-tool-${index}`,
                lastRunAt: undefined,
                result: undefined,
                error: undefined,
              })),
              layout: {
                ...sourceSnapshot.layout,
                x: sourceSnapshot.layout.x + 36,
                y: sourceSnapshot.layout.y + 36,
                zIndex,
              },
              previousLayout: undefined,
              minimized: false,
              maximized: false,
              createdAt: timestamp,
              updatedAt: timestamp,
              branchMetadata,
            });

          let branchMetadata = createBranchMetadata({
            config: normalizedConfig,
            sourceAgent,
            timestamp,
          });
          let branchMessages: NexusAgent["messages"] = sourceSnapshot.messages.map(
            (message, index) => ({
              ...message,
              id: `${id}-message-${index}`,
              streaming: false,
            }),
          );
          let branchContextNotes: NexusAgent["contextNotes"] =
            sourceSnapshot.contextNotes.map((note, index) => ({
              ...note,
              id: `${id}-context-${index}`,
            }));
          let branchMemory: NexusAgent["memory"] = sourceSnapshot.memory.map(
            (block, index) => ({
              ...block,
              id: `${id}-memory-${index}`,
              updatedAt: timestamp,
            }),
          );

          if (normalizedConfig.mode === "summary") {
            const compressionResult = await LlmMemoryCompressor.compress(
              {
                agentId: sourceSnapshot.id,
                identity: sourceSnapshot.identity,
                mission: sourceSnapshot.mission,
                contextNotes: sourceSnapshot.contextNotes,
                memory: sourceSnapshot.memory,
                messages: sourceSnapshot.messages
                  .filter((message) => !message.streaming)
                  .map((message) => ({
                    role: message.role,
                    content: message.content,
                    createdAt: message.createdAt,
                  })),
              },
              normalizedConfig,
            );

            set({ branchingStatus: "creating" });

            branchMetadata = {
              ...branchMetadata,
              retainedRatio: compressionResult.retainedRatio,
              compressionSummary: compressionResult.compressionSummary,
            };
            branchMessages = [
              {
                id: `${id}-summary-system`,
                role: "system",
                content: `This agent is a summary branch of ${sourceSnapshot.callsign}. Retained ~${compressionResult.retainedRatio}% of high-value memory.`,
                createdAt: timestamp,
              },
            ];
            branchContextNotes = compressionResult.contextNotes.map((note, index) => ({
              ...note,
              id: `${id}-compressed-context-${index}`,
            }));
            branchMemory = [
              {
                id: `${id}-compressed-memory`,
                label: "Compressed Branch Memory",
                content: compressionResult.compressionSummary,
                intensity: compressionResult.retainedRatio,
                updatedAt: timestamp,
              },
            ];
          }

          const latestState = get();
          const targetWorkspace =
            latestState.workspaces.find(
              (candidate) => candidate.id === sourceWorkspaceId,
            ) ?? workspace;
          const nextZIndex = latestState.nextZIndex + 1;
          const branchedAgent = buildBranchedAgent({
            branchMetadata,
            contextNotes: branchContextNotes,
            memory: branchMemory,
            messages: branchMessages,
            zIndex: nextZIndex,
          });
          const latestSourceGraphNode =
            targetWorkspace.graph.nodes.find((node) => node.agentId === sourceAgentId) ??
            sourceGraphNode;
          const fallbackPosition = getDefaultGraphPosition(targetWorkspace.agents.length);
          const branchGraphNode = {
            agentId: id,
            x: (latestSourceGraphNode?.x ?? fallbackPosition.x) + 350,
            y: (latestSourceGraphNode?.y ?? fallbackPosition.y) + 150,
            nodeType: latestSourceGraphNode?.nodeType,
          };
          const branchGraphEdge: WorkspaceGraphEdge = {
            id: makeId("edge"),
            sourceAgentId,
            targetAgentId: id,
            animated: true,
            edgeKind: "branch",
            branchMode: normalizedConfig.mode,
            label:
              normalizedConfig.mode === "summary"
                ? "COMPRESSED BRANCH"
                : "FULL BRANCH",
            style: {
              stroke: "var(--color-primary)",
              strokeDasharray: "5,5",
              opacity: 0.6,
            },
          };

          set((current) => ({
            activeWorkspaceId: sourceWorkspaceId,
            workspaces: current.workspaces.map((candidate) =>
              candidate.id === sourceWorkspaceId
                ? syncPanels({
                    ...candidate,
                    agents: [...candidate.agents, branchedAgent],
                    graph: {
                      nodes: [...candidate.graph.nodes, branchGraphNode],
                      edges: [...candidate.graph.edges, branchGraphEdge],
                    },
                    activeAgentId: id,
                    selectedAgentId: id,
                    updatedAt: new Date().toISOString(),
                  })
                : candidate,
            ),
            selectedAgentId: id,
            nextZIndex,
            branchingStatus: "done",
          }));

          return id;
        } catch {
          set({ branchingStatus: "error" });
          return null;
        }
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
            candidate.id === workspace.id
              ? syncPanels(restoredWorkspace, { resetInterrupted: true })
              : candidate,
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

      updateAgentProfile: (agentId, profile) => {
        const callsign = profile.callsign?.trim();
        const title = profile.title?.trim();

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => {
              const profileLocked =
                typeof profile.profileLocked === "boolean"
                  ? profile.profileLocked
                  : agent.profileLocked;

              if (agent.profileLocked && profile.profileLocked !== false) {
                return {
                  ...agent,
                  profileLocked,
                  updatedAt: new Date().toISOString(),
                };
              }

              return {
                ...agent,
                callsign: callsign || agent.callsign,
                title: title || agent.title,
                identity:
                  typeof profile.identity === "string" ? profile.identity : agent.identity,
                mission:
                  typeof profile.mission === "string" ? profile.mission : agent.mission,
                executionPrompt:
                  typeof profile.executionPrompt === "string"
                    ? profile.executionPrompt
                    : agent.executionPrompt,
                profileLocked,
                updatedAt: new Date().toISOString(),
              };
            }),
          ),
        }));
      },

      updateAgentCallsign: (agentId, callsign) => {
        const nextCallsign = callsign.trim();

        if (!nextCallsign) {
          return;
        }

        get().updateAgentProfile(agentId, { callsign: nextCallsign });
      },

      setAgentProfileLocked: (agentId, locked) => {
        get().updateAgentProfile(agentId, { profileLocked: locked });
      },

      updateAgentMission: (agentId, mission) => {
        get().updateAgentProfile(agentId, { mission });
      },

      updateAgentModel: (agentId, model) => {
        const nextModel = model.trim();

        if (!nextModel) {
          return;
        }

        const nextProvider = getModelOption(nextModel)?.provider;

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              model: nextModel,
              provider: nextProvider ?? agent.provider,
              modelSettings: normalizeAgentModelSettings(nextModel, agent.modelSettings),
              updatedAt: new Date().toISOString(),
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

      updateAgentModelSettings: (agentId, settings) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              modelSettings: normalizeAgentModelSettings(agent.model, {
                ...agent.modelSettings,
                ...settings,
              }),
              updatedAt: new Date().toISOString(),
            })),
          ),
        }));
      },

      updateAgentTemplateProfile: (templateId, profile) => {
        const template = agentTemplates.find((candidate) => candidate.id === templateId);

        if (!template) {
          return;
        }

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) => {
            const currentProfiles = workspace.settings.agentTemplateProfiles ?? {};
            const currentProfile = resolveAgentTemplateProfile(
              template,
              currentProfiles[templateId],
            );
            const nextLocked =
              typeof profile.profileLocked === "boolean"
                ? profile.profileLocked
                : currentProfile.profileLocked;

            if (currentProfile.profileLocked && profile.profileLocked !== false) {
              return {
                ...workspace,
                settings: {
                  ...workspace.settings,
                  agentTemplateProfiles: {
                    ...currentProfiles,
                    [templateId]: {
                      ...currentProfile,
                      profileLocked: nextLocked,
                    },
                  },
                },
                updatedAt: new Date().toISOString(),
              };
            }

            return {
              ...workspace,
              settings: {
                ...workspace.settings,
                agentTemplateProfiles: {
                  ...currentProfiles,
                  [templateId]: resolveAgentTemplateProfile(template, {
                    ...currentProfile,
                    ...profile,
                    profileLocked: nextLocked,
                  }),
                },
              },
              updatedAt: new Date().toISOString(),
            };
          }),
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
            streamMode:
              globalApiKey ||
              Object.values(state.authVault.providerCredentials ?? {}).some((entry) =>
                entry.apiKey?.trim(),
              )
                ? "live"
                : "mock",
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

      setProviderApiKey: (providerId, key) => {
        const sanitizedKey = key.replace(/[^\x20-\x7E]/g, "").trim();
        const provider = getProviderOption(providerId);

        set((state) => {
          const current = state.authVault.providerCredentials?.[providerId];

          return {
            authVault: {
              ...state.authVault,
              providerCredentials: {
                ...(state.authVault.providerCredentials ?? {}),
                [providerId]: {
                  apiKey: sanitizedKey || null,
                  baseUrl: current?.baseUrl ?? provider?.defaultBaseUrl ?? null,
                  isLocked: Boolean(sanitizedKey),
                  liveVerifiedAt: sanitizedKey ? current?.liveVerifiedAt ?? null : null,
                  verificationError: null,
                  verificationStatus: sanitizedKey
                    ? current?.verificationStatus ?? "untested"
                    : "untested",
                },
              },
            },
            streamMode: sanitizedKey || state.authVault.globalApiKey ? "live" : "mock",
          };
        });
      },

      setProviderBaseUrl: (providerId, baseUrl) => {
        const sanitizedBaseUrl = baseUrl.replace(/[^\x20-\x7E]/g, "").trim();
        const provider = getProviderOption(providerId);

        set((state) => {
          const current = state.authVault.providerCredentials?.[providerId];

          return {
            authVault: {
              ...state.authVault,
              providerCredentials: {
                ...(state.authVault.providerCredentials ?? {}),
                [providerId]: {
                  apiKey: current?.apiKey ?? null,
                  baseUrl: sanitizedBaseUrl || provider?.defaultBaseUrl || null,
                  isLocked: current?.isLocked ?? Boolean(current?.apiKey),
                  liveVerifiedAt: null,
                  verificationError: null,
                  verificationStatus: "untested",
                },
              },
            },
          };
        });
      },

      setProviderVerificationStatus: (providerId, status, error) => {
        set((state) => {
          const provider = getProviderOption(providerId);
          const current = state.authVault.providerCredentials?.[providerId];

          return {
            authVault: {
              ...state.authVault,
              providerCredentials: {
                ...(state.authVault.providerCredentials ?? {}),
                [providerId]: {
                  apiKey: current?.apiKey ?? null,
                  baseUrl: current?.baseUrl ?? provider?.defaultBaseUrl ?? null,
                  isLocked: current?.isLocked ?? Boolean(current?.apiKey),
                  liveVerifiedAt: status === "verified" ? new Date().toISOString() : null,
                  verificationError: status === "failed" ? error ?? "Verification failed." : null,
                  verificationStatus: status,
                },
              },
            },
          };
        });
      },

      lockProviderCredential: (providerId) => {
        set((state) => {
          const provider = getProviderOption(providerId);
          const current = state.authVault.providerCredentials?.[providerId];

          return {
            authVault: {
              ...state.authVault,
              providerCredentials: {
                ...(state.authVault.providerCredentials ?? {}),
                [providerId]: {
                  apiKey: current?.apiKey ?? null,
                  baseUrl: current?.baseUrl ?? provider?.defaultBaseUrl ?? null,
                  isLocked: true,
                  liveVerifiedAt: current?.liveVerifiedAt ?? null,
                  verificationError: current?.verificationError ?? null,
                  verificationStatus: current?.verificationStatus ?? "untested",
                },
              },
            },
          };
        });
      },

      unlockProviderCredential: (providerId) => {
        set((state) => {
          const provider = getProviderOption(providerId);
          const current = state.authVault.providerCredentials?.[providerId];

          return {
            authVault: {
              ...state.authVault,
              providerCredentials: {
                ...(state.authVault.providerCredentials ?? {}),
                [providerId]: {
                  apiKey: current?.apiKey ?? null,
                  baseUrl: current?.baseUrl ?? provider?.defaultBaseUrl ?? null,
                  isLocked: false,
                  liveVerifiedAt: current?.liveVerifiedAt ?? null,
                  verificationError: current?.verificationError ?? null,
                  verificationStatus: current?.verificationStatus ?? "untested",
                },
              },
            },
          };
        });
      },

      deleteProviderCredential: (providerId) => {
        set((state) => {
          const nextCredentials = { ...(state.authVault.providerCredentials ?? {}) };
          delete nextCredentials[providerId];

          return {
            authVault: {
              ...state.authVault,
              providerCredentials: nextCredentials,
            },
            streamMode:
              state.authVault.globalApiKey || Object.values(nextCredentials).some((entry) => entry.apiKey)
                ? "live"
                : "mock",
          };
        });
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
          streamMode: Object.values(state.authVault.providerCredentials ?? {}).some((entry) =>
            entry.apiKey?.trim(),
          )
            ? "live"
            : "mock",
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
        const contentText = content.trim();

        if (!workspace || !contentText || !state.authVault.user?.id) {
          return;
        }

        const sourceMessageId = agent?.messages.at(-1)?.id ?? makeId("artifact-source");
        const userId = state.authVault.user.id;

        void supabaseStateSyncManager
          .saveArtifact(workspace.id, sourceMessageId, contentText, type, {
            sourceAgentId: agentId,
            title: agent?.callsign ? `${agent.callsign} ${type}` : undefined,
            userId,
          })
          .then((result) => {
            if (!result.ok) {
              return undefined;
            }

            return supabaseStateSyncManager.fetchArtifacts(workspace.id, userId);
          })
          .then((response) => {
            if (!response) {
              return;
            }

            set({
              artifactVault: createArtifactVaultCache(response.artifacts, {
                hasMore: response.hasMore,
                nextCursor: response.nextCursor,
              }),
            });
          })
          .catch(() => undefined);
      },

      fetchArtifactsFromCloud: async () => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const workspaceId = workspace?.id ?? ACTIVE_WORKSPACE_ID;
        const userId = state.authVault.user?.id;

        if (!userId) {
          return [];
        }

        const response = await supabaseStateSyncManager.fetchArtifacts(workspaceId, userId);
        const artifacts = response.artifacts;

        set({
          artifactVault: createArtifactVaultCache(artifacts, {
            hasMore: response.hasMore,
            nextCursor: response.nextCursor,
          }),
        });

        return artifacts;
      },

      fetchHistoricalMessages: async (agentId) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const agent = workspace?.agents.find((candidate) => candidate.id === agentId);

        if (!workspace || !agent) {
          return;
        }

        const cacheKey = getHistoricalMessageCacheKey(workspace.id, agentId);
        const shouldRun = await waitForHistoryFetchDebounce(cacheKey);

        if (!shouldRun) {
          return;
        }

        const beforeFetch = get();
        const existing = beforeFetch.historicalMessages[cacheKey];

        if (existing?.loading) {
          return;
        }

        set({
          historicalMessages: {
            ...beforeFetch.historicalMessages,
            [cacheKey]: {
              hasMore: existing?.hasMore ?? true,
              items: existing?.items ?? [],
              loading: true,
              nextCursor: existing?.nextCursor,
            },
          },
        });

        try {
          const latest = get();
          const latestWorkspace = getActiveWorkspace(latest);
          const latestAgent = latestWorkspace?.agents.find((candidate) => candidate.id === agentId);
          const current = latest.historicalMessages[cacheKey];
          const page = await historicalDataFetcher.fetchHistoricalMessages({
            agentId,
            cursor: current?.nextCursor,
            limit: 50,
            userId: latest.authVault.user?.id ?? "local-owner",
            workspaceId: workspace.id,
          });
          const activeIds = new Set(
            latestAgent?.messages.map((message) => message.id) ?? [],
          );
          const byId = new Map<string, HistoricalMessageRecord>();

          for (const item of [...(current?.items ?? []), ...page.items]) {
            if (!activeIds.has(item.message.id)) {
              byId.set(item.message.id, item);
            }
          }

          const items = [...byId.values()].sort((left, right) =>
            right.message.createdAt.localeCompare(left.message.createdAt),
          );

          set((currentState) => ({
            historicalMessages: {
              ...currentState.historicalMessages,
              [cacheKey]: {
                fetchedAt: new Date().toISOString(),
                hasMore: page.hasMore,
                items,
                loading: false,
                nextCursor: page.nextCursor,
              },
            },
          }));
        } catch (error) {
          const message =
            error instanceof NexusApiError || error instanceof Error
              ? error.message
              : "History could not be loaded.";

          set((currentState) => ({
            historicalMessages: {
              ...currentState.historicalMessages,
              [cacheKey]: {
                ...(currentState.historicalMessages[cacheKey] ?? {
                  hasMore: true,
                  items: [],
                }),
                error: message,
                loading: false,
              },
            },
          }));
        }
      },

      setPromptsCache: (prompts) => {
        set((state) => ({
          promptsCache: mergeRemotePromptsWithLocalCache(
            prompts,
            state.promptsCache,
          ),
        }));
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
        void supabaseStateSyncManager.upsertPrompt(nextPrompt).catch((error) => {
          console.error("[Prompt Vault Sync Error]:", error);
        });
      },

      deletePrompt: (id) => {
        const prompt = get().promptsCache.find((candidate) => candidate.id === id);
        set((state) => ({
          promptsCache: state.promptsCache.filter((prompt) => prompt.id !== id),
        }));
        void supabaseStateSyncManager.deletePrompt(id, prompt?.workspace_id).catch((error) => {
          console.error("[Prompt Vault Sync Error]:", error);
        });
      },

      setNotebooksCache: (notebooks) => {
        set((state) => {
          const nextNotebooks = mergeRemoteNotebooksWithLocalCache(
            notebooks,
            state.notebooksCache,
          );
          const notebookIds = new Set(nextNotebooks.map((notebook) => notebook.id));
          const notebookWindowLayers = Object.fromEntries(
            Object.entries(state.notebookWindowLayers).filter(([id]) =>
              notebookIds.has(id),
            ),
          );

          return {
            notebooksCache: nextNotebooks,
            openNotebookIds: state.openNotebookIds.filter((id) =>
              notebookIds.has(id),
            ),
            notebookWindowLayers,
          };
        });
      },

      toggleNotebookOpen: (id) => {
        set((state) => {
          if (state.openNotebookIds.includes(id)) {
            return {
              openNotebookIds: state.openNotebookIds.filter(
                (candidate) => candidate !== id,
              ),
              notebookWindowLayers: Object.fromEntries(
                Object.entries(state.notebookWindowLayers).filter(
                  ([notebookId]) => notebookId !== id,
                ),
              ),
            };
          }

          const nextZIndex = state.nextZIndex + 1;

          return {
            openNotebookIds: [...state.openNotebookIds, id],
            notebookWindowLayers: {
              ...state.notebookWindowLayers,
              [id]: nextZIndex,
            },
            nextZIndex,
          };
        });
      },

      focusNotebookWindow: (id) => {
        set((state) => {
          const nextZIndex = state.nextZIndex + 1;

          return {
            notebookWindowLayers: {
              ...state.notebookWindowLayers,
              [id]: nextZIndex,
            },
            nextZIndex,
          };
        });
      },

      createNotebook: () => {
        const now = new Date().toISOString();
        const notebook: NotebookRecord = {
          id: makeId("notebook"),
          workspace_id: null,
          title: "Untitled Datapad",
          content: "",
          created_at: now,
          updated_at: now,
        };

        set((state) => {
          const nextZIndex = state.nextZIndex + 1;

          return {
            notebooksCache: sortNotebooks([notebook, ...state.notebooksCache]),
            openNotebookIds: Array.from(
              new Set([...state.openNotebookIds, notebook.id]),
            ),
            notebookWindowLayers: {
              ...state.notebookWindowLayers,
              [notebook.id]: nextZIndex,
            },
            nextZIndex,
          };
        });
        void supabaseStateSyncManager.upsertNotebook(notebook, undefined).catch((error) => {
          console.error("[Datapad Sync Error]:", error);
        });

        return notebook.id;
      },

      saveNotebookDraft: (id, title, content) => {
        const state = get();
        const notebook = state.notebooksCache.find((candidate) => candidate.id === id);

        if (!notebook) {
          return;
        }

        const updatedAt = new Date().toISOString();
        const draft: NotebookDraftRecord = {
          baseUpdatedAt: notebook.updated_at ?? notebook.created_at ?? null,
          content,
          notebookId: id,
          title,
          updatedAt,
          workspaceId: notebook.workspace_id ?? null,
        };

        set((state) => ({
          notebookDrafts: {
            ...state.notebookDrafts,
            [id]: draft,
          },
        }));
      },

      clearNotebookDraft: (id) => {
        set((state) => {
          if (!(id in state.notebookDrafts)) {
            return state;
          }

          return {
            notebookDrafts: omitNotebookDraft(state.notebookDrafts, id),
          };
        });
      },

      updateNotebook: (id, title, content) => {
        const state = get();
        const notebook = state.notebooksCache.find((candidate) => candidate.id === id);

        if (!notebook) {
          return;
        }

        const updatedNotebook: NotebookRecord = {
          ...notebook,
          workspace_id: notebook.workspace_id ?? null,
          title: title.trim() || "Untitled Datapad",
          content,
          updated_at: new Date().toISOString(),
        };

        set((current) => ({
          notebookDrafts: omitNotebookDraft(current.notebookDrafts, id),
          notebooksCache: sortNotebooks([
            updatedNotebook,
            ...current.notebooksCache.filter((candidate) => candidate.id !== id),
          ]),
        }));
        void supabaseStateSyncManager
          .upsertNotebook(updatedNotebook, updatedNotebook.workspace_id ?? undefined)
          .catch((error) => {
            console.error("[Datapad Sync Error]:", error);
          });
      },

      deleteNotebook: (id) => {
        const state = get();
        const notebook = state.notebooksCache.find((candidate) => candidate.id === id);
        const workspaceId = notebook
          ? notebook.workspace_id ?? null
          : getActiveWorkspace(state)?.id ?? null;
        const draft = state.notebookDrafts[id];
        const deletedAt = new Date().toISOString();
        const tombstone = notebook
          ? {
              ...notebook,
              content: draft?.content ?? notebook.content,
              deleted_at: deletedAt,
              deleted_by: state.authVault.user?.id ?? null,
              title: draft?.title?.trim() || notebook.title,
              updated_at: deletedAt,
              workspace_id: workspaceId,
            }
          : null;

        set((state) => ({
          deletedNotebooksCache: tombstone
            ? sortNotebooks([
                tombstone,
                ...state.deletedNotebooksCache.filter(
                  (candidate) => candidate.id !== id,
                ),
              ])
            : state.deletedNotebooksCache,
          notebookDrafts: omitNotebookDraft(state.notebookDrafts, id),
          notebooksCache: state.notebooksCache.filter(
            (notebook) => notebook.id !== id,
          ),
          openNotebookIds: state.openNotebookIds.filter(
            (candidate) => candidate !== id,
          ),
          notebookWindowLayers: Object.fromEntries(
            Object.entries(state.notebookWindowLayers).filter(
              ([notebookId]) => notebookId !== id,
            ),
          ),
        }));
        void supabaseStateSyncManager.deleteNotebook(
          id,
          workspaceId ?? undefined,
          tombstone,
        ).catch((error) => {
          console.error("[Datapad Sync Error]:", error);
        });
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

      updateBranchingSettings: (settings) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) => ({
            ...workspace,
            settings: {
              ...workspace.settings,
              branchingSettings: normalizeBranchingSettings({
                ...workspace.settings.branchingSettings,
                ...settings,
              }),
            },
          })),
        }));
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

      appendReasoningToMessage: (agentId, messageId, token) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withAgent(workspace, agentId, (agent) => ({
              ...agent,
              messages: agent.messages.map((message) =>
                message.id === messageId
                  ? {
                      ...message,
                      reasoningContent: `${message.reasoningContent ?? ""}${token}`,
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

      addWorkflowRuntimeNode: (type, options) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const runtimeLite = normalizeWorkflowRuntimeLiteState(
          workspace.graph.runtimeLite ?? createEmptyWorkflowRuntimeLiteState(),
          { resetInterrupted: false },
        );
        const id = createWorkflowRuntimeId("wf_node");
        const previousNode = runtimeLite.nodes.at(-1);
        const node = createWorkflowRuntimeNode({
          id,
          position: options?.position
            ? options.position
            : previousNode
            ? {
                x: previousNode.position.x + 360,
                y: previousNode.position.y,
              }
            : { x: 120, y: 96 },
          type,
        });

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withWorkflowRuntimeLite(workspace, (runtimeLite) => ({
              ...runtimeLite,
              lastError: null,
              nodes: [...runtimeLite.nodes, node],
            })),
          ),
          selectedAgentId: state.selectedAgentId,
        }));

        return id;
      },

      updateWorkflowRuntimeNodeData: (nodeId, data) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withWorkflowRuntimeLite(workspace, (runtimeLite) => ({
              ...runtimeLite,
              nodes: runtimeLite.nodes.map((node) =>
                node.id === nodeId
                  ? ({
                      ...node,
                      data: {
                        ...node.data,
                        ...data,
                      },
                    } as WorkflowNodeInstance)
                  : node,
              ),
            })),
          ),
        }));
      },

      updateWorkflowRuntimeNodePosition: (nodeId, position) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withWorkflowRuntimeLite(workspace, (runtimeLite) => ({
              ...runtimeLite,
              nodes: runtimeLite.nodes.map((node) =>
                node.id === nodeId
                  ? {
                      ...node,
                      position,
                    }
                  : node,
              ),
            })),
          ),
        }));
      },

      connectWorkflowRuntimeNodes: (edge) => {
        if (edge.source === edge.target) {
          return;
        }

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withWorkflowRuntimeLite(workspace, (runtimeLite) => {
              const duplicate = runtimeLite.edges.some(
                (candidate) =>
                  candidate.source === edge.source &&
                  candidate.target === edge.target &&
                  candidate.sourceHandle === edge.sourceHandle &&
                  candidate.targetHandle === edge.targetHandle,
              );

              if (duplicate) {
                return runtimeLite;
              }

              return {
                ...runtimeLite,
                edges: [
                  ...runtimeLite.edges,
                  {
                    ...edge,
                    animated: edge.animated ?? true,
                  },
                ],
                lastError: null,
              };
            }),
          ),
        }));
      },

      appendWorkflowRuntimeGroup: (groupRuntimeLite, options) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const result = appendWorkflowRuntimeGroupToRuntime({
          currentRuntimeLite: workspace.graph.runtimeLite,
          groupRuntimeLite,
          options,
        });

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withWorkflowRuntimeLite(workspace, () => result.runtimeLite),
          ),
        }));

        if (result.nodeIds.length) {
          void publishWorkflowGroupRecord({
            groupId: result.groupId,
            runtimeLite: result.runtimeLite,
            userId: get().authVault.user?.id ?? "local-owner",
            workspaceId: workspace.id,
          }).catch((error) => {
            console.warn("[workflow-pro] group record publish failed", error);
          });
        }

        return {
          edgeIds: result.edgeIds,
          groupId: result.groupId,
          nodeIds: result.nodeIds,
        };
      },

      replaceWorkflowRuntimeLite: (nextRuntimeLite) => {
        const normalizedRuntimeLite = normalizeWorkflowRuntimeLiteState(
          nextRuntimeLite,
          { resetInterrupted: false },
        );

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withWorkflowRuntimeLite(workspace, () => ({
              ...normalizedRuntimeLite,
              lastError: null,
            })),
          ),
        }));
      },

      removeWorkflowRuntimeNodes: (nodeIds) => {
        const nodeIdSet = new Set(nodeIds);

        if (!nodeIdSet.size) {
          return;
        }

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withWorkflowRuntimeLite(workspace, (runtimeLite) => ({
              ...runtimeLite,
              edges: runtimeLite.edges.filter(
                (edge) => !nodeIdSet.has(edge.source) && !nodeIdSet.has(edge.target),
              ),
              lastError: null,
              nodes: runtimeLite.nodes.filter((node) => !nodeIdSet.has(node.id)),
            })),
          ),
        }));
      },

      removeWorkflowRuntimeEdges: (edgeIds) => {
        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) =>
            withWorkflowRuntimeLite(workspace, (runtimeLite) => ({
              ...runtimeLite,
              edges: runtimeLite.edges.filter((edge) => !edgeIds.includes(edge.id)),
            })),
          ),
        }));
      },

      pauseWorkflowRuntimeLiteFlow: () => {
        const workspace = getActiveWorkspace(get());
        const controller = workflowRuntimeAbortControllers.get(workspace.id);

        if (!controller) {
          return;
        }

        controller.abort();
      },

      runWorkflowRuntimeLiteFlow: async (options) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const normalizedRuntimeLite = prepareWorkflowRuntimeLiteForLocalPersistence(
          normalizeWorkflowRuntimeLiteState(
            workspace.graph.runtimeLite ?? createEmptyWorkflowRuntimeLiteState(),
          ),
        );
        const inferredRuntimeEdges = inferLinearWorkflowRuntimeLiteEdges({
          edges: normalizedRuntimeLite.edges,
          nodes: normalizedRuntimeLite.nodes,
        });
        const runtimeLite =
          inferredRuntimeEdges === normalizedRuntimeLite.edges
            ? normalizedRuntimeLite
            : {
                ...normalizedRuntimeLite,
                edges: inferredRuntimeEdges,
                lastError: null,
              };
        const selectedRuntimeLite = selectWorkflowRuntimeLiteFromStartNode(
          runtimeLite,
          options?.startNodeId?.trim(),
        );
        const selectedWorkflowGroup = resolveWorkflowRuntimeGroupForRun(selectedRuntimeLite);
        const selectedNodeIds = new Set(
          selectedRuntimeLite.nodes.map((node) => node.id),
        );
        const executionAgent = resolveWorkflowRuntimeExecutionAgent(workspace);
        const runId = createWorkflowRuntimeId("run");

        if (!executionAgent) {
          const failedRun: WorkflowRun = {
            completedAt: new Date().toISOString(),
            error: "Workflow Runtime Lite requires an existing NEXUS agent for LLM execution.",
            ...(selectedWorkflowGroup ? { group: selectedWorkflowGroup } : {}),
            nodeExecutions: [],
            runId,
            startedAt: new Date().toISOString(),
            status: "failed",
            workflowId: workspace.id,
          };

          set((state) => ({
            workspaces: withActiveWorkspace(state, (workspace) =>
              withWorkflowRuntimeLite(workspace, (runtimeLite) => ({
                ...runtimeLite,
                lastError: failedRun.error,
                lastRunId: failedRun.runId,
                runs: upsertWorkflowRun(runtimeLite.runs, failedRun),
              })),
            ),
          }));

          return failedRun;
        }

        const preparedRuntimeLite = {
          ...runtimeLite,
          lastError: null,
          lastRunId: runId,
          nodes: runtimeLite.nodes.map((node) =>
            selectedNodeIds.has(node.id) ? resetWorkflowRuntimeNodeForRun(node) : node,
          ),
        };
        const preparedSelectedRuntimeLite = {
          ...selectedRuntimeLite,
          nodes: selectedRuntimeLite.nodes.map(resetWorkflowRuntimeNodeForRun),
        };

        set((state) => ({
          workspaces: withActiveWorkspace(state, (workspace) => ({
            ...workspace,
            graph: {
              ...workspace.graph,
              runtimeLite: preparedRuntimeLite,
            },
          })),
        }));

        const controller = new AbortController();

        workflowRuntimeAbortControllers.get(workspace.id)?.abort();
        workflowRuntimeAbortControllers.set(workspace.id, controller);

        const patchNode = (nodeId: string, patch: WorkflowRuntimeNodePatch) => {
          set((state) => ({
            workspaces: withActiveWorkspace(state, (workspace) =>
              withWorkflowRuntimeLite(workspace, (runtimeLite) => ({
                ...runtimeLite,
                nodes: runtimeLite.nodes.map((node) =>
                  node.id === nodeId ? patchWorkflowRuntimeNode(node, patch) : node,
                ),
              })),
            ),
          }));
        };
        const updateRun = (run: WorkflowRun) => {
          set((state) => ({
            workspaces: withActiveWorkspace(state, (workspace) =>
              withWorkflowRuntimeLite(workspace, (runtimeLite) => ({
                ...runtimeLite,
                lastError: run.status === "failed" ? run.error ?? null : null,
                lastRunId: run.runId,
                runs: upsertWorkflowRun(runtimeLite.runs, run),
              })),
            ),
          }));
        };
        const run = await runWorkflowRuntimeLite({
          callImage: createWorkflowRuntimeImageCall({
            authVault: get().authVault,
            executionAgent,
            workspace,
          }),
          callLlm: createWorkflowRuntimeLlmCall({
            authVault: get().authVault,
            executionAgent,
            workspace,
          }),
          onNodePatch: patchNode,
          onRunUpdate: updateRun,
          runId,
          runtimeLite: preparedSelectedRuntimeLite,
          signal: controller.signal,
          workflowGroup: selectedWorkflowGroup,
          workflowId: workspace.id,
        }).finally(() => {
          if (workflowRuntimeAbortControllers.get(workspace.id) === controller) {
            workflowRuntimeAbortControllers.delete(workspace.id);
          }
        });
        const generatedArtifacts = collectWorkflowGeneratedArtifactVaultRecords(run).filter(
          (artifact) => artifact.workspaceId === workspace.id,
        );

        if (generatedArtifacts.length) {
          set((state) => ({
            artifactVault: mergeArtifactVaultRecordsIntoCache(
              state.artifactVault,
              generatedArtifacts,
            ),
          }));
        }

        const updateTraceSync = (traceSync: WorkflowRuntimeTraceSyncState) => {
          set((state) => ({
            workspaces: withWorkspaceById(state, workspace.id, (workspace) =>
              withWorkflowRuntimeLite(workspace, (runtimeLite) => ({
                ...runtimeLite,
                runs: markWorkflowRunTraceSync(runtimeLite.runs, run.runId, traceSync),
              })),
            ),
          }));
        };
        const traceAttemptedAt = new Date().toISOString();

        updateTraceSync({
          attemptedAt: traceAttemptedAt,
          status: "syncing",
          traceId: `workflow-runtime:${run.runId}`,
        });
        void publishWorkflowRuntimeTrace({
          run,
          userId: get().authVault.user?.id ?? "local-owner",
          workspaceId: workspace.id,
        })
          .then((response) => {
            updateTraceSync({
              attemptedAt: traceAttemptedAt,
              completedAt: new Date().toISOString(),
              eventId: response.eventId,
              eventType: response.eventType,
              status: "synced",
              traceId: response.traceId,
            });
          })
          .catch((error) => {
            const syncError = createWorkflowRuntimeTraceSyncError(error);

            updateTraceSync({
              attemptedAt: traceAttemptedAt,
              completedAt: new Date().toISOString(),
              error: syncError.error,
              retryable: syncError.retryable,
              status: "failed",
              traceId: `workflow-runtime:${run.runId}`,
            });
          });

        queueWorkspaceCloudSync(getActiveWorkspace(get()));

        return run;
      },

      retryWorkflowRuntimeTraceSync: async (runId) => {
        const state = get();
        const workspace = getActiveWorkspace(state);
        const runtimeLite = normalizeWorkflowRuntimeLiteState(
          workspace.graph.runtimeLite ?? createEmptyWorkflowRuntimeLiteState(),
        );
        const run = runtimeLite.runs.find((candidate) => candidate.runId === runId);

        if (!run || run.status === "queued" || run.status === "running") {
          return run;
        }

        const traceAttemptedAt = new Date().toISOString();
        const syncStarted: WorkflowRuntimeTraceSyncState = {
          attemptedAt: traceAttemptedAt,
          status: "syncing",
          traceId: run.traceSync?.traceId ?? `workflow-runtime:${run.runId}`,
        };
        const updateTraceSync = (traceSync: WorkflowRuntimeTraceSyncState) => {
          set((state) => ({
            workspaces: withWorkspaceById(state, workspace.id, (workspace) =>
              withWorkflowRuntimeLite(workspace, (runtimeLite) => ({
                ...runtimeLite,
                runs: markWorkflowRunTraceSync(runtimeLite.runs, run.runId, traceSync),
              })),
            ),
          }));
        };

        updateTraceSync(syncStarted);

        try {
          const response = await publishWorkflowRuntimeTrace({
            run,
            userId: get().authVault.user?.id ?? "local-owner",
            workspaceId: workspace.id,
          });
          const traceSync: WorkflowRuntimeTraceSyncState = {
            attemptedAt: traceAttemptedAt,
            completedAt: new Date().toISOString(),
            eventId: response.eventId,
            eventType: response.eventType,
            status: "synced",
            traceId: response.traceId,
          };

          updateTraceSync(traceSync);
          queueWorkspaceCloudSync(getActiveWorkspace(get()));

          return {
            ...run,
            traceSync,
          };
        } catch (error) {
          const syncError = createWorkflowRuntimeTraceSyncError(error);
          const traceSync: WorkflowRuntimeTraceSyncState = {
            attemptedAt: traceAttemptedAt,
            completedAt: new Date().toISOString(),
            error: syncError.error,
            retryable: syncError.retryable,
            status: "failed",
            traceId: run.traceSync?.traceId ?? `workflow-runtime:${run.runId}`,
          };

          updateTraceSync(traceSync);
          queueWorkspaceCloudSync(getActiveWorkspace(get()));

          return {
            ...run,
            traceSync,
          };
        }
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

        if (!agent || !tool?.executorId) {
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
          const request: ToolRunRequest = {
            agentId,
            input: input ? sanitizeToolInput(input) : undefined,
            workspaceId: workspace.id,
          };
          const response = await nexusApiClient.post<ToolRunResponse, ToolRunRequest>(
            `/api/v1/tools/${encodeURIComponent(tool.executorId)}/run`,
            request,
            {
              headers: safeApiKey
                ? {
                    [NEXUS_RUNTIME_AUTHORIZATION_HEADER]: `Bearer ${safeApiKey}`,
                  }
                : undefined,
              idempotencyKey: makeId("tool_mutation"),
              userId: state.authVault.user?.id ?? "local-owner",
              workspaceId: workspace.id,
            },
          );
          const finalResponse =
            response.confirmationRequired && response.toolRun.status === "awaiting_confirmation"
              ? await resolveToolConfirmation({
                  apiKey: safeApiKey,
                  toolName: tool.name,
                  toolRunId: response.toolRun.id,
                  userId: state.authVault.user?.id ?? "local-owner",
                  workspaceId: workspace.id,
                })
              : response;
          const resultContent = getToolRunContent(finalResponse);
          const projectedStatus = mapToolRunStatus(finalResponse.toolRun.status);
          const toolMessage: AgentMessage | undefined =
            resultContent && finalResponse.toolRun.status === "succeeded"
              ? {
                  content: resultContent,
                  createdAt: new Date().toISOString(),
                  id: makeId("message"),
                  role: "tool",
                }
              : undefined;

          set((current) => ({
            workspaces: withActiveWorkspace(current, (activeWorkspace) =>
              withAgent(activeWorkspace, agentId, (currentAgent) => ({
                ...currentAgent,
                messages: toolMessage
                  ? [...currentAgent.messages, toolMessage]
                  : currentAgent.messages,
                telemetry: {
                  ...currentAgent.telemetry,
                  errors:
                    projectedStatus === "error"
                      ? currentAgent.telemetry.errors + 1
                      : currentAgent.telemetry.errors,
                  toolRuns:
                    finalResponse.toolRun.status === "succeeded"
                      ? currentAgent.telemetry.toolRuns + 1
                      : currentAgent.telemetry.toolRuns,
                },
                tools: currentAgent.tools.map((currentTool) =>
                  currentTool.id === toolId
                    ? {
                        ...currentTool,
                        error: finalResponse.toolRun.errorMessage ?? undefined,
                        result: resultContent,
                        status: projectedStatus,
                      }
                    : currentTool,
                ),
              })),
            ),
          }));

          if (toolMessage) {
            queueMessageCloudSync({
              agentId,
              message: toolMessage,
              workspaceId: workspace.id,
            });
          }
        } catch (error) {
          const detail =
            error instanceof NexusApiError || error instanceof Error
              ? error.message
              : "Tool executor failed.";
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
          historicalMessages: {},
          promptsCache: [],
          branchingStatus: "idle",
          notebookWindowLayers: {},
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
      version: 15,
      onRehydrateStorage: () => (state) => {
        state?.materializeDefaultWorkspace();
        logHydratedMemoryState(state);
      },
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") {
          const workspaces = prepareWorkspacesForLocalPersistence([initialWorkspace()]);

          return {
            activeWorkspaceId: ACTIVE_WORKSPACE_ID,
            workspaces,
            selectedAgentId: "agent-nexus-1",
            nextZIndex: 10,
            streamMode: "mock",
            viewMode: "panels",
            isVaultManagerOpen: false,
            authVault: DEFAULT_AUTH_VAULT,
            artifactVault: EMPTY_ARTIFACT_VAULT_CACHE,
            historicalMessages: {},
            promptsCache: [],
            notebooksCache: [],
            deletedNotebooksCache: [],
            notebookDrafts: {},
            openNotebookIds: [],
            notebookWindowLayers: {},
            transactionHistory: [],
            branchingStatus: "idle",
          };
        }

        const value = persisted as Partial<NexusStore> & { agents?: NexusAgent[] };

        if (Array.isArray(value.workspaces)) {
          const workspaces = prepareWorkspacesForLocalPersistence(value.workspaces);
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
            artifactVault: normalizeArtifactVaultCache(value.artifactVault),
            historicalMessages: {},
            promptsCache: [],
            notebooksCache: sortNotebooks(value.notebooksCache ?? []),
            deletedNotebooksCache: sortNotebooks(value.deletedNotebooksCache ?? []),
            notebookDrafts: normalizeNotebookDrafts(
              Object.values(value.notebookDrafts ?? {}),
            ),
            openNotebookIds: value.openNotebookIds ?? [],
            notebookWindowLayers: {},
            transactionHistory: (value.transactionHistory ?? []).slice(0, 100),
            branchingStatus: "idle",
          };
        }

        const workspaces = prepareWorkspacesForLocalPersistence([initialWorkspace()]);

        return {
          activeWorkspaceId: ACTIVE_WORKSPACE_ID,
          workspaces,
          selectedAgentId: "agent-nexus-1",
          nextZIndex: 10,
          streamMode: "mock",
          viewMode: "panels",
          isVaultManagerOpen: false,
          authVault: DEFAULT_AUTH_VAULT,
          artifactVault: EMPTY_ARTIFACT_VAULT_CACHE,
          historicalMessages: {},
          promptsCache: [],
          notebooksCache: [],
          deletedNotebooksCache: [],
          notebookDrafts: {},
          openNotebookIds: [],
          notebookWindowLayers: {},
          transactionHistory: [],
          branchingStatus: "idle",
        };
      },
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
        artifactVault: state.artifactVault,
        authVault: prepareAuthVaultForLocalPersistence(state.authVault),
        deletedNotebooksCache: state.deletedNotebooksCache,
        notebookDrafts: state.notebookDrafts,
        notebooksCache: state.notebooksCache,
        openNotebookIds: state.openNotebookIds,
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

async function resolveToolConfirmation({
  apiKey,
  toolName,
  toolRunId,
  userId,
  workspaceId,
}: {
  apiKey?: string;
  toolName: string;
  toolRunId: string;
  userId: string;
  workspaceId: string;
}): Promise<ToolRunResponse> {
  const shouldConfirm =
    typeof window !== "undefined" &&
    window.confirm(`Confirm high-risk tool execution: ${toolName}?`);
  const headers = apiKey
    ? {
        [NEXUS_RUNTIME_AUTHORIZATION_HEADER]: `Bearer ${apiKey}`,
      }
    : undefined;

  if (!shouldConfirm) {
    const cancelled = await nexusApiClient.post<
      ToolRunCancelResponse,
      { workspaceId: string }
    >(
      `/api/v1/tool-runs/${encodeURIComponent(toolRunId)}/cancel`,
      {
        workspaceId,
      },
      {
        idempotencyKey: makeId("tool_cancel"),
        userId,
        workspaceId,
      },
    );

    return {
      confirmationRequired: false,
      materializationStatus: "not_requested",
      toolRun: cancelled.toolRun,
    };
  }

  return nexusApiClient.post<ToolRunConfirmResponse, { workspaceId: string }>(
    `/api/v1/tool-runs/${encodeURIComponent(toolRunId)}/confirm`,
    {
      workspaceId,
    },
    {
      headers,
      idempotencyKey: makeId("tool_confirm"),
      userId,
      workspaceId,
    },
  );
}

function sanitizeToolInput(input: ToolExecutorInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  if (typeof input.prompt === "string" && input.prompt.trim()) {
    sanitized.prompt = input.prompt;
  }

  if (typeof input.path === "string" && input.path.trim()) {
    sanitized.path = input.path;
  }

  if (typeof input.url === "string" && input.url.trim()) {
    sanitized.url = input.url;
  }

  return sanitized;
}

function getToolRunContent(response: ToolRunResponse) {
  const output = response.toolRun.outputRedacted;
  const content = output && typeof output.content === "string" ? output.content : "";
  const materializationNote =
    response.materializationStatus === "TOOL_MATERIALIZATION_NOT_AVAILABLE"
      ? "\n\nTOOL_MATERIALIZATION_NOT_AVAILABLE"
      : "";

  if (content) {
    return `${content}${materializationNote}`;
  }

  if (response.toolRun.status === "awaiting_confirmation") {
    return "Tool run is awaiting high-risk confirmation.";
  }

  if (response.toolRun.status === "cancelled") {
    return "Tool run was cancelled.";
  }

  return response.toolRun.errorMessage ?? undefined;
}

function mapToolRunStatus(status: ToolRunResponse["toolRun"]["status"]): ToolStatus {
  if (status === "succeeded" || status === "materialized") {
    return "done";
  }

  if (status === "running") {
    return "running";
  }

  if (status === "awaiting_confirmation" || status === "created") {
    return "queued";
  }

  if (status === "cancelled") {
    return "available";
  }

  return "error";
}

supabaseStateSyncManager.setTransactionLogger((entry) => {
  useNexusStore.getState().recordTransaction(entry);
});
