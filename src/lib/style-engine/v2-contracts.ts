import type {
  NexusStyleManifestV1,
  NexusStyleTokenGroupNameV1,
} from "./manifest";

export const NEXUS_SKIN_PACK_KIND_V2 = "nexus-skin-pack" as const;
export const NEXUS_SKIN_PACK_SCHEMA_VERSION_V2 = 2 as const;
export const NEXUS_ASSET_PACK_KIND_V1 = "nexus-asset-pack" as const;
export const NEXUS_ASSET_PACK_SCHEMA_VERSION_V1 = 1 as const;
export const NEXUS_RECIPE_REGISTRY_KIND_V1 =
  "nexus-recipe-registry" as const;
export const NEXUS_RECIPE_REGISTRY_SCHEMA_VERSION_V1 = 1 as const;
export const NEXUS_LAYOUT_PRESET_KIND_V1 = "nexus-layout-preset" as const;
export const NEXUS_LAYOUT_PRESET_SCHEMA_VERSION_V1 = 1 as const;
export const NEXUS_PERFORMANCE_BUDGET_KIND_V1 =
  "nexus-performance-budget" as const;
export const NEXUS_PERFORMANCE_BUDGET_SCHEMA_VERSION_V1 = 1 as const;

export type NexusV2ValidationIssueCode =
  | "stylePack.invalidRoot"
  | "stylePack.missingField"
  | "stylePack.unknownTopLevelField"
  | "stylePack.invalidKind"
  | "stylePack.unsupportedSchemaVersion"
  | "stylePack.invalidId"
  | "stylePack.invalidMetadata"
  | "stylePack.invalidManifestBinding"
  | "stylePack.invalidManifestPayload"
  | "stylePack.invalidTokenBinding"
  | "stylePack.invalidRecipeBinding"
  | "stylePack.invalidAssetBinding"
  | "stylePack.invalidLayoutBinding"
  | "stylePack.invalidPerformanceBudget"
  | "stylePack.invalidCompatibility"
  | "stylePack.invalidFallback"
  | "stylePack.staticBudgetExceeded"
  | "contract.forbiddenString"
  | "contract.forbiddenExecutable"
  | "contract.forbiddenCss"
  | "contract.forbiddenPlatformReference"
  | "contract.forbiddenBehaviorField"
  | "assetPack.invalidRoot"
  | "assetPack.missingField"
  | "assetPack.unknownTopLevelField"
  | "assetPack.invalidKind"
  | "assetPack.unsupportedSchemaVersion"
  | "assetPack.invalidId"
  | "assetPack.invalidMetadata"
  | "assetPack.invalidAssetDescriptor"
  | "assetPack.duplicateAssetId"
  | "assetPack.unsupportedAssetType"
  | "assetPack.unsupportedAssetRole"
  | "assetPack.unsupportedMime"
  | "assetPack.missingAssetSize"
  | "assetPack.missingAssetHash"
  | "assetPack.invalidAssetSource"
  | "assetPack.unsafeAssetReference"
  | "assetPack.protocol96Required"
  | "assetPack.assetCountExceeded"
  | "assetPack.criticalBytesExceeded"
  | "assetPack.totalBytesExceeded"
  | "assetPack.singleAssetBytesExceeded"
  | "assetPack.imageDimensionsExceeded"
  | "recipeRegistry.invalidRoot"
  | "recipeRegistry.missingField"
  | "recipeRegistry.unknownTopLevelField"
  | "recipeRegistry.invalidKind"
  | "recipeRegistry.unsupportedSchemaVersion"
  | "recipeRegistry.invalidGroup"
  | "recipeRegistry.unknownGroup"
  | "recipeRegistry.duplicateSlot"
  | "recipeRegistry.forbiddenSlot"
  | "recipeRegistry.nonVisualSlot"
  | "layoutPreset.invalidRoot"
  | "layoutPreset.missingField"
  | "layoutPreset.unknownTopLevelField"
  | "layoutPreset.invalidKind"
  | "layoutPreset.unsupportedSchemaVersion"
  | "layoutPreset.invalidField"
  | "layoutPreset.protectedField"
  | "performanceBudget.invalidRoot"
  | "performanceBudget.missingField"
  | "performanceBudget.unknownTopLevelField"
  | "performanceBudget.invalidKind"
  | "performanceBudget.unsupportedSchemaVersion"
  | "performanceBudget.invalidField";

export type NexusV2ValidationIssue = {
  code: NexusV2ValidationIssueCode;
  path: string;
  message: string;
};

export type NexusV2ValidationReport = {
  accepted: boolean;
  errors: NexusV2ValidationIssue[];
  warnings: NexusV2ValidationIssue[];
  info: NexusV2ValidationIssue[];
  totals?: {
    cssVariableCount?: number;
    normalizedManifestBytes?: number;
    packMetadataBytes?: number;
    totalAssets?: number;
    criticalAssets?: number;
    criticalBytes?: number;
    totalBytes?: number;
    recipeGroups?: number;
    recipeSlots?: number;
    adapterOutputs?: number;
  };
};

export type NexusSkinPackV2ValidationResult = NexusV2ValidationReport & {
  skinPack?: NexusSkinPackV2;
};

export type NexusSkinPackLifecycleV2 =
  | "draft"
  | "validated"
  | "warning"
  | "deprecated"
  | "retired"
  | "quarantined"
  | "rejected";

export type NexusSkinPackMetadataV2 = {
  displayName: string;
  description?: string;
  author?: string;
  source:
    | "built-in"
    | "human-authored"
    | "imported"
    | "ai-draft"
    | "legacy-bridge";
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  lifecycle: NexusSkinPackLifecycleV2;
};

export type NexusSkinPackManifestBindingV2 = {
  manifestVersion: 1;
  manifestId: string;
  payload: NexusStyleManifestV1;
  checksums?: {
    source?: string;
    manifest?: string;
    normalizedManifest?: string;
    compiledOutput?: string;
  };
};

export type NexusSkinPackTokenBindingV2 = {
  source: "manifest";
  manifestTokenGroups: NexusStyleTokenGroupNameV1[];
  derivedOnly?: boolean;
};

export type NexusSkinPackRecipeBindingV2 = {
  source: "manifest";
  registryVersion: "recipe-registry-v1";
  groups: NexusRecipeGroupIdV1[];
  adapterCoverage: {
    windowModal?: "complete" | "partial" | "unsupported";
    reactFlow?: "complete" | "partial" | "unsupported";
    primitives?: "complete" | "partial" | "unsupported";
  };
};

export type NexusSkinPackAssetBindingV2 = {
  assetPackContract: "asset-pack-v1";
  assetPackId: string;
  requiredAssetIds: string[];
  lazyAssetIds?: string[];
  optionalAssetIds?: string[];
  fallbackAssetPackId?: string;
};

export type NexusSkinPackLayoutPresetBindingV2 = {
  contract: "layout-preset-boundary-v1";
  presetId: string;
  density?: "compact" | "comfortable" | "spacious";
  surfaceTreatment?: "flat" | "glass" | "raised" | "outlined";
  slotOrdering?: string[];
  visibilityHints?: {
    sidebar?: "default" | "compact" | "hidden";
    toolrail?: "default" | "compact" | "hidden";
  };
};

export type NexusSkinPackPerformanceBudgetV2 = {
  contract: "performance-budget-validator-v1";
  maxCssVariableCount: number;
  maxStaticManifestBytes: number;
  maxRecipeGroups: number;
  maxAdapterOutputs: number;
  assetBudgetRef?: string;
  renderBudgetRef?: string;
};

export type NexusSkinPackCompatibilityV2 = {
  appStyleEngineVersion: string;
  manifestVersion: 1;
  validatorVersion: string;
  compilerVersion: string;
  recipeRegistryVersion: "recipe-registry-v1";
  assetPackContract?: "asset-pack-v1";
  layoutPresetContract?: "layout-preset-boundary-v1";
  result:
    | "compatible"
    | "compatible_with_warnings"
    | "requires_upgrade"
    | "requires_downgrade"
    | "incompatible";
  warnings?: string[];
};

export type NexusSkinPackFallbackV2 = {
  fallbackPackId: string;
  fallbackManifestId: string;
  fallbackLegacyPreset: "cyberpunk" | "apple" | "tesla" | "terminal";
  onAssetFailure: "use-fallback-asset" | "omit-asset" | "reject-pack";
  onLayoutFailure: "use-default-layout" | "reject-pack";
  onBudgetFailure: "preview-degraded" | "reject-pack";
};

export type NexusSkinPackV2 = {
  kind: typeof NEXUS_SKIN_PACK_KIND_V2;
  schemaVersion: typeof NEXUS_SKIN_PACK_SCHEMA_VERSION_V2;
  id: string;
  slug: string;
  packVersion: string;
  metadata: NexusSkinPackMetadataV2;
  manifest: NexusSkinPackManifestBindingV2;
  tokens: NexusSkinPackTokenBindingV2;
  recipes: NexusSkinPackRecipeBindingV2;
  assets?: NexusSkinPackAssetBindingV2;
  layoutPreset?: NexusSkinPackLayoutPresetBindingV2;
  performanceBudget: NexusSkinPackPerformanceBudgetV2;
  compatibility: NexusSkinPackCompatibilityV2;
  fallback: NexusSkinPackFallbackV2;
};

export type NexusAssetTypeV1 =
  | "texture"
  | "icon"
  | "avatar"
  | "frame"
  | "background"
  | "font-reference";

export type NexusAssetLoadingV1 = "critical" | "lazy" | "optional";

export type NexusAssetMimeV1 =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/svg+xml"
  | "font/woff2"
  | "application/font-reference+json";

export type NexusAssetRoleV1 =
  | "panel-surface"
  | "workspace-grid"
  | "window-chrome"
  | "modal-backdrop"
  | "graph-background"
  | "action"
  | "status"
  | "navigation"
  | "tool"
  | "decorative"
  | "agent"
  | "profile"
  | "system"
  | "placeholder"
  | "window-frame"
  | "panel-frame"
  | "card-frame"
  | "avatar-frame"
  | "workspace"
  | "panel"
  | "hero-preview"
  | "style-lab-specimen"
  | "interface"
  | "mono"
  | "display"
  | "accent";

export type NexusAssetSourceV1 =
  | {
      kind: "builtin";
      packagePath: string;
    }
  | {
      kind: "packaged";
      contentAddressedPath: string;
    }
  | {
      kind: "generated-reference";
      provenanceId: string;
      protocol96Required: true;
    }
  | {
      kind: "font-family-reference";
      familyName: string;
    };

export type NexusAssetDescriptorV1 = {
  id: string;
  type: NexusAssetTypeV1;
  role: NexusAssetRoleV1;
  loading: NexusAssetLoadingV1;
  mime: NexusAssetMimeV1;
  byteSize: number;
  dimensions?: {
    width: number;
    height: number;
    pixelRatio?: 1 | 2 | 3;
  };
  hash: {
    algorithm: "sha256";
    value: string;
  };
  source: NexusAssetSourceV1;
  fallbackAssetId?: string;
  alt?: string;
  tags?: string[];
};

export type NexusAssetPackMetadataV1 = {
  displayName: string;
  description?: string;
  lifecycle?: "draft" | "validated" | "warning" | "rejected";
};

export type NexusAssetPackFallbackV1 = {
  fallbackAssetPackId?: string;
  fallbackByType: Partial<Record<NexusAssetTypeV1, string>>;
  onMissingCritical: "reject-pack" | "use-fallback-asset";
  onMissingLazy: "omit-and-warn";
  onMissingOptional: "omit";
  onOversized: "reject-asset" | "use-fallback-asset";
  onUnsupportedMime: "reject-asset";
};

export type NexusAssetPackPerformanceBudgetV1 = {
  maxTotalAssets: number;
  maxCriticalAssets: number;
  maxCriticalBytes: number;
  maxTotalBytes: number;
  maxImageWidth: number;
  maxImageHeight: number;
  maxSvgBytes: number;
  maxFontReferences: number;
};

export type NexusAssetPackCompatibilityV1 = {
  contractVersion: 1;
  skinPackIds?: string[];
  supportedManifestVersions: [1];
  supportedMimeTypes: NexusAssetMimeV1[];
  requiresProtocol96ForGeneratedAssets: boolean;
  result:
    | "compatible"
    | "compatible_with_warnings"
    | "requires_protocol_96"
    | "incompatible";
};

export type NexusAssetPackV1 = {
  kind: typeof NEXUS_ASSET_PACK_KIND_V1;
  schemaVersion: typeof NEXUS_ASSET_PACK_SCHEMA_VERSION_V1;
  id: string;
  slug: string;
  version: string;
  metadata: NexusAssetPackMetadataV1;
  assets: NexusAssetDescriptorV1[];
  fallback: NexusAssetPackFallbackV1;
  performanceBudget: NexusAssetPackPerformanceBudgetV1;
  compatibility: NexusAssetPackCompatibilityV1;
};

export type NexusRecipeGroupIdV1 =
  | "panel"
  | "button"
  | "input"
  | "window"
  | "modal"
  | "toolbar"
  | "agent-card"
  | "graph-node"
  | "graph-edge";

export type NexusRecipeOwnerV1 =
  | "primitive"
  | "window-modal-adapter"
  | "react-flow-adapter"
  | "style-lab-specimen";

export type NexusRecipeAdapterOwnerV1 =
  | "compiler"
  | "window-modal-recipe-adapter"
  | "react-flow-style-adapter"
  | "none";

export type NexusRecipeSpecimenOwnerV1 =
  | "style-lab"
  | "primitive-specimens"
  | "graph-specimens";

export type NexusRecipeSlotDefinitionV1 = {
  slotId: string;
  label: string;
  valueKind:
    | "semantic-token"
    | "recipe-token"
    | "asset-id"
    | "enum"
    | "number"
    | "boolean";
  allowedTokenGroups?: string[];
  allowedEnums?: string[];
  defaultValue: string | number | boolean;
  fallbackValue: string | number | boolean;
  visualOnly: true;
  forbiddenKeys: string[];
};

export type NexusRecipeGroupDefinitionV1 = {
  groupId: NexusRecipeGroupIdV1;
  owner: NexusRecipeOwnerV1;
  slots: NexusRecipeSlotDefinitionV1[];
  requiredSlots: string[];
  optionalSlots: string[];
  fallbackGroupId?: NexusRecipeGroupIdV1;
  adapterOwner?: NexusRecipeAdapterOwnerV1;
  specimenOwner?: NexusRecipeSpecimenOwnerV1;
};

export type NexusRecipeRegistryCompatibilityV1 = {
  registryVersion: 1;
  manifestVersion: 1;
  groups: Record<
    NexusRecipeGroupIdV1,
    "compatible" | "compatible_with_warnings" | "unsupported"
  >;
  requiredFixtureSet: string[];
};

export type NexusRecipeRegistryV1 = {
  kind: typeof NEXUS_RECIPE_REGISTRY_KIND_V1;
  schemaVersion: typeof NEXUS_RECIPE_REGISTRY_SCHEMA_VERSION_V1;
  id: string;
  version: string;
  groups: Record<NexusRecipeGroupIdV1, NexusRecipeGroupDefinitionV1>;
  compatibility: NexusRecipeRegistryCompatibilityV1;
};

export type NexusLayoutDensityV1 = {
  mode: "compact" | "comfortable" | "spacious";
  controlScale?: "small" | "standard" | "large";
  surfacePadding?: "tight" | "standard" | "roomy";
  listDensity?: "dense" | "standard" | "relaxed";
};

export type NexusLayoutSlotOrderingV1 = {
  shell?: string[];
  panel?: string[];
  toolbar?: string[];
  agentCard?: string[];
};

export type NexusLayoutSurfaceTreatmentV1 = {
  panel: "flat" | "outlined" | "raised" | "glass";
  window: "flat" | "outlined" | "raised" | "glass";
  modal: "flat" | "outlined" | "raised" | "glass";
  graph: "flat" | "grid" | "subtle-texture";
};

export type NexusLayoutVisibilityV1 = {
  sidebar?: "default" | "compact" | "hidden";
  toolrail?: "default" | "compact" | "hidden";
  dock?: "default" | "compact";
  commandSurface?: "default" | "compact";
};

export type NexusWorkspaceDecorationV1 = {
  grid?: "none" | "subtle" | "standard" | "expressive";
  ambient?: "none" | "subtle" | "standard";
  backgroundAssetId?: string;
  textureAssetId?: string;
};

export type NexusLayoutPresetCompatibilityV1 = {
  contractVersion: 1;
  skinPackId?: string;
  recipeRegistryVersion: "recipe-registry-v1";
  assetPackContract?: "asset-pack-v1";
  result:
    | "compatible"
    | "compatible_with_warnings"
    | "unsupported"
    | "incompatible";
  warnings?: string[];
};

export type NexusLayoutPresetFallbackV1 = {
  fallbackPresetId: string;
  onUnsupportedDensity: "use-default-density";
  onUnsupportedSlotOrdering: "ignore-slot-ordering";
  onUnsupportedSurfaceTreatment: "use-default-surface";
  onUnsupportedVisibility: "use-default-visibility";
  onProtectedField: "reject-preset";
};

export type NexusLayoutPresetV1 = {
  kind: typeof NEXUS_LAYOUT_PRESET_KIND_V1;
  schemaVersion: typeof NEXUS_LAYOUT_PRESET_SCHEMA_VERSION_V1;
  id: string;
  name: string;
  density: NexusLayoutDensityV1;
  slotOrdering: NexusLayoutSlotOrderingV1;
  surfaceTreatment: NexusLayoutSurfaceTreatmentV1;
  visibility: NexusLayoutVisibilityV1;
  workspaceDecoration: NexusWorkspaceDecorationV1;
  compatibility: NexusLayoutPresetCompatibilityV1;
  fallback: NexusLayoutPresetFallbackV1;
};

export type NexusStaticManifestBudgetV1 = {
  maxCssVariableCount: number;
  maxNormalizedManifestBytes: number;
  maxPackMetadataBytes: number;
  maxCompatibilityReportBytes: number;
};

export type NexusRecipeBudgetV1 = {
  maxRecipeGroups: number;
  maxRecipeSlots: number;
  maxAdapterOutputs: number;
};

export type NexusAssetBudgetV1 = {
  maxTotalAssets: number;
  maxCriticalAssets: number;
  maxLazyAssets: number;
  maxOptionalAssets: number;
  maxCriticalBytes: number;
  maxTotalBytes: number;
  maxSingleAssetBytes: number;
};

export type NexusVisualEffectBudgetV1 = {
  maxBlurPx: number;
  maxBackdropBlurPx: number;
  maxShadowLayers: number;
  maxGlowLayers: number;
  maxGlowSpreadPx: number;
  allowFullViewportHeavyBlur: false;
};

export type NexusAnimationBudgetV1 = {
  maxAnimatedRecipeGroups: number;
  maxDurationMs: number;
  maxConcurrentAmbientAnimations: number;
  allowLayoutAnimation: false;
  allowInfiniteCriticalAnimation: false;
};

export type NexusReactFlowEffectBudgetV1 = {
  maxNodeGlowLayers: number;
  maxEdgeHaloLayers: number;
  maxAnimatedEdges: number;
  allowBehaviorMutation: false;
  allowInteractionWidthMutation: false;
};

export type NexusPerformanceDegradationPolicyV1 = {
  onStaticBudgetWarning: "allow-preview-with-warning";
  onStaticBudgetError: "reject-pack";
  onCriticalAssetOverBudget: "reject-pack" | "use-fallback-assets";
  onLazyAssetOverBudget: "omit-lazy-assets";
  onOptionalAssetOverBudget: "omit-optional-assets";
  onEffectOverBudget: "degrade-effects" | "reject-pack";
  onUnsupportedRuntimeMeasurement: "skip-runtime-check-with-warning";
};

export type NexusPerformanceBudgetV1 = {
  kind: typeof NEXUS_PERFORMANCE_BUDGET_KIND_V1;
  schemaVersion: typeof NEXUS_PERFORMANCE_BUDGET_SCHEMA_VERSION_V1;
  id: string;
  staticManifest: NexusStaticManifestBudgetV1;
  recipes: NexusRecipeBudgetV1;
  assets?: NexusAssetBudgetV1;
  visualEffects: NexusVisualEffectBudgetV1;
  animation: NexusAnimationBudgetV1;
  reactFlowEffects: NexusReactFlowEffectBudgetV1;
  degradation: NexusPerformanceDegradationPolicyV1;
};
