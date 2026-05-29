# NEXUS React Flow Adapter V1

Phase: V10 - React Flow Adapter V1
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented pure adapter contract. Production graph code and global CSS remain unchanged.

## Implementation Evidence

- `CP-120` through `CP-125` added the pure adapter shape, manifest mapping, graph-scoped CSS variable emitter, and phase gates.
- `CP-126` through `CP-128` applied adapter variables only to the isolated Style Lab graph specimen and smoke-tested preset switching.
- `CP-129` through `CP-131` connected adapter output to the pure compiler and verified Style Lab governance/export visibility.
- `CP-132` through `CP-141` carried graph adapter variables and review metadata through the local preview/export boundary.
- No production `ReactFlow` props, graph behavior handlers, global React Flow CSS, workspace sync, backend, Supabase, deploy, or `exports/**` paths were changed by these adapter units.

## 0. Purpose

This document turns the React Flow boundary into a future adapter contract.

The adapter is visual-only. It lets the Style Engine influence graph appearance
without controlling graph behavior.

## 1. Inputs

Adapter compiler may receive:

- validated manifest
- style contract registry
- compiler output
- React Flow visual slot registry

It may not receive:

- graph nodes
- graph edges
- active selection state
- event handlers
- node ids
- handle ids
- workspace state
- sync/backend state

## 2. Adapter Output Shape

Implemented TypeScript direction:

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
```

## 3. Explicitly Forbidden Fields

Adapter output must never include:

- `nodesDraggable`
- `panOnDrag`
- `zoomOnScroll`
- `onNodeDragStop`
- `onConnect`
- `onEdgeClick`
- `onPaneClick`
- `deleteKeyCode`
- `interactionWidth`
- hit path stroke width
- node ids
- edge ids
- handle ids
- z-index
- `pointer-events`
- arbitrary selectors
- arbitrary CSS strings

## 4. Current Source Mapping

| Current source | Future adapter field |
| --- | --- |
| `<Background color gap size>` | `background` |
| Agent node surface classes | `node.agent.surface/border/text` |
| Agent active pulse/glow | `node.agent.activeGlow` |
| Runtime node surface classes | `node.runtime.surface/border/text/shadow` |
| Runtime handle hardcoded colors | `handle.source`, `handle.target` |
| Default edge stroke | `edge.defaultStroke` |
| Runtime edge stroke | `edge.runtimeStroke` |
| Selected edge CSS | `edge.selectedStroke`, `edge.glow` |
| Edge delete global CSS | `edge.deleteButton` |
| `<MiniMap maskColor nodeColor nodeStrokeWidth>` | `minimap` |
| `.react-flow__controls*` CSS | `controls` |

## 5. Delivery Strategy

Future implementation should be incremental:

1. Add pure adapter type and default object in a style-engine module.
2. Add unit tests proving forbidden fields cannot exist in adapter output.
3. Map `legacy-cyberpunk` to adapter values.
4. Use adapter only in an isolated graph specimen.
5. Browser smoke graph specimen.
6. Only then consider production `nexus-graph.tsx` visual migration.

Do not start by editing production `ReactFlow` props.

## 6. CSS Variable Strategy

Preferred output:

```text
--nexus-graph-background-color
--nexus-graph-edge-default-stroke
--nexus-graph-edge-selected-stroke
--nexus-graph-handle-source-fill
--nexus-graph-handle-target-fill
--nexus-graph-node-agent-surface
--nexus-graph-node-runtime-surface
```

Legacy bridge can mirror:

- `--theme-primary`
- `--theme-secondary`
- `--theme-danger`
- `--text-main`
- `--bg-base`

Do not remove existing React Flow global CSS until adapter and browser smoke
prove parity.

## 7. Browser Smoke For Future Adapter Code

Required:

- graph renders
- pan works
- zoom works
- minimap visible and usable
- controls visible and usable
- agent node drag persists
- runtime node drag persists
- handles connect nodes
- edge select works
- edge delete works by click and keyboard
- overlay action buttons remain clickable
- no preview-only state enters store/sync/backend
- no console errors

## 8. Acceptance Gate

V10 adapter doc passes when:

- Adapter output shape is visual-only.
- Forbidden behavior fields are explicit.
- Current source mapping is clear.
- Incremental delivery strategy avoids production graph edits first.
- Browser smoke requirements are listed.
- No graph code, CSS, schema, package, deploy, or `exports/**` files are changed.
