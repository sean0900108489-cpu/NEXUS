import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/api/v1/providers/status", () => {
  it("reports server provider availability without exposing raw credentials", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-status-secret-1234567890");
    vi.stubEnv("OPENAI_BASE_URL", "https://api.openai.example/v1");
    vi.stubEnv("OPENAI_IMAGE_MODEL", "gpt-image-2");

    const response = await GET();
    const text = await response.text();
    const payload = JSON.parse(text) as {
      ok: boolean;
      server: {
        openai: {
          apiKeyConfigured: boolean;
          baseUrlConfigured: boolean;
          imageModel: string | null;
          imageModelConfigured: boolean;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      server: {
        openai: {
          apiKeyConfigured: true,
          baseUrlConfigured: true,
          imageModel: "gpt-image-2",
          imageModelConfigured: true,
        },
      },
    });
    expect(text).not.toContain("sk-status-secret");
  });

  it("reports missing server provider credentials as booleans only", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_BASE_URL", "");
    vi.stubEnv("OPENAI_IMAGE_BASE_URL", "");
    vi.stubEnv("OPENAI_IMAGE_MODEL", "");

    const response = await GET();
    const payload = (await response.json()) as {
      server: {
        openai: {
          apiKeyConfigured: boolean;
          baseUrlConfigured: boolean;
          imageModel: string | null;
          imageModelConfigured: boolean;
        };
      };
    };

    expect(payload.server.openai).toMatchObject({
      apiKeyConfigured: false,
      baseUrlConfigured: false,
      imageModel: null,
      imageModelConfigured: false,
    });
  });
});
