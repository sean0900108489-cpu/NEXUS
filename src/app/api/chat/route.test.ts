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
import { getInMemoryWalletRepository } from "@/lib/backend/models/wallet-repository";

import { POST } from "./route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    getInMemoryUsageLedgerRepository().clear();
    getInMemoryWalletRepository().clear();
    const secret = "test-encryption-secret-with-enough-entropy";
    setApiAuthSessionVerifierForTests({
      verifyRequest: async () => ({
        id: "user-quota-test",
      }),
    });
    setUserNewApiTokenRepositoryForTests({
      findByUserId: async (userId) => ({
        enabled: true,
        encryptedNewApiToken: encryptNewApiToken("sk-user-quota-test", { secret }),
        group: "test",
        plan: "free",
        tokenId: "token-quota-test",
        tokenName: "Quota Test",
        userId,
      }),
    });
    vi.stubEnv("NEW_API_BASE_URL", "https://new-api.example.test/v1");
    vi.stubEnv("NEW_API_TOKEN_ENCRYPTION_SECRET", secret);
    vi.stubEnv("NEW_API_KEY", "server-new-api-key");
  });

  afterEach(() => {
    resetApiAuthSessionVerifierForTests();
    resetUserNewApiTokenRepositoryForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the authenticated user's mapped New API token and never returns it", async () => {
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
          "X-User-Id": "user-quota-test",
        },
        method: "POST",
      }),
    );
    const payload = await response.json();
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];

    expect(response.status).toBe(200);
    expect(init.headers).toMatchObject({
      Authorization: "Bearer sk-user-quota-test",
    });
    expect(JSON.stringify(payload)).not.toContain("sk-user-quota-test");
    expect(JSON.stringify(getInMemoryUsageLedgerRepository().all())).not.toContain(
      "sk-user-quota-test",
    );
  });

  it("rejects authenticated users without a mapped New API token before fetch", async () => {
    resetUserNewApiTokenRepositoryForTests();
    setApiAuthSessionVerifierForTests({ verifyRequest: async () => ({ id: 'user-no-token-test' }) });
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
          "X-User-Id": "user-no-token-test",
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
      sourceType: "operator_chat",
      status: "failed",
    });
  });

  it("rejects when wallet balance is exhausted before calling New API", async () => {
    const wallet = getInMemoryWalletRepository();

    // Grant initial credits then spend them all (leave 0 balance)
    await wallet.createTransaction({
      amount: 100_000,
      metadata: { grantMonth: "initial", plan: "Free" },
      requestId: "grant-init",
      source: "system_initial_grant",
      type: "grant",
      userId: "user-quota-test",
    });
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    await wallet.createTransaction({
      amount: 100_000,
      metadata: { grantMonth: monthKey, plan: "Free" },
      requestId: "grant-monthly",
      source: "monthly_grant",
      type: "grant",
      userId: "user-quota-test",
    });
    // Spend everything
    await wallet.createTransaction({
      amount: -200_000,
      metadata: { operationType: "chat_completion" },
      requestId: "spend-all",
      source: "chat_completion",
      type: "deduction",
      userId: "user-quota-test",
    });

    const ledger = getInMemoryUsageLedgerRepository();
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
    // Failed ledger row should be recorded
    expect(ledger.all().filter((record) => record.status === "failed")).toHaveLength(1);
    expect(ledger.all().at(-1)).toMatchObject({
      errorCode: "INSUFFICIENT_CREDITS",
      modelId: "gpt-4o-mini",
      status: "failed",
    });
  });
});
