import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  compileNexusSkinPackRenderPlanV2,
  createNexusSkinPackRenderPlanFromAcceptedPackV2,
  createOverBudgetSkinPackV2,
  createPixelWorkshopSkinPackV2,
  createValidMinimalSkinPackV2,
  type NexusSkinPackV2,
} from "@/lib/style-engine";

const forbiddenRenderPlanKeys = [
  "className",
  "style",
  "selector",
  "zIndex",
  "pointerEvents",
  "position",
  "overflow",
  "onClick",
  "onChange",
  "drag",
  "resize",
  "role",
  "tabIndex",
];

describe("NEXUS Style Engine V2 Render Plan IR", () => {
  it("creates a display-safe render plan from the Pixel fixture", () => {
    const result = compileNexusSkinPackRenderPlanV2(
      createPixelWorkshopSkinPackV2(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected Pixel fixture render plan to be accepted.");
    }

    expect(result.renderPlan.skinPackId).toBe("pixel-workshop-skin");
    expect(result.renderPlan.renderMode).toBe("style-lab-preview");
    expect(result.renderPlan.tokenVariables["--nexus-surface-panel"]).toBe(
      "#26331a",
    );
    expect(result.renderPlan.specimens.panel.style.background).toBe("#26331a");
    expect(result.renderPlan.recipeCoverage.supportedSpecimens).toContain(
      "panel",
    );
    expect(result.renderPlan.performanceBudget.safeForProduction).toBe(false);
    expect(result.renderPlan.performanceBudget.tokenVariableCount).toBeGreaterThan(0);
    expect(result.renderPlan.stages.map((stage) => stage.stageId)).toEqual([
      "tokens",
      "specimens",
      "assets",
      "layout",
    ]);
  });

  it("creates a render plan from the Minimal fixture", () => {
    const result = compileNexusSkinPackRenderPlanV2(createValidMinimalSkinPackV2());

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected Minimal fixture render plan to be accepted.");
    }

    expect(result.renderPlan.skinPackId).toBe("minimal-carbon-skin");
    expect(result.renderPlan.tokenPreviewPatch.previewId).toContain(
      "minimal-carbon-skin:token-only:",
    );
    expect(result.renderPlan.specimenGallery.displayName).toBe(
      "Minimal Carbon Skin",
    );
    expect(result.renderPlan.eligibility.canApplyProduction).toBe(false);
  });

  it("fails closed for invalid packs without returning a render plan", () => {
    const result = compileNexusSkinPackRenderPlanV2(createOverBudgetSkinPackV2());
    const serialized = JSON.stringify(result);

    expect(result.accepted).toBe(false);
    expect("renderPlan" in result).toBe(false);
    expect(serialized).not.toContain("Over Budget Skin");
    expect(serialized).not.toContain("High Contrast Carbon");
  });

  it("keeps missing recipes as safe render plan fallbacks", () => {
    const skinPack = createPixelWorkshopSkinPackV2() as NexusSkinPackV2;
    const recipes = skinPack.manifest.payload.recipes as unknown as Record<
      string,
      unknown
    >;

    delete recipes.dock;

    const result = createNexusSkinPackRenderPlanFromAcceptedPackV2(skinPack);

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected accepted-pack render plan build.");
    }

    expect(result.renderPlan.specimens.sidebarDock.style.background).toBe("#161b10");
    expect(result.renderPlan.recipeCoverage.missingRecipeGroups).toContain("dock");
    expect(result.renderPlan.fallbacks.map((issue) => issue.code)).toContain(
      "specimenPreview.missingRecipe",
    );
    expect(result.renderPlan.performanceBudget.fallbackCount).toBeGreaterThan(0);
  });

  it("does not leak unsafe recipe or token output", () => {
    const skinPack = createPixelWorkshopSkinPackV2();

    skinPack.manifest.payload.recipes.panel.surface = "url(https://bad.example/x)";

    const recipeResult = createNexusSkinPackRenderPlanFromAcceptedPackV2(skinPack);

    expect(recipeResult.accepted).toBe(true);

    if (!recipeResult.accepted) {
      throw new Error("Expected unsafe recipe reference to fallback safely.");
    }

    expect(JSON.stringify(recipeResult.renderPlan)).not.toContain("bad.example");
    expect(recipeResult.renderPlan.specimens.panel.style.background).toBe(
      "#26331a",
    );

    skinPack.manifest.payload.tokens.surface.panel = "url(https://bad.example/y)";

    const tokenResult = createNexusSkinPackRenderPlanFromAcceptedPackV2(skinPack);
    const serialized = JSON.stringify(tokenResult);

    expect(tokenResult.accepted).toBe(false);
    expect("renderPlan" in tokenResult).toBe(false);
    expect(serialized).not.toContain("bad.example");
  });

  it("does not output raw CSS keys, selectors, or behavior classes", () => {
    const result = compileNexusSkinPackRenderPlanV2(
      createPixelWorkshopSkinPackV2(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected Pixel fixture render plan to be accepted.");
    }

    const styleObjects = Object.values(result.renderPlan.specimens).flatMap(
      (specimen) => [specimen.style, ...Object.values(specimen.parts)],
    );

    for (const style of styleObjects) {
      expect(Object.keys(style)).not.toEqual(
        expect.arrayContaining(forbiddenRenderPlanKeys),
      );

      for (const value of Object.values(style)) {
        if (typeof value !== "string") {
          continue;
        }

        expect(value).not.toMatch(/[{}]/);
        expect(value).not.toMatch(/;\s*[-_a-z]+\s*:/i);
        expect(value).not.toMatch(/\burl\s*\(/i);
        expect(value).not.toMatch(/<script/i);
      }
    }
  });

  it("keeps the render plan helper free of runtime, store, backend, and Supabase coupling", () => {
    const source = readFileSync(
      new URL("v2-render-plan.ts", import.meta.url),
      "utf8",
    );
    const forbidden = [
      /from\s+["']@\/components\//,
      /from\s+["']@\/app\//,
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/supabase\//,
      /from\s+["']@supabase\//,
      /from\s+["']@xyflow\//,
      /\bdocument\./,
      /\bwindow\./,
      /\blocalStorage\b/,
      /\bindexedDB\b/,
      /\bfetch\s*\(/,
      /emitReactFlowAdapterCssVariablesV1/,
      /emitWindowModalRecipeCssVariablesV1/,
    ];

    for (const pattern of forbidden) {
      expect(source, `v2-render-plan.ts should not match ${pattern}`).not.toMatch(pattern);
    }
  });
});
