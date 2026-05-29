# NEXUS React Flow Style Boundary

Phase: V1 / V10 preparation
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: documentation-only boundary. No graph code changed.

## 0. Boundary Decision

React Flow styling must move through an adapter contract, not through direct
manifest control of React Flow internals.

Allowed later:

- Visual tokens for node fill/stroke/text.
- Visual tokens for edge stroke/width/glow/dash.
- Visual tokens for handles.
- Visual tokens for background/grid/minimap/controls.

Forbidden unless a later behavior phase explicitly owns it:

- Pan/zoom behavior.
- Node drag behavior.
- Selection behavior.
- Edge connection logic.
- Handle ids and source/target rules.
- `nodrag`, `nopan`, `nowheel`.
- Arbitrary selector injection.
- Free-form `pointer-events`, z-index, or hit-width mutation.

## 1. Current Graph Style Anchors

Global CSS anchors:

- `.react-flow`: `src/app/globals.css:452`
- `.react-flow__pane`: `src/app/globals.css:458`
- `.react-flow__handle`: `src/app/globals.css:466`
- `.react-flow__edge-path`: `src/app/globals.css:470`
- `.nexus-flow-edge`: `src/app/globals.css:474`
- `.nexus-flow-edge-selected`: `src/app/globals.css:480`
- `.nexus-flow-edge-hit`: `src/app/globals.css:486`
- `.nexus-edge-delete`: `src/app/globals.css:492`
- `.nexus-agent-node`: `src/app/globals.css:520`
- `.react-flow__controls`, `.react-flow__minimap`: `src/app/globals.css:585`

Component anchors:

- Agent node shell: `src/components/nexus/nexus-graph.tsx:125`
- Runtime node shell: `src/components/nexus/nexus-graph.tsx:197`
- Runtime handle colors: `src/components/nexus/nexus-graph.tsx:293`
- Edge hit path and delete affordance: `src/components/nexus/nexus-graph.tsx:468`
- React Flow defaults: `src/components/nexus/nexus-graph.tsx:851`
- Node drag persistence: `src/components/nexus/nexus-graph.tsx:885`
- Graph background/minimap/controls: `src/components/nexus/nexus-graph.tsx:923`

## 2. Current Visual Slots

| Slot | Current source | Future adapter token |
| --- | --- | --- |
| Graph font/color | `.react-flow` global CSS | `graph.text.default`, `graph.font.family` |
| Pane cursor | `.react-flow__pane` global CSS | Protected behavior, not style token |
| Handle glow | `.react-flow__handle` global CSS | `graph.handle.glow` |
| Edge glow | `.react-flow__edge-path` global CSS | `graph.edge.glow` |
| Default animated edge | `.nexus-flow-edge` global CSS | `graph.edge.default` |
| Selected edge | `.nexus-flow-edge-selected` global CSS | `graph.edge.selected` |
| Edge hit path | `.nexus-flow-edge-hit` | Protected behavior; visual cursor only with care |
| Edge delete affordance | `.nexus-edge-delete` | `graph.edge.deleteButton` visual only |
| Agent node shell | `nexus-agent-node` plus inline accent style | `graph.node.agent` |
| Runtime node shell | `nexus-runtime-node` classes | `graph.node.runtime` |
| Background grid | `<Background color gap size>` | `graph.background` |
| Minimap mask/node | `<MiniMap maskColor nodeColor>` | `graph.minimap` |
| Controls | `<Controls>` plus global selectors | `graph.controls` |

## 3. Protected Behavior Anchors

Do not change without a dedicated behavior gate:

- `nodesDraggable`: `src/components/nexus/nexus-graph.tsx:882`
- `onNodeDragStop`: `src/components/nexus/nexus-graph.tsx:885`
- `onConnect`: `src/components/nexus/nexus-graph.tsx:877`
- `onEdgeClick`: `src/components/nexus/nexus-graph.tsx:878`
- `onPaneClick`: `src/components/nexus/nexus-graph.tsx:895`
- `deleteKeyCode`: `src/components/nexus/nexus-graph.tsx:863`
- Edge delete keyboard behavior: `src/components/nexus/nexus-graph.tsx:507`
- `interactionWidth={32}`: `src/components/nexus/nexus-graph.tsx:462`
- Transparent hit path `strokeWidth={36}`: `src/components/nexus/nexus-graph.tsx:474`
- `pannable` and `zoomable` minimap props: `src/components/nexus/nexus-graph.tsx:929`

## 4. Adapter Shape Draft

Future contract direction, not implemented in this phase:

```ts
type NexusReactFlowStyleAdapterV1 = {
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
      activeGlow: string;
    };
    runtime: {
      surface: string;
      border: string;
      text: string;
      selectedBorder: string;
    };
  };
  handle: {
    source: string;
    target: string;
    border: string;
    glow: string;
  };
  edge: {
    defaultStroke: string;
    runtimeStroke: string;
    selectedStroke: string;
    glow: string;
    deleteButton: {
      surface: string;
      border: string;
      text: string;
    };
  };
  minimap: {
    mask: string;
    nodeFallback: string;
    strokeWidth: number;
  };
  controls: {
    surface: string;
    border: string;
    icon: string;
    hoverSurface: string;
  };
};
```

Adapter safety rule:

This adapter may describe visual values only. It must not carry behavior props,
event handlers, handle ids, `pointer-events`, arbitrary selectors, or z-index.

## 5. Visual Migration Order

Recommended V10 order:

1. Extract graph adapter contract doc into types/tests only after V2-V4 exist.
2. Move static graph colors into a pure adapter object.
3. Bridge adapter values into CSS variables.
4. Apply adapter values to `Background`, `MiniMap`, edge defaults, and handle visuals.
5. Leave drag, pan, zoom, select, connect, delete, and hit testing unchanged.

Do not start by deleting global React Flow CSS. It currently protects visual coherence and behavior affordances.

## 6. Browser Smoke Required For Any Graph Change

Any future graph-affecting implementation must verify:

- Initial graph renders.
- Pan/zoom works.
- Controls are visible and clickable.
- Minimap is visible, pannable, and zoomable.
- Agent node drag persists position.
- Runtime node drag persists position.
- Edge select and delete work.
- Handles still create connections.
- Overlay action buttons remain clickable without blocking pane drag elsewhere.
- No console errors during the graph interaction pass.

## 7. Current Gate

V1 React Flow boundary passes when:

- Visual slots are listed.
- Behavior anchors are protected.
- Adapter allowed/forbidden fields are explicit.
- No graph code or global CSS has been changed.
