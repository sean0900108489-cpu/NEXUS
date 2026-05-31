import { createNexusStyleChecksumV1 } from "./checksum";
import type {
  NexusProductionAliasCoverageGapV1,
  NexusProductionAliasCoverageReportV1,
} from "./v2-production-alias-coverage";
import type { NexusProductionTokenBridgePlanV1 } from "./v2-production-token-bridge";
import type { NexusSkinPackRenderPlanV1 } from "./v2-render-plan";

export type StyleRuntimeBudgetVerdict = "safe" | "warn" | "block";

export type StyleRuntimeBudgetReasonCode =
  | "styleRuntimeBudget.invalidInput"
  | "styleRuntimeBudget.renderPlanRejected"
  | "styleRuntimeBudget.bridgePlanRejected"
  | "styleRuntimeBudget.coverageRejected"
  | "styleRuntimeBudget.cssVariableWarn"
  | "styleRuntimeBudget.cssVariableBlock"
  | "styleRuntimeBudget.estimatedApplyCostWarn"
  | "styleRuntimeBudget.estimatedApplyCostBlock"
  | "styleRuntimeBudget.highCostEffectWarn"
  | "styleRuntimeBudget.highCostEffectBlock"
  | "styleRuntimeBudget.unsupportedCapabilityWarn"
  | "styleRuntimeBudget.unsupportedCapabilityBlock"
  | "styleRuntimeBudget.unsupportedAliasWarn";

export type StyleRuntimeBudgetReason = {
  code: StyleRuntimeBudgetReasonCode;
  severity: StyleRuntimeBudgetVerdict;
  message: string;
  value?: number;
  threshold?: number;
};

export type StyleRuntimeBudgetThresholds = {
  safeCssVariableCount: number;
  blockCssVariableCount: number;
  safeEstimatedApplyCost: number;
  blockEstimatedApplyCost: number;
  warnUnsupportedCount: number;
  warnHighCostEffectCount: number;
  blockHighCostEffectCount: number;
};

export type StyleRuntimeBudgetUnsupportedCapability = {
  id: string;
  label: string;
  reason: string;
  severity?: "info" | "warn" | "critical";
  nextGate?: string;
};

export type StyleRuntimeBudgetEstimatedApplyCost = {
  level: "low" | "medium" | "high";
  score: number;
  cssVariableUnits: number;
  highCostEffectUnits: number;
  unsupportedUnits: number;
};

export type StyleRuntimeBudgetSummary = {
  kind: "nexus-style-runtime-budget-summary";
  version: "nexus-style-runtime-budget-v1";
  summaryId: string;
  checksum: string;
  verdict: StyleRuntimeBudgetVerdict;
  cssVariableCount: number;
  directAliasCount: number;
  aliasFamilyCount: number;
  fallbackDrivenCount: number;
  smokeOnlyCount: number;
  unsupportedCount: number;
  unsupportedCapabilities: StyleRuntimeBudgetUnsupportedCapability[];
  highCostEffectCount: number;
  estimatedApplyCost: StyleRuntimeBudgetEstimatedApplyCost;
  reasons: StyleRuntimeBudgetReason[];
  degradationHints: string[];
  thresholds: StyleRuntimeBudgetThresholds;
};

export type StyleRuntimeBudgetInput = {
  renderPlan?: NexusSkinPackRenderPlanV1 | null;
  bridgePlan?: NexusProductionTokenBridgePlanV1 | null;
  coverage?: NexusProductionAliasCoverageReportV1 | null;
  cssVariables?: Record<string, string> | null;
  directAliasCount?: number;
  aliasFamilyCount?: number;
  fallbackDrivenCount?: number;
  smokeOnlyCount?: number;
  unsupportedCount?: number;
  unsupportedCapabilities?: StyleRuntimeBudgetUnsupportedCapability[];
  thresholds?: Partial<StyleRuntimeBudgetThresholds>;
};

export type StyleRuntimeBudgetBridgeOrCoverageInput =
  | NexusProductionTokenBridgePlanV1
  | NexusProductionAliasCoverageReportV1
  | {
      bridgePlan?: NexusProductionTokenBridgePlanV1 | null;
      coverage?: NexusProductionAliasCoverageReportV1 | null;
      thresholds?: Partial<StyleRuntimeBudgetThresholds>;
    }
  | null
  | undefined;

export const DEFAULT_STYLE_RUNTIME_BUDGET_THRESHOLDS: StyleRuntimeBudgetThresholds = {
  blockCssVariableCount: 220,
  blockEstimatedApplyCost: 320,
  blockHighCostEffectCount: 72,
  safeCssVariableCount: 120,
  safeEstimatedApplyCost: 180,
  warnHighCostEffectCount: 36,
  warnUnsupportedCount: 0,
};

export function createStyleRuntimeBudgetSummary(
  input?: StyleRuntimeBudgetInput | null,
): StyleRuntimeBudgetSummary {
  const thresholds = normalizeThresholds(input?.thresholds);

  if (!input) {
    return createBlockedSummary({
      message: "Style runtime budget requires Render Plan, Bridge Plan, coverage, or normalized variable input.",
      thresholds,
    });
  }

  const renderPlanReason = getRenderPlanBlockReason(input.renderPlan);
  const bridgePlanReason = getBridgePlanBlockReason(input.bridgePlan);
  const coverageReason = getCoverageBlockReason(input.coverage);
  const variables = getBudgetVariables(input);

  if (
    renderPlanReason ||
    bridgePlanReason ||
    coverageReason ||
    variables === null
  ) {
    const reasons = [
      renderPlanReason,
      bridgePlanReason,
      coverageReason,
      variables === null
        ? createReason({
            code: "styleRuntimeBudget.invalidInput",
            message: "Style runtime budget could not find any CSS variables or variable counts.",
            severity: "block",
          })
        : null,
    ].filter((reason): reason is StyleRuntimeBudgetReason => reason !== null);

    return createBlockedSummary({
      message: reasons[0]?.message ?? "Style runtime budget input is invalid.",
      reasons,
      thresholds,
    });
  }

  const cssVariableCount = variables.count;
  const highCostEffectCount = variables.values
    ? countHighCostEffects(variables.values)
    : input.bridgePlan
      ? countHighCostEffects(input.bridgePlan.variables)
      : 0;
  const coverage = input.coverage;
  const unsupportedCapabilities = normalizeUnsupportedCapabilities({
    coverageGaps: coverage?.gaps ?? [],
    unsupportedCapabilities: input.unsupportedCapabilities ?? [],
  });
  const budgetRelevantUnsupportedCapabilityCount =
    unsupportedCapabilities.filter((capability) =>
      getUnsupportedCapabilitySeverity(capability) !== "info",
    ).length;
  const criticalUnsupportedCapabilityCount = unsupportedCapabilities.filter(
    (capability) => getUnsupportedCapabilitySeverity(capability) === "critical",
  ).length;
  const unsupportedCount =
    input.unsupportedCount ??
    coverage?.unsupportedAliasCount ??
    budgetRelevantUnsupportedCapabilityCount;
  const fallbackDrivenCount =
    input.fallbackDrivenCount ??
    coverage?.fallbackDrivenAliasCount ??
    input.bridgePlan?.fallbackSummary.renderPlanFallbackCount ??
    0;
  const smokeOnlyCount =
    input.smokeOnlyCount ?? coverage?.smokeOnlyAliasCount ?? 0;
  const directAliasCount =
    input.directAliasCount ??
    coverage?.directlyDrivenAliasCount ??
    0;
  const aliasFamilyCount =
    input.aliasFamilyCount ?? coverage?.familyCount ?? 0;
  const estimatedApplyCost = estimateApplyCost({
    cssVariableCount,
    highCostEffectCount,
    thresholds,
    unsupportedCount,
  });
  const reasons = createBudgetReasons({
    criticalUnsupportedCapabilityCount,
    cssVariableCount,
    estimatedApplyCost,
    highCostEffectCount,
    thresholds,
    unsupportedCount,
  });
  const verdict = getVerdict(reasons);
  const degradationHints = createDegradationHints({
    fallbackDrivenCount,
    highCostEffectCount,
    reasons,
    smokeOnlyCount,
    unsupportedCapabilities,
    unsupportedCount,
    verdict,
  });
  const checksum = createNexusStyleChecksumV1({
    aliasFamilyCount,
    cssVariableCount,
    directAliasCount,
    estimatedApplyCost,
    fallbackDrivenCount,
    highCostEffectCount,
    smokeOnlyCount,
    thresholds,
    unsupportedCapabilities,
    unsupportedCount,
    verdict,
  });

  return {
    aliasFamilyCount,
    checksum,
    cssVariableCount,
    degradationHints,
    directAliasCount,
    estimatedApplyCost,
    fallbackDrivenCount,
    highCostEffectCount,
    kind: "nexus-style-runtime-budget-summary",
    reasons,
    smokeOnlyCount,
    summaryId: `style-runtime-budget:${checksum}`,
    thresholds,
    unsupportedCapabilities,
    unsupportedCount,
    verdict,
    version: "nexus-style-runtime-budget-v1",
  };
}

export function createStyleRuntimeBudgetSummaryFromRenderPlan(
  renderPlan: NexusSkinPackRenderPlanV1,
  bridgePlanOrCoverage?: StyleRuntimeBudgetBridgeOrCoverageInput,
  thresholds?: Partial<StyleRuntimeBudgetThresholds>,
): StyleRuntimeBudgetSummary {
  if (isBridgePlanCoveragePair(bridgePlanOrCoverage)) {
    return createStyleRuntimeBudgetSummary({
      bridgePlan: bridgePlanOrCoverage.bridgePlan ?? null,
      coverage: bridgePlanOrCoverage.coverage ?? null,
      renderPlan,
      thresholds: bridgePlanOrCoverage.thresholds ?? thresholds,
    });
  }

  if (isProductionBridgePlan(bridgePlanOrCoverage)) {
    return createStyleRuntimeBudgetSummary({
      bridgePlan: bridgePlanOrCoverage,
      renderPlan,
      thresholds,
    });
  }

  if (isProductionAliasCoverageReport(bridgePlanOrCoverage)) {
    return createStyleRuntimeBudgetSummary({
      coverage: bridgePlanOrCoverage,
      renderPlan,
      thresholds,
    });
  }

  return createStyleRuntimeBudgetSummary({
    renderPlan,
    thresholds,
  });
}

function createBlockedSummary({
  message,
  reasons,
  thresholds,
}: {
  message: string;
  reasons?: StyleRuntimeBudgetReason[];
  thresholds: StyleRuntimeBudgetThresholds;
}): StyleRuntimeBudgetSummary {
  const nextReasons =
    reasons && reasons.length > 0
      ? reasons
      : [
          createReason({
            code: "styleRuntimeBudget.invalidInput",
            message,
            severity: "block",
          }),
        ];
  const estimatedApplyCost: StyleRuntimeBudgetEstimatedApplyCost = {
    cssVariableUnits: 0,
    highCostEffectUnits: 0,
    level: "high",
    score: thresholds.blockEstimatedApplyCost,
    unsupportedUnits: 0,
  };
  const checksum = createNexusStyleChecksumV1({
    estimatedApplyCost,
    reasons: nextReasons,
    thresholds,
    verdict: "block",
  });

  return {
    aliasFamilyCount: 0,
    checksum,
    cssVariableCount: 0,
    degradationHints: [
      "Provide an accepted Render Plan with bridge variables or a normalized variable count before preview.",
      "Avoid production preview until budget input is accepted.",
    ],
    directAliasCount: 0,
    estimatedApplyCost,
    fallbackDrivenCount: 0,
    highCostEffectCount: 0,
    kind: "nexus-style-runtime-budget-summary",
    reasons: nextReasons,
    smokeOnlyCount: 0,
    summaryId: `style-runtime-budget:${checksum}`,
    thresholds,
    unsupportedCapabilities: [],
    unsupportedCount: 0,
    verdict: "block",
    version: "nexus-style-runtime-budget-v1",
  };
}

function getRenderPlanBlockReason(
  renderPlan: NexusSkinPackRenderPlanV1 | null | undefined,
) {
  if (renderPlan === undefined) {
    return null;
  }

  if (!renderPlan || renderPlan.kind !== "nexus-render-plan") {
    return createReason({
      code: "styleRuntimeBudget.renderPlanRejected",
      message: "Style runtime budget requires an accepted Render Plan.",
      severity: "block",
    });
  }

  if (renderPlan.performanceBudget.status !== "within-static-budget") {
    return createReason({
      code: "styleRuntimeBudget.renderPlanRejected",
      message: "Render Plan static performance budget is blocked.",
      severity: "block",
    });
  }

  return null;
}

function getBridgePlanBlockReason(
  bridgePlan: NexusProductionTokenBridgePlanV1 | null | undefined,
) {
  if (bridgePlan === undefined || bridgePlan === null) {
    return null;
  }

  if (!isProductionBridgePlan(bridgePlan)) {
    return createReason({
      code: "styleRuntimeBudget.bridgePlanRejected",
      message: "Style runtime budget requires an accepted Production Token Bridge Plan.",
      severity: "block",
    });
  }

  if (bridgePlan.performanceBudget.status !== "within-static-budget") {
    return createReason({
      code: "styleRuntimeBudget.bridgePlanRejected",
      message: "Production Token Bridge Plan budget is blocked.",
      severity: "block",
    });
  }

  return null;
}

function getCoverageBlockReason(
  coverage: NexusProductionAliasCoverageReportV1 | null | undefined,
) {
  if (coverage === undefined || coverage === null) {
    return null;
  }

  if (!isProductionAliasCoverageReport(coverage)) {
    return createReason({
      code: "styleRuntimeBudget.coverageRejected",
      message: "Style runtime budget requires an accepted production alias coverage report.",
      severity: "block",
    });
  }

  if (!coverage.renderPlanAccepted || !coverage.bridgePlanAccepted) {
    return createReason({
      code: "styleRuntimeBudget.coverageRejected",
      message: "Production alias coverage is not accepted for budget modeling.",
      severity: "block",
    });
  }

  return null;
}

function getBudgetVariables(input: StyleRuntimeBudgetInput) {
  if (input.bridgePlan) {
    return {
      count: Object.keys(input.bridgePlan.variables).length,
      values: input.bridgePlan.variables,
    };
  }

  if (input.cssVariables) {
    return {
      count: Object.keys(input.cssVariables).length,
      values: input.cssVariables,
    };
  }

  if (input.coverage) {
    return {
      count: input.coverage.bridgeVariableCount,
      values: null,
    };
  }

  if (
    input.renderPlan &&
    input.renderPlan.kind === "nexus-render-plan" &&
    input.renderPlan.tokenVariables
  ) {
    return {
      count: Object.keys(input.renderPlan.tokenVariables).length,
      values: input.renderPlan.tokenVariables,
    };
  }

  return null;
}

function normalizeUnsupportedCapabilities({
  coverageGaps,
  unsupportedCapabilities,
}: {
  coverageGaps: NexusProductionAliasCoverageGapV1[];
  unsupportedCapabilities: StyleRuntimeBudgetUnsupportedCapability[];
}) {
  return [
    ...coverageGaps.map((gap) => ({
      id: gap.id,
      label: gap.label,
      nextGate: gap.nextGate,
      reason: gap.reason,
      severity: "info" as const,
    })),
    ...unsupportedCapabilities.map((capability) => ({
      ...capability,
      severity: capability.severity ?? "warn",
    })),
  ].sort((left, right) => left.id.localeCompare(right.id));
}

function getUnsupportedCapabilitySeverity(
  capability: StyleRuntimeBudgetUnsupportedCapability,
) {
  return capability.severity ?? "warn";
}

function createBudgetReasons({
  criticalUnsupportedCapabilityCount,
  cssVariableCount,
  estimatedApplyCost,
  highCostEffectCount,
  thresholds,
  unsupportedCount,
}: {
  criticalUnsupportedCapabilityCount: number;
  cssVariableCount: number;
  estimatedApplyCost: StyleRuntimeBudgetEstimatedApplyCost;
  highCostEffectCount: number;
  thresholds: StyleRuntimeBudgetThresholds;
  unsupportedCount: number;
}) {
  const reasons: StyleRuntimeBudgetReason[] = [];

  if (cssVariableCount > thresholds.blockCssVariableCount) {
    reasons.push(
      createReason({
        code: "styleRuntimeBudget.cssVariableBlock",
        message: "CSS variable count exceeds the block threshold.",
        severity: "block",
        threshold: thresholds.blockCssVariableCount,
        value: cssVariableCount,
      }),
    );
  } else if (cssVariableCount > thresholds.safeCssVariableCount) {
    reasons.push(
      createReason({
        code: "styleRuntimeBudget.cssVariableWarn",
        message: "CSS variable count exceeds the safe threshold.",
        severity: "warn",
        threshold: thresholds.safeCssVariableCount,
        value: cssVariableCount,
      }),
    );
  }

  if (estimatedApplyCost.score > thresholds.blockEstimatedApplyCost) {
    reasons.push(
      createReason({
        code: "styleRuntimeBudget.estimatedApplyCostBlock",
        message: "Estimated apply cost exceeds the block threshold.",
        severity: "block",
        threshold: thresholds.blockEstimatedApplyCost,
        value: estimatedApplyCost.score,
      }),
    );
  } else if (estimatedApplyCost.score > thresholds.safeEstimatedApplyCost) {
    reasons.push(
      createReason({
        code: "styleRuntimeBudget.estimatedApplyCostWarn",
        message: "Estimated apply cost exceeds the safe threshold.",
        severity: "warn",
        threshold: thresholds.safeEstimatedApplyCost,
        value: estimatedApplyCost.score,
      }),
    );
  }

  if (highCostEffectCount > thresholds.blockHighCostEffectCount) {
    reasons.push(
      createReason({
        code: "styleRuntimeBudget.highCostEffectBlock",
        message: "High-cost visual effect count exceeds the block threshold.",
        severity: "block",
        threshold: thresholds.blockHighCostEffectCount,
        value: highCostEffectCount,
      }),
    );
  } else if (highCostEffectCount > thresholds.warnHighCostEffectCount) {
    reasons.push(
      createReason({
        code: "styleRuntimeBudget.highCostEffectWarn",
        message: "High-cost visual effect count exceeds the warning threshold.",
        severity: "warn",
        threshold: thresholds.warnHighCostEffectCount,
        value: highCostEffectCount,
      }),
    );
  }

  if (criticalUnsupportedCapabilityCount > 0) {
    reasons.push(
      createReason({
        code: "styleRuntimeBudget.unsupportedCapabilityBlock",
        message: "Critical unsupported capabilities block runtime preview.",
        severity: "block",
        value: criticalUnsupportedCapabilityCount,
      }),
    );
  } else if (unsupportedCount > thresholds.warnUnsupportedCount) {
    reasons.push(
      createReason({
        code: "styleRuntimeBudget.unsupportedCapabilityWarn",
        message: "Unsupported capabilities require degraded runtime preview.",
        severity: "warn",
        threshold: thresholds.warnUnsupportedCount,
        value: unsupportedCount,
      }),
    );
  }

  return reasons.sort((left, right) => left.code.localeCompare(right.code));
}

function createReason({
  code,
  message,
  severity,
  threshold,
  value,
}: StyleRuntimeBudgetReason): StyleRuntimeBudgetReason {
  return {
    code,
    message,
    severity,
    ...(threshold === undefined ? {} : { threshold }),
    ...(value === undefined ? {} : { value }),
  };
}

function getVerdict(reasons: StyleRuntimeBudgetReason[]): StyleRuntimeBudgetVerdict {
  if (reasons.some((reason) => reason.severity === "block")) {
    return "block";
  }

  if (reasons.some((reason) => reason.severity === "warn")) {
    return "warn";
  }

  return "safe";
}

function estimateApplyCost({
  cssVariableCount,
  highCostEffectCount,
  thresholds,
  unsupportedCount,
}: {
  cssVariableCount: number;
  highCostEffectCount: number;
  thresholds: StyleRuntimeBudgetThresholds;
  unsupportedCount: number;
}): StyleRuntimeBudgetEstimatedApplyCost {
  const cssVariableUnits = cssVariableCount;
  const highCostEffectUnits = highCostEffectCount * 2;
  const unsupportedUnits = unsupportedCount * 8;
  const score = cssVariableUnits + highCostEffectUnits + unsupportedUnits;

  return {
    cssVariableUnits,
    highCostEffectUnits,
    level:
      score > thresholds.blockEstimatedApplyCost
        ? "high"
        : score > thresholds.safeEstimatedApplyCost
          ? "medium"
          : "low",
    score,
    unsupportedUnits,
  };
}

function createDegradationHints({
  fallbackDrivenCount,
  highCostEffectCount,
  reasons,
  smokeOnlyCount,
  unsupportedCapabilities,
  unsupportedCount,
  verdict,
}: {
  fallbackDrivenCount: number;
  highCostEffectCount: number;
  reasons: StyleRuntimeBudgetReason[];
  smokeOnlyCount: number;
  unsupportedCapabilities: StyleRuntimeBudgetUnsupportedCapability[];
  unsupportedCount: number;
  verdict: StyleRuntimeBudgetVerdict;
}) {
  if (verdict === "safe") {
    return [];
  }

  const hints = new Set<string>();
  const reasonCodes = new Set(reasons.map((reason) => reason.code));

  if (
    reasonCodes.has("styleRuntimeBudget.cssVariableWarn") ||
    reasonCodes.has("styleRuntimeBudget.cssVariableBlock")
  ) {
    hints.add("Reduce bridge variable count before runtime preview.");
  }

  if (
    highCostEffectCount > 0 ||
    reasonCodes.has("styleRuntimeBudget.highCostEffectWarn") ||
    reasonCodes.has("styleRuntimeBudget.highCostEffectBlock")
  ) {
    hints.add("Reduce blur intensity and shadow/glow count for lower apply cost.");
  }

  if (unsupportedCount > 0 || unsupportedCapabilities.length > 0) {
    hints.add("Collapse unsupported recipe surfaces to fallback treatment.");
    hints.add("Keep asset and layout features review-only until their gates are approved.");
  }

  if (fallbackDrivenCount > 0 || smokeOnlyCount > 0) {
    hints.add("Prefer direct bridge aliases before production preview.");
  }

  if (verdict === "block") {
    hints.add("Avoid production preview until block reasons are resolved.");
  }

  return Array.from(hints).sort((left, right) => left.localeCompare(right));
}

function countHighCostEffects(variables: Record<string, string>) {
  return Object.entries(variables).filter(([name, value]) =>
    isHighCostEffectVariable(name, value),
  ).length;
}

function isHighCostEffectVariable(name: string, value: string) {
  return (
    /(?:blur|shadow|glow|wash|backdrop)/i.test(name) ||
    /(?:blur\(|drop-shadow|box-shadow|radial-gradient|linear-gradient)/i.test(
      value,
    )
  );
}

function normalizeThresholds(
  thresholds: Partial<StyleRuntimeBudgetThresholds> | undefined,
): StyleRuntimeBudgetThresholds {
  return {
    ...DEFAULT_STYLE_RUNTIME_BUDGET_THRESHOLDS,
    ...thresholds,
  };
}

function isProductionBridgePlan(
  candidate: unknown,
): candidate is NexusProductionTokenBridgePlanV1 {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    (candidate as NexusProductionTokenBridgePlanV1).kind ===
      "nexus-production-token-bridge-plan" &&
    (candidate as NexusProductionTokenBridgePlanV1).eligibility
      ?.canApplyProduction === false
  );
}

function isProductionAliasCoverageReport(
  candidate: unknown,
): candidate is NexusProductionAliasCoverageReportV1 {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    (candidate as NexusProductionAliasCoverageReportV1).kind ===
      "nexus-production-alias-coverage"
  );
}

function isBridgePlanCoveragePair(
  candidate: unknown,
): candidate is {
  bridgePlan?: NexusProductionTokenBridgePlanV1 | null;
  coverage?: NexusProductionAliasCoverageReportV1 | null;
  thresholds?: Partial<StyleRuntimeBudgetThresholds>;
} {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    ("bridgePlan" in candidate || "coverage" in candidate)
  );
}
