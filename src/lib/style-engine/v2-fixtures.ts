import {
  createHighContrastCarbonStyleManifestV1,
  createLegacyCyberpunkStyleManifestV1,
} from "./presets";
import type {
  NexusAssetPackV1,
  NexusLayoutPresetV1,
  NexusPerformanceBudgetV1,
  NexusRecipeGroupDefinitionV1,
  NexusRecipeGroupIdV1,
  NexusRecipeRegistryV1,
  NexusRecipeSlotDefinitionV1,
  NexusSkinPackV2,
} from "./v2-contracts";

const SHA_256_A = "a".repeat(64);
const SHA_256_B = "b".repeat(64);

export function createValidMinimalSkinPackV2(): NexusSkinPackV2 {
  const manifest = createHighContrastCarbonStyleManifestV1();

  return {
    compatibility: {
      appStyleEngineVersion: "nexus-style-engine-v2",
      compilerVersion: "nexus-style-compiler-v1",
      manifestVersion: 1,
      recipeRegistryVersion: "recipe-registry-v1",
      result: "compatible",
      validatorVersion: "nexus-style-validator-v1",
    },
    fallback: {
      fallbackLegacyPreset: "cyberpunk",
      fallbackManifestId: "legacy-cyberpunk",
      fallbackPackId: "legacy-cyberpunk-skin",
      onAssetFailure: "omit-asset",
      onBudgetFailure: "reject-pack",
      onLayoutFailure: "use-default-layout",
    },
    id: "minimal-carbon-skin",
    kind: "nexus-skin-pack",
    manifest: {
      manifestId: manifest.id,
      manifestVersion: 1,
      payload: manifest,
    },
    metadata: {
      displayName: "Minimal Carbon Skin",
      lifecycle: "validated",
      source: "built-in",
      tags: ["minimal", "carbon"],
    },
    packVersion: "1.0.0",
    performanceBudget: {
      contract: "performance-budget-validator-v1",
      maxAdapterOutputs: 24,
      maxCssVariableCount: 220,
      maxRecipeGroups: 12,
      maxStaticManifestBytes: 70000,
    },
    recipes: {
      adapterCoverage: {
        primitives: "partial",
        windowModal: "complete",
      },
      groups: ["panel", "button", "input", "window", "modal"],
      registryVersion: "recipe-registry-v1",
      source: "manifest",
    },
    schemaVersion: 2,
    slug: "minimal-carbon-skin",
    tokens: {
      derivedOnly: true,
      manifestTokenGroups: [
        "surface",
        "text",
        "accent",
        "status",
        "border",
        "shadow",
        "radius",
        "blur",
        "workspace",
        "typography",
        "density",
        "motion",
      ],
      source: "manifest",
    },
  };
}

export function createCyberpunkCompatibleSkinPackV2(): NexusSkinPackV2 {
  const manifest = createLegacyCyberpunkStyleManifestV1();

  return {
    ...createValidMinimalSkinPackV2(),
    assets: {
      assetPackContract: "asset-pack-v1",
      assetPackId: "cyberpunk-safe-assets",
      fallbackAssetPackId: "minimal-safe-assets",
      lazyAssetIds: ["cyberpunk-panel-noise"],
      optionalAssetIds: [],
      requiredAssetIds: ["cyberpunk-action-icon"],
    },
    compatibility: {
      appStyleEngineVersion: "nexus-style-engine-v2",
      assetPackContract: "asset-pack-v1",
      compilerVersion: "nexus-style-compiler-v1",
      layoutPresetContract: "layout-preset-boundary-v1",
      manifestVersion: 1,
      recipeRegistryVersion: "recipe-registry-v1",
      result: "compatible_with_warnings",
      validatorVersion: "nexus-style-validator-v1",
      warnings: ["stylePack.compatibility.previewOnlyAssets"],
    },
    fallback: {
      fallbackLegacyPreset: "cyberpunk",
      fallbackManifestId: "legacy-cyberpunk",
      fallbackPackId: "minimal-carbon-skin",
      onAssetFailure: "use-fallback-asset",
      onBudgetFailure: "preview-degraded",
      onLayoutFailure: "use-default-layout",
    },
    id: "cyberpunk-compatible-skin",
    layoutPreset: {
      contract: "layout-preset-boundary-v1",
      density: "compact",
      presetId: "compact-glass-ops",
      slotOrdering: ["header", "body", "actions"],
      surfaceTreatment: "glass",
      visibilityHints: {
        sidebar: "default",
        toolrail: "compact",
      },
    },
    manifest: {
      manifestId: manifest.id,
      manifestVersion: 1,
      payload: manifest,
    },
    metadata: {
      displayName: "Cyberpunk Compatible Skin",
      lifecycle: "warning",
      source: "legacy-bridge",
      tags: ["cyberpunk", "legacy-bridge"],
    },
    slug: "cyberpunk-compatible-skin",
  };
}

export function createValidAssetPackV1(): NexusAssetPackV1 {
  return {
    assets: [
      {
        alt: "Action glyph",
        byteSize: 4096,
        dimensions: {
          height: 128,
          width: 128,
        },
        hash: {
          algorithm: "sha256",
          value: SHA_256_A,
        },
        id: "cyberpunk-action-icon",
        loading: "critical",
        mime: "image/png",
        role: "action",
        source: {
          kind: "builtin",
          packagePath: "builtin/icons/cyberpunk-action.png",
        },
        type: "icon",
      },
      {
        byteSize: 65536,
        dimensions: {
          height: 1024,
          width: 1024,
        },
        fallbackAssetId: "cyberpunk-action-icon",
        hash: {
          algorithm: "sha256",
          value: SHA_256_B,
        },
        id: "cyberpunk-panel-noise",
        loading: "lazy",
        mime: "image/webp",
        role: "panel-surface",
        source: {
          kind: "packaged",
          contentAddressedPath: "sha256/cyberpunk-panel-noise.webp",
        },
        type: "texture",
      },
    ],
    compatibility: {
      contractVersion: 1,
      requiresProtocol96ForGeneratedAssets: true,
      result: "compatible",
      supportedManifestVersions: [1],
      supportedMimeTypes: ["image/png", "image/webp"],
    },
    fallback: {
      fallbackByType: {
        icon: "cyberpunk-action-icon",
        texture: "cyberpunk-panel-noise",
      },
      onMissingCritical: "use-fallback-asset",
      onMissingLazy: "omit-and-warn",
      onMissingOptional: "omit",
      onOversized: "use-fallback-asset",
      onUnsupportedMime: "reject-asset",
    },
    id: "cyberpunk-safe-assets",
    kind: "nexus-asset-pack",
    metadata: {
      displayName: "Cyberpunk Safe Assets",
      lifecycle: "validated",
    },
    performanceBudget: {
      maxCriticalAssets: 4,
      maxCriticalBytes: 32768,
      maxFontReferences: 2,
      maxImageHeight: 2048,
      maxImageWidth: 2048,
      maxSvgBytes: 16384,
      maxTotalAssets: 16,
      maxTotalBytes: 262144,
    },
    schemaVersion: 1,
    slug: "cyberpunk-safe-assets",
    version: "1.0.0",
  };
}

export function createInvalidUnsafeAssetPackV1(): Record<string, unknown> {
  const assetPack = createValidAssetPackV1() as unknown as Record<string, unknown>;
  const assets = assetPack.assets as Array<Record<string, unknown>>;

  assets[0] = {
    byteSize: undefined,
    dimensions: {
      height: 8192,
      width: 8192,
    },
    hash: {
      algorithm: "sha256",
      value: "not-a-sha",
    },
    id: "unsafe-remote-icon",
    loading: "critical",
    mime: "application/javascript",
    role: "action",
    source: {
      kind: "builtin",
      packagePath: "https://private.example/asset.js?token=hidden-token",
    },
    type: "icon",
  };
  assetPack.metadata = {
    displayName: "service-role hidden asset pack",
  };

  return assetPack;
}

export function createInvalidBehaviorRecipeRegistryV1(): Record<string, unknown> {
  const registry = createValidRecipeRegistryV1() as unknown as Record<string, unknown>;
  const groups = registry.groups as Record<string, Record<string, unknown>>;
  const button = groups.button;
  const slots = button.slots as Array<Record<string, unknown>>;

  slots.push({
    defaultValue: "run-command",
    fallbackValue: "noop",
    forbiddenKeys: [],
    label: "Click Handler",
    slotId: "onClick",
    valueKind: "enum",
    visualOnly: false,
  });

  return registry;
}

export function createInvalidLayoutPresetV1(): Record<string, unknown> {
  return {
    ...createValidLayoutPresetV1(),
    density: {
      mode: "compact",
      zIndex: 9999,
    },
    dragHandle: "nexus-drag-handle",
    store: {
      sync: "queueThemeConfigCloudSync hidden-layout-payload",
    },
  };
}

export function createOverBudgetSkinPackV2(): NexusSkinPackV2 {
  return {
    ...createValidMinimalSkinPackV2(),
    id: "over-budget-skin",
    metadata: {
      displayName: "Over Budget Skin",
      lifecycle: "validated",
      source: "built-in",
    },
    performanceBudget: {
      contract: "performance-budget-validator-v1",
      maxAdapterOutputs: 1,
      maxCssVariableCount: 1,
      maxRecipeGroups: 1,
      maxStaticManifestBytes: 1,
    },
    slug: "over-budget-skin",
  };
}

export function createUnsupportedVersionSkinPackV2(): Record<string, unknown> {
  return {
    ...createValidMinimalSkinPackV2(),
    schemaVersion: 99,
  };
}

export function createValidRecipeRegistryV1(): NexusRecipeRegistryV1 {
  const groups = Object.fromEntries(
    recipeGroups.map((groupId) => [groupId, createRecipeGroup(groupId)]),
  ) as Record<NexusRecipeGroupIdV1, NexusRecipeGroupDefinitionV1>;

  return {
    compatibility: {
      groups: Object.fromEntries(
        recipeGroups.map((groupId) => [groupId, "compatible"]),
      ) as NexusRecipeRegistryV1["compatibility"]["groups"],
      manifestVersion: 1,
      registryVersion: 1,
      requiredFixtureSet: ["v2-contract-baseline"],
    },
    groups,
    id: "nexus-recipe-registry-v1",
    kind: "nexus-recipe-registry",
    schemaVersion: 1,
    version: "1.0.0",
  };
}

export function createValidLayoutPresetV1(): NexusLayoutPresetV1 {
  return {
    compatibility: {
      contractVersion: 1,
      recipeRegistryVersion: "recipe-registry-v1",
      result: "compatible",
    },
    density: {
      controlScale: "small",
      listDensity: "dense",
      mode: "compact",
      surfacePadding: "tight",
    },
    fallback: {
      fallbackPresetId: "default-layout",
      onProtectedField: "reject-preset",
      onUnsupportedDensity: "use-default-density",
      onUnsupportedSlotOrdering: "ignore-slot-ordering",
      onUnsupportedSurfaceTreatment: "use-default-surface",
      onUnsupportedVisibility: "use-default-visibility",
    },
    id: "compact-glass-ops",
    kind: "nexus-layout-preset",
    name: "Compact Glass Ops",
    schemaVersion: 1,
    slotOrdering: {
      agentCard: ["header", "body", "status"],
      panel: ["header", "body", "actions"],
      shell: ["toolbar", "workspace", "dock"],
      toolbar: ["primary", "secondary"],
    },
    surfaceTreatment: {
      graph: "grid",
      modal: "glass",
      panel: "glass",
      window: "glass",
    },
    visibility: {
      commandSurface: "compact",
      dock: "compact",
      sidebar: "default",
      toolrail: "compact",
    },
    workspaceDecoration: {
      ambient: "subtle",
      grid: "standard",
      textureAssetId: "cyberpunk-panel-noise",
    },
  };
}

export function createValidPerformanceBudgetV1(): NexusPerformanceBudgetV1 {
  return {
    animation: {
      allowInfiniteCriticalAnimation: false,
      allowLayoutAnimation: false,
      maxAnimatedRecipeGroups: 2,
      maxConcurrentAmbientAnimations: 1,
      maxDurationMs: 240,
    },
    assets: {
      maxCriticalAssets: 8,
      maxCriticalBytes: 524288,
      maxLazyAssets: 32,
      maxOptionalAssets: 48,
      maxSingleAssetBytes: 1048576,
      maxTotalAssets: 64,
      maxTotalBytes: 4194304,
    },
    degradation: {
      onCriticalAssetOverBudget: "use-fallback-assets",
      onEffectOverBudget: "degrade-effects",
      onLazyAssetOverBudget: "omit-lazy-assets",
      onOptionalAssetOverBudget: "omit-optional-assets",
      onStaticBudgetError: "reject-pack",
      onStaticBudgetWarning: "allow-preview-with-warning",
      onUnsupportedRuntimeMeasurement: "skip-runtime-check-with-warning",
    },
    id: "static-v2-budget",
    kind: "nexus-performance-budget",
    reactFlowEffects: {
      allowBehaviorMutation: false,
      allowInteractionWidthMutation: false,
      maxAnimatedEdges: 0,
      maxEdgeHaloLayers: 1,
      maxNodeGlowLayers: 1,
    },
    recipes: {
      maxAdapterOutputs: 48,
      maxRecipeGroups: 16,
      maxRecipeSlots: 128,
    },
    schemaVersion: 1,
    staticManifest: {
      maxCompatibilityReportBytes: 24576,
      maxCssVariableCount: 240,
      maxNormalizedManifestBytes: 65536,
      maxPackMetadataBytes: 16384,
    },
    visualEffects: {
      allowFullViewportHeavyBlur: false,
      maxBackdropBlurPx: 20,
      maxBlurPx: 24,
      maxGlowLayers: 2,
      maxGlowSpreadPx: 64,
      maxShadowLayers: 3,
    },
  };
}

const recipeGroups: NexusRecipeGroupIdV1[] = [
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

function createRecipeGroup(groupId: NexusRecipeGroupIdV1): NexusRecipeGroupDefinitionV1 {
  return {
    adapterOwner: groupId.startsWith("graph")
      ? "react-flow-style-adapter"
      : groupId === "window" || groupId === "modal"
        ? "window-modal-recipe-adapter"
        : "compiler",
    groupId,
    optionalSlots: ["shadow"],
    owner: groupId.startsWith("graph")
      ? "react-flow-adapter"
      : groupId === "window" || groupId === "modal"
        ? "window-modal-adapter"
        : "primitive",
    requiredSlots: ["surface", "text", "border"],
    slots: [
      createSlot("surface", "Surface", "surface.panel"),
      createSlot("text", "Text", "text.primary"),
      createSlot("border", "Border", "border.subtle"),
      createSlot("shadow", "Shadow", "shadow.panel"),
    ],
    specimenOwner: groupId.startsWith("graph")
      ? "graph-specimens"
      : "primitive-specimens",
  };
}

function createSlot(
  slotId: string,
  label: string,
  defaultValue: string,
): NexusRecipeSlotDefinitionV1 {
  return {
    allowedTokenGroups: ["surface", "text", "border", "shadow", "accent"],
    defaultValue,
    fallbackValue: defaultValue,
    forbiddenKeys: [
      "onClick",
      "className",
      "style",
      "zIndex",
      "pointerEvents",
    ],
    label,
    slotId,
    valueKind: "semantic-token",
    visualOnly: true,
  };
}
