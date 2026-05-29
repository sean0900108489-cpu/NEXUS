import { describe, expect, it } from "vitest";

import {
  createDefaultReactFlowStyleAdapterV1,
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
