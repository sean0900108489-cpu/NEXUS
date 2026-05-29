import type { NexusStyleManifestV1 } from "./manifest";

export const LEGACY_CYBERPUNK_STYLE_ID = "legacy-cyberpunk" as const;

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
