import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetApiAuthSessionVerifierForTests,
  setApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth";
import { encryptNewApiToken } from "@/lib/backend/new-api-token/token-crypto";
import {
  resetUserNewApiTokenRepositoryForTests,
  setUserNewApiTokenRepositoryForTests,
} from "@/lib/backend/new-api-token/user-new-api-token-service";

import { executeAiGatewayChatRequest } from "./ai-gateway-service";
import { InMemoryUsageLedgerRepository } from "./usage-ledger";
import { getInMemoryWalletRepository } from "./wallet-repository";

describe("AI gateway service", () => {
  beforeEach(() => {
    const secret = "gateway-test-encryption-secret";

    setApiAuthSessionVerifierForTests({
      verifyRequest: async () => ({
        id: "user-gateway-test",
      }),
    });
    setUserNewApiTokenRepositoryForTests({
      findByUserId: async (userId) => ({
        enabled: true,
        encryptedNewApiToken: encryptNewApiToken("sk-gateway-user-token", {
          secret,
        }),
        group: "gateway-test",
        plan: "basic",
        tokenId: "gateway-token-id",
        tokenName: "Gateway Test",
        userId,
      }),
    });
    vi.stubEnv("NEW_API_BASE_URL", "https://new-api.example.test/v1");
    vi.stubEnv("NEW_API_TOKEN_ENCRYPTION_SECRET", secret);

    // Reset wallet state between tests
    getInMemoryWalletRepository().clear();
  });

  afterEach(() => {
    resetApiAuthSessionVerifierForTests();
    resetUserNewApiTokenRepositoryForTests();
    vi.unstubAllEnvs();
  });

  it("runs chat requests through plan, wallet gate, New API, and usage ledger", async () => {
    const ledger = new InMemoryUsageLedgerRepository();
    const fetcher = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "gateway ok" } }],
        usage: { completion_tokens: 600, prompt_tokens: 600, total_tokens: 1200 },
      }),
    );

    const result = await executeAiGatewayChatRequest({
      body: {
        messages: [{ content: "hello", role: "user" }],
        modelId: "deepseek-v4-flash",
        operatorId: "operator-gateway",
      },
      fetcher,
      ledger,
      request: new Request("http://localhost/api/chat", {
        headers: {
          "Content-Type": "application/json",
          "X-Nexus-Test-Plan": "Basic",
          "X-User-Id": "user-gateway-test",
        },
        method: "POST",
      }),
      requestId: "request-gateway-success",
    });

    expect(result).toMatchObject({
      content: "gateway ok",
      modelId: "deepseek-v4-flash",
      requestId: "request-gateway-success",
      usage: {
        credits: 2,  // deepseek-v4-flash at 1×, 1200 tokens = 2 credits
        inputTokens: 600,
        outputTokens: 600,
        totalTokens: 1200,
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];

    expect(init.headers).toMatchObject({
      Authorization: "Bearer sk-gateway-user-token",
    });
    expect(ledger.all()).toHaveLength(1);
    expect(ledger.all()[0]).toMatchObject({
      credits: 2,
      modelId: "deepseek-v4-flash",
      operatorId: "operator-gateway",
      status: "succeeded",
      userId: "user-gateway-test",
    });
  });

  it("records failed ledger row when provider call fails", async () => {
    const ledger = new InMemoryUsageLedgerRepository();
    const fetcher = vi.fn(async () =>
      Response.json({ error: "upstream failure" }, { status: 500 }),
    );

    await expect(
      executeAiGatewayChatRequest({
        body: {
          messages: [{ content: "hello", role: "user" }],
          modelId: "gpt-4o-mini",
          operatorId: "operator-gateway",
        },
        fetcher,
        ledger,
        request: new Request("http://localhost/api/chat", {
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
        requestId: "request-gateway-fail",
      }),
    ).rejects.toBeDefined();

    // Failed ledger row should exist (no credits charged)
    expect(ledger.all().filter((r) => r.status === "failed")).toHaveLength(1);
    expect(ledger.all().at(-1)).toMatchObject({
      credits: 0,
      modelId: "gpt-4o-mini",
      status: "failed",
    });
  });
});
