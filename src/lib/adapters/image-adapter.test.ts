import { afterEach, describe, expect, it, vi } from "vitest";

import { executeImageAdapterForAgent } from "./image-adapter";

describe("executeImageAdapterForAgent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes through the image API even without a browser API key", async () => {
    const fetchCalls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push([input, init]);

      return Response.json({
        content: "real or server-routed image result",
        media: {
          createdAt: "2026-06-02T00:00:00.000Z",
          prompt: "Y2K wide-leg pants",
          type: "image",
          url: "data:image/png;base64,aW1hZ2U=",
        },
        mode: "dall-e",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeImageAdapterForAgent({
      agent: {
        accent: "#d4d4d4",
        callsign: "ARCHITECT",
        model: "img2",
      },
      imageSettings: {
        aspectRatio: "1:1",
        modelId: "img2",
        quality: "standard",
      },
      prompt: "Y2K wide-leg pants",
      toolName: "Composer Image Mode",
    });

    expect(result.mode).toBe("dall-e");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchCalls[0] ?? [];
    expect(url).toBe("/api/image-gen");
    expect(init?.headers).toEqual({
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      imageSettings: {
        modelId: "img2",
        quality: "standard",
      },
      model: "img2",
      prompt: "Y2K wide-leg pants",
    });
  });

  it("passes a browser API key through the runtime authorization header when one is available", async () => {
    const fetchCalls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push([input, init]);

      return Response.json({
        content: "image result",
        media: {
          createdAt: "2026-06-02T00:00:00.000Z",
          prompt: "Y2K wide-leg pants",
          type: "image",
          url: "data:image/png;base64,aW1hZ2U=",
        },
        mode: "dall-e",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await executeImageAdapterForAgent({
      agent: {
        accent: "#d4d4d4",
        callsign: "ARCHITECT",
        model: "img2",
      },
      apiKey: "sk-browser-test",
      baseUrl: "https://api.openai.com/v1",
      prompt: "Y2K wide-leg pants",
      toolName: "Composer Image Mode",
      userId: "user-image",
      workspaceId: "workspace-image",
    });

    const [, init] = fetchCalls[0] ?? [];
    expect(init?.headers).toEqual({
      "Content-Type": "application/json",
      "X-Nexus-Runtime-Authorization": "Bearer sk-browser-test",
      "X-User-Id": "user-image",
      "X-Workspace-Id": "workspace-image",
      "x-openai-base-url": "https://api.openai.com/v1",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      workspaceId: "workspace-image",
    });
  });
});
