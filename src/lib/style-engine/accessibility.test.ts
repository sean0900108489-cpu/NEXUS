import { describe, expect, it } from "vitest";

import {
  evaluateNexusStyleTextContrast,
  getNexusStyleContrastRatio,
  validateNexusStyleManifestV1,
  type NexusStyleManifestV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine accessibility helpers", () => {
  it("calculates WCAG-style contrast ratios for hex and opaque rgb colors", () => {
    expect(getNexusStyleContrastRatio("#000000", "#ffffff")).toBe(21);
    expect(getNexusStyleContrastRatio("#777777", "#ffffff")).toBe(4.48);
    expect(getNexusStyleContrastRatio("rgb(0 0 0)", "#ffffff")).toBe(21);
    expect(getNexusStyleContrastRatio("rgb(119, 119, 119)", "#ffffff")).toBe(
      4.48,
    );
    expect(getNexusStyleContrastRatio("rgba(0, 0, 0, 1)", "#ffffff")).toBe(21);
  });

  it("returns null for unsupported or translucent color formats instead of guessing", () => {
    expect(getNexusStyleContrastRatio("rgb(0 0 0 / 0.5)", "#ffffff")).toBeNull();
    expect(evaluateNexusStyleTextContrast("#ffffff", "var(--bg-base)")).toBeNull();
  });

  it("rejects low primary text contrast when token colors are parseable", () => {
    const manifest = createContrastManifest();

    manifest.tokens.text.primary = "#333333";
    manifest.tokens.surface.app = "#222222";

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.accessibility.primaryTextContrast",
      message: "Primary text contrast against app surface is below the required ratio.",
      path: "$.tokens.text.primary",
    });
  });

  it("rejects low secondary text contrast against panels when token colors are parseable", () => {
    const manifest = createContrastManifest();

    manifest.tokens.text.secondary = "#333333";
    manifest.tokens.surface.panel = "rgb(34 34 34)";

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.accessibility.secondaryTextContrast",
      message:
        "Secondary text contrast against panel surface is below the required ratio.",
      path: "$.tokens.text.secondary",
    });
  });
});

function createContrastManifest(): NexusStyleManifestV1 {
  return {
    schemaVersion: 1,
    id: "contrast-check",
    name: "Contrast Check",
    mode: "dark",
    intent: {
      mood: ["calm"],
      material: ["solid"],
      density: "comfortable",
      motion: "minimal",
      contrast: "high",
    },
    tokens: {
      accent: {
        primary: "#67e8f9",
        primaryStrong: "#22d3ee",
      },
      blur: {
        glass: "0px",
      },
      border: {
        subtle: "#475569",
      },
      density: {},
      motion: {},
      radius: {
        surface: "4px",
      },
      shadow: {
        panel: "0 0 0 #000000",
      },
      status: {
        danger: "#fda4af",
        success: "#6ee7b7",
        warning: "#fcd34d",
      },
      surface: {
        app: "#000000",
        panel: "#111111",
        workspace: "#050505",
      },
      text: {
        muted: "#94a3b8",
        primary: "#ffffff",
        secondary: "#cbd5e1",
      },
      typography: {},
      workspace: {},
    },
    recipes: {
      badge: {},
      button: {},
      commandPalette: {},
      dock: {},
      input: {},
      modal: {},
      panel: {},
      window: {},
    },
    adapters: {},
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
