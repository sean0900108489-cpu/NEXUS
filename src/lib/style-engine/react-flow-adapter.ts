import type {
  NexusStyleManifestV1,
  NexusStyleTokenGroupNameV1,
} from "./manifest";

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

export type NexusReactFlowAdapterCssVariablesV1 = Record<
  `--nexus-graph-${string}`,
  string
>;

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

export function createReactFlowStyleAdapterFromManifestV1(
  manifest: NexusStyleManifestV1,
): NexusReactFlowStyleAdapterV1 {
  const fallback = DEFAULT_NEXUS_REACT_FLOW_STYLE_ADAPTER_V1;
  const token = (
    group: NexusStyleTokenGroupNameV1,
    name: string,
    fallbackValue: string,
  ) => readManifestToken(manifest, group, name, fallbackValue);

  return {
    version: NEXUS_REACT_FLOW_ADAPTER_VERSION,
    background: {
      color: token("workspace", "gridPrimary", fallback.background.color),
      gap: fallback.background.gap,
      size: fallback.background.size,
    },
    node: {
      agent: {
        surface: token("surface", "panel", fallback.node.agent.surface),
        border: token("border", "subtle", fallback.node.agent.border),
        text: token("text", "primary", fallback.node.agent.text),
        mutedText: token("text", "muted", fallback.node.agent.mutedText),
        activeGlow: token("border", "glow", fallback.node.agent.activeGlow),
        selectedGlow: token("accent", "primary", fallback.node.agent.selectedGlow),
      },
      runtime: {
        surface: token("surface", "raised", fallback.node.runtime.surface),
        border: token("border", "subtle", fallback.node.runtime.border),
        selectedBorder: token(
          "accent",
          "primaryStrong",
          fallback.node.runtime.selectedBorder,
        ),
        text: token("text", "primary", fallback.node.runtime.text),
        mutedText: token("text", "muted", fallback.node.runtime.mutedText),
        shadow: token("shadow", "panel", fallback.node.runtime.shadow),
      },
    },
    handle: {
      source: {
        fill: token("accent", "primary", fallback.handle.source.fill),
        border: token("surface", "app", fallback.handle.source.border),
        glow: token("border", "glow", fallback.handle.source.glow),
      },
      target: {
        fill: token("accent", "secondary", fallback.handle.target.fill),
        border: token("surface", "app", fallback.handle.target.border),
        glow: token("border", "glow", fallback.handle.target.glow),
      },
    },
    edge: {
      defaultStroke: token("text", "muted", fallback.edge.defaultStroke),
      runtimeStroke: token("accent", "primary", fallback.edge.runtimeStroke),
      selectedStroke: token(
        "accent",
        "primaryStrong",
        fallback.edge.selectedStroke,
      ),
      glow: token("border", "glow", fallback.edge.glow),
      animatedDash: fallback.edge.animatedDash,
      deleteButton: {
        surface: token("surface", "panel", fallback.edge.deleteButton.surface),
        border: token("border", "subtle", fallback.edge.deleteButton.border),
        text: token("text", "primary", fallback.edge.deleteButton.text),
        hoverSurface: token(
          "surface",
          "raised",
          fallback.edge.deleteButton.hoverSurface,
        ),
      },
    },
    minimap: {
      surface: token("surface", "panelMuted", fallback.minimap.surface),
      mask: token("surface", "overlay", fallback.minimap.mask),
      nodeFallback: token("accent", "primary", fallback.minimap.nodeFallback),
      nodeStrokeWidth: fallback.minimap.nodeStrokeWidth,
    },
    controls: {
      surface: token("surface", "panel", fallback.controls.surface),
      border: token("border", "subtle", fallback.controls.border),
      icon: token("text", "primary", fallback.controls.icon),
      hoverSurface: token("surface", "raised", fallback.controls.hoverSurface),
    },
  };
}

export function emitReactFlowAdapterCssVariablesV1(
  adapter: NexusReactFlowStyleAdapterV1,
): NexusReactFlowAdapterCssVariablesV1 {
  return {
    "--nexus-graph-background-color": adapter.background.color,
    "--nexus-graph-background-gap": String(adapter.background.gap),
    "--nexus-graph-background-size": String(adapter.background.size),
    "--nexus-graph-controls-border": adapter.controls.border,
    "--nexus-graph-controls-hover-surface": adapter.controls.hoverSurface,
    "--nexus-graph-controls-icon": adapter.controls.icon,
    "--nexus-graph-controls-surface": adapter.controls.surface,
    "--nexus-graph-edge-animated-dash": adapter.edge.animatedDash,
    "--nexus-graph-edge-default-stroke": adapter.edge.defaultStroke,
    "--nexus-graph-edge-delete-button-border": adapter.edge.deleteButton.border,
    "--nexus-graph-edge-delete-button-hover-surface":
      adapter.edge.deleteButton.hoverSurface,
    "--nexus-graph-edge-delete-button-surface": adapter.edge.deleteButton.surface,
    "--nexus-graph-edge-delete-button-text": adapter.edge.deleteButton.text,
    "--nexus-graph-edge-glow": adapter.edge.glow,
    "--nexus-graph-edge-runtime-stroke": adapter.edge.runtimeStroke,
    "--nexus-graph-edge-selected-stroke": adapter.edge.selectedStroke,
    "--nexus-graph-handle-source-border": adapter.handle.source.border,
    "--nexus-graph-handle-source-fill": adapter.handle.source.fill,
    "--nexus-graph-handle-source-glow": adapter.handle.source.glow,
    "--nexus-graph-handle-target-border": adapter.handle.target.border,
    "--nexus-graph-handle-target-fill": adapter.handle.target.fill,
    "--nexus-graph-handle-target-glow": adapter.handle.target.glow,
    "--nexus-graph-minimap-mask": adapter.minimap.mask,
    "--nexus-graph-minimap-node-fallback": adapter.minimap.nodeFallback,
    "--nexus-graph-minimap-node-stroke-width": String(
      adapter.minimap.nodeStrokeWidth,
    ),
    "--nexus-graph-minimap-surface": adapter.minimap.surface,
    "--nexus-graph-node-agent-active-glow": adapter.node.agent.activeGlow,
    "--nexus-graph-node-agent-border": adapter.node.agent.border,
    "--nexus-graph-node-agent-muted-text": adapter.node.agent.mutedText,
    "--nexus-graph-node-agent-selected-glow": adapter.node.agent.selectedGlow,
    "--nexus-graph-node-agent-surface": adapter.node.agent.surface,
    "--nexus-graph-node-agent-text": adapter.node.agent.text,
    "--nexus-graph-node-runtime-border": adapter.node.runtime.border,
    "--nexus-graph-node-runtime-muted-text": adapter.node.runtime.mutedText,
    "--nexus-graph-node-runtime-selected-border":
      adapter.node.runtime.selectedBorder,
    "--nexus-graph-node-runtime-shadow": adapter.node.runtime.shadow,
    "--nexus-graph-node-runtime-surface": adapter.node.runtime.surface,
    "--nexus-graph-node-runtime-text": adapter.node.runtime.text,
  };
}

function readManifestToken(
  manifest: NexusStyleManifestV1,
  group: NexusStyleTokenGroupNameV1,
  name: string,
  fallback: string,
) {
  const value = manifest.tokens[group][name];

  return value === undefined ? fallback : String(value);
}
