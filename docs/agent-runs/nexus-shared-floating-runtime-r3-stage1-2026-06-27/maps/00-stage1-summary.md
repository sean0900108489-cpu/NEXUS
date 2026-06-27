# R3 Stage 1 - Shared Floating Runtime Contract Summary

## Scope

This run implements the first R3 slice from the R2 boundary plan:

- Shared floating window types.
- Pure layout helpers.
- Pure lifecycle helpers.
- Metadata-only floating app registry.
- Targeted tests for layout, lifecycle, and registry behavior.

It does not mount the runtime in Workspace yet. It does not change `NexusOps`, agent windows, datapads, `/desktop`, routes, Supabase, or login behavior.

## Files Added

- `src/runtime/floating/core/floating-window-types.ts`
- `src/runtime/floating/core/floating-window-layout.ts`
- `src/runtime/floating/core/floating-window-lifecycle.ts`
- `src/runtime/floating/registry/floating-app-types.ts`
- `src/runtime/floating/registry/floating-app-registry.ts`
- `src/runtime/floating/index.ts`
- `src/runtime/floating/core/floating-window-layout.test.ts`
- `src/runtime/floating/core/floating-window-lifecycle.test.ts`
- `src/runtime/floating/registry/floating-app-registry.test.ts`

## Behavior Landed

- Generic `FloatingWindowInstance` supports `previousLayout`.
- Maximize preserves prior layout and restore returns to it.
- Bounds constraint keeps a visible handle while clamping size.
- Lifecycle open/focus/minimize/maximize/restore functions are pure.
- Singleton opening focuses an existing window instead of creating another.
- Registry preserves insertion order, stores metadata unchanged, and rejects duplicate app kinds.

## Verification

Commands run:

```bash
npm test -- src/runtime/floating/core/floating-window-layout.test.ts src/runtime/floating/core/floating-window-lifecycle.test.ts src/runtime/floating/registry/floating-app-registry.test.ts
npm run typecheck
```

Results:

- Targeted tests: 3 files / 6 tests passed.
- Typecheck: passed.

## Next Slice

R3 Stage 2 should add React/runtime host pieces without migrating agent windows:

1. Add `FloatingWindowFrame`, `FloatingWindowManager`, and `FloatingWindowErrorBoundary`.
2. Add a host adapter contract and a desktop/workspace adapter skeleton.
3. Add a Workspace registry-window slice separate from existing agent/datapad state.
4. Mount the manager inside the Workspace stage behind a minimal entry point.
5. Pilot with `developer-inspector` or `feed`.

Avoid first:

- Sandbox, because it is still coupled to `NexusAgent`.
- Agent/chat/media windows, because they are core Workspace behavior.

