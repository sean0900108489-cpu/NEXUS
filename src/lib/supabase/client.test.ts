import { afterEach, describe, expect, it, vi } from "vitest";

describe("Nexus Supabase client", () => {
  afterEach(() => {
    vi.doUnmock("@supabase/supabase-js");
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("loads runtime public config before creating the browser client", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubGlobal("window", {});

    const createClient = vi.fn(() => ({ auth: {} }));
    vi.doMock("@supabase/supabase-js", () => ({
      createClient,
    }));

    const fetch = vi.fn(async () =>
      Response.json({
        data: {
          supabase: {
            anonKey: "anon-runtime",
            configured: true,
            url: "https://runtime.example.supabase.co",
          },
        },
        ok: true,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const { ensureNexusSupabaseClientConfigured, getNexusSupabaseClient } =
      await import("./client");

    await expect(ensureNexusSupabaseClientConfigured()).resolves.toEqual({
      supabaseAnonKey: "anon-runtime",
      supabaseUrl: "https://runtime.example.supabase.co",
    });

    getNexusSupabaseClient();

    expect(fetch).toHaveBeenCalledWith("/api/v1/public-config", {
      cache: "no-store",
    });
    expect(createClient).toHaveBeenCalledWith(
      "https://runtime.example.supabase.co",
      "anon-runtime",
    );
  });
});
