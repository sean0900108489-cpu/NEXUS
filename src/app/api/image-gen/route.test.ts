import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ORIGINAL_OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL;

describe("/api/image-gen", () => {
  afterEach(() => {
    process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_API_KEY;
    process.env.OPENAI_IMAGE_MODEL = ORIGINAL_OPENAI_IMAGE_MODEL;
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
    expect(await response.json()).toMatchObject({
      media: {
        prompt: "Y2K trendy wide-leg pants",
        type: "image",
        url: "data:image/png;base64,aW1hZ2U=",
      },
      mode: "dall-e",
      revisedPrompt: "Y2K wide-leg pants",
    });

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
});
