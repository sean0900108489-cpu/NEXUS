# R4 Stage 2 Context

## Current State

Workspace Shared Floating Runtime still has the seven R4 default apps:

1. `developer-inspector`
2. `feed`
3. `artifact-library`
4. `profile-preview`
5. `notes`
6. `forum`
7. `global-chat`

The Stage 2 change hardens the launcher that exposes these apps in Workspace.

## Launcher Behavior

`src/runtime/floating/react/FloatingAppLauncher.tsx` now:

- Exposes `data-floating-app-count={apps.length}` on the toolbar.
- Uses horizontal overflow: `overflow-x-auto`.
- Contains touch/trackpad overscroll behavior: `overscroll-x-contain`.
- Keeps each button stable: `w-32 shrink-0 sm:w-40`.

This keeps the R4 seven-app launcher usable when the Workspace viewport is narrow.

## Verification Evidence

Red/green test:

```bash
npm test -- src/runtime/floating/react/FloatingAppLauncher.test.tsx
```

Observed:

- RED: launcher test failed before the overflow/count/stable-width behavior existed.
- GREEN: 1 file / 3 tests passed after implementation.

Expanded runtime test:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Observed:

- 11 files / 21 tests passed.
- Typecheck: passed.
- Targeted ESLint: 0 errors. Existing `nexus-ops.tsx` unused warnings remain.
- Production build: passed.

## Browser Status

`http://localhost:3000` is reachable.

Fresh Playwright session status:

- Page title: `NEXUS // AI OPS`
- Screen: Identity Gate / Global Vault
- `userLoaded:false`
- No authenticated Playwright session was available through `playwright-cli list`

The live seven-app launcher still needs authenticated browser verification. Do not claim launcher click verification until you have an authenticated session and have clicked the entries.

## Known External Console Noise

Fresh unauthenticated sessions show:

- `https://cdn.example.com/nexus/bg-surface-shell.webp` DNS failure
- `/api/models` `401` while unauthenticated

These were not introduced by the Stage 2 launcher hardening.

## Suggested Next Work

Proceed to R4 Stage 3:

1. Use an authenticated local browser state or user-provided session.
2. Verify the toolbar contains `data-floating-app-count="7"`.
3. Click every launcher entry.
4. Record singleton and multi-window behavior.
5. If launcher visual overlap appears, move from the simple horizontal strip to a compact menu or segmented launcher while preserving registry-backed commands.
