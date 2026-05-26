import type {
  ActiveUiStateSnapshot,
  AgentMessage,
  ArtifactVaultRecord,
  HistoricalArtifactRecord,
  HistoricalDataPage,
  HistoricalDataQuery,
  HistoricalMessageRecord,
  IAsyncDataFetcher,
  IStateSyncManager,
  ITransactionLog,
  PromptRecord,
  PromptRevisionRecord,
  StateSyncResult,
  StateSyncStatus,
  WorkflowTemplateBlueprintData,
  WorkflowTemplateRecord,
} from "@/lib/nexus-types";
import { getNexusSupabaseClient } from "@/lib/supabase/client";
import type {
  ArtifactInsert,
  Artifacts,
  MessageInsert,
  PromptRevisionInsert,
  PromptUpsert,
  Prompt_Revisions,
  Prompts,
  WorkflowTemplateInsert,
  Workflow_Templates,
  WorkspaceUpsert,
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
  console.error("[Supabase Sync Error]:", error);
}

type TransactionLogger = (entry: ITransactionLog) => void;

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

function mapArtifact(row: Artifacts): ArtifactVaultRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    sourceMessageId: row.source_message_id,
    contentUrl: row.content_url,
    type: row.type,
    createdAt: row.created_at,
  };
}

function mapPrompt(row: Prompts): PromptRecord {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    title: row.title,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
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
    contentUrl: string,
    type: string,
  ): Promise<StateSyncResult> {
    void workspaceId;
    void sourceMessageId;
    void contentUrl;
    void type;
    this.status = "syncing";
    const result = synced();
    this.status = "idle";

    return result;
  }

  async fetchArtifacts(): Promise<ArtifactVaultRecord[]> {
    return [];
  }

  async fetchPrompts(workspaceId: string): Promise<PromptRecord[]> {
    void workspaceId;

    return [];
  }

  async upsertPrompt(prompt: PromptRecord): Promise<void> {
    void prompt;
  }

  async deletePrompt(id: string): Promise<void> {
    void id;
  }

  async fetchPromptRevisions(promptId: string): Promise<PromptRevisionRecord[]> {
    void promptId;

    return [];
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
    this.status = "syncing";

    try {
      const payload: WorkspaceUpsert = {
        id: workspaceId,
        name,
      };
      const { error } = await getNexusSupabaseClient()
        .from("workspaces")
        .upsert(payload, { onConflict: "id" });

      this.status = "idle";

      return this.finalizeTransaction(
        "supabase.upsertWorkspace",
        `Workspace ${workspaceId} (${name}) upserted.`,
        error ? failed(error) : synced(),
      );
    } catch (error) {
      this.status = "idle";

      return this.finalizeTransaction(
        "supabase.upsertWorkspace",
        `Workspace ${workspaceId} (${name}) upsert failed.`,
        failed(error),
      );
    }
  }

  async insertMessage(
    workspaceId: string,
    agentId: string,
    message: AgentMessage,
  ): Promise<StateSyncResult> {
    this.status = "syncing";

    try {
      const payload: MessageInsert = {
        agent_id: agentId,
        content: message.content,
        type: message.role,
        workspace_id: workspaceId,
      };
      const { error } = await getNexusSupabaseClient()
        .from("messages")
        .insert(payload);

      this.status = "idle";

      return this.finalizeTransaction(
        "supabase.insertMessage",
        `Message ${message.id} synced for agent ${agentId} in workspace ${workspaceId}.`,
        error ? failed(error) : synced(),
      );
    } catch (error) {
      this.status = "idle";

      return this.finalizeTransaction(
        "supabase.insertMessage",
        `Message ${message.id} sync failed for agent ${agentId}.`,
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
    contentUrl: string,
    type: string,
  ): Promise<StateSyncResult> {
    this.status = "syncing";

    try {
      const payload: ArtifactInsert = {
        content_url: contentUrl,
        source_message_id: sourceMessageId,
        type,
        workspace_id: workspaceId,
      };
      const { error } = await getNexusSupabaseClient()
        .from("artifacts")
        .insert(payload);

      this.status = "idle";

      return this.finalizeTransaction(
        "supabase.saveArtifact",
        `Artifact ${type} saved for workspace ${workspaceId}.`,
        error ? failed(error) : synced(),
      );
    } catch (error) {
      this.status = "idle";

      return this.finalizeTransaction(
        "supabase.saveArtifact",
        `Artifact ${type} save failed for workspace ${workspaceId}.`,
        failed(error),
      );
    }
  }

  async fetchArtifacts(): Promise<ArtifactVaultRecord[]> {
    this.status = "syncing";

    try {
      const { data, error } = await getNexusSupabaseClient()
        .from("artifacts")
        .select("id,workspace_id,source_message_id,content_url,type,created_at")
        .order("created_at", { ascending: false });

      this.status = "idle";

      if (error) {
        return [];
      }

      return (data ?? []).map((row) => mapArtifact(row as Artifacts));
    } catch (error) {
      void error;
      this.status = "idle";

      return [];
    }
  }

  async fetchPrompts(workspaceId: string): Promise<PromptRecord[]> {
    this.status = "syncing";

    try {
      const { data, error } = await getNexusSupabaseClient()
        .from("prompts")
        .select("id,workspace_id,title,content,created_at,updated_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });

      this.status = "idle";

      if (error) {
        logSupabaseSyncError(error);
        return [];
      }

      return (data ?? []).map((row) => mapPrompt(row as Prompts));
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";

      return [];
    }
  }

  async upsertPrompt(prompt: PromptRecord): Promise<void> {
    this.status = "syncing";

    try {
      const client = getNexusSupabaseClient();
      const { data: existingRows, error: existingError } = await client
        .from("prompts")
        .select("content")
        .eq("id", prompt.id)
        .limit(1);

      if (existingError) {
        logSupabaseSyncError(existingError);
      }

      const previousContent = (existingRows?.[0] as Pick<Prompts, "content"> | undefined)
        ?.content;
      const payload: PromptUpsert = {
        content: prompt.content,
        created_at: prompt.created_at,
        id: prompt.id,
        title: prompt.title,
        updated_at: prompt.updated_at,
        workspace_id: prompt.workspace_id,
      };
      const { error } = await client
        .from("prompts")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        logSupabaseSyncError(error);
        this.status = "idle";
        return;
      }

      if (
        typeof previousContent === "string" &&
        previousContent !== prompt.content
      ) {
        const revision: PromptRevisionInsert = {
          new_content: prompt.content,
          previous_content: previousContent,
          prompt_id: prompt.id,
        };
        const { error: revisionError } = await client
          .from("prompt_revisions")
          .insert(revision);

        if (revisionError) {
          logSupabaseSyncError(revisionError);
        }
      }

      this.status = "idle";
    } catch (error) {
      logSupabaseSyncError(error);
      this.status = "idle";
    }
  }

  async deletePrompt(id: string): Promise<void> {
    this.status = "syncing";

    try {
      const client = getNexusSupabaseClient();
      const { error: revisionError } = await client
        .from("prompt_revisions")
        .delete()
        .eq("prompt_id", id);

      if (revisionError) {
        logSupabaseSyncError(revisionError);
      }

      const { error } = await client.from("prompts").delete().eq("id", id);

      if (error) {
        logSupabaseSyncError(error);
      }

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

  async syncActiveUiState(
    snapshot: ActiveUiStateSnapshot,
  ): Promise<StateSyncResult> {
    return this.upsertWorkspace(snapshot.id, snapshot.name);
  }

  async syncHistoricalMessage(
    record: HistoricalMessageRecord,
  ): Promise<StateSyncResult> {
    void record;

    return synced();
  }

  async syncHistoricalArtifact(
    record: HistoricalArtifactRecord,
  ): Promise<StateSyncResult> {
    void record;

    return synced();
  }

  async flush(): Promise<StateSyncResult> {
    return synced();
  }
}

export const mockAsyncDataFetcher = new MockAsyncDataFetcher();
export const mockStateSyncManager = new MockStateSyncManager();
export const supabaseStateSyncManager = new SupabaseStateSyncManager();
