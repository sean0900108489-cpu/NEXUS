import type { SupabaseClient } from "@supabase/supabase-js";

import type { ToolPermissionRecord } from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  ToolPermissionInsert,
  Tool_Permissions,
} from "@/lib/supabase/database.types";

export type FindToolPermissionInput = {
  workspaceId: string;
  toolId: string;
  scope: string;
};

export type UpsertToolPermissionInput = FindToolPermissionInput & {
  enabled: boolean;
  requiresConfirmation: boolean;
};

export interface ToolPermissionRepository {
  find(input: FindToolPermissionInput): Promise<ToolPermissionRecord | null>;
  upsert(input: UpsertToolPermissionInput): Promise<ToolPermissionRecord>;
}

export class InMemoryToolPermissionRepository implements ToolPermissionRepository {
  private readonly permissions = new Map<string, ToolPermissionRecord>();

  async find(input: FindToolPermissionInput) {
    return this.permissions.get(makeKey(input)) ?? null;
  }

  async upsert(input: UpsertToolPermissionInput) {
    const now = new Date().toISOString();
    const key = makeKey(input);
    const existing = this.permissions.get(key);
    const record: ToolPermissionRecord = {
      createdAt: existing?.createdAt ?? now,
      enabled: input.enabled,
      id: existing?.id ?? makeUuid(),
      requiresConfirmation: input.requiresConfirmation,
      scope: input.scope,
      toolId: input.toolId,
      updatedAt: now,
      workspaceId: input.workspaceId,
    };

    this.permissions.set(key, record);

    return record;
  }
}

export class SupabaseToolPermissionRepository implements ToolPermissionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async find(input: FindToolPermissionInput) {
    const { data, error } = await this.client
      .from("tool_permissions")
      .select("*")
      .eq("workspace_id", input.workspaceId)
      .eq("tool_id", input.toolId)
      .eq("scope", input.scope)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapPermission(data) : null;
  }

  async upsert(input: UpsertToolPermissionInput) {
    const row: ToolPermissionInsert = {
      enabled: input.enabled,
      requires_confirmation: input.requiresConfirmation,
      scope: input.scope,
      tool_id: input.toolId,
      workspace_id: input.workspaceId,
    };
    const { data, error } = await this.client
      .from("tool_permissions")
      .upsert(row, {
        onConflict: "workspace_id,tool_id,scope",
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapPermission(data);
  }
}

const inMemoryToolPermissionRepository = new InMemoryToolPermissionRepository();

export function createToolPermissionRepository(): ToolPermissionRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseToolPermissionRepository(getNexusSupabaseAdminClient())
    : inMemoryToolPermissionRepository;
}

function mapPermission(row: Tool_Permissions): ToolPermissionRecord {
  return {
    createdAt: row.created_at,
    enabled: row.enabled,
    id: row.id,
    requiresConfirmation: row.requires_confirmation,
    scope: row.scope,
    toolId: row.tool_id,
    updatedAt: row.updated_at,
    workspaceId: row.workspace_id,
  };
}

function makeKey(input: FindToolPermissionInput) {
  return `${input.workspaceId}\u0000${input.toolId}\u0000${input.scope}`;
}

function makeUuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
