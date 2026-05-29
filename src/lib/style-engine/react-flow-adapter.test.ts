import { describe, expect, it } from "vitest";

import {
  createDefaultReactFlowStyleAdapterV1,
  createHighContrastCarbonStyleManifestV1,
  createLegacyCyberpunkStyleManifestV1,
  createReactFlowStyleAdapterFromManifestV1,
  emitReactFlowAdapterCssVariablesV1,
  NEXUS_REACT_FLOW_ADAPTER_FORBIDDEN_BEHAVIOR_KEYS,
  NEXUS_REACT_FLOW_ADAPTER_VERSION,
} from "@/lib/style-engine";

describe("NEXUS React Flow visual adapter", () => {
  it("creates a default visual-only adapter shape", () => {
    const adapter = createDefaultReactFlowStyleAdapterV1();

    expect(adapter).toMatchObject({
      version: NEXUS_REACT_FLOW_ADAPTER_VERSION,
      background: {
        color: "var(--nexus-workspace-grid-primary)",
        gap: 24,
        size: 1,
      },
      controls: {
        icon: "var(--nexus-text-primary)",
      },
      edge: {
        selectedStroke: "var(--nexus-accent-primary-strong)",
      },
      handle: {
        source: {
          fill: "var(--nexus-accent-primary)",
        },
        target: {
          fill: "var(--nexus-accent-secondary)",
        },
      },
      node: {
        agent: {
          surface: "var(--nexus-surface-panel)",
        },
        runtime: {
          selectedBorder: "var(--nexus-accent-primary-strong)",
        },
      },
    });
  });

  it("returns fresh nested objects for each default adapter", () => {
    const first = createDefaultReactFlowStyleAdapterV1();
    const second = createDefaultReactFlowStyleAdapterV1();

    first.background.gap = 99;
    first.node.agent.surface = "mutated";
    first.edge.deleteButton.surface = "mutated";

    expect(second.background.gap).toBe(24);
    expect(second.node.agent.surface).toBe("var(--nexus-surface-panel)");
    expect(second.edge.deleteButton.surface).toBe("var(--nexus-surface-panel)");
  });

  it("does not emit forbidden React Flow behavior keys", () => {
    const keys = collectKeys(createDefaultReactFlowStyleAdapterV1());

    for (const forbiddenKey of NEXUS_REACT_FLOW_ADAPTER_FORBIDDEN_BEHAVIOR_KEYS) {
      expect(keys).not.toContain(forbiddenKey);
    }
  });

  it("maps the legacy Cyberpunk manifest to visual adapter values", () => {
    const adapter = createReactFlowStyleAdapterFromManifestV1(
      createLegacyCyberpunkStyleManifestV1(),
    );

    expect(adapter).toMatchObject({
      background: {
        color: "rgb(34 211 238 / 0.12)",
      },
      controls: {
        hoverSurface: "#0f172a",
        icon: "#f8fafc",
      },
      edge: {
        defaultStroke: "#64748b",
        runtimeStroke: "#67e8f9",
        selectedStroke: "#22d3ee",
      },
      handle: {
        source: {
          border: "#030712",
          fill: "#67e8f9",
        },
        target: {
          fill: "#f0abfc",
        },
      },
      node: {
        agent: {
          surface: "rgb(8 16 22 / 0.78)",
          text: "#f8fafc",
        },
        runtime: {
          selectedBorder: "#22d3ee",
          surface: "#0f172a",
        },
      },
    });
  });

  it("maps high contrast manifest values without reusing legacy colors", () => {
    const adapter = createReactFlowStyleAdapterFromManifestV1(
      createHighContrastCarbonStyleManifestV1(),
    );

    expect(adapter.background.color).toBe("rgb(56 189 248 / 0.16)");
    expect(adapter.node.agent.surface).toBe("rgb(16 16 16 / 0.94)");
    expect(adapter.node.runtime.surface).toBe("#18181b");
    expect(adapter.handle.target.fill).toBe("#facc15");
    expect(adapter.edge.selectedStroke).toBe("#0ea5e9");
    expect(adapter.controls.icon).toBe("#ffffff");
  });

  it("emits deterministic graph-scoped CSS variables", () => {
    const variables = emitReactFlowAdapterCssVariablesV1(
      createReactFlowStyleAdapterFromManifestV1(
        createLegacyCyberpunkStyleManifestV1(),
      ),
    );

    expect(Object.keys(variables)).toEqual([...Object.keys(variables)].sort());
    expect(variables).toMatchObject({
      "--nexus-graph-background-color": "rgb(34 211 238 / 0.12)",
      "--nexus-graph-edge-selected-stroke": "#22d3ee",
      "--nexus-graph-handle-source-fill": "#67e8f9",
      "--nexus-graph-handle-target-fill": "#f0abfc",
      "--nexus-graph-minimap-node-stroke-width": "2",
      "--nexus-graph-node-agent-surface": "rgb(8 16 22 / 0.78)",
      "--nexus-graph-node-runtime-surface": "#0f172a",
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
