import { afterEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getNexusSupabaseClient: () => ({
    auth: {
      getSession: supabaseMocks.getSession,
      getUser: supabaseMocks.getUser,
    },
  }),
}));

import { LocalSyncQueueAdapter } from "./local-sync-queue-adapter";

function makeAdapter() {
  return new LocalSyncQueueAdapter({ flushDelayMs: 60_000 });
}

function makeOperation() {
  return {
    entityId: "workspace-auth-gate",
    entityType: "workspace",
    operationType: "snapshot",
    payload: {
      snapshot: {
        id: "workspace-auth-gate",
      },
    },
    workspaceId: "workspace-auth-gate",
  } as const;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  supabaseMocks.getSession.mockReset();
  supabaseMocks.getUser.mockReset();
});

describe("LocalSyncQueueAdapter browser auth gate", () => {
  it("keeps browser operations queued when no Supabase session token is available", async () => {
    vi.stubGlobal("window", { addEventListener: vi.fn() });
    vi.stubGlobal("navigator", { onLine: true });
    supabaseMocks.getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const adapter = makeAdapter();

    await adapter.clear();
    await adapter.enqueue(makeOperation());
    await adapter.flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await adapter.getStatus()).toMatchObject({
      failed: 0,
      pending: 1,
      syncing: 0,
    });
  });

  it("sends the Supabase access token when browser flush has a session", async () => {
    vi.stubGlobal("window", { addEventListener: vi.fn() });
    vi.stubGlobal("navigator", { onLine: true });
    supabaseMocks.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: "session-token",
        },
      },
    });
    supabaseMocks.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "user-auth-gate",
        },
      },
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: {
          deduplicated: false,
          operation: {
            attemptCount: 1,
            createdAt: "2026-06-05T00:00:00.000Z",
            entityId: "workspace-auth-gate",
            entityType: "workspace",
            id: "mutation-auth-gate",
            maxAttempts: 5,
            operationType: "snapshot",
            payloadHash: "sha256:test",
            status: "synced",
            updatedAt: "2026-06-05T00:00:00.000Z",
            workspaceId: "workspace-auth-gate",
          },
        },
        error: null,
        meta: {
          requestId: "req-auth-gate",
          traceId: "trace-auth-gate",
        },
        ok: true,
      }),
    );
    const adapter = makeAdapter();

    await adapter.clear();
    await adapter.enqueue({
      ...makeOperation(),
      clientMutationId: "mutation-auth-gate",
      payloadHash: "sha256:test",
    });
    await adapter.flush();
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);

    expect(headers.get("Authorization")).toBe("Bearer session-token");
    expect(headers.get("X-User-Id")).toBe("user-auth-gate");
    expect(await adapter.getStatus()).toMatchObject({
      failed: 0,
      pending: 0,
    });
  });
});
