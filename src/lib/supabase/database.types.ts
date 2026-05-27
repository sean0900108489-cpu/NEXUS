import type {
  AgentCreationCapabilityType,
  AgentMemoryRecordType,
  AgentMessageRole,
  AgentRuntimeEventType,
  AgentRuntimeSessionStatus,
  AgentTaskStatus,
  AgentTaskType,
  ArtifactReferencedByType,
  ArtifactStatus,
  BackendMetadata,
  DeploymentCheckStatus,
  DeploymentEnvironment,
  MediaAgentCapabilityType,
  ObservabilityEventSeverity,
  ObservabilityEventSource,
  SyncEntityType,
  SyncOperationStatus,
  SyncOperationType,
  ToolRiskLevel,
  ToolRunStatus,
  WorkspaceCloudSnapshotPayload,
  WorkspaceCloudSnapshotType,
  WorkspaceStateEntityType,
  WorkflowTemplateBlueprintData,
} from "@/lib/nexus-types";

/**
 * @rule SYNC-EXPANSION: It is ALLOWED to create future-proof empty slots/columns
 * in the database schema. HOWEVER, if you invent a new column here, you MUST
 * simultaneously add it as an optional property in `src/lib/nexus-types.ts` to
 * maintain absolute Frontend-Backend synchronization.
 */

export type DatabaseTimestamp = string;

export interface Workspaces {
  id: string;
  name: string;
  created_at: DatabaseTimestamp;
  owner_user_id: string | null;
  created_by: string | null;
  updated_at: DatabaseTimestamp | null;
}

export type WorkspaceUpsert = Pick<Workspaces, "id" | "name"> &
  Partial<Pick<Workspaces, "created_by" | "owner_user_id" | "updated_at">>;

export interface Agent_Profiles {
  id: string;
  name: string;
  type: AgentCreationCapabilityType;
  system_prompt: string;
  created_at: DatabaseTimestamp;
}

export interface Workspace_Agents {
  workspace_id: string;
  agent_id: string;
  assigned_role: string;
}

export interface Messages {
  id: string;
  workspace_id: string;
  agent_id: string | null;
  content: string;
  type: AgentMessageRole;
  created_at: DatabaseTimestamp;
  created_by: string | null;
  role: AgentMessageRole | null;
  task_id: string | null;
  source_tool_run_id: string | null;
  token_count: number | null;
  content_hash: string | null;
  metadata: Record<string, unknown>;
  is_active_window: boolean;
  archived_at: DatabaseTimestamp | null;
  updated_at: DatabaseTimestamp | null;
}

export type MessageInsert = Pick<
  Messages,
  "agent_id" | "content" | "type" | "workspace_id"
> &
  Partial<
    Pick<
      Messages,
      | "archived_at"
      | "content_hash"
      | "created_by"
      | "is_active_window"
      | "metadata"
      | "role"
      | "source_tool_run_id"
      | "task_id"
      | "token_count"
      | "updated_at"
    >
  >;

export type ArtifactType =
  | MediaAgentCapabilityType
  | "note"
  | "ui-bubble"
  | "sandbox"
  | "code"
  | "url"
  | string;

export interface Artifacts {
  id: string;
  workspace_id: string;
  source_message_id: string | null;
  content_url: string;
  type: ArtifactType;
  created_at: DatabaseTimestamp;
  created_by: string | null;
  title: string | null;
  content_text: string | null;
  content_hash: string | null;
  content_size_bytes: number | null;
  mime_type: string | null;
  preview_text: string | null;
  source_agent_id: string | null;
  source_task_id: string | null;
  source_tool_run_id: string | null;
  metadata: BackendMetadata | Record<string, unknown>;
  version: number | null;
  root_artifact_id: string | null;
  parent_artifact_id: string | null;
  status: ArtifactStatus | null;
  updated_at: DatabaseTimestamp | null;
}

export type ArtifactInsert = Pick<
  Artifacts,
  "content_url" | "type" | "workspace_id"
> &
  Partial<
    Pick<
      Artifacts,
      | "content_hash"
      | "content_size_bytes"
      | "content_text"
      | "created_at"
      | "created_by"
      | "id"
      | "metadata"
      | "mime_type"
      | "parent_artifact_id"
      | "preview_text"
      | "root_artifact_id"
      | "source_agent_id"
      | "source_message_id"
      | "source_task_id"
      | "source_tool_run_id"
      | "status"
      | "title"
      | "updated_at"
      | "version"
    >
  >;

export interface Artifact_References {
  id: string;
  workspace_id: string;
  artifact_id: string;
  referenced_by_type: ArtifactReferencedByType;
  referenced_by_id: string;
  created_at: DatabaseTimestamp;
}

export type ArtifactReferenceInsert = Pick<
  Artifact_References,
  "artifact_id" | "referenced_by_id" | "referenced_by_type" | "workspace_id"
> &
  Partial<Pick<Artifact_References, "created_at" | "id">>;

export interface System_Events {
  id: string;
  trace_id: string;
  request_id: string | null;
  workspace_id: string | null;
  user_id: string | null;
  event_type: string;
  severity: ObservabilityEventSeverity;
  source: ObservabilityEventSource;
  resource_type: string | null;
  resource_id: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: DatabaseTimestamp;
}

export type SystemEventInsert = Pick<
  System_Events,
  "event_type" | "metadata" | "severity" | "source" | "trace_id"
> &
  Partial<
    Pick<
      System_Events,
      | "created_at"
      | "id"
      | "message"
      | "request_id"
      | "resource_id"
      | "resource_type"
      | "user_id"
      | "workspace_id"
    >
  >;

export interface Usage_Metrics {
  id: string;
  workspace_id: string | null;
  agent_id: string | null;
  task_id: string | null;
  tool_run_id: string | null;
  provider: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_estimate: number | null;
  latency_ms: number | null;
  created_at: DatabaseTimestamp;
}

export type UsageMetricInsert = Partial<
  Pick<
    Usage_Metrics,
    | "agent_id"
    | "cost_estimate"
    | "created_at"
    | "id"
    | "input_tokens"
    | "latency_ms"
    | "model"
    | "output_tokens"
    | "provider"
    | "task_id"
    | "tool_run_id"
    | "workspace_id"
  >
>;

export interface Workflow_Templates {
  id: string;
  name: string;
  description: string | null;
  blueprint_data: WorkflowTemplateBlueprintData;
  created_at: DatabaseTimestamp;
  workspace_id: string | null;
  created_by: string | null;
}

export type WorkflowTemplateInsert = Pick<
  Workflow_Templates,
  "blueprint_data" | "name"
> &
  Partial<
    Pick<
      Workflow_Templates,
      "created_at" | "created_by" | "description" | "id" | "workspace_id"
    >
  >;

export interface Prompts {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
  created_by: string | null;
}

export type PromptUpsert = Pick<
  Prompts,
  "content" | "id" | "title" | "workspace_id"
> &
  Partial<Pick<Prompts, "created_at" | "created_by" | "updated_at">>;

export interface Prompt_Revisions {
  id: string;
  prompt_id: string;
  previous_content: string;
  new_content: string;
  created_at: DatabaseTimestamp;
}

export type PromptRevisionInsert = Pick<
  Prompt_Revisions,
  "new_content" | "previous_content" | "prompt_id"
> &
  Partial<Pick<Prompt_Revisions, "created_at" | "id">>;

export interface Notebooks {
  id: string;
  workspace_id: string | null;
  title: string;
  content: string;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
  created_by: string | null;
}

export type NotebookUpsert = Pick<Notebooks, "content" | "id" | "title"> &
  Partial<
    Pick<Notebooks, "created_at" | "created_by" | "updated_at" | "workspace_id">
  >;

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export interface Workspace_Memberships {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
}

export type WorkspaceMembershipInsert = Pick<
  Workspace_Memberships,
  "role" | "user_id" | "workspace_id"
> &
  Partial<Pick<Workspace_Memberships, "created_at" | "id" | "updated_at">>;

export type PermissionAuditDecision =
  | "allowed"
  | "denied"
  | "requires_confirmation";

export interface Permission_Audit_Logs {
  id: string;
  workspace_id: string | null;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  decision: PermissionAuditDecision;
  reason_code: string | null;
  metadata: BackendMetadata;
  created_at: DatabaseTimestamp;
}

export type PermissionAuditLogInsert = Pick<
  Permission_Audit_Logs,
  "action" | "decision" | "metadata" | "resource_type"
> &
  Partial<
    Pick<
      Permission_Audit_Logs,
      | "actor_user_id"
      | "created_at"
      | "id"
      | "reason_code"
      | "resource_id"
      | "workspace_id"
    >
  >;

export interface Agent_Memory_Records {
  id: string;
  workspace_id: string;
  agent_id: string;
  memory_type: AgentMemoryRecordType;
  content: string;
  content_hash: string | null;
  intensity: number | null;
  source_task_id: string | null;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
}

export type AgentMemoryRecordInsert = Pick<
  Agent_Memory_Records,
  "agent_id" | "content" | "id" | "memory_type" | "workspace_id"
> &
  Partial<
    Pick<
      Agent_Memory_Records,
      | "content_hash"
      | "created_at"
      | "intensity"
      | "source_task_id"
      | "updated_at"
    >
  >;

export type ApiIdempotencyStatus = "pending" | "completed" | "failed";
export type ApiIdempotencyMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export interface Api_Idempotency_Keys {
  id: string;
  idempotency_key: string;
  workspace_id: string;
  actor_user_id: string | null;
  method: ApiIdempotencyMethod;
  path: string;
  request_hash: string;
  request_fingerprint: string;
  response_payload: unknown | null;
  status_code: number | null;
  status: ApiIdempotencyStatus;
  locked_at: DatabaseTimestamp | null;
  completed_at: DatabaseTimestamp | null;
  created_at: DatabaseTimestamp;
  expires_at: DatabaseTimestamp;
}

export type ApiIdempotencyKeyInsert = Pick<
  Api_Idempotency_Keys,
  | "idempotency_key"
  | "method"
  | "path"
  | "request_fingerprint"
  | "request_hash"
  | "workspace_id"
> &
  Partial<
    Pick<
      Api_Idempotency_Keys,
      | "actor_user_id"
      | "completed_at"
      | "created_at"
      | "expires_at"
      | "id"
      | "locked_at"
      | "response_payload"
      | "status"
      | "status_code"
    >
  >;

export interface Workspace_Snapshots {
  id: string;
  workspace_id: string;
  user_id: string;
  schema_version: number;
  snapshot_type: WorkspaceCloudSnapshotType;
  payload: WorkspaceCloudSnapshotPayload;
  checksum: string;
  payload_size_bytes: number;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
}

export type WorkspaceSnapshotInsert = Pick<
  Workspace_Snapshots,
  | "checksum"
  | "payload"
  | "payload_size_bytes"
  | "schema_version"
  | "snapshot_type"
  | "user_id"
  | "workspace_id"
> &
  Partial<Pick<Workspace_Snapshots, "created_at" | "id" | "updated_at">>;

export interface Workspace_State_Entities {
  id: string;
  workspace_id: string;
  entity_type: WorkspaceStateEntityType;
  entity_id: string;
  schema_version: number;
  payload: unknown;
  checksum: string | null;
  updated_at: DatabaseTimestamp;
}

export type WorkspaceStateEntityUpsert = Pick<
  Workspace_State_Entities,
  | "entity_id"
  | "entity_type"
  | "payload"
  | "schema_version"
  | "workspace_id"
> &
  Partial<Pick<Workspace_State_Entities, "checksum" | "id" | "updated_at">>;

export interface Sync_Operations {
  id: string;
  workspace_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation_type: SyncOperationType;
  payload: unknown;
  payload_hash: string;
  base_version: string | null;
  remote_version: string | null;
  status: SyncOperationStatus;
  attempt_count: number;
  max_attempts: number;
  last_error_code: string | null;
  last_error_message: string | null;
  conflict_summary: unknown | null;
  next_retry_at: DatabaseTimestamp | null;
  locked_at: DatabaseTimestamp | null;
  lease_expires_at: DatabaseTimestamp | null;
  created_by: string | null;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
  synced_at: DatabaseTimestamp | null;
  compacted_at: DatabaseTimestamp | null;
  cancelled_at: DatabaseTimestamp | null;
}

export type SyncOperationInsert = Pick<
  Sync_Operations,
  | "entity_id"
  | "entity_type"
  | "id"
  | "operation_type"
  | "payload"
  | "payload_hash"
  | "status"
  | "workspace_id"
> &
  Partial<
    Pick<
      Sync_Operations,
      | "attempt_count"
      | "base_version"
      | "cancelled_at"
      | "compacted_at"
      | "conflict_summary"
      | "created_at"
      | "created_by"
      | "last_error_code"
      | "last_error_message"
      | "lease_expires_at"
      | "locked_at"
      | "max_attempts"
      | "next_retry_at"
      | "remote_version"
      | "synced_at"
      | "updated_at"
    >
  >;

export interface Feature_Flags {
  id: string;
  flag_key: string;
  scope_key: string;
  enabled: boolean;
  rollout_percentage: number;
  metadata: BackendMetadata | Record<string, unknown>;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
}

export type FeatureFlagInsert = Pick<
  Feature_Flags,
  "enabled" | "flag_key" | "scope_key"
> &
  Partial<
    Pick<
      Feature_Flags,
      "created_at" | "id" | "metadata" | "rollout_percentage" | "updated_at"
    >
  >;

export interface Deployment_Checks {
  id: string;
  release_version: string | null;
  environment: DeploymentEnvironment;
  check_type: string;
  status: DeploymentCheckStatus;
  details: BackendMetadata | Record<string, unknown>;
  created_at: DatabaseTimestamp;
}

export type DeploymentCheckInsert = Pick<
  Deployment_Checks,
  "check_type" | "details" | "environment" | "status"
> &
  Partial<Pick<Deployment_Checks, "created_at" | "id" | "release_version">>;

export interface Agent_Runtime_Sessions {
  id: string;
  workspace_id: string;
  agent_id: string;
  user_id: string;
  provider: string | null;
  model: string | null;
  status: AgentRuntimeSessionStatus;
  started_at: DatabaseTimestamp | null;
  ended_at: DatabaseTimestamp | null;
  metadata: BackendMetadata | Record<string, unknown>;
}

export type AgentRuntimeSessionInsert = Pick<
  Agent_Runtime_Sessions,
  "agent_id" | "status" | "user_id" | "workspace_id"
> &
  Partial<
    Pick<
      Agent_Runtime_Sessions,
      "ended_at" | "id" | "metadata" | "model" | "provider" | "started_at"
    >
  >;

export interface Agent_Tasks {
  id: string;
  session_id: string | null;
  workspace_id: string;
  agent_id: string;
  task_type: AgentTaskType;
  status: AgentTaskStatus;
  input_message_id: string | null;
  output_message_id: string | null;
  parent_task_id: string | null;
  attempt_count: number;
  error_code: string | null;
  metadata: BackendMetadata | Record<string, unknown>;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
}

export type AgentTaskInsert = Pick<
  Agent_Tasks,
  "agent_id" | "status" | "task_type" | "workspace_id"
> &
  Partial<
    Pick<
      Agent_Tasks,
      | "attempt_count"
      | "created_at"
      | "error_code"
      | "id"
      | "input_message_id"
      | "metadata"
      | "output_message_id"
      | "parent_task_id"
      | "session_id"
      | "updated_at"
    >
  >;

export interface Agent_Runtime_Events {
  id: string;
  task_id: string;
  event_type: AgentRuntimeEventType;
  payload: BackendMetadata | Record<string, unknown>;
  created_at: DatabaseTimestamp;
}

export type AgentRuntimeEventInsert = Pick<
  Agent_Runtime_Events,
  "event_type" | "task_id"
> &
  Partial<Pick<Agent_Runtime_Events, "created_at" | "id" | "payload">>;

export interface Tool_Runs {
  id: string;
  workspace_id: string;
  agent_id: string | null;
  task_id: string | null;
  tool_id: string;
  executor_id: string | null;
  status: ToolRunStatus;
  risk_level: ToolRiskLevel;
  input_hash: string | null;
  input_redacted: Record<string, unknown>;
  executable_input: Record<string, unknown>;
  output_redacted: Record<string, unknown> | null;
  output_hash: string | null;
  artifact_id: string | null;
  error_code: string | null;
  error_message: string | null;
  cost_estimate: number | null;
  confirmation_expires_at: DatabaseTimestamp | null;
  confirmed_by: string | null;
  confirmed_at: DatabaseTimestamp | null;
  started_at: DatabaseTimestamp | null;
  ended_at: DatabaseTimestamp | null;
  created_by: string | null;
  created_at: DatabaseTimestamp;
}

export type ToolRunInsert = Pick<
  Tool_Runs,
  "risk_level" | "status" | "tool_id" | "workspace_id"
> &
  Partial<
    Pick<
      Tool_Runs,
      | "agent_id"
      | "artifact_id"
      | "confirmation_expires_at"
      | "confirmed_at"
      | "confirmed_by"
      | "cost_estimate"
      | "created_at"
      | "created_by"
      | "ended_at"
      | "error_code"
      | "error_message"
      | "executable_input"
      | "executor_id"
      | "id"
      | "input_hash"
      | "input_redacted"
      | "output_hash"
      | "output_redacted"
      | "started_at"
      | "task_id"
    >
  >;

export interface Tool_Permissions {
  id: string;
  workspace_id: string;
  tool_id: string;
  scope: string;
  enabled: boolean;
  requires_confirmation: boolean;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
}

export type ToolPermissionInsert = Pick<
  Tool_Permissions,
  "enabled" | "requires_confirmation" | "scope" | "tool_id" | "workspace_id"
> &
  Partial<Pick<Tool_Permissions, "created_at" | "id" | "updated_at">>;

type Insertable<T> = T;
type Updatable<T> = Partial<T>;
type SupabaseRecord<T> = T & Record<string, unknown>;

type TableDefinition<Row, Insert = Row, Update = Partial<Row>> = {
  Row: SupabaseRecord<Row>;
  Insert: SupabaseRecord<Insertable<Insert>>;
  Update: SupabaseRecord<Updatable<Update>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      workspaces: TableDefinition<Workspaces, WorkspaceUpsert>;
      workspace_memberships: TableDefinition<
        Workspace_Memberships,
        WorkspaceMembershipInsert
      >;
      permission_audit_logs: TableDefinition<
        Permission_Audit_Logs,
        PermissionAuditLogInsert
      >;
      agent_memory_records: TableDefinition<
        Agent_Memory_Records,
        AgentMemoryRecordInsert
      >;
      api_idempotency_keys: TableDefinition<
        Api_Idempotency_Keys,
        ApiIdempotencyKeyInsert
      >;
      workspace_snapshots: TableDefinition<
        Workspace_Snapshots,
        WorkspaceSnapshotInsert
      >;
      workspace_state_entities: TableDefinition<
        Workspace_State_Entities,
        WorkspaceStateEntityUpsert
      >;
      sync_operations: TableDefinition<Sync_Operations, SyncOperationInsert>;
      feature_flags: TableDefinition<Feature_Flags, FeatureFlagInsert>;
      deployment_checks: TableDefinition<
        Deployment_Checks,
        DeploymentCheckInsert
      >;
      agent_runtime_sessions: TableDefinition<
        Agent_Runtime_Sessions,
        AgentRuntimeSessionInsert
      >;
      agent_tasks: TableDefinition<Agent_Tasks, AgentTaskInsert>;
      agent_runtime_events: TableDefinition<
        Agent_Runtime_Events,
        AgentRuntimeEventInsert
      >;
      tool_runs: TableDefinition<Tool_Runs, ToolRunInsert>;
      tool_permissions: TableDefinition<
        Tool_Permissions,
        ToolPermissionInsert
      >;
      agent_profiles: TableDefinition<Agent_Profiles>;
      workspace_agents: TableDefinition<Workspace_Agents>;
      messages: TableDefinition<Messages, MessageInsert>;
      artifacts: TableDefinition<Artifacts, ArtifactInsert>;
      artifact_references: TableDefinition<
        Artifact_References,
        ArtifactReferenceInsert
      >;
      system_events: TableDefinition<System_Events, SystemEventInsert>;
      usage_metrics: TableDefinition<Usage_Metrics, UsageMetricInsert>;
      prompts: TableDefinition<Prompts, PromptUpsert>;
      prompt_revisions: TableDefinition<
        Prompt_Revisions,
        PromptRevisionInsert
      >;
      notebooks: TableDefinition<Notebooks, NotebookUpsert>;
      workflow_templates: TableDefinition<
        Workflow_Templates,
        WorkflowTemplateInsert
      >;
    };
    Views: Record<string, never>;
    Functions: {
      has_workspace_role: {
        Args: {
          allowed_roles: string[];
          target_workspace_id: string;
        };
        Returns: boolean;
      };
      is_workspace_member: {
        Args: {
          target_workspace_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      agent_profile_type: AgentCreationCapabilityType;
      message_type: AgentMessageRole;
      agent_memory_record_type: AgentMemoryRecordType;
      artifact_type: ArtifactType;
      permission_audit_decision: PermissionAuditDecision;
      api_idempotency_method: ApiIdempotencyMethod;
      api_idempotency_status: ApiIdempotencyStatus;
      workspace_cloud_snapshot_type: WorkspaceCloudSnapshotType;
      workspace_state_entity_type: WorkspaceStateEntityType;
      sync_entity_type: SyncEntityType;
      sync_operation_type: SyncOperationType;
      sync_operation_status: SyncOperationStatus;
      deployment_environment: DeploymentEnvironment;
      deployment_check_status: DeploymentCheckStatus;
      agent_runtime_session_status: AgentRuntimeSessionStatus;
      agent_task_type: AgentTaskType;
      agent_task_status: AgentTaskStatus;
      agent_runtime_event_type: AgentRuntimeEventType;
      tool_run_status: ToolRunStatus;
      tool_risk_level: ToolRiskLevel;
      artifact_status: ArtifactStatus;
      artifact_referenced_by_type: ArtifactReferencedByType;
      observability_event_severity: ObservabilityEventSeverity;
      observability_event_source: ObservabilityEventSource;
      workspace_role: WorkspaceRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
