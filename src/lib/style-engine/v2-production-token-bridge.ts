import { createNexusStyleChecksumV1 } from "./checksum";
import type {
  NexusSkinPackRenderPlanResultV1,
  NexusSkinPackRenderPlanV1,
} from "./v2-render-plan";
import { NEXUS_SKIN_PACK_RENDER_PLAN_IR_VERSION_V1 } from "./v2-render-plan";

export const NEXUS_PRODUCTION_TOKEN_BRIDGE_PLAN_VERSION_V1 =
  "nexus-production-token-bridge-plan-v1" as const;

export type NexusProductionTokenBridgeIssueCodeV1 =
  | "productionTokenBridge.renderPlanRejected"
  | "productionTokenBridge.invalidRenderPlan"
  | "productionTokenBridge.budgetBlocked"
  | "productionTokenBridge.noBridgeVariables"
  | "productionTokenBridge.unsafeVariableValue";

export type NexusProductionTokenBridgeIssueV1 = {
  code: NexusProductionTokenBridgeIssueCodeV1;
  path: string;
  message: string;
};

export type NexusProductionTokenBridgeUnsupportedVariableV1 = {
  name: string;
  reasonCode:
    | "productionTokenBridge.styleLabOnly"
    | "productionTokenBridge.noLegacyTarget";
};

export type NexusProductionTokenBridgePlanV1 = {
  kind: "nexus-production-token-bridge-plan";
  version: typeof NEXUS_PRODUCTION_TOKEN_BRIDGE_PLAN_VERSION_V1;
  bridgePlanId: string;
  sourceRenderPlanId: string;
  skinPackId: string;
  manifestId: string;
  renderMode: "style-lab-production-bridge-readiness";
  scopedVariables: Record<string, string>;
  variables: Record<string, string>;
  legacyPreserveMap: Record<string, string>;
  unsupportedVariables: NexusProductionTokenBridgeUnsupportedVariableV1[];
  fallbackSummary: {
    bridgedVariableCount: number;
    preservedVariableCount: number;
    unsupportedVariableCount: number;
    renderPlanFallbackCount: number;
    reasonCodes: string[];
  };
  performanceBudget: {
    status: NexusSkinPackRenderPlanV1["performanceBudget"]["status"];
    tokenVariableCount: number;
    maxCssVariableCount: number;
    safeForProduction: false;
    reasonCodes: string[];
  };
  eligibility: {
    canPreviewOnInjectedTarget: boolean;
    canApplyProduction: false;
    reasonCodes: string[];
  };
  checksums: {
    scopedVariables: string;
    variables: string;
    bridgePlan: string;
  };
};

export type NexusProductionTokenBridgeReportV1 = {
  accepted: boolean;
  version: typeof NEXUS_PRODUCTION_TOKEN_BRIDGE_PLAN_VERSION_V1;
  errors: NexusProductionTokenBridgeIssueV1[];
  warnings: NexusProductionTokenBridgeIssueV1[];
  info: NexusProductionTokenBridgeIssueV1[];
};

export type NexusProductionTokenBridgeResultV1 =
  | {
      accepted: true;
      bridgePlan: NexusProductionTokenBridgePlanV1;
      report: NexusProductionTokenBridgeReportV1;
    }
  | {
      accepted: false;
      report: NexusProductionTokenBridgeReportV1;
    };

type BridgeVariableMapping = {
  source: string;
  target: string;
};

const bridgeVariableMappings: BridgeVariableMapping[] = [
  { source: "--nexus-accent-primary", target: "--theme-primary" },
  { source: "--nexus-accent-primary-strong", target: "--theme-primary-strong" },
  { source: "--nexus-accent-secondary", target: "--theme-secondary" },
  { source: "--nexus-blur-backdrop", target: "--backdrop-blur" },
  { source: "--nexus-blur-glass", target: "--glass-blur" },
  { source: "--nexus-border-glow", target: "--border-glow" },
  { source: "--nexus-border-subtle", target: "--border-subtle" },
  { source: "--nexus-radius-base", target: "--radius-base" },
  { source: "--nexus-radius-surface", target: "--surface-radius" },
  { source: "--nexus-shadow-glow", target: "--shadow-glow" },
  { source: "--nexus-shadow-panel", target: "--shadow-panel" },
  { source: "--nexus-status-danger", target: "--theme-danger" },
  { source: "--nexus-status-success", target: "--theme-success" },
  { source: "--nexus-status-warning", target: "--theme-warning" },
  { source: "--nexus-surface-app", target: "--bg-base" },
  { source: "--nexus-surface-panel", target: "--panel-bg" },
  { source: "--nexus-surface-panel-muted", target: "--panel-muted" },
  { source: "--nexus-surface-raised", target: "--bg-elevated" },
  { source: "--nexus-surface-workspace", target: "--bg-workspace" },
  { source: "--nexus-text-muted", target: "--text-muted" },
  { source: "--nexus-text-primary", target: "--text-main" },
  { source: "--nexus-text-secondary", target: "--text-soft" },
  { source: "--nexus-workspace-grid-primary", target: "--workspace-grid-primary" },
  { source: "--nexus-workspace-grid-secondary", target: "--workspace-grid-secondary" },
  { source: "--nexus-workspace-wash", target: "--workspace-wash" },
];

const bridgeVariableMap = new Map(
  bridgeVariableMappings.map((mapping) => [mapping.source, mapping.target]),
);

const styleLabOnlyVariables = new Set([
  "--nexus-border-strong",
  "--nexus-surface-input",
  "--nexus-surface-overlay",
  "--nexus-surface-shell",
  "--nexus-text-inverse",
]);

const styleLabOnlyPrefixes = [
  "--nexus-density-",
  "--nexus-motion-",
  "--nexus-typography-",
];

const preserveOnlyLegacyVariables: Record<string, string> = {
  "--agent-glow-intensity": "legacy-theme-control",
  "--asset-background-image": "asset-pipeline-blocked",
  "--border-width": "legacy-theme-control",
  "--chat-panel-opacity": "legacy-theme-control",
  "--font-main": "legacy-theme-control",
  "--icon-weight": "legacy-theme-control",
  "--scanline-opacity": "legacy-theme-control",
  "--shell-surface": "asset-and-shell-composition-blocked",
};

export function createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
  result: NexusSkinPackRenderPlanResultV1,
): NexusProductionTokenBridgeResultV1 {
  if (!result.accepted) {
    return rejectProductionTokenBridge([
      {
        code: "productionTokenBridge.renderPlanRejected",
        message: "Production token bridge requires an accepted Render Plan.",
        path: "$.renderPlan",
      },
    ]);
  }

  return createNexusProductionTokenBridgePlanV1(result.renderPlan);
}

export function createNexusProductionTokenBridgePlanV1(
  renderPlan: NexusSkinPackRenderPlanV1,
): NexusProductionTokenBridgeResultV1 {
  if (!isCompatibleRenderPlan(renderPlan)) {
    return rejectProductionTokenBridge([
      {
        code: "productionTokenBridge.invalidRenderPlan",
        message: "Production token bridge requires a V2 Style Lab Render Plan.",
        path: "$.renderPlan",
      },
    ]);
  }

  if (renderPlan.performanceBudget.status !== "within-static-budget") {
    return rejectProductionTokenBridge([
      {
        code: "productionTokenBridge.budgetBlocked",
        message: "Production token bridge is blocked by static budget status.",
        path: "$.renderPlan.performanceBudget.status",
      },
    ]);
  }

  const scopedVariables: Record<string, string> = {};
  const variables: Record<string, string> = {};
  const unsupportedVariables: NexusProductionTokenBridgeUnsupportedVariableV1[] = [];

  for (const [source, value] of Object.entries(renderPlan.tokenVariables).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    if (isUnsafeBridgeVariableName(source) || isUnsafeBridgeVariableValue(value)) {
      return rejectProductionTokenBridge([
        {
          code: "productionTokenBridge.unsafeVariableValue",
          message: "Production token bridge rejected unsafe variable output.",
          path: `$.renderPlan.tokenVariables.${source}`,
        },
      ]);
    }

    const target = bridgeVariableMap.get(source);

    if (target) {
      scopedVariables[source] = value;
      variables[target] = value;
      continue;
    }

    unsupportedVariables.push({
      name: source,
      reasonCode: isStyleLabOnlyVariable(source)
        ? "productionTokenBridge.styleLabOnly"
        : "productionTokenBridge.noLegacyTarget",
    });
  }

  const sortedVariables = sortStringRecord(variables);
  const sortedScopedVariables = sortStringRecord(scopedVariables);

  if (Object.keys(sortedVariables).length === 0) {
    return rejectProductionTokenBridge([
      {
        code: "productionTokenBridge.noBridgeVariables",
        message: "Production token bridge found no approved legacy targets.",
        path: "$.renderPlan.tokenVariables",
      },
    ]);
  }

  const legacyPreserveMap = createLegacyPreserveMap(sortedVariables);
  const reasonCodes = createReasonCodes(renderPlan, unsupportedVariables);
  const variableChecksum = createNexusStyleChecksumV1(sortedVariables);
  const scopedVariableChecksum = createNexusStyleChecksumV1(sortedScopedVariables);
  const bridgePlanChecksum = createNexusStyleChecksumV1({
    manifestId: renderPlan.manifestId,
    renderPlanChecksum: renderPlan.checksums.renderPlan,
    scopedVariableChecksum,
    skinPackId: renderPlan.skinPackId,
    unsupportedVariables,
    variableChecksum,
    version: NEXUS_PRODUCTION_TOKEN_BRIDGE_PLAN_VERSION_V1,
  });

  return {
    accepted: true,
    bridgePlan: {
      bridgePlanId: `${renderPlan.skinPackId}:production-token-bridge:${bridgePlanChecksum}`,
      checksums: {
        bridgePlan: bridgePlanChecksum,
        scopedVariables: scopedVariableChecksum,
        variables: variableChecksum,
      },
      eligibility: {
        canApplyProduction: false,
        canPreviewOnInjectedTarget: true,
        reasonCodes,
      },
      fallbackSummary: {
        bridgedVariableCount: Object.keys(sortedVariables).length,
        preservedVariableCount: Object.keys(legacyPreserveMap).length,
        renderPlanFallbackCount: renderPlan.fallbacks.length,
        reasonCodes,
        unsupportedVariableCount: unsupportedVariables.length,
      },
      kind: "nexus-production-token-bridge-plan",
      legacyPreserveMap,
      manifestId: renderPlan.manifestId,
      performanceBudget: {
        maxCssVariableCount: renderPlan.performanceBudget.maxCssVariableCount,
        reasonCodes: renderPlan.performanceBudget.reasonCodes,
        safeForProduction: false,
        status: renderPlan.performanceBudget.status,
        tokenVariableCount: renderPlan.performanceBudget.tokenVariableCount,
      },
      renderMode: "style-lab-production-bridge-readiness",
      scopedVariables: sortedScopedVariables,
      skinPackId: renderPlan.skinPackId,
      sourceRenderPlanId: renderPlan.planId,
      unsupportedVariables: [...unsupportedVariables].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
      variables: sortedVariables,
      version: NEXUS_PRODUCTION_TOKEN_BRIDGE_PLAN_VERSION_V1,
    },
    report: createProductionTokenBridgeReport({
      accepted: true,
      errors: [],
      info: [
        {
          code: "productionTokenBridge.invalidRenderPlan",
          message:
            "Production apply remains blocked; this bridge plan is for injected Style Lab targets only.",
          path: "$.eligibility.canApplyProduction",
        },
      ],
      warnings: unsupportedVariables.map((variable) => ({
        code: "productionTokenBridge.noBridgeVariables",
        message: variable.reasonCode,
        path: `$.renderPlan.tokenVariables.${variable.name}`,
      })),
    }),
  };
}

function isCompatibleRenderPlan(renderPlan: NexusSkinPackRenderPlanV1) {
  return (
    renderPlan.kind === "nexus-render-plan" &&
    renderPlan.version === NEXUS_SKIN_PACK_RENDER_PLAN_IR_VERSION_V1 &&
    renderPlan.renderMode === "style-lab-preview" &&
    renderPlan.eligibility.canApplyProduction === false
  );
}

function createLegacyPreserveMap(variables: Record<string, string>) {
  const preserveEntries = Object.keys(variables).map(
    (target) => [target, "bridge-target"] as const,
  );

  return sortStringRecord({
    ...preserveOnlyLegacyVariables,
    ...Object.fromEntries(preserveEntries),
  });
}

function createReasonCodes(
  renderPlan: NexusSkinPackRenderPlanV1,
  unsupportedVariables: NexusProductionTokenBridgeUnsupportedVariableV1[],
) {
  return Array.from(
    new Set([
      "productionTokenBridge.injectedTargetOnly",
      "productionTokenBridge.productionApplyBlocked",
      ...renderPlan.performanceBudget.reasonCodes,
      ...(unsupportedVariables.length > 0
        ? ["productionTokenBridge.unsupportedVariables"]
        : []),
      ...(renderPlan.fallbacks.length > 0
        ? ["productionTokenBridge.renderPlanFallbacks"]
        : []),
    ]),
  ).sort((left, right) => left.localeCompare(right));
}

function isStyleLabOnlyVariable(name: string) {
  return (
    styleLabOnlyVariables.has(name) ||
    styleLabOnlyPrefixes.some((prefix) => name.startsWith(prefix))
  );
}

function isUnsafeBridgeVariableName(name: string) {
  return !/^--[a-z0-9-]+$/.test(name);
}

function isUnsafeBridgeVariableValue(value: string) {
  return (
    /<script/i.test(value) ||
    /javascript:/i.test(value) ||
    /\burl\s*\(/i.test(value) ||
    /\b(?:https?|ftp):\/\//i.test(value) ||
    /\b(?:blob|file|data):/i.test(value) ||
    /[{}]/.test(value) ||
    /;\s*[-_a-z]+\s*:/i.test(value) ||
    /!important/i.test(value)
  );
}

function rejectProductionTokenBridge(
  errors: NexusProductionTokenBridgeIssueV1[],
): NexusProductionTokenBridgeResultV1 {
  return {
    accepted: false,
    report: createProductionTokenBridgeReport({
      accepted: false,
      errors,
      info: [],
      warnings: [],
    }),
  };
}

function createProductionTokenBridgeReport({
  accepted,
  errors,
  info,
  warnings,
}: {
  accepted: boolean;
  errors: NexusProductionTokenBridgeIssueV1[];
  info: NexusProductionTokenBridgeIssueV1[];
  warnings: NexusProductionTokenBridgeIssueV1[];
}): NexusProductionTokenBridgeReportV1 {
  return {
    accepted,
    errors: sortIssues(errors),
    info: sortIssues(info),
    version: NEXUS_PRODUCTION_TOKEN_BRIDGE_PLAN_VERSION_V1,
    warnings: sortIssues(warnings),
  };
}

function sortIssues<T extends { code: string; path: string }>(issues: T[]) {
  return [...issues].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);

    return pathOrder === 0 ? left.code.localeCompare(right.code) : pathOrder;
  });
}

function sortStringRecord(record: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}
