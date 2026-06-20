import { describe, expect, it } from "vitest";

import { InMemoryUsageLedgerRepository } from "./usage-ledger";
import {
  assertSufficientCredits,
  getCurrentMonthUsageCredits,
} from "./quota-gate";

describe("minimal monthly quota gate", () => {
  it("counts only current-month succeeded usage for the authenticated user", async () => {
    const ledger = new InMemoryUsageLedgerRepository();

    await ledger.insert({
      credits: 90_000,
      conversationId: "conversation-a",
      createdAt: "2026-06-03T00:00:00.000Z",
      errorCode: null,
      inputTokens: 100,
      modelId: "gpt-4o-mini",
      newApiModel: "gpt-4o-mini",
      operatorId: "operator-a",
      outputTokens: 100,
      providerFamily: "OpenAI",
      requestId: "request-a",
      sourceType: "quota_test",
      status: "succeeded",
      totalTokens: 200,
      userId: "user-a",
    });
    await ledger.insert({
      credits: 50_000,
      conversationId: "conversation-b",
      createdAt: "2026-05-31T00:00:00.000Z",
      errorCode: null,
      inputTokens: 100,
      modelId: "gpt-4o-mini",
      newApiModel: "gpt-4o-mini",
      operatorId: "operator-a",
      outputTokens: 100,
      providerFamily: "OpenAI",
      requestId: "request-b",
      sourceType: "quota_test",
      status: "succeeded",
      totalTokens: 200,
      userId: "user-a",
    });
    await ledger.insert({
      credits: 50_000,
      conversationId: "conversation-c",
      createdAt: "2026-06-04T00:00:00.000Z",
      errorCode: "UPSTREAM_FAILED",
      inputTokens: 0,
      modelId: "gpt-4o-mini",
      newApiModel: "gpt-4o-mini",
      operatorId: "operator-a",
      outputTokens: 0,
      providerFamily: "OpenAI",
      requestId: "request-c",
      sourceType: "quota_test",
      status: "failed",
      totalTokens: 0,
      userId: "user-a",
    });
    await ledger.insert({
      credits: 75_000,
      conversationId: "conversation-d",
      createdAt: "2026-06-04T00:00:00.000Z",
      errorCode: null,
      inputTokens: 100,
      modelId: "gpt-4o-mini",
      newApiModel: "gpt-4o-mini",
      operatorId: "operator-b",
      outputTokens: 100,
      providerFamily: "OpenAI",
      requestId: "request-d",
      sourceType: "quota_test",
      status: "succeeded",
      totalTokens: 200,
      userId: "user-b",
    });

    await expect(
      getCurrentMonthUsageCredits({
        ledger,
        now: new Date("2026-06-10T00:00:00.000Z"),
        userId: "user-a",
      }),
    ).resolves.toBe(90_000);
  });

  it("rejects before execution when the MVP monthly limit would be exceeded", async () => {
    const ledger = new InMemoryUsageLedgerRepository();

    await ledger.insert({
      credits: 99_999,
      conversationId: "conversation-a",
      createdAt: "2026-06-03T00:00:00.000Z",
      errorCode: null,
      inputTokens: 100,
      modelId: "gpt-4o-mini",
      newApiModel: "gpt-4o-mini",
      operatorId: "operator-a",
      outputTokens: 100,
      providerFamily: "OpenAI",
      requestId: "request-a",
      sourceType: "quota_test",
      status: "succeeded",
      totalTokens: 200,
      userId: "user-a",
    });

    await expect(
      assertSufficientCredits({
        estimatedCredits: 2,
        ledger,
        now: new Date("2026-06-10T00:00:00.000Z"),
        plan: "Free",
        userId: "user-a",
      }),
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDITS",
      statusCode: 402,
    });
  });
});
