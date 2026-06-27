# R4 Stage 1 - Workspace Floating Runtime POC App Intake Summary

## Scope

This run starts R4 by connecting the five planned POC apps to the Workspace Shared Floating Runtime:

1. Artifact Library
2. Profile Preview
3. Notes
4. Forum
5. Global Chat

The slice is intentionally registry-adapter-only:

- `NexusOps` continues to import the floating runtime, not feature windows.
- Existing feature windows keep their current data APIs and side effects.
- Desktop Window OS definitions remain untouched.
- No Supabase auth, route, `/desktop`, agent window, datapad, or sandbox behavior was changed.

## Behavior Landed

`DEFAULT_WORKSPACE_FLOATING_APPS` now launches these apps in order:

1. `developer-inspector`
2. `feed`
3. `artifact-library`
4. `profile-preview`
5. `notes`
6. `forum`
7. `global-chat`

Each R4 app is wrapped by a local adapter in `src/runtime/floating/registry/default-floating-apps.tsx`:

- `ArtifactLibraryFloatingApp`
- `ProfilePreviewFloatingApp`
- `NotesFloatingApp`
- `ForumFloatingApp`
- `GlobalChatFloatingApp`

The adapters translate `FloatingWindowInstance` to the existing `NexusWindow` shape used by current feature windows.

## Risk Notes

- `notes` writes to `useCurrentNoteStore` on mount/unmount and remains the highest-coupling pilot.
- `forum` and `global-chat` use existing local/API-backed feature data paths; this run did not normalize their persistence into the floating runtime.
- `profile-preview` allows multiple windows, matching the existing Desktop registry definition.
- `global-chat` allows multiple windows, matching the existing Desktop registry definition.
- Browser click verification still needs an authenticated Workspace session because fresh Playwright sessions stop at the Identity Gate.

## Files Updated

- `src/runtime/floating/registry/default-floating-apps.tsx`
- `src/runtime/floating/registry/default-floating-apps.test.tsx`
- `src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`

## Verification

Focused red/green cycle:

```bash
npm test -- src/runtime/floating/registry/default-floating-apps.test.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
```

Observed:

- RED: registry test failed while only `developer-inspector` and `feed` were present.
- GREEN: 2 files / 4 tests passed after adding the R4 adapters.

Full verification:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Results:

- Floating runtime plus Workspace bridge tests: 11 files / 20 tests passed.
- Typecheck: passed.
- Targeted ESLint: passed with 0 errors. `nexus-ops.tsx` still reports pre-existing unused warnings.
- Production build: passed.

## Next Slice

R4 Stage 2 should use an authenticated browser session to click through all seven Workspace launcher entries and record:

1. Open/close/minimize behavior.
2. Singleton behavior for `artifact-library`, `notes`, and `forum`.
3. Multiple-window behavior for `profile-preview` and `global-chat`.
4. Any `setTitle` effect churn or visual overlap introduced by the larger launcher list.
5. Whether `notes` current-note bridge state needs a runtime-scoped guard before deeper migration.
