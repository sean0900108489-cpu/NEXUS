# R4 Stage 1 Context

## Current State

Workspace Shared Floating Runtime now has seven default apps:

1. `developer-inspector`
2. `feed`
3. `artifact-library`
4. `profile-preview`
5. `notes`
6. `forum`
7. `global-chat`

The default registry is implemented in:

- `src/runtime/floating/registry/default-floating-apps.tsx`

`NexusOps` remains generic:

- App list comes from `workspaceFloatingRegistry.list()`.
- Launcher buttons are rendered by `FloatingAppLauncher`.
- Command ids use `open-floating-app-${app.kind}`.
- Window creation uses `createFloatingAppOpenInput(app, { workspaceId })`.
- Feature imports remain inside the registry adapter file.

## R4 Adapter Details

The five R4 apps use existing feature windows:

- `ArtifactLibraryWindow`
- `ProfilePreviewWindow`
- `NotesWindow`
- `ForumWindow`
- `GlobalChatWindow`

Each adapter receives `FloatingAppProps`, converts the floating window to `NexusWindow`, then passes `window`, `setTitle`, and `close` through to the existing feature window.

## Metadata Source

The R4 registry entries mirror the current Desktop Window OS metadata:

- Artifact Library: singleton resource app
- Profile Preview: multi-window profile app
- Notes: singleton knowledge app
- Forum: singleton community app
- Global Chat: multi-window chat app

Do not change these semantics without a separate behavior test.

## Known Risks

- `notes` is the highest-coupling app because it writes `current-note-store` during mount/unmount.
- `forum` composes attachments and profile author refs through existing feature APIs.
- `global-chat` uses backend chat APIs and may show unauthenticated API failures behind Identity Gate.
- Fresh Playwright sessions currently stop at the Identity Gate, so browser click verification needs an authenticated local session.

## Verification Evidence

Red/green test command:

```bash
npm test -- src/runtime/floating/registry/default-floating-apps.test.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
```

Observed:

- RED: registry expected seven apps but only saw `developer-inspector` and `feed`.
- GREEN: 2 files / 4 tests passed after adding adapters.

Full verification also ran:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Results:

- Floating runtime plus Workspace bridge tests: 11 files / 20 tests passed.
- Typecheck: passed.
- Targeted ESLint: 0 errors. Existing `nexus-ops.tsx` unused warnings remain.
- Production build: passed.

## Suggested Next Work

Proceed to R4 Stage 2:

1. Browser-verify all seven launcher entries with an authenticated session.
2. Add coverage for singleton focus behavior across the larger registry list if current lifecycle tests are too generic.
3. Decide whether `NotesWindow` needs runtime-scoped current-note cleanup before deeper Workspace migration.
4. Start extracting shared app metadata if Desktop and Workspace registries drift becomes painful.
