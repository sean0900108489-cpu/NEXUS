import type {
  ActiveUiStateSnapshot,
  AgentMessage,
  ArtifactCreateResponse,
  ArtifactListResponse,
  CreateArtifactRequest,
  HistoricalArtifactRecord,
  HistoricalDataPage,
  HistoricalDataQuery,
  HistoricalMessageRecord,
  IAsyncDataFetcher,
  IStateSyncManager,
  ITransactionLog,
  NotebookListResponse,
  NotebookRecord,
  PromptListResponse,
  PromptRecord,
  PromptRevisionRecord,
  StateSyncResult,
  StateSyncStatus,
  WorkspaceRecoveryListResponse,
  WorkspaceRecoveryStateResponse,
  WorkspaceSessionEnsureRequest,
  WorkspaceSessionEnsureResponse,
  WorkspaceStateGetResponse,
  WorkspaceStatePutRequest,
  WorkflowTemplateBlueprintData,
  WorkflowTemplateRecord,
} from "@/lib/nexus-types";
import { nexusApiClient, NexusApiError } from "@/lib/api/nexus-api-client";
import {
  calculateWorkspaceSnapshotPayloadSizeBytes,
  computeWorkspaceSnapshotChecksum,
  MAX_WORKSPACE_SNAPSHOT_BYTES,
  serializeActiveUiStateSnapshot,
  WORKSPACE_CLOUD_SNAPSHOT_SCHEMA_VERSION,
  WORKSPACE_SNAPSHOT_DEBOUNCE_MS,
} from "@/lib/backend/workspace/workspace-snapshot-serializer";
import { localSyncQueueAdapter } from "@/lib/sync/local-sync-queue-adapter";
import { getNexusSupabaseClient } from "@/lib/supabase/client";
import type {
  Prompt_Revisions,
  WorkflowTemplateInsert,
  Workflow_Templates,
} from "@/lib/supabase/database.types";

/**
 * @boundary TIERED_STATE: This module is the future bridge between the active
 * Zustand UI cache and the L4 backend. Keep Zustand focused on active UI
 * interaction state; route historical Messages and Artifacts through these slots.
 */

function emptyPage<T>(): HistoricalDataPage<T> {
  return {
    hasMore: false,
    items: [],
  };
}

function synced(): StateSyncResult {
  return {
    ok: true,
    syncedAt: new Date().toISOString(),
  };
}

function failed(error: unknown): StateSyncResult {
  return {
    ok: false,
    syncedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : "State sync failed.",
  };
}

function emptyArtifactList(workspaceId: string): ArtifactListResponse {
  return {
    artifacts: [],
    hasMore: false,
    nextCursor: null,
    workspaceId,
  };
}

function mapWorkflowTemplate(row: Workflow_Templates): WorkflowTemplateRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    blueprintData: row.blueprint_data,
    createdAt: row.created_at,
  };
}

function logSupabaseSyncError(error: unknown) {
  console.error("[Supabase Sync Error]:", formatSyncError(error));
}

function formatSyncError(error: unknown) {
  if (error instanceof Error) {
    return {
      cause: serializeErrorCause(error.cause),
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;

    return {
      cause: serializeErrorCause(record.cause),
      json: stringifyErrorFallback(error),
      message: typeof record.message === "string" ? record.message : undefined,
      name: typeof record.name === "string" ? record.name : "Object",
      stack: typeof record.stack === "string" ? record.stack : undefined,
    };
  }

  return {
    json: stringifyErrorFallback(error),
    message: String(error),
    name: typeof error,
  };
}

function serializeErrorCause(cause: unknown): unknown {
  if (cause instanceof Error) {
    return {
      message: cause.message,
      name: cause.name,
      stack: cause.stack,
    };
  }

  if (cause && typeof cause === "object") {
    return stringifyErrorFallback(cause);
  }

  return cause;
}

function stringifyErrorFallback(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function createClientMutationId() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `mutation_workspace_state_${random}`;
}

async function resolveStateSyncUserId() {
  try {
    const { data } = await getNexusSupabaseClient().auth.getUser();

    return data.user?.id ?? "local-owner";
  } catch {
    return "local-owner";
  }
}

async function resolveStateSyncAccessToken() {
  try {
    const { data } = await getNexusSupabaseClient().auth.getSession();

    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function ensureWorkspaceSessionViaSupabaseRpc(
  input: WorkspaceSessionEnsureRequest & { userId: string },
  accessToken: string,
): Promise<WorkspaceSessionEnsureResponse | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/nexus_ensure_workspace_session`,
    {
      body: JSON.stringify({
        p_preferred_workspace_id: input.preferredWorkspaceId ?? null,
        p_preferred_workspace_name: input.preferredWorkspaceName ?? null,
      }),
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`Workspace session RPC failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  const row = Array.isArray(payload) ? payload[0] : payload;

  if (!isRecord(row) || typeof row.workspace_id !== "string") {
    throw new Error("Workspace session RPC returned an invalid payload.");
  }

  return {
    created: row.created === true,
    preferredWorkspaceId:
      typeof row.preferred_workspace_id === "string"
        ? row.preferred_workspace_id
        : input.preferredWorkspaceId ?? null,
    reason:
      typeof row.reason === "string"
        ? (row.reason as WorkspaceSessionEnsureResponse["reason"])
        : "created_user_workspace",
    role:
      typeof row.role === "string"
        ? (row.role as WorkspaceSessionEnsureResponse["role"])
        : "owner",
    workspaceId: row.workspace_id,
    workspaceName:
      typeof row.workspace_name === "string"
        ? row.workspace_name
        : input.preferredWorkspaceName ?? "NEXUS // AI OPS",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

type TransactionLogger = (entry: ITransactionLog) => void;

type PendingWorkspaceSnapshotSync = {
  body: WorkspaceStatePutRequest;
  checksum: string;
  idempotencyKey: string;
  payloadSizeBytes: number;
  workspaceId: string;
};

function makeTransactionLog({
  action,
  details,
  result,
}: {
  action: string;
  details: string;
  result: StateSyncResult;
}): ITransactionLog {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    status: result.ok ? "success" : "error",
    timestamp: result.syncedAt,
    details: result.ok ? details : `${details}: ${result.error ?? "Unknown sync error."}`,
  };
}

function mapPromptRevision(row: Prompt_Revisions): PromptRevisionRecord {
  return {
    id: row.id,
    prompt_id: row.prompt_id,
    previous_content: row.previous_content,
    new_content: row.new_content,
    created_at: row.created_at,
  };
}

export class MockAsyncDataFetcher implements IAsyncDataFetcher {
  async fetchHistoricalMessages(
    query: HistoricalDataQuery,
  ): Promise<HistoricalDataPage<HistoricalMessageRecord>> {
    void query;

    return emptyPage<HistoricalMessageRecord>();
  }

  async fetchHistoricalArtifacts(
    query: HistoricalDataQuery,
  ): Promise<HistoricalDataPage<HistoricalArtifactRecord>> {
    void query;

    return emptyPage<HistoricalArtifactRecord>();
  }
}

export class MockStateSyncManager implements IStateSyncManager {
  private status: StateSyncStatus = "idle";

  getStatus(): StateSyncStatus {
    return this.status;
  }

  async upsertWorkspace(
    workspaceId: string,
    name: string,
  ): Promise<StateSyncResult> {
    void workspaceId;
    void name;
    this.status = "syncing";
    const result = synced();
    this.status = "idle";

    return result;
  }

  async insertMessage(
    workspaceId: string,
    agentId: string,
    message: AgentMessage,
  ): Promise<StateSyncResult> {
    void workspaceId;
    void agentId;
    void message;
    this.status = "syncing";
    const result = synced();
    this.status = "idle";

    return result;
  }

  async saveMacro(
    name: string,
    description: string | null,
    blueprintData: WorkflowTemplateBlueprintData,
  ): Promise<StateSyncResult> {
    void name;
    void description;
    void blueprintData;
    this.status = "syncing";
    const result = synced();
    this.status = "idle";

    return result;
  }

  async fetchMacros(): Promise<WorkflowTemplateRecord[]> {
    return [];
  }

  async saveArtifact(
    workspaceId: string,
    sourceMessageId: string | null,
    content: string,
    type: string,
    options?: {
      sourceAgentId?: string | null;
      title?: string;
      userId?: string;
    },
  ): Promise<StateSyncResult> {
    void workspaceId;
    void sourceMessageId;
    void content;
    void type;
    void options;
    this.status = "syncing";
    const result = synced();
    this.status = "idle";

    return result;
  }

  async fetchArtifacts(workspaceId = "__global__"): Promise<ArtifactListResponse> {
    return emptyArtifactList(workspaceId);
  }

  async fetchPrompts(workspaceId: string): Promise<PromptRecord[]> {
    void workspaceId;

    return [];
  }

  async upsertPrompt(prompt: PromptRecord): Promise<void> {
    void prompt;
  }

  async deletePrompt(id: string, workspaceId?: string): Promise<void> {
    void id;
    void workspaceId;
  }

  async fetchPromptRevisions(promptId: string): Promise<PromptRevisionRecord[]> {
    void promptId;

    return [];
  }

  async fetchNotebooks(): Promise<NotebookRecord[]> {
    return [];
  }

  async upsertNotebook(notebook: NotebookRecord, workspaceId?: string): Promise<void> {
    void notebook;
    void workspaceId;
  }

  async deleteNotebook(
    id: string,
    workspaceId?: string,
    notebook?: NotebookRecord | null,
  ): Promise<void> {
    void id;
    void workspaceId;
    void notebook;
  }

  async fetchLatestWorkspaceRecoveryState(input: {
    localChecksum?: string | null;
    localUpdatedAt?: string | null;
    localWorkspaceId?: string | null;
    userId: string;
  }): Promise<WorkspaceRecoveryStateResponse> {
    return {
      latest: null,
      plan: null,
      userId: input.userId,
    };
  }

  async fetchWorkspaceRecoveryList(input: {
    localChecksum?: string | null;
    userId: string;
  }): Promise<WorkspaceRecoveryListResponse> {
    return {
      items: [],
      localChecksum: null,
      userId: input.userId,
    };
  }

  async fetchWorkspaceRecoveryState(input: {
    localChecksum?: string | null;
    localUpdatedAt?: string | null;
    localWorkspaceId?: string | null;
    userId: string;
    workspaceId: string;
  }): Promise<WorkspaceRecoveryStateResponse> {
    return {
      latest: null,
      plan: null,
      userId: input.userId,
    };
  }

  async ensureWorkspaceSession(
    input: WorkspaceSessionEnsureRequest & { userId: string },
    _accessTokenOverride?: string | null,
  ): Promise<WorkspaceSessionEnsureResponse | null> {
    return {
      created: false,
      preferredWorkspaceId: input.preferredWorkspaceId ?? null,
      reason: "preferred_workspace_member",
      role: "owner",
      workspaceId: input.preferredWorkspaceId?.trim() || "__global__",
      workspaceName: input.preferredWorkspaceName?.trim() || "NEXUS // AI OPS",
    };
  }

  async syncActiveUiState(snapshot: ActiveUiStateSnapshot): Promise<StateSyncResult> {
    void snapshot;
    this.status = "syncing";
    const result = synced();
    this.status = "idle";

    return result;
  }

  async syncHistoricalMessage(
    record: HistoricalMessageRecord,
  ): Promise<StateSyncResult> {
    void record;
    this.status = "syncing";
    const result = synced();
    this.status = "idle";

    return result;
  }

  async syncHistoricalArtifact(
    record: HistoricalArtifactRecord,
  ): Promise<StateSyncResult> {
    void record;
    this.status = "syncing";
    const result = synced();
    this.status = "idle";

    return result;
  }

  async flush(): Promise<StateSyncResult> {
    this.status = "syncing";
    const result = synced();
    this.status = "idle";

    return result;
  }
}

export class SupabaseStateSyncManager implements IStateSyncManager {
  private status: StateSyncStatus = "idle";
  private transactionLogger?: TransactionLogger;
  private workspaceSnapshotSyncTimeout?: ReturnType<typeof setTimeout>;
  private pendingWorkspaceSnapshotSync?: PendingWorkspaceSnapshotSync;
  private readonly lastCloudSnapshotChecksums = new Map<string, string>();

  getStatus(): StateSyncStatus {
    return this.status;
  }

  setTransactionLogger(logger: TransactionLogger) {
    this.transactionLogger = logger;
  }

  private finalizeTransaction(action: string, details: string, result: StateSyncResult) {
    this.transactionLogger?.(makeTransactionLog({ action, details, result }));

    return result;
  }

  async upsertWorkspace(
    workspaceId: string,
    name: string,
  ): Promise<StateSyncResult> {
    this.status = "queued";

    try {
      await localSyncQueueAdapter.enqueue({
        compactKey: `workspace:${workspaceId}:upsert`,
        entityId: workspaceId,
        entityType: "workspace",
        operationType: "upsert",
        payload: {
          id: workspaceId,
          name,
        },
        workspaceId,
      });
      this.status = "idle";

      return this.finalizeTransaction(
        "sync.queue.workspace",
        `Workspace ${workspaceId} (${name}) queued for durable sync.`,
        synced(),
      );
    } catch (error) {
      this.status = "idle";

      return this.finalizeTransaction(
        "sync.queue.workspace",
        `Workspace ${workspaceId} (${name}) queue failed.`,
        failed(error),
      );
    }
  }

  async insertMessage(
    workspaceId: string,
    agentId: string,
    message: AgentMessage,
  ): Promise<StateSyncResult> {
    this.status = "queued";

    try {
      await localSyncQueueAdapter.enqueue({
        entityId: message.id,
        entityType: "message",
        operationType: "create",
        payload: {
          agentId,
          message,
          workspaceId,
        },
        workspaceId,
      });
      this.status = "idle";

      return this.finalizeTransaction(
        "sync.queue.message",
        `Message ${message.id} queued for agent ${agentId} in workspace ${workspaceId}.`,
        synced(),
      );
    } catch (error) {
      this.status = "idle";

      return this.finalizeTransaction(
        "sync.queue.message",
        `Message ${message.id} queue failed for agent ${agentId}.`,
        failed(error),
      );
    }
  }

  async saveMacro(
    name: string,
    description: string | null,
    blueprintData: WorkflowTemplateBlueprintData,
  ): Promise<StateSyncResult> {
    this.status = "syncing";

    try {
      const payload: WorkflowTemplateInsert = {
        blueprint_data: blueprintData,
        description,
        name,
      };
      const { error } = await getNexusSupabaseClient()
        .from("workflow_templates")
        .insert(payload);

      this.status = "idle";

      if (error) {
        logSupabaseSyncError(error);
        return this.finalizeTransaction(
          "supabase.saveMacro",
          `Macro ${name} save failed.`,
          failed(error),
        );
      }

      return this.finalizeTransaction(
        "supabase.saveMacro",
        `Macro ${name} saved to workflow_templates.`,
        synced(),
      );
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";

      return this.finalizeTransaction(
        "supabase.saveMacro",
        `Macro ${name} save failed.`,
        failed(error),
      );
    }
  }

  async fetchMacros(): Promise<WorkflowTemplateRecord[]> {
    this.status = "syncing";

    try {
      const { data, error } = await getNexusSupabaseClient()
        .from("workflow_templates")
        .select("id,name,description,blueprint_data,created_at")
        .order("created_at", { ascending: false });

      this.status = "idle";

      if (error) {
        logSupabaseSyncError(error);
        return [];
      }

      return (data ?? []).map((row) => mapWorkflowTemplate(row as Workflow_Templates));
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";

      return [];
    }
  }

  async saveArtifact(
    workspaceId: string,
    sourceMessageId: string | null,
    content: string,
    type: string,
    options?: {
      sourceAgentId?: string | null;
      title?: string;
      userId?: string;
    },
  ): Promise<StateSyncResult> {
    this.status = "queued";

    try {
      await localSyncQueueAdapter.enqueue({
        compactKey: `artifact:${workspaceId}:${sourceMessageId ?? "unknown"}:${type}`,
        entityId: sourceMessageId ?? `artifact-${Date.now()}`,
        entityType: "artifact",
        operationType: "create",
        payload: {
          contentText: content,
          mimeType: type === "sandbox" ? "text/html" : "text/plain",
          sourceAgentId: options?.sourceAgentId ?? null,
          sourceMessageId,
          title: options?.title,
          type,
          workspaceId,
        },
        workspaceId,
      });
      this.status = "idle";

      return this.finalizeTransaction(
        "artifact.queue",
        `Artifact ${type} queued for durable sync in workspace ${workspaceId}.`,
        synced(),
      );
    } catch (error) {
      this.status = "idle";

      return this.finalizeTransaction(
        "artifact.queue",
        `Artifact ${type} queue failed for workspace ${workspaceId}.`,
        failed(error),
      );
    }
  }

  async fetchArtifacts(
    workspaceId = "__global__",
    userId?: string,
  ): Promise<ArtifactListResponse> {
    this.status = "syncing";

    try {
      const params = new URLSearchParams({
        workspaceId,
      });
      const response = await nexusApiClient.get<ArtifactListResponse>(
        `/api/v1/artifacts?${params.toString()}`,
        {
          userId,
          workspaceId,
        },
      );
      this.status = "idle";

      return response;
    } catch (error) {
      void error;
      this.status = "idle";

      return emptyArtifactList(workspaceId);
    }
  }

  async fetchPrompts(workspaceId: string): Promise<PromptRecord[]> {
    this.status = "syncing";

    try {
      const accessToken = await resolveStateSyncAccessToken();

      if (!accessToken) {
        this.status = "idle";
        return [];
      }

      const params = new URLSearchParams({ workspaceId });
      const response = await nexusApiClient.get<PromptListResponse>(
        `/api/v1/prompts?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          workspaceId,
        },
      );

      this.status = "idle";

      return response.prompts;
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";

      return [];
    }
  }

  async upsertPrompt(prompt: PromptRecord): Promise<void> {
    this.status = "queued";

    try {
      await localSyncQueueAdapter.enqueue({
        compactKey: `prompt:${prompt.workspace_id}:${prompt.id}:upsert`,
        entityId: prompt.id,
        entityType: "prompt",
        operationType: "upsert",
        payload: { ...prompt },
        workspaceId: prompt.workspace_id,
      });
      this.status = "idle";
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";
    }
  }

  async deletePrompt(id: string, workspaceId = "__global__"): Promise<void> {
    this.status = "queued";

    try {
      await localSyncQueueAdapter.enqueue({
        entityId: id,
        entityType: "prompt",
        operationType: "delete",
        payload: {
          deleted_at: new Date().toISOString(),
          id,
          workspaceId,
        },
        workspaceId,
      });
      this.status = "idle";
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";
    }
  }

  async fetchPromptRevisions(promptId: string): Promise<PromptRevisionRecord[]> {
    this.status = "syncing";

    try {
      const { data, error } = await getNexusSupabaseClient()
        .from("prompt_revisions")
        .select("id,prompt_id,previous_content,new_content,created_at")
        .eq("prompt_id", promptId)
        .order("created_at", { ascending: false });

      this.status = "idle";

      if (error) {
        logSupabaseSyncError(error);
        return [];
      }

      return (data ?? []).map((row) => mapPromptRevision(row as Prompt_Revisions));
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";

      return [];
    }
  }

  async fetchNotebooks(): Promise<NotebookRecord[]> {
    this.status = "syncing";

    try {
      const accessToken = await resolveStateSyncAccessToken();

      if (!accessToken) {
        this.status = "idle";
        return [];
      }

      const response = await nexusApiClient.get<NotebookListResponse>(
        "/api/v1/notebooks",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      this.status = "idle";

      return response.notebooks;
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";

      return [];
    }
  }

  async upsertNotebook(notebook: NotebookRecord, workspaceId = notebook.workspace_id ?? "__global__"): Promise<void> {
    this.status = "queued";

    try {
      await localSyncQueueAdapter.enqueue({
        compactKey: `notebook:${workspaceId}:${notebook.id}:upsert`,
        entityId: notebook.id,
        entityType: "notebook",
        operationType: "upsert",
        payload: {
          ...notebook,
          workspace_id: workspaceId,
        },
        workspaceId,
      });
      this.status = "idle";
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";
    }
  }

  async deleteNotebook(
    id: string,
    workspaceId = "__global__",
    notebook?: NotebookRecord | null,
  ): Promise<void> {
    this.status = "queued";

    try {
      const deletedAt = notebook?.deleted_at ?? new Date().toISOString();
      await localSyncQueueAdapter.enqueue({
        entityId: id,
        entityType: "notebook",
        operationType: "delete",
        payload: {
          created_at: notebook?.created_at ?? null,
          deleted_at: deletedAt,
          id,
          workspaceId,
        },
        workspaceId,
      });
      this.status = "idle";
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";
    }
  }

  async fetchLatestWorkspaceRecoveryState(input: {
    localChecksum?: string | null;
    localUpdatedAt?: string | null;
    localWorkspaceId?: string | null;
    userId: string;
  }): Promise<WorkspaceRecoveryStateResponse> {
    this.status = "syncing";

    try {
      const accessToken = await resolveStateSyncAccessToken();
      const searchParams = new URLSearchParams();

      if (input.localChecksum) {
        searchParams.set("localChecksum", input.localChecksum);
      }

      if (input.localUpdatedAt) {
        searchParams.set("localUpdatedAt", input.localUpdatedAt);
      }

      if (input.localWorkspaceId) {
        searchParams.set("localWorkspaceId", input.localWorkspaceId);
      }

      const query = searchParams.toString();
      const response = await nexusApiClient.get<WorkspaceRecoveryStateResponse>(
        `/api/v1/workspaces/recovery/latest${query ? `?${query}` : ""}`,
        {
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : undefined,
          workspaceId: input.localWorkspaceId ?? "__global__",
        },
      );

      this.status = "idle";

      return response;
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";

      return {
        latest: null,
        plan: null,
        userId: input.userId,
      };
    }
  }

  async fetchWorkspaceRecoveryList(input: {
    localChecksum?: string | null;
    userId: string;
  }): Promise<WorkspaceRecoveryListResponse> {
    this.status = "syncing";

    try {
      const accessToken = await resolveStateSyncAccessToken();
      const searchParams = new URLSearchParams();

      if (input.localChecksum) {
        searchParams.set("localChecksum", input.localChecksum);
      }

      const query = searchParams.toString();
      const response = await nexusApiClient.get<WorkspaceRecoveryListResponse>(
        `/api/v1/workspaces/recovery${query ? `?${query}` : ""}`,
        {
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : undefined,
          workspaceId: "__global__",
        },
      );

      this.status = "idle";

      return response;
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";

      return {
        items: [],
        localChecksum: input.localChecksum ?? null,
        userId: input.userId,
      };
    }
  }

  async fetchWorkspaceRecoveryState(input: {
    localChecksum?: string | null;
    localUpdatedAt?: string | null;
    localWorkspaceId?: string | null;
    userId: string;
    workspaceId: string;
  }): Promise<WorkspaceRecoveryStateResponse> {
    this.status = "syncing";

    try {
      const accessToken = await resolveStateSyncAccessToken();
      const searchParams = new URLSearchParams();

      if (input.localChecksum) {
        searchParams.set("localChecksum", input.localChecksum);
      }

      if (input.localUpdatedAt) {
        searchParams.set("localUpdatedAt", input.localUpdatedAt);
      }

      if (input.localWorkspaceId) {
        searchParams.set("localWorkspaceId", input.localWorkspaceId);
      }

      const query = searchParams.toString();
      const response = await nexusApiClient.get<WorkspaceRecoveryStateResponse>(
        `/api/v1/workspaces/recovery/${encodeURIComponent(input.workspaceId)}${query ? `?${query}` : ""}`,
        {
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : undefined,
          workspaceId: input.workspaceId,
        },
      );

      this.status = "idle";

      return response;
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";

      return {
        latest: null,
        plan: null,
        userId: input.userId,
      };
    }
  }

  async ensureWorkspaceSession(
    input: WorkspaceSessionEnsureRequest & { userId: string },
    accessTokenOverride?: string | null,
  ): Promise<WorkspaceSessionEnsureResponse | null> {
    this.status = "syncing";
    let accessToken: string | null = accessTokenOverride?.trim() || null;

    try {
      accessToken ??= await resolveStateSyncAccessToken();

      if (!accessToken) {
        this.status = "idle";

        return null;
      }

      const response = await nexusApiClient.post<
        WorkspaceSessionEnsureResponse,
        WorkspaceSessionEnsureRequest
      >(
        "/api/v1/workspaces/session",
        {
          preferredWorkspaceId: input.preferredWorkspaceId ?? null,
          preferredWorkspaceName: input.preferredWorkspaceName ?? null,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          idempotencyKey: [
            "workspace_session",
            input.userId,
            input.preferredWorkspaceId?.trim() || "none",
          ].join("_"),
          workspaceId: input.preferredWorkspaceId ?? "__global__",
        },
      );

      this.status = "idle";

      return response;
    } catch (error) {
      logSupabaseSyncError(error);

      if (accessToken) {
        try {
          const fallback = await ensureWorkspaceSessionViaSupabaseRpc(
            input,
            accessToken,
          );

          if (fallback) {
            this.status = "idle";

            return fallback;
          }
        } catch (fallbackError) {
          logSupabaseSyncError(fallbackError);
        }
      }

      this.status = "idle";

      return null;
    }
  }

  async syncActiveUiState(
    snapshot: ActiveUiStateSnapshot,
  ): Promise<StateSyncResult> {
    try {
      const baseChecksum = await this.resolveWorkspaceBaseChecksum(snapshot.id);
      const payload = serializeActiveUiStateSnapshot(snapshot, baseChecksum);
      const payloadSizeBytes = calculateWorkspaceSnapshotPayloadSizeBytes(payload);

      if (payloadSizeBytes > MAX_WORKSPACE_SNAPSHOT_BYTES) {
        return this.finalizeTransaction(
          "workspace.snapshot.skip",
          `Workspace ${snapshot.id} snapshot exceeded the V3 payload size cap.`,
          failed(
            new Error(
              `Workspace snapshot exceeds ${MAX_WORKSPACE_SNAPSHOT_BYTES} bytes.`,
            ),
          ),
        );
      }

      const checksum = await computeWorkspaceSnapshotChecksum(payload);

      if (baseChecksum === checksum) {
        await localSyncQueueAdapter.compactWorkspaceSnapshotIssues(snapshot.id);
        return synced();
      }

      const clientMutationId = createClientMutationId();
      this.pendingWorkspaceSnapshotSync = {
        body: {
          baseChecksum,
          clientMutationId,
          schemaVersion: WORKSPACE_CLOUD_SNAPSHOT_SCHEMA_VERSION,
          snapshot: payload,
          snapshotType: "active",
        },
        checksum,
        idempotencyKey: clientMutationId,
        payloadSizeBytes,
        workspaceId: snapshot.id,
      };

      if (this.workspaceSnapshotSyncTimeout) {
        clearTimeout(this.workspaceSnapshotSyncTimeout);
      }

      this.status = "queued";
      this.workspaceSnapshotSyncTimeout = setTimeout(() => {
        void this.flushWorkspaceSnapshotSync();
      }, WORKSPACE_SNAPSHOT_DEBOUNCE_MS);

      return synced();
    } catch (error) {
      return failed(error);
    }
  }

  async syncHistoricalMessage(
    record: HistoricalMessageRecord,
  ): Promise<StateSyncResult> {
    this.status = "queued";

    try {
      await localSyncQueueAdapter.enqueue({
        compactKey: `message:${record.workspaceId}:${record.message.id}:historical`,
        entityId: record.message.id,
        entityType: "message",
        operationType: "upsert",
        payload: {
          agentId: record.agentId,
          message: record.message,
          workspaceId: record.workspaceId,
        },
        workspaceId: record.workspaceId,
      });
      this.status = "idle";

      return this.finalizeTransaction(
        "sync.queue.historical_message",
        `Historical message ${record.message.id} queued for durable sync.`,
        synced(),
      );
    } catch (error) {
      this.status = "idle";

      return this.finalizeTransaction(
        "sync.queue.historical_message",
        `Historical message ${record.message.id} queue failed.`,
        failed(error),
      );
    }
  }

  async syncHistoricalArtifact(
    record: HistoricalArtifactRecord,
  ): Promise<StateSyncResult> {
    this.status = "queued";

    try {
      await localSyncQueueAdapter.enqueue({
        compactKey: `artifact:${record.workspaceId}:${record.id}:historical`,
        entityId: record.id,
        entityType: "artifact",
        operationType: "upsert",
        payload: {
          artifact: record.artifact,
          id: record.id,
          sourceMessageId: record.sourceMessageId,
          workspaceId: record.workspaceId,
        },
        workspaceId: record.workspaceId,
      });
      this.status = "idle";

      return this.finalizeTransaction(
        "sync.queue.historical_artifact",
        `Historical artifact ${record.id} queued for durable sync.`,
        synced(),
      );
    } catch (error) {
      this.status = "idle";

      return this.finalizeTransaction(
        "sync.queue.historical_artifact",
        `Historical artifact ${record.id} queue failed.`,
        failed(error),
      );
    }
  }

  async flush(): Promise<StateSyncResult> {
    await this.flushWorkspaceSnapshotSync();

    return synced();
  }

  private async resolveWorkspaceBaseChecksum(workspaceId: string) {
    const cached = this.lastCloudSnapshotChecksums.get(workspaceId);

    if (cached) {
      return cached;
    }

    const remoteChecksum = await this.fetchRemoteWorkspaceChecksum(workspaceId);

    if (remoteChecksum) {
      this.lastCloudSnapshotChecksums.set(workspaceId, remoteChecksum);
    }

    return remoteChecksum;
  }

  private async fetchRemoteWorkspaceChecksum(workspaceId: string) {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const accessToken = await resolveStateSyncAccessToken();

      if (!accessToken) {
        return null;
      }

      const userId = await resolveStateSyncUserId();
      const response = await nexusApiClient.get<WorkspaceStateGetResponse>(
        `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/state`,
        {
          accessToken,
          userId,
          workspaceId,
        },
      );

      return response.checksum;
    } catch (error) {
      if (
        error instanceof NexusApiError &&
        [
          "AUTH_REQUIRED",
          "WORKSPACE_STATE_NOT_FOUND",
          "PERMISSION_DENIED",
          "WORKSPACE_ACCESS_DENIED",
        ].includes(error.code)
      ) {
        return null;
      }

      logSupabaseSyncError(error);

      return null;
    }
  }

  private async flushWorkspaceSnapshotSync() {
    const pending = this.pendingWorkspaceSnapshotSync;

    if (!pending) {
      return;
    }

    this.pendingWorkspaceSnapshotSync = undefined;

    if (this.workspaceSnapshotSyncTimeout) {
      clearTimeout(this.workspaceSnapshotSyncTimeout);
      this.workspaceSnapshotSyncTimeout = undefined;
    }

    this.status = "syncing";

    try {
      await localSyncQueueAdapter.enqueue({
        clientMutationId: pending.idempotencyKey,
        compactKey: `workspace:${pending.workspaceId}:snapshot`,
        entityId: pending.workspaceId,
        entityType: "workspace",
        operationType: "snapshot",
        payload: pending.body,
        workspaceId: pending.workspaceId,
      });
      this.lastCloudSnapshotChecksums.set(pending.workspaceId, pending.checksum);
      this.status = "idle";
      this.finalizeTransaction(
        "workspace.snapshot.sync",
        `Workspace ${pending.workspaceId} snapshot queued (${pending.payloadSizeBytes} bytes).`,
        synced(),
      );
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";
      this.finalizeTransaction(
        "workspace.snapshot.sync",
        `Workspace ${pending.workspaceId} snapshot sync failed.`,
        failed(error),
      );
    }
  }
}

export const mockAsyncDataFetcher = new MockAsyncDataFetcher();
export const mockStateSyncManager = new MockStateSyncManager();
export const supabaseStateSyncManager = new SupabaseStateSyncManager();
