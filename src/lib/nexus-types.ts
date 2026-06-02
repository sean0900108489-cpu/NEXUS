import type { User } from "@supabase/supabase-js";
import type {
  WorkspaceComposerImageAspectRatio,
  WorkspaceComposerImageQuality,
} from "@/lib/composer/image-generation-settings";

export * from "@/lib/backend";

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

export type NexusReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export type NexusVerbosity = "low" | "medium" | "high";

export type NexusReasoningDetail = "low" | "medium" | "high";

export type AgentModelSettings = {
  reasoningEffort?: NexusReasoningEffort;
  verbosity?: NexusVerbosity;
  reasoningDetail?: NexusReasoningDetail;
  temperature?: number;
};

export type AgentProfileUpdate = Partial<
  Pick<
    NexusAgent,
    "callsign" | "title" | "identity" | "mission" | "executionPrompt" | "profileLocked"
  >
>;

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
  reasoningContent?: string;
  media?: AgentMediaArtifact;
};

export type AgentMediaArtifact = {
  artifactId?: string;
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

export type AgentMessageRetentionMetadata = {
  mode: "preserve_full_until_durable_projection";
  activeWindowLimit: number;
  maxWindowLimit: number;
  retainedCount: number;
  omittedCount: number;
  durability: "needs_sync_operation_applier_message_projection";
};

export type AgentMemoryRetentionMetadata = {
  mode: "preserve_full_until_durable_write";
  maxRecordContentBytes: number;
  retainedBlockCount: number;
  omittedBlockCount: number;
  durability: "needs_memory_write_route";
};

export type AgentLocalPersistenceMetadata = {
  schemaVersion: 1;
  messages: AgentMessageRetentionMetadata;
  memory: AgentMemoryRetentionMetadata;
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
  executionPrompt: string;
  profileLocked: boolean;
  provider: string;
  model: string;
  modelSettings: AgentModelSettings;
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
  localPersistence?: AgentLocalPersistenceMetadata;
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
  | "input.text"
  | "model.llm"
  | "model.image"
  | "output.text"
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

export type WorkflowRuntimeNodeType =
  | "input.text"
  | "model.llm"
  | "model.image"
  | "output.text";

export type WorkflowRuntimeNodeStatus =
  | "idle"
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "failed_interrupted";

export type WorkflowRuntimeRunStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "failed_interrupted";

export type WorkflowRuntimePosition = {
  x: number;
  y: number;
};

export type ContextPacket = {
  id: string;
  rawText: string;
  displayText: string;
  sourceNodeId: string;
  runId: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  truncated?: boolean;
  tokenEstimate?: number;
};

export type InputTextNodeData = {
  label?: string;
  text: string;
};

export type ModelLlmNodeData = {
  label?: string;
  prompt: string;
  model: string;
  modelSettings?: AgentModelSettings;
  provider?: string;
};

export type ModelImageNodeData = {
  label?: string;
  prompt: string;
  modelId: string;
  quality: WorkspaceComposerImageQuality;
  aspectRatio: WorkspaceComposerImageAspectRatio;
};

export type OutputTextNodeData = {
  label?: string;
  renderMode?: "markdown" | "plain";
};

export type WorkflowRuntimeNodeDataByType = {
  "input.text": InputTextNodeData;
  "model.llm": ModelLlmNodeData;
  "model.image": ModelImageNodeData;
  "output.text": OutputTextNodeData;
};

export type WorkflowRuntimeNodeData =
  WorkflowRuntimeNodeDataByType[WorkflowRuntimeNodeType];

export type WorkflowNodeInstance<
  TType extends WorkflowRuntimeNodeType = WorkflowRuntimeNodeType,
> = {
  id: string;
  type: TType;
  position: WorkflowRuntimePosition;
  data: WorkflowRuntimeNodeDataByType[TType];
  status: WorkflowRuntimeNodeStatus;
  inputSnapshot?: ContextPacket | null;
  outputSnapshot?: ContextPacket | null;
  error?: string | null;
};

export type WorkflowRuntimeEdge = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  animated?: boolean;
  label?: string;
};

export type NodeExecution = {
  runId: string;
  nodeId: string;
  status: WorkflowRuntimeNodeStatus;
  inputSnapshot?: ContextPacket | null;
  outputSnapshot?: ContextPacket | null;
  error?: string | null;
  startedAt?: string;
  completedAt?: string;
  latencyMs?: number | null;
};

export type WorkflowRun = {
  runId: string;
  workflowId: string;
  status: WorkflowRuntimeRunStatus;
  startedAt: string;
  completedAt?: string | null;
  error?: string | null;
  nodeExecutions: NodeExecution[];
};

export type WorkflowRuntimeLiteState = {
  version: 1;
  nodes: WorkflowNodeInstance[];
  edges: WorkflowRuntimeEdge[];
  runs: WorkflowRun[];
  lastRunId?: string | null;
  lastError?: string | null;
};

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
  runtimeLite?: WorkflowRuntimeLiteState;
};

export type WorkspaceThemeConfig = {
  radius?: string;
  blur?: string;
  borderWidth?: string;
  glowIntensity?: string;
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
  agentTemplateProfiles: Record<string, AgentTemplateProfile>;
};

export interface IAuthVault {
  user: User | null;
  globalApiKey: string | null;
  globalBaseUrl: string | null;
  isLocked: boolean;
  providerCredentials?: Record<string, ProviderCredentialRecord>;
}

export type ProviderCredentialRecord = {
  apiKey: string | null;
  baseUrl: string | null;
  isLocked: boolean;
  liveVerifiedAt?: string | null;
  verificationStatus?: "untested" | "verified" | "failed";
  verificationError?: string | null;
};

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
  executionPrompt?: string;
  profileLocked?: boolean;
  provider: string;
  model: string;
  capabilities?: AgentCapabilities;
  modelSettings?: AgentModelSettings;
  memory: Omit<AgentMemoryBlock, "id" | "updatedAt">[];
  contextNotes: Omit<AgentContextNote, "id">[];
  tools: Omit<AgentTool, "id" | "lastRunAt" | "result" | "error">[];
};

export type AgentTemplateProfile = {
  callsign: string;
  title: string;
  identity: string;
  mission: string;
  executionPrompt: string;
  profileLocked: boolean;
};

export type AgentTemplateProfileUpdate = Partial<AgentTemplateProfile>;

export type NotebookSyncRecoveryOperation = {
  clientMutationId: string;
  notebookId: string;
  operationType: string;
  payloadHash: string;
  queuedAt: string;
  status: Extract<
    SyncOperationStatus,
    "pending" | "queued" | "syncing" | "retrying" | "failed" | "conflicted" | "cancelled"
  >;
  updatedAt: string;
  workspaceId: string;
};

export type WorkspaceNotebookRecoveryMetadata = {
  schemaVersion: 1;
  generatedAt: string;
  operationCount: number;
  operations: NotebookSyncRecoveryOperation[];
  source: "local_sync_queue";
};

export type WorkspaceSnapshot = {
  schemaVersion: 1;
  exportedAt: string;
  deletedNotebooks?: NotebookRecord[];
  notebookDrafts?: NotebookDraftRecord[];
  notebookRecovery?: WorkspaceNotebookRecoveryMetadata;
  workspace: NexusWorkspace;
  notebooks?: NotebookRecord[];
};

export type WorkspaceCloudSnapshotType =
  | "active"
  | "checkpoint"
  | "imported"
  | "recovered";

export type WorkspaceStateEntityType =
  | "agent"
  | "graph"
  | "settings"
  | "theme"
  | "memory"
  | "tool_state"
  | "branch";

export type WorkspaceCloudMessageRef = Pick<
  AgentMessage,
  "createdAt" | "id" | "role"
> & {
  contentLength: number;
  hasMedia: boolean;
  mediaType?: MediaAgentCapabilityType;
};

export type WorkspaceCloudSnapshotAgent = Pick<
  NexusAgent,
  | "accent"
  | "avatar"
  | "callsign"
  | "capabilities"
  | "contextNotes"
  | "createdAt"
  | "id"
  | "identity"
  | "executionPrompt"
  | "layout"
  | "maximized"
  | "memory"
  | "minimized"
  | "mission"
  | "profileLocked"
  | "model"
  | "modelSettings"
  | "previousLayout"
  | "provider"
  | "title"
  | "tools"
  | "updatedAt"
> & {
  branchMetadata?: IAgentBranchMetadata;
  messageWindow: {
    messageCount: number;
    messageRefs: WorkspaceCloudMessageRef[];
  };
};

export type WorkspaceCloudSnapshotPayload = {
  schemaVersion: 1;
  registryVersion?: string;
  lastKnownChecksum?: string | null;
  workspace: Pick<
    NexusWorkspace,
    | "activeAgentId"
    | "createdAt"
    | "graph"
    | "id"
    | "name"
    | "panels"
    | "selectedAgentId"
    | "settings"
    | "themeConfig"
    | "updatedAt"
  > & {
    agents: WorkspaceCloudSnapshotAgent[];
  };
};

export type WorkspaceStatePutRequest = {
  schemaVersion: number;
  snapshot: WorkspaceCloudSnapshotPayload;
  baseChecksum: string | null;
  clientMutationId: string;
  snapshotType?: WorkspaceCloudSnapshotType;
};

export type WorkspaceStateGetResponse = {
  workspaceId: string;
  schemaVersion: number;
  snapshotType: WorkspaceCloudSnapshotType;
  snapshot: WorkspaceCloudSnapshotPayload;
  checksum: string;
  payloadSizeBytes: number;
  updatedAt: string;
};

export type WorkspaceHydrationReason =
  | "local_missing"
  | "workspace_switch"
  | "explicit_restore"
  | "recover"
  | "local_corrupt";

export type WorkspaceHydrationInput = {
  workspaceId: string;
  cloudChecksum: string;
  cloudUpdatedAt: string;
  localChecksum?: string | null;
  localUpdatedAt?: string | null;
  localStatePresent: boolean;
  reason: WorkspaceHydrationReason;
};

export type WorkspaceHydrationPlan =
  | {
      action: "hydrate";
      workspaceId: string;
      checksum: string;
      reason: WorkspaceHydrationReason;
    }
  | {
      action: "skip";
      workspaceId: string;
      checksum: string;
      reason: "checksum_match" | "local_state_present";
    }
  | {
      action: "conflict";
      workspaceId: string;
      checksum: string;
      reason: "local_newer";
    };

export type WorkspaceRecoveryStateResponse = {
  latest: WorkspaceStateGetResponse | null;
  plan: WorkspaceHydrationPlan | null;
  userId: string;
};

export type WorkspaceRecoveryListItem = {
  checksum: string;
  isLocalChecksumMatch: boolean;
  payloadSizeBytes: number;
  schemaVersion: number;
  snapshotType: WorkspaceCloudSnapshotType;
  updatedAt: string;
  workspaceId: string;
  workspaceName: string;
};

export type WorkspaceRecoveryListResponse = {
  items: WorkspaceRecoveryListItem[];
  localChecksum?: string | null;
  userId: string;
};

export type WorkspaceRecoveryApplyResult =
  | {
      status: "applied";
      workspaceId: string;
      checksum: string;
      reason: WorkspaceHydrationReason;
    }
  | {
      status: "skipped";
      workspaceId?: string;
      checksum?: string;
      reason: "missing_cloud_state" | "checksum_match" | "local_state_present";
    }
  | {
      status: "conflicted";
      workspaceId: string;
      checksum: string;
      reason: "local_newer";
    };

export type WorkspaceStatePutResponse = {
  workspaceId: string;
  checksum: string;
  previousChecksum: string | null;
  snapshotStatus: "saved" | "unchanged";
  payloadSizeBytes: number;
  schemaVersion: number;
};

export type SyncEntityType =
  | "workspace"
  | "agent"
  | "message"
  | "prompt"
  | "notebook"
  | "artifact_reference";

export type SyncOperationType =
  | "create"
  | "update"
  | "delete"
  | "upsert"
  | "patch"
  | "reorder"
  | "snapshot";

export type SyncOperationStatus =
  | "pending"
  | "queued"
  | "syncing"
  | "synced"
  | "retrying"
  | "failed"
  | "conflicted"
  | "cancelled"
  | "compacted";

export type SyncOperationRequest = {
  clientMutationId: string;
  workspaceId: string;
  entityType: SyncEntityType | string;
  entityId: string;
  operationType: SyncOperationType | string;
  payload: Record<string, unknown>;
  baseVersion?: string | null;
  payloadHash?: string;
};

export type SyncOperationSummary = {
  id: string;
  workspaceId: string;
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  status: SyncOperationStatus;
  attemptCount: number;
  maxAttempts: number;
  payloadHash: string;
  baseVersion?: string | null;
  remoteVersion?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
};

export type SyncOperationResponse = {
  operation: SyncOperationSummary;
  deduplicated: boolean;
};

export type SyncStatusResponse = {
  workspaceId: string;
  counts: {
    pending: number;
    queued: number;
    syncing: number;
    retrying: number;
    failed: number;
    conflicted: number;
  };
  latestError?: {
    operationId: string;
    code: string;
    message: string;
    updatedAt: string;
  };
  nextRetryAt?: string | null;
  operations: SyncOperationSummary[];
};

export type DeploymentEnvironment = "local" | "staging" | "production";

export type DeploymentCheckStatus =
  | "pending"
  | "running"
  | "passed"
  | "warning"
  | "failed"
  | "blocked";

export type DeploymentCheckType =
  | "environment"
  | "schema_drift"
  | "registry_consistency"
  | "rls_smoke"
  | "preflight";

export type RuntimeHealthStatus = "ok" | "warning" | "degraded";

export type RuntimeHealthResponse = {
  database: boolean;
  env: boolean;
  registry: boolean;
  deployment: boolean;
  mode: DeploymentEnvironment;
  status: RuntimeHealthStatus;
};

export type DeploymentCheckRecord = {
  id: string;
  releaseVersion?: string | null;
  environment: DeploymentEnvironment;
  checkType: string;
  status: DeploymentCheckStatus;
  details: Record<string, unknown>;
  createdAt: string;
};

export type DeploymentCheckRunRequest = {
  workspaceId?: string;
  environment?: DeploymentEnvironment;
  releaseVersion?: string | null;
};

export type DeploymentCheckRunResponse = {
  check: DeploymentCheckRecord;
};

export type FeatureFlagScopeKey = "__global__" | string;

export type FeatureFlagProjection = {
  flagKey: string;
  scopeKey: FeatureFlagScopeKey;
  enabled: boolean;
  rolloutPercentage: number;
};

export type FeatureFlagsResponse = {
  workspaceId?: string;
  flags: FeatureFlagProjection[];
};

export type FeatureFlagToggleRequest = {
  workspaceId?: string;
  scopeKey?: FeatureFlagScopeKey;
  enabled: boolean;
  rolloutPercentage?: number;
  metadata?: Record<string, unknown>;
};

export type FeatureFlagToggleResponse = {
  flag: FeatureFlagProjection;
};

export type AgentRuntimeSessionStatus =
  | "active"
  | "ended"
  | "failed"
  | "cancelled";

export type AgentTaskType =
  | "chat"
  | "memory_compress"
  | "tool_chain"
  | "handoff"
  | "branch";

export type AgentTaskStatus =
  | "created"
  | "queued"
  | "running"
  | "streaming"
  | "waiting_for_tool"
  | "waiting_for_confirmation"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying";

export type AgentRuntimeEventType =
  | "stream_started"
  | "first_token"
  | "fallback_used"
  | "stream_completed"
  | "stream_failed";

export type AgentTaskRecord = {
  id: string;
  sessionId: string | null;
  workspaceId: string;
  agentId: string;
  taskType: AgentTaskType;
  status: AgentTaskStatus;
  inputMessageId?: string | null;
  outputMessageId?: string | null;
  parentTaskId?: string | null;
  attemptCount: number;
  errorCode?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AgentRuntimeSessionRecord = {
  id: string;
  workspaceId: string;
  agentId: string;
  userId: string;
  provider?: string | null;
  model?: string | null;
  status: AgentRuntimeSessionStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  metadata: Record<string, unknown>;
};

export type AgentTaskCreateRequest = {
  workspaceId: string;
  taskType: AgentTaskType;
  provider?: string;
  model?: string;
  inputMessageId?: string;
  outputMessageId?: string;
  parentTaskId?: string;
  metadata?: Record<string, unknown>;
};

export type AgentTaskCreateResponse = {
  task: AgentTaskRecord;
  session: AgentRuntimeSessionRecord;
  sessionReused: boolean;
};

export type AgentTaskStatusResponse = {
  task: AgentTaskRecord;
};

export type AgentTaskCancelResponse = {
  task: AgentTaskRecord;
  cancelled: boolean;
};

export type ToolRiskLevel = "low" | "medium" | "high";

export type ToolRunStatus =
  | "created"
  | "blocked"
  | "awaiting_confirmation"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "materialized";

export type ToolMaterializationStatus =
  | "not_requested"
  | "TOOL_MATERIALIZATION_NOT_AVAILABLE";

export type ToolRunRecord = {
  id: string;
  workspaceId: string;
  agentId?: string | null;
  taskId?: string | null;
  toolId: string;
  executorId?: string | null;
  status: ToolRunStatus;
  riskLevel: ToolRiskLevel;
  inputHash?: string | null;
  inputRedacted: Record<string, unknown>;
  executableInput: Record<string, unknown>;
  outputRedacted?: Record<string, unknown> | null;
  outputHash?: string | null;
  artifactId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  costEstimate?: number | null;
  confirmationExpiresAt?: string | null;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
};

export type ToolRunRequest = {
  workspaceId: string;
  agentId?: string;
  taskId?: string;
  input?: Record<string, unknown>;
  scope?: string;
};

export type ToolRunResponse = {
  toolRun: ToolRunRecord;
  confirmationRequired: boolean;
  materializationStatus?: ToolMaterializationStatus;
};

export type ToolRunConfirmRequest = {
  workspaceId: string;
};

export type ToolRunConfirmResponse = ToolRunResponse & {
  confirmed: boolean;
};

export type ToolRunCancelRequest = {
  workspaceId: string;
};

export type ToolRunCancelResponse = {
  toolRun: ToolRunRecord;
  cancelled: boolean;
};

export type ToolRunListResponse = {
  workspaceId: string;
  toolRuns: ToolRunRecord[];
};

export type ToolPermissionRecord = {
  id: string;
  workspaceId: string;
  toolId: string;
  scope: string;
  enabled: boolean;
  requiresConfirmation: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LocalSyncQueueOperation = SyncOperationRequest & {
  payloadHash: string;
  status: Extract<
    SyncOperationStatus,
    | "pending"
    | "queued"
    | "syncing"
    | "synced"
    | "retrying"
    | "failed"
    | "conflicted"
    | "cancelled"
    | "compacted"
  >;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  compactKey?: string;
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
  | "executionPrompt"
  | "layout"
  | "memory"
  | "mission"
  | "profileLocked"
  | "model"
  | "modelSettings"
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
  userId?: string;
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

export type ArtifactStatus =
  | "draft"
  | "saving"
  | "saved"
  | "indexed"
  | "failed"
  | "archived"
  | "deleted";

export type ArtifactReferencedByType =
  | "message"
  | "notebook"
  | "prompt"
  | "macro"
  | "agent_memory"
  | "tool_run";

export type ArtifactVaultRecord = {
  id: string;
  workspaceId: string;
  sourceMessageId: string | null;
  title?: string | null;
  contentUrl?: string | null;
  contentHash?: string | null;
  contentSizeBytes?: number | null;
  mimeType?: string | null;
  previewText?: string | null;
  type: string;
  sourceAgentId?: string | null;
  sourceTaskId?: string | null;
  sourceToolRunId?: string | null;
  version: number;
  rootArtifactId?: string | null;
  parentArtifactId?: string | null;
  status: ArtifactStatus;
  createdAt: string;
  updatedAt?: string | null;
};

export type ArtifactVaultCache = {
  ids: string[];
  byId: Record<string, ArtifactVaultRecord>;
  nextCursor?: string | null;
  hasMore: boolean;
  fetchedAt?: string;
};

export type ArtifactRecord = ArtifactVaultRecord & {
  contentText?: string | null;
  metadata: Record<string, unknown>;
};

export type CreateArtifactRequest = {
  workspaceId: string;
  title?: string;
  type: string;
  contentText?: string;
  contentUrl?: string;
  mimeType?: string;
  sourceMessageId?: string | null;
  sourceAgentId?: string | null;
  sourceTaskId?: string | null;
  sourceToolRunId?: string | null;
  metadata?: Record<string, unknown>;
};

export type ArtifactListResponse = {
  workspaceId: string;
  artifacts: ArtifactVaultRecord[];
  nextCursor?: string | null;
  hasMore: boolean;
};

export type ArtifactGetResponse = {
  artifact: ArtifactRecord;
};

export type ArtifactCreateResponse = {
  artifact: ArtifactRecord;
};

export type ArtifactReferenceRecord = {
  id: string;
  workspaceId: string;
  artifactId: string;
  referencedByType: ArtifactReferencedByType;
  referencedById: string;
  createdAt: string;
};

export type ArtifactReferenceCreateRequest = {
  workspaceId: string;
  referencedByType: ArtifactReferencedByType;
  referencedById: string;
};

export type ArtifactReferenceCreateResponse = {
  reference: ArtifactReferenceRecord;
  deduplicated: boolean;
};

export type ArtifactVersionCreateRequest = CreateArtifactRequest & {
  workspaceId: string;
};

export type ArtifactVersionCreateResponse = {
  artifact: ArtifactRecord;
  parentArtifactId: string;
  rootArtifactId: string;
};

export type ArtifactArchiveRequest = {
  workspaceId: string;
};

export type ArtifactArchiveResponse = {
  artifact: ArtifactRecord;
};

export type AgentMemoryRecordType =
  | "active"
  | "compressed"
  | "archived"
  | "context_note";

export type MessageHistoryRecord = {
  id: string;
  workspaceId: string;
  agentId: string | null;
  role: AgentMessageRole;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  taskId?: string | null;
  sourceToolRunId?: string | null;
  tokenCount?: number | null;
  contentHash?: string | null;
  metadata: Record<string, unknown>;
  isActiveWindow: boolean;
  archivedAt?: string | null;
};

export type MessageHistoryPageResponse = {
  workspaceId: string;
  agentId: string;
  messages: MessageHistoryRecord[];
  nextCursor?: string | null;
  hasMore: boolean;
};

export type MessageArchiveRequest = {
  workspaceId: string;
  keepLatest?: number;
  before?: string;
};

export type MessageArchiveResponse = {
  workspaceId: string;
  agentId: string;
  archivedCount: number;
  activeWindowCount: number;
  policy: {
    keepLatest: number;
  };
};

export type AgentMemoryRecord = {
  id: string;
  workspaceId: string;
  agentId: string;
  memoryType: AgentMemoryRecordType;
  content: string;
  contentHash?: string | null;
  intensity?: number | null;
  sourceTaskId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentMemoryRecordsResponse = {
  workspaceId: string;
  agentId: string;
  records: AgentMemoryRecord[];
};

export type ObservabilityEventSeverity =
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "critical";

export type ObservabilityEventSource =
  | "api"
  | "sync"
  | "agent"
  | "tool"
  | "artifact"
  | "database"
  | "provider"
  | "security"
  | "deployment"
  | "history";

export type SystemEventRecord = {
  id: string;
  traceId: string;
  requestId?: string | null;
  workspaceId?: string | null;
  userId?: string | null;
  eventType: string;
  severity: ObservabilityEventSeverity;
  source: ObservabilityEventSource;
  resourceType?: string | null;
  resourceId?: string | null;
  message?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type SystemEventListResponse = {
  events: SystemEventRecord[];
  hasMore: boolean;
  nextCursor?: string | null;
};

export type TraceEventsResponse = {
  traceId: string;
  events: SystemEventRecord[];
  hasMore: boolean;
  nextCursor?: string | null;
  summary: {
    eventCount: number;
    sources: ObservabilityEventSource[];
    severities: ObservabilityEventSeverity[];
  };
};

export type UsageMetricRecord = {
  id: string;
  workspaceId?: string | null;
  agentId?: string | null;
  taskId?: string | null;
  toolRunId?: string | null;
  provider?: string | null;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costEstimate?: number | null;
  latencyMs?: number | null;
  createdAt: string;
};

export type UsageMetricDailyAggregate = {
  date: string;
  workspaceId?: string | null;
  provider?: string | null;
  model?: string | null;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
  latencyMs: number;
  count: number;
};

export type UsageMetricsResponse = {
  metrics: UsageMetricDailyAggregate[];
  hasMore: boolean;
  nextCursor?: string | null;
};

export interface PromptRecord {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
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

export type PromptListResponse = {
  prompts: PromptRecord[];
  source: "prompt_service";
  workspaceId: string;
};

export interface NotebookRecord {
  id: string;
  workspace_id?: string | null;
  title: string;
  content: string;
  created_at?: string;
  created_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  updated_at?: string;
}

export interface NotebookDraftRecord {
  notebookId: string;
  workspaceId?: string | null;
  title: string;
  content: string;
  baseUpdatedAt?: string | null;
  updatedAt: string;
}

export type NotebookListResponse = {
  notebooks: NotebookRecord[];
  source: "notebook_service";
  workspaceId?: string | null;
};

export type ActiveUiStateSnapshot = Pick<
  NexusWorkspace,
  | "agents"
  | "activeAgentId"
  | "createdAt"
  | "graph"
  | "id"
  | "name"
  | "panels"
  | "selectedAgentId"
  | "settings"
  | "themeConfig"
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
    content: string,
    type: string,
    options?: {
      sourceAgentId?: string | null;
      title?: string;
      userId?: string;
    },
  ): Promise<StateSyncResult>;
  fetchArtifacts(workspaceId?: string, userId?: string): Promise<ArtifactListResponse>;
  fetchPrompts(workspaceId: string): Promise<PromptRecord[]>;
  upsertPrompt(prompt: PromptRecord): Promise<void>;
  deletePrompt(id: string, workspaceId?: string): Promise<void>;
  fetchPromptRevisions(promptId: string): Promise<PromptRevisionRecord[]>;
  fetchNotebooks(): Promise<NotebookRecord[]>;
  upsertNotebook(notebook: NotebookRecord, workspaceId?: string): Promise<void>;
  deleteNotebook(
    id: string,
    workspaceId?: string,
    notebook?: NotebookRecord | null,
  ): Promise<void>;
  fetchLatestWorkspaceRecoveryState(input: {
    localChecksum?: string | null;
    localUpdatedAt?: string | null;
    localWorkspaceId?: string | null;
    userId: string;
  }): Promise<WorkspaceRecoveryStateResponse>;
  fetchWorkspaceRecoveryState(input: {
    localChecksum?: string | null;
    localUpdatedAt?: string | null;
    localWorkspaceId?: string | null;
    userId: string;
    workspaceId: string;
  }): Promise<WorkspaceRecoveryStateResponse>;
  fetchWorkspaceRecoveryList(input: {
    localChecksum?: string | null;
    userId: string;
  }): Promise<WorkspaceRecoveryListResponse>;
  syncActiveUiState(snapshot: ActiveUiStateSnapshot): Promise<StateSyncResult>;
  syncHistoricalMessage(record: HistoricalMessageRecord): Promise<StateSyncResult>;
  syncHistoricalArtifact(record: HistoricalArtifactRecord): Promise<StateSyncResult>;
  flush(): Promise<StateSyncResult>;
}

export type AgentStreamRequest = {
  reasoningEffort?: NexusReasoningEffort;
  modelSettings?: AgentModelSettings;
  taskId?: string;
  sessionId?: string;
  outputMessageId?: string;
  workspaceId?: string;
  model?: string;
  agent: Pick<
    NexusAgent,
    | "identity"
    | "callsign"
    | "title"
    | "mission"
    | "executionPrompt"
    | "provider"
    | "model"
    | "memory"
    | "contextNotes"
  >;
  messages: Pick<AgentMessage, "role" | "content">[];
};
