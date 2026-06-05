import { afterEach, describe, expect, it, vi } from "vitest";

const actorUserId = "00000000-0000-4000-8000-0000000000a1";
const workspaceId = "workspace-preview";

describe("request-scoped workspace permission service", () => {
  afterEach(() => {
    vi.doUnmock("@supabase/supabase-js");
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses the authenticated bearer token to verify preview memberships without service-role config", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://preview.example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-preview");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const maybeSingle = vi.fn(async () => ({
      data: {
        created_at: "2026-06-04T00:00:00.000Z",
        id: "membership-preview",
        role: "owner",
        updated_at: "2026-06-04T00:00:00.000Z",
        user_id: actorUserId,
        workspace_id: workspaceId,
      },
      error: null,
    }));
    const query = {
      eq: vi.fn(() => query),
      maybeSingle,
      select: vi.fn(() => query),
    };
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const fakeClient = {
      from: vi.fn(() => query),
      rpc,
    };
    const createClient = vi.fn(() => fakeClient);

    vi.doMock("@supabase/supabase-js", () => ({
      createClient,
    }));

    const { createWorkspaceStatePermissionService } = await import(
      "./workspace-permission"
    );
    const service = createWorkspaceStatePermissionService({
      accessToken: "preview-session-token",
    });
    const decision = await service.check({
      action: "workspace.update",
      resourceType: "workspace",
      userId: actorUserId,
      workspaceId,
    });

    expect(decision).toMatchObject({
      decision: "allow",
      reasonCode: "PERMISSION_ALLOWED",
    });
    expect(createClient).toHaveBeenCalledWith(
      "https://preview.example.supabase.co",
      "anon-preview",
      expect.objectContaining({
        global: {
          headers: {
            Authorization: "Bearer preview-session-token",
          },
        },
      }),
    );
    expect(fakeClient.from).toHaveBeenCalledWith("workspace_memberships");
    expect(query.eq).toHaveBeenCalledWith("workspace_id", workspaceId);
    expect(query.eq).toHaveBeenCalledWith("user_id", actorUserId);
    expect(rpc).toHaveBeenCalledWith(
      "record_permission_audit_log",
      expect.objectContaining({
        p_action: "workspace.update",
        p_decision: "allowed",
        p_resource_type: "workspace",
        p_workspace_id: workspaceId,
      }),
    );
  });

  it("records viewer write denials through the request-scoped audit RPC", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://preview.example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-preview");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const maybeSingle = vi.fn(async () => ({
      data: {
        created_at: "2026-06-04T00:00:00.000Z",
        id: "membership-preview",
        role: "viewer",
        updated_at: "2026-06-04T00:00:00.000Z",
        user_id: actorUserId,
        workspace_id: workspaceId,
      },
      error: null,
    }));
    const query = {
      eq: vi.fn(() => query),
      maybeSingle,
      select: vi.fn(() => query),
    };
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const fakeClient = {
      from: vi.fn(() => query),
      rpc,
    };
    const createClient = vi.fn(() => fakeClient);

    vi.doMock("@supabase/supabase-js", () => ({
      createClient,
    }));

    const { createWorkspaceStatePermissionService } = await import(
      "./workspace-permission"
    );
    const service = createWorkspaceStatePermissionService({
      accessToken: "preview-session-token",
    });
    const decision = await service.check({
      action: "workspace.update",
      resourceType: "workspace",
      userId: actorUserId,
      workspaceId,
    });

    expect(decision).toMatchObject({
      decision: "deny",
      reasonCode: "PERMISSION_SCOPE_MISSING",
    });
    expect(rpc).toHaveBeenCalledWith(
      "record_permission_audit_log",
      expect.objectContaining({
        p_action: "workspace.update",
        p_decision: "denied",
        p_reason_code: "PERMISSION_SCOPE_MISSING",
        p_resource_type: "workspace",
        p_workspace_id: workspaceId,
      }),
    );
  });
});
