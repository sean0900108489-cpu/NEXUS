import { describe, expect, it } from "vitest";

import {
  createDefaultWindowModalRecipeAdapterV1,
  createHighContrastCarbonStyleManifestV1,
  createLegacyCyberpunkStyleManifestV1,
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

  it("maps the legacy Cyberpunk manifest to visual recipe values", () => {
    const adapter = createWindowModalRecipeAdapterFromManifestV1(
      createLegacyCyberpunkStyleManifestV1(),
    );

    expect(adapter).toMatchObject({
      commandPalette: {
        input: "rgb(15 23 42 / 0.72)",
        itemActive: "#67e8f9",
        overlay: "rgb(2 6 23 / 0.78)",
      },
      modal: {
        backdrop: "rgb(2 6 23 / 0.78)",
        dangerCallout: "#fda4af",
        surface: "rgb(8 16 22 / 0.78)",
      },
      window: {
        border: "rgb(226 232 240 / 0.12)",
        bodySurface: "#020617",
        focusGlow: "rgb(34 211 238 / 0.42)",
        surface: "rgb(8 16 22 / 0.78)",
      },
    });
  });

  it("maps high contrast manifest values without reusing legacy colors", () => {
    const adapter = createWindowModalRecipeAdapterFromManifestV1(
      createHighContrastCarbonStyleManifestV1(),
    );

    expect(adapter.window.surface).toBe("rgb(16 16 16 / 0.94)");
    expect(adapter.window.bodySurface).toBe("#0a0a0a");
    expect(adapter.modal.dangerCallout).toBe("#fb7185");
    expect(adapter.commandPalette.input).toBe("rgb(18 18 18 / 0.92)");
    expect(adapter.commandPalette.itemActive).toBe("#38bdf8");
  });

  it("emits deterministic recipe-scoped CSS variables", () => {
    const variables = emitWindowModalRecipeCssVariablesV1(
      createWindowModalRecipeAdapterFromManifestV1(
        createLegacyCyberpunkStyleManifestV1(),
      ),
    );

    expect(Object.keys(variables)).toEqual([...Object.keys(variables)].sort());
    expect(variables).toMatchObject({
      "--nexus-recipe-command-palette-input": "rgb(15 23 42 / 0.72)",
      "--nexus-recipe-command-palette-item-active": "#67e8f9",
      "--nexus-recipe-modal-backdrop": "rgb(2 6 23 / 0.78)",
      "--nexus-recipe-modal-danger-callout": "#fda4af",
      "--nexus-recipe-window-body-surface": "#020617",
      "--nexus-recipe-window-focus-glow": "rgb(34 211 238 / 0.42)",
      "--nexus-recipe-window-surface": "rgb(8 16 22 / 0.78)",
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
