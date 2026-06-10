import { ApiError } from "@/lib/backend/api/api-errors";

import { getPlanConfig, type ProductPlan } from "./plan-config";
import type { UsageLedgerRepository } from "./usage-ledger";

export async function getCurrentMonthUsagePoints(input: {
  ledger: UsageLedgerRepository;
  now?: Date;
  userId: string;
}) {
  return input.ledger.sumChargedPointsForUserSince({
    since: getUtcMonthStart(input.now ?? new Date()),
    userId: input.userId,
  });
}

export async function assertMonthlyQuotaAvailable(input: {
  estimatedPoints: number;
  ledger: UsageLedgerRepository;
  now?: Date;
  plan: ProductPlan;
  userId: string;
}) {
  const usedPoints = await getCurrentMonthUsagePoints({
    ledger: input.ledger,
    now: input.now,
    userId: input.userId,
  });
  const monthlyPoints = getPlanConfig(input.plan).monthlyPoints;
  const estimatedPoints = Math.max(1, Math.ceil(input.estimatedPoints));

  if (usedPoints + estimatedPoints > monthlyPoints) {
    throw new ApiError(
      "QUOTA_EXCEEDED",
      "Monthly AI usage quota has been reached for this plan.",
      402,
      {
        estimatedPoints,
        monthlyPoints,
        plan: input.plan,
        usedPoints,
      },
    );
  }

  return {
    estimatedPoints,
    monthlyPoints,
    remainingAfterEstimate: monthlyPoints - usedPoints - estimatedPoints,
    usedPoints,
  };
}

function getUtcMonthStart(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
