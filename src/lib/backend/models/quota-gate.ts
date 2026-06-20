import { ApiError } from "@/lib/backend/api/api-errors";

import { getPlanConfig, type ProductPlan } from "./plan-config";
import type { UsageLedgerRepository } from "./usage-ledger";

export async function getCurrentMonthUsageCredits(input: {
  ledger: UsageLedgerRepository;
  now?: Date;
  userId: string;
}) {
  return input.ledger.sumCreditsForUserSince({
    since: getUtcMonthStart(input.now ?? new Date()),
    userId: input.userId,
  });
}

export async function assertSufficientCredits(input: {
  estimatedCredits: number;
  ledger: UsageLedgerRepository;
  now?: Date;
  plan: ProductPlan;
  userId: string;
}) {
  const usedCredits = await getCurrentMonthUsageCredits({
    ledger: input.ledger,
    now: input.now,
    userId: input.userId,
  });
  const monthlyGrant = getPlanConfig(input.plan).monthlyCreditGrant;
  const estimatedCredits = Math.max(1, Math.ceil(input.estimatedCredits));

  if (usedCredits + estimatedCredits > monthlyGrant) {
    throw new ApiError(
      "INSUFFICIENT_CREDITS",
      "Monthly AI usage quota has been reached for this plan.",
      402,
      {
        estimatedCredits,
        monthlyGrant,
        plan: input.plan,
        usedCredits,
      },
    );
  }

  return {
    estimatedCredits,
    monthlyGrant,
    remainingAfterEstimate: monthlyGrant - usedCredits - estimatedCredits,
    usedCredits,
  };
}

function getUtcMonthStart(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
