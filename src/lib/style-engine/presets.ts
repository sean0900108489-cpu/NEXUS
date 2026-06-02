import type { NexusStyleManifestV1 } from "./manifest";

export const BASELINE_SURFACE_SHELL_STYLE_ID = "baseline-surface-shell" as const;
export const HIGH_CONTRAST_CARBON_STYLE_ID =
  "high-contrast-carbon" as const;

export function createBaselineSurfaceShellStyleManifestV1(): NexusStyleManifestV1 {
  return {
    schemaVersion: 1,
    id: BASELINE_SURFACE_SHELL_STYLE_ID,
    name: "Baseline Surface Shell",
    description: "Source-aligned V1 manifest for the existing default NEXUS theme.",
    source: {
      kind: "legacy-preset",
      reference: "globals.css data-theme surface-shell variables",
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
        primary: "#e5e5e5",
        primaryStrong: "#d4d4d4",
        secondary: "#d4d4d4",
      },
      blur: {
        backdrop: "16px",
        glass: "8px",
      },
      border: {
        glow: "rgb(210 210 210 / 0.42)",
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
        glow: "0 0 28px rgb(210 210 210 / 0.22)",
        panel: "0 24px 80px rgb(0 0 0 / 0.38)",
      },
      status: {
        danger: "#cccccc",
        info: "#e5e5e5",
        success: "#d6d6d6",
        warning: "#eeeeee",
      },
      surface: {
        app: "#101010",
        input: "rgb(18 18 18 / 0.72)",
        overlay: "rgb(16 16 16 / 0.78)",
        panel: "rgb(20 20 20 / 0.78)",
        panelMuted: "rgb(18 18 18 / 0.62)",
        raised: "#171717",
        shell: "rgb(16 16 16 / 0.88)",
        workspace: "#111111",
      },
      text: {
        danger: "#cccccc",
        inverse: "#111111",
        muted: "#8a8a8a",
        primary: "#f5f5f5",
        secondary: "#d0d0d0",
        success: "#d6d6d6",
        warning: "#eeeeee",
      },
      typography: {
        interface: "Geist",
        mono: "Geist Mono",
      },
      workspace: {
        gridPrimary: "rgb(210 210 210 / 0.12)",
        gridSecondary: "rgb(196 196 196 / 0.11)",
        wash: "rgb(210 210 210 / 0.08)",
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
        dataTheme: "surface-shell",
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
  const manifest = createBaselineSurfaceShellStyleManifestV1();

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
        primary: "#d8d8d8",
        primaryStrong: "#c8c8c8",
        secondary: "#eeeeee",
      },
      blur: {
        backdrop: "10px",
        glass: "4px",
      },
      border: {
        glow: "rgb(216 216 216 / 0.36)",
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
        glow: "0 0 22px rgb(216 216 216 / 0.18)",
        panel: "0 18px 52px rgb(0 0 0 / 0.46)",
      },
      status: {
        danger: "#c7c7c7",
        info: "#d8d8d8",
        success: "#d6d6d6",
        warning: "#eeeeee",
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
        success: "#d6d6d6",
        warning: "#eeeeee",
      },
      workspace: {
        gridPrimary: "rgb(216 216 216 / 0.16)",
        gridSecondary: "rgb(205 205 205 / 0.12)",
        wash: "rgb(255 255 255 / 0.04)",
      },
    },
  };
}
