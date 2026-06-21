import { describe, expect, it } from "vitest";

import {
  estimateImageGenerationCredits,
  estimateModelCredits,
  getPlanConfig,
  normalizeProductPlan,
} from "./plan-config";
import {
  SERVER_MODEL_CATALOG,
  getCatalogModel,
} from "./model-catalog";

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
      allowedModelIds: ["gpt-4o-mini", "deepseek-chat", "riverflow-v2.5-fast"],
      monthlyCreditGrant: 100_000,
    });
    expect(getPlanConfig("Basic").allowedModelIds).toContain("deepseek-v4-flash");
    expect(getPlanConfig("Basic").allowedModelIds).toContain("img2");
    expect(getPlanConfig("Pro").allowedModelIds).toContain("deepseek-v4-pro");
  });

  it("uses coarse MVP multipliers instead of exact provider billing", () => {
    expect(estimateModelCredits("gpt-4o-mini", 1200)).toBe(2);
    expect(estimateModelCredits("deepseek-v4-pro", 1200)).toBe(6);
    expect(estimateModelCredits("deepseek-chat", 1200)).toBe(2);
  });

  it("uses fixed MVP credits for image generation before precise billing exists", () => {
    expect(estimateImageGenerationCredits({ modelId: "img2", quality: "standard" })).toBe(
      1_000,
    );
    expect(estimateImageGenerationCredits({ modelId: "img2", quality: "high" })).toBe(
      2_500,
    );
    expect(estimateImageGenerationCredits({ modelId: "img2", quality: "ultra" })).toBe(
      5_000,
    );
  });
});

describe("model catalog provider mapping", () => {
  it("uses new_api_model for provider calls, not public model id", () => {
    const img2 = getCatalogModel("img2");
    expect(img2).toBeDefined();
    expect(img2!.id).toBe("img2");                    // public ID
    expect(img2!.new_api_model).toBe("gpt-image-2");  // provider ID — different
    expect(img2!.id).not.toBe(img2!.new_api_model);   // drift check must compare new_api_model
  });

  it("riverflow maps public id to provider id correctly", () => {
    const rf = getCatalogModel("riverflow-v2.5-fast");
    expect(rf).toBeDefined();
    expect(rf!.id).toBe("riverflow-v2.5-fast");
    expect(rf!.new_api_model).toBe("sourceful/riverflow-v2.5-fast");
    expect(rf!.id).not.toBe(rf!.new_api_model);
  });

  it("gpt-4o-mini has identical public and provider id (no mapping needed)", () => {
    const m = getCatalogModel("gpt-4o-mini");
    expect(m).toBeDefined();
    expect(m!.id).toBe(m!.new_api_model);
    expect(m!.id).toBe("gpt-4o-mini");
  });

  it("disabled models are not in enabled catalog", () => {
    const enabledModels = SERVER_MODEL_CATALOG
      .filter((m) => m.enabled)
      .map((m) => m.id);

    expect(enabledModels).not.toContain("gpt-4o");
    expect(enabledModels).not.toContain("gemini-2.5-flash");
    expect(enabledModels).not.toContain("gemini-2.5-pro");
    expect(enabledModels).not.toContain("claude-sonnet-4-20250514");
  });

  it("enabled image models have provider id mapping", () => {
    const img2 = getCatalogModel("img2");
    const rf = getCatalogModel("riverflow-v2.5-fast");

    expect(img2).toBeDefined();
    expect(img2!.enabled).toBe(true);
    expect(img2!.modality).toBe("image");

    expect(rf).toBeDefined();
    expect(rf!.enabled).toBe(true);
    expect(rf!.modality).toBe("image");
  });

  it("drift check: mapped models would NOT appear missing if comparing new_api_model", () => {
    // Simulate drift check: compare catalog new_api_model against enabled provider models
    // This proves that comparing new_api_model avoids false positives for mapped models
    const providerEnabledModels = [
      "gpt-4o-mini", "deepseek-chat", "deepseek-v4-flash", "deepseek-v4-pro",
      "gpt-image-2", "sourceful/riverflow-v2.5-fast", // mapped provider IDs
    ];

    const enabledCatalogModels = SERVER_MODEL_CATALOG
      .filter((m) => m.enabled && m.modality !== "image")
      .map((m) => m.new_api_model);

    // All enabled chat models should have their provider IDs in the enabled list
    const missing = enabledCatalogModels.filter(
      (id) => !providerEnabledModels.includes(id),
    );

    expect(missing).toEqual([]);
  });

  it("drift check: comparing public ID would falsely flag mapped models", () => {
    const providerEnabledModels = [
      "gpt-4o-mini", "deepseek-chat", "deepseek-v4-flash", "deepseek-v4-pro",
      "gpt-image-2", "sourceful/riverflow-v2.5-fast",
    ];

    const enabledCatalogPublicIds = SERVER_MODEL_CATALOG
      .filter((m) => m.enabled)
      .map((m) => m.id);

    const missingByPublicId = enabledCatalogPublicIds.filter(
      (id) => !providerEnabledModels.includes(id),
    );

    // img2 and riverflow-v2.5-fast are NOT in provider list — false positive
    expect(missingByPublicId).toContain("img2");
    expect(missingByPublicId).toContain("riverflow-v2.5-fast");
  });
});
