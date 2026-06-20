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
import { getInMemoryUsageLedgerRepository } from "@/lib/backend/models/usage-ledger";

import { POST } from "./route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    getInMemoryUsageLedgerRepository().clear();
    setApiAuthSessionVerifierForTests({
      verifyRequest: async () => ({
        id: "user-quota-test",
      }),
    });
    vi.stubEnv("NEW_API_BASE_URL", "https://new-api.example.test/v1");
    vi.stubEnv("NEW_API_KEY", "server-new-api-key");
  });

  afterEach(() => {
    resetApiAuthSessionVerifierForTests();
    resetUserNewApiTokenRepositoryForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the authenticated user's mapped New API token and never returns it", async () => {
    const secret = "test-encryption-secret-with-enough-entropy";
    vi.stubEnv("NEW_API_TOKEN_ENCRYPTION_SECRET", secret);
    setApiAuthSessionVerifierForTests({
      verifyRequest: async () => ({
        id: "user-token-a",
      }),
    });
    setUserNewApiTokenRepositoryForTests({
      findByUserId: async (userId) => ({
        enabled: true,
        encryptedNewApiToken: encryptNewApiToken("sk-user-token-a", { secret }),
        group: "group-a",
        plan: "pro",
        tokenId: "newapi-token-a",
        tokenName: "User A",
        userId,
      }),
    });
    const fetcher = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "token mapped ok" } }],
        usage: { completion_tokens: 5, prompt_tokens: 7, total_tokens: 12 },
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(
      new Request("http://localhost/api/chat", {
        body: JSON.stringify({
          messages: [{ content: "hello", role: "user" }],
          modelId: "gpt-4o-mini",
          operatorId: "operator-token-a",
        }),
        headers: {
          "Content-Type": "application/json",
          "X-Nexus-Test-Plan": "Free",
          "X-Request-Id": "req-user-token-a",
          "X-User-Id": "user-token-a",
        },
        method: "POST",
      }),
    );
    const payload = await response.json();
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];

    expect(response.status).toBe(200);
    expect(init.headers).toMatchObject({
      Authorization: "Bearer sk-user-token-a",
    });
    expect(JSON.stringify(payload)).not.toContain("sk-user-token-a");
    expect(JSON.stringify(getInMemoryUsageLedgerRepository().all())).not.toContain(
      "sk-user-token-a",
    );
  });

  it("uses different mapped New API tokens for different authenticated users", async () => {
    const secret = "test-encryption-secret-with-enough-entropy";
    const userTokens = new Map([
      ["user-token-a", "sk-user-token-a"],
      ["user-token-b", "sk-user-token-b"],
    ]);
    vi.stubEnv("NEW_API_TOKEN_ENCRYPTION_SECRET", secret);
    setUserNewApiTokenRepositoryForTests({
      findByUserId: async (userId) => {
        const token = userTokens.get(userId);

        return token
          ? {
              enabled: true,
              encryptedNewApiToken: encryptNewApiToken(token, { secret }),
              group: userId === "user-token-b" ? "svip" : "default",
              plan: userId === "user-token-b" ? "pro" : "free",
              tokenId: `newapi-${userId}`,
              tokenName: `Mapped ${userId}`,
              userId,
            }
          : null;
      },
    });
    const fetcher = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "mapped ok" } }],
        usage: { completion_tokens: 5, prompt_tokens: 7, total_tokens: 12 },
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    for (const userId of ["user-token-a", "user-token-b"]) {
      setApiAuthSessionVerifierForTests({
        verifyRequest: async () => ({
          id: userId,
        }),
      });

      const response = await POST(
        new Request("http://localhost/api/chat", {
          body: JSON.stringify({
            messages: [{ content: "hello", role: "user" }],
            modelId: "gpt-4o-mini",
            operatorId: `operator-${userId}`,
          }),
          headers: {
            "Content-Type": "application/json",
            "X-Nexus-Test-Plan": userId === "user-token-b" ? "Pro" : "Free",
            "X-Request-Id": `req-${userId}`,
            "X-User-Id": userId,
          },
          method: "POST",
        }),
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(JSON.stringify(payload)).not.toContain("sk-user-token-a");
      expect(JSON.stringify(payload)).not.toContain("sk-user-token-b");
    }

    const authorizations = (
      fetcher.mock.calls as unknown as Array<[string, RequestInit]>
    ).map(([, init]) => {
      return init.headers as Record<string, string>;
    });

    expect(authorizations).toEqual([
      expect.objectContaining({ Authorization: "Bearer sk-user-token-a" }),
      expect.objectContaining({ Authorization: "Bearer sk-user-token-b" }),
    ]);
    expect(JSON.stringify(getInMemoryUsageLedgerRepository().all())).not.toContain(
      "sk-user-token-a",
    );
    expect(JSON.stringify(getInMemoryUsageLedgerRepository().all())).not.toContain(
      "sk-user-token-b",
    );
    expect(getInMemoryUsageLedgerRepository().all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operatorId: "operator-user-token-a",
          sourceType: "operator_chat",
          userId: "user-token-a",
        }),
        expect.objectContaining({
          operatorId: "operator-user-token-b",
          sourceType: "operator_chat",
          userId: "user-token-b",
        }),
      ]),
    );
  });

  it("rejects authenticated users without a mapped New API token before fetch", async () => {
    setApiAuthSessionVerifierForTests({
      verifyRequest: async () => ({
        id: "user-without-token",
      }),
    });
    setUserNewApiTokenRepositoryForTests({
      findByUserId: async () => null,
    });
    const fetcher = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "should not run" } }],
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(
      new Request("http://localhost/api/chat", {
        body: JSON.stringify({
          messages: [{ content: "hello", role: "user" }],
          modelId: "gpt-4o-mini",
          operatorId: "operator-no-token",
        }),
        headers: {
          "Content-Type": "application/json",
          "X-Nexus-Test-Plan": "Free",
          "X-Request-Id": "req-no-token",
          "X-User-Id": "user-without-token",
        },
        method: "POST",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("USER_NEW_API_TOKEN_NOT_CONFIGURED");
    expect(fetcher).not.toHaveBeenCalled();
    expect(getInMemoryUsageLedgerRepository().all().at(-1)).toMatchObject({
      errorCode: "USER_NEW_API_TOKEN_NOT_CONFIGURED",
      modelId: "gpt-4o-mini",
      operatorId: "operator-no-token",
      requestId: "req-no-token",
      sourceType: "operator_chat",
      status: "failed",
      userId: "user-without-token",
    });
  });

  it("rejects an over-limit Free user before calling New API", async () => {
    const ledger = getInMemoryUsageLedgerRepository();
    const currentMonth = new Date();
    currentMonth.setUTCDate(3);

    await ledger.insert({
      credits: 100_000,
      conversationId: "conversation-quota",
      createdAt: currentMonth.toISOString(),
      errorCode: null,
      inputTokens: 100,
      modelId: "gpt-4o-mini",
      newApiModel: "gpt-4o-mini",
      operatorId: "operator-quota",
      outputTokens: 100,
      providerFamily: "OpenAI",
      requestId: "request-already-used",
      sourceType: "operator_chat",
      status: "succeeded",
      totalTokens: 200,
      userId: "user-quota-test",
    });
    const fetcher = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "should not run" } }],
        usage: { completion_tokens: 5, prompt_tokens: 5, total_tokens: 10 },
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(
      new Request("http://localhost/api/chat", {
        body: JSON.stringify({
          messages: [{ content: "hello", role: "user" }],
          modelId: "gpt-4o-mini",
          operatorId: "operator-quota",
        }),
        headers: {
          "Content-Type": "application/json",
          "X-Nexus-Test-Plan": "Free",
          "X-User-Id": "user-quota-test",
        },
        method: "POST",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(402);
    expect(payload.error.code).toBe("INSUFFICIENT_CREDITS");
    expect(fetcher).not.toHaveBeenCalled();
    expect(ledger.all().filter((record) => record.status === "failed")).toHaveLength(1);
  });
});
