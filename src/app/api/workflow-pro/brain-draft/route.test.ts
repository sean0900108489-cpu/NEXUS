import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

describe("POST /api/workflow-pro/brain-draft", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("blocks model-backed Graph Brain drafts in production so OPENAI_API_KEY cannot bypass user token mapping", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("OPENAI_API_KEY", "sk-special-case-openai-key");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(
      new Request("http://localhost/api/workflow-pro/brain-draft", {
        body: JSON.stringify({
          operatorRequest: "draft a workflow",
          useModel: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "Not found." });
    expect(fetcher).not.toHaveBeenCalled();
    expect(JSON.stringify(payload)).not.toContain("sk-special-case-openai-key");
  });

  it("keeps deterministic local drafts available without provider egress", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(
      new Request("http://localhost/api/workflow-pro/brain-draft", {
        body: JSON.stringify({
          operatorRequest: "draft a simple workflow",
          useModel: false,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      schema: "nexus.workflowPro.graphBrainPlannerResult.v1",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
