import { describe, expect, it } from "vitest";

import {
  assertModelAllowedForPlan,
  getAllowedModelCatalogForPlan,
  getAllowedModelCatalogForPlanAndModality,
  resolveAllowedModelId,
} from "./model-catalog";

describe("server-side model catalog", () => {
  it("filters model options by user plan before returning them to the frontend", () => {
    const freeModels = getAllowedModelCatalogForPlan("Free").map((model) => model.id);

    expect(freeModels).toContain("gpt-4o-mini");
    expect(freeModels).toContain("deepseek-chat");
    expect(freeModels).not.toContain("claude-sonnet-4-20250514");
  });

  it("falls back to a safe allowed model when a stored operator model is no longer allowed", () => {
    expect(resolveAllowedModelId("claude-sonnet-4-20250514", "Free")).toBe("gpt-4o-mini");
  });

  it("rejects tampered model ids that are not allowed for the authenticated user's plan", () => {
    expect(() => assertModelAllowedForPlan("claude-sonnet-4-20250514", "Free")).toThrow(
      /not allowed/i,
    );
  });

  it("rejects model ids outside the server-side catalog", () => {
    expect(() => assertModelAllowedForPlan("user-supplied-custom-model", "Pro")).toThrow(
      /catalog/i,
    );
  });

  it("keeps image models out of the default chat model catalog", () => {
    const basicChatModels = getAllowedModelCatalogForPlan("Basic").map((model) => model.id);
    const basicImageModels = getAllowedModelCatalogForPlanAndModality("Basic", "image")
      .map((model) => model.id);

    expect(basicChatModels).not.toContain("img2");
    expect(basicImageModels).toContain("img2");
  });
});
