import { normalizeUserPlan, type UserPlan } from "./model-catalog";

export type ProductPlan = UserPlan;

export type ProductPlanConfig = {
  allowedModelIds: string[];
  monthlyPoints: number;
};

export const PRODUCT_PLAN_CONFIG: Record<ProductPlan, ProductPlanConfig> = {
  Free: {
    allowedModelIds: ["gpt-4o-mini", "deepseek-chat"],
    monthlyPoints: 100_000,
  },
  Basic: {
    allowedModelIds: [
      "gpt-4o-mini",
      "deepseek-chat",
      "deepseek-v4-flash",
      "gpt-4o",
      "gemini-2.5-flash",
      "img2",
    ],
    monthlyPoints: 1_000_000,
  },
  Pro: {
    allowedModelIds: [
      "gpt-4o-mini",
      "deepseek-chat",
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "gpt-4o",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "claude-sonnet-4-20250514",
      "img2",
    ],
    monthlyPoints: 5_000_000,
  },
  Team: {
    allowedModelIds: [
      "gpt-4o-mini",
      "deepseek-chat",
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "gpt-4o",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "claude-sonnet-4-20250514",
      "img2",
    ],
    monthlyPoints: 20_000_000,
  },
};

const MODEL_POINT_MULTIPLIERS: Record<string, number> = {
  "claude-sonnet-4-20250514": 8,
  "deepseek-chat": 1,
  "deepseek-v4-flash": 1,
  "deepseek-v4-pro": 3,
  "gemini-2.5-flash": 1,
  "gemini-2.5-pro": 6,
  "gpt-4o": 5,
  "gpt-4o-mini": 1,
  img2: 1,
};

const IMAGE_GENERATION_FIXED_POINTS: Record<string, number> = {
  high: 2_500,
  standard: 1_000,
  ultra: 5_000,
};

export function normalizeProductPlan(value: unknown): ProductPlan {
  return normalizeUserPlan(value);
}

export function getPlanConfig(plan: ProductPlan) {
  return PRODUCT_PLAN_CONFIG[plan];
}

export function isModelAllowedByPlan(modelId: string, plan: ProductPlan) {
  return getPlanConfig(plan).allowedModelIds.includes(modelId);
}

export function estimateModelPoints(modelId: string, totalTokens: number) {
  const tokenUnits = Math.max(1, Math.ceil(Math.max(0, totalTokens) / 1000));
  const multiplier = MODEL_POINT_MULTIPLIERS[modelId] ?? 1;

  return tokenUnits * multiplier;
}

export function estimateImageGenerationPoints(input: {
  modelId: string;
  quality?: string;
}) {
  const qualityPoints = IMAGE_GENERATION_FIXED_POINTS[input.quality ?? "standard"] ??
    IMAGE_GENERATION_FIXED_POINTS.standard;
  const multiplier = MODEL_POINT_MULTIPLIERS[input.modelId] ?? 1;

  return qualityPoints * multiplier;
}

export function getUserPlan(input: {
  request?: Request;
  userId?: string;
}): ProductPlan {
  const testPlan = input.request?.headers.get("X-Nexus-Test-Plan");

  if (process.env.NODE_ENV === "test" && testPlan) {
    return normalizeProductPlan(testPlan);
  }

  const userPlanOverrides = parseUserPlanOverrides(process.env.NEXUS_USER_PLAN_OVERRIDES);
  const override = input.userId ? userPlanOverrides[input.userId] : undefined;

  return normalizeProductPlan(override ?? process.env.NEXUS_DEFAULT_PLAN ?? "Free");
}

function parseUserPlanOverrides(value: string | undefined) {
  if (!value?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}
