import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  WorkspaceMembershipInsert,
  WorkspaceUpsert,
  Workspace_Memberships,
} from "@/lib/supabase/database.types";

import { PermissionService } from "../security/permission-service";
import {
  SecurityAuditRepository,
  WorkspaceMembershipRepository,
  type SecurityAuditStore,
  type SecuritySupabaseClient,
  type WorkspaceMembershipStore,
} from "../security/repositories";
import type {
  SecurityAuditLogEntry,
  WorkspaceMembership,
  WorkspaceRole,
} from "../security/types";

const DEFAULT_WORKSPACE_NAME = "NEXUS // AI OPS";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORKSPACE_ID_PATTERN = /^workspace[-_][A-Za-z0-9_-]{3,96}$/;

class LocalWorkspaceMembershipStore implements WorkspaceMembershipStore {
  async findByWorkspaceAndUser(workspaceId: string, userId: string) {
    if (process.env.NODE_ENV === "production") {
      return null;
    }

    if (!workspaceId || !userId) {
      return null;
    }

    return {
      role: inferLocalRole(userId),
      userId,
      workspaceId,
    } satisfies WorkspaceMembership;
  }
}

class SupabaseWorkspaceMembershipStore implements WorkspaceMembershipStore {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findByWorkspaceAndUser(workspaceId: string, userId: string) {
    const existing = await this.findExistingMembership(workspaceId, userId);

    if (existing) {
      return mapWorkspaceMembership(existing);
    }

    if (!canBootstrapWorkspaceMembership(workspaceId, userId)) {
      return null;
    }

    const bootstrapped = await this.bootstrapWorkspaceOwner(workspaceId, userId);

    return bootstrapped ? mapWorkspaceMembership(bootstrapped) : null;
  }

  private async findExistingMembership(workspaceId: string, userId: string) {
    const { data, error } = await this.client
      .from("workspace_memberships")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(sanitizeSupabaseError(error));
    }

    return data;
  }

  private async bootstrapWorkspaceOwner(workspaceId: string, userId: string) {
    const workspace = await this.findWorkspace(workspaceId);

    if (workspace?.owner_user_id && workspace.owner_user_id !== userId) {
      return null;
    }

    if (!workspace?.owner_user_id) {
      const ownerMembership = await this.findWorkspaceOwnerMembership(workspaceId);

      if (ownerMembership && ownerMembership.user_id !== userId) {
        return null;
      }
    }

    const now = new Date().toISOString();
    const workspaceRow: WorkspaceUpsert = {
      id: workspaceId,
      name: workspace?.name ?? DEFAULT_WORKSPACE_NAME,
      owner_user_id: workspace?.owner_user_id ?? userId,
      created_by: workspace?.created_by ?? userId,
      updated_at: now,
    };
    const { error: workspaceError } = await this.client
      .from("workspaces")
      .upsert(workspaceRow, { onConflict: "id" });

    if (workspaceError) {
      throw new Error(sanitizeSupabaseError(workspaceError));
    }

    const membershipRow: WorkspaceMembershipInsert = {
      role: "owner",
      user_id: userId,
      workspace_id: workspaceId,
    };
    const { data, error } = await this.client
      .from("workspace_memberships")
      .upsert(membershipRow, { onConflict: "workspace_id,user_id" })
      .select("*")
      .single();

    if (error) {
      throw new Error(sanitizeSupabaseError(error));
    }

    return data;
  }

  private async findWorkspace(workspaceId: string) {
    const { data, error } = await this.client
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .maybeSingle();

    if (error) {
      throw new Error(sanitizeSupabaseError(error));
    }

    return data;
  }

  private async findWorkspaceOwnerMembership(workspaceId: string) {
    const { data, error } = await this.client
      .from("workspace_memberships")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(sanitizeSupabaseError(error));
    }

    return data;
  }
}

class LocalSecurityAuditStore implements SecurityAuditStore {
  async insert(entry: SecurityAuditLogEntry & { metadata: Record<string, unknown> }) {
    void entry;
  }
}

let localPermissionService: PermissionService | undefined;

export function createWorkspaceStatePermissionService() {
  if (hasSupabaseServiceRoleConfig()) {
    const client = getNexusSupabaseAdminClient();
    const securityClient = client as unknown as SecuritySupabaseClient;

    return new PermissionService({
      audit: SecurityAuditRepository.fromSupabase(securityClient),
      memberships: new WorkspaceMembershipRepository(
        new SupabaseWorkspaceMembershipStore(client),
      ),
    });
  }

  localPermissionService ??= new PermissionService({
    audit: new SecurityAuditRepository(new LocalSecurityAuditStore()),
    memberships: new WorkspaceMembershipRepository(
      new LocalWorkspaceMembershipStore(),
    ),
  });

  return localPermissionService;
}

function canBootstrapWorkspaceMembership(workspaceId: string, userId: string) {
  return (
    UUID_PATTERN.test(userId) &&
    (UUID_PATTERN.test(workspaceId) || WORKSPACE_ID_PATTERN.test(workspaceId))
  );
}

function mapWorkspaceMembership(row: Workspace_Memberships): WorkspaceMembership {
  return {
    createdAt: row.created_at,
    id: row.id,
    role: row.role,
    updatedAt: row.updated_at,
    userId: row.user_id,
    workspaceId: row.workspace_id,
  };
}

function sanitizeSupabaseError(error: { code?: string; message?: string }) {
  return error.message ?? error.code ?? "Supabase workspace permission error.";
}

function inferLocalRole(userId: string): WorkspaceRole {
  const normalized = userId.toLowerCase();

  if (normalized.includes("viewer")) {
    return "viewer";
  }

  if (normalized.includes("editor")) {
    return "editor";
  }

  if (normalized.includes("admin")) {
    return "admin";
  }

  return "owner";
}
