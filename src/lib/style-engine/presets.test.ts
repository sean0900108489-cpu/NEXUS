import { describe, expect, it } from "vitest";

import {
  createHighContrastCarbonStyleManifestV1,
  compileNexusStyleManifestV1,
  createLegacyCyberpunkStyleManifestV1,
  HIGH_CONTRAST_CARBON_STYLE_ID,
  LEGACY_CYBERPUNK_STYLE_ID,
  validateNexusStyleManifestV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine built-in presets", () => {
  it("creates a fresh legacy Cyberpunk manifest each time", () => {
    const first = createLegacyCyberpunkStyleManifestV1();
    const second = createLegacyCyberpunkStyleManifestV1();

    first.tokens.surface.app = "#000000";

    expect(first.id).toBe(LEGACY_CYBERPUNK_STYLE_ID);
    expect(second.tokens.surface.app).toBe("#030712");
  });

  it("validates the legacy Cyberpunk manifest", () => {
    const report = validateNexusStyleManifestV1(createLegacyCyberpunkStyleManifestV1());

    expect(report.accepted).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([
      {
        code: "style.accessibility.highContrastNotRequested",
        message: "High contrast is not requested; preview remains allowed.",
        path: "$.intent.contrast",
      },
    ]);
  });

  it("compiles the legacy Cyberpunk manifest through the pure compiler", () => {
    const result = compileNexusStyleManifestV1(createLegacyCyberpunkStyleManifestV1());

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected preset to compile.");
    }

    expect(result.style.cssVariables).toMatchObject({
      "--nexus-surface-app": "#030712",
      "--nexus-surface-panel": "rgb(8 16 22 / 0.78)",
      "--nexus-text-primary": "#f8fafc",
      "--nexus-workspace-grid-primary": "rgb(34 211 238 / 0.12)",
    });
    expect(result.style.legacyCssVariables).toMatchObject({
      "--bg-base": "var(--nexus-surface-app)",
      "--panel-bg": "var(--nexus-surface-panel)",
      "--text-main": "var(--nexus-text-primary)",
      "--theme-primary": "var(--nexus-accent-primary)",
    });
    expect(result.style.adapters.nextThemes).toEqual({
      colorScheme: "dark",
      dataTheme: "cyberpunk",
    });
  });

  it("creates a fresh high contrast manifest without mutating legacy output", () => {
    const highContrast = createHighContrastCarbonStyleManifestV1();
    const legacy = createLegacyCyberpunkStyleManifestV1();

    highContrast.tokens.surface.app = "#111111";

    expect(highContrast.id).toBe(HIGH_CONTRAST_CARBON_STYLE_ID);
    expect(legacy.tokens.surface.app).toBe("#030712");
    expect(createHighContrastCarbonStyleManifestV1().tokens.surface.app).toBe(
      "#050505",
    );
  });

  it("validates the high contrast manifest without accessibility warnings", () => {
    const report = validateNexusStyleManifestV1(
      createHighContrastCarbonStyleManifestV1(),
    );

    expect(report).toMatchObject({
      accepted: true,
      errors: [],
      warnings: [],
    });
  });

  it("compiles the high contrast manifest through the pure compiler", () => {
    const result = compileNexusStyleManifestV1(
      createHighContrastCarbonStyleManifestV1(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected high contrast preset to compile.");
    }

    expect(result.style.cssVariables).toMatchObject({
      "--nexus-accent-primary": "#38bdf8",
      "--nexus-surface-app": "#050505",
      "--nexus-surface-panel": "rgb(16 16 16 / 0.94)",
      "--nexus-text-primary": "#ffffff",
    });
    expect(result.style.adapters.nextThemes).toEqual({
      colorScheme: "dark",
      dataTheme: "terminal",
    });
  });
});
