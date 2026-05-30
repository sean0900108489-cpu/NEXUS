import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  compileNexusSkinPackRenderPlanV2,
  createNexusProductionTokenBridgePlanFromRenderPlanResultV1,
  createNexusProductionTokenBridgePlanV1,
  createOverBudgetSkinPackV2,
  createPixelWorkshopSkinPackV2,
  createValidMinimalSkinPackV2,
} from "@/lib/style-engine";

const forbiddenOutputKeys = [
  "className",
  "selector",
  "zIndex",
  "pointerEvents",
  "position",
  "overflow",
  "onClick",
  "onChange",
  "drag",
  "resize",
  "behaviorClass",
];

describe("NEXUS Style Engine V2 Production Token Bridge", () => {
  it("creates a bridge plan from the Pixel render plan", () => {
    const renderPlanResult = compileNexusSkinPackRenderPlanV2(
      createPixelWorkshopSkinPackV2(),
    );
    const bridgeResult =
      createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
        renderPlanResult,
      );

    expect(bridgeResult.accepted).toBe(true);

    if (!bridgeResult.accepted) {
      throw new Error("Expected Pixel bridge plan to be accepted.");
    }

    expect(bridgeResult.bridgePlan.skinPackId).toBe("pixel-workshop-skin");
    expect(bridgeResult.bridgePlan.variables["--panel-bg"]).toBe("#26331a");
    expect(bridgeResult.bridgePlan.variables["--theme-primary"]).toBe("#45f0d7");
    expect(bridgeResult.bridgePlan.scopedVariables["--nexus-surface-panel"]).toBe(
      "#26331a",
    );
    expect(bridgeResult.bridgePlan.legacyPreserveMap["--panel-bg"]).toBe(
      "bridge-target",
    );
    expect(bridgeResult.bridgePlan.legacyPreserveMap["--font-main"]).toBe(
      "legacy-theme-control",
    );
    expect(bridgeResult.bridgePlan.eligibility.canApplyProduction).toBe(false);
    expect(bridgeResult.bridgePlan.eligibility.canPreviewOnInjectedTarget).toBe(
      true,
    );
  });

  it("creates a bridge plan from the Minimal render plan", () => {
    const renderPlanResult = compileNexusSkinPackRenderPlanV2(
      createValidMinimalSkinPackV2(),
    );
    const bridgeResult =
      createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
        renderPlanResult,
      );

    expect(bridgeResult.accepted).toBe(true);

    if (!bridgeResult.accepted) {
      throw new Error("Expected Minimal bridge plan to be accepted.");
    }

    expect(bridgeResult.bridgePlan.manifestId).toBe("high-contrast-carbon");
    expect(Object.keys(bridgeResult.bridgePlan.variables)).toContain("--bg-base");
    expect(bridgeResult.bridgePlan.fallbackSummary.bridgedVariableCount).toBeGreaterThan(
      0,
    );
  });

  it("fails closed for rejected render plan results", () => {
    const renderPlanResult = compileNexusSkinPackRenderPlanV2(
      createOverBudgetSkinPackV2(),
    );
    const bridgeResult =
      createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
        renderPlanResult,
      );
    const serialized = JSON.stringify(bridgeResult);

    expect(renderPlanResult.accepted).toBe(false);
    expect(bridgeResult.accepted).toBe(false);
    expect("bridgePlan" in bridgeResult).toBe(false);
    expect(serialized).not.toContain("Over Budget Skin");
    expect(serialized).not.toContain("High Contrast Carbon");
  });

  it("reports Style Lab only and unsupported variables without applying them", () => {
    const renderPlanResult = compileNexusSkinPackRenderPlanV2(
      createPixelWorkshopSkinPackV2(),
    );

    if (!renderPlanResult.accepted) {
      throw new Error("Expected Pixel render plan to be accepted.");
    }

    const bridgeResult = createNexusProductionTokenBridgePlanV1(
      renderPlanResult.renderPlan,
    );

    expect(bridgeResult.accepted).toBe(true);

    if (!bridgeResult.accepted) {
      throw new Error("Expected Pixel bridge plan to be accepted.");
    }

    const unsupported = bridgeResult.bridgePlan.unsupportedVariables.map(
      (variable) => variable.name,
    );

    expect(unsupported).toContain("--nexus-surface-input");
    expect(unsupported).toContain("--nexus-motion-duration-fast");
    expect(unsupported).toContain("--nexus-typography-interface");
    expect(bridgeResult.bridgePlan.variables).not.toHaveProperty(
      "--nexus-motion-duration-fast",
    );
  });

  it("rejects unsafe bridge values without leaking the payload", () => {
    const renderPlanResult = compileNexusSkinPackRenderPlanV2(
      createPixelWorkshopSkinPackV2(),
    );

    if (!renderPlanResult.accepted) {
      throw new Error("Expected Pixel render plan to be accepted.");
    }

    const bridgeResult = createNexusProductionTokenBridgePlanV1({
      ...renderPlanResult.renderPlan,
      tokenVariables: {
        ...renderPlanResult.renderPlan.tokenVariables,
        "--nexus-surface-panel": "url(https://bad.example/panel.png)",
      },
    });
    const serialized = JSON.stringify(bridgeResult);

    expect(bridgeResult.accepted).toBe(false);
    expect("bridgePlan" in bridgeResult).toBe(false);
    expect(serialized).not.toContain("bad.example");
  });

  it("does not output raw CSS, selectors, behavior classes, or DOM operations", () => {
    const renderPlanResult = compileNexusSkinPackRenderPlanV2(
      createPixelWorkshopSkinPackV2(),
    );
    const bridgeResult =
      createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
        renderPlanResult,
      );

    expect(bridgeResult.accepted).toBe(true);

    if (!bridgeResult.accepted) {
      throw new Error("Expected Pixel bridge plan to be accepted.");
    }

    const serializedPlan = JSON.stringify(bridgeResult.bridgePlan);

    for (const key of forbiddenOutputKeys) {
      expect(Object.keys(bridgeResult.bridgePlan.variables)).not.toContain(key);
      expect(serializedPlan).not.toContain(`"${key}"`);
    }

    for (const value of Object.values(bridgeResult.bridgePlan.variables)) {
      expect(value).not.toMatch(/[{}]/);
      expect(value).not.toMatch(/;\s*[-_a-z]+\s*:/i);
      expect(value).not.toMatch(/\burl\s*\(/i);
      expect(value).not.toMatch(/<script/i);
    }
  });

  it("keeps the bridge helper free of runtime, store, backend, and Supabase coupling", () => {
    const source = readFileSync(
      new URL("v2-production-token-bridge.ts", import.meta.url),
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
    ];

    for (const pattern of forbidden) {
      expect(
        source,
        `v2-production-token-bridge.ts should not match ${pattern}`,
      ).not.toMatch(pattern);
    }
  });
});
