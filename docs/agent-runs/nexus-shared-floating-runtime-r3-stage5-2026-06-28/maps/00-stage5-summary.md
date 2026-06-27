# R3 Stage 5 - Second Workspace Floating App Pilot Summary

## Scope

This run adds the second low-risk Workspace floating app pilot through the default registry:

- Compared `feed` and `notes` feature coupling.
- Selected `feed` as the second pilot.
- Added `FeedWindow` behind a registry adapter.
- Extended default registry tests to require both `developer-inspector` and `feed`.
- Extended launcher/source guard tests to prove multi-app launch remains registry-backed and `NexusOps` still avoids feature imports.

It does not migrate `AgentWindow`, `DatapadWindow`, sandbox, `/desktop`, notes, chat/media agents, Supabase, auth, login, or routing.

## Selection Rationale

`feed` was selected over `notes` because:

- `feed` is localStorage-first and can fall back safely when profile/Supabase lookup is unavailable.
- `feed` does not write the current-note bridge store during window startup.
- `notes` sets `currentNoteId` in `useCurrentNoteStore` on mount/unmount, which is a wider cross-app side effect.
- `feed` does expose note-capture interactions from item cards, but that path only appears once feed items exist and reuses existing interaction primitives.

## Files Updated

- `src/runtime/floating/registry/default-floating-apps.tsx`
- `src/runtime/floating/registry/default-floating-apps.test.tsx`
- `src/runtime/floating/react/FloatingAppLauncher.test.tsx`
- `src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`

## Behavior Landed

- `DEFAULT_WORKSPACE_FLOATING_APPS` now lists `developer-inspector` then `feed`.
- `createDefaultWorkspaceFloatingAppRegistry()` registers both apps in launcher order.
- `feed` keeps its app-specific prop translation inside `FeedFloatingApp`.
- `NexusOps` remains registry-backed from Stage 4; no new feature-level imports were added there.
- Workspace launcher and command palette now inherit the second app through `workspaceFloatingRegistry.list()`.

## Verification

Commands run:

```bash
npm test -- src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Results:

- Focused Stage 5 tests: 3 files / 6 tests passed.
- Floating runtime plus bridge tests: 11 files / 19 tests passed.
- Typecheck: passed.
- Targeted ESLint: passed with 0 errors. `nexus-ops.tsx` still reports pre-existing unused warnings.
- Production build: passed.

## Next Slice

R3 Stage 6 should add browser/runtime verification and decide whether to harden launcher UX before adding more apps:

1. Start the dev server and verify `/workspace` can open both `Dev Inspector` and `Feed`.
2. Check launcher placement does not block agent windows, datapads, composer, or top/right dock controls.
3. Add a browser/source verification note for singleton behavior.
4. Only after that, consider a third pilot such as `notes`, with explicit current-note-store side-effect tests.
