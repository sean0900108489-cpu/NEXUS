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
  targets: string[];
  transform?: (value: string) => string;
};

const productionPanelSurfaceTargets = [
  "--panel-bg",
  "--nexus-panel-bg",
  "--nexus-glass-bg",
  "--nexus-right-dock-bg",
  "--nexus-top-bar-bg",
  "--nexus-message-bubble-bg",
  "--nexus-message-assistant-bg",
  "--nexus-agent-window-bg",
  "--nexus-command-palette-bg",
  "--nexus-modal-shell-bg",
  "--nexus-datapad-shell-bg",
];

const productionMutedSurfaceTargets = [
  "--panel-muted",
  "--nexus-agent-window-handle-bg",
  "--nexus-message-tool-bg",
];

const productionRaisedSurfaceTargets = [
  "--bg-elevated",
  "--nexus-message-user-bg",
];

const productionBorderTargets = [
  "--border-subtle",
  "--nexus-panel-border",
  "--nexus-glass-border",
  "--nexus-workspace-border",
  "--nexus-right-dock-border",
  "--nexus-top-bar-border",
  "--nexus-message-bubble-border",
  "--nexus-agent-window-border",
  "--nexus-agent-window-handle-border",
  "--nexus-command-palette-border",
  "--nexus-modal-shell-border",
  "--nexus-datapad-shell-border",
];

const productionRadiusTargets = [
  "--surface-radius",
  "--nexus-panel-radius",
  "--nexus-glass-radius",
  "--nexus-workspace-radius",
  "--nexus-right-dock-radius",
  "--nexus-top-bar-radius",
  "--nexus-message-bubble-radius",
  "--nexus-agent-window-radius",
  "--nexus-agent-window-handle-radius",
  "--nexus-command-palette-radius",
  "--nexus-modal-shell-radius",
  "--nexus-datapad-shell-radius",
];

const productionShadowTargets = [
  "--shadow-panel",
  "--nexus-panel-shadow",
  "--nexus-workspace-shadow",
  "--nexus-right-dock-shadow",
  "--nexus-top-bar-shadow",
  "--nexus-message-bubble-shadow",
  "--nexus-agent-window-shadow",
  "--nexus-command-palette-shadow",
  "--nexus-modal-shell-shadow",
  "--nexus-datapad-shell-shadow",
];

const productionGlassBlurTargets = [
  "--glass-blur",
  "--nexus-panel-blur",
  "--nexus-glass-blur",
  "--nexus-right-dock-blur",
  "--nexus-top-bar-blur",
  "--nexus-agent-window-blur",
  "--nexus-command-palette-blur",
  "--nexus-modal-shell-blur",
  "--nexus-datapad-shell-blur",
];

const productionTextTargets = [
  "--text-main",
  "--nexus-panel-text",
  "--nexus-glass-text",
];

const bridgeVariableMappings: BridgeVariableMapping[] = [
  { source: "--nexus-accent-primary", targets: ["--theme-primary"] },
  { source: "--nexus-accent-primary-strong", targets: ["--theme-primary-strong"] },
  { source: "--nexus-accent-secondary", targets: ["--theme-secondary"] },
  { source: "--nexus-blur-backdrop", targets: ["--backdrop-blur"] },
  { source: "--nexus-blur-glass", targets: productionGlassBlurTargets },
  { source: "--nexus-border-glow", targets: ["--border-glow"] },
  { source: "--nexus-border-subtle", targets: productionBorderTargets },
  { source: "--nexus-radius-base", targets: ["--radius-base"] },
  { source: "--nexus-radius-surface", targets: productionRadiusTargets },
  { source: "--nexus-shadow-glow", targets: ["--shadow-glow"] },
  { source: "--nexus-shadow-panel", targets: productionShadowTargets },
  { source: "--nexus-status-danger", targets: ["--theme-danger"] },
  { source: "--nexus-status-success", targets: ["--theme-success"] },
  { source: "--nexus-status-warning", targets: ["--theme-warning"] },
  { source: "--nexus-surface-app", targets: ["--bg-base"] },
  { source: "--nexus-surface-panel", targets: productionPanelSurfaceTargets },
  { source: "--nexus-surface-panel-muted", targets: productionMutedSurfaceTargets },
  { source: "--nexus-surface-raised", targets: productionRaisedSurfaceTargets },
  {
    source: "--nexus-surface-workspace",
    targets: ["--bg-workspace", "--nexus-workspace-bg"],
  },
  { source: "--nexus-text-muted", targets: ["--text-muted"] },
  { source: "--nexus-text-primary", targets: productionTextTargets },
  { source: "--nexus-text-secondary", targets: ["--text-soft"] },
  {
    source: "--nexus-workspace-grid-primary",
    targets: ["--workspace-grid-primary", "--nexus-workspace-grid-primary"],
  },
  {
    source: "--nexus-workspace-grid-secondary",
    targets: ["--workspace-grid-secondary", "--nexus-workspace-grid-secondary"],
  },
  {
    source: "--nexus-workspace-wash",
    targets: ["--workspace-wash", "--nexus-workspace-wash"],
    transform: createSolidBackgroundLayer,
  },
];

const bridgeVariableMap = new Map(
  bridgeVariableMappings.map((mapping) => [mapping.source, mapping]),
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

    const mapping = bridgeVariableMap.get(source);

    if (mapping) {
      const targetValue = mapping.transform ? mapping.transform(value) : value;

      if (isUnsafeBridgeVariableValue(targetValue)) {
        return rejectProductionTokenBridge([
          {
            code: "productionTokenBridge.unsafeVariableValue",
            message: "Production token bridge rejected unsafe variable output.",
            path: `$.renderPlan.tokenVariables.${source}`,
          },
        ]);
      }

      scopedVariables[source] = value;

      for (const target of mapping.targets) {
        variables[target] = targetValue;
      }

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

function createSolidBackgroundLayer(value: string) {
  return `linear-gradient(${value}, ${value})`;
}
