import { describe, expect, it } from "vitest";

import {
  estimateImageGenerationPoints,
  estimateModelPoints,
  getPlanConfig,
  normalizeProductPlan,
} from "./plan-config";

describe("minimal product plan config", () => {
  it("normalizes MVP plan names without introducing a billing system", () => {
    expect(normalizeProductPlan("free")).toBe("Free");
    expect(normalizeProductPlan("basic")).toBe("Basic");
    expect(normalizeProductPlan("pro")).toBe("Pro");
    expect(normalizeProductPlan("team")).toBe("Team");
    expect(normalizeProductPlan("enterprise")).toBe("Team");
  });

  it("keeps Free narrow, Basic useful, and Pro unlocked for premium models", () => {
    expect(getPlanConfig("Free")).toMatchObject({
      allowedModelIds: ["gpt-4o-mini", "deepseek-chat"],
      monthlyPoints: 100_000,
    });
    expect(getPlanConfig("Basic").allowedModelIds).toContain("gpt-4o");
    expect(getPlanConfig("Basic").allowedModelIds).toContain("img2");
    expect(getPlanConfig("Basic").allowedModelIds).not.toContain(
      "claude-sonnet-4-20250514",
    );
    expect(getPlanConfig("Pro").allowedModelIds).toContain(
      "claude-sonnet-4-20250514",
    );
  });

  it("uses coarse MVP multipliers instead of exact provider billing", () => {
    expect(estimateModelPoints("gpt-4o-mini", 1200)).toBe(2);
    expect(estimateModelPoints("gpt-4o", 1200)).toBe(10);
    expect(estimateModelPoints("claude-sonnet-4-20250514", 1200)).toBe(16);
  });

  it("uses fixed MVP points for image generation before precise billing exists", () => {
    expect(estimateImageGenerationPoints({ modelId: "img2", quality: "standard" })).toBe(
      1_000,
    );
    expect(estimateImageGenerationPoints({ modelId: "img2", quality: "high" })).toBe(
      2_500,
    );
    expect(estimateImageGenerationPoints({ modelId: "img2", quality: "ultra" })).toBe(
      5_000,
    );
  });
});
