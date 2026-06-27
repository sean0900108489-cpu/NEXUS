# R2 Migration Plan

## Migration Strategy

Use a four-stage migration. Each stage must leave the product usable and keep `/desktop` explicit/experimental.

## Stage 0 - Preparation Already Complete

Status: complete through R0/R1.

Evidence:

- Default landing is `/`.
- `/desktop` is experimental.
- R1 inventory maps Workspace and `/desktop` runtime differences.

No further action in R2.

## Stage 1 - Shared Runtime Contract Only

Goal:

Create source-level contracts and tests without switching any UI surface to the new runtime.

Files to create later:

- `src/runtime/floating/core/floating-window-types.ts`
- `src/runtime/floating/core/floating-window-layout.ts`
- `src/runtime/floating/core/floating-window-lifecycle.ts`
- `src/runtime/floating/registry/floating-app-types.ts`
- `src/runtime/floating/registry/floating-app-registry.ts`
- `src/runtime/floating/index.ts`

Tests to create later:

- `src/runtime/floating/core/floating-window-layout.test.ts`
- `src/runtime/floating/core/floating-window-lifecycle.test.ts`
- `src/runtime/floating/registry/floating-app-registry.test.ts`

Acceptance gates:

- Types compile.
- Layout functions preserve `previousLayout` on maximize/restore.
- Registry rejects duplicate `kind`.
- Capability metadata does not affect open/close decisions.
- No `NexusOps` import changes.
- No route behavior changes.

## Stage 2 - Desktop Adapter Compatibility

Goal:

Wrap existing `/desktop` window store with the shared host adapter contract. Keep current `/desktop` UI behavior stable.

Files to modify later:

- `src/kernel/window/window-store.ts`
- `src/kernel/window/window-types.ts`
- `src/kernel/window/NexusDesktopShell.tsx`

Files to create later:

- `src/runtime/floating/adapters/desktop-floating-host.ts`

Acceptance gates:

- `/desktop` opens the same registered apps.
- Existing window store tests still pass.
- LocalStorage snapshot key can remain `nexus-window-os:v1` for compatibility.
- No default login route changes.
- No Workspace rendering changes.

## Stage 3 - Workspace Registry Bridge Pilot

Goal:

Let Workspace open one registry app through the shared runtime without moving agent windows.

Recommended pilot app:

`developer-inspector` or `feed`.

Recommendation:

Start with `developer-inspector` if the goal is low business-data risk. Start with `feed` if the goal is proving product-like app behavior. Avoid sandbox as the first pilot because sandbox is still coupled to `NexusAgent`.

Files to modify later:

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-panels.tsx` or a small extracted launcher component
- `src/kernel/window/default-window-apps.ts` or future `src/runtime/floating/registry/default-floating-apps.ts`

Files to create later:

- `src/runtime/floating/adapters/workspace-floating-host.ts`
- `src/runtime/floating/react/FloatingWindowFrame.tsx`
- `src/runtime/floating/react/FloatingWindowManager.tsx`
- `src/runtime/floating/react/FloatingWindowErrorBoundary.tsx`

Acceptance gates:

- Workspace can open the pilot app inside the Workspace stage.
- Agent windows still work exactly as before.
- Datapad windows still work exactly as before.
- Workspace shell does not import pilot app internals directly.
- Pilot app is opened through registry lookup.
- No `/desktop` regression.

## Stage 4 - Progressive App Migration

Goal:

Move mature POC apps into Workspace floating apps one at a time after the bridge is proven.

Recommended order:

1. `developer-inspector` - internal, good registry metadata smoke test.
2. `feed` - product primitive, local-only data, good app behavior test.
3. `notes` - localStorage and current-note bridge, good cross-app bridge test.
4. `artifact-library` and `artifact-preview` - resource-ref routing, media preview, signed URLs.
5. `profile-preview` - resource scope and profile metadata.
6. `forum` - larger local product primitive with attachments and notes bridge.
7. `sandbox` - requires decoupling from `NexusAgent`.
8. Agent/chat/media windows - last, because they are core Workspace behavior.

Non-goals in this stage:

- Marketplace MVP.
- Reddit clone.
- Canva editor.
- Payments.
- DB migration.

## Stage 5 - Runtime Hardening

Goal:

Make the shared runtime production-grade after apps prove the bridge.

Hardening areas:

- Keyboard shortcuts.
- Mobile and touch drag/resize.
- Snap/cascade/layout commands.
- Resource routing.
- Layout persistence versioning.
- Accessibility labels and focus management.
- Performance with many windows.
- Cross-host test coverage.

## R3 Minimal Implementation Slice

R3 should be intentionally small:

1. Create shared runtime type and registry files.
2. Add tests for registry and lifecycle.
3. Add Workspace host adapter with an isolated registry-window slice, not agent migration.
4. Add `FloatingWindowManager` mounted inside the Workspace stage.
5. Add one command or right-dock action to open the pilot app.
6. Verify `/`, `/workspace/[id]`, and `/desktop`.

Suggested R3 commit message:

```text
v42: bridge floating app registry into workspace
```

