# Production Shell Extraction Map Checkpoint

Date: 2026-05-31
Branch: `codex/v18-style-pack-contract-prep`
Starting HEAD: `a66c534 test: guard production page shell wrapper`

## Scope

This round created a read-only extraction map for `src/components/nexus/nexus-ops.tsx`.
It did not extract code, refactor production shell behavior, add a registry, add a
contract, adopt layout presets, or connect production token application.

## Files Changed

- `docs/style-system/production-shell-extraction-map-v1.md`
- `src/components/nexus/nexus-ops-extraction-map.test.ts`
- `docs/style-system/execution-runs/20260531-production-shell-extraction-map/CHECKPOINT.md`

## Map Created

The map records:

- extraction-safe shell wrapper candidates
- behavior-protected core cut lines
- visual-token adoption candidates
- interaction smoke requirements
- first recommended extraction target

The first recommended extraction target is the `NexusOps` outer visual shell
frame, or smaller. The map explicitly rejects starting with React Flow, workspace
core, floating window manager, feature placement, or layout preset adoption.

## Optional Characterization Test

Added `src/components/nexus/nexus-ops-extraction-map.test.ts`.

The test is source-level only. It reads `nexus-ops.tsx` as text and checks that
the extraction map's protected markers and visual candidate markers remain
visible:

- graph/workspace behavior markers
- store, sync, Supabase, streaming, and tool execution markers
- drag, resize, focus, z-index, window, and modal markers
- visual shell candidate markers

It does not import `nexus-ops.tsx`, snapshot the whole file, parse TSX, or require
a browser.

## Verification Results

- `git diff --check`: passed
- `npm run test -- src/components/nexus/nexus-ops-extraction-map.test.ts`: passed, 1 file / 4 tests
- `npm run typecheck`: passed
- `npm run lint -- src/components/nexus/nexus-ops-extraction-map.test.ts`: passed
- `git diff --name-only`: empty before staging because new files were untracked; `git status --short` showed only allowed files before this checkpoint was added
- Build: not run; not required
- Browser smoke: not run; production runtime was untouched

## Forbidden Boundaries Held

- Did not modify `src/components/nexus/nexus-ops.tsx`.
- Did not modify `src/app/page.tsx`.
- Did not modify `src/components/nexus/nexus-graph.tsx`.
- Did not modify Style Lab.
- Did not modify store, sync, backend, Supabase, API, package/config/migration files, or `exports/**`.
- Did not push or deploy.

## Stop Condition

Stop at map/checkpoint. Do not start extraction in this round.

The next round may only do the first minimal shell frame extraction if this map
is accepted as clear. Do not add new registry or contract foundation as part of
that extraction.
