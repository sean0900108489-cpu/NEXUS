import { afterEach, describe, expect, it, vi } from "vitest";

describe("nexusHomeApi auth headers", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/client");
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("attaches the current Supabase session token to authenticated home API requests", async () => {
    vi.stubGlobal("window", {});
    vi.doMock("@/lib/supabase/client", () => ({
      ensureNexusSupabaseClientConfigured: vi.fn().mockResolvedValue({
        supabaseAnonKey: "anon",
        supabaseUrl: "https://project.supabase.co",
      }),
      getNexusSupabaseClient: () => ({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                access_token: "session-token",
              },
            },
          }),
        },
      }),
    }));

    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input;
      void _init;

      return Response.json({
        conversation: {
          messages: [],
        },
      });
    });
    vi.stubGlobal("fetch", fetch);

    const { nexusHomeApi } = await import("./api");

    await nexusHomeApi.listGlobalMessages("conversation-1");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = fetch.mock.calls[0];
    const headers = new Headers(init?.headers);

    expect(headers.get("Authorization")).toBe("Bearer session-token");
  });
});
