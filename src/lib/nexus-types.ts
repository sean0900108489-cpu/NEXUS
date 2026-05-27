import type { User } from "@supabase/supabase-js";

export type AgentMessageRole = "system" | "user" | "assistant" | "tool";

export type AgentStatus = "idle" | "thinking" | "streaming" | "error";

export type AgentCapabilityType =
  | "chat"
  | "image"
  | "video"
  | "sandbox"
  | "audio"
  | "search"
  | "data-analysis";

export type AgentCreationCapabilityType = Extract<
  AgentCapabilityType,
  "chat" | "image" | "video" | "sandbox"
>;

export type MediaAgentCapabilityType = Extract<AgentCapabilityType, "image" | "video">;

export type StreamMode = "mock" | "live" | "mixed";

export type WorkspaceViewMode = "panels" | "graph";

export type ToolStatus =
  | "available"
  | "planned"
  | "queued"
  | "running"
  | "done"
  | "error"
  | "offline";

export type ContextNoteSource = "mission" | "memory" | "tool" | "workspace";

export type AgentMessage = {
  id: string;
  role: AgentMessageRole;
  content: string;
  createdAt: string;
  streaming?: boolean;
  interrupted?: boolean;
  media?: AgentMediaArtifact;
};

export type AgentMediaArtifact = {
  type: MediaAgentCapabilityType;
  url: string;
  prompt: string;
  createdAt: string;
};

export type AgentMemoryBlock = {
  id: string;
  label: string;
  content: string;
  intensity: number;
  updatedAt: string;
};

export type AgentContextNote = {
  id: string;
  title: string;
  value: string;
  source: ContextNoteSource;
};

export type AgentTool = {
  id: string;
  name: string;
  scope: string;
  status: ToolStatus;
  executorId?: string;
  lastRunAt?: string;
  result?: string;
  error?: string;
};

export type AgentLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type AgentTelemetry = {
  tokens: number;
  latency: number;
  confidence: number;
  tasks: number;
  toolRuns: number;
  errors: number;
};

export type AgentCapabilities = {
  type: AgentCapabilityType;
  supportedModels: string[];
};

export type AgentBranchMode = "full" | "summary";

export type AgentBranchingStatus = "idle" | "compressing" | "creating" | "done" | "error";

export interface IMemoryCompressionWeights {
  contextArchitecture?: number;
  semanticMeaning?: number;
  taskContinuity?: number;
  uiUxIntent?: number;
}

export interface IMemoryCompressionConfig {
  mode: AgentBranchMode;
  retentionRatio: number;
  compressorModelId: string;
  customFocusPrompt?: string;
  advancedWeights?: IMemoryCompressionWeights;
  compressorProfileId?: string;
}

export interface IAgentBranchMetadata {
  sourceAgentId: string;
  sourceAgentCallsign: string;
  mode: AgentBranchMode;
  createdAt: string;
  compressionConfig?: IMemoryCompressionConfig;
  retainedRatio?: number;
  compressionSummary?: string;
}

export interface ICompressedMemoryResult {
  retainedRatio: number;
  compressionSummary: string;
  contextNotes: AgentContextNote[];
  architectureNotes?: string[];
  keyDecisions?: string[];
  unresolvedBugs?: string[];
}

export type NexusAgent = {
  id: string;
  callsign: string;
  title: string;
  identity: string;
  mission: string;
  provider: string;
  model: string;
  capabilities: AgentCapabilities;
  sandboxCode?: string;
  sandboxUrl?: string;
  status: AgentStatus;
  accent: string;
  avatar: string;
  memory: AgentMemoryBlock[];
  contextNotes: AgentContextNote[];
  messages: AgentMessage[];
  tools: AgentTool[];
  layout: AgentLayout;
  previousLayout?: AgentLayout;
  minimized: boolean;
  maximized: boolean;
  createdAt: string;
  updatedAt: string;
  telemetry: AgentTelemetry;
  branchMetadata?: IAgentBranchMetadata;
};

export type WorkspacePanel = {
  id: string;
  type: "agent";
  agentId: string;
  layout: AgentLayout;
  minimized: boolean;
  maximized: boolean;
};

export type WorkflowGraphNodeType =
  | "agent-node"
  | "tool-node"
  | "memory-node"
  | "condition-node";

export type WorkflowGraphNodeStatus = "planned" | "available" | "disabled";

export interface IWorkflowGraphNodeBase {
  id: string;
  type: WorkflowGraphNodeType;
  x: number;
  y: number;
  label: string;
  status: WorkflowGraphNodeStatus;
  metadata?: Record<string, unknown>;
}

export interface IAgentWorkflowGraphNode extends IWorkflowGraphNodeBase {
  type: "agent-node";
  agentId: string;
}

export interface IToolWorkflowGraphNode extends IWorkflowGraphNodeBase {
  type: "tool-node";
  toolId?: string;
  executorId?: string;
}

export interface IMemoryWorkflowGraphNode extends IWorkflowGraphNodeBase {
  type: "memory-node";
  memoryId?: string;
  agentId?: string;
}

export interface IConditionWorkflowGraphNode extends IWorkflowGraphNodeBase {
  type: "condition-node";
  expression?: string;
}

export type IWorkflowGraphNode =
  | IAgentWorkflowGraphNode
  | IToolWorkflowGraphNode
  | IMemoryWorkflowGraphNode
  | IConditionWorkflowGraphNode;

export type WorkspaceGraphNode = {
  agentId: string;
  x: number;
  y: number;
  nodeType?: Extract<WorkflowGraphNodeType, "agent-node">;
};

export type WorkspaceGraphEdge = {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  animated?: boolean;
  label?: string;
  edgeKind?: "manual" | "branch";
  branchMode?: AgentBranchMode;
  style?: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    opacity?: number;
  };
};

export interface IWorkflowEdge {
  sourceAgentId: string;
  targetAgentId: string;
  condition?: string;
  passContext: boolean;
}

export type RealToolExecutorType = "local-fs" | "rest-api" | "db-query";

export type ToolExecutorPermissions = {
  allowedPaths?: string[];
  readOnly?: boolean;
};

export interface IToolExecutor {
  id: string;
  type: RealToolExecutorType;
  permissions?: ToolExecutorPermissions;
  // Future provider executors return adapter-specific payloads until narrowed by registry consumers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: () => Promise<any>;
}

export type FileSystemTreeNode = {
  name: string;
  path: string;
  type: "directory" | "file";
  children?: FileSystemTreeNode[];
};

export type FileSystemScanResult = {
  root: string;
  maxDepth: number;
  ignored: string[];
  tree: FileSystemTreeNode;
  scannedAt: string;
};

export type WebSurferResult = {
  url: string;
  readerUrl: string;
  content: string;
  fetchedAt: string;
  truncated: boolean;
};

export type WorkspaceGraph = {
  nodes: WorkspaceGraphNode[];
  edges: WorkspaceGraphEdge[];
};

export type WorkspaceThemeConfig = {
  radius?: string;
  blur?: string;
  borderWidth?: string;
  iconWeight?: string;
  fontFamily?: string;
  chatOpacity?: string;
};

export type WorkspaceBranchingSettings = {
  defaultRetentionRatio: number;
  futureDefaultWeights?: IMemoryCompressionWeights;
};

export type WorkspaceSettings = {
  provider: string;
  model: string;
  streamMode: StreamMode;
  viewMode: WorkspaceViewMode;
  autosave: boolean;
  branchingSettings: WorkspaceBranchingSettings;
};

export interface IAuthVault {
  user: User | null;
  globalApiKey: string | null;
  globalBaseUrl: string | null;
  isLocked: boolean;
}

export type NexusWorkspace = {
  id: string;
  name: string;
  agents: NexusAgent[];
  panels: WorkspacePanel[];
  graph: WorkspaceGraph;
  activeAgentId?: string;
  selectedAgentId?: string;
  themeConfig?: WorkspaceThemeConfig;
  checkpoints?: IWorkspaceCheckpoint[];
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
};

export type TransactionLogStatus = "success" | "error";

export interface ITransactionLog {
  id: string;
  action: string;
  status: TransactionLogStatus;
  timestamp: string;
  details: string;
}

export interface IWorkspaceCheckpoint {
  id: string;
  timestamp: string;
  reason: string;
  snapshot: Omit<NexusWorkspace, "checkpoints">;
}

export type AgentTemplate = {
  id: string;
  callsign: string;
  title: string;
  identity: string;
  avatar: string;
  accent: string;
  mission: string;
  provider: string;
  model: string;
  capabilities?: AgentCapabilities;
  memory: Omit<AgentMemoryBlock, "id" | "updatedAt">[];
  contextNotes: Omit<AgentContextNote, "id">[];
  tools: Omit<AgentTool, "id" | "lastRunAt" | "result" | "error">[];
};

export type WorkspaceSnapshot = {
  schemaVersion: 1;
  exportedAt: string;
  workspace: NexusWorkspace;
};

export type WorkflowTemplateAgentBlueprint = Pick<
  NexusAgent,
  | "accent"
  | "avatar"
  | "callsign"
  | "capabilities"
  | "contextNotes"
  | "id"
  | "identity"
  | "layout"
  | "memory"
  | "mission"
  | "model"
  | "provider"
  | "sandboxCode"
  | "sandboxUrl"
  | "title"
  | "tools"
>;

export type WorkflowTemplateBlueprintData = {
  schemaVersion: 1;
  graph: WorkspaceGraph;
  agents: WorkflowTemplateAgentBlueprint[];
  metadata?: Record<string, unknown>;
};

export type WorkflowTemplateRecord = {
  id: string;
  name: string;
  description?: string | null;
  blueprintData: WorkflowTemplateBlueprintData;
  createdAt: string;
};

export type HistoricalDataQuery = {
  workspaceId: string;
  agentId?: string | null;
  cursor?: string;
  limit?: number;
};

export type HistoricalDataPage<T> = {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
};

export type HistoricalMessageRecord = {
  workspaceId: string;
  agentId: string | null;
  message: AgentMessage;
};

export type HistoricalArtifactRecord = {
  id: string;
  workspaceId: string;
  sourceMessageId: string | null;
  artifact: AgentMediaArtifact;
};

export type ArtifactVaultRecord = {
  id: string;
  workspaceId: string;
  sourceMessageId: string | null;
  contentUrl: string;
  type: string;
  createdAt: string;
};

export interface PromptRecord {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  revisions?: PromptRevisionMetadata[];
}

export interface PromptRevisionRecord {
  id: string;
  prompt_id: string;
  previous_content: string;
  new_content: string;
  created_at: string;
}

export interface PromptRevisionMetadata {
  revisionId: string;
  promptId: string;
  previousTitle: string;
  previousContent: string;
  newTitle: string;
  newContent: string;
  updatedAt: string;
}

export interface NotebookRecord {
  id: string;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export type ActiveUiStateSnapshot = Pick<
  NexusWorkspace,
  | "activeAgentId"
  | "graph"
  | "id"
  | "name"
  | "panels"
  | "selectedAgentId"
  | "settings"
  | "updatedAt"
>;

export type StateSyncStatus = "idle" | "queued" | "syncing" | "error";

export type StateSyncResult = {
  ok: boolean;
  syncedAt: string;
  error?: string;
};

/**
 * @boundary TIERED_STATE: Zustand handles ONLY active UI interaction state:
 * layout, selection, focus, view mode, draft/runtime stream state, and the small
 * current working set. Historical Messages and Artifacts must be loaded through
 * this fetcher so unbounded transcripts and media URLs do not accumulate in
 * localStorage.
 */
export interface IAsyncDataFetcher {
  fetchHistoricalMessages(
    query: HistoricalDataQuery,
  ): Promise<HistoricalDataPage<HistoricalMessageRecord>>;
  fetchHistoricalArtifacts(
    query: HistoricalDataQuery,
  ): Promise<HistoricalDataPage<HistoricalArtifactRecord>>;
}

/**
 * @boundary TIERED_STATE: Zustand remains the active interaction cache. This
 * manager is the future backend sync boundary for active UI snapshots plus
 * durable historical Messages and Artifacts. Do not route large transcript or
 * artifact payloads directly into localStorage once L4 sync is enabled.
 */
export interface IStateSyncManager {
  getStatus(): StateSyncStatus;
  upsertWorkspace(workspaceId: string, name: string): Promise<StateSyncResult>;
  insertMessage(
    workspaceId: string,
    agentId: string,
    message: AgentMessage,
  ): Promise<StateSyncResult>;
  saveMacro(
    name: string,
    description: string | null,
    blueprintData: WorkflowTemplateBlueprintData,
  ): Promise<StateSyncResult>;
  fetchMacros(): Promise<WorkflowTemplateRecord[]>;
  saveArtifact(
    workspaceId: string,
    sourceMessageId: string | null,
    contentUrl: string,
    type: string,
  ): Promise<StateSyncResult>;
  fetchArtifacts(): Promise<ArtifactVaultRecord[]>;
  fetchPrompts(workspaceId: string): Promise<PromptRecord[]>;
  upsertPrompt(prompt: PromptRecord): Promise<void>;
  deletePrompt(id: string): Promise<void>;
  fetchPromptRevisions(promptId: string): Promise<PromptRevisionRecord[]>;
  fetchNotebooks(): Promise<NotebookRecord[]>;
  upsertNotebook(notebook: NotebookRecord): Promise<void>;
  deleteNotebook(id: string): Promise<void>;
  syncActiveUiState(snapshot: ActiveUiStateSnapshot): Promise<StateSyncResult>;
  syncHistoricalMessage(record: HistoricalMessageRecord): Promise<StateSyncResult>;
  syncHistoricalArtifact(record: HistoricalArtifactRecord): Promise<StateSyncResult>;
  flush(): Promise<StateSyncResult>;
}

export type AgentStreamRequest = {
  globalApiKey?: string;
  model?: string;
  agent: Pick<
    NexusAgent,
    | "identity"
    | "callsign"
    | "title"
    | "mission"
    | "provider"
    | "model"
    | "memory"
    | "contextNotes"
  >;
  messages: Pick<AgentMessage, "role" | "content">[];
};
