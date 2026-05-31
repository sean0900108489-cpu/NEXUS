# V20 Non-Persistent Production Preview First Cut Design Checkpoint

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Base commit: `2d25e3b docs: add authenticated workspace evidence runbook`

## Task

Create a design-only first cut for future non-persistent production preview.

No implementation was performed. No source files were edited. No browser smoke
was run. No production preview apply, DOM mutation, persistence, login, backend
write, store write, or source behavior change occurred.

## Preflight

- Branch confirmed: `codex/v19-production-shell-style-upgrade`
- HEAD included: `2d25e3b docs: add authenticated workspace evidence runbook`
- Recent commits recorded:
  - `2d25e3b docs: add authenticated workspace evidence runbook`
  - `ffcc578 docs: add production preview design hold plan`
  - `0943a14 docs: record authenticated production preview scope smoke`
  - `5c3019f docs: map production preview target scopes`
  - `8de062d feat: add production preview preflight contract`
  - `9bf090e feat: add style runtime preflight gate`
  - `e1ead5d feat: add style runtime preview diagnostics`
  - `b220ce5 feat: show roi gated style runtime budget report`
- Pre-existing untracked file recorded and not staged:
  - `docs/style-system/v19-production-shell-style-required-reading.md`

## Files Created

- `docs/style-system/v20-non-persistent-production-preview-first-cut-design.md`
- `docs/style-system/execution-runs/20260531-v20-non-persistent-production-preview-first-cut-design/CHECKPOINT.md`

## Read-Only Inputs

- `docs/style-system/v20-authenticated-workspace-evidence-runbook.md`
- `docs/style-system/v20-non-persistent-production-preview-design-hold-plan.md`
- `docs/style-system/v20-production-preview-target-scope-candidate-map.md`
- `docs/style-system/execution-runs/20260531-v20-authenticated-workspace-evidence-runbook/CHECKPOINT.md`
- `docs/style-system/execution-runs/20260531-v20-non-persistent-production-preview-design-hold-plan/CHECKPOINT.md`
- `src/lib/style-engine/v2-production-preview-preflight.ts`
- `src/components/nexus/nexus-production-page-shell-boundary.tsx`
- `src/components/nexus/nexus-ops-outer-shell-frame.tsx`

## Implementation Blocker

Implementation remains blocked until authenticated workspace evidence pass.

Required before implementation:

- authenticated workspace evidence runbook returns `pass`
- `main.nexus-shell.nexus-outer-shell-frame` is observed exactly once
- route-load network baseline is recorded
- core adopted surfaces are visible enough for smoke
- Style Lab budget/diagnostics/preflight remains passing
- production preview preflight contract can return `eligible`
- user explicitly approves implementation

## First Cut Target Scope

Target:

- selector: `main.nexus-shell.nexus-outer-shell-frame`
- scope id: `nexus-outer-shell-frame`
- scope type: `authenticated-production-route`
- persistence: `none`
- mutation target: `production-route-container`

Rejected targets:

- document root: blocked
- `html` / `body`: blocked
- route-edge boundary: guard/evidence marker only
- generic `main.nexus-shell`: too broad and exists for auth gate
- individual surfaces: useful smoke targets but too fragmented for first cut

## Variable Source

Future variable source:

- existing Warm Glass direct Bridge Plan aliases
- existing production alias bridge output
- existing budget summary
- existing Style Lab budget/diagnostics/preflight evidence

No new aliases are defined.

Required gates:

- budget verdict `safe`
- preflight `PASS` or equivalent completed safe state
- production preview preflight `eligible`
- checksums exist and match
- variable count greater than `0`
- variable count within thresholds
- unsupported critical gap count `0`

## Apply Transaction Design

Future apply must record:

- transaction id
- session id
- bridge checksum
- budget checksum
- diagnostics checksum
- production preview preflight verdict
- target scope id
- target selector
- exact target count
- variable names
- variable count
- previous inline values snapshot
- apply duration
- network baseline window id
- status

Apply fails closed if:

- authenticated evidence missing
- target count is not exactly `1`
- target is document root, `html`, or `body`
- target class does not include `nexus-shell` and `nexus-outer-shell-frame`
- checksum missing/mismatched
- variable count `0`
- budget unsafe
- production preview preflight not `eligible`
- rollback snapshot cannot be created
- route-load network baseline missing
- store/backend/storage write would occur
- production behavior would be touched

## Revert Transaction Design

Future revert must:

- require an existing transaction
- resolve the same target selector
- confirm target count is exactly `1`
- confirm checksum/session match
- restore previous inline values exactly
- remove only preview-introduced variables that were absent before apply
- measure revert duration
- run residue check
- confirm remaining preview variables `0`
- leave unrelated inline styles untouched
- avoid backend/store/API calls
- be idempotent

Revert fails closed if:

- target missing
- target count is not exactly `1`
- transaction missing
- checksum/session mismatch
- expected target class missing
- residue check fails

## No-Mutation Policy

Future preview must:

- remain memory-only
- not write localStorage
- not write IndexedDB
- not write workspace store
- not call backend/API/Supabase
- not write files
- not persist runtime tokens
- not mutate document root, `html`, or `body`
- not add classes or raw CSS
- not touch production behavior

Network policy:

- record windows before preview, during apply, during revert, and after revert
- preview must not introduce new API calls
- existing `POST /api/v1/sync/operations 200` remains route-load baseline
  unless future evidence proves preview caused it
- if network tooling is unavailable, implementation remains held

## Future Implementation Boundary

Likely future allowed files:

- `src/lib/style-engine/v2-production-preview-transaction.ts`
- `src/lib/style-engine/v2-production-preview-transaction.test.ts`
- optional pure test fixtures under `src/lib/style-engine/**`
- optional Style Lab-only test hook in a later approved task
- production route integration only after separate explicit approval

Future forbidden files:

- `src/store/**`
- `src/lib/sync/**`
- `src/lib/backend/**`
- `src/lib/supabase/**`
- `src/app/api/**`
- production behavior files
- React Flow / graph files
- drag/resize/focus/z-index/window/modal behavior files
- package/config/deploy files
- Supabase/database/migrations
- `exports/**`
- persistence files

Future first implementation should not edit:

- `src/app/globals.css`
- production Nexus behavior components
- store/sync/backend/API modules

## Verification Plan

Future implementation verification:

- `git diff --check`
- focused transaction planner tests
- fail-closed tests
- idempotent revert tests
- previous inline value restoration tests
- residue check tests
- typecheck
- targeted lint
- build
- authenticated browser smoke after approval
- network baseline comparison
- apply/revert visual check
- no persistence check

## Forbidden Boundaries Held In This Run

- No push
- No deploy
- No `.env` or secrets read
- No `src/**` edits
- No package/config/deploy edits
- No `exports/**`
- No Supabase/database/migrations
- No store/sync/backend/Supabase/API edits
- No React Flow / graph behavior changes
- No production shell behavior changes
- No `src/app/globals.css`
- No runtime token persistence
- No backend persistence
- No production apply
- No DOM mutation
- No localStorage / IndexedDB writes
- No login or credential submission
- No asset/layout production apply

## Verification

- `git diff --check`: passed
- allowed-file status check: only this run's docs plus the pre-existing
  untracked `docs/style-system/v19-production-shell-style-required-reading.md`
  were present; only this run's docs were selected for staging
- tests/build/browser: not required because this run is docs-only

## Rollback Path

Revert this docs commit.

No source code, runtime state, persisted state, backend data, production preview
state, DOM mutation, or applied style variables were created.

## Residual Risk

Residual repository risk: below 5%.

Operational risk remains held at the authenticated evidence gate because no
implementation can start until evidence passes.
