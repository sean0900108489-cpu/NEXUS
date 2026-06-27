# R3 Stage 3 - Workspace Floating Runtime Pilot Summary

## Scope

This run implements the first Workspace bridge slice for the shared floating runtime:

- Default Workspace floating app registry.
- `developer-inspector` pilot adapter.
- Reactive React host adapter for Workspace.
- Workspace command palette entry to open the pilot.
- `FloatingWindowManager` mounted inside the Workspace stage.
- Boundary tests proving `NexusOps` consumes runtime modules without importing pilot feature internals.

It does not migrate existing `AgentWindow`, `DatapadWindow`, `/desktop`, sandbox, chat, media, Supabase, login, or route behavior.

## Files Added

- `src/runtime/floating/registry/default-floating-apps.tsx`
- `src/runtime/floating/registry/default-floating-apps.test.tsx`
- `src/runtime/floating/react/useFloatingHostAdapter.ts`
- `src/runtime/floating/react/useFloatingHostAdapter.test.ts`
- `src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`

Updated:

- `src/runtime/floating/index.ts`
- `src/runtime/floating/react/FloatingWindowFrame.tsx`
- `src/runtime/floating/react/FloatingWindowFrame.test.tsx`
- `src/components/nexus/nexus-ops.tsx`

## Behavior Landed

- Workspace has a local floating host adapter backed by React state.
- The shared manager now mounts inside `.nexus-workspace`.
- Command palette includes `Open Dev Inspector`.
- Opening the pilot creates a singleton `developer-inspector` floating window using registry metadata.
- `DeveloperInspectorWindow` stays behind the default registry adapter; `NexusOps` does not import it directly.
- Floating frame now carries `position: absolute`, so hosted windows are positioned relative to the Workspace stage rather than inserted into document flow.

## Architecture Boundary

The new Workspace bridge follows the R2 adapter-first boundary:

- `src/runtime/floating/core`: pure window lifecycle/layout.
- `src/runtime/floating/registry`: metadata and pilot app adapter.
- `src/runtime/floating/react`: client host adapter, frame, manager.
- `src/components/nexus/nexus-ops.tsx`: host mount and command entry only.

The pilot is intentionally internal and metadata-only. It proves the runtime can host a real existing window component without moving core Workspace surfaces yet.

## Verification

Commands run:

```bash
npm test -- src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/useFloatingHostAdapter.test.ts src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts src/runtime/floating/react/FloatingWindowFrame.test.tsx
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Results:

- Focused Stage 3 tests: 4 files / 7 tests passed.
- Floating runtime plus bridge tests: 9 files / 16 tests passed.
- Typecheck: passed.
- Targeted ESLint: passed with 0 errors. `nexus-ops.tsx` still reports pre-existing unused warnings.
- Production build: passed.

## Next Slice

R3 Stage 4 should bridge more of the registry into Workspace without migrating app bodies yet:

1. Add a visible Workspace launcher affordance or right-dock section backed by `DEFAULT_WORKSPACE_FLOATING_APPS`.
2. Add source/behavior tests for registry-driven launch, not hard-coded single pilot launch.
3. Decide whether `feed` or `notes` is the second pilot.
4. Keep `AgentWindow`, `DatapadWindow`, and sandbox out of migration until registry launch and host behavior are stable.
5. Add browser verification once a second pilot or visible launcher exists.
