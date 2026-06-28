# R5 Stage 4 Context

## Current State

Branch:

- `codex/v41`

Starting HEAD:

- `c5d636ad7f8addc098cebc3302f3cfdd61218caf`

Stage intent:

- Reframe R5 from a single floating product prototype into the first
  Workspace Floating Web App Host slice.
- Keep `src/runtime/floating` as the shared window shell.
- Add a manifest-driven external app entry that can host another web app
  project inside a floating window.
- Keep bridge, auth, storage, Supabase/API, package import, and backend
  integration deferred.

## Work Completed

Floating Web App Host:

- Added typed `FloatingWebAppManifest` metadata.
- Added `FloatingWebAppContainer`, a sandboxed iframe container for external web
  app projects.
- Added the `external-web-app` launcher entry with a local dev-server pilot
  manifest pointing to `http://localhost:5173`.
- Kept all bridge flags disabled for Stage 1:
  command, auth, storage, API, and workspace context.

Registry and boundaries:

- Added optional `dataBoundary` metadata to `FloatingAppDefinition`.
- Declared boundaries for all nine Workspace launcher apps.
- Marked `external-web-app` as external-project owned rather than NEXUS
  Supabase-owned.
- Preserved the shared runtime boundary: registry opens apps, runtime manages
  windows, feature/app code owns product logic.

Documentation:

- Updated `docs/window-os-data-contracts.md` with the Web App Host boundary
  registry and Stage 1 external manifest.
- Added this R5 Stage 4 context pack and summary.

## What Did Not Change

- No external project was imported or bundled.
- No command/auth/storage/API bridge was implemented.
- No Supabase migration or API route was added.
- No payments, reviews, marketplace backend, or package-import flow was added.
- No `/desktop` behavior was changed.

## Boundary Rules For Next Agents

- Do not paste external app HTML/CSS/JS directly into the NEXUS React DOM.
- External projects should enter through a manifest and iframe/sandbox boundary.
- Bridge capabilities must be explicit, permissioned, and individually tested.
- The shared window module remains high-level infrastructure only.
- Native floating apps can still exist, but R5's platform direction is Web App
  Host / micro-frontend runtime.

## Next Recommended Stage

R5 Stage 5 should be the Bridge Pilot:

- Expose workspace/window context through `postMessage` with an allowlisted
  origin and message schema.
- Add tests for message origin rejection and allowed command events.
- Keep auth tokens, Supabase service role keys, and direct database access out
  of the iframe.
- Continue deferring backend/API bridge until the context bridge is stable.
