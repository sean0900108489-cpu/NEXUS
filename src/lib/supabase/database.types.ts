import type {
  AgentCreationCapabilityType,
  AgentMessageRole,
  MediaAgentCapabilityType,
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
}

export type WorkspaceUpsert = Pick<Workspaces, "id" | "name">;

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
}

export type MessageInsert = Pick<
  Messages,
  "agent_id" | "content" | "type" | "workspace_id"
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
}

export type ArtifactInsert = Pick<
  Artifacts,
  "content_url" | "source_message_id" | "type" | "workspace_id"
> &
  Partial<Pick<Artifacts, "created_at" | "id">>;

export interface Workflow_Templates {
  id: string;
  name: string;
  description: string | null;
  blueprint_data: WorkflowTemplateBlueprintData;
  created_at: DatabaseTimestamp;
}

export type WorkflowTemplateInsert = Pick<
  Workflow_Templates,
  "blueprint_data" | "name"
> &
  Partial<Pick<Workflow_Templates, "created_at" | "description" | "id">>;

export interface Prompts {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
}

export type PromptUpsert = Pick<
  Prompts,
  "content" | "id" | "title" | "workspace_id"
> &
  Partial<Pick<Prompts, "created_at" | "updated_at">>;

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
      agent_profiles: TableDefinition<Agent_Profiles>;
      workspace_agents: TableDefinition<Workspace_Agents>;
      messages: TableDefinition<Messages, MessageInsert>;
      artifacts: TableDefinition<Artifacts, ArtifactInsert>;
      prompts: TableDefinition<Prompts, PromptUpsert>;
      prompt_revisions: TableDefinition<
        Prompt_Revisions,
        PromptRevisionInsert
      >;
      workflow_templates: TableDefinition<
        Workflow_Templates,
        WorkflowTemplateInsert
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      agent_profile_type: AgentCreationCapabilityType;
      message_type: AgentMessageRole;
      artifact_type: ArtifactType;
    };
    CompositeTypes: Record<string, never>;
  };
};
