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
    expect(bridgeResult.bridgePlan.variables["--nexus-agent-window-bg"]).toBe(
      "rgb(255 244 226 / 0.16)",
    );
    expect(
      bridgeResult.bridgePlan.variables["--nexus-command-palette-bg"],
    ).toBe("rgb(255 244 226 / 0.16)");
    expect(bridgeResult.bridgePlan.variables["--nexus-modal-shell-bg"]).toBe(
      "rgb(255 244 226 / 0.16)",
    );
    expect(bridgeResult.bridgePlan.variables["--nexus-datapad-shell-bg"]).toBe(
      "rgb(255 244 226 / 0.16)",
    );
    expect(bridgeResult.bridgePlan.variables["--nexus-message-user-bg"]).toBe(
      "rgb(255 248 235 / 0.22)",
    );
    expect(bridgeResult.bridgePlan.variables["--nexus-workspace-bg"]).toBe(
      "#2a2119",
    );
    expect(bridgeResult.bridgePlan.eligibility.canApplyProduction).toBe(false);
    expect(
      bridgeResult.bridgePlan.eligibility.canPreviewOnInjectedTarget,
    ).toBe(true);
  });

  it("reports current adopted production alias families and unsupported target gaps", () => {
    const report = createWarmGlassOpsProductionAliasCoverageReportV1();
    const familyIds = report.families.map((family) => family.id);
    const gapIds = warmGlassOpsTargetCapabilityGapsV1.map((gap) => gap.id);

    expect(report.renderPlanAccepted).toBe(true);
    expect(report.bridgePlanAccepted).toBe(true);
    expect(report.familyCount).toBeGreaterThanOrEqual(10);
    expect(report.directlyDrivenFamilyCount).toBe(10);
    expect(report.directFamilyCoveragePercent).toBe(100);
    expect(report.directlyDrivenAliasCount).toBe(report.totalAliasCount);
    expect(report.directAliasCoveragePercent).toBe(100);
    expect(report.fallbackDrivenAliasCount).toBe(0);
    expect(report.unsupportedAliasCount).toBe(0);
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
    const modalShell = report.families.find(
      (family) => family.id === "modal-shell",
    );
    const datapadShell = report.families.find(
      (family) => family.id === "datapad-shell",
    );

    expect(workspace?.mode).toBe("direct-bridge");
    expect(workspace?.directAliases).toContain("--nexus-workspace-bg");
    expect(commandPalette?.mode).toBe("direct-bridge");
    expect(commandPalette?.directAliases).toEqual(
      expect.arrayContaining([
        "--nexus-command-palette-bg",
        "--nexus-command-palette-border",
        "--nexus-command-palette-shadow",
        "--nexus-command-palette-radius",
        "--nexus-command-palette-blur",
      ]),
    );
    expect(modalShell?.mode).toBe("direct-bridge");
    expect(datapadShell?.mode).toBe("direct-bridge");
    expect(commandPalette?.smokeVariables).toContain("--nexus-command-palette-bg");
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

    const bridgeResult =
      createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
        renderPlanResult,
      );

    expect(bridgeResult.accepted).toBe(false);
    expect(JSON.stringify(bridgeResult)).not.toContain("bad.example");
  });

  it("emits only CSS variable bridge outputs without selectors or behavior keys", () => {
    const renderPlanResult = compileNexusSkinPackRenderPlanV2(
      createWarmGlassOpsSkinPackV2Fixture(),
    );

    if (!renderPlanResult.accepted) {
      throw new Error("Expected Warm Glass Ops render plan to be accepted.");
    }

    const bridgeResult =
      createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
        renderPlanResult,
      );

    if (!bridgeResult.accepted) {
      throw new Error("Expected Warm Glass Ops bridge plan to be accepted.");
    }

    const variables = bridgeResult.bridgePlan.variables;

    expect(Object.keys(variables)).toEqual(
      expect.arrayContaining([
        "--nexus-panel-bg",
        "--nexus-glass-bg",
        "--nexus-right-dock-bg",
        "--nexus-top-bar-bg",
        "--nexus-message-bubble-bg",
        "--nexus-agent-window-bg",
        "--nexus-command-palette-bg",
        "--nexus-modal-shell-bg",
        "--nexus-datapad-shell-bg",
      ]),
    );

    for (const [name, value] of Object.entries(variables)) {
      expect(name).toMatch(/^--[a-z0-9-]+$/);
      expect(name).not.toMatch(/selector|class|onclick|focus|z-index/i);
      expect(value).not.toMatch(
        /<script|javascript:|\burl\s*\(|https?:\/\/|ftp:\/\/|\b(?:blob|file|data):|[{}]|;\s*[-_a-z]+\s*:|!important/i,
      );
    }
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
