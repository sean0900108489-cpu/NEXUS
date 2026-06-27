# R3 Stage 6 - Browser Verification And Runtime Loop Hardening Summary

## Scope

This run attempted browser verification for the Stage 5 Workspace floating runtime and hardened a runtime issue found during that verification:

- Reused the existing localhost dev server on `http://localhost:3000`.
- Confirmed unauthenticated sessions still stop at the Identity Gate.
- Investigated the browser/server log loop from opening `Developer Inspector`.
- Added a lifecycle regression test for repeated title updates.
- Made floating window title updates idempotent in the shared runtime.
- Re-ran focused runtime tests, typecheck, targeted lint, and production build.

It does not migrate additional apps, bypass authentication, change Supabase auth behavior, alter `/desktop`, or add a third pilot app.

## Runtime Issue Found

Browser logs showed repeated React errors:

```text
Maximum update depth exceeded
DeveloperInspectorWindow.useEffect -> setTitle -> updateWindowTitle -> setState
```

Root cause:

- `DeveloperInspectorWindow` calls `setTitle("Developer Inspector")` from an effect.
- `FloatingWindowManager` passes a fresh `setTitle` closure each render.
- The host adapter updated window state even when the title was already identical.
- That identical title write still produced a new state object, which triggered another render and another effect run.

## Fix Landed

The fix keeps the behavior generic and inside the floating runtime:

- Added `updateFloatingWindowTitle()` in `src/runtime/floating/core/floating-window-lifecycle.ts`.
- It returns the original `FloatingWindowState` when the window is missing or the title is unchanged.
- `useFloatingHostAdapter()` now skips `setState` when the next state is the same object.
- `useFloatingHostAdapter()` and `createMemoryFloatingHostAdapter()` both use the shared lifecycle helper for title updates.
- `src/runtime/floating/index.ts` exports the helper.

## Files Updated

- `src/runtime/floating/core/floating-window-lifecycle.ts`
- `src/runtime/floating/core/floating-window-lifecycle.test.ts`
- `src/runtime/floating/react/useFloatingHostAdapter.ts`
- `src/runtime/floating/adapters/memory-floating-host.ts`
- `src/runtime/floating/index.ts`

## Browser Verification Notes

`http://localhost:3000` responded with `200 OK`.

The new Playwright session reached:

- Page title: `NEXUS // AI OPS`
- Visible screen: Identity Gate login
- Console after new session: React DevTools info, expected unauthenticated `/api/models` `401`, and a pre-existing placeholder image DNS error for `https://cdn.example.com/nexus/bg-surface-shell.webp`

Because the session was unauthenticated and no logged-in browser session was available to attach, the launcher buttons could not be clicked from the live UI in this run. New log entries after the fix did not show a fresh `Maximum update depth exceeded` error; the remaining update-depth entries in `.next/dev/logs/next-development.log` were from the earlier failing trace before the fix compiled.

## Verification

Commands run:

```bash
npm test -- src/runtime/floating/core/floating-window-lifecycle.test.ts
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Results:

- Lifecycle regression test: 1 file / 3 tests passed.
- Floating runtime plus Workspace bridge tests: 11 files / 20 tests passed.
- Typecheck: passed.
- Targeted ESLint: passed with 0 errors. `nexus-ops.tsx` still reports pre-existing unused warnings.
- Production build: passed.

## Next Slice

R3 Stage 7 should continue from the current two-app pilot:

1. Browser-verify launcher clicks from an authenticated session.
2. Record `Dev Inspector` and `Feed` open/close/minimize/singleton behavior.
3. Decide whether to stabilize `FloatingWindowManager` app callbacks with a small child component before adding more apps.
4. Only after authenticated browser verification, evaluate `notes` as the third pilot with explicit current-note-store side-effect tests.
