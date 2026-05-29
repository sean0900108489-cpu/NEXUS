import type { NexusStyleManifestV1 } from "./manifest";

export const LEGACY_CYBERPUNK_STYLE_ID = "legacy-cyberpunk" as const;
export const HIGH_CONTRAST_CARBON_STYLE_ID =
  "high-contrast-carbon" as const;

export function createLegacyCyberpunkStyleManifestV1(): NexusStyleManifestV1 {
  return {
    schemaVersion: 1,
    id: LEGACY_CYBERPUNK_STYLE_ID,
    name: "Legacy Cyberpunk",
    description: "Source-aligned V1 manifest for the existing default NEXUS theme.",
    source: {
      kind: "legacy-preset",
      reference: "globals.css data-theme cyberpunk variables",
    },
    mode: "dark",
    intent: {
      mood: ["operational", "neon", "high-focus"],
      material: ["glass", "dark-metal"],
      density: "compact",
      motion: "standard",
      contrast: "standard",
    },
    tokens: {
      accent: {
        primary: "#67e8f9",
        primaryStrong: "#22d3ee",
        secondary: "#f0abfc",
      },
      blur: {
        backdrop: "16px",
        glass: "8px",
      },
      border: {
        glow: "rgb(34 211 238 / 0.42)",
        subtle: "rgb(226 232 240 / 0.12)",
      },
      density: {
        control: "compact",
        panel: "compact",
      },
      motion: {
        durationFast: "140ms",
        durationNormal: "220ms",
      },
      radius: {
        base: "4px",
        surface: "4px",
      },
      shadow: {
        glow: "0 0 28px rgb(34 211 238 / 0.22)",
        panel: "0 24px 80px rgb(0 0 0 / 0.38)",
      },
      status: {
        danger: "#fda4af",
        info: "#67e8f9",
        success: "#6ee7b7",
        warning: "#fcd34d",
      },
      surface: {
        app: "#030712",
        input: "rgb(15 23 42 / 0.72)",
        overlay: "rgb(2 6 23 / 0.78)",
        panel: "rgb(8 16 22 / 0.78)",
        panelMuted: "rgb(15 23 42 / 0.62)",
        raised: "#0f172a",
        shell: "rgb(2 6 23 / 0.88)",
        workspace: "#020617",
      },
      text: {
        danger: "#fda4af",
        inverse: "#020617",
        muted: "#64748b",
        primary: "#f8fafc",
        secondary: "#cbd5e1",
        success: "#6ee7b7",
        warning: "#fcd34d",
      },
      typography: {
        interface: "Geist",
        mono: "Geist Mono",
      },
      workspace: {
        gridPrimary: "rgb(34 211 238 / 0.12)",
        gridSecondary: "rgb(244 114 182 / 0.11)",
        wash: "rgb(34 211 238 / 0.08)",
      },
    },
    recipes: {
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
          surface: "surface.panel",
          text: "text.primary",
        },
      },
      commandPalette: {
        emptyState: "text.muted",
        icon: "accent.primary",
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
    adapters: {
      nextThemes: {
        colorScheme: "dark",
        dataTheme: "cyberpunk",
      },
      tailwindBridge: {
        enabled: true,
        legacyVariableMode: "preserve",
      },
    },
    constraints: {
      allowBackendMutation: false,
      allowDynamicTailwind: false,
      allowJavaScript: false,
      allowRawCss: false,
      allowSyncMutation: false,
      allowWorkspaceMutation: false,
      maxCssVariableCount: 180,
      protectedBehaviorClasses: [],
    },
  };
}

export function createHighContrastCarbonStyleManifestV1(): NexusStyleManifestV1 {
  const manifest = createLegacyCyberpunkStyleManifestV1();

  return {
    ...manifest,
    adapters: {
      ...manifest.adapters,
      nextThemes: {
        colorScheme: "dark",
        dataTheme: "terminal",
      },
    },
    description:
      "High-contrast V1 manifest for dense operational review surfaces.",
    id: HIGH_CONTRAST_CARBON_STYLE_ID,
    intent: {
      contrast: "high",
      density: "comfortable",
      material: ["carbon", "matte-glass"],
      mood: ["focused", "legible", "low-glare"],
      motion: "minimal",
    },
    name: "High Contrast Carbon",
    source: {
      kind: "legacy-preset",
      reference: "built-in high contrast carbon preset",
    },
    tokens: {
      ...manifest.tokens,
      accent: {
        primary: "#38bdf8",
        primaryStrong: "#0ea5e9",
        secondary: "#facc15",
      },
      blur: {
        backdrop: "10px",
        glass: "4px",
      },
      border: {
        glow: "rgb(56 189 248 / 0.36)",
        subtle: "rgb(255 255 255 / 0.24)",
      },
      density: {
        control: "comfortable",
        panel: "comfortable",
      },
      motion: {
        durationFast: "90ms",
        durationNormal: "140ms",
      },
      radius: {
        base: "3px",
        surface: "3px",
      },
      shadow: {
        glow: "0 0 22px rgb(56 189 248 / 0.18)",
        panel: "0 18px 52px rgb(0 0 0 / 0.46)",
      },
      status: {
        danger: "#fb7185",
        info: "#38bdf8",
        success: "#22c55e",
        warning: "#facc15",
      },
      surface: {
        app: "#050505",
        input: "rgb(18 18 18 / 0.92)",
        overlay: "rgb(0 0 0 / 0.82)",
        panel: "rgb(16 16 16 / 0.94)",
        panelMuted: "rgb(28 28 28 / 0.88)",
        raised: "#18181b",
        shell: "rgb(8 8 8 / 0.96)",
        workspace: "#0a0a0a",
      },
      text: {
        danger: "#fecdd3",
        inverse: "#050505",
        muted: "#a1a1aa",
        primary: "#ffffff",
        secondary: "#e4e4e7",
        success: "#bbf7d0",
        warning: "#fef08a",
      },
      workspace: {
        gridPrimary: "rgb(56 189 248 / 0.16)",
        gridSecondary: "rgb(250 204 21 / 0.12)",
        wash: "rgb(255 255 255 / 0.04)",
      },
    },
  };
}
