import { describe, expect, it, vi } from "vitest";

import { fetchWithBackoff, StreamRetryError } from "@/lib/stream-retry";

describe("stream retry", () => {
  it("retries 429/503/504 responses before returning a successful response", async () => {
    const responses = [
      new Response(null, { status: 429 }),
      new Response(null, { status: 503 }),
      new Response("ok", { status: 200 }),
    ];
    const fetcher = vi.fn(async () => responses.shift() ?? responses[0]) as unknown as typeof fetch;
    const notices: Array<{ attempt: number; status?: number }> = [];

    const response = await fetchWithBackoff(
      "https://nexus.local/stream",
      {},
      {
        fetcher,
        onRetry: ({ attempt, status }) => notices.push({ attempt, status }),
        retryDelaysMs: [0, 0, 0],
      },
    );

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(notices).toEqual([
      { attempt: 1, status: 429 },
      { attempt: 2, status: 503 },
    ]);
  });

  it("fails only after exhausting retryable response attempts", async () => {
    const fetcher = vi.fn(
      async () => new Response(null, { status: 504 }),
    ) as unknown as typeof fetch;

    await expect(
      fetchWithBackoff("https://nexus.local/stream", {}, {
        fetcher,
        maxRetries: 1,
        retryDelaysMs: [0],
      }),
    ).rejects.toBeInstanceOf(StreamRetryError);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not retry manual aborts", async () => {
    const abortError = new Error("Request aborted.");
    abortError.name = "AbortError";
    const fetcher = vi.fn(async () => {
      throw abortError;
    }) as unknown as typeof fetch;

    await expect(
      fetchWithBackoff("https://nexus.local/stream", {}, { fetcher }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
