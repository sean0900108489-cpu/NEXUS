import { describe, expect, it } from "vitest";

import { InMemoryUsageLedgerRepository } from "./usage-ledger";

describe("usage ledger", () => {
  it("records the exact model used for every operator request", async () => {
    const ledger = new InMemoryUsageLedgerRepository();

    const record = await ledger.insert({
      chargedPoints: 10,
      conversationId: "conversation-a",
      errorCode: null,
      inputTokens: 6,
      modelId: "gpt-4o-mini",
      newApiModel: "gpt-4o-mini",
      operatorId: "NEXUS_1",
      outputTokens: 4,
      providerFamily: "OpenAI",
      requestId: "request-a",
      sourceType: "operator_chat",
      status: "succeeded",
      totalTokens: 10,
      userId: "user-a",
    });

    expect(record).toMatchObject({
      chargedPoints: 10,
      conversationId: "conversation-a",
      modelId: "gpt-4o-mini",
      newApiModel: "gpt-4o-mini",
      operatorId: "NEXUS_1",
      requestId: "request-a",
      sourceType: "operator_chat",
      userId: "user-a",
    });
  });
});
