import { afterEach, describe, expect, it, vi } from "vitest";

import {
  POST as workspaceSessionPost,
  resetWorkspaceSessionRouteDependenciesForTests,
  setWorkspaceSessionRouteDependenciesForTests,
} from "@/app/api/v1/workspaces/session/route";
import type { ApiEnvelope } from "@/lib/backend/contracts/api-envelope";
import type {
  WorkspaceSessionEnsureResponse,
} from "@/lib/nexus-types";
import type { Workspace_Memberships, Workspaces } from "@/lib/supabase/database.types";

import {
  createWorkspaceSessionService,
  WorkspaceSessionService,
  type WorkspaceSessionRepository,
} from "./workspace-session-service";

type WorkspaceRecord = Pick<Workspaces, "id" | "name" | "owner_user_id" | "updated_at">;

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000099";

class MemoryWorkspaceSessionRepository implements WorkspaceSessionRepository {
  readonly memberships = new Map<string, Workspace_Memberships>();
  readonly workspaces = new Map<string, WorkspaceRecord>();

  addWorkspace(input: {
    id: string;
    name?: string;
    ownerUserId?: string | null;
  }) {
    this.workspaces.set(input.id, {
      id: input.id,
      name: input.name ?? input.id,
      owner_user_id: input.ownerUserId ?? null,
      updated_at: new Date().toISOString(),
    });
  }

  addMembership(input: {
    role: Workspace_Memberships["role"];
    userId: string;
    workspaceId: string;
  }) {
    this.memberships.set(keyFor(input.workspaceId, input.userId), {
      created_at: new Date().toISOString(),
      id: `membership-${this.memberships.size + 1}`,
      role: input.role,
      updated_at: new Date().toISOString(),
      user_id: input.userId,
      workspace_id: input.workspaceId,
    });
  }

  async findMembership(input: { userId: string; workspaceId: string }) {
    return this.memberships.get(keyFor(input.workspaceId, input.userId)) ?? null;
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
    this.addWorkspace({
      id: input.workspaceId,
      name: input.name,
      ownerUserId: input.userId,
    });
    this.addMembership({
      role: "owner",
      userId: input.userId,
      workspaceId: input.workspaceId,
    });

    return {
      membership: (await this.findMembership({
        userId: input.userId,
        workspaceId: input.workspaceId,
      }))!,
      workspace: (await this.findWorkspace(input.workspaceId))!,
    };
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  resetWorkspaceSessionRouteDependenciesForTests();
});

describe("WorkspaceSessionService", () => {
  it("keeps the preferred workspace when the session user can write there", async () => {
    const repository = new MemoryWorkspaceSessionRepository();
    repository.addWorkspace({ id: "workspace-preferred", name: "Preferred" });
    repository.addMembership({
      role: "editor",
      userId: USER_ID,
      workspaceId: "workspace-preferred",
    });
    const service = new WorkspaceSessionService(repository, () => "workspace-created");

    const result = await service.ensureWorkspaceForSession({
      request: {
        preferredWorkspaceId: "workspace-preferred",
      },
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      created: false,
      reason: "preferred_workspace_member",
      role: "editor",
      workspaceId: "workspace-preferred",
      workspaceName: "Preferred",
    });
  });

  it("uses an existing writable workspace when the preferred workspace belongs elsewhere", async () => {
    const repository = new MemoryWorkspaceSessionRepository();
    repository.addWorkspace({ id: "workspace-shared", ownerUserId: OTHER_USER_ID });
    repository.addWorkspace({ id: "workspace-owned", name: "Owned" });
    repository.addMembership({
      role: "owner",
      userId: OTHER_USER_ID,
      workspaceId: "workspace-shared",
    });
    repository.addMembership({
      role: "owner",
      userId: USER_ID,
      workspaceId: "workspace-owned",
    });
    const service = new WorkspaceSessionService(repository, () => "workspace-created");

    const result = await service.ensureWorkspaceForSession({
      request: {
        preferredWorkspaceId: "workspace-shared",
      },
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      created: false,
      preferredWorkspaceId: "workspace-shared",
      reason: "existing_writable_workspace",
      role: "owner",
      workspaceId: "workspace-owned",
      workspaceName: "Owned",
    });
  });

  it("creates an owned workspace only when the session has no writable workspace", async () => {
    const repository = new MemoryWorkspaceSessionRepository();
    repository.addWorkspace({ id: "workspace-view-only", name: "View Only" });
    repository.addMembership({
      role: "viewer",
      userId: USER_ID,
      workspaceId: "workspace-view-only",
    });
    const service = new WorkspaceSessionService(repository, () => "workspace-created");

    const result = await service.ensureWorkspaceForSession({
      request: {
        preferredWorkspaceName: "NEXUS Session",
      },
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      created: true,
      reason: "created_user_workspace",
      role: "owner",
      workspaceId: "workspace-created",
      workspaceName: "NEXUS Session",
    });
  });

  it("exposes the session resolver through the authenticated route", async () => {
    const repository = new MemoryWorkspaceSessionRepository();
    const service = new WorkspaceSessionService(repository, () => "workspace-route");
    setWorkspaceSessionRouteDependenciesForTests({
      authVerifier: {
        async verifyRequest(request) {
          const authorization = request.headers.get("authorization");

          if (!authorization) {
            throw new Error("missing auth");
          }

          return {
            email: null,
            id: USER_ID,
          };
        },
      },
      service,
    });

    const response = await workspaceSessionPost(
      new Request("http://localhost/api/v1/workspaces/session", {
        body: JSON.stringify({
          preferredWorkspaceId: "workspace-nexus-ops",
          preferredWorkspaceName: "NEXUS // AI OPS",
        }),
        headers: {
          Authorization: "Bearer test-session",
          "Content-Type": "application/json",
          "X-Idempotency-Key": "workspace-session-test",
        },
        method: "POST",
      }),
    );
    const json = (await response.json()) as ApiEnvelope<WorkspaceSessionEnsureResponse>;

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data).toMatchObject({
      created: true,
      preferredWorkspaceId: "workspace-nexus-ops",
      reason: "created_user_workspace",
      workspaceId: "workspace-route",
    });
  });

  it("uses a local session repository outside production when service-role config is absent", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const service = createWorkspaceSessionService();
    const result = await service.ensureWorkspaceForSession({
      request: {
        preferredWorkspaceName: "Local Session",
      },
      userId: "00000000-0000-4000-8000-000000000077",
    });

    expect(result).toMatchObject({
      created: true,
      reason: "created_user_workspace",
      role: "owner",
      workspaceName: "Local Session",
    });
    expect(result.workspaceId).toMatch(/^workspace_/);
  });

  it("fails closed in production when service-role config is absent", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(() => createWorkspaceSessionService()).toThrow(
      "Workspace session service requires Supabase service-role configuration.",
    );
  });
});

function keyFor(workspaceId: string, userId: string) {
  return `${workspaceId}:${userId}`;
}
