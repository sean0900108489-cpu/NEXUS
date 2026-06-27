# R3 Stage 2 - Floating React Runtime Shell Summary

## Scope

This run implements the second R3 slice:

- Floating host adapter contract.
- In-memory host adapter for tests and future host integration spikes.
- `FloatingWindowFrame` generic React chrome.
- `FloatingWindowManager` registry renderer.
- Targeted tests for adapter lifecycle, frame markup, manager rendering, and missing-app recovery.

It still does not mount the runtime in Workspace. It does not modify `NexusOps`, existing agent windows, datapads, `/desktop`, routes, Supabase, or login behavior.

## Files Added

- `src/runtime/floating/adapters/floating-host-adapter.ts`
- `src/runtime/floating/adapters/memory-floating-host.ts`
- `src/runtime/floating/adapters/memory-floating-host.test.ts`
- `src/runtime/floating/react/FloatingWindowFrame.tsx`
- `src/runtime/floating/react/FloatingWindowFrame.test.tsx`
- `src/runtime/floating/react/FloatingWindowManager.tsx`
- `src/runtime/floating/react/FloatingWindowManager.test.tsx`

Updated:

- `src/runtime/floating/index.ts`

## Behavior Landed

- Host adapter contract exposes bounds, windows, focus, open/close, minimize/restore/maximize, move/resize, title, and state updates.
- Memory adapter wraps the pure lifecycle helpers and preserves `previousLayout` maximize/restore behavior.
- Frame renders accessible generic chrome with close/minimize/maximize/restore controls, move handle, resize handle, title, and content slot.
- Minimized windows are not rendered into the stage.
- Manager resolves app content through `FloatingAppRegistry`.
- Manager renders a recoverable missing-app panel when no definition exists.

## Verification

Commands run:

```bash
npm test -- src/runtime/floating
npm run typecheck
npm run lint -- src/runtime/floating
```

Results:

- Floating runtime tests: 6 files / 11 tests passed.
- Typecheck: passed.
- Targeted ESLint: passed.

## Next Slice

R3 Stage 3 should be the first Workspace bridge slice:

1. Create a Workspace floating host adapter or lightweight store slice for registry windows only.
2. Mount `FloatingWindowManager` inside the Workspace stage without moving `AgentWindow` or `DatapadWindow`.
3. Create a pilot registry definition for one low-risk app.
4. Add one entry point, likely command palette or right dock, to open the pilot.
5. Verify existing agent and datapad windows still render.

Recommended pilot:

- `developer-inspector` for internal metadata smoke testing, or
- `feed` for local-only product primitive behavior.

Still avoid:

- `sandbox` first, because it is coupled to `NexusAgent`.
- agent/chat/media windows, because they are core Workspace behavior.

