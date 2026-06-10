import { describe, expect, it, vi } from "vitest";

import { callNewApiChatCompletion } from "./new-api-chat-service";

describe("New API chat service", () => {
  it("uses the provided server-side user token and catalog downstream model", async () => {
    vi.stubEnv("NEW_API_BASE_URL", "https://new-api.example.test/v1");

    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok" } }],
          usage: { completion_tokens: 4, prompt_tokens: 6, total_tokens: 10 },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      );
    });

    await callNewApiChatCompletion(
      {
        apiKey: "user-new-api-key",
        messages: [{ content: "hello", role: "user" }],
        modelId: "claude-sonnet-4-20250514",
      },
      { fetcher },
    );

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];

    expect(url).toBe("https://new-api.example.test/v1/chat/completions");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer user-new-api-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: "claude-sonnet-4-20250514",
    });
  });
});
