import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  compileNexusSkinPackRenderPlanV2,
  createNexusProductionTokenBridgePlanFromRenderPlanResultV1,
  createPixelWorkshopSkinPackV2,
  createValidMinimalSkinPackV2,
  previewNexusProductionTokenBridgePlanOnTargetV1,
  revertNexusProductionTokenBridgePreviewOnTargetV1,
  type NexusProductionTokenBridgePlanV1,
} from "@/lib/style-engine";

class MemoryStyleTarget {
  readonly values = new Map<string, string>();

  readonly style = {
    getPropertyValue: (name: string) => this.values.get(name) ?? "",
    removeProperty: (name: string) => {
      this.values.delete(name);
    },
    setProperty: (name: string, value: string) => {
      this.values.set(name, value);
    },
  };
}

describe("NEXUS Style Engine V2 Production Token Bridge Runtime", () => {
  it("applies and reverts a bridge plan on an injected target", () => {
    const bridgePlan = createPixelBridgePlan();
    const target = new MemoryStyleTarget();
    const previewResult = previewNexusProductionTokenBridgePlanOnTargetV1({
      bridgePlan,
      target,
    });

    expect(previewResult.accepted).toBe(true);

    if (!previewResult.accepted) {
      throw new Error("Expected bridge preview to be accepted.");
    }

    expect(target.style.getPropertyValue("--panel-bg")).toBe("#26331a");
    expect(previewResult.session.previousVariables["--panel-bg"]).toBeUndefined();

    const revertResult = revertNexusProductionTokenBridgePreviewOnTargetV1({
      session: previewResult.session,
      target,
    });

    expect(revertResult.reverted).toBe(true);
    expect(target.style.getPropertyValue("--panel-bg")).toBe("");
  });

  it("preserves existing target variables during revert", () => {
    const bridgePlan = createPixelBridgePlan();
    const target = new MemoryStyleTarget();

    target.style.setProperty("--panel-bg", "original-panel");

    const previewResult = previewNexusProductionTokenBridgePlanOnTargetV1({
      bridgePlan,
      target,
    });

    expect(previewResult.accepted).toBe(true);

    if (!previewResult.accepted) {
      throw new Error("Expected bridge preview to be accepted.");
    }

    expect(target.style.getPropertyValue("--panel-bg")).toBe("#26331a");
    expect(previewResult.session.previousVariables["--panel-bg"]).toBe(
      "original-panel",
    );

    revertNexusProductionTokenBridgePreviewOnTargetV1({
      session: previewResult.session,
      target,
    });

    expect(target.style.getPropertyValue("--panel-bg")).toBe("original-panel");
  });

  it("is idempotent for the same active bridge plan", () => {
    const bridgePlan = createPixelBridgePlan();
    const target = new MemoryStyleTarget();

    target.style.setProperty("--panel-bg", "original-panel");

    const firstResult = previewNexusProductionTokenBridgePlanOnTargetV1({
      bridgePlan,
      target,
    });

    expect(firstResult.accepted).toBe(true);

    if (!firstResult.accepted) {
      throw new Error("Expected first bridge preview to be accepted.");
    }

    const secondResult = previewNexusProductionTokenBridgePlanOnTargetV1({
      bridgePlan,
      currentSession: firstResult.session,
      target,
    });

    expect(secondResult.accepted).toBe(true);

    if (!secondResult.accepted) {
      throw new Error("Expected second bridge preview to be accepted.");
    }

    expect(secondResult.changed).toBe(false);
    expect(secondResult.session.previousVariables["--panel-bg"]).toBe(
      "original-panel",
    );

    revertNexusProductionTokenBridgePreviewOnTargetV1({
      session: secondResult.session,
      target,
    });

    expect(target.style.getPropertyValue("--panel-bg")).toBe("original-panel");
  });

  it("reverts an existing session before applying a new bridge plan", () => {
    const pixelPlan = createPixelBridgePlan();
    const minimalPlan = createMinimalBridgePlan();
    const target = new MemoryStyleTarget();

    target.style.setProperty("--panel-bg", "original-panel");

    const pixelPreview = previewNexusProductionTokenBridgePlanOnTargetV1({
      bridgePlan: pixelPlan,
      target,
    });

    expect(pixelPreview.accepted).toBe(true);

    if (!pixelPreview.accepted) {
      throw new Error("Expected Pixel bridge preview to be accepted.");
    }

    const minimalPreview = previewNexusProductionTokenBridgePlanOnTargetV1({
      bridgePlan: minimalPlan,
      currentSession: pixelPreview.session,
      target,
    });

    expect(minimalPreview.accepted).toBe(true);

    if (!minimalPreview.accepted) {
      throw new Error("Expected Minimal bridge preview to be accepted.");
    }

    expect(minimalPreview.session.previousVariables["--panel-bg"]).toBe(
      "original-panel",
    );
    expect(target.style.getPropertyValue("--panel-bg")).toBe(
      minimalPlan.variables["--panel-bg"],
    );

    revertNexusProductionTokenBridgePreviewOnTargetV1({
      session: minimalPreview.session,
      target,
    });

    expect(target.style.getPropertyValue("--panel-bg")).toBe("original-panel");
  });

  it("fails closed when the injected target is unavailable", () => {
    const bridgePlan = createPixelBridgePlan();
    const previewResult = previewNexusProductionTokenBridgePlanOnTargetV1({
      bridgePlan,
      target: null,
    });

    expect(previewResult.accepted).toBe(false);
  });

  it("keeps the runtime bridge helper free of direct DOM and backend coupling", () => {
    const source = readFileSync(
      new URL("v2-production-token-bridge-runtime.ts", import.meta.url),
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
        `v2-production-token-bridge-runtime.ts should not match ${pattern}`,
      ).not.toMatch(pattern);
    }
  });
});

function createPixelBridgePlan(): NexusProductionTokenBridgePlanV1 {
  const renderPlanResult = compileNexusSkinPackRenderPlanV2(
    createPixelWorkshopSkinPackV2(),
  );
  const bridgeResult =
    createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
      renderPlanResult,
    );

  if (!bridgeResult.accepted) {
    throw new Error("Expected Pixel bridge plan to be accepted.");
  }

  return bridgeResult.bridgePlan;
}

function createMinimalBridgePlan(): NexusProductionTokenBridgePlanV1 {
  const renderPlanResult = compileNexusSkinPackRenderPlanV2(
    createValidMinimalSkinPackV2(),
  );
  const bridgeResult =
    createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
      renderPlanResult,
    );

  if (!bridgeResult.accepted) {
    throw new Error("Expected Minimal bridge plan to be accepted.");
  }

  return bridgeResult.bridgePlan;
}
