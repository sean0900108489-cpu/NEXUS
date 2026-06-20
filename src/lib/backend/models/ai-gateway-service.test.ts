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
  });

  afterEach(() => {
    resetApiAuthSessionVerifierForTests();
    resetUserNewApiTokenRepositoryForTests();
    vi.unstubAllEnvs();
  });

  it("runs chat requests through plan, quota, New API, and usage ledger", async () => {
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
        modelId: "gpt-4o",
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
      modelId: "gpt-4o",
      requestId: "request-gateway-success",
      usage: {
        credits: 10,
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
      credits: 10,
      modelId: "gpt-4o",
      operatorId: "operator-gateway",
      status: "succeeded",
      userId: "user-gateway-test",
    });
  });

  it("rejects over-limit requests before New API and records a failed ledger row", async () => {
    const ledger = new InMemoryUsageLedgerRepository();
    const currentMonth = new Date();
    currentMonth.setUTCDate(2);
    await ledger.insert({
      credits: 100_000,
      conversationId: "conversation-gateway",
      createdAt: currentMonth.toISOString(),
      errorCode: null,
      inputTokens: 100,
      modelId: "gpt-4o-mini",
      newApiModel: "gpt-4o-mini",
      operatorId: "operator-gateway",
      outputTokens: 100,
      providerFamily: "OpenAI",
      requestId: "request-already-used",
      sourceType: "operator_chat",
      status: "succeeded",
      totalTokens: 200,
      userId: "user-gateway-test",
    });
    const fetcher = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "should not run" } }],
        usage: { completion_tokens: 5, prompt_tokens: 5, total_tokens: 10 },
      }),
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
          headers: {
            "Content-Type": "application/json",
            "X-Nexus-Test-Plan": "Free",
            "X-User-Id": "user-gateway-test",
          },
          method: "POST",
        }),
        requestId: "request-gateway-quota",
      }),
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDITS",
      statusCode: 402,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(ledger.all().filter((record) => record.status === "failed")).toHaveLength(1);
    expect(ledger.all().at(-1)).toMatchObject({
      errorCode: "INSUFFICIENT_CREDITS",
      modelId: "gpt-4o-mini",
      operatorId: "operator-gateway",
      requestId: "request-gateway-quota",
    });
  });
});
