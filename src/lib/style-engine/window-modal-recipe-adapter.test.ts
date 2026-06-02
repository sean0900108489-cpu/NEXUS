import { describe, expect, it } from "vitest";

import {
  createDefaultWindowModalRecipeAdapterV1,
  createHighContrastCarbonStyleManifestV1,
  createBaselineSurfaceShellStyleManifestV1,
  createWindowModalRecipeAdapterFromManifestV1,
  emitWindowModalRecipeCssVariablesV1,
  NEXUS_WINDOW_MODAL_RECIPE_ADAPTER_VERSION,
  NEXUS_WINDOW_MODAL_RECIPE_FORBIDDEN_BEHAVIOR_KEYS,
} from "@/lib/style-engine";

describe("NEXUS window/modal recipe adapter", () => {
  it("creates a default visual-only adapter shape", () => {
    const adapter = createDefaultWindowModalRecipeAdapterV1();

    expect(adapter).toMatchObject({
      version: NEXUS_WINDOW_MODAL_RECIPE_ADAPTER_VERSION,
      commandPalette: {
        input: "var(--nexus-surface-input)",
        itemActive: "var(--nexus-accent-primary)",
      },
      modal: {
        backdrop: "var(--nexus-surface-overlay)",
        dangerCallout: "var(--nexus-status-danger)",
      },
      window: {
        chromeSurface: "var(--nexus-surface-panel-muted)",
        focusGlow: "var(--nexus-border-glow)",
        surface: "var(--nexus-surface-panel)",
      },
    });
  });

  it("returns fresh nested objects for each default adapter", () => {
    const first = createDefaultWindowModalRecipeAdapterV1();
    const second = createDefaultWindowModalRecipeAdapterV1();

    first.window.surface = "mutated";
    first.modal.dangerCallout = "mutated";
    first.commandPalette.itemActive = "mutated";

    expect(second.window.surface).toBe("var(--nexus-surface-panel)");
    expect(second.modal.dangerCallout).toBe("var(--nexus-status-danger)");
    expect(second.commandPalette.itemActive).toBe(
      "var(--nexus-accent-primary)",
    );
  });

  it("does not emit forbidden window/modal behavior keys", () => {
    const keys = collectKeys(createDefaultWindowModalRecipeAdapterV1());

    for (const forbiddenKey of NEXUS_WINDOW_MODAL_RECIPE_FORBIDDEN_BEHAVIOR_KEYS) {
      expect(keys).not.toContain(forbiddenKey);
    }
  });

  it("maps the baseline Surface Shell manifest to visual recipe values", () => {
    const adapter = createWindowModalRecipeAdapterFromManifestV1(
      createBaselineSurfaceShellStyleManifestV1(),
    );

    expect(adapter).toMatchObject({
      commandPalette: {
        input: "rgb(18 18 18 / 0.72)",
        itemActive: "#e5e5e5",
        overlay: "rgb(16 16 16 / 0.78)",
      },
      modal: {
        backdrop: "rgb(16 16 16 / 0.78)",
        dangerCallout: "#cccccc",
        surface: "rgb(20 20 20 / 0.78)",
      },
      window: {
        border: "rgb(226 232 240 / 0.12)",
        bodySurface: "#111111",
        focusGlow: "rgb(210 210 210 / 0.42)",
        surface: "rgb(20 20 20 / 0.78)",
      },
    });
  });

  it("maps high contrast manifest values without reusing legacy colors", () => {
    const adapter = createWindowModalRecipeAdapterFromManifestV1(
      createHighContrastCarbonStyleManifestV1(),
    );

    expect(adapter.window.surface).toBe("rgb(16 16 16 / 0.94)");
    expect(adapter.window.bodySurface).toBe("#0a0a0a");
    expect(adapter.modal.dangerCallout).toBe("#c7c7c7");
    expect(adapter.commandPalette.input).toBe("rgb(18 18 18 / 0.92)");
    expect(adapter.commandPalette.itemActive).toBe("#d8d8d8");
  });

  it("maps command palette recipe slots independently from modal slots", () => {
    const manifest = createBaselineSurfaceShellStyleManifestV1();
    manifest.recipes.modal.surface = "surface.app";
    manifest.recipes.commandPalette = {
      emptyState: "text.secondary",
      icon: "accent.secondary",
      input: "surface.raised",
      itemActive: "accent.secondary",
      itemDefault: "surface.input",
      itemHover: "surface.shell",
      overlay: "surface.overlay",
      surface: "surface.panelMuted",
    };

    const adapter = createWindowModalRecipeAdapterFromManifestV1(manifest);

    expect(adapter.modal.surface).toBe("#101010");
    expect(adapter.commandPalette.surface).toBe("rgb(18 18 18 / 0.62)");
    expect(adapter.commandPalette.input).toBe("#171717");
    expect(adapter.commandPalette.itemActive).toBe("#d4d4d4");
    expect(adapter.commandPalette.itemDefault).toBe("rgb(18 18 18 / 0.72)");
    expect(adapter.commandPalette.itemHover).toBe("rgb(16 16 16 / 0.88)");
    expect(adapter.commandPalette.emptyState).toBe("#d0d0d0");
  });

  it("emits deterministic recipe-scoped CSS variables", () => {
    const variables = emitWindowModalRecipeCssVariablesV1(
      createWindowModalRecipeAdapterFromManifestV1(
        createBaselineSurfaceShellStyleManifestV1(),
      ),
    );

    expect(Object.keys(variables)).toEqual([...Object.keys(variables)].sort());
    expect(variables).toMatchObject({
      "--nexus-recipe-command-palette-input": "rgb(18 18 18 / 0.72)",
      "--nexus-recipe-command-palette-item-active": "#e5e5e5",
      "--nexus-recipe-command-palette-surface": "rgb(20 20 20 / 0.78)",
      "--nexus-recipe-modal-backdrop": "rgb(16 16 16 / 0.78)",
      "--nexus-recipe-modal-danger-callout": "#cccccc",
      "--nexus-recipe-window-body-surface": "#111111",
      "--nexus-recipe-window-focus-glow": "rgb(210 210 210 / 0.42)",
      "--nexus-recipe-window-surface": "rgb(20 20 20 / 0.78)",
    });
  });
});

function collectKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([key, nextValue]) => [
    key,
    ...collectKeys(nextValue),
  ]);
}
