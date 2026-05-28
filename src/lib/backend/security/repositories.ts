import type { BackendMetadata } from "../primitives/metadata";
import type { UserId, WorkspaceId } from "../primitives/ids";
import type {
  PermissionAuditLogInsert,
  Workspace_Memberships,
} from "@/lib/supabase/database.types";

import { SecretBoundaryService } from "./secret-boundary-service";
import type {
  SecurityAuditLogEntry,
  WorkspaceMembership,
  WorkspaceRole,
} from "./types";

export type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

type SupabaseSingleSelectBuilder<Row> = {
  select(columns?: string): SupabaseSingleSelectBuilder<Row>;
  eq(column: string, value: string): SupabaseSingleSelectBuilder<Row>;
  maybeSingle(): Promise<{ data: Row | null; error: SupabaseErrorLike | null }>;
};

type SupabaseInsertBuilder = {
  insert(values: unknown): Promise<{ error: SupabaseErrorLike | null }>;
};

export type SecuritySupabaseClient = {
  from(table: "workspace_memberships"): SupabaseSingleSelectBuilder<Workspace_Memberships>;
  from(table: "permission_audit_logs"): SupabaseInsertBuilder;
};

export interface WorkspaceMembershipStore {
  findByWorkspaceAndUser(
    workspaceId: WorkspaceId,
    userId: UserId,
  ): Promise<WorkspaceMembership | null>;
}

export class WorkspaceMembershipRepository {
  constructor(private readonly store: WorkspaceMembershipStore) {}

  static fromSupabase(client: SecuritySupabaseClient) {
    return new WorkspaceMembershipRepository(
      new SupabaseWorkspaceMembershipStore(client),
    );
  }

  findByWorkspaceAndUser(workspaceId: WorkspaceId, userId: UserId) {
    return this.store.findByWorkspaceAndUser(workspaceId, userId);
  }
}

export class SupabaseWorkspaceMembershipStore implements WorkspaceMembershipStore {
  constructor(private readonly client: SecuritySupabaseClient) {}

  async findByWorkspaceAndUser(workspaceId: WorkspaceId, userId: UserId) {
    const { data, error } = await this.client
      .from("workspace_memberships")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(sanitizeSupabaseError(error));
    }

    return data ? mapWorkspaceMembership(data) : null;
  }
}

export interface SecurityAuditStore {
  insert(entry: SecurityAuditLogEntry & { metadata: BackendMetadata }): Promise<void>;
}

export class SecurityAuditRepository {
  constructor(
    private readonly store: SecurityAuditStore,
    private readonly secretBoundaryService = new SecretBoundaryService(),
  ) {}

  static fromSupabase(client: SecuritySupabaseClient) {
    return new SecurityAuditRepository(new SupabaseSecurityAuditStore(client));
  }

  async record(entry: SecurityAuditLogEntry): Promise<void> {
    const metadata = this.secretBoundaryService.sanitizeAuditMetadata(
      entry.metadata ?? {},
    );

    await this.store.insert({
      ...entry,
      metadata,
    });
  }
}

export class SupabaseSecurityAuditStore implements SecurityAuditStore {
  constructor(private readonly client: SecuritySupabaseClient) {}

  async insert(entry: SecurityAuditLogEntry & { metadata: BackendMetadata }) {
    const row: PermissionAuditLogInsert = {
      action: entry.action,
      actor_user_id: entry.actorUserId ?? null,
      decision: entry.decision,
      metadata: entry.metadata,
      reason_code: entry.reasonCode ?? null,
      resource_id: entry.resourceId ?? null,
      resource_type: entry.resourceType,
      workspace_id: entry.workspaceId ?? null,
    };

    const { error } = await this.client.from("permission_audit_logs").insert(row);

    if (error) {
      throw new Error(sanitizeSupabaseError(error));
    }
  }
}

function mapWorkspaceMembership(row: Workspace_Memberships): WorkspaceMembership {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role as WorkspaceRole,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeSupabaseError(error: SupabaseErrorLike) {
  return error.message ?? error.code ?? "Supabase security repository error.";
}
