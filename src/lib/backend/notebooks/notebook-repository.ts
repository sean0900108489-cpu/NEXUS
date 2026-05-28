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
  workspaceId: string | null;
  title: string;
  content: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
};

export type DeleteNotebookInput = {
  id: string;
  workspaceId: string | null;
  createdAt?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
};

export type DeleteNotebookResult = {
  deleted: boolean;
  id: string;
  tombstone: NotebookRecord;
  workspaceId: string | null;
};

export type ListVisibleNotebooksInput = {
  limit?: number;
  userId: string;
  workspaceId?: string | null;
};

export interface NotebookRepository {
  findById(input: DeleteNotebookInput): Promise<NotebookRecord | null>;
  listVisible(input: ListVisibleNotebooksInput): Promise<NotebookRecord[]>;
  upsert(input: UpsertNotebookInput): Promise<NotebookRecord>;
  deleteById(input: DeleteNotebookInput): Promise<DeleteNotebookResult>;
}

export class InMemoryNotebookRepository implements NotebookRepository {
  private readonly notebooks = new Map<string, NotebookRecord>();

  async findById(input: DeleteNotebookInput) {
    return (
      this.notebooks.get(
        createNotebookKey(normalizeNotebookWorkspaceId(input.workspaceId), input.id),
      ) ?? null
    );
  }

  async listVisible(input: ListVisibleNotebooksInput) {
    const workspaceId = normalizeNotebookWorkspaceId(input.workspaceId ?? null);

    return [...this.notebooks.values()]
      .filter((notebook) => !notebook.deleted_at)
      .filter((notebook) => {
        const notebookWorkspaceId = normalizeNotebookWorkspaceId(
          notebook.workspace_id ?? null,
        );

        if (notebookWorkspaceId === null) {
          return notebook.created_by === input.userId;
        }

        return workspaceId ? notebookWorkspaceId === workspaceId : true;
      })
      .sort((left, right) =>
        (right.updated_at ?? right.created_at ?? "").localeCompare(
          left.updated_at ?? left.created_at ?? "",
        ),
      )
      .slice(0, input.limit ?? 100);
  }

  async upsert(input: UpsertNotebookInput) {
    const workspaceId = normalizeNotebookWorkspaceId(input.workspaceId);
    const key = createNotebookKey(workspaceId, input.id);
    const existing = this.notebooks.get(key);
    const now = new Date().toISOString();
    const notebook: NotebookRecord = {
      id: input.id,
      workspace_id: workspaceId,
      title: input.title,
      content: input.content,
      created_at: input.createdAt ?? existing?.created_at ?? now,
      created_by: input.createdBy ?? existing?.created_by ?? null,
      deleted_at: null,
      deleted_by: null,
      updated_at: input.updatedAt ?? now,
    };

    this.notebooks.set(key, notebook);

    return notebook;
  }

  async deleteById(input: DeleteNotebookInput) {
    const workspaceId = normalizeNotebookWorkspaceId(input.workspaceId);
    const key = createNotebookKey(workspaceId, input.id);
    const existing = this.notebooks.get(key);

    if (existing?.deleted_at) {
      return {
        deleted: false,
        id: input.id,
        tombstone: existing,
        workspaceId,
      };
    }

    const deletedAt = input.deletedAt ?? new Date().toISOString();
    const tombstone: NotebookRecord = {
      content: existing?.content ?? "",
      created_at: input.createdAt ?? existing?.created_at ?? deletedAt,
      created_by: existing?.created_by ?? input.deletedBy ?? null,
      deleted_at: deletedAt,
      deleted_by: input.deletedBy ?? null,
      id: input.id,
      title: existing?.title ?? "Deleted Datapad",
      updated_at: deletedAt,
      workspace_id: workspaceId,
    };

    this.notebooks.set(key, tombstone);

    return {
      deleted: Boolean(existing),
      id: input.id,
      tombstone,
      workspaceId,
    };
  }

  clear() {
    this.notebooks.clear();
  }
}

export class SupabaseNotebookRepository implements NotebookRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(input: DeleteNotebookInput) {
    let query = this.client
      .from("notebooks")
      .select("id,workspace_id,title,content,created_at,updated_at,created_by,deleted_at,deleted_by")
      .eq("id", input.id);
    const workspaceId = normalizeNotebookWorkspaceId(input.workspaceId);

    query = workspaceId === null
      ? query.is("workspace_id", null)
      : query.eq("workspace_id", workspaceId);

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapNotebook(data) : null;
  }

  async upsert(input: UpsertNotebookInput) {
    const now = new Date().toISOString();
    const workspaceId = normalizeNotebookWorkspaceId(input.workspaceId);
    const row: NotebookUpsert = {
      content: input.content,
      created_at: input.createdAt ?? now,
      created_by: input.createdBy ?? null,
      deleted_at: null,
      deleted_by: null,
      id: input.id,
      title: input.title,
      updated_at: input.updatedAt ?? now,
      workspace_id: workspaceId,
    };
    const { data, error } = await this.client
      .from("notebooks")
      .upsert(row, { onConflict: "id" })
      .select("id,workspace_id,title,content,created_at,updated_at,created_by,deleted_at,deleted_by")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapNotebook(data);
  }

  async listVisible(input: ListVisibleNotebooksInput) {
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 250);
    const workspaceId = normalizeNotebookWorkspaceId(input.workspaceId ?? null);

    if (workspaceId) {
      const hasMembership = await this.userHasWorkspaceMembership(
        input.userId,
        workspaceId,
      );

      if (!hasMembership) {
        return [];
      }

      const { data, error } = await this.client
        .from("notebooks")
        .select("id,workspace_id,title,content,created_at,updated_at,created_by,deleted_at,deleted_by")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message);
      }

      const visible = (data ?? []).map((row) => mapNotebook(row as Notebooks));
      const globalRows = await this.listGlobalRowsForUser(input.userId, limit);
      visible.push(...globalRows);

      return sortVisibleNotebooks(visible).slice(0, limit);
    }

    const workspaceIds = await this.listWorkspaceIdsForUser(input.userId);
    const visible: NotebookRecord[] = [];

    if (workspaceIds.length) {
      const { data, error } = await this.client
        .from("notebooks")
        .select("id,workspace_id,title,content,created_at,updated_at,created_by,deleted_at,deleted_by")
        .in("workspace_id", workspaceIds)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message);
      }

      visible.push(...(data ?? []).map((row) => mapNotebook(row as Notebooks)));
    }

    const globalRows = await this.listGlobalRowsForUser(input.userId, limit);
    visible.push(...globalRows);

    return sortVisibleNotebooks(visible).slice(0, limit);
  }

  async deleteById(input: DeleteNotebookInput) {
    const workspaceId = normalizeNotebookWorkspaceId(input.workspaceId);
    const existing = await this.findById(input);

    if (existing?.deleted_at) {
      return {
        deleted: false,
        id: input.id,
        tombstone: existing,
        workspaceId,
      };
    }

    const deletedAt = input.deletedAt ?? new Date().toISOString();
    const patch = {
      deleted_at: deletedAt,
      deleted_by: input.deletedBy ?? null,
      updated_at: deletedAt,
    };
    let updateQuery = this.client
      .from("notebooks")
      .update(patch)
      .eq("id", input.id);
    updateQuery = workspaceId === null
      ? updateQuery.is("workspace_id", null)
      : updateQuery.eq("workspace_id", workspaceId);
    const { data, error } = await updateQuery
      .select("id,workspace_id,title,content,created_at,updated_at,created_by,deleted_at,deleted_by");

    if (error) {
      throw new Error(error.message);
    }

    const updated = data?.[0];

    if (updated) {
      return {
        deleted: Boolean(existing),
        id: input.id,
        tombstone: mapNotebook(updated as Notebooks),
        workspaceId,
      };
    }

    const row: NotebookUpsert = {
      content: "",
      created_at: input.createdAt ?? deletedAt,
      created_by: input.deletedBy ?? null,
      deleted_at: deletedAt,
      deleted_by: input.deletedBy ?? null,
      id: input.id,
      title: "Deleted Datapad",
      updated_at: deletedAt,
      workspace_id: workspaceId,
    };
    const { data: inserted, error: insertError } = await this.client
      .from("notebooks")
      .upsert(row, { onConflict: "id" })
      .select("id,workspace_id,title,content,created_at,updated_at,created_by,deleted_at,deleted_by")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return {
      deleted: false,
      id: input.id,
      tombstone: mapNotebook(inserted as Notebooks),
      workspaceId,
    };
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

  private async listWorkspaceIdsForUser(userId: string) {
    const { data, error } = await this.client
      .from("workspace_memberships")
      .select("workspace_id")
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? [])
      .map((membership) => membership.workspace_id)
      .filter((workspaceId): workspaceId is string => Boolean(workspaceId));
  }

  private async listGlobalRowsForUser(userId: string, limit: number) {
    const { data, error } = await this.client
      .from("notebooks")
      .select("id,workspace_id,title,content,created_at,updated_at,created_by,deleted_at,deleted_by")
      .is("workspace_id", null)
      .eq("created_by", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapNotebook(row as Notebooks));
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
    created_by: row.created_by,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
    id: row.id,
    title: row.title,
    updated_at: row.updated_at,
    workspace_id: row.workspace_id,
  };
}

function createNotebookKey(workspaceId: string | null, id: string) {
  return `${workspaceId ?? "__global__"}::${id}`;
}

function normalizeNotebookWorkspaceId(workspaceId: string | null | undefined) {
  if (workspaceId === null || workspaceId === undefined) {
    return null;
  }

  const trimmed = workspaceId.trim();
  return trimmed === "__global__" ? null : trimmed;
}

function sortVisibleNotebooks(notebooks: NotebookRecord[]) {
  return notebooks.sort((left, right) =>
    (right.updated_at ?? right.created_at ?? "").localeCompare(
      left.updated_at ?? left.created_at ?? "",
    ),
  );
}
