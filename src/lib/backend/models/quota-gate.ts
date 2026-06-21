import { ApiError } from "@/lib/backend/api/api-errors";
import {
  estimateModelCredits,
  getPlanConfig,
  type ProductPlan,
} from "./plan-config";
import type { WalletRepository } from "./wallet-types";

/**
 * Wallet balance gate — replaces monthly quota hard-cap model.
 *
 * Phase 2 (S-5): Grant auto-application added.
 * Before every gate check, ensures initial grant + monthly grant are applied.
 * Grants are idempotent — applied at most once per user/month.
 *
 * Race risk accepted — negative balance safety net in wallet_balances CHECK.
 *
 * Plan is used for: capability checking (allowedModelIds) + grant amounts.
 * Spending is governed by wallet balance = SUM(wallet_transactions.amount).
 */
export async function assertSufficientCredits(input: {
  estimatedCredits: number;
  walletRepo: WalletRepository;
  plan: ProductPlan;
  modelId: string;
  userId: string;
}) {
  // Auto-apply pending grants before checking balance
  await ensureGrantsApplied({
    plan: input.plan,
    userId: input.userId,
    walletRepo: input.walletRepo,
  });

  const balance = await input.walletRepo.getBalance(input.userId);
  const estimatedCredits = Math.max(1, Math.ceil(input.estimatedCredits));

  if (balance.currentBalance < estimatedCredits) {
    // Find cheaper alternatives the user CAN afford
    const planConfig = getPlanConfig(input.plan);
    const cheaperAlternatives = planConfig.allowedModelIds
      .filter((id) => id !== input.modelId)
      .map((id) => {
        const altEstimate = estimateModelCredits(id, 1000); // rough estimate
        return {
          estimatedCredits: altEstimate,
          label: id,
          modelId: id,
        };
      })
      .filter((alt) => alt.estimatedCredits <= balance.currentBalance)
      .slice(0, 3);

    throw new ApiError(
      "INSUFFICIENT_CREDITS",
      "Insufficient credits for this operation.",
      402,
      {
        cheaperAlternatives,
        currentBalance: balance.currentBalance,
        estimatedCredits,
        modelId: input.modelId,
        requiredCredits: estimatedCredits,
        shortfall: estimatedCredits - balance.currentBalance,
      },
    );
  }

  return {
    currentBalance: balance.currentBalance,
    estimatedCredits,
    remainingAfterDeduction: balance.currentBalance - estimatedCredits,
  };
}

/**
 * Ensure the user has received all entitled grants.
 *
 * Idempotent — each grant type is applied at most once:
 * - system_initial_grant: applied once, ever (first transaction)
 * - monthly_grant: applied once per calendar month
 *
 * Grants are applied BEFORE the balance check, so new users
 * and new-month users get their credits before being gated.
 */
export async function ensureGrantsApplied(input: {
  plan: ProductPlan;
  userId: string;
  walletRepo: WalletRepository;
}) {
  const planConfig = getPlanConfig(input.plan);
  const history = await input.walletRepo.getHistory({ userId: input.userId, limit: 200 });
  const transactions = history.transactions;

  // 1. Initial grant — once per user lifetime
  const hasInitialGrant = transactions.some(
    (tx) => tx.source === "system_initial_grant" && tx.status === "completed",
  );

  if (!hasInitialGrant) {
    await input.walletRepo.createTransaction({
      amount: planConfig.monthlyCreditGrant,
      metadata: {
        grantMonth: "initial",
        plan: input.plan,
        reason: "Account creation initial credit grant",
      },
      requestId: `grant_initial_${input.userId}`,
      source: "system_initial_grant",
      type: "grant",
      userId: input.userId,
    }).catch(() => undefined);
  }

  // 2. Monthly grant — once per calendar month
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const hasMonthlyGrantThisMonth = transactions.some(
    (tx) =>
      tx.source === "monthly_grant" &&
      tx.status === "completed" &&
      tx.metadata &&
      typeof tx.metadata === "object" &&
      (tx.metadata as Record<string, unknown>).grantMonth === monthKey,
  );

  if (!hasMonthlyGrantThisMonth) {
    await input.walletRepo.createTransaction({
      amount: planConfig.monthlyCreditGrant,
      metadata: {
        grantMonth: monthKey,
        plan: input.plan,
        reason: `Monthly credit grant for ${monthKey}`,
      },
      requestId: `grant_monthly_${input.userId}_${monthKey}`,
      source: "monthly_grant",
      type: "grant",
      userId: input.userId,
    }).catch(() => undefined);
  }
}
