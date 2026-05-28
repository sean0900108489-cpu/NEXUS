import type { SupabaseClient } from "@supabase/supabase-js";

import type { NotebookRecord } from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  Notebooks,
  NotebookUpsert,
} from "@/lib/supabase/database.types";

export type UpsertNotebookInput = {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
};

export type DeleteNotebookInput = {
  id: string;
  workspaceId: string;
};

export interface NotebookRepository {
  findById(input: DeleteNotebookInput): Promise<NotebookRecord | null>;
  upsert(input: UpsertNotebookInput): Promise<NotebookRecord>;
  deleteById(input: DeleteNotebookInput): Promise<{ deleted: boolean; id: string; workspaceId: string }>;
}

export class InMemoryNotebookRepository implements NotebookRepository {
  private readonly notebooks = new Map<string, NotebookRecord>();

  async findById(input: DeleteNotebookInput) {
    return this.notebooks.get(createNotebookKey(input.workspaceId, input.id)) ?? null;
  }

  async upsert(input: UpsertNotebookInput) {
    const key = createNotebookKey(input.workspaceId, input.id);
    const existing = this.notebooks.get(key);
    const now = new Date().toISOString();
    const notebook: NotebookRecord = {
      id: input.id,
      workspace_id: input.workspaceId,
      title: input.title,
      content: input.content,
      created_at: input.createdAt ?? existing?.created_at ?? now,
      updated_at: input.updatedAt ?? now,
    };

    this.notebooks.set(key, notebook);

    return notebook;
  }

  async deleteById(input: DeleteNotebookInput) {
    return {
      deleted: this.notebooks.delete(createNotebookKey(input.workspaceId, input.id)),
      id: input.id,
      workspaceId: input.workspaceId,
    };
  }

  clear() {
    this.notebooks.clear();
  }
}

export class SupabaseNotebookRepository implements NotebookRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(input: DeleteNotebookInput) {
    const { data, error } = await this.client
      .from("notebooks")
      .select("id,workspace_id,title,content,created_at,updated_at,created_by")
      .eq("id", input.id)
      .eq("workspace_id", input.workspaceId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapNotebook(data) : null;
  }

  async upsert(input: UpsertNotebookInput) {
    const now = new Date().toISOString();
    const row: NotebookUpsert = {
      content: input.content,
      created_at: input.createdAt ?? now,
      created_by: input.createdBy ?? null,
      id: input.id,
      title: input.title,
      updated_at: input.updatedAt ?? now,
      workspace_id: input.workspaceId,
    };
    const { data, error } = await this.client
      .from("notebooks")
      .upsert(row, { onConflict: "id" })
      .select("id,workspace_id,title,content,created_at,updated_at,created_by")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapNotebook(data);
  }

  async deleteById(input: DeleteNotebookInput) {
    const { data, error } = await this.client
      .from("notebooks")
      .delete()
      .eq("id", input.id)
      .eq("workspace_id", input.workspaceId)
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    return {
      deleted: Boolean(data?.length),
      id: input.id,
      workspaceId: input.workspaceId,
    };
  }
}

const inMemoryNotebookRepository = new InMemoryNotebookRepository();

export function createNotebookRepository(): NotebookRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseNotebookRepository(getNexusSupabaseAdminClient())
    : inMemoryNotebookRepository;
}

export function getInMemoryNotebookRepository() {
  return inMemoryNotebookRepository;
}

function mapNotebook(row: Notebooks): NotebookRecord {
  return {
    content: row.content,
    created_at: row.created_at,
    id: row.id,
    title: row.title,
    updated_at: row.updated_at,
    workspace_id: row.workspace_id,
  };
}

function createNotebookKey(workspaceId: string, id: string) {
  return `${workspaceId}::${id}`;
}
