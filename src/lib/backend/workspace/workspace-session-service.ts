import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/backend/api/api-errors";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  WorkspaceMembershipInsert,
  WorkspaceUpsert,
  Workspace_Memberships,
  Workspaces,
} from "@/lib/supabase/database.types";
import type {
  WorkspaceSessionEnsureRequest,
  WorkspaceSessionEnsureResponse,
} from "@/lib/nexus-types";

const DEFAULT_WORKSPACE_NAME = "NEXUS // AI OPS";
const READABLE_ROLES = new Set(["owner", "admin", "editor", "viewer"]);
const WRITABLE_ROLES = new Set(["owner", "admin", "editor"]);
type ReadableWorkspaceRole = "owner" | "admin" | "editor" | "viewer";
type WritableWorkspaceRole = "owner" | "admin" | "editor";

type WorkspaceSessionRecord = Pick<
  Workspaces,
  "id" | "name" | "owner_user_id" | "updated_at"
>;

export interface WorkspaceSessionRepository {
  createOwnedWorkspace(input: {
    name: string;
    userId: string;
    workspaceId: string;
  }): Promise<{
    membership: Workspace_Memberships;
    workspace: WorkspaceSessionRecord;
  }>;
  findMembership(input: {
    userId: string;
    workspaceId: string;
  }): Promise<Workspace_Memberships | null>;
  findWorkspace(workspaceId: string): Promise<WorkspaceSessionRecord | null>;
  listMembershipsForUser(userId: string): Promise<Workspace_Memberships[]>;
}

export class WorkspaceSessionService {
  constructor(
    private readonly repository: WorkspaceSessionRepository,
    private readonly idFactory: () => string = makeWorkspaceId,
  ) {}

  async ensureWorkspaceForSession(input: {
    request: WorkspaceSessionEnsureRequest;
    userId: string;
  }): Promise<WorkspaceSessionEnsureResponse> {
    const userId = input.userId.trim();

    if (!userId) {
      throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
    }

    const preferredWorkspaceId =
      sanitizeWorkspaceId(input.request.preferredWorkspaceId) ?? null;
    const preferredWorkspaceName = sanitizeWorkspaceName(
      input.request.preferredWorkspaceName,
    );

    if (preferredWorkspaceId) {
      const preferredMembership = await this.repository.findMembership({
        userId,
        workspaceId: preferredWorkspaceId,
      });

      if (preferredMembership && isReadableRole(preferredMembership.role)) {
        const workspace = await this.repository.findWorkspace(preferredWorkspaceId);

        return {
          created: false,
          preferredWorkspaceId,
          reason: "preferred_workspace_member",
          role: preferredMembership.role,
          workspaceId: preferredWorkspaceId,
          workspaceName: workspace?.name ?? preferredWorkspaceName,
        };
      }
    }

    const memberships = await this.repository.listMembershipsForUser(userId);
    const writableMembership = memberships.find((membership) =>
      isWritableRole(membership.role),
    );

    if (writableMembership) {
      const workspace = await this.repository.findWorkspace(
        writableMembership.workspace_id,
      );

      return {
        created: false,
        preferredWorkspaceId,
        reason: "existing_writable_workspace",
        role: writableMembership.role as WritableWorkspaceRole,
        workspaceId: writableMembership.workspace_id,
        workspaceName: workspace?.name ?? preferredWorkspaceName,
      };
    }

    const readableMembership = memberships.find((membership) =>
      isReadableRole(membership.role),
    );

    if (readableMembership) {
      const workspace = await this.repository.findWorkspace(
        readableMembership.workspace_id,
      );

      return {
        created: false,
        preferredWorkspaceId,
        reason: "existing_readable_workspace",
        role: readableMembership.role as ReadableWorkspaceRole,
        workspaceId: readableMembership.workspace_id,
        workspaceName: workspace?.name ?? preferredWorkspaceName,
      };
    }

    const workspaceId = this.idFactory();
    const created = await this.repository.createOwnedWorkspace({
      name: preferredWorkspaceName,
      userId,
      workspaceId,
    });

    return {
      created: true,
      preferredWorkspaceId,
      reason: "created_user_workspace",
      role: "owner",
      workspaceId: created.workspace.id,
      workspaceName: created.workspace.name,
    };
  }
}

export class SupabaseWorkspaceSessionRepository implements WorkspaceSessionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findMembership(input: { userId: string; workspaceId: string }) {
    const { data, error } = await this.client
      .from("workspace_memberships")
      .select("*")
      .eq("workspace_id", input.workspaceId)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async listMembershipsForUser(userId: string) {
    const { data, error } = await this.client
      .from("workspace_memberships")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  async findWorkspace(workspaceId: string) {
    const { data, error } = await this.client
      .from("workspaces")
      .select("id,name,owner_user_id,updated_at")
      .eq("id", workspaceId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async createOwnedWorkspace(input: {
    name: string;
    userId: string;
    workspaceId: string;
  }) {
    const now = new Date().toISOString();
    const workspaceRow: WorkspaceUpsert = {
      created_by: input.userId,
      id: input.workspaceId,
      name: input.name,
      owner_user_id: input.userId,
      updated_at: now,
    };
    const { data: workspace, error: workspaceError } = await this.client
      .from("workspaces")
      .upsert(workspaceRow, { onConflict: "id" })
      .select("id,name,owner_user_id,updated_at")
      .single();

    if (workspaceError) {
      throw new Error(workspaceError.message);
    }

    const membershipRow: WorkspaceMembershipInsert = {
      role: "owner",
      user_id: input.userId,
      workspace_id: input.workspaceId,
    };
    const { data: membership, error: membershipError } = await this.client
      .from("workspace_memberships")
      .upsert(membershipRow, { onConflict: "workspace_id,user_id" })
      .select("*")
      .single();

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    return {
      membership,
      workspace,
    };
  }
}

class LocalWorkspaceSessionRepository implements WorkspaceSessionRepository {
  private readonly memberships = new Map<string, Workspace_Memberships>();
  private readonly workspaces = new Map<string, WorkspaceSessionRecord>();

  async findMembership(input: { userId: string; workspaceId: string }) {
    return this.memberships.get(localKey(input.workspaceId, input.userId)) ?? null;
  }

  async listMembershipsForUser(userId: string) {
    return [...this.memberships.values()]
      .filter((membership) => membership.user_id === userId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  async findWorkspace(workspaceId: string) {
    return this.workspaces.get(workspaceId) ?? null;
  }

  async createOwnedWorkspace(input: {
    name: string;
    userId: string;
    workspaceId: string;
  }) {
    const now = new Date().toISOString();
    const workspace: WorkspaceSessionRecord = {
      id: input.workspaceId,
      name: input.name,
      owner_user_id: input.userId,
      updated_at: now,
    };
    const membership: Workspace_Memberships = {
      created_at: now,
      id: `local-membership-${input.workspaceId}-${input.userId}`,
      role: "owner",
      updated_at: now,
      user_id: input.userId,
      workspace_id: input.workspaceId,
    };

    this.workspaces.set(workspace.id, workspace);
    this.memberships.set(localKey(workspace.id, input.userId), membership);

    return {
      membership,
      workspace,
    };
  }
}

let localWorkspaceSessionService: WorkspaceSessionService | undefined;

export function createWorkspaceSessionService() {
  if (hasSupabaseServiceRoleConfig()) {
    return new WorkspaceSessionService(
      new SupabaseWorkspaceSessionRepository(getNexusSupabaseAdminClient()),
    );
  }

  if (isProductionRuntime()) {
    throw new ApiError(
      "INTERNAL_DEPENDENCY_FAILED",
      "Workspace session service requires Supabase service-role configuration.",
      503,
    );
  }

  localWorkspaceSessionService ??= new WorkspaceSessionService(
    new LocalWorkspaceSessionRepository(),
  );

  return localWorkspaceSessionService;
}

function isReadableRole(role: string): role is ReadableWorkspaceRole {
  return READABLE_ROLES.has(role);
}

function isWritableRole(role: string): role is WritableWorkspaceRole {
  return WRITABLE_ROLES.has(role);
}

function sanitizeWorkspaceId(value: string | null | undefined) {
  const workspaceId = value?.trim();

  return workspaceId && workspaceId !== "__global__" ? workspaceId : null;
}

function sanitizeWorkspaceName(value: string | null | undefined) {
  const workspaceName = value?.replace(/\s+/g, " ").trim();

  return workspaceName || DEFAULT_WORKSPACE_NAME;
}

function makeWorkspaceId() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 18)
      : `${Date.now()}${Math.random().toString(16).slice(2, 10)}`;

  return `workspace_${random}`;
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function localKey(workspaceId: string, userId: string) {
  return `${workspaceId}:${userId}`;
}
