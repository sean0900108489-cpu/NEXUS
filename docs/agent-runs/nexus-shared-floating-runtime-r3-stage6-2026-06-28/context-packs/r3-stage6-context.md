# R3 Stage 6 Context

## Current State

Shared floating runtime Stage 6 is implemented and verified at the code/test/build level.

Default Workspace floating apps remain:

1. `developer-inspector`
2. `feed`

The Workspace shell remains registry-backed:

- App list comes from `workspaceFloatingRegistry.list()`.
- Launcher buttons are rendered by `FloatingAppLauncher`.
- Command ids use `open-floating-app-${app.kind}`.
- Window creation uses `createFloatingAppOpenInput(app, { workspaceId })`.
- `NexusOps` still imports floating runtime primitives rather than feature windows.

## Stage 6 Fix

Browser logs exposed a render loop when `DeveloperInspectorWindow` repeatedly set the same title.

The shared runtime now has an idempotent title update path:

- `updateFloatingWindowTitle(state, windowId, title, options)`
- Returns the same state object when the title is unchanged.
- Updates `title` and `updatedAt` only when the title actually changes.
- Used by both React and memory host adapters.
- React host `commitState` skips no-op same-object commits.

## Verification Evidence

Latest commands run:

```bash
npm test -- src/runtime/floating/core/floating-window-lifecycle.test.ts
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Observed results:

- Lifecycle regression test: 1 file / 3 tests passed.
- Runtime plus Workspace bridge source guard: 11 test files / 20 tests passed.
- `npm run typecheck`: passed.
- Targeted ESLint: 0 errors. Existing `nexus-ops.tsx` unused warnings remain.
- `npm run build`: passed.

## Browser Verification Status

`http://localhost:3000` is reachable and returned `200 OK`.

Playwright reached the NEXUS Identity Gate in a fresh unauthenticated session. No authenticated Playwright session was available to attach, so this run could not click the live `Dev Inspector` or `Feed` launcher buttons.

New browser logs after opening the fresh unauthenticated session did not add a new update-depth error. Remaining visible errors were unrelated to this runtime slice:

- `/api/models` returned `401` while unauthenticated.
- `https://cdn.example.com/nexus/bg-surface-shell.webp` failed DNS resolution.

## Important Guardrails For Next Work

- Do not bypass Supabase auth just to exercise the UI.
- Keep app-specific imports in registry adapters, not `NexusOps`.
- Do not migrate `AgentWindow`, `DatapadWindow`, sandbox, or `/desktop` yet.
- Treat `notes` as higher risk because it writes current-note bridge state on mount/unmount.
- Keep title/state update helpers in `src/runtime/floating/core` when they represent generic lifecycle behavior.

## Suggested Next Work

Proceed to R3 Stage 7:

1. Use an authenticated local session for browser verification.
2. Click `Open Dev Inspector` and `Open Feed`.
3. Verify singleton/focus behavior and that the launcher placement does not block primary Workspace controls.
4. Consider extracting a stable rendered window item component only if browser traces show repeated harmless effect churn after the no-op title fix.
