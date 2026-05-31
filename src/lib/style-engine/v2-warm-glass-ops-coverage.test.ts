import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  compileNexusSkinPackRenderPlanV2,
  createNexusProductionTokenBridgePlanFromRenderPlanResultV1,
  createWarmGlassOpsProductionAliasCoverageReportV1,
  createWarmGlassOpsSkinPackV2Fixture,
  validateNexusSkinPackV2,
  warmGlassOpsTargetCapabilityGapsV1,
} from "@/lib/style-engine";

describe("Warm Glass Ops V2 skin pack and production alias coverage", () => {
  it("validates the Warm Glass Ops fixture", () => {
    const result = validateNexusSkinPackV2(createWarmGlassOpsSkinPackV2Fixture());

    expect(result.accepted).toBe(true);
    expect(result.skinPack?.id).toBe("warm-glass-ops-skin");
    expect(result.skinPack?.manifest.manifestId).toBe("warm-glass-ops");
    expect(result.skinPack?.metadata.tags).toEqual(
      expect.arrayContaining(["warm-glass", "desert-atelier"]),
    );
  });

  it("compiles the fixture to a Render Plan and bridge plan", () => {
    const renderPlanResult = compileNexusSkinPackRenderPlanV2(
      createWarmGlassOpsSkinPackV2Fixture(),
    );

    expect(renderPlanResult.accepted).toBe(true);

    if (!renderPlanResult.accepted) {
      throw new Error("Expected Warm Glass Ops render plan to be accepted.");
    }

    expect(renderPlanResult.renderPlan.skinPackId).toBe("warm-glass-ops-skin");
    expect(renderPlanResult.renderPlan.tokenVariables["--nexus-surface-panel"]).toBe(
      "rgb(255 244 226 / 0.16)",
    );
    expect(renderPlanResult.renderPlan.eligibility.canApplyProduction).toBe(false);

    const bridgeResult =
      createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
        renderPlanResult,
      );

    expect(bridgeResult.accepted).toBe(true);

    if (!bridgeResult.accepted) {
      throw new Error("Expected Warm Glass Ops bridge plan to be accepted.");
    }

    expect(bridgeResult.bridgePlan.variables["--panel-bg"]).toBe(
      "rgb(255 244 226 / 0.16)",
    );
    expect(bridgeResult.bridgePlan.variables["--nexus-workspace-bg"]).toBe(
      "#2a2119",
    );
    expect(bridgeResult.bridgePlan.eligibility.canApplyProduction).toBe(false);
  });

  it("reports current adopted production alias families and unsupported target gaps", () => {
    const report = createWarmGlassOpsProductionAliasCoverageReportV1();
    const familyIds = report.families.map((family) => family.id);
    const gapIds = warmGlassOpsTargetCapabilityGapsV1.map((gap) => gap.id);

    expect(report.renderPlanAccepted).toBe(true);
    expect(report.bridgePlanAccepted).toBe(true);
    expect(report.familyCount).toBeGreaterThanOrEqual(10);
    expect(familyIds).toEqual(
      expect.arrayContaining([
        "panel",
        "glass",
        "workspace",
        "right-dock",
        "top-bar",
        "message-bubble",
        "agent-window",
        "command-palette",
        "modal-shell",
        "datapad-shell",
      ]),
    );
    expect(gapIds).toEqual(
      expect.arrayContaining([
        "background-scene",
        "right-metrics-panel",
        "agent-card-recipe",
        "segmented-navigation",
        "typography-scale",
        "layout-arrangement",
      ]),
    );

    const workspace = report.families.find((family) => family.id === "workspace");
    const commandPalette = report.families.find(
      (family) => family.id === "command-palette",
    );

    expect(workspace?.mode).toBe("mixed-bridge");
    expect(workspace?.directAliases).toContain("--nexus-workspace-bg");
    expect(commandPalette?.mode).toBe("fallback-driven");
    expect(commandPalette?.smokeVariables).toContain(
      "--nexus-command-palette-bg",
    );
  });

  it("rejects unsafe fixture mutations before Render Plan coverage", () => {
    const unsafePack = createWarmGlassOpsSkinPackV2Fixture();

    unsafePack.manifest.payload.tokens.surface.panel =
      "url(https://bad.example/warm-glass.webp)";

    const validation = validateNexusSkinPackV2(unsafePack);
    const renderPlanResult = compileNexusSkinPackRenderPlanV2(unsafePack);

    expect(validation.accepted).toBe(false);
    expect(renderPlanResult.accepted).toBe(false);
    expect(JSON.stringify(renderPlanResult)).not.toContain("bad.example");
  });

  it("keeps the coverage helper pure and detached from runtime boundaries", () => {
    const source = readFileSync(
      new URL("v2-production-alias-coverage.ts", import.meta.url),
      "utf8",
    );
    const forbiddenPatterns = [
      /from\s+["']@\/components\/nexus\//,
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/sync\//,
      /from\s+["']@\/lib\/supabase\//,
      /\bdocument\./,
      /\bwindow\./,
      /\blocalStorage\b/,
      /\bfetch\s*\(/,
      /\bsupabase\b/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source, `Coverage helper should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});
