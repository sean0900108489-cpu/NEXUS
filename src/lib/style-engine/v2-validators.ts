import {
  NEXUS_ASSET_PACK_KIND_V1,
  NEXUS_ASSET_PACK_SCHEMA_VERSION_V1,
  NEXUS_LAYOUT_PRESET_KIND_V1,
  NEXUS_LAYOUT_PRESET_SCHEMA_VERSION_V1,
  NEXUS_PERFORMANCE_BUDGET_KIND_V1,
  NEXUS_PERFORMANCE_BUDGET_SCHEMA_VERSION_V1,
  NEXUS_RECIPE_REGISTRY_KIND_V1,
  NEXUS_RECIPE_REGISTRY_SCHEMA_VERSION_V1,
  NEXUS_SKIN_PACK_KIND_V2,
  NEXUS_SKIN_PACK_SCHEMA_VERSION_V2,
  type NexusAssetMimeV1,
  type NexusAssetPackV1,
  type NexusAssetRoleV1,
  type NexusAssetTypeV1,
  type NexusLayoutPresetV1,
  type NexusPerformanceBudgetV1,
  type NexusRecipeGroupIdV1,
  type NexusRecipeRegistryV1,
  type NexusSkinPackV2,
  type NexusSkinPackV2ValidationResult,
  type NexusV2ValidationIssue,
  type NexusV2ValidationIssueCode,
  type NexusV2ValidationReport,
} from "./v2-contracts";
import { NEXUS_STYLE_TOKEN_GROUPS_V1 } from "./manifest";
import { validateNexusStyleManifestV1 } from "./validator";

type MutableReport = {
  errors: NexusV2ValidationIssue[];
  warnings: NexusV2ValidationIssue[];
  info: NexusV2ValidationIssue[];
  totals: NonNullable<NexusV2ValidationReport["totals"]>;
};

const slugPattern = /^[a-z0-9-]{3,96}$/;
const hashPattern = /^[a-f0-9]{64}$/;

const skinPackTopLevelKeys = new Set([
  "kind",
  "schemaVersion",
  "id",
  "slug",
  "packVersion",
  "metadata",
  "manifest",
  "tokens",
  "recipes",
  "assets",
  "layoutPreset",
  "performanceBudget",
  "compatibility",
  "fallback",
]);

const assetPackTopLevelKeys = new Set([
  "kind",
  "schemaVersion",
  "id",
  "slug",
  "version",
  "metadata",
  "assets",
  "fallback",
  "performanceBudget",
  "compatibility",
]);

const recipeRegistryTopLevelKeys = new Set([
  "kind",
  "schemaVersion",
  "id",
  "version",
  "groups",
  "compatibility",
]);

const layoutPresetTopLevelKeys = new Set([
  "kind",
  "schemaVersion",
  "id",
  "name",
  "density",
  "slotOrdering",
  "surfaceTreatment",
  "visibility",
  "workspaceDecoration",
  "compatibility",
  "fallback",
]);

const performanceBudgetTopLevelKeys = new Set([
  "kind",
  "schemaVersion",
  "id",
  "staticManifest",
  "recipes",
  "assets",
  "visualEffects",
  "animation",
  "reactFlowEffects",
  "degradation",
]);

const requiredSkinPackFields = [
  "kind",
  "schemaVersion",
  "id",
  "slug",
  "packVersion",
  "metadata",
  "manifest",
  "tokens",
  "recipes",
  "performanceBudget",
  "compatibility",
  "fallback",
] as const;

const requiredAssetPackFields = [
  "kind",
  "schemaVersion",
  "id",
  "slug",
  "version",
  "metadata",
  "assets",
  "fallback",
  "performanceBudget",
  "compatibility",
] as const;

const requiredRecipeRegistryFields = [
  "kind",
  "schemaVersion",
  "id",
  "version",
  "groups",
  "compatibility",
] as const;

const requiredLayoutPresetFields = [
  "kind",
  "schemaVersion",
  "id",
  "name",
  "density",
  "slotOrdering",
  "surfaceTreatment",
  "visibility",
  "workspaceDecoration",
  "compatibility",
  "fallback",
] as const;

const requiredPerformanceBudgetFields = [
  "kind",
  "schemaVersion",
  "id",
  "staticManifest",
  "recipes",
  "visualEffects",
  "animation",
  "reactFlowEffects",
  "degradation",
] as const;

const assetTypes: NexusAssetTypeV1[] = [
  "texture",
  "icon",
  "avatar",
  "frame",
  "background",
  "font-reference",
];

const assetMimes: NexusAssetMimeV1[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "font/woff2",
  "application/font-reference+json",
];

const assetRolesByType: Record<NexusAssetTypeV1, NexusAssetRoleV1[]> = {
  avatar: ["agent", "profile", "system", "placeholder"],
  background: ["workspace", "panel", "hero-preview", "style-lab-specimen"],
  "font-reference": ["interface", "mono", "display", "accent"],
  frame: ["window-frame", "panel-frame", "card-frame", "avatar-frame"],
  icon: ["action", "status", "navigation", "tool", "decorative"],
  texture: [
    "panel-surface",
    "workspace-grid",
    "window-chrome",
    "modal-backdrop",
    "graph-background",
  ],
};

const recipeGroupIds: NexusRecipeGroupIdV1[] = [
  "panel",
  "button",
  "input",
  "window",
  "modal",
  "toolbar",
  "agent-card",
  "graph-node",
  "graph-edge",
];

const unsafeStringPatterns: Array<{
  code: NexusV2ValidationIssueCode;
  pattern: RegExp;
}> = [
  { code: "contract.forbiddenExecutable", pattern: /<script/i },
  { code: "contract.forbiddenExecutable", pattern: /javascript:/i },
  { code: "contract.forbiddenExecutable", pattern: /\bvbscript\s*:/i },
  { code: "contract.forbiddenExecutable", pattern: /\beval\s*\(/i },
  { code: "contract.forbiddenExecutable", pattern: /\bFunction\s*\(/ },
  { code: "contract.forbiddenExecutable", pattern: /\bimport\s*\(/ },
  { code: "contract.forbiddenCss", pattern: /@import/i },
  { code: "contract.forbiddenCss", pattern: /\bexpression\s*\(/i },
  { code: "contract.forbiddenCss", pattern: /[{}]/ },
  { code: "contract.forbiddenCss", pattern: /;\s*[-_a-z]+\s*:/i },
  { code: "contract.forbiddenCss", pattern: /\burl\s*\(/i },
  { code: "contract.forbiddenString", pattern: /\b(?:https?|ftp):\/\//i },
  { code: "contract.forbiddenString", pattern: /\b(?:blob|file|data):/i },
  { code: "contract.forbiddenPlatformReference", pattern: /\.env\b/i },
  { code: "contract.forbiddenPlatformReference", pattern: /process\.env/i },
  { code: "contract.forbiddenPlatformReference", pattern: /SUPABASE_SERVICE_ROLE_KEY/i },
  {
    code: "contract.forbiddenPlatformReference",
    pattern: /\b(?:service[-_\s]?role|supabase[-_\s]?service[-_\s]?role[-_\s]?key)\b/i,
  },
  { code: "contract.forbiddenPlatformReference", pattern: /workspace\.themeConfig/i },
  { code: "contract.forbiddenPlatformReference", pattern: /queueThemeConfigCloudSync/i },
  { code: "contract.forbiddenPlatformReference", pattern: /workspace_state_entities/i },
  { code: "contract.forbiddenPlatformReference", pattern: /\bsupabase\b/i },
  { code: "contract.forbiddenPlatformReference", pattern: /\/api\/v1/i },
];

const exactBehaviorFields = [
  "classname",
  "style",
  "zindex",
  "pointerevents",
  "position",
  "overflow",
  "tabindex",
  "aria",
  "role",
  "store",
  "sync",
  "backend",
  "route",
  "database",
  "deployment",
  "migration",
  "bounds",
];

const behaviorFieldFragments = [
  "onclick",
  "onchange",
  "onkeydown",
  "onmousedown",
  "onnodedrag",
  "onconnect",
  "onpaneclick",
  "drag",
  "resize",
  "focustrap",
  "panon",
  "zoomon",
  "nodesdraggable",
  "nodesconnectable",
  "edgesupdatable",
  "deletekeycode",
  "interactionwidth",
  "hitwidth",
  "nodeid",
  "edgeid",
  "handleid",
  "reactrnd",
];

export function validateNexusSkinPackV2(
  candidate: unknown,
): NexusSkinPackV2ValidationResult {
  const report = createMutableReport();

  if (!isRecord(candidate)) {
    addError(report, "$", "stylePack.invalidRoot", "Skin pack candidate must be an object.");
    return finalizeSkinPackReport(report);
  }

  validateTopLevelShape(
    candidate,
    "$",
    skinPackTopLevelKeys,
    requiredSkinPackFields,
    "stylePack.missingField",
    "stylePack.unknownTopLevelField",
    report,
  );
  validateSkinPackIdentity(candidate, report);
  validateSkinPackMetadata(candidate.metadata, report);
  validateManifestBinding(candidate.manifest, report);
  validateTokenBinding(candidate.tokens, report);
  validateRecipeBinding(candidate.recipes, report);
  validateAssetBinding(candidate.assets, report);
  validateLayoutBinding(candidate.layoutPreset, report);
  validateSkinPackPerformanceBudget(candidate.performanceBudget, report);
  validateSkinPackCompatibility(candidate.compatibility, report);
  validateSkinPackFallback(candidate.fallback, report);
  validateSkinPackStaticBudget(candidate, report);
  scanUnsafeStrings(candidate, "$", report);
  scanSkinPackBehaviorKeys(candidate, "$", report);

  return finalizeSkinPackReport(report, candidate);
}

export function validateNexusAssetPackV1(
  candidate: unknown,
): NexusV2ValidationReport {
  const report = createMutableReport();

  if (!isRecord(candidate)) {
    addError(report, "$", "assetPack.invalidRoot", "Asset pack candidate must be an object.");
    return finalizeReport(report);
  }

  validateTopLevelShape(
    candidate,
    "$",
    assetPackTopLevelKeys,
    requiredAssetPackFields,
    "assetPack.missingField",
    "assetPack.unknownTopLevelField",
    report,
  );
  validateAssetPackIdentity(candidate, report);
  validateAssetPackMetadata(candidate.metadata, report);
  validateAssetPackFallback(candidate.fallback, report);
  validateAssetPackBudget(candidate.performanceBudget, report);
  validateAssetPackCompatibility(candidate.compatibility, report);
  validateAssetDescriptors(candidate.assets, candidate.performanceBudget, report);
  scanUnsafeStrings(candidate, "$", report);

  return finalizeReport(report);
}

export function validateNexusRecipeRegistryV1(
  candidate: unknown,
): NexusV2ValidationReport {
  const report = createMutableReport();

  if (!isRecord(candidate)) {
    addError(report, "$", "recipeRegistry.invalidRoot", "Recipe registry candidate must be an object.");
    return finalizeReport(report);
  }

  validateTopLevelShape(
    candidate,
    "$",
    recipeRegistryTopLevelKeys,
    requiredRecipeRegistryFields,
    "recipeRegistry.missingField",
    "recipeRegistry.unknownTopLevelField",
    report,
  );
  validateRecipeRegistryIdentity(candidate, report);
  validateRecipeGroups(candidate.groups, report);
  scanUnsafeStrings(candidate, "$", report);

  return finalizeReport(report);
}

export function validateNexusLayoutPresetV1(
  candidate: unknown,
): NexusV2ValidationReport {
  const report = createMutableReport();

  if (!isRecord(candidate)) {
    addError(report, "$", "layoutPreset.invalidRoot", "Layout preset candidate must be an object.");
    return finalizeReport(report);
  }

  validateTopLevelShape(
    candidate,
    "$",
    layoutPresetTopLevelKeys,
    requiredLayoutPresetFields,
    "layoutPreset.missingField",
    "layoutPreset.unknownTopLevelField",
    report,
  );
  validateLayoutPresetIdentity(candidate, report);
  validateLayoutDensity(candidate.density, report);
  validateLayoutSurfaceTreatment(candidate.surfaceTreatment, report);
  validateLayoutCompatibility(candidate.compatibility, report);
  validateLayoutFallback(candidate.fallback, report);
  scanUnsafeStrings(candidate, "$", report);
  scanProtectedLayoutKeys(candidate, "$", report);

  return finalizeReport(report);
}

export function validateNexusPerformanceBudgetV1(
  candidate: unknown,
): NexusV2ValidationReport {
  const report = createMutableReport();

  if (!isRecord(candidate)) {
    addError(
      report,
      "$",
      "performanceBudget.invalidRoot",
      "Performance budget candidate must be an object.",
    );
    return finalizeReport(report);
  }

  validateTopLevelShape(
    candidate,
    "$",
    performanceBudgetTopLevelKeys,
    requiredPerformanceBudgetFields,
    "performanceBudget.missingField",
    "performanceBudget.unknownTopLevelField",
    report,
  );
  validatePerformanceBudgetIdentity(candidate, report);
  validatePositiveNumberRecord(candidate.staticManifest, "$.staticManifest", report);
  validatePositiveNumberRecord(candidate.recipes, "$.recipes", report);
  if (candidate.assets !== undefined) {
    validatePositiveNumberRecord(candidate.assets, "$.assets", report);
  }
  validateVisualEffectsBudget(candidate.visualEffects, report);
  validateAnimationBudget(candidate.animation, report);
  validateReactFlowEffectsBudget(candidate.reactFlowEffects, report);
  validateDegradationPolicy(candidate.degradation, report);
  scanUnsafeStrings(candidate, "$", report);

  return finalizeReport(report);
}

function validateSkinPackIdentity(
  candidate: Record<string, unknown>,
  report: MutableReport,
) {
  if (candidate.kind !== NEXUS_SKIN_PACK_KIND_V2) {
    addError(report, "$.kind", "stylePack.invalidKind", "Skin pack kind is invalid.");
  }

  if (candidate.schemaVersion !== NEXUS_SKIN_PACK_SCHEMA_VERSION_V2) {
    addError(
      report,
      "$.schemaVersion",
      "stylePack.unsupportedSchemaVersion",
      "Skin pack schemaVersion must be 2.",
    );
  }

  for (const key of ["id", "slug"] as const) {
    if (typeof candidate[key] !== "string" || !slugPattern.test(candidate[key])) {
      addError(report, `$.${key}`, "stylePack.invalidId", "Skin pack id fields must be lowercase slugs.");
    }
  }

  if (typeof candidate.packVersion !== "string" || !withinLength(candidate.packVersion, 1, 40)) {
    addError(
      report,
      "$.packVersion",
      "stylePack.invalidId",
      "Skin pack version must be display-safe text.",
    );
  }
}

function validateSkinPackMetadata(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.metadata", "stylePack.invalidMetadata", "Skin pack metadata must be an object.");
    return;
  }

  if (typeof value.displayName !== "string" || !withinLength(value.displayName, 1, 80)) {
    addError(
      report,
      "$.metadata.displayName",
      "stylePack.invalidMetadata",
      "Skin pack displayName is required.",
    );
  }

  if (
    ![
      "built-in",
      "human-authored",
      "imported",
      "ai-draft",
      "legacy-bridge",
    ].includes(String(value.source))
  ) {
    addError(
      report,
      "$.metadata.source",
      "stylePack.invalidMetadata",
      "Skin pack metadata source is invalid.",
    );
  }

  if (
    ![
      "draft",
      "validated",
      "warning",
      "deprecated",
      "retired",
      "quarantined",
      "rejected",
    ].includes(String(value.lifecycle))
  ) {
    addError(
      report,
      "$.metadata.lifecycle",
      "stylePack.invalidMetadata",
      "Skin pack lifecycle is invalid.",
    );
  }
}

function validateManifestBinding(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(
      report,
      "$.manifest",
      "stylePack.invalidManifestBinding",
      "Skin pack manifest binding must be an object.",
    );
    return;
  }

  if (value.manifestVersion !== 1) {
    addError(
      report,
      "$.manifest.manifestVersion",
      "stylePack.invalidManifestBinding",
      "Skin pack manifest binding must target V1 manifests.",
    );
  }

  if (typeof value.manifestId !== "string" || !slugPattern.test(value.manifestId)) {
    addError(
      report,
      "$.manifest.manifestId",
      "stylePack.invalidManifestBinding",
      "Manifest id must be a lowercase slug.",
    );
  }

  const manifestReport = validateNexusStyleManifestV1(value.payload);

  if (!manifestReport.accepted) {
    addError(
      report,
      "$.manifest.payload",
      "stylePack.invalidManifestPayload",
      "Embedded V1 manifest failed validation.",
    );
  }
}

function validateTokenBinding(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(
      report,
      "$.tokens",
      "stylePack.invalidTokenBinding",
      "Skin pack token binding must be an object.",
    );
    return;
  }

  if (value.source !== "manifest") {
    addError(
      report,
      "$.tokens.source",
      "stylePack.invalidTokenBinding",
      "Skin pack tokens must be sourced from the manifest.",
    );
  }

  if (!Array.isArray(value.manifestTokenGroups)) {
    addError(
      report,
      "$.tokens.manifestTokenGroups",
      "stylePack.invalidTokenBinding",
      "manifestTokenGroups must be an array.",
    );
    return;
  }

  value.manifestTokenGroups.forEach((group, index) => {
    if (
      typeof group !== "string" ||
      !NEXUS_STYLE_TOKEN_GROUPS_V1.includes(group as never)
    ) {
      addError(
        report,
        `$.tokens.manifestTokenGroups[${index}]`,
        "stylePack.invalidTokenBinding",
        "Unknown manifest token group.",
      );
    }
  });
}

function validateRecipeBinding(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(
      report,
      "$.recipes",
      "stylePack.invalidRecipeBinding",
      "Skin pack recipe binding must be an object.",
    );
    return;
  }

  if (value.source !== "manifest") {
    addError(
      report,
      "$.recipes.source",
      "stylePack.invalidRecipeBinding",
      "Skin pack recipes must be sourced from the manifest.",
    );
  }

  if (value.registryVersion !== "recipe-registry-v1") {
    addError(
      report,
      "$.recipes.registryVersion",
      "stylePack.invalidRecipeBinding",
      "Skin pack recipe registry version is unsupported.",
    );
  }

  if (!Array.isArray(value.groups)) {
    addError(
      report,
      "$.recipes.groups",
      "stylePack.invalidRecipeBinding",
      "Skin pack recipe groups must be an array.",
    );
  } else {
    value.groups.forEach((group, index) => {
      if (typeof group !== "string" || !recipeGroupIds.includes(group as never)) {
        addError(
          report,
          `$.recipes.groups[${index}]`,
          "stylePack.invalidRecipeBinding",
          "Unknown recipe group.",
        );
      }
    });
  }
}

function validateAssetBinding(value: unknown, report: MutableReport) {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    addError(
      report,
      "$.assets",
      "stylePack.invalidAssetBinding",
      "Skin pack asset binding must be an object.",
    );
    return;
  }

  if (value.assetPackContract !== "asset-pack-v1") {
    addError(
      report,
      "$.assets.assetPackContract",
      "stylePack.invalidAssetBinding",
      "Skin pack assets must reference Asset Pack V1.",
    );
  }

  if (typeof value.assetPackId !== "string" || !slugPattern.test(value.assetPackId)) {
    addError(
      report,
      "$.assets.assetPackId",
      "stylePack.invalidAssetBinding",
      "Asset pack id must be a lowercase slug.",
    );
  }

  for (const key of ["requiredAssetIds", "lazyAssetIds", "optionalAssetIds"] as const) {
    if (value[key] === undefined) {
      continue;
    }

    validateSlugArray(value[key], `$.assets.${key}`, "stylePack.invalidAssetBinding", report);
  }
}

function validateLayoutBinding(value: unknown, report: MutableReport) {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    addError(
      report,
      "$.layoutPreset",
      "stylePack.invalidLayoutBinding",
      "Skin pack layout binding must be an object.",
    );
    return;
  }

  if (value.contract !== "layout-preset-boundary-v1") {
    addError(
      report,
      "$.layoutPreset.contract",
      "stylePack.invalidLayoutBinding",
      "Skin pack layout binding must reference the layout preset boundary.",
    );
  }

  if (typeof value.presetId !== "string" || !slugPattern.test(value.presetId)) {
    addError(
      report,
      "$.layoutPreset.presetId",
      "stylePack.invalidLayoutBinding",
      "Layout preset id must be a lowercase slug.",
    );
  }
}

function validateSkinPackPerformanceBudget(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(
      report,
      "$.performanceBudget",
      "stylePack.invalidPerformanceBudget",
      "Skin pack performance budget must be an object.",
    );
    return;
  }

  if (value.contract !== "performance-budget-validator-v1") {
    addError(
      report,
      "$.performanceBudget.contract",
      "stylePack.invalidPerformanceBudget",
      "Skin pack performance budget contract is unsupported.",
    );
  }

  for (const key of [
    "maxCssVariableCount",
    "maxStaticManifestBytes",
    "maxRecipeGroups",
    "maxAdapterOutputs",
  ]) {
    if (!isPositiveFiniteNumber(value[key])) {
      addError(
        report,
        `$.performanceBudget.${key}`,
        "stylePack.invalidPerformanceBudget",
        "Skin pack performance budget values must be positive finite numbers.",
      );
    }
  }
}

function validateSkinPackCompatibility(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(
      report,
      "$.compatibility",
      "stylePack.invalidCompatibility",
      "Skin pack compatibility must be an object.",
    );
    return;
  }

  if (value.manifestVersion !== 1) {
    addError(
      report,
      "$.compatibility.manifestVersion",
      "stylePack.invalidCompatibility",
      "Skin pack compatibility must target manifest V1.",
    );
  }

  if (value.recipeRegistryVersion !== "recipe-registry-v1") {
    addError(
      report,
      "$.compatibility.recipeRegistryVersion",
      "stylePack.invalidCompatibility",
      "Skin pack recipe registry compatibility is unsupported.",
    );
  }
}

function validateSkinPackFallback(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(
      report,
      "$.fallback",
      "stylePack.invalidFallback",
      "Skin pack fallback must be an object.",
    );
    return;
  }

  for (const key of ["fallbackPackId", "fallbackManifestId"] as const) {
    if (typeof value[key] !== "string" || !slugPattern.test(value[key])) {
      addError(
        report,
        `$.fallback.${key}`,
        "stylePack.invalidFallback",
        "Fallback ids must be lowercase slugs.",
      );
    }
  }

  if (!["cyberpunk", "apple", "tesla", "terminal"].includes(String(value.fallbackLegacyPreset))) {
    addError(
      report,
      "$.fallback.fallbackLegacyPreset",
      "stylePack.invalidFallback",
      "Fallback legacy preset is invalid.",
    );
  }
}

function validateSkinPackStaticBudget(
  candidate: Record<string, unknown>,
  report: MutableReport,
) {
  if (!isRecord(candidate.performanceBudget)) {
    return;
  }

  const manifest = isRecord(candidate.manifest) ? candidate.manifest.payload : undefined;
  const budget = candidate.performanceBudget;
  const cssVariableCount = isRecord(manifest)
    ? estimateCssVariableCount(manifest)
    : 0;
  const normalizedManifestBytes = stableJson(manifest).length;
  const packMetadataBytes = stableJson(candidate.metadata).length;
  const recipeGroups = isRecord(manifest) && isRecord(manifest.recipes)
    ? Object.keys(manifest.recipes).length
    : 0;
  const adapterOutputs = isRecord(manifest) && isRecord(manifest.adapters)
    ? countLeafValues(manifest.adapters)
    : 0;

  report.totals.cssVariableCount = cssVariableCount;
  report.totals.normalizedManifestBytes = normalizedManifestBytes;
  report.totals.packMetadataBytes = packMetadataBytes;
  report.totals.recipeGroups = recipeGroups;
  report.totals.adapterOutputs = adapterOutputs;

  compareBudget(
    cssVariableCount,
    budget.maxCssVariableCount,
    "$.performanceBudget.maxCssVariableCount",
    "CSS variable estimate exceeds the skin pack budget.",
    report,
  );
  compareBudget(
    normalizedManifestBytes,
    budget.maxStaticManifestBytes,
    "$.performanceBudget.maxStaticManifestBytes",
    "Normalized manifest size exceeds the skin pack budget.",
    report,
  );
  compareBudget(
    recipeGroups,
    budget.maxRecipeGroups,
    "$.performanceBudget.maxRecipeGroups",
    "Recipe group count exceeds the skin pack budget.",
    report,
  );
  compareBudget(
    adapterOutputs,
    budget.maxAdapterOutputs,
    "$.performanceBudget.maxAdapterOutputs",
    "Adapter output count exceeds the skin pack budget.",
    report,
  );
}

function validateAssetPackIdentity(
  candidate: Record<string, unknown>,
  report: MutableReport,
) {
  if (candidate.kind !== NEXUS_ASSET_PACK_KIND_V1) {
    addError(report, "$.kind", "assetPack.invalidKind", "Asset pack kind is invalid.");
  }

  if (candidate.schemaVersion !== NEXUS_ASSET_PACK_SCHEMA_VERSION_V1) {
    addError(
      report,
      "$.schemaVersion",
      "assetPack.unsupportedSchemaVersion",
      "Asset pack schemaVersion must be 1.",
    );
  }

  for (const key of ["id", "slug"] as const) {
    if (typeof candidate[key] !== "string" || !slugPattern.test(candidate[key])) {
      addError(report, `$.${key}`, "assetPack.invalidId", "Asset pack id fields must be lowercase slugs.");
    }
  }
}

function validateAssetPackMetadata(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.metadata", "assetPack.invalidMetadata", "Asset pack metadata must be an object.");
    return;
  }

  if (typeof value.displayName !== "string" || !withinLength(value.displayName, 1, 80)) {
    addError(
      report,
      "$.metadata.displayName",
      "assetPack.invalidMetadata",
      "Asset pack displayName is required.",
    );
  }
}

function validateAssetPackFallback(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.fallback", "assetPack.missingField", "Asset pack fallback is required.");
  }
}

function validateAssetPackBudget(value: unknown, report: MutableReport) {
  validatePositiveNumberRecord(value, "$.performanceBudget", report, "assetPack.missingField");
}

function validateAssetPackCompatibility(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.compatibility", "assetPack.missingField", "Asset pack compatibility is required.");
  }
}

function validateAssetDescriptors(
  value: unknown,
  budgetCandidate: unknown,
  report: MutableReport,
) {
  if (!Array.isArray(value)) {
    addError(
      report,
      "$.assets",
      "assetPack.invalidAssetDescriptor",
      "Asset pack assets must be an array.",
    );
    return;
  }

  const ids = new Set<string>();
  let criticalAssets = 0;
  let criticalBytes = 0;
  let totalBytes = 0;
  let fontReferences = 0;

  value.forEach((asset, index) => {
    const path = `$.assets[${index}]`;

    if (!isRecord(asset)) {
      addError(report, path, "assetPack.invalidAssetDescriptor", "Asset descriptor must be an object.");
      return;
    }

    validateAssetDescriptor(asset, path, budgetCandidate, report);

    if (typeof asset.id === "string") {
      if (ids.has(asset.id)) {
        addError(report, `${path}.id`, "assetPack.duplicateAssetId", "Asset ids must be unique.");
      }
      ids.add(asset.id);
    }

    if (asset.loading === "critical") {
      criticalAssets += 1;
      criticalBytes += typeof asset.byteSize === "number" ? asset.byteSize : 0;
    }

    if (asset.type === "font-reference") {
      fontReferences += 1;
    }

    totalBytes += typeof asset.byteSize === "number" ? asset.byteSize : 0;
  });

  report.totals.totalAssets = value.length;
  report.totals.criticalAssets = criticalAssets;
  report.totals.criticalBytes = criticalBytes;
  report.totals.totalBytes = totalBytes;

  if (!isRecord(budgetCandidate)) {
    return;
  }

  compareAssetBudget(value.length, budgetCandidate.maxTotalAssets, "$.performanceBudget.maxTotalAssets", "assetPack.assetCountExceeded", report);
  compareAssetBudget(criticalAssets, budgetCandidate.maxCriticalAssets, "$.performanceBudget.maxCriticalAssets", "assetPack.assetCountExceeded", report);
  compareAssetBudget(criticalBytes, budgetCandidate.maxCriticalBytes, "$.performanceBudget.maxCriticalBytes", "assetPack.criticalBytesExceeded", report);
  compareAssetBudget(totalBytes, budgetCandidate.maxTotalBytes, "$.performanceBudget.maxTotalBytes", "assetPack.totalBytesExceeded", report);
  compareAssetBudget(fontReferences, budgetCandidate.maxFontReferences, "$.performanceBudget.maxFontReferences", "assetPack.assetCountExceeded", report);
}

function validateAssetDescriptor(
  asset: Record<string, unknown>,
  path: string,
  budgetCandidate: unknown,
  report: MutableReport,
) {
  if (typeof asset.id !== "string" || !slugPattern.test(asset.id)) {
    addError(report, `${path}.id`, "assetPack.invalidId", "Asset id must be a lowercase slug.");
  }

  if (typeof asset.type !== "string" || !assetTypes.includes(asset.type as never)) {
    addError(
      report,
      `${path}.type`,
      "assetPack.unsupportedAssetType",
      "Asset type is unsupported.",
    );
  }

  if (typeof asset.mime !== "string" || !assetMimes.includes(asset.mime as never)) {
    addError(
      report,
      `${path}.mime`,
      "assetPack.unsupportedMime",
      "Asset MIME type is unsupported.",
    );
  }

  if (!isPositiveFiniteNumber(asset.byteSize)) {
    addError(
      report,
      `${path}.byteSize`,
      "assetPack.missingAssetSize",
      "Asset byteSize is required.",
    );
  }

  if (!isRecord(asset.hash) || asset.hash.algorithm !== "sha256" || typeof asset.hash.value !== "string" || !hashPattern.test(asset.hash.value)) {
    addError(
      report,
      `${path}.hash`,
      "assetPack.missingAssetHash",
      "Asset hash must be a sha256 hex digest.",
    );
  }

  if (typeof asset.loading !== "string" || !["critical", "lazy", "optional"].includes(asset.loading)) {
    addError(
      report,
      `${path}.loading`,
      "assetPack.invalidAssetDescriptor",
      "Asset loading classification is invalid.",
    );
  }

  if (
    typeof asset.type === "string" &&
    assetTypes.includes(asset.type as never) &&
    (typeof asset.role !== "string" ||
      !assetRolesByType[asset.type as NexusAssetTypeV1].includes(asset.role as never))
  ) {
    addError(
      report,
      `${path}.role`,
      "assetPack.unsupportedAssetRole",
      "Asset role is unsupported for its type.",
    );
  }

  if (asset.type !== "font-reference") {
    validateAssetDimensions(asset, path, budgetCandidate, report);
  }

  validateAssetSource(asset.source, path, report);
}

function validateAssetDimensions(
  asset: Record<string, unknown>,
  path: string,
  budgetCandidate: unknown,
  report: MutableReport,
) {
  const dimensions = asset.dimensions;

  if (!isRecord(dimensions)) {
    addError(
      report,
      `${path}.dimensions`,
      "assetPack.invalidAssetDescriptor",
      "Image assets must declare dimensions.",
    );
    return;
  }

  if (!isPositiveFiniteNumber(dimensions.width) || !isPositiveFiniteNumber(dimensions.height)) {
    addError(
      report,
      `${path}.dimensions`,
      "assetPack.invalidAssetDescriptor",
      "Image asset dimensions must be positive finite numbers.",
    );
  }

  if (!isRecord(budgetCandidate)) {
    return;
  }

  if (
    typeof dimensions.width === "number" &&
    isPositiveFiniteNumber(budgetCandidate.maxImageWidth) &&
    dimensions.width > budgetCandidate.maxImageWidth
  ) {
    addError(
      report,
      `${path}.dimensions.width`,
      "assetPack.imageDimensionsExceeded",
      "Asset width exceeds the static image budget.",
    );
  }

  if (
    typeof dimensions.height === "number" &&
    isPositiveFiniteNumber(budgetCandidate.maxImageHeight) &&
    dimensions.height > budgetCandidate.maxImageHeight
  ) {
    addError(
      report,
      `${path}.dimensions.height`,
      "assetPack.imageDimensionsExceeded",
      "Asset height exceeds the static image budget.",
    );
  }
}

function validateAssetSource(
  value: unknown,
  assetPath: string,
  report: MutableReport,
) {
  if (!isRecord(value)) {
    addError(
      report,
      `${assetPath}.source`,
      "assetPack.invalidAssetSource",
      "Asset source must be an object.",
    );
    return;
  }

  switch (value.kind) {
    case "builtin":
      validateSafeAssetPath(value.packagePath, `${assetPath}.source.packagePath`, report);
      return;
    case "packaged":
      validateSafeAssetPath(value.contentAddressedPath, `${assetPath}.source.contentAddressedPath`, report);
      return;
    case "font-family-reference":
      if (typeof value.familyName !== "string" || !withinLength(value.familyName, 1, 80)) {
        addError(
          report,
          `${assetPath}.source.familyName`,
          "assetPack.invalidAssetSource",
          "Font family source must be display-safe text.",
        );
      }
      return;
    case "generated-reference":
      addError(
        report,
        `${assetPath}.source`,
        "assetPack.protocol96Required",
        "Generated or recoverable asset references require Protocol 96 before implementation.",
      );
      return;
    default:
      addError(
        report,
        `${assetPath}.source.kind`,
        "assetPack.invalidAssetSource",
        "Asset source kind is unsupported.",
      );
  }
}

function validateSafeAssetPath(
  value: unknown,
  path: string,
  report: MutableReport,
) {
  if (typeof value !== "string" || value.length === 0) {
    addError(report, path, "assetPack.invalidAssetSource", "Asset path is required.");
    return;
  }

  if (
    /^(?:https?|ftp):\/\//i.test(value) ||
    /^(?:file|blob|data):/i.test(value) ||
    value.startsWith("/") ||
    value.includes("..") ||
    value.includes("?") ||
    value.includes("=") ||
    /Users\//i.test(value) ||
    /secret|token|service[-_]?role|signed/i.test(value)
  ) {
    addError(
      report,
      path,
      "assetPack.unsafeAssetReference",
      "Asset references must not contain remote URLs, local paths, secrets, or signed parameters.",
    );
  }
}

function validateRecipeRegistryIdentity(
  candidate: Record<string, unknown>,
  report: MutableReport,
) {
  if (candidate.kind !== NEXUS_RECIPE_REGISTRY_KIND_V1) {
    addError(report, "$.kind", "recipeRegistry.invalidKind", "Recipe registry kind is invalid.");
  }

  if (candidate.schemaVersion !== NEXUS_RECIPE_REGISTRY_SCHEMA_VERSION_V1) {
    addError(
      report,
      "$.schemaVersion",
      "recipeRegistry.unsupportedSchemaVersion",
      "Recipe registry schemaVersion must be 1.",
    );
  }
}

function validateRecipeGroups(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.groups", "recipeRegistry.invalidGroup", "Recipe registry groups must be an object.");
    return;
  }

  for (const [groupId, group] of Object.entries(value).sort()) {
    if (!recipeGroupIds.includes(groupId as never)) {
      addError(
        report,
        `$.groups.${groupId}`,
        "recipeRegistry.unknownGroup",
        "Recipe registry contains an unknown group.",
      );
      continue;
    }

    validateRecipeGroup(group, `$.groups.${groupId}`, groupId, report);
  }
}

function validateRecipeGroup(
  value: unknown,
  path: string,
  groupId: string,
  report: MutableReport,
) {
  if (!isRecord(value)) {
    addError(report, path, "recipeRegistry.invalidGroup", "Recipe group must be an object.");
    return;
  }

  if (value.groupId !== groupId) {
    addError(report, `${path}.groupId`, "recipeRegistry.invalidGroup", "Recipe group id must match its key.");
  }

  if (!Array.isArray(value.slots)) {
    addError(report, `${path}.slots`, "recipeRegistry.invalidGroup", "Recipe group slots must be an array.");
    return;
  }

  const slotIds = new Set<string>();

  value.slots.forEach((slot, index) => {
    const slotPath = `${path}.slots[${index}]`;

    if (!isRecord(slot)) {
      addError(report, slotPath, "recipeRegistry.invalidGroup", "Recipe slot must be an object.");
      return;
    }

    const slotId = slot.slotId;

    if (typeof slotId !== "string" || slotId.length === 0) {
      addError(report, `${slotPath}.slotId`, "recipeRegistry.invalidGroup", "Recipe slot id is required.");
    } else {
      if (slotIds.has(slotId)) {
        addError(report, `${slotPath}.slotId`, "recipeRegistry.duplicateSlot", "Recipe slot ids must be unique.");
      }
      slotIds.add(slotId);

      if (isBehaviorFieldName(slotId)) {
        addError(
          report,
          `${slotPath}.slotId`,
          "recipeRegistry.forbiddenSlot",
          "Recipe slot attempts to control behavior.",
        );
      }
    }

    if (slot.visualOnly !== true) {
      addError(
        report,
        `${slotPath}.visualOnly`,
        "recipeRegistry.nonVisualSlot",
        "Recipe slots must be visual-only.",
      );
    }
  });
}

function validateLayoutPresetIdentity(
  candidate: Record<string, unknown>,
  report: MutableReport,
) {
  if (candidate.kind !== NEXUS_LAYOUT_PRESET_KIND_V1) {
    addError(report, "$.kind", "layoutPreset.invalidKind", "Layout preset kind is invalid.");
  }

  if (candidate.schemaVersion !== NEXUS_LAYOUT_PRESET_SCHEMA_VERSION_V1) {
    addError(
      report,
      "$.schemaVersion",
      "layoutPreset.unsupportedSchemaVersion",
      "Layout preset schemaVersion must be 1.",
    );
  }

  if (typeof candidate.id !== "string" || !slugPattern.test(candidate.id)) {
    addError(report, "$.id", "layoutPreset.invalidField", "Layout preset id must be a lowercase slug.");
  }

  if (typeof candidate.name !== "string" || !withinLength(candidate.name, 1, 80)) {
    addError(report, "$.name", "layoutPreset.invalidField", "Layout preset name is required.");
  }
}

function validateLayoutDensity(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.density", "layoutPreset.invalidField", "Layout density must be an object.");
    return;
  }

  if (!["compact", "comfortable", "spacious"].includes(String(value.mode))) {
    addError(report, "$.density.mode", "layoutPreset.invalidField", "Layout density mode is invalid.");
  }
}

function validateLayoutSurfaceTreatment(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(
      report,
      "$.surfaceTreatment",
      "layoutPreset.invalidField",
      "Surface treatment must be an object.",
    );
    return;
  }

  const surfaceModes = ["flat", "outlined", "raised", "glass"];

  for (const key of ["panel", "window", "modal"] as const) {
    if (!surfaceModes.includes(String(value[key]))) {
      addError(
        report,
        `$.surfaceTreatment.${key}`,
        "layoutPreset.invalidField",
        "Surface treatment value is invalid.",
      );
    }
  }

  if (!["flat", "grid", "subtle-texture"].includes(String(value.graph))) {
    addError(
      report,
      "$.surfaceTreatment.graph",
      "layoutPreset.invalidField",
      "Graph surface treatment value is invalid.",
    );
  }
}

function validateLayoutCompatibility(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.compatibility", "layoutPreset.invalidField", "Layout compatibility is required.");
  }
}

function validateLayoutFallback(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.fallback", "layoutPreset.invalidField", "Layout fallback is required.");
  }
}

function validatePerformanceBudgetIdentity(
  candidate: Record<string, unknown>,
  report: MutableReport,
) {
  if (candidate.kind !== NEXUS_PERFORMANCE_BUDGET_KIND_V1) {
    addError(report, "$.kind", "performanceBudget.invalidKind", "Performance budget kind is invalid.");
  }

  if (candidate.schemaVersion !== NEXUS_PERFORMANCE_BUDGET_SCHEMA_VERSION_V1) {
    addError(
      report,
      "$.schemaVersion",
      "performanceBudget.unsupportedSchemaVersion",
      "Performance budget schemaVersion must be 1.",
    );
  }
}

function validateVisualEffectsBudget(value: unknown, report: MutableReport) {
  validatePositiveNumberRecord(value, "$.visualEffects", report);

  if (isRecord(value) && value.allowFullViewportHeavyBlur !== false) {
    addError(
      report,
      "$.visualEffects.allowFullViewportHeavyBlur",
      "performanceBudget.invalidField",
      "Full viewport heavy blur must remain disabled.",
    );
  }
}

function validateAnimationBudget(value: unknown, report: MutableReport) {
  validatePositiveNumberRecord(value, "$.animation", report);

  if (isRecord(value)) {
    for (const key of ["allowLayoutAnimation", "allowInfiniteCriticalAnimation"] as const) {
      if (value[key] !== false) {
        addError(
          report,
          `$.animation.${key}`,
          "performanceBudget.invalidField",
          "Unsafe animation flags must remain disabled.",
        );
      }
    }
  }
}

function validateReactFlowEffectsBudget(value: unknown, report: MutableReport) {
  validatePositiveNumberRecord(value, "$.reactFlowEffects", report);

  if (isRecord(value)) {
    for (const key of ["allowBehaviorMutation", "allowInteractionWidthMutation"] as const) {
      if (value[key] !== false) {
        addError(
          report,
          `$.reactFlowEffects.${key}`,
          "performanceBudget.invalidField",
          "React Flow behavior mutation flags must remain disabled.",
        );
      }
    }
  }
}

function validateDegradationPolicy(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(
      report,
      "$.degradation",
      "performanceBudget.invalidField",
      "Performance degradation policy is required.",
    );
  }
}

function validateTopLevelShape(
  candidate: Record<string, unknown>,
  path: string,
  allowedKeys: Set<string>,
  requiredKeys: readonly string[],
  missingCode: NexusV2ValidationIssueCode,
  unknownCode: NexusV2ValidationIssueCode,
  report: MutableReport,
) {
  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      addError(report, `${path}.${key}`, missingCode, "Required field is missing.");
    }
  }

  for (const key of Object.keys(candidate).sort()) {
    if (!allowedKeys.has(key)) {
      addError(report, `${path}.${key}`, unknownCode, "Unknown top-level fields are not allowed.");
    }
  }
}

function validateSlugArray(
  value: unknown,
  path: string,
  code: NexusV2ValidationIssueCode,
  report: MutableReport,
) {
  if (!Array.isArray(value)) {
    addError(report, path, code, "Expected an array of lowercase ids.");
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== "string" || !slugPattern.test(item)) {
      addError(report, `${path}[${index}]`, code, "Expected a lowercase id.");
    }
  });
}

function validatePositiveNumberRecord(
  value: unknown,
  path: string,
  report: MutableReport,
  missingCode: NexusV2ValidationIssueCode = "performanceBudget.invalidField",
) {
  if (!isRecord(value)) {
    addError(report, path, missingCode, "Expected a budget object.");
    return;
  }

  for (const [key, nextValue] of Object.entries(value).sort()) {
    if (typeof nextValue === "boolean") {
      continue;
    }

    if (!isNonNegativeFiniteNumber(nextValue)) {
      addError(
        report,
        `${path}.${key}`,
        "performanceBudget.invalidField",
        "Budget values must be non-negative finite numbers.",
      );
    }
  }
}

function compareBudget(
  total: number,
  budget: unknown,
  path: string,
  message: string,
  report: MutableReport,
) {
  if (typeof budget === "number" && Number.isFinite(budget) && total > budget) {
    addError(report, path, "stylePack.staticBudgetExceeded", message);
  }
}

function compareAssetBudget(
  total: number,
  budget: unknown,
  path: string,
  code: NexusV2ValidationIssueCode,
  report: MutableReport,
) {
  if (typeof budget === "number" && Number.isFinite(budget) && total > budget) {
    addError(report, path, code, "Asset pack exceeds a static performance budget.");
  }
}

function scanUnsafeStrings(value: unknown, path: string, report: MutableReport) {
  if (typeof value === "string") {
    for (const { code, pattern } of unsafeStringPatterns) {
      pattern.lastIndex = 0;

      if (pattern.test(value)) {
        addError(report, path, code, "Candidate contains a forbidden string value.");
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanUnsafeStrings(item, `${path}[${index}]`, report));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nextValue] of Object.entries(value).sort()) {
    scanUnsafeStrings(nextValue, `${path}.${key}`, report);
  }
}

function scanSkinPackBehaviorKeys(
  value: unknown,
  path: string,
  report: MutableReport,
) {
  if (path === "$.manifest.payload") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanSkinPackBehaviorKeys(item, `${path}[${index}]`, report),
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nextValue] of Object.entries(value).sort()) {
    const nextPath = `${path}.${key}`;

    if (isBehaviorFieldName(key)) {
      addError(
        report,
        nextPath,
        "contract.forbiddenBehaviorField",
        "Candidate contains a behavior, layout, state, or persistence field.",
      );
    }

    scanSkinPackBehaviorKeys(nextValue, nextPath, report);
  }
}

function scanProtectedLayoutKeys(
  value: unknown,
  path: string,
  report: MutableReport,
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanProtectedLayoutKeys(item, `${path}[${index}]`, report));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nextValue] of Object.entries(value).sort()) {
    const nextPath = `${path}.${key}`;

    if (isBehaviorFieldName(key)) {
      addError(
        report,
        nextPath,
        "layoutPreset.protectedField",
        "Layout preset contains protected behavior, geometry, state, or persistence authority.",
      );
    }

    scanProtectedLayoutKeys(nextValue, nextPath, report);
  }
}

function isBehaviorFieldName(value: string) {
  const normalized = value.toLowerCase().replace(/[-_\s.]/g, "");

  return (
    exactBehaviorFields.includes(normalized) ||
    behaviorFieldFragments.some((part) => normalized.includes(part))
  );
}

function estimateCssVariableCount(value: Record<string, unknown>) {
  let count = 0;

  if (isRecord(value.tokens)) {
    for (const group of Object.values(value.tokens)) {
      if (isRecord(group)) {
        count += Object.keys(group).length;
      }
    }
  }

  if (isRecord(value.recipes)) {
    count += countLeafValues(value.recipes);
  }

  return count;
}

function countLeafValues(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countLeafValues(item), 0);
  }

  if (!isRecord(value)) {
    return value === undefined ? 0 : 1;
  }

  return Object.values(value).reduce<number>(
    (sum, item) => sum + countLeafValues(item),
    0,
  );
}

function stableJson(value: unknown): string {
  const json = JSON.stringify(sortForJson(value));

  return typeof json === "string" ? json : "";
}

function sortForJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForJson);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nextValue]) => [key, sortForJson(nextValue)]),
  );
}

function createMutableReport(): MutableReport {
  return {
    errors: [],
    info: [],
    totals: {},
    warnings: [],
  };
}

function finalizeSkinPackReport(
  report: MutableReport,
  candidate?: Record<string, unknown>,
): NexusSkinPackV2ValidationResult {
  const finalized = finalizeReport(report);

  if (!finalized.accepted || !candidate) {
    return finalized;
  }

  return {
    ...finalized,
    skinPack: candidate as NexusSkinPackV2,
  };
}

function finalizeReport(report: MutableReport): NexusV2ValidationReport {
  const totals = Object.keys(report.totals).length > 0 ? report.totals : undefined;

  return {
    accepted: report.errors.length === 0,
    errors: sortIssues(report.errors),
    info: sortIssues(report.info),
    ...(totals ? { totals } : {}),
    warnings: sortIssues(report.warnings),
  };
}

function addError(
  report: MutableReport,
  path: string,
  code: NexusV2ValidationIssueCode,
  message: string,
) {
  report.errors.push({ code, message, path });
}

function sortIssues(issues: NexusV2ValidationIssue[]) {
  return [...issues].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);

    return pathOrder === 0 ? left.code.localeCompare(right.code) : pathOrder;
  });
}

function withinLength(value: string, min: number, max: number) {
  return value.length >= min && value.length <= max;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function assertNexusSkinPackV2(
  candidate: unknown,
): asserts candidate is NexusSkinPackV2 {
  const report = validateNexusSkinPackV2(candidate);

  if (!report.accepted) {
    throw new Error("Nexus Skin Pack V2 failed validation.");
  }
}

export function assertNexusAssetPackV1(
  candidate: unknown,
): asserts candidate is NexusAssetPackV1 {
  const report = validateNexusAssetPackV1(candidate);

  if (!report.accepted) {
    throw new Error("Nexus Asset Pack V1 failed validation.");
  }
}

export function assertNexusRecipeRegistryV1(
  candidate: unknown,
): asserts candidate is NexusRecipeRegistryV1 {
  const report = validateNexusRecipeRegistryV1(candidate);

  if (!report.accepted) {
    throw new Error("Nexus Recipe Registry V1 failed validation.");
  }
}

export function assertNexusLayoutPresetV1(
  candidate: unknown,
): asserts candidate is NexusLayoutPresetV1 {
  const report = validateNexusLayoutPresetV1(candidate);

  if (!report.accepted) {
    throw new Error("Nexus Layout Preset V1 failed validation.");
  }
}

export function assertNexusPerformanceBudgetV1(
  candidate: unknown,
): asserts candidate is NexusPerformanceBudgetV1 {
  const report = validateNexusPerformanceBudgetV1(candidate);

  if (!report.accepted) {
    throw new Error("Nexus Performance Budget V1 failed validation.");
  }
}
