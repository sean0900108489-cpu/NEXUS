import type { SupabaseClient } from "@supabase/supabase-js";

import type { PromptRecord, PromptRevisionRecord } from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  PromptRevisionInsert,
  Prompt_Revisions,
  Prompts,
  PromptUpsert,
} from "@/lib/supabase/database.types";

export type UpsertPromptInput = {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  revisions?: RecordPromptRevisionInput[];
};

export type DeletePromptInput = {
  id: string;
  workspaceId: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
};

export type ListVisiblePromptsInput = {
  limit?: number;
  userId: string;
  workspaceId: string;
};

export type RecordPromptRevisionInput = {
  createdAt?: string | null;
  id: string;
  newContent: string;
  previousContent: string;
  promptId: string;
};

export interface PromptRepository {
  findById(input: DeletePromptInput): Promise<PromptRecord | null>;
  listRevisions(promptId: string): Promise<PromptRevisionRecord[]>;
  listVisible(input: ListVisiblePromptsInput): Promise<PromptRecord[]>;
  recordRevisions(input: RecordPromptRevisionInput[]): Promise<void>;
  upsert(input: UpsertPromptInput): Promise<PromptRecord>;
  deleteById(input: DeletePromptInput): Promise<PromptRecord>;
}

export class InMemoryPromptRepository implements PromptRepository {
  private readonly prompts = new Map<string, PromptRecord>();
  private readonly revisions = new Map<string, PromptRevisionRecord>();

  async findById(input: DeletePromptInput) {
    return this.prompts.get(createPromptKey(input.workspaceId, input.id)) ?? null;
  }

  async listRevisions(promptId: string) {
    return [...this.revisions.values()]
      .filter((revision) => revision.prompt_id === promptId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async listVisible(input: ListVisiblePromptsInput) {
    return [...this.prompts.values()]
      .filter((prompt) => prompt.workspace_id === input.workspaceId)
      .filter((prompt) => !prompt.deleted_at)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .slice(0, input.limit ?? 100);
  }

  async recordRevisions(input: RecordPromptRevisionInput[]) {
    for (const revision of input) {
      this.revisions.set(revision.id, {
        created_at: revision.createdAt ?? new Date().toISOString(),
        id: revision.id,
        new_content: revision.newContent,
        previous_content: revision.previousContent,
        prompt_id: revision.promptId,
      });
    }
  }

  async upsert(input: UpsertPromptInput) {
    const key = createPromptKey(input.workspaceId, input.id);
    const existing = this.prompts.get(key);
    const now = new Date().toISOString();
    const prompt: PromptRecord = {
      content: input.content,
      created_at: input.createdAt ?? existing?.created_at ?? now,
      deleted_at: null,
      deleted_by: null,
      id: input.id,
      title: input.title,
      updated_at: input.updatedAt ?? now,
      workspace_id: input.workspaceId,
    };

    this.prompts.set(key, prompt);

    return prompt;
  }

  async deleteById(input: DeletePromptInput) {
    const key = createPromptKey(input.workspaceId, input.id);
    const existing = this.prompts.get(key);
    const deletedAt = existing?.deleted_at ?? input.deletedAt ?? new Date().toISOString();
    const tombstone: PromptRecord = {
      content: existing?.content ?? "",
      created_at: existing?.created_at ?? deletedAt,
      deleted_at: deletedAt,
      deleted_by: existing?.deleted_by ?? input.deletedBy ?? null,
      id: input.id,
      title: existing?.title ?? "Deleted Prompt",
      updated_at: existing?.updated_at ?? deletedAt,
      workspace_id: input.workspaceId,
    };

    this.prompts.set(key, tombstone);

    return tombstone;
  }

  clear() {
    this.prompts.clear();
    this.revisions.clear();
  }
}

export class SupabasePromptRepository implements PromptRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(input: DeletePromptInput) {
    const { data, error } = await this.client
      .from("prompts")
      .select("id,workspace_id,title,content,created_at,updated_at,created_by,deleted_at,deleted_by")
      .eq("id", input.id)
      .eq("workspace_id", input.workspaceId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapPrompt(data as Prompts) : null;
  }

  async listRevisions(promptId: string) {
    const { data, error } = await this.client
      .from("prompt_revisions")
      .select("id,prompt_id,previous_content,new_content,created_at")
      .eq("prompt_id", promptId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapPromptRevision(row as Prompt_Revisions));
  }

  async listVisible(input: ListVisiblePromptsInput) {
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 250);
    const hasMembership = await this.userHasWorkspaceMembership(
      input.userId,
      input.workspaceId,
    );

    if (!hasMembership) {
      return [];
    }

    const { data, error } = await this.client
      .from("prompts")
      .select("id,workspace_id,title,content,created_at,updated_at,created_by,deleted_at,deleted_by")
      .eq("workspace_id", input.workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapPrompt(row as Prompts));
  }

  async recordRevisions(input: RecordPromptRevisionInput[]) {
    if (!input.length) {
      return;
    }

    const rows: PromptRevisionInsert[] = input.map((revision) => ({
      created_at: revision.createdAt ?? new Date().toISOString(),
      id: revision.id,
      new_content: revision.newContent,
      previous_content: revision.previousContent,
      prompt_id: revision.promptId,
    }));
    const { error } = await this.client
      .from("prompt_revisions")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      throw new Error(error.message);
    }
  }

  async upsert(input: UpsertPromptInput) {
    const now = new Date().toISOString();
    const row: PromptUpsert = {
      content: input.content,
      created_at: input.createdAt ?? now,
      created_by: input.createdBy ?? null,
      deleted_at: null,
      deleted_by: null,
      id: input.id,
      title: input.title,
      updated_at: input.updatedAt ?? now,
      workspace_id: input.workspaceId,
    };
    const { data, error } = await this.client
      .from("prompts")
      .upsert(row, { onConflict: "id" })
      .select("id,workspace_id,title,content,created_at,updated_at,created_by,deleted_at,deleted_by")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapPrompt(data as Prompts);
  }

  async deleteById(input: DeletePromptInput) {
    const existing = await this.findById(input);
    const deletedAt = existing?.deleted_at ?? input.deletedAt ?? new Date().toISOString();

    if (existing?.deleted_at) {
      return existing;
    }

    const row: PromptUpsert = {
      content: existing?.content ?? "",
      created_at: existing?.created_at ?? deletedAt,
      deleted_at: deletedAt,
      deleted_by: input.deletedBy ?? null,
      id: input.id,
      title: existing?.title ?? "Deleted Prompt",
      updated_at: deletedAt,
      workspace_id: input.workspaceId,
    };
    const { data, error } = await this.client
      .from("prompts")
      .upsert(row, { onConflict: "id" })
      .select("id,workspace_id,title,content,created_at,updated_at,created_by,deleted_at,deleted_by")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapPrompt(data as Prompts);
  }

  private async userHasWorkspaceMembership(userId: string, workspaceId: string) {
    const { data, error } = await this.client
      .from("workspace_memberships")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data);
  }
}

const inMemoryPromptRepository = new InMemoryPromptRepository();

export function createPromptRepository(): PromptRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabasePromptRepository(getNexusSupabaseAdminClient())
    : inMemoryPromptRepository;
}

function mapPrompt(row: Prompts): PromptRecord {
  return {
    content: row.content,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
    id: row.id,
    title: row.title,
    updated_at: row.updated_at,
    workspace_id: row.workspace_id,
  };
}

function mapPromptRevision(row: Prompt_Revisions): PromptRevisionRecord {
  return {
    created_at: row.created_at,
    id: row.id,
    new_content: row.new_content,
    previous_content: row.previous_content,
    prompt_id: row.prompt_id,
  };
}

function createPromptKey(workspaceId: string, id: string) {
  return `${workspaceId}::${id}`;
}
