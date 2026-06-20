import { describe, expect, it } from "vitest";

import { assertSufficientCredits } from "./quota-gate";
import { InMemoryWalletRepository } from "./wallet-repository";

describe("wallet balance gate", () => {
  it("allows operation when wallet balance exceeds estimated credits", async () => {
    const wallet = new InMemoryWalletRepository();

    // Grant initial credits
    await wallet.createTransaction({
      amount: 100_000,
      metadata: { plan: "Free", reason: "initial_grant" },
      requestId: "grant-1",
      source: "system_initial_grant",
      type: "grant",
      userId: "user-a",
    });

    const result = await assertSufficientCredits({
      estimatedCredits: 50_000,
      modelId: "gpt-4o-mini",
      plan: "Free",
      userId: "user-a",
      walletRepo: wallet,
    });

    expect(result.currentBalance).toBe(100_000);
    expect(result.estimatedCredits).toBe(50_000);
    expect(result.remainingAfterDeduction).toBe(50_000);
  });

  it("rejects when wallet balance is insufficient", async () => {
    const wallet = new InMemoryWalletRepository();

    // Grant just enough to be short
    await wallet.createTransaction({
      amount: 10,
      metadata: { plan: "Free", reason: "initial_grant" },
      requestId: "grant-1",
      source: "system_initial_grant",
      type: "grant",
      userId: "user-b",
    });

    await expect(
      assertSufficientCredits({
        estimatedCredits: 100,
        modelId: "gpt-4o",
        plan: "Free",
        userId: "user-b",
        walletRepo: wallet,
      }),
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDITS",
      statusCode: 402,
    });
  });

  it("rounds estimated credits up to minimum 1", async () => {
    const wallet = new InMemoryWalletRepository();

    await wallet.createTransaction({
      amount: 1,
      metadata: { plan: "Free" },
      requestId: "grant-1",
      source: "system_initial_grant",
      type: "grant",
      userId: "user-c",
    });

    const result = await assertSufficientCredits({
      estimatedCredits: 0.5,
      modelId: "gpt-4o-mini",
      plan: "Free",
      userId: "user-c",
      walletRepo: wallet,
    });

    expect(result.estimatedCredits).toBe(1);
    expect(result.remainingAfterDeduction).toBe(0);
  });

  it("includes cheaper alternatives in insufficient credits error", async () => {
    const wallet = new InMemoryWalletRepository();

    // User has 1 credit — gpt-4o-mini at 1x might be affordable
    await wallet.createTransaction({
      amount: 1,
      metadata: { plan: "Free" },
      requestId: "grant-1",
      source: "system_initial_grant",
      type: "grant",
      userId: "user-d",
    });

    try {
      await assertSufficientCredits({
        estimatedCredits: 10,  // gpt-4o at 5x needs ~50 credits
        modelId: "gpt-4o",
        plan: "Free",
        userId: "user-d",
        walletRepo: wallet,
      });
      expect.fail("Expected insufficient credits error");
    } catch (error) {
      const apiErr = error as { code: string; details?: Record<string, unknown> };
      expect(apiErr.code).toBe("INSUFFICIENT_CREDITS");
      expect(apiErr.details).toBeDefined();
      expect(apiErr.details!.shortfall).toBeGreaterThan(0);
      expect(apiErr.details!.modelId).toBe("gpt-4o");
      expect(Array.isArray(apiErr.details!.cheaperAlternatives)).toBe(true);
    }
  });

  it("zero balance rejects any operation", async () => {
    const wallet = new InMemoryWalletRepository();

    // No grants — zero balance

    await expect(
      assertSufficientCredits({
        estimatedCredits: 1,
        modelId: "gpt-4o-mini",
        plan: "Free",
        userId: "user-e",
        walletRepo: wallet,
      }),
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDITS",
      statusCode: 402,
    });
  });
});
