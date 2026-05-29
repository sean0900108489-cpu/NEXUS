export const NEXUS_REACT_FLOW_ADAPTER_VERSION =
  "nexus-react-flow-adapter-v1" as const;

export const NEXUS_REACT_FLOW_ADAPTER_FORBIDDEN_BEHAVIOR_KEYS = [
  "deleteKeyCode",
  "edgeIds",
  "handleIds",
  "hitPathStrokeWidth",
  "interactionWidth",
  "nodeIds",
  "nodesDraggable",
  "onConnect",
  "onEdgeClick",
  "onNodeDragStop",
  "onPaneClick",
  "panOnDrag",
  "pointerEvents",
  "selectors",
  "zIndex",
  "zoomOnScroll",
] as const;

export type NexusReactFlowStyleAdapterV1 = {
  version: typeof NEXUS_REACT_FLOW_ADAPTER_VERSION;
  background: {
    color: string;
    gap: number;
    size: number;
  };
  node: {
    agent: {
      surface: string;
      border: string;
      text: string;
      mutedText: string;
      activeGlow: string;
      selectedGlow: string;
    };
    runtime: {
      surface: string;
      border: string;
      selectedBorder: string;
      text: string;
      mutedText: string;
      shadow: string;
    };
  };
  handle: {
    source: {
      fill: string;
      border: string;
      glow: string;
    };
    target: {
      fill: string;
      border: string;
      glow: string;
    };
  };
  edge: {
    defaultStroke: string;
    runtimeStroke: string;
    selectedStroke: string;
    glow: string;
    animatedDash: string;
    deleteButton: {
      surface: string;
      border: string;
      text: string;
      hoverSurface: string;
    };
  };
  minimap: {
    surface: string;
    mask: string;
    nodeFallback: string;
    nodeStrokeWidth: number;
  };
  controls: {
    surface: string;
    border: string;
    icon: string;
    hoverSurface: string;
  };
};

export const DEFAULT_NEXUS_REACT_FLOW_STYLE_ADAPTER_V1 = {
  version: NEXUS_REACT_FLOW_ADAPTER_VERSION,
  background: {
    color: "var(--nexus-workspace-grid-primary)",
    gap: 24,
    size: 1,
  },
  node: {
    agent: {
      surface: "var(--nexus-surface-panel)",
      border: "var(--nexus-border-subtle)",
      text: "var(--nexus-text-primary)",
      mutedText: "var(--nexus-text-muted)",
      activeGlow: "var(--nexus-border-glow)",
      selectedGlow: "var(--nexus-accent-primary)",
    },
    runtime: {
      surface: "var(--nexus-surface-raised)",
      border: "var(--nexus-border-subtle)",
      selectedBorder: "var(--nexus-accent-primary-strong)",
      text: "var(--nexus-text-primary)",
      mutedText: "var(--nexus-text-muted)",
      shadow: "var(--nexus-shadow-panel)",
    },
  },
  handle: {
    source: {
      fill: "var(--nexus-accent-primary)",
      border: "var(--nexus-surface-app)",
      glow: "var(--nexus-border-glow)",
    },
    target: {
      fill: "var(--nexus-accent-secondary)",
      border: "var(--nexus-surface-app)",
      glow: "var(--nexus-border-glow)",
    },
  },
  edge: {
    defaultStroke: "var(--nexus-text-muted)",
    runtimeStroke: "var(--nexus-accent-primary)",
    selectedStroke: "var(--nexus-accent-primary-strong)",
    glow: "var(--nexus-border-glow)",
    animatedDash: "6 4",
    deleteButton: {
      surface: "var(--nexus-surface-panel)",
      border: "var(--nexus-border-subtle)",
      text: "var(--nexus-text-primary)",
      hoverSurface: "var(--nexus-surface-raised)",
    },
  },
  minimap: {
    surface: "var(--nexus-surface-panel-muted)",
    mask: "var(--nexus-surface-overlay)",
    nodeFallback: "var(--nexus-accent-primary)",
    nodeStrokeWidth: 2,
  },
  controls: {
    surface: "var(--nexus-surface-panel)",
    border: "var(--nexus-border-subtle)",
    icon: "var(--nexus-text-primary)",
    hoverSurface: "var(--nexus-surface-raised)",
  },
} as const satisfies NexusReactFlowStyleAdapterV1;

export function createDefaultReactFlowStyleAdapterV1(): NexusReactFlowStyleAdapterV1 {
  const adapter = DEFAULT_NEXUS_REACT_FLOW_STYLE_ADAPTER_V1;

  return {
    version: adapter.version,
    background: { ...adapter.background },
    node: {
      agent: { ...adapter.node.agent },
      runtime: { ...adapter.node.runtime },
    },
    handle: {
      source: { ...adapter.handle.source },
      target: { ...adapter.handle.target },
    },
    edge: {
      ...adapter.edge,
      deleteButton: { ...adapter.edge.deleteButton },
    },
    minimap: { ...adapter.minimap },
    controls: { ...adapter.controls },
  };
}
