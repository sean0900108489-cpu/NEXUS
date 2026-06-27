# R2 Test And Risk Plan

## Test Philosophy

The shared floating runtime touches user-facing layout behavior, so future implementation must be tested at three levels:

1. Pure runtime tests for layout and lifecycle.
2. React component tests for frame and manager behavior.
3. Route smoke tests for `/`, `/workspace/[id]`, and `/desktop`.

Do not rely on visual inspection alone for drag/resize/focus/lifecycle changes.

## Required Future Unit Tests

### Layout

File:

- `src/runtime/floating/core/floating-window-layout.test.ts`

Coverage:

- `constrainToBounds` keeps a window at least partially visible.
- `maximizeLayout` sets x/y to host padding and size to host bounds.
- `restoreLayout` restores `previousLayout`.
- `cascadeLayouts` preserves stable z-index ordering.
- tiny host bounds still produce positive width/height.

### Lifecycle

File:

- `src/runtime/floating/core/floating-window-lifecycle.test.ts`

Coverage:

- `openWindow` creates a unique id and applies default size.
- singleton open focuses existing instance.
- allow-multiple creates distinct windows.
- focus increments z-index.
- minimize hides but does not close.
- restore clears minimized/maximized.
- maximize preserves `previousLayout`.
- close removes the instance and keeps other windows intact.

### Registry

File:

- `src/runtime/floating/registry/floating-app-registry.test.ts`

Coverage:

- duplicate kind registration fails.
- `getFloatingApp(kind)` returns definition.
- list returns stable registration order.
- capability/archetype metadata is stored but never used as open permission.

## Required Future React Tests

### Frame

File:

- `src/runtime/floating/react/FloatingWindowFrame.test.tsx`

Coverage:

- renders title and app slot.
- close/minimize/maximize controls call host adapter methods.
- focused window uses focused styling state.
- minimized window is not rendered in the stage.
- drag handle and resize handle are present with accessible labels.

### Manager

File:

- `src/runtime/floating/react/FloatingWindowManager.test.tsx`

Coverage:

- manager renders registered app content for each instance.
- missing app definition renders a recoverable not-found panel.
- app crash is isolated by per-window error boundary.
- manager does not import feature internals.

### Workspace Bridge Pilot

File:

- `src/components/nexus/nexus-workspace-floating-runtime-bridge.test.tsx`

Coverage:

- Workspace can open the pilot floating app through registry lookup.
- Existing agent windows still render when registry windows are present.
- Existing datapad windows still render when registry windows are present.
- `NexusOps` does not import the pilot app component directly.

## Required Future Smoke Tests

Commands to run after implementation:

```bash
npm run typecheck
npm run build
```

Route smoke:

- `/` returns 200 and defaults to Workspace.
- `/desktop` returns 200 and remains explicit experimental surface.
- `/workspace/[id]` returns 200 for a known or mocked workspace id.

Browser smoke when UI changes begin:

- Open Workspace.
- Open pilot floating app.
- Drag it.
- Resize it.
- Minimize and restore it.
- Focus between pilot app and an agent window.
- Refresh and confirm expected layout persistence for that host.

## Risk Register

### Risk 1 - Workspace God File

Cause:

Adding registry bridge logic directly into `NexusOps`.

Mitigation:

Create `FloatingWindowManager` and `workspace-floating-host` so `NexusOps` only mounts a runtime host and passes bounds/context.

### Risk 2 - Two Permanent Runtimes

Cause:

Only sharing app registry while leaving lifecycle duplicated.

Mitigation:

Use shared lifecycle/layout contracts before moving apps.

### Risk 3 - Restore Regression

Cause:

Copying `/desktop` maximize semantics without `previousLayout`.

Mitigation:

Make `previousLayout` part of generic `FloatingWindowInstance`.

### Risk 4 - Persistence Collision

Cause:

Forcing localStorage window snapshots onto Workspace state.

Mitigation:

Use host persistence adapters. Workspace persists through existing Zustand/IndexedDB path; `/desktop` keeps localStorage until later.

### Risk 5 - Capability Metadata Overreach

Cause:

Letting capabilities block or auto-compose apps.

Mitigation:

Registry stores capabilities only as metadata. Runtime opens registered app definitions by kind.

### Risk 6 - Sandbox Coupling

Cause:

Treating sandbox as an easy first registry app while it still depends on agent state and toolbar actions.

Mitigation:

Migrate sandbox after simple registry apps prove the bridge. First create a sandbox app wrapper, then extract content dependencies.

### Risk 7 - Mobile/Touch Regression

Cause:

Changing drag/resize from `react-rnd` to manual mouse handlers too early.

Mitigation:

Prefer `react-rnd` in the first shared React frame or prove touch coverage before switching.

