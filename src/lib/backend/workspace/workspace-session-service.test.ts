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
  vi.unstubAllGlobals();
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

  it("keeps the preferred workspace when the session user is a viewer there", async () => {
    const repository = new MemoryWorkspaceSessionRepository();
    repository.addWorkspace({ id: "workspace-preferred-viewer", name: "View Shared" });
    repository.addMembership({
      role: "viewer",
      userId: USER_ID,
      workspaceId: "workspace-preferred-viewer",
    });
    const service = new WorkspaceSessionService(repository, () => "workspace-created");

    const result = await service.ensureWorkspaceForSession({
      request: {
        preferredWorkspaceId: "workspace-preferred-viewer",
      },
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      created: false,
      reason: "preferred_workspace_member",
      role: "viewer",
      workspaceId: "workspace-preferred-viewer",
      workspaceName: "View Shared",
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

  it("uses an existing readable workspace when the session has no writable workspace", async () => {
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
      created: false,
      reason: "existing_readable_workspace",
      role: "viewer",
      workspaceId: "workspace-view-only",
      workspaceName: "View Only",
    });
  });

  it("creates an owned workspace only when the session has no readable workspace", async () => {
    const repository = new MemoryWorkspaceSessionRepository();
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

  it("falls back to the authenticated workspace session RPC when preview lacks service-role config", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-public-key");
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json([
        {
          created: true,
          preferred_workspace_id: "workspace-nexus-ops",
          reason: "created_user_workspace",
          role: "owner",
          workspace_id: "workspace_rpc_created",
          workspace_name: "NEXUS // AI OPS",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
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
    });

    const response = await workspaceSessionPost(
      new Request("http://localhost/api/v1/workspaces/session", {
        body: JSON.stringify({
          preferredWorkspaceId: "workspace-nexus-ops",
          preferredWorkspaceName: "NEXUS // AI OPS",
        }),
        headers: {
          Authorization: "Bearer preview-session",
          "Content-Type": "application/json",
          "X-Idempotency-Key": "workspace-session-rpc-test",
        },
        method: "POST",
      }),
    );
    const json = (await response.json()) as ApiEnvelope<WorkspaceSessionEnsureResponse>;
    const [, init] = fetchMock.mock.calls[0] ?? [];

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data).toMatchObject({
      created: true,
      preferredWorkspaceId: "workspace-nexus-ops",
      reason: "created_user_workspace",
      role: "owner",
      workspaceId: "workspace_rpc_created",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://supabase.test/rest/v1/rpc/nexus_ensure_workspace_session",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer preview-session",
    );
    expect(new Headers(init?.headers).get("apikey")).toBe("anon-public-key");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      p_preferred_workspace_id: "workspace-nexus-ops",
      p_preferred_workspace_name: "NEXUS // AI OPS",
    });
  });

  it("uses the authenticated workspace session RPC on localhost when a bearer session and Supabase public config are present", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.localhost.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-localhost-key");
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        created: true,
        preferred_workspace_id: "workspace-nexus-ops",
        reason: "created_user_workspace",
        role: "owner",
        workspace_id: "workspace_localhost_rpc_created",
        workspace_name: "NEXUS // AI OPS",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
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
    });

    const response = await workspaceSessionPost(
      new Request("http://localhost/api/v1/workspaces/session", {
        body: JSON.stringify({
          preferredWorkspaceId: "workspace-nexus-ops",
          preferredWorkspaceName: "NEXUS // AI OPS",
        }),
        headers: {
          Authorization: "Bearer localhost-session",
          "Content-Type": "application/json",
          "X-Idempotency-Key": "workspace-session-localhost-rpc-test",
        },
        method: "POST",
      }),
    );
    const json = (await response.json()) as ApiEnvelope<WorkspaceSessionEnsureResponse>;
    const [, init] = fetchMock.mock.calls[0] ?? [];

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data).toMatchObject({
      created: true,
      preferredWorkspaceId: "workspace-nexus-ops",
      reason: "created_user_workspace",
      role: "owner",
      workspaceId: "workspace_localhost_rpc_created",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://supabase.localhost.test/rest/v1/rpc/nexus_ensure_workspace_session",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer localhost-session",
    );
    expect(new Headers(init?.headers).get("apikey")).toBe("anon-localhost-key");
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
