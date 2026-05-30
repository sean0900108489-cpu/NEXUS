export const NEXUS_WORKSPACE_LAYOUT_BOUNDARY_CONTRACT_VERSION_V1 =
  "workspace-layout-slot-boundary-v1" as const;

export const NEXUS_WORKSPACE_LAYOUT_PRESET_KIND_V1 =
  "nexus-workspace-layout-preset" as const;

export const NEXUS_WORKSPACE_LAYOUT_PRESET_SCHEMA_VERSION_V1 = 1 as const;

export const NEXUS_WORKSPACE_LAYOUT_SLOT_IDS_V1 = [
  "home",
  "workspace",
  "topBar",
  "leftSidebar",
  "rightInspector",
  "mainCanvas",
  "bottomBar",
  "floatingWindows",
  "commandPalette",
  "settings",
  "styleLab",
] as const;

export const NEXUS_WORKSPACE_LAYOUT_REGION_IDS_V1 = [
  "top",
  "left",
  "main",
  "right",
  "bottom",
  "floating",
] as const;

export const NEXUS_WORKSPACE_LAYOUT_PAGE_SHELL_IDS_V1 = [
  "home",
  "workspace",
  "settings",
  "styleLab",
] as const;

export const NEXUS_WORKSPACE_LAYOUT_ARRANGEMENTS_V1 = [
  "default-workspace",
  "left-right-swapped",
  "top-bottom-swapped",
  "home-shell",
  "workspace-shell",
  "settings-shell",
  "style-lab-shell",
] as const;

export type NexusWorkspaceLayoutSlotIdV1 =
  (typeof NEXUS_WORKSPACE_LAYOUT_SLOT_IDS_V1)[number];

export type NexusWorkspaceLayoutRegionIdV1 =
  (typeof NEXUS_WORKSPACE_LAYOUT_REGION_IDS_V1)[number];

export type NexusWorkspaceLayoutPageShellIdV1 =
  (typeof NEXUS_WORKSPACE_LAYOUT_PAGE_SHELL_IDS_V1)[number];

export type NexusWorkspaceLayoutArrangementIdV1 =
  (typeof NEXUS_WORKSPACE_LAYOUT_ARRANGEMENTS_V1)[number];

export type NexusWorkspaceLayoutSlotDefinitionV1 = {
  id: NexusWorkspaceLayoutSlotIdV1;
  label: string;
  owner:
    | "page-shell"
    | "workspace-shell"
    | "navigation-shell"
    | "inspector-shell"
    | "overlay-shell"
    | "style-lab";
  productionBehaviorProtected: true;
  acceptsVisualTokensOnly: true;
};

export type NexusWorkspaceLayoutPresetV1 = {
  kind: typeof NEXUS_WORKSPACE_LAYOUT_PRESET_KIND_V1;
  schemaVersion: typeof NEXUS_WORKSPACE_LAYOUT_PRESET_SCHEMA_VERSION_V1;
  id: string;
  name: string;
  intent: {
    pageShell: NexusWorkspaceLayoutPageShellIdV1;
    arrangement: NexusWorkspaceLayoutArrangementIdV1;
    description?: string;
  };
  regions: Record<NexusWorkspaceLayoutRegionIdV1, NexusWorkspaceLayoutSlotIdV1[]>;
  compatibility: {
    contract: typeof NEXUS_WORKSPACE_LAYOUT_BOUNDARY_CONTRACT_VERSION_V1;
    result: "compatible" | "compatible_with_warnings";
    notes?: string[];
  };
  fallback: {
    fallbackPresetId: string;
    onUnsupportedSlot: "ignore-slot";
    onUnsupportedArrangement: "use-default-workspace";
    onProtectedField: "reject-preset";
  };
};

export type NexusWorkspaceLayoutBoundaryIssueCodeV1 =
  | "workspaceLayout.reviewTextEmpty"
  | "workspaceLayout.reviewTextTooLarge"
  | "workspaceLayout.reviewInvalidJson"
  | "workspaceLayout.invalidRoot"
  | "workspaceLayout.missingField"
  | "workspaceLayout.unknownTopLevelField"
  | "workspaceLayout.invalidKind"
  | "workspaceLayout.unsupportedSchemaVersion"
  | "workspaceLayout.invalidField"
  | "workspaceLayout.unknownRegion"
  | "workspaceLayout.unknownSlot"
  | "workspaceLayout.duplicateSlot"
  | "workspaceLayout.arrangementMismatch"
  | "workspaceLayout.protectedField"
  | "workspaceLayout.forbiddenString";

export type NexusWorkspaceLayoutBoundaryIssueV1 = {
  code: NexusWorkspaceLayoutBoundaryIssueCodeV1;
  path: string;
  message: string;
};

export type NexusWorkspaceLayoutPresetSummaryV1 = {
  presetId: string;
  name: string;
  pageShell: NexusWorkspaceLayoutPageShellIdV1;
  arrangement: NexusWorkspaceLayoutArrangementIdV1;
  slotCount: number;
  regionCount: number;
  regions: Array<{
    regionId: NexusWorkspaceLayoutRegionIdV1;
    slots: NexusWorkspaceLayoutSlotIdV1[];
  }>;
  protectedBoundary: "production-layout-blocked";
};

export type NexusWorkspaceLayoutPresetReviewResultV1 =
  | {
      accepted: true;
      preset: NexusWorkspaceLayoutPresetV1;
      summary: NexusWorkspaceLayoutPresetSummaryV1;
      issues: NexusWorkspaceLayoutBoundaryIssueV1[];
    }
  | {
      accepted: false;
      issues: NexusWorkspaceLayoutBoundaryIssueV1[];
    };

const maxLayoutPresetTextBytes = 48_000;

const layoutPresetTopLevelKeys = new Set([
  "kind",
  "schemaVersion",
  "id",
  "name",
  "intent",
  "regions",
  "compatibility",
  "fallback",
]);

const requiredLayoutPresetFields = [
  "kind",
  "schemaVersion",
  "id",
  "name",
  "intent",
  "regions",
  "compatibility",
  "fallback",
] as const;

const slugPattern = /^[a-z0-9-]{3,96}$/;
const slotIdSet = new Set<string>(NEXUS_WORKSPACE_LAYOUT_SLOT_IDS_V1);
const regionIdSet = new Set<string>(NEXUS_WORKSPACE_LAYOUT_REGION_IDS_V1);
const pageShellIdSet = new Set<string>(NEXUS_WORKSPACE_LAYOUT_PAGE_SHELL_IDS_V1);
const arrangementIdSet = new Set<string>(NEXUS_WORKSPACE_LAYOUT_ARRANGEMENTS_V1);

export const NEXUS_WORKSPACE_LAYOUT_SLOT_REGISTRY_V1: Record<
  NexusWorkspaceLayoutSlotIdV1,
  NexusWorkspaceLayoutSlotDefinitionV1
> = {
  bottomBar: createSlotDefinition("bottomBar", "Bottom Bar", "navigation-shell"),
  commandPalette: createSlotDefinition(
    "commandPalette",
    "Command Palette",
    "overlay-shell",
  ),
  floatingWindows: createSlotDefinition(
    "floatingWindows",
    "Floating Windows",
    "workspace-shell",
  ),
  home: createSlotDefinition("home", "Home", "page-shell"),
  leftSidebar: createSlotDefinition(
    "leftSidebar",
    "Left Sidebar",
    "navigation-shell",
  ),
  mainCanvas: createSlotDefinition("mainCanvas", "Main Canvas", "workspace-shell"),
  rightInspector: createSlotDefinition(
    "rightInspector",
    "Right Inspector",
    "inspector-shell",
  ),
  settings: createSlotDefinition("settings", "Settings", "page-shell"),
  styleLab: createSlotDefinition("styleLab", "Style Lab", "style-lab"),
  topBar: createSlotDefinition("topBar", "Top Bar", "navigation-shell"),
  workspace: createSlotDefinition("workspace", "Workspace", "page-shell"),
};

export function createDefaultWorkspaceLayoutPresetV1(): NexusWorkspaceLayoutPresetV1 {
  return createWorkspaceLayoutPreset({
    arrangement: "default-workspace",
    id: "default-workspace-layout",
    main: ["mainCanvas"],
    name: "Default Workspace Layout",
    pageShell: "workspace",
  });
}

export function createLeftRightSwappedWorkspaceLayoutPresetV1(): NexusWorkspaceLayoutPresetV1 {
  return createWorkspaceLayoutPreset({
    arrangement: "left-right-swapped",
    id: "left-right-swapped-workspace-layout",
    left: ["rightInspector"],
    main: ["mainCanvas"],
    name: "Left Right Swapped Workspace Layout",
    pageShell: "workspace",
    right: ["leftSidebar"],
  });
}

export function createTopBottomSwappedWorkspaceLayoutPresetV1(): NexusWorkspaceLayoutPresetV1 {
  return createWorkspaceLayoutPreset({
    arrangement: "top-bottom-swapped",
    bottom: ["topBar"],
    id: "top-bottom-swapped-workspace-layout",
    main: ["mainCanvas"],
    name: "Top Bottom Swapped Workspace Layout",
    pageShell: "workspace",
    top: ["bottomBar"],
  });
}

export function createPageShellLayoutPresetV1(
  pageShell: NexusWorkspaceLayoutPageShellIdV1,
): NexusWorkspaceLayoutPresetV1 {
  const arrangementByPage: Record<
    NexusWorkspaceLayoutPageShellIdV1,
    NexusWorkspaceLayoutArrangementIdV1
  > = {
    home: "home-shell",
    settings: "settings-shell",
    styleLab: "style-lab-shell",
    workspace: "workspace-shell",
  };

  const mainSlotByPage: Record<
    NexusWorkspaceLayoutPageShellIdV1,
    NexusWorkspaceLayoutSlotIdV1
  > = {
    home: "home",
    settings: "settings",
    styleLab: "styleLab",
    workspace: "mainCanvas",
  };

  return createWorkspaceLayoutPreset({
    arrangement: arrangementByPage[pageShell],
    id: `${pageShell.toLowerCase()}-page-shell-layout`,
    left: [],
    main: [mainSlotByPage[pageShell]],
    name: `${NEXUS_WORKSPACE_LAYOUT_SLOT_REGISTRY_V1[mainSlotByPage[pageShell]].label} Page Shell Layout`,
    pageShell,
    right: [],
  });
}

export function createInvalidUnsafeWorkspaceLayoutPresetV1(): unknown {
  return {
    ...createDefaultWorkspaceLayoutPresetV1(),
    componentPath: "@/components/nexus/nexus-ops.tsx",
    hiddenPayload: "hidden-layout-payload",
    intent: {
      arrangement: "left-right-swapped",
      description: ".nexus-workspace { width: 1280px; }",
      pageShell: "workspace",
    },
    regions: {
      bottom: ["bottomBar"],
      floating: ["floatingWindows", "commandPalette"],
      left: ["leftSidebar"],
      main: ["mainCanvas"],
      right: ["rightInspector"],
      top: ["topBar"],
    },
    routeMutation: "/settings",
    unsafeBehavior: {
      nodesDraggable: true,
      onNodeDrag: "mutate graph",
      zIndex: 999,
    },
  };
}

export function reviewNexusWorkspaceLayoutPresetTextV1(
  text: string,
): NexusWorkspaceLayoutPresetReviewResultV1 {
  const trimmed = text.trim();

  if (!trimmed) {
    return rejectLayoutPreset([
      createIssue(
        "workspaceLayout.reviewTextEmpty",
        "$",
        "Layout preset review text is empty.",
      ),
    ]);
  }

  if (new TextEncoder().encode(trimmed).length > maxLayoutPresetTextBytes) {
    return rejectLayoutPreset([
      createIssue(
        "workspaceLayout.reviewTextTooLarge",
        "$",
        "Layout preset review text is too large.",
      ),
    ]);
  }

  try {
    return validateNexusWorkspaceLayoutPresetV1(JSON.parse(trimmed));
  } catch {
    return rejectLayoutPreset([
      createIssue(
        "workspaceLayout.reviewInvalidJson",
        "$",
        "Layout preset review text must be valid JSON.",
      ),
    ]);
  }
}

export function validateNexusWorkspaceLayoutPresetV1(
  candidate: unknown,
): NexusWorkspaceLayoutPresetReviewResultV1 {
  const issues: NexusWorkspaceLayoutBoundaryIssueV1[] = [];

  if (!isRecord(candidate)) {
    return rejectLayoutPreset([
      createIssue(
        "workspaceLayout.invalidRoot",
        "$",
        "Layout preset candidate must be an object.",
      ),
    ]);
  }

  validateTopLevelShape(candidate, issues);
  validateIdentity(candidate, issues);
  validateIntent(candidate.intent, issues);
  validateRegions(candidate.regions, issues);
  validateCompatibility(candidate.compatibility, issues);
  validateFallback(candidate.fallback, issues);
  scanProtectedLayoutInput(candidate, "$", issues);
  scanForbiddenLayoutStrings(candidate, "$", issues);

  if (issues.some((issue) => issue.code !== "workspaceLayout.arrangementMismatch")) {
    return rejectLayoutPreset(issues);
  }

  const preset = candidate as NexusWorkspaceLayoutPresetV1;
  const mismatchIssues = validateArrangementIntent(preset);

  if (mismatchIssues.length > 0) {
    return rejectLayoutPreset([...issues, ...mismatchIssues]);
  }

  return {
    accepted: true,
    issues,
    preset,
    summary: createLayoutPresetSummary(preset),
  };
}

function createWorkspaceLayoutPreset({
  arrangement,
  bottom = ["bottomBar"],
  id,
  left = ["leftSidebar"],
  main,
  name,
  pageShell,
  right = ["rightInspector"],
  top = ["topBar"],
}: {
  arrangement: NexusWorkspaceLayoutArrangementIdV1;
  bottom?: NexusWorkspaceLayoutSlotIdV1[];
  id: string;
  left?: NexusWorkspaceLayoutSlotIdV1[];
  main: NexusWorkspaceLayoutSlotIdV1[];
  name: string;
  pageShell: NexusWorkspaceLayoutPageShellIdV1;
  right?: NexusWorkspaceLayoutSlotIdV1[];
  top?: NexusWorkspaceLayoutSlotIdV1[];
}): NexusWorkspaceLayoutPresetV1 {
  return {
    compatibility: {
      contract: NEXUS_WORKSPACE_LAYOUT_BOUNDARY_CONTRACT_VERSION_V1,
      result: "compatible",
    },
    fallback: {
      fallbackPresetId: "default-workspace-layout",
      onProtectedField: "reject-preset",
      onUnsupportedArrangement: "use-default-workspace",
      onUnsupportedSlot: "ignore-slot",
    },
    id,
    intent: {
      arrangement,
      description:
        "Style Lab-only layout boundary intent; production layout remains blocked.",
      pageShell,
    },
    kind: NEXUS_WORKSPACE_LAYOUT_PRESET_KIND_V1,
    name,
    regions: {
      bottom,
      floating: ["floatingWindows", "commandPalette"],
      left,
      main,
      right,
      top,
    },
    schemaVersion: NEXUS_WORKSPACE_LAYOUT_PRESET_SCHEMA_VERSION_V1,
  };
}

function createSlotDefinition(
  id: NexusWorkspaceLayoutSlotIdV1,
  label: string,
  owner: NexusWorkspaceLayoutSlotDefinitionV1["owner"],
): NexusWorkspaceLayoutSlotDefinitionV1 {
  return {
    acceptsVisualTokensOnly: true,
    id,
    label,
    owner,
    productionBehaviorProtected: true,
  };
}

function createLayoutPresetSummary(
  preset: NexusWorkspaceLayoutPresetV1,
): NexusWorkspaceLayoutPresetSummaryV1 {
  const regions = NEXUS_WORKSPACE_LAYOUT_REGION_IDS_V1.map((regionId) => ({
    regionId,
    slots: [...preset.regions[regionId]],
  }));

  return {
    arrangement: preset.intent.arrangement,
    name: preset.name,
    pageShell: preset.intent.pageShell,
    presetId: preset.id,
    protectedBoundary: "production-layout-blocked",
    regionCount: regions.length,
    regions,
    slotCount: regions.reduce((count, region) => count + region.slots.length, 0),
  };
}

function validateTopLevelShape(
  candidate: Record<string, unknown>,
  issues: NexusWorkspaceLayoutBoundaryIssueV1[],
) {
  for (const field of requiredLayoutPresetFields) {
    if (!(field in candidate)) {
      issues.push(
        createIssue(
          "workspaceLayout.missingField",
          `$.${field}`,
          "Required layout preset field is missing.",
        ),
      );
    }
  }

  for (const key of Object.keys(candidate).sort()) {
    if (!layoutPresetTopLevelKeys.has(key)) {
      issues.push(
        createIssue(
          "workspaceLayout.unknownTopLevelField",
          `$.${key}`,
          "Unknown top-level fields are not allowed.",
        ),
      );
    }
  }
}

function validateIdentity(
  candidate: Record<string, unknown>,
  issues: NexusWorkspaceLayoutBoundaryIssueV1[],
) {
  if (candidate.kind !== NEXUS_WORKSPACE_LAYOUT_PRESET_KIND_V1) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidKind",
        "$.kind",
        "Layout preset kind is invalid.",
      ),
    );
  }

  if (candidate.schemaVersion !== NEXUS_WORKSPACE_LAYOUT_PRESET_SCHEMA_VERSION_V1) {
    issues.push(
      createIssue(
        "workspaceLayout.unsupportedSchemaVersion",
        "$.schemaVersion",
        "Layout preset schemaVersion must be 1.",
      ),
    );
  }

  if (typeof candidate.id !== "string" || !slugPattern.test(candidate.id)) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.id",
        "Layout preset id must be a lowercase slug.",
      ),
    );
  }

  if (typeof candidate.name !== "string" || !withinLength(candidate.name, 1, 96)) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.name",
        "Layout preset name is required.",
      ),
    );
  }
}

function validateIntent(
  value: unknown,
  issues: NexusWorkspaceLayoutBoundaryIssueV1[],
) {
  if (!isRecord(value)) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.intent",
        "Layout intent must be an object.",
      ),
    );
    return;
  }

  if (!pageShellIdSet.has(String(value.pageShell))) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.intent.pageShell",
        "Layout page shell is invalid.",
      ),
    );
  }

  if (!arrangementIdSet.has(String(value.arrangement))) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.intent.arrangement",
        "Layout arrangement is invalid.",
      ),
    );
  }
}

function validateRegions(
  value: unknown,
  issues: NexusWorkspaceLayoutBoundaryIssueV1[],
) {
  if (!isRecord(value)) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.regions",
        "Layout regions must be an object.",
      ),
    );
    return;
  }

  for (const regionId of NEXUS_WORKSPACE_LAYOUT_REGION_IDS_V1) {
    if (!(regionId in value)) {
      issues.push(
        createIssue(
          "workspaceLayout.missingField",
          `$.regions.${regionId}`,
          "Layout region is required.",
        ),
      );
    }
  }

  for (const regionId of Object.keys(value).sort()) {
    if (!regionIdSet.has(regionId)) {
      issues.push(
        createIssue(
          "workspaceLayout.unknownRegion",
          `$.regions.${regionId}`,
          "Unknown layout region is not allowed.",
        ),
      );
      continue;
    }

    validateRegionSlots(
      value[regionId],
      `$.regions.${regionId}`,
      issues,
    );
  }

  validateDuplicateSlots(value, issues);
}

function validateRegionSlots(
  value: unknown,
  path: string,
  issues: NexusWorkspaceLayoutBoundaryIssueV1[],
) {
  if (!Array.isArray(value)) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        path,
        "Layout region slots must be an array.",
      ),
    );
    return;
  }

  value.forEach((slotId, index) => {
    if (typeof slotId !== "string" || !slotIdSet.has(slotId)) {
      issues.push(
        createIssue(
          "workspaceLayout.unknownSlot",
          `${path}[${index}]`,
          "Unknown layout slot is not allowed.",
        ),
      );
    }
  });
}

function validateDuplicateSlots(
  regions: Record<string, unknown>,
  issues: NexusWorkspaceLayoutBoundaryIssueV1[],
) {
  const seen = new Map<string, string>();

  for (const regionId of NEXUS_WORKSPACE_LAYOUT_REGION_IDS_V1) {
    const slots = regions[regionId];

    if (!Array.isArray(slots)) {
      continue;
    }

    slots.forEach((slotId, index) => {
      if (typeof slotId !== "string" || !slotIdSet.has(slotId)) {
        return;
      }

      const path = `$.regions.${regionId}[${index}]`;
      const previous = seen.get(slotId);

      if (previous) {
        issues.push(
          createIssue(
            "workspaceLayout.duplicateSlot",
            path,
            "Layout slots may only appear in one region.",
          ),
        );
      } else {
        seen.set(slotId, path);
      }
    });
  }
}

function validateCompatibility(
  value: unknown,
  issues: NexusWorkspaceLayoutBoundaryIssueV1[],
) {
  if (!isRecord(value)) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.compatibility",
        "Layout compatibility must be an object.",
      ),
    );
    return;
  }

  if (value.contract !== NEXUS_WORKSPACE_LAYOUT_BOUNDARY_CONTRACT_VERSION_V1) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.compatibility.contract",
        "Layout compatibility contract is invalid.",
      ),
    );
  }

  if (!["compatible", "compatible_with_warnings"].includes(String(value.result))) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.compatibility.result",
        "Layout compatibility result is invalid.",
      ),
    );
  }
}

function validateFallback(
  value: unknown,
  issues: NexusWorkspaceLayoutBoundaryIssueV1[],
) {
  if (!isRecord(value)) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.fallback",
        "Layout fallback must be an object.",
      ),
    );
    return;
  }

  if (typeof value.fallbackPresetId !== "string" || !slugPattern.test(value.fallbackPresetId)) {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.fallback.fallbackPresetId",
        "Layout fallback preset id must be a lowercase slug.",
      ),
    );
  }

  if (value.onUnsupportedSlot !== "ignore-slot") {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.fallback.onUnsupportedSlot",
        "Unsupported layout slots must be ignored.",
      ),
    );
  }

  if (value.onUnsupportedArrangement !== "use-default-workspace") {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.fallback.onUnsupportedArrangement",
        "Unsupported layout arrangements must fall back to default workspace.",
      ),
    );
  }

  if (value.onProtectedField !== "reject-preset") {
    issues.push(
      createIssue(
        "workspaceLayout.invalidField",
        "$.fallback.onProtectedField",
        "Protected layout fields must reject the preset.",
      ),
    );
  }
}

function validateArrangementIntent(
  preset: NexusWorkspaceLayoutPresetV1,
): NexusWorkspaceLayoutBoundaryIssueV1[] {
  const issues: NexusWorkspaceLayoutBoundaryIssueV1[] = [];
  const { arrangement, pageShell } = preset.intent;

  if (pageShell === "workspace" && !preset.regions.main.includes("mainCanvas")) {
    issues.push(
      createIssue(
        "workspaceLayout.arrangementMismatch",
        "$.regions.main",
        "Workspace page shell must include the mainCanvas slot in the main region.",
      ),
    );
  }

  if (pageShell !== "workspace" && !preset.regions.main.includes(pageShell)) {
    issues.push(
      createIssue(
        "workspaceLayout.arrangementMismatch",
        "$.regions.main",
        "Page shell intent must place the matching page slot in the main region.",
      ),
    );
  }

  if (
    arrangement === "left-right-swapped" &&
    (!preset.regions.left.includes("rightInspector") ||
      !preset.regions.right.includes("leftSidebar"))
  ) {
    issues.push(
      createIssue(
        "workspaceLayout.arrangementMismatch",
        "$.regions",
        "Left/right swapped intent must place rightInspector on the left and leftSidebar on the right.",
      ),
    );
  }

  if (
    arrangement === "top-bottom-swapped" &&
    (!preset.regions.top.includes("bottomBar") ||
      !preset.regions.bottom.includes("topBar"))
  ) {
    issues.push(
      createIssue(
        "workspaceLayout.arrangementMismatch",
        "$.regions",
        "Top/bottom swapped intent must place bottomBar on top and topBar on bottom.",
      ),
    );
  }

  return issues;
}

function scanProtectedLayoutInput(
  value: unknown,
  path: string,
  issues: NexusWorkspaceLayoutBoundaryIssueV1[],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanProtectedLayoutInput(item, `${path}[${index}]`, issues),
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nextValue] of Object.entries(value).sort()) {
    const nextPath = `${path}.${key}`;

    if (isProtectedLayoutKey(key)) {
      issues.push(
        createIssue(
          "workspaceLayout.protectedField",
          nextPath,
          "Layout preset contains protected behavior, geometry, routing, import, state, or persistence authority.",
        ),
      );
    }

    scanProtectedLayoutInput(nextValue, nextPath, issues);
  }
}

function scanForbiddenLayoutStrings(
  value: unknown,
  path: string,
  issues: NexusWorkspaceLayoutBoundaryIssueV1[],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanForbiddenLayoutStrings(item, `${path}[${index}]`, issues),
    );
    return;
  }

  if (isRecord(value)) {
    for (const [key, nextValue] of Object.entries(value).sort()) {
      scanForbiddenLayoutStrings(nextValue, `${path}.${key}`, issues);
    }
    return;
  }

  if (typeof value !== "string") {
    return;
  }

  if (forbiddenStringPatterns.some((pattern) => pattern.test(value))) {
    issues.push(
      createIssue(
        "workspaceLayout.forbiddenString",
        path,
        "Layout preset contains a forbidden string value.",
      ),
    );
  }
}

function isProtectedLayoutKey(key: string) {
  const normalized = key.toLowerCase().replace(/[-_\s.]/g, "");

  return (
    exactProtectedLayoutKeys.includes(normalized) ||
    protectedLayoutKeyFragments.some((part) => normalized.includes(part))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withinLength(value: string, min: number, max: number) {
  return value.length >= min && value.length <= max;
}

function rejectLayoutPreset(
  issues: NexusWorkspaceLayoutBoundaryIssueV1[],
): NexusWorkspaceLayoutPresetReviewResultV1 {
  return {
    accepted: false,
    issues: sortIssues(issues),
  };
}

function createIssue(
  code: NexusWorkspaceLayoutBoundaryIssueCodeV1,
  path: string,
  message: string,
): NexusWorkspaceLayoutBoundaryIssueV1 {
  return { code, message, path };
}

function sortIssues(issues: NexusWorkspaceLayoutBoundaryIssueV1[]) {
  return [...issues].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);

    return pathOrder === 0 ? left.code.localeCompare(right.code) : pathOrder;
  });
}

const exactProtectedLayoutKeys = [
  "ariarole",
  "behaviorclass",
  "classname",
  "componentpath",
  "css",
  "dynamicimport",
  "height",
  "href",
  "importpath",
  "indexeddb",
  "javascript",
  "localstorage",
  "maxheight",
  "maxwidth",
  "minheight",
  "minwidth",
  "overflow",
  "pointerevents",
  "position",
  "rawcss",
  "reactflow",
  "route",
  "routemutation",
  "selector",
  "style",
  "supabase",
  "sync",
  "tabindex",
  "width",
  "zindex",
];

const protectedLayoutKeyFragments = [
  "backend",
  "bounds",
  "canvasbehavior",
  "drag",
  "focustrap",
  "graphbehavior",
  "mutation",
  "nodesdraggable",
  "onchange",
  "onclick",
  "onconnect",
  "onkey",
  "onnodedrag",
  "panon",
  "resize",
  "store",
  "workspaceState",
  "zoomon",
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
