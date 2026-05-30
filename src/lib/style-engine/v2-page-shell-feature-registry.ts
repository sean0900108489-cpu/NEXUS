import {
  NEXUS_WORKSPACE_LAYOUT_BOUNDARY_CONTRACT_VERSION_V1,
  NEXUS_WORKSPACE_LAYOUT_PAGE_SHELL_IDS_V1,
  NEXUS_WORKSPACE_LAYOUT_SLOT_IDS_V1,
  type NexusWorkspaceLayoutPageShellIdV1,
  type NexusWorkspaceLayoutSlotIdV1,
} from "./v2-layout-boundary";

export const NEXUS_PAGE_SHELL_FEATURE_REGISTRY_CONTRACT_VERSION_V1 =
  "page-shell-feature-registry-v1" as const;

export const NEXUS_PAGE_SHELL_FEATURE_REGISTRY_KIND_V1 =
  "nexus-page-shell-feature-registry" as const;

export const NEXUS_PAGE_SHELL_FEATURE_REGISTRY_SCHEMA_VERSION_V1 = 1 as const;

export const NEXUS_PAGE_SHELL_FEATURE_IDS_V1 = [
  "home-overview",
  "workspace-top-bar",
  "workspace-left-navigation",
  "workspace-primary-canvas",
  "workspace-right-inspector",
  "workspace-bottom-status",
  "floating-window-layer",
  "command-palette-surface",
  "settings-surface",
  "style-lab-surface",
] as const;

export type NexusPageShellFeatureIdV1 =
  (typeof NEXUS_PAGE_SHELL_FEATURE_IDS_V1)[number];

export type NexusPageShellFeatureCategoryV1 =
  | "page"
  | "workspace"
  | "navigation"
  | "inspector"
  | "overlay"
  | "settings"
  | "style-lab";

export type NexusPageShellFeatureDefinitionV1 = {
  id: NexusPageShellFeatureIdV1;
  label: string;
  category: NexusPageShellFeatureCategoryV1;
  pageShells: NexusWorkspaceLayoutPageShellIdV1[];
  allowedSlotIds: NexusWorkspaceLayoutSlotIdV1[];
  contract: typeof NEXUS_PAGE_SHELL_FEATURE_REGISTRY_CONTRACT_VERSION_V1;
  productionBehaviorProtected: true;
  acceptsVisualSlotOnly: true;
};

export type NexusPageShellFeatureMountV1 = {
  featureId: NexusPageShellFeatureIdV1;
  slotId: NexusWorkspaceLayoutSlotIdV1;
  mode: "enabled" | "review-only";
  notes?: string[];
};

export type NexusPageShellFeatureMountPlanV1 = {
  kind: typeof NEXUS_PAGE_SHELL_FEATURE_REGISTRY_KIND_V1;
  schemaVersion: typeof NEXUS_PAGE_SHELL_FEATURE_REGISTRY_SCHEMA_VERSION_V1;
  id: string;
  name: string;
  pageShell: NexusWorkspaceLayoutPageShellIdV1;
  features: NexusPageShellFeatureMountV1[];
  compatibility: {
    contract: typeof NEXUS_PAGE_SHELL_FEATURE_REGISTRY_CONTRACT_VERSION_V1;
    layoutBoundaryContract: typeof NEXUS_WORKSPACE_LAYOUT_BOUNDARY_CONTRACT_VERSION_V1;
    result: "compatible" | "compatible_with_warnings";
    notes?: string[];
  };
  fallback: {
    fallbackPlanId: string;
    onUnknownFeature: "reject-plan";
    onUnknownSlot: "reject-plan";
    onUnsupportedMount: "omit-feature";
    onProtectedField: "reject-plan";
  };
};

export type NexusPageShellFeatureRegistryIssueCodeV1 =
  | "pageShellFeature.reviewTextEmpty"
  | "pageShellFeature.reviewTextTooLarge"
  | "pageShellFeature.reviewInvalidJson"
  | "pageShellFeature.invalidRoot"
  | "pageShellFeature.missingField"
  | "pageShellFeature.unknownTopLevelField"
  | "pageShellFeature.invalidKind"
  | "pageShellFeature.unsupportedSchemaVersion"
  | "pageShellFeature.invalidField"
  | "pageShellFeature.unknownFeature"
  | "pageShellFeature.unknownSlot"
  | "pageShellFeature.unsupportedPageShell"
  | "pageShellFeature.unsupportedSlot"
  | "pageShellFeature.duplicateFeature"
  | "pageShellFeature.protectedField"
  | "pageShellFeature.forbiddenString";

export type NexusPageShellFeatureRegistryIssueV1 = {
  code: NexusPageShellFeatureRegistryIssueCodeV1;
  path: string;
  message: string;
};

export type NexusPageShellFeatureMountPlanSummaryV1 = {
  planId: string;
  name: string;
  pageShell: NexusWorkspaceLayoutPageShellIdV1;
  featureCount: number;
  features: Array<{
    featureId: NexusPageShellFeatureIdV1;
    label: string;
    slotId: NexusWorkspaceLayoutSlotIdV1;
    mode: NexusPageShellFeatureMountV1["mode"];
  }>;
  protectedBoundary: "production-feature-mount-blocked";
};

export type NexusPageShellFeatureMountPlanReviewResultV1 =
  | {
      accepted: true;
      plan: NexusPageShellFeatureMountPlanV1;
      summary: NexusPageShellFeatureMountPlanSummaryV1;
      issues: NexusPageShellFeatureRegistryIssueV1[];
    }
  | {
      accepted: false;
      issues: NexusPageShellFeatureRegistryIssueV1[];
    };

const maxFeatureMountPlanTextBytes = 48_000;
const slugPattern = /^[a-z0-9-]{3,96}$/;
const featureIdSet = new Set<string>(NEXUS_PAGE_SHELL_FEATURE_IDS_V1);
const slotIdSet = new Set<string>(NEXUS_WORKSPACE_LAYOUT_SLOT_IDS_V1);
const pageShellIdSet = new Set<string>(NEXUS_WORKSPACE_LAYOUT_PAGE_SHELL_IDS_V1);

const featureMountPlanTopLevelKeys = new Set([
  "kind",
  "schemaVersion",
  "id",
  "name",
  "pageShell",
  "features",
  "compatibility",
  "fallback",
]);

const requiredFeatureMountPlanFields = [
  "kind",
  "schemaVersion",
  "id",
  "name",
  "pageShell",
  "features",
  "compatibility",
  "fallback",
] as const;

const featureMountKeys = new Set(["featureId", "slotId", "mode", "notes"]);

export const NEXUS_PAGE_SHELL_FEATURE_REGISTRY_V1: Record<
  NexusPageShellFeatureIdV1,
  NexusPageShellFeatureDefinitionV1
> = {
  "command-palette-surface": createFeatureDefinition({
    allowedSlotIds: ["commandPalette"],
    category: "overlay",
    id: "command-palette-surface",
    label: "Command Palette Surface",
    pageShells: ["home", "workspace", "settings", "styleLab"],
  }),
  "floating-window-layer": createFeatureDefinition({
    allowedSlotIds: ["floatingWindows"],
    category: "overlay",
    id: "floating-window-layer",
    label: "Floating Window Layer",
    pageShells: ["workspace"],
  }),
  "home-overview": createFeatureDefinition({
    allowedSlotIds: ["home"],
    category: "page",
    id: "home-overview",
    label: "Home Overview",
    pageShells: ["home"],
  }),
  "settings-surface": createFeatureDefinition({
    allowedSlotIds: ["settings"],
    category: "settings",
    id: "settings-surface",
    label: "Settings Surface",
    pageShells: ["settings"],
  }),
  "style-lab-surface": createFeatureDefinition({
    allowedSlotIds: ["styleLab"],
    category: "style-lab",
    id: "style-lab-surface",
    label: "Style Lab Surface",
    pageShells: ["styleLab"],
  }),
  "workspace-bottom-status": createFeatureDefinition({
    allowedSlotIds: ["bottomBar"],
    category: "navigation",
    id: "workspace-bottom-status",
    label: "Workspace Bottom Status",
    pageShells: ["workspace"],
  }),
  "workspace-left-navigation": createFeatureDefinition({
    allowedSlotIds: ["leftSidebar"],
    category: "navigation",
    id: "workspace-left-navigation",
    label: "Workspace Left Navigation",
    pageShells: ["workspace"],
  }),
  "workspace-primary-canvas": createFeatureDefinition({
    allowedSlotIds: ["mainCanvas"],
    category: "workspace",
    id: "workspace-primary-canvas",
    label: "Workspace Primary Canvas",
    pageShells: ["workspace"],
  }),
  "workspace-right-inspector": createFeatureDefinition({
    allowedSlotIds: ["rightInspector"],
    category: "inspector",
    id: "workspace-right-inspector",
    label: "Workspace Right Inspector",
    pageShells: ["workspace"],
  }),
  "workspace-top-bar": createFeatureDefinition({
    allowedSlotIds: ["topBar"],
    category: "navigation",
    id: "workspace-top-bar",
    label: "Workspace Top Bar",
    pageShells: ["workspace"],
  }),
};

export function createDefaultWorkspacePageShellFeatureMountPlanV1(): NexusPageShellFeatureMountPlanV1 {
  return createPageShellFeatureMountPlan({
    features: [
      ["workspace-top-bar", "topBar"],
      ["workspace-left-navigation", "leftSidebar"],
      ["workspace-primary-canvas", "mainCanvas"],
      ["workspace-right-inspector", "rightInspector"],
      ["workspace-bottom-status", "bottomBar"],
      ["floating-window-layer", "floatingWindows"],
      ["command-palette-surface", "commandPalette"],
    ],
    id: "default-workspace-feature-mounts",
    name: "Default Workspace Feature Mounts",
    pageShell: "workspace",
  });
}

export function createPageShellFeatureMountPlanV1(
  pageShell: NexusWorkspaceLayoutPageShellIdV1,
): NexusPageShellFeatureMountPlanV1 {
  const mainFeatureByPage: Record<
    NexusWorkspaceLayoutPageShellIdV1,
    [NexusPageShellFeatureIdV1, NexusWorkspaceLayoutSlotIdV1]
  > = {
    home: ["home-overview", "home"],
    settings: ["settings-surface", "settings"],
    styleLab: ["style-lab-surface", "styleLab"],
    workspace: ["workspace-primary-canvas", "mainCanvas"],
  };

  return createPageShellFeatureMountPlan({
    features: [
      mainFeatureByPage[pageShell],
      ["command-palette-surface", "commandPalette"],
    ],
    id: `${pageShell.toLowerCase()}-page-shell-feature-mounts`,
    name: `${pageShell} Page Shell Feature Mounts`,
    pageShell,
  });
}

export function createInvalidUnsafePageShellFeatureMountPlanV1(): unknown {
  return {
    ...createDefaultWorkspacePageShellFeatureMountPlanV1(),
    componentPath: "@/components/nexus/nexus-ops.tsx",
    hiddenPayload: "hidden-feature-mount-payload",
    routeMutation: "/style-lab",
    features: [
      ...createDefaultWorkspacePageShellFeatureMountPlanV1().features,
      {
        componentPath: "@/components/nexus/nexus-graph.tsx",
        featureId: "workspace-primary-canvas",
        mode: "enabled",
        onNodeDrag: "mutate graph",
        slotId: "mainCanvas",
        zIndex: 40,
      },
    ],
  };
}

export function reviewNexusPageShellFeatureMountPlanTextV1(
  text: string,
): NexusPageShellFeatureMountPlanReviewResultV1 {
  const trimmed = text.trim();

  if (!trimmed) {
    return rejectFeatureMountPlan([
      createIssue(
        "pageShellFeature.reviewTextEmpty",
        "$",
        "Feature mount plan review text is empty.",
      ),
    ]);
  }

  if (new TextEncoder().encode(trimmed).length > maxFeatureMountPlanTextBytes) {
    return rejectFeatureMountPlan([
      createIssue(
        "pageShellFeature.reviewTextTooLarge",
        "$",
        "Feature mount plan review text is too large.",
      ),
    ]);
  }

  try {
    return validateNexusPageShellFeatureMountPlanV1(JSON.parse(trimmed));
  } catch {
    return rejectFeatureMountPlan([
      createIssue(
        "pageShellFeature.reviewInvalidJson",
        "$",
        "Feature mount plan review text must be valid JSON.",
      ),
    ]);
  }
}

export function validateNexusPageShellFeatureMountPlanV1(
  candidate: unknown,
): NexusPageShellFeatureMountPlanReviewResultV1 {
  const issues: NexusPageShellFeatureRegistryIssueV1[] = [];

  if (!isRecord(candidate)) {
    return rejectFeatureMountPlan([
      createIssue(
        "pageShellFeature.invalidRoot",
        "$",
        "Feature mount plan candidate must be an object.",
      ),
    ]);
  }

  validateTopLevelShape(candidate, issues);
  validateIdentity(candidate, issues);
  validateFeatureMounts(candidate.features, candidate.pageShell, issues);
  validateCompatibility(candidate.compatibility, issues);
  validateFallback(candidate.fallback, issues);
  scanProtectedFeatureInput(candidate, "$", issues);
  scanForbiddenFeatureStrings(candidate, "$", issues);

  if (issues.length > 0) {
    return rejectFeatureMountPlan(issues);
  }

  const plan = candidate as NexusPageShellFeatureMountPlanV1;

  return {
    accepted: true,
    issues,
    plan,
    summary: createFeatureMountPlanSummary(plan),
  };
}

function createFeatureDefinition({
  allowedSlotIds,
  category,
  id,
  label,
  pageShells,
}: {
  allowedSlotIds: NexusWorkspaceLayoutSlotIdV1[];
  category: NexusPageShellFeatureCategoryV1;
  id: NexusPageShellFeatureIdV1;
  label: string;
  pageShells: NexusWorkspaceLayoutPageShellIdV1[];
}): NexusPageShellFeatureDefinitionV1 {
  return {
    acceptsVisualSlotOnly: true,
    allowedSlotIds,
    category,
    contract: NEXUS_PAGE_SHELL_FEATURE_REGISTRY_CONTRACT_VERSION_V1,
    id,
    label,
    pageShells,
    productionBehaviorProtected: true,
  };
}

function createPageShellFeatureMountPlan({
  features,
  id,
  name,
  pageShell,
}: {
  features: Array<[NexusPageShellFeatureIdV1, NexusWorkspaceLayoutSlotIdV1]>;
  id: string;
  name: string;
  pageShell: NexusWorkspaceLayoutPageShellIdV1;
}): NexusPageShellFeatureMountPlanV1 {
  return {
    compatibility: {
      contract: NEXUS_PAGE_SHELL_FEATURE_REGISTRY_CONTRACT_VERSION_V1,
      layoutBoundaryContract: NEXUS_WORKSPACE_LAYOUT_BOUNDARY_CONTRACT_VERSION_V1,
      result: "compatible",
    },
    fallback: {
      fallbackPlanId: "default-workspace-feature-mounts",
      onProtectedField: "reject-plan",
      onUnknownFeature: "reject-plan",
      onUnknownSlot: "reject-plan",
      onUnsupportedMount: "omit-feature",
    },
    features: features.map(([featureId, slotId]) => ({
      featureId,
      mode: "review-only",
      slotId,
    })),
    id,
    kind: NEXUS_PAGE_SHELL_FEATURE_REGISTRY_KIND_V1,
    name,
    pageShell,
    schemaVersion: NEXUS_PAGE_SHELL_FEATURE_REGISTRY_SCHEMA_VERSION_V1,
  };
}

function createFeatureMountPlanSummary(
  plan: NexusPageShellFeatureMountPlanV1,
): NexusPageShellFeatureMountPlanSummaryV1 {
  return {
    featureCount: plan.features.length,
    features: plan.features.map((feature) => ({
      featureId: feature.featureId,
      label: NEXUS_PAGE_SHELL_FEATURE_REGISTRY_V1[feature.featureId].label,
      mode: feature.mode,
      slotId: feature.slotId,
    })),
    name: plan.name,
    pageShell: plan.pageShell,
    planId: plan.id,
    protectedBoundary: "production-feature-mount-blocked",
  };
}

function validateTopLevelShape(
  candidate: Record<string, unknown>,
  issues: NexusPageShellFeatureRegistryIssueV1[],
) {
  for (const field of requiredFeatureMountPlanFields) {
    if (!(field in candidate)) {
      issues.push(
        createIssue(
          "pageShellFeature.missingField",
          `$.${field}`,
          "Required feature mount plan field is missing.",
        ),
      );
    }
  }

  for (const key of Object.keys(candidate).sort()) {
    if (!featureMountPlanTopLevelKeys.has(key)) {
      issues.push(
        createIssue(
          "pageShellFeature.unknownTopLevelField",
          `$.${key}`,
          "Unknown top-level fields are not allowed.",
        ),
      );
    }
  }
}

function validateIdentity(
  candidate: Record<string, unknown>,
  issues: NexusPageShellFeatureRegistryIssueV1[],
) {
  if (candidate.kind !== NEXUS_PAGE_SHELL_FEATURE_REGISTRY_KIND_V1) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidKind",
        "$.kind",
        "Feature mount plan kind is invalid.",
      ),
    );
  }

  if (
    candidate.schemaVersion !==
    NEXUS_PAGE_SHELL_FEATURE_REGISTRY_SCHEMA_VERSION_V1
  ) {
    issues.push(
      createIssue(
        "pageShellFeature.unsupportedSchemaVersion",
        "$.schemaVersion",
        "Feature mount plan schemaVersion must be 1.",
      ),
    );
  }

  if (typeof candidate.id !== "string" || !slugPattern.test(candidate.id)) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.id",
        "Feature mount plan id must be a lowercase slug.",
      ),
    );
  }

  if (typeof candidate.name !== "string" || !withinLength(candidate.name, 1, 96)) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.name",
        "Feature mount plan name is required.",
      ),
    );
  }

  if (
    typeof candidate.pageShell !== "string" ||
    !pageShellIdSet.has(candidate.pageShell)
  ) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.pageShell",
        "Feature mount plan page shell is invalid.",
      ),
    );
  }
}

function validateFeatureMounts(
  value: unknown,
  pageShellCandidate: unknown,
  issues: NexusPageShellFeatureRegistryIssueV1[],
) {
  if (!Array.isArray(value)) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.features",
        "Feature mounts must be an array.",
      ),
    );
    return;
  }

  if (value.length === 0) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.features",
        "Feature mount plan must include at least one feature.",
      ),
    );
    return;
  }

  const seenFeatureIds = new Set<string>();
  const pageShell =
    typeof pageShellCandidate === "string" && pageShellIdSet.has(pageShellCandidate)
      ? (pageShellCandidate as NexusWorkspaceLayoutPageShellIdV1)
      : null;

  value.forEach((mount, index) => {
    const path = `$.features[${index}]`;

    if (!isRecord(mount)) {
      issues.push(
        createIssue(
          "pageShellFeature.invalidField",
          path,
          "Feature mount must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(mount).sort()) {
      if (!featureMountKeys.has(key)) {
        issues.push(
          createIssue(
            "pageShellFeature.protectedField",
            `${path}.${key}`,
            "Feature mount contains unsupported authority.",
          ),
        );
      }
    }

    const featureId = mount.featureId;
    const slotId = mount.slotId;

    if (mount.mode !== "enabled" && mount.mode !== "review-only") {
      issues.push(
        createIssue(
          "pageShellFeature.invalidField",
          `${path}.mode`,
          "Feature mount mode must be enabled or review-only.",
        ),
      );
    }

    if (typeof featureId !== "string" || !featureIdSet.has(featureId)) {
      issues.push(
        createIssue(
          "pageShellFeature.unknownFeature",
          `${path}.featureId`,
          "Feature id is not approved by the registry.",
        ),
      );
      return;
    }

    if (seenFeatureIds.has(featureId)) {
      issues.push(
        createIssue(
          "pageShellFeature.duplicateFeature",
          `${path}.featureId`,
          "Feature ids may only be mounted once in a plan.",
        ),
      );
    } else {
      seenFeatureIds.add(featureId);
    }

    if (typeof slotId !== "string" || !slotIdSet.has(slotId)) {
      issues.push(
        createIssue(
          "pageShellFeature.unknownSlot",
          `${path}.slotId`,
          "Feature mount slot is not approved by the layout boundary.",
        ),
      );
      return;
    }

    const definition =
      NEXUS_PAGE_SHELL_FEATURE_REGISTRY_V1[
        featureId as NexusPageShellFeatureIdV1
      ];

    if (pageShell && !definition.pageShells.includes(pageShell)) {
      issues.push(
        createIssue(
          "pageShellFeature.unsupportedPageShell",
          `${path}.featureId`,
          "Feature is not approved for this page shell.",
        ),
      );
    }

    if (!definition.allowedSlotIds.includes(slotId as NexusWorkspaceLayoutSlotIdV1)) {
      issues.push(
        createIssue(
          "pageShellFeature.unsupportedSlot",
          `${path}.slotId`,
          "Feature is not approved for this slot.",
        ),
      );
    }
  });
}

function validateCompatibility(
  value: unknown,
  issues: NexusPageShellFeatureRegistryIssueV1[],
) {
  if (!isRecord(value)) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.compatibility",
        "Feature mount compatibility must be an object.",
      ),
    );
    return;
  }

  if (value.contract !== NEXUS_PAGE_SHELL_FEATURE_REGISTRY_CONTRACT_VERSION_V1) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.compatibility.contract",
        "Feature mount compatibility contract is invalid.",
      ),
    );
  }

  if (
    value.layoutBoundaryContract !==
    NEXUS_WORKSPACE_LAYOUT_BOUNDARY_CONTRACT_VERSION_V1
  ) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.compatibility.layoutBoundaryContract",
        "Feature mount plan must target the workspace layout slot boundary.",
      ),
    );
  }

  if (!["compatible", "compatible_with_warnings"].includes(String(value.result))) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.compatibility.result",
        "Feature mount compatibility result is invalid.",
      ),
    );
  }
}

function validateFallback(
  value: unknown,
  issues: NexusPageShellFeatureRegistryIssueV1[],
) {
  if (!isRecord(value)) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.fallback",
        "Feature mount fallback must be an object.",
      ),
    );
    return;
  }

  if (typeof value.fallbackPlanId !== "string" || !slugPattern.test(value.fallbackPlanId)) {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.fallback.fallbackPlanId",
        "Feature mount fallback plan id must be a lowercase slug.",
      ),
    );
  }

  if (value.onUnknownFeature !== "reject-plan") {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.fallback.onUnknownFeature",
        "Unknown features must reject the plan.",
      ),
    );
  }

  if (value.onUnknownSlot !== "reject-plan") {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.fallback.onUnknownSlot",
        "Unknown slots must reject the plan.",
      ),
    );
  }

  if (value.onUnsupportedMount !== "omit-feature") {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.fallback.onUnsupportedMount",
        "Unsupported feature mounts must be omitted.",
      ),
    );
  }

  if (value.onProtectedField !== "reject-plan") {
    issues.push(
      createIssue(
        "pageShellFeature.invalidField",
        "$.fallback.onProtectedField",
        "Protected feature fields must reject the plan.",
      ),
    );
  }
}

function scanProtectedFeatureInput(
  value: unknown,
  path: string,
  issues: NexusPageShellFeatureRegistryIssueV1[],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanProtectedFeatureInput(item, `${path}[${index}]`, issues),
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nextValue] of Object.entries(value).sort()) {
    const nextPath = `${path}.${key}`;

    if (isProtectedFeatureKey(key)) {
      issues.push(
        createIssue(
          "pageShellFeature.protectedField",
          nextPath,
          "Feature mount plan contains protected behavior, component, route, state, or persistence authority.",
        ),
      );
    }

    scanProtectedFeatureInput(nextValue, nextPath, issues);
  }
}

function scanForbiddenFeatureStrings(
  value: unknown,
  path: string,
  issues: NexusPageShellFeatureRegistryIssueV1[],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanForbiddenFeatureStrings(item, `${path}[${index}]`, issues),
    );
    return;
  }

  if (isRecord(value)) {
    for (const [key, nextValue] of Object.entries(value).sort()) {
      scanForbiddenFeatureStrings(nextValue, `${path}.${key}`, issues);
    }
    return;
  }

  if (typeof value !== "string") {
    return;
  }

  if (forbiddenStringPatterns.some((pattern) => pattern.test(value))) {
    issues.push(
      createIssue(
        "pageShellFeature.forbiddenString",
        path,
        "Feature mount plan contains a forbidden string value.",
      ),
    );
  }
}

function isProtectedFeatureKey(key: string) {
  const normalized = key.toLowerCase().replace(/[-_\s.]/g, "");

  return (
    exactProtectedFeatureKeys.includes(normalized) ||
    protectedFeatureKeyFragments.some((part) => normalized.includes(part))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withinLength(value: string, min: number, max: number) {
  return value.length >= min && value.length <= max;
}

function rejectFeatureMountPlan(
  issues: NexusPageShellFeatureRegistryIssueV1[],
): NexusPageShellFeatureMountPlanReviewResultV1 {
  return {
    accepted: false,
    issues: sortIssues(issues),
  };
}

function createIssue(
  code: NexusPageShellFeatureRegistryIssueCodeV1,
  path: string,
  message: string,
): NexusPageShellFeatureRegistryIssueV1 {
  return { code, message, path };
}

function sortIssues(issues: NexusPageShellFeatureRegistryIssueV1[]) {
  return [...issues].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);

    return pathOrder === 0 ? left.code.localeCompare(right.code) : pathOrder;
  });
}

const exactProtectedFeatureKeys = [
  "aria",
  "backend",
  "behaviorclass",
  "classname",
  "component",
  "componentpath",
  "css",
  "database",
  "deployment",
  "dynamicimport",
  "height",
  "href",
  "html",
  "importpath",
  "indexeddb",
  "javascript",
  "localstorage",
  "migration",
  "overflow",
  "pointerevents",
  "position",
  "rawcss",
  "reactflow",
  "role",
  "route",
  "routemutation",
  "selector",
  "store",
  "style",
  "supabase",
  "sync",
  "tabindex",
  "width",
  "zindex",
];

const protectedFeatureKeyFragments = [
  "backend",
  "bounds",
  "drag",
  "focus",
  "mutation",
  "nodesdraggable",
  "onchange",
  "onclick",
  "onconnect",
  "onkey",
  "onnodedrag",
  "onpointer",
  "resize",
  "workspaceState",
].map((part) => part.toLowerCase());

const forbiddenStringPatterns = [
  /<script/i,
  /javascript:/i,
  /\burl\s*\(/i,
  /@import/i,
  /\bimport\s*\(/i,
  /\bfrom\s+["']/i,
  /\b(?:https?|ftp):\/\//i,
  /\b(?:blob|file|data):/i,
  /[{}]/,
  /;\s*[-_a-z]+\s*:/i,
  /\b(?:position|z-index|pointer-events|overflow|width|height)\s*:/i,
  /\b\d+(?:px|rem|vh|vw)\b/i,
  /^\s*[.#][a-z0-9_-]+/i,
  /\/api\/v1/i,
  /\bsupabase\b/i,
  /\blocalStorage\b/,
  /\bindexedDB\b/,
  /\.tsx?\b/i,
  /\.jsx?\b/i,
];
