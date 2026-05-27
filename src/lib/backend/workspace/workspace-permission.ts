import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";

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

class LocalSecurityAuditStore implements SecurityAuditStore {
  async insert(entry: SecurityAuditLogEntry & { metadata: Record<string, unknown> }) {
    void entry;
  }
}

let localPermissionService: PermissionService | undefined;

export function createWorkspaceStatePermissionService() {
  if (hasSupabaseServiceRoleConfig()) {
    const client = getNexusSupabaseAdminClient() as unknown as SecuritySupabaseClient;

    return new PermissionService({
      audit: SecurityAuditRepository.fromSupabase(client),
      memberships: WorkspaceMembershipRepository.fromSupabase(client),
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
