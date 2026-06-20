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
 * Phase 1 (S-3): Balance read + comparison. No reservation.
 * Race risk accepted — negative balance safety net in wallet_balances CHECK.
 *
 * Plan is used ONLY for capability checking (allowedModelIds).
 * Spending is governed by wallet balance = SUM(wallet_transactions.amount).
 */
export async function assertSufficientCredits(input: {
  estimatedCredits: number;
  walletRepo: WalletRepository;
  plan: ProductPlan;
  modelId: string;
  userId: string;
}) {
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
