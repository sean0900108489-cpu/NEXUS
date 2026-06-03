import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearGeneratedImageAssetCacheForTests,
  getGeneratedImageAsset,
} from "@/lib/backend/image-generation/generated-image-asset-cache";

import { GET as GET_GENERATED_IMAGE_ASSET } from "./assets/[assetId]/route";
import { POST } from "./route";

const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ORIGINAL_OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL;

describe("/api/image-gen", () => {
  afterEach(() => {
    process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_API_KEY;
    process.env.OPENAI_IMAGE_MODEL = ORIGINAL_OPENAI_IMAGE_MODEL;
    clearGeneratedImageAssetCacheForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the server OpenAI API key and maps img2 into the provider model", async () => {
    process.env.OPENAI_API_KEY = "sk-env-test";
    process.env.OPENAI_IMAGE_MODEL = "img2";

    const fetchCalls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push([input, init]);

      return Response.json({
        data: [
          {
            b64_json: "aW1hZ2U=",
            revised_prompt: "Y2K wide-leg pants",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          agent: {
            accent: "#d4d4d4",
            callsign: "ARCHITECT",
          },
          imageSettings: {
            aspectRatio: "1:1",
            modelId: "img2",
            quality: "standard",
          },
          model: "img2",
          prompt: "Y2K trendy wide-leg pants",
          toolName: "Composer Image Mode",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload).toMatchObject({
      media: {
        prompt: "Y2K trendy wide-leg pants",
        type: "image",
      },
      mode: "dall-e",
      revisedPrompt: "Y2K wide-leg pants",
    });
    expect(payload.media.url).toMatch(/^\/api\/image-gen\/assets\/img_/u);
    expect(payload.content).not.toContain("data:image/png;base64");
    const assetId = String(payload.media.url).split("/").at(-1) ?? "";
    const asset = getGeneratedImageAsset(assetId);

    expect(asset?.mimeType).toBe("image/png");
    expect(new TextDecoder().decode(asset?.bytes)).toBe("image");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchCalls[0] ?? [];
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer sk-env-test",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "gpt-image-2",
      prompt: "Y2K trendy wide-leg pants",
      quality: "low",
      size: "1024x1024",
    });
  });

  it("is blocked in production because image-gen is a legacy route", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.OPENAI_API_KEY = "sk-env-test";

    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            b64_json: "cHJvZHVjdGlvbi1pbWFnZQ==",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          imageSettings: {
            aspectRatio: "16:9",
            modelId: "img2",
            quality: "standard",
          },
          model: "img2",
          prompt: "production image route smoke",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves generated b64 images through the transient asset route", async () => {
    process.env.OPENAI_API_KEY = "sk-env-test";
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            b64_json: "aW1hZ2U=",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          model: "img2",
          prompt: "asset route image",
        }),
        method: "POST",
      }),
    );
    const payload = await response.json();
    const assetId = String(payload.media.url).split("/").at(-1) ?? "";
    const assetResponse = await GET_GENERATED_IMAGE_ASSET(
      new Request(`http://localhost/api/image-gen/assets/${assetId}`),
      { params: Promise.resolve({ assetId }) },
    );

    expect(assetResponse.status).toBe(200);
    expect(assetResponse.headers.get("Content-Type")).toBe("image/png");
    await expect(assetResponse.text()).resolves.toBe("image");
  });
});
