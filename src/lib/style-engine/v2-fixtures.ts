import {
  createHighContrastCarbonStyleManifestV1,
  createBaselineSurfaceShellStyleManifestV1,
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
      fallbackLegacyPreset: "surface-shell",
      fallbackManifestId: "baseline-surface-shell",
      fallbackPackId: "baseline-surface-shell-skin",
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

export function createSurfaceShellCompatibleSkinPackV2(): NexusSkinPackV2 {
  const manifest = createBaselineSurfaceShellStyleManifestV1();

  return {
    ...createValidMinimalSkinPackV2(),
    assets: {
      assetPackContract: "asset-pack-v1",
      assetPackId: "surface-shell-safe-assets",
      fallbackAssetPackId: "minimal-safe-assets",
      lazyAssetIds: ["surface-shell-panel-noise"],
      optionalAssetIds: [],
      requiredAssetIds: ["surface-shell-action-icon"],
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
      fallbackLegacyPreset: "surface-shell",
      fallbackManifestId: "baseline-surface-shell",
      fallbackPackId: "minimal-carbon-skin",
      onAssetFailure: "use-fallback-asset",
      onBudgetFailure: "preview-degraded",
      onLayoutFailure: "use-default-layout",
    },
    id: "surface-shell-compatible-skin",
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
      displayName: "Surface Shell Compatible Skin",
      lifecycle: "warning",
      source: "legacy-bridge",
      tags: ["surface-shell", "legacy-bridge"],
    },
    slug: "surface-shell-compatible-skin",
  };
}

export function createPixelWorkshopSkinPackV2(): NexusSkinPackV2 {
  const manifest = createHighContrastCarbonStyleManifestV1();

  return {
    ...createValidMinimalSkinPackV2(),
    assets: {
      assetPackContract: "asset-pack-v1",
      assetPackId: "pixel-workshop-safe-assets",
      fallbackAssetPackId: "minimal-safe-assets",
      lazyAssetIds: ["pixel-workshop-panel-texture"],
      optionalAssetIds: ["pixel-workshop-tool-icon"],
      requiredAssetIds: [],
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
      warnings: [
        "stylePack.compatibility.reviewOnlyAssets",
        "stylePack.compatibility.reviewOnlyLayout",
      ],
    },
    fallback: {
      fallbackLegacyPreset: "surface-shell",
      fallbackManifestId: "baseline-surface-shell",
      fallbackPackId: "minimal-carbon-skin",
      onAssetFailure: "omit-asset",
      onBudgetFailure: "reject-pack",
      onLayoutFailure: "use-default-layout",
    },
    id: "pixel-workshop-skin",
    layoutPreset: {
      contract: "layout-preset-boundary-v1",
      density: "compact",
      presetId: "pixel-workshop-compact",
      slotOrdering: ["header", "body", "actions"],
      surfaceTreatment: "outlined",
      visibilityHints: {
        sidebar: "compact",
        toolrail: "compact",
      },
    },
    manifest: {
      manifestId: "pixel-workshop",
      manifestVersion: 1,
      payload: {
        ...manifest,
        adapters: {
          nextThemes: {
            colorScheme: "dark",
            dataTheme: "terminal",
          },
          tailwindBridge: {
            enabled: true,
            legacyVariableMode: "preserve",
          },
        },
        description:
          "Pixel workshop visual language expressed as safe NEXUS tokens for Style Lab token preview.",
        id: "pixel-workshop",
        intent: {
          contrast: "high",
          density: "compact",
          material: ["pixel-stone", "dirt", "grass", "diamond"],
          mood: ["blocky", "playful", "workshop"],
          motion: "minimal",
        },
        name: "Pixel Workshop",
        recipes: {
          ...manifest.recipes,
          badge: {
            default: {
              border: "accent.secondary",
              surface: "surface.panelMuted",
              text: "text.secondary",
            },
          },
          button: {
            default: {
              border: "border.subtle",
              surface: "surface.panelMuted",
              text: "text.primary",
            },
            focus: {
              ring: "accent.primaryStrong",
            },
            hover: {
              border: "accent.primary",
              surface: "surface.raised",
              text: "text.primary",
            },
          },
          panel: {
            border: "border.subtle",
            shadow: "shadow.panel",
            surface: "surface.panel",
            text: "text.primary",
          },
        },
        source: {
          kind: "human-brief",
          reference: "style-pack-authoring-closed-loop-fixture",
        },
        tokens: {
          accent: {
            primary: "#45f0d7",
            primaryStrong: "#18b8d8",
            secondary: "#7bbf2a",
          },
          blur: {
            backdrop: "0px",
            glass: "0px",
          },
          border: {
            glow: "rgb(69 240 215 / 0.28)",
            subtle: "rgb(216 231 167 / 0.32)",
          },
          density: {
            control: "compact",
            panel: "compact",
          },
          motion: {
            durationFast: "80ms",
            durationNormal: "120ms",
          },
          radius: {
            base: "0px",
            surface: "0px",
          },
          shadow: {
            glow: "0 0 0 rgb(0 0 0 / 0)",
            panel: "0 8px 0 rgb(0 0 0 / 0.42)",
          },
          status: {
            danger: "#ff6b5f",
            info: "#45f0d7",
            success: "#63d247",
            warning: "#ffd34e",
          },
          surface: {
            app: "#10140a",
            input: "#2a2416",
            overlay: "rgb(16 20 10 / 0.88)",
            panel: "#26331a",
            panelMuted: "#3f321f",
            raised: "#4c5b2d",
            shell: "#161b10",
            workspace: "#1f2717",
          },
          text: {
            danger: "#ff9b8f",
            inverse: "#07100c",
            muted: "#b8c48f",
            primary: "#f3ffd1",
            secondary: "#d8e7a7",
            success: "#a8ff8a",
            warning: "#ffe066",
          },
          typography: {
            interface: "Geist Mono",
            mono: "Geist Mono",
          },
          workspace: {
            gridPrimary: "rgb(99 210 71 / 0.22)",
            gridSecondary: "rgb(69 240 215 / 0.18)",
            wash: "rgb(123 191 42 / 0.12)",
          },
        },
      },
    },
    metadata: {
      description:
        "Minecraft-like pixel workshop palette with grass, dirt, stone, and diamond tones for token-only preview.",
      displayName: "Pixel Workshop Skin",
      lifecycle: "validated",
      source: "human-authored",
      tags: ["pixel", "minecraft-like", "workshop", "token-preview"],
    },
    recipes: {
      adapterCoverage: {
        primitives: "partial",
        windowModal: "partial",
      },
      groups: ["panel", "button", "input", "window", "modal"],
      registryVersion: "recipe-registry-v1",
      source: "manifest",
    },
    slug: "pixel-workshop-skin",
  };
}

export function createSurfaceStyleOpsSkinPackV2Fixture(): NexusSkinPackV2 {
  const manifest = createHighContrastCarbonStyleManifestV1();

  return {
    ...createValidMinimalSkinPackV2(),
    compatibility: {
      appStyleEngineVersion: "nexus-style-engine-v2",
      compilerVersion: "nexus-style-compiler-v1",
      manifestVersion: 1,
      recipeRegistryVersion: "recipe-registry-v1",
      result: "compatible",
      validatorVersion: "nexus-style-validator-v1",
    },
    fallback: {
      fallbackLegacyPreset: "apple",
      fallbackManifestId: "baseline-surface-shell",
      fallbackPackId: "minimal-carbon-skin",
      onAssetFailure: "omit-asset",
      onBudgetFailure: "reject-pack",
      onLayoutFailure: "use-default-layout",
    },
    id: "surface-style-ops-skin",
    manifest: {
      manifestId: "surface-style-ops",
      manifestVersion: 1,
      payload: {
        ...manifest,
        adapters: {
          nextThemes: {
            colorScheme: "dark",
            dataTheme: "apple",
          },
          tailwindBridge: {
            enabled: true,
            legacyVariableMode: "preserve",
          },
        },
        description:
          "Warm neutral frosted-glass command center tokens for the V19 production alias coverage path.",
        id: "surface-style-ops",
        intent: {
          contrast: "standard",
          density: "comfortable",
          material: ["frosted-glass", "warm-sand", "pearl", "muted-bronze"],
          mood: ["calm", "professional", "atelier", "command-center"],
          motion: "minimal",
        },
        name: "Surface Style Ops",
        recipes: {
          ...manifest.recipes,
          badge: {
            default: {
              border: "border.subtle",
              surface: "surface.panelMuted",
              text: "text.secondary",
            },
          },
          button: {
            default: {
              border: "border.subtle",
              surface: "surface.panelMuted",
              text: "text.secondary",
            },
            focus: {
              ring: "accent.primaryStrong",
            },
            hover: {
              border: "accent.primary",
              surface: "surface.raised",
              text: "text.primary",
            },
          },
          commandPalette: {
            emptyState: "text.muted",
            icon: "accent.secondary",
            input: "surface.input",
            itemActive: "accent.primary",
            itemDefault: "surface.panelMuted",
            itemHover: "surface.raised",
            overlay: "surface.overlay",
            surface: "surface.panel",
          },
          dock: {
            border: "border.subtle",
            surface: "surface.shell",
          },
          input: {
            default: {
              border: "border.subtle",
              placeholder: "text.muted",
              surface: "surface.input",
              text: "text.primary",
            },
            focus: {
              border: "accent.primaryStrong",
            },
          },
          modal: {
            backdrop: "surface.overlay",
            border: "border.subtle",
            surface: "surface.panel",
            text: "text.primary",
          },
          panel: {
            border: "border.subtle",
            shadow: "shadow.panel",
            surface: "surface.panel",
            text: "text.primary",
          },
          window: {
            border: "border.subtle",
            shadow: "shadow.panel",
            surface: "surface.panel",
            text: "text.primary",
          },
        },
        source: {
          kind: "human-brief",
          reference: "surface-style-ops-north-star-v1",
        },
        tokens: {
          accent: {
            primary: "#b8895c",
            primaryStrong: "#d19a66",
            secondary: "#8fbdb7",
          },
          blur: {
            backdrop: "20px",
            glass: "18px",
          },
          border: {
            glow: "rgb(216 154 102 / 0.22)",
            subtle: "rgb(255 244 226 / 0.18)",
          },
          density: {
            control: "comfortable",
            panel: "comfortable",
          },
          motion: {
            durationFast: "110ms",
            durationNormal: "180ms",
          },
          radius: {
            base: "12px",
            surface: "18px",
          },
          shadow: {
            glow: "0 0 24px rgb(216 154 102 / 0.12)",
            panel: "0 22px 64px rgb(42 28 18 / 0.28)",
          },
          status: {
            danger: "#d98b7d",
            info: "#8fbdb7",
            success: "#8fbc9d",
            warning: "#d6a85f",
          },
          surface: {
            app: "#1f1712",
            input: "rgb(255 247 234 / 0.09)",
            overlay: "rgb(29 20 15 / 0.72)",
            panel: "rgb(255 244 226 / 0.16)",
            panelMuted: "rgb(239 215 184 / 0.11)",
            raised: "rgb(255 248 235 / 0.22)",
            shell: "rgb(57 43 32 / 0.56)",
            workspace: "#2a2119",
          },
          text: {
            danger: "#f2b8aa",
            inverse: "#1d140f",
            muted: "#b7a997",
            primary: "#fff6e8",
            secondary: "#e8d9c5",
            success: "#c5e6cf",
            warning: "#f0d199",
          },
          typography: {
            interface: "Geist",
            mono: "Geist Mono",
          },
          workspace: {
            gridPrimary: "rgb(255 244 226 / 0.1)",
            gridSecondary: "rgb(184 137 92 / 0.12)",
            wash: "rgb(184 137 92 / 0.08)",
          },
        },
      },
    },
    metadata: {
      description:
        "Apple/VisionOS-inspired surface style operations skin with pearl text, sand/clay surfaces, muted bronze accents, and soft enterprise command-center chrome.",
      displayName: "Surface Style Ops",
      lifecycle: "validated",
      source: "human-authored",
      tags: [
        "surface-style",
        "visionos",
        "desert-atelier",
        "command-center",
        "token-preview",
      ],
    },
    recipes: {
      adapterCoverage: {
        primitives: "partial",
        windowModal: "partial",
      },
      groups: ["panel", "button", "input", "window", "modal"],
      registryVersion: "recipe-registry-v1",
      source: "manifest",
    },
    slug: "surface-style-ops-skin",
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
        id: "surface-shell-action-icon",
        loading: "critical",
        mime: "image/png",
        role: "action",
        source: {
          kind: "builtin",
          packagePath: "builtin/icons/surface-shell-action.png",
        },
        type: "icon",
      },
      {
        byteSize: 65536,
        dimensions: {
          height: 1024,
          width: 1024,
        },
        fallbackAssetId: "surface-shell-action-icon",
        hash: {
          algorithm: "sha256",
          value: SHA_256_B,
        },
        id: "surface-shell-panel-noise",
        loading: "lazy",
        mime: "image/webp",
        role: "panel-surface",
        source: {
          kind: "packaged",
          contentAddressedPath: "sha256/surface-shell-panel-noise.webp",
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
        icon: "surface-shell-action-icon",
        texture: "surface-shell-panel-noise",
      },
      onMissingCritical: "use-fallback-asset",
      onMissingLazy: "omit-and-warn",
      onMissingOptional: "omit",
      onOversized: "use-fallback-asset",
      onUnsupportedMime: "reject-asset",
    },
    id: "surface-shell-safe-assets",
    kind: "nexus-asset-pack",
    metadata: {
      displayName: "Surface Shell Safe Assets",
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
    slug: "surface-shell-safe-assets",
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
      textureAssetId: "surface-shell-panel-noise",
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
