import { createWarmGlassOpsSkinPackV2Fixture } from "./v2-fixtures";
import {
  createNexusProductionTokenBridgePlanFromRenderPlanResultV1,
  type NexusProductionTokenBridgePlanV1,
} from "./v2-production-token-bridge";
import { compileNexusSkinPackRenderPlanV2 } from "./v2-render-plan";

export const NEXUS_PRODUCTION_ALIAS_COVERAGE_VERSION_V1 =
  "nexus-production-alias-coverage-v1" as const;

export type NexusProductionAliasCoverageModeV1 =
  | "mixed-bridge"
  | "fallback-driven"
  | "style-lab-smoke-only"
  | "unsupported";

export type NexusProductionAliasCoverageFamilyV1 = {
  id: string;
  label: string;
  selectors: string[];
  aliases: string[];
  tokenIntents: string[];
  bridgeTargets: string[];
  smokeVariables: string[];
  authSmokeStatus: "complete" | "partial" | "required";
  mode: NexusProductionAliasCoverageModeV1;
  directAliases: string[];
  fallbackDrivenAliases: string[];
  smokeOnlyAliases: string[];
  unsupportedAliases: string[];
};

export type NexusProductionAliasCoverageGapV1 = {
  id: string;
  label: string;
  reason: string;
  nextGate: string;
};

export type NexusProductionAliasCoverageReportV1 = {
  kind: "nexus-production-alias-coverage";
  version: typeof NEXUS_PRODUCTION_ALIAS_COVERAGE_VERSION_V1;
  skinPackId: string;
  displayName: string;
  renderPlanAccepted: boolean;
  bridgePlanAccepted: boolean;
  bridgeVariableCount: number;
  familyCount: number;
  directlyDrivenFamilyCount: number;
  fallbackDrivenFamilyCount: number;
  smokeOnlyFamilyCount: number;
  unsupportedFamilyCount: number;
  families: NexusProductionAliasCoverageFamilyV1[];
  gaps: NexusProductionAliasCoverageGapV1[];
};

type AliasFamilyDefinition = {
  id: string;
  label: string;
  selectors: string[];
  aliases: string[];
  tokenIntents: string[];
  bridgeTargets: string[];
  smokeVariables?: string[];
  authSmokeStatus: NexusProductionAliasCoverageFamilyV1["authSmokeStatus"];
};

const warmGlassAliasFamilies: AliasFamilyDefinition[] = [
  {
    aliases: [
      "--nexus-panel-bg",
      "--nexus-panel-border",
      "--nexus-panel-radius",
      "--nexus-panel-shadow",
      "--nexus-panel-text",
      "--nexus-panel-blur",
    ],
    authSmokeStatus: "partial",
    bridgeTargets: [
      "--panel-bg",
      "--border-subtle",
      "--surface-radius",
      "--shadow-panel",
      "--text-main",
      "--glass-blur",
    ],
    id: "panel",
    label: "Panel Primitive",
    selectors: [".nexus-panel"],
    tokenIntents: [
      "surface.panel",
      "border.subtle",
      "radius.surface",
      "shadow.panel",
      "text.primary",
      "blur.glass",
    ],
  },
  {
    aliases: [
      "--nexus-glass-bg",
      "--nexus-glass-border",
      "--nexus-glass-radius",
      "--nexus-glass-text",
      "--nexus-glass-blur",
    ],
    authSmokeStatus: "partial",
    bridgeTargets: [
      "--panel-bg",
      "--border-subtle",
      "--surface-radius",
      "--text-main",
      "--glass-blur",
    ],
    id: "glass",
    label: "Glass Primitive",
    selectors: [".nexus-glass"],
    tokenIntents: [
      "surface.panel",
      "border.subtle",
      "radius.surface",
      "text.primary",
      "blur.glass",
    ],
  },
  {
    aliases: [
      "--nexus-workspace-bg",
      "--nexus-workspace-grid-primary",
      "--nexus-workspace-grid-secondary",
      "--nexus-workspace-wash",
      "--nexus-workspace-border",
      "--nexus-workspace-shadow",
      "--nexus-workspace-radius",
    ],
    authSmokeStatus: "partial",
    bridgeTargets: [
      "--nexus-workspace-bg",
      "--nexus-workspace-grid-primary",
      "--nexus-workspace-grid-secondary",
      "--nexus-workspace-wash",
      "--border-subtle",
      "--shadow-panel",
      "--surface-radius",
    ],
    smokeVariables: ["--nexus-workspace-bg", "--nexus-workspace-border"],
    id: "workspace",
    label: "Workspace Surface",
    selectors: [".nexus-workspace"],
    tokenIntents: [
      "surface.workspace",
      "workspace.gridPrimary",
      "workspace.gridSecondary",
      "workspace.wash",
      "border.subtle",
      "shadow.panel",
      "radius.surface",
    ],
  },
  {
    aliases: [
      "--nexus-right-dock-bg",
      "--nexus-right-dock-border",
      "--nexus-right-dock-radius",
      "--nexus-right-dock-shadow",
      "--nexus-right-dock-blur",
    ],
    authSmokeStatus: "partial",
    bridgeTargets: [
      "--panel-bg",
      "--border-subtle",
      "--surface-radius",
      "--shadow-panel",
      "--glass-blur",
    ],
    smokeVariables: ["--nexus-right-dock-bg", "--nexus-right-dock-border"],
    id: "right-dock",
    label: "Right Dock Rail",
    selectors: [".nexus-right-floating-dock-rail"],
    tokenIntents: [
      "surface.panel",
      "border.subtle",
      "radius.surface",
      "shadow.panel",
      "blur.glass",
    ],
  },
  {
    aliases: [
      "--nexus-top-bar-bg",
      "--nexus-top-bar-border",
      "--nexus-top-bar-shadow",
      "--nexus-top-bar-blur",
      "--nexus-top-bar-radius",
    ],
    authSmokeStatus: "partial",
    bridgeTargets: [
      "--panel-bg",
      "--border-subtle",
      "--shadow-panel",
      "--glass-blur",
      "--surface-radius",
    ],
    smokeVariables: ["--nexus-top-bar-bg", "--nexus-top-bar-border"],
    id: "top-bar",
    label: "TopBar Chrome",
    selectors: [".nexus-top-bar-frame"],
    tokenIntents: [
      "surface.panel",
      "border.subtle",
      "shadow.panel",
      "blur.glass",
      "radius.surface",
    ],
  },
  {
    aliases: [
      "--nexus-message-bubble-bg",
      "--nexus-message-bubble-border",
      "--nexus-message-bubble-shadow",
      "--nexus-message-bubble-radius",
      "--nexus-message-user-bg",
      "--nexus-message-assistant-bg",
      "--nexus-message-tool-bg",
    ],
    authSmokeStatus: "complete",
    bridgeTargets: [
      "--panel-bg",
      "--border-subtle",
      "--shadow-panel",
      "--surface-radius",
    ],
    smokeVariables: [
      "--nexus-message-user-bg",
      "--nexus-message-assistant-bg",
      "--nexus-message-tool-bg",
    ],
    id: "message-bubble",
    label: "Message Bubbles",
    selectors: [
      ".nexus-message-bubble",
      ".nexus-message-bubble-user",
      ".nexus-message-bubble-assistant",
      ".nexus-message-bubble-tool",
    ],
    tokenIntents: [
      "surface.panel",
      "border.subtle",
      "shadow.panel",
      "radius.surface",
      "future.roleSurface.user",
      "future.roleSurface.assistant",
      "future.roleSurface.tool",
    ],
  },
  {
    aliases: [
      "--nexus-agent-window-bg",
      "--nexus-agent-window-border",
      "--nexus-agent-window-shadow",
      "--nexus-agent-window-radius",
      "--nexus-agent-window-blur",
      "--nexus-agent-window-handle-bg",
      "--nexus-agent-window-handle-border",
      "--nexus-agent-window-handle-radius",
    ],
    authSmokeStatus: "required",
    bridgeTargets: [
      "--panel-bg",
      "--border-subtle",
      "--shadow-panel",
      "--surface-radius",
      "--glass-blur",
    ],
    smokeVariables: [
      "--nexus-agent-window-bg",
      "--nexus-agent-window-border",
      "--nexus-agent-window-shadow",
      "--nexus-agent-window-radius",
      "--nexus-agent-window-handle-bg",
      "--nexus-agent-window-handle-border",
    ],
    id: "agent-window",
    label: "Agent Window Chrome",
    selectors: [".nexus-agent-window", ".nexus-drag-handle"],
    tokenIntents: [
      "surface.panel",
      "border.subtle",
      "shadow.panel",
      "radius.surface",
      "blur.glass",
      "future.windowHandle.surface",
    ],
  },
  {
    aliases: [
      "--nexus-command-palette-bg",
      "--nexus-command-palette-border",
      "--nexus-command-palette-shadow",
      "--nexus-command-palette-radius",
      "--nexus-command-palette-blur",
    ],
    authSmokeStatus: "required",
    bridgeTargets: [
      "--panel-bg",
      "--border-subtle",
      "--shadow-panel",
      "--surface-radius",
      "--glass-blur",
    ],
    smokeVariables: [
      "--nexus-command-palette-bg",
      "--nexus-command-palette-border",
      "--nexus-command-palette-shadow",
      "--nexus-command-palette-radius",
      "--nexus-command-palette-blur",
    ],
    id: "command-palette",
    label: "Command Palette Shell",
    selectors: [".nexus-command-palette-shell"],
    tokenIntents: [
      "surface.panel",
      "border.subtle",
      "shadow.panel",
      "radius.surface",
      "blur.glass",
    ],
  },
  {
    aliases: [
      "--nexus-modal-shell-bg",
      "--nexus-modal-shell-border",
      "--nexus-modal-shell-shadow",
      "--nexus-modal-shell-radius",
      "--nexus-modal-shell-blur",
    ],
    authSmokeStatus: "required",
    bridgeTargets: [
      "--panel-bg",
      "--border-subtle",
      "--shadow-panel",
      "--surface-radius",
      "--glass-blur",
    ],
    smokeVariables: [
      "--nexus-modal-shell-bg",
      "--nexus-modal-shell-border",
      "--nexus-modal-shell-shadow",
      "--nexus-modal-shell-radius",
      "--nexus-modal-shell-blur",
    ],
    id: "modal-shell",
    label: "Modal Dialog Shell",
    selectors: [".nexus-agent-branch-modal-shell"],
    tokenIntents: [
      "surface.panel",
      "border.subtle",
      "shadow.panel",
      "radius.surface",
      "blur.glass",
    ],
  },
  {
    aliases: [
      "--nexus-datapad-shell-bg",
      "--nexus-datapad-shell-border",
      "--nexus-datapad-shell-shadow",
      "--nexus-datapad-shell-radius",
      "--nexus-datapad-shell-blur",
    ],
    authSmokeStatus: "required",
    bridgeTargets: [
      "--panel-bg",
      "--border-subtle",
      "--shadow-panel",
      "--surface-radius",
      "--glass-blur",
    ],
    smokeVariables: [
      "--nexus-datapad-shell-bg",
      "--nexus-datapad-shell-border",
      "--nexus-datapad-shell-shadow",
      "--nexus-datapad-shell-radius",
      "--nexus-datapad-shell-blur",
    ],
    id: "datapad-shell",
    label: "Datapad Shell",
    selectors: [".nexus-datapad-shell"],
    tokenIntents: [
      "surface.panel",
      "border.subtle",
      "shadow.panel",
      "radius.surface",
      "blur.glass",
    ],
  },
];

export const warmGlassOpsTargetCapabilityGapsV1: NexusProductionAliasCoverageGapV1[] = [
  {
    id: "background-scene",
    label: "Desert atelier background image or scene",
    nextGate: "asset/background pipeline",
    reason:
      "Current V2 Skin Pack preview cannot load images, remote URLs, generated backgrounds, or production background assets.",
  },
  {
    id: "right-metrics-panel",
    label: "Right metrics panel recipe",
    nextGate: "selector-only right panel recipe boundary",
    reason:
      "Right-dock active panels still own artifact, vault, tool, and persistence behavior; only the rail chrome is tokenized.",
  },
  {
    id: "agent-card-recipe",
    label: "Agent card recipe",
    nextGate: "recipe specimen and production card selector",
    reason:
      "Agent cards need a visual-only recipe boundary before cards can receive dedicated glass treatment.",
  },
  {
    id: "segmented-navigation",
    label: "Top segmented navigation recipe",
    nextGate: "control primitive selector map",
    reason:
      "TopBar child controls remain behavior-bearing and are intentionally outside current shell alias coverage.",
  },
  {
    id: "typography-scale",
    label: "Typography scale cleanup",
    nextGate: "typography token adoption policy",
    reason:
      "Render Plan emits typography tokens, but production font scale and component text sizing are not controlled by the alias map.",
  },
  {
    id: "layout-arrangement",
    label: "Warm command-center layout arrangement",
    nextGate: "layout preset/page shell preview gate",
    reason:
      "Layout presets are review-only metadata and cannot move, resize, or rearrange production shell regions.",
  },
];

export function createWarmGlassOpsProductionAliasCoverageReportV1():
  NexusProductionAliasCoverageReportV1 {
  const skinPack = createWarmGlassOpsSkinPackV2Fixture();
  const renderPlanResult = compileNexusSkinPackRenderPlanV2(skinPack);
  const bridgeResult =
    createNexusProductionTokenBridgePlanFromRenderPlanResultV1(
      renderPlanResult,
    );
  const bridgePlan = bridgeResult.accepted ? bridgeResult.bridgePlan : null;

  return createNexusProductionAliasCoverageReportV1({
    bridgePlan,
    bridgePlanAccepted: bridgeResult.accepted,
    displayName: skinPack.metadata.displayName,
    renderPlanAccepted: renderPlanResult.accepted,
    skinPackId: skinPack.id,
  });
}

export function createNexusProductionAliasCoverageReportV1({
  bridgePlan,
  bridgePlanAccepted,
  displayName,
  renderPlanAccepted,
  skinPackId,
}: {
  bridgePlan: NexusProductionTokenBridgePlanV1 | null;
  bridgePlanAccepted: boolean;
  displayName: string;
  renderPlanAccepted: boolean;
  skinPackId: string;
}): NexusProductionAliasCoverageReportV1 {
  const bridgeVariables = new Set(Object.keys(bridgePlan?.variables ?? {}));
  const families = warmGlassAliasFamilies.map((family) =>
    createCoverageFamily(family, bridgeVariables),
  );

  return {
    bridgePlanAccepted,
    bridgeVariableCount: Object.keys(bridgePlan?.variables ?? {}).length,
    directlyDrivenFamilyCount: families.filter(
      (family) => family.directAliases.length > 0,
    ).length,
    displayName,
    fallbackDrivenFamilyCount: families.filter(
      (family) => family.mode === "fallback-driven" || family.mode === "mixed-bridge",
    ).length,
    families,
    familyCount: families.length,
    gaps: warmGlassOpsTargetCapabilityGapsV1,
    kind: "nexus-production-alias-coverage",
    renderPlanAccepted,
    skinPackId,
    smokeOnlyFamilyCount: families.filter(
      (family) => family.mode === "style-lab-smoke-only",
    ).length,
    unsupportedFamilyCount: families.filter(
      (family) => family.mode === "unsupported",
    ).length,
    version: NEXUS_PRODUCTION_ALIAS_COVERAGE_VERSION_V1,
  };
}

function createCoverageFamily(
  family: AliasFamilyDefinition,
  bridgeVariables: Set<string>,
): NexusProductionAliasCoverageFamilyV1 {
  const smokeVariables = family.smokeVariables ?? [];
  const hasFallbackBridge = family.bridgeTargets.some((target) =>
    bridgeVariables.has(target),
  );
  const directAliases = family.aliases.filter((alias) => bridgeVariables.has(alias));
  const fallbackDrivenAliases = family.aliases.filter(
    (alias) => !directAliases.includes(alias) && hasFallbackBridge,
  );
  const smokeOnlyAliases = family.aliases.filter(
    (alias) =>
      !directAliases.includes(alias) &&
      !fallbackDrivenAliases.includes(alias) &&
      smokeVariables.includes(alias),
  );
  const unsupportedAliases = family.aliases.filter(
    (alias) =>
      !directAliases.includes(alias) &&
      !fallbackDrivenAliases.includes(alias) &&
      !smokeOnlyAliases.includes(alias),
  );

  return {
    ...family,
    directAliases,
    fallbackDrivenAliases,
    mode: getCoverageMode({
      directAliases,
      fallbackDrivenAliases,
      smokeOnlyAliases,
    }),
    smokeOnlyAliases,
    smokeVariables,
    unsupportedAliases,
  };
}

function getCoverageMode({
  directAliases,
  fallbackDrivenAliases,
  smokeOnlyAliases,
}: {
  directAliases: string[];
  fallbackDrivenAliases: string[];
  smokeOnlyAliases: string[];
}): NexusProductionAliasCoverageModeV1 {
  if (directAliases.length > 0) {
    return "mixed-bridge";
  }

  if (fallbackDrivenAliases.length > 0) {
    return "fallback-driven";
  }

  if (smokeOnlyAliases.length > 0) {
    return "style-lab-smoke-only";
  }

  return "unsupported";
}
