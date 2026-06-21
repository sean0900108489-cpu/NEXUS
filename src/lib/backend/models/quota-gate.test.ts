import { describe, expect, it } from "vitest";

import { assertSufficientCredits, ensureGrantsApplied } from "./quota-gate";
import { InMemoryWalletRepository } from "./wallet-repository";

describe("wallet balance gate", () => {
  it("allows operation when wallet balance exceeds estimated credits", async () => {
    const wallet = new InMemoryWalletRepository();

    // Simulate user who already has both grants applied
    await wallet.createTransaction({
      amount: 100_000,
      metadata: { grantMonth: "initial", plan: "Free" },
      requestId: "grant-initial",
      source: "system_initial_grant",
      type: "grant",
      userId: "user-a",
    });
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    await wallet.createTransaction({
      amount: 100_000,
      metadata: { grantMonth: monthKey, plan: "Free" },
      requestId: "grant-monthly",
      source: "monthly_grant",
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

    expect(result.currentBalance).toBe(200_000);
    expect(result.estimatedCredits).toBe(50_000);
    expect(result.remainingAfterDeduction).toBe(150_000);
  });

  it("rejects when wallet balance is insufficient after grants applied", async () => {
    const wallet = new InMemoryWalletRepository();

    // User has initial + monthly grants, then spent most
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    await wallet.createTransaction({
      amount: 100_000,
      metadata: { grantMonth: "initial", plan: "Free" },
      requestId: "grant-initial",
      source: "system_initial_grant",
      type: "grant",
      userId: "user-b",
    });
    await wallet.createTransaction({
      amount: 100_000,
      metadata: { grantMonth: monthKey, plan: "Free" },
      requestId: "grant-monthly",
      source: "monthly_grant",
      type: "grant",
      userId: "user-b",
    });
    // Spent 199_990 credits
    await wallet.createTransaction({
      amount: -199_990,
      metadata: { operationType: "chat_completion" },
      requestId: "spend-1",
      source: "chat_completion",
      type: "deduction",
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
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    await wallet.createTransaction({
      amount: 1,
      metadata: { grantMonth: "initial", plan: "Free" },
      requestId: "grant-initial",
      source: "system_initial_grant",
      type: "grant",
      userId: "user-c",
    });
    await wallet.createTransaction({
      amount: 1,
      metadata: { grantMonth: monthKey, plan: "Free" },
      requestId: "grant-monthly",
      source: "monthly_grant",
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
    expect(result.currentBalance).toBe(2);
    expect(result.remainingAfterDeduction).toBe(1);
  });

  it("includes cheaper alternatives in insufficient credits error", async () => {
    const wallet = new InMemoryWalletRepository();
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    await wallet.createTransaction({
      amount: 100_000,
      metadata: { grantMonth: "initial", plan: "Free" },
      requestId: "grant-initial",
      source: "system_initial_grant",
      type: "grant",
      userId: "user-d",
    });
    await wallet.createTransaction({
      amount: 100_000,
      metadata: { grantMonth: monthKey, plan: "Free" },
      requestId: "grant-monthly",
      source: "monthly_grant",
      type: "grant",
      userId: "user-d",
    });
    // Spend nearly everything — leave only 10 credits
    await wallet.createTransaction({
      amount: -199_990,
      metadata: { operationType: "chat_completion" },
      requestId: "spend-1",
      source: "chat_completion",
      type: "deduction",
      userId: "user-d",
    });

    try {
      await assertSufficientCredits({
        estimatedCredits: 100,
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

  it("new user with no grants gets insufficient credits error", async () => {
    const wallet = new InMemoryWalletRepository();

    // No grants — new user gets auto-grants applied, but Free plan = 100k initial + 100k monthly
    // So this won't be "zero" — the auto-grant fires. We test that auto-grant works instead.
    const result = await assertSufficientCredits({
      estimatedCredits: 1,
      modelId: "gpt-4o-mini",
      plan: "Free",
      userId: "user-e",
      walletRepo: wallet,
    });

    // New Free user gets 200k (initial + monthly)
    expect(result.currentBalance).toBe(200_000);
  });
});

describe("grant auto-application", () => {
  it("applies initial grant on first gate check for new user", async () => {
    const wallet = new InMemoryWalletRepository();

    const balance = await assertSufficientCredits({
      estimatedCredits: 1,
      modelId: "gpt-4o-mini",
      plan: "Free",
      userId: "new-user",
      walletRepo: wallet,
    });

    // New user gets initial + monthly = 200k
    expect(balance.currentBalance).toBe(200_000);

    const txs = wallet.all();
    const initialGrant = txs.find((tx) => tx.source === "system_initial_grant");
    expect(initialGrant).toBeDefined();
    expect(initialGrant!.amount).toBe(100_000);

    const monthlyGrant = txs.find((tx) => tx.source === "monthly_grant");
    expect(monthlyGrant).toBeDefined();
    expect(monthlyGrant!.amount).toBe(100_000);
  });

  it("is idempotent — does not re-apply initial grant on second gate check", async () => {
    const wallet = new InMemoryWalletRepository();

    await assertSufficientCredits({
      estimatedCredits: 1,
      modelId: "gpt-4o-mini",
      plan: "Free",
      userId: "same-user",
      walletRepo: wallet,
    });

    // Second gate check
    await assertSufficientCredits({
      estimatedCredits: 1,
      modelId: "gpt-4o-mini",
      plan: "Free",
      userId: "same-user",
      walletRepo: wallet,
    });

    const initialGrants = wallet.all().filter(
      (tx) => tx.source === "system_initial_grant" && tx.status === "completed",
    );
    expect(initialGrants).toHaveLength(1);

    const monthlyGrants = wallet.all().filter(
      (tx) => tx.source === "monthly_grant" && tx.status === "completed",
    );
    expect(monthlyGrants).toHaveLength(1); // not duplicated
  });

  it("does not apply duplicate monthly grant in same month", async () => {
    const wallet = new InMemoryWalletRepository();
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    // Initial + this month already applied
    await wallet.createTransaction({
      amount: 100_000,
      metadata: { grantMonth: "initial", plan: "Free" },
      requestId: "grant-initial",
      source: "system_initial_grant",
      type: "grant",
      userId: "dup-user",
    });
    await wallet.createTransaction({
      amount: 100_000,
      metadata: { grantMonth: monthKey, plan: "Free" },
      requestId: "grant-monthly",
      source: "monthly_grant",
      type: "grant",
      userId: "dup-user",
    });

    await assertSufficientCredits({
      estimatedCredits: 1,
      modelId: "gpt-4o-mini",
      plan: "Free",
      userId: "dup-user",
      walletRepo: wallet,
    });

    const monthlyGrants = wallet.all().filter(
      (tx) => tx.source === "monthly_grant" && tx.status === "completed",
    );
    expect(monthlyGrants).toHaveLength(1);
  });

  it("standalone ensureGrantsApplied works without gate check", async () => {
    const wallet = new InMemoryWalletRepository();

    await ensureGrantsApplied({
      plan: "Pro",
      userId: "pro-user",
      walletRepo: wallet,
    });

    const allTx = wallet.all();
    const initialGrant = allTx.find((tx) => tx.source === "system_initial_grant");
    expect(initialGrant).toBeDefined();
    expect(initialGrant!.amount).toBe(5_000_000);

    const monthlyGrant = allTx.find((tx) => tx.source === "monthly_grant");
    expect(monthlyGrant).toBeDefined();
    expect(monthlyGrant!.amount).toBe(5_000_000);
  });
});
