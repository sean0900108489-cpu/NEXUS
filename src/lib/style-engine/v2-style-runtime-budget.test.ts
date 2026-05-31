import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  createNexusProductionTokenBridgePlanFromRenderPlanResultV1,
} from "./v2-production-token-bridge";
import {
  createWarmGlassOpsProductionAliasCoverageReportV1,
} from "./v2-production-alias-coverage";
import { compileNexusSkinPackRenderPlanV2 } from "./v2-render-plan";
import { createWarmGlassOpsSkinPackV2Fixture } from "./v2-fixtures";
import {
  createStyleRuntimeBudgetSummary,
  createStyleRuntimeBudgetSummaryFromRenderPlan,
} from "./v2-style-runtime-budget";

describe("NEXUS Style Runtime Budget model", () => {
  it("reports the Warm Glass fixture and bridge output as safe", () => {
    const { bridgePlan, renderPlan } = createWarmGlassRuntimeInputs();
    const coverage = createWarmGlassOpsProductionAliasCoverageReportV1();
    const summary = createStyleRuntimeBudgetSummaryFromRenderPlan(renderPlan, {
      bridgePlan,
      coverage,
    });

    expect(summary.verdict).toBe("safe");
    expect(summary.cssVariableCount).toBe(Object.keys(bridgePlan.variables).length);
    expect(summary.cssVariableCount).toBe(83);
    expect(summary.directAliasCount).toBe(coverage.directlyDrivenAliasCount);
    expect(summary.directAliasCount).toBe(58);
    expect(summary.aliasFamilyCount).toBe(coverage.familyCount);
    expect(summary.aliasFamilyCount).toBe(10);
    expect(summary.fallbackDrivenCount).toBe(0);
    expect(summary.smokeOnlyCount).toBe(0);
    expect(summary.unsupportedCount).toBe(0);
    expect(summary.unsupportedCapabilities.length).toBeGreaterThan(0);
    expect(summary.estimatedApplyCost.level).toBe("low");
    expect(summary.degradationHints).toEqual([]);
  });

  it("computes alias and family counts from coverage input", () => {
    const coverage = createWarmGlassOpsProductionAliasCoverageReportV1();
    const summary = createStyleRuntimeBudgetSummary({ coverage });

    expect(summary.cssVariableCount).toBe(coverage.bridgeVariableCount);
    expect(summary.directAliasCount).toBe(coverage.directlyDrivenAliasCount);
    expect(summary.aliasFamilyCount).toBe(coverage.familyCount);
    expect(summary.unsupportedCapabilities.map((capability) => capability.id)).toEqual(
      expect.arrayContaining(["background-scene", "layout-arrangement"]),
    );
  });

  it("warns when a non-critical unsupported capability is budget relevant", () => {
    const summary = createStyleRuntimeBudgetSummary({
      cssVariables: createVariableMap(24),
      unsupportedCapabilities: [
        {
          id: "badge-primitive",
          label: "Badge primitive",
          reason: "Production badge primitive has no inert shell boundary.",
        },
      ],
    });

    expect(summary.verdict).toBe("warn");
    expect(summary.unsupportedCount).toBe(1);
    expect(summary.reasons.map((reason) => reason.code)).toContain(
      "styleRuntimeBudget.unsupportedCapabilityWarn",
    );
    expect(summary.degradationHints).toEqual(
      expect.arrayContaining([
        "Collapse unsupported recipe surfaces to fallback treatment.",
      ]),
    );
  });

  it("blocks when a critical unsupported capability is present", () => {
    const summary = createStyleRuntimeBudgetSummary({
      cssVariables: createVariableMap(24),
      unsupportedCapabilities: [
        {
          id: "runtime-apply-gate",
          label: "Runtime apply gate",
          reason: "Production runtime apply has no approved gate.",
          severity: "critical",
        },
      ],
    });

    expect(summary.verdict).toBe("block");
    expect(summary.reasons.map((reason) => reason.code)).toContain(
      "styleRuntimeBudget.unsupportedCapabilityBlock",
    );
    expect(summary.degradationHints).toContain(
      "Avoid production preview until block reasons are resolved.",
    );
  });

  it("warns and blocks for excessive CSS variable counts", () => {
    const warnSummary = createStyleRuntimeBudgetSummary({
      cssVariables: createVariableMap(121),
    });
    const blockSummary = createStyleRuntimeBudgetSummary({
      cssVariables: createVariableMap(221),
    });

    expect(warnSummary.verdict).toBe("warn");
    expect(warnSummary.reasons.map((reason) => reason.code)).toContain(
      "styleRuntimeBudget.cssVariableWarn",
    );
    expect(blockSummary.verdict).toBe("block");
    expect(blockSummary.reasons.map((reason) => reason.code)).toContain(
      "styleRuntimeBudget.cssVariableBlock",
    );
  });

  it("fails closed for missing or invalid input", () => {
    const missingSummary = createStyleRuntimeBudgetSummary(null);
    const invalidSummary = createStyleRuntimeBudgetSummary({
      renderPlan: { kind: "not-a-render-plan" } as never,
    });

    expect(missingSummary.verdict).toBe("block");
    expect(missingSummary.reasons.map((reason) => reason.code)).toContain(
      "styleRuntimeBudget.invalidInput",
    );
    expect(invalidSummary.verdict).toBe("block");
    expect(invalidSummary.reasons.map((reason) => reason.code)).toContain(
      "styleRuntimeBudget.renderPlanRejected",
    );
  });

  it("returns deterministic checksums", () => {
    const variables = createVariableMap(12);
    const first = createStyleRuntimeBudgetSummary({ cssVariables: variables });
    const second = createStyleRuntimeBudgetSummary({ cssVariables: variables });
    const changed = createStyleRuntimeBudgetSummary({
      cssVariables: {
        ...variables,
        "--nexus-budget-var-99": "99px",
      },
    });

    expect(first.checksum).toBe(second.checksum);
    expect(first.summaryId).toBe(second.summaryId);
    expect(first.checksum).not.toBe(changed.checksum);
  });

  it("emits no selectors, raw CSS payload, DOM instructions, or behavior classes", () => {
    const summary = createStyleRuntimeBudgetSummary({
      cssVariables: createVariableMap(8),
      unsupportedCapabilities: [
        {
          id: "control-recipe",
          label: "Control recipe",
          reason: "Control recipe remains review-only.",
        },
      ],
    });
    const serialized = JSON.stringify(summary);
    const source = readFileSync(
      new URL("v2-style-runtime-budget.ts", import.meta.url),
      "utf8",
    );
    const forbiddenSummaryPatterns = [
      /\.nexus-/,
      /\bselector\b/i,
      /\bclassName\b/,
      /\bdocument\./,
      /\bwindow\./,
      /\bquerySelector\b/,
      /\blocalStorage\b/,
      /\bfetch\s*\(/,
      /<script|javascript:|\burl\s*\(|https?:\/\/|ftp:\/\/|\b(?:blob|file|data):|!important/i,
    ];
    const forbiddenSourcePatterns = [
      /from\s+["']@\/components\//,
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/sync\//,
      /from\s+["']@\/lib\/supabase\//,
      /\bdocument\./,
      /\bwindow\./,
      /\bquerySelector\b/,
      /\blocalStorage\b/,
      /\bfetch\s*\(/,
      /\bsupabase\b/i,
    ];

    for (const pattern of forbiddenSummaryPatterns) {
      expect(serialized, `Budget summary should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }

    for (const pattern of forbiddenSourcePatterns) {
      expect(source, `Budget helper should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});

function createWarmGlassRuntimeInputs() {
  const renderPlanResult = compileNexusSkinPackRenderPlanV2(
    createWarmGlassOpsSkinPackV2Fixture(),
  );

  if (!renderPlanResult.accepted) {
    throw new Error("Expected Warm Glass render plan to be accepted.");
  }

  const bridgeResult =
    createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
      renderPlanResult,
    );

  if (!bridgeResult.accepted) {
    throw new Error("Expected Warm Glass bridge plan to be accepted.");
  }

  return {
    bridgePlan: bridgeResult.bridgePlan,
    renderPlan: renderPlanResult.renderPlan,
  };
}

function createVariableMap(count: number) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `--nexus-budget-var-${index.toString().padStart(3, "0")}`,
      `${index}px`,
    ]),
  );
}
