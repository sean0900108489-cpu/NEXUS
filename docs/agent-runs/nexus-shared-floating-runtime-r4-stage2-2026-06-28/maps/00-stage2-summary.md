# R4 Stage 2 - Workspace Launcher Scale Hardening Summary

## Scope

This run hardens the Workspace floating app launcher after R4 Stage 1 expanded the default registry to seven apps.

The slice focuses on launcher usability and verification readiness:

- Added a regression test for the seven-app R4 launcher set.
- Made the launcher horizontally scrollable.
- Made launcher buttons fixed-width and non-shrinking across small and larger viewports.
- Added `data-floating-app-count` to make browser/runtime inspection easier.
- Re-ran browser access verification against the existing localhost dev server.

It does not change app registry membership, feature app behavior, auth, Supabase, `/desktop`, agent windows, datapads, sandbox, or command bridge semantics.

## Behavior Landed

`FloatingAppLauncher` now has:

- `overflow-x-auto`
- `overscroll-x-contain`
- `data-floating-app-count={apps.length}`
- fixed-width launcher buttons: `w-32 shrink-0 sm:w-40`

This prevents the seven R4 launcher entries from compressing into unstable button widths when the Workspace surface is narrow.

## TDD Evidence

Focused red/green command:

```bash
npm test -- src/runtime/floating/react/FloatingAppLauncher.test.tsx
```

Observed:

- RED: new test failed because the launcher lacked `data-floating-app-count`, overflow guard, and non-shrinking button sizing.
- GREEN: 1 file / 3 tests passed after the launcher hardening.

Expanded runtime verification:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Results:

- 11 files / 21 tests passed.
- Typecheck: passed.
- Targeted ESLint: passed with 0 errors. `nexus-ops.tsx` still reports pre-existing unused warnings.
- Production build: passed.

## Browser Verification

The existing dev server responded on:

```text
http://localhost:3000
```

Playwright opened a fresh in-memory session:

- Page title: `NEXUS // AI OPS`
- Visible screen: Identity Gate / Global Vault
- Session state: `userLoaded:false`
- Available Playwright sessions: only the fresh unauthenticated `nexus-r4-stage2`

Because no authenticated Playwright session was available to attach, this run could not click the seven launcher entries in the live Workspace UI.

Console notes from the fresh session:

- Placeholder image DNS failure for `https://cdn.example.com/nexus/bg-surface-shell.webp`
- Expected unauthenticated `/api/models` `401`
- No new controlled-session launcher interaction errors were observed because the launcher was behind auth

## Files Updated

- `src/runtime/floating/react/FloatingAppLauncher.tsx`
- `src/runtime/floating/react/FloatingAppLauncher.test.tsx`

## Next Slice

R4 Stage 3 should run with an authenticated browser session and verify:

1. Launcher renders `data-floating-app-count="7"` in the live Workspace.
2. Horizontal scrolling works when the launcher is wider than the surface.
3. Each launcher entry opens its corresponding floating window.
4. Singleton apps refocus existing windows.
5. Multi-window apps (`profile-preview`, `global-chat`) can open multiple instances as intended.
