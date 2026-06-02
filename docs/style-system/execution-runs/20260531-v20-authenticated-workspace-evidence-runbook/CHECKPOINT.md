# V20 Authenticated Workspace Evidence Runbook Checkpoint

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Base commit: `ffcc578 docs: add production preview design hold plan`

## Task

Create a docs-only runbook for future authenticated workspace evidence
collection.

This run did not perform browser smoke, did not log in, did not edit source, did
not implement production preview, did not mutate DOM, and did not add
persistence.

## Preflight

- Branch confirmed: `codex/v19-production-shell-style-upgrade`
- HEAD included: `ffcc578 docs: add production preview design hold plan`
- Recent commits recorded:
  - `ffcc578 docs: add production preview design hold plan`
  - `0943a14 docs: record authenticated production preview scope smoke`
  - `5c3019f docs: map production preview target scopes`
  - `8de062d feat: add production preview preflight contract`
  - `9bf090e feat: add style runtime preflight gate`
  - `e1ead5d feat: add style runtime preview diagnostics`
  - `b220ce5 feat: show roi gated style runtime budget report`
  - `b496710 feat: add style runtime budget model`
- Pre-existing untracked file recorded and not staged:
  - `docs/style-system/v19-production-shell-style-required-reading.md`

## Files Created

- `docs/style-system/v20-authenticated-workspace-evidence-runbook.md`
- `docs/style-system/execution-runs/20260531-v20-authenticated-workspace-evidence-runbook/CHECKPOINT.md`

## Read-Only Inputs

- `docs/style-system/v20-non-persistent-production-preview-design-hold-plan.md`
- `docs/style-system/v20-authenticated-production-preview-scope-smoke-checklist.md`
- `docs/style-system/v20-production-preview-target-scope-candidate-map.md`
- `docs/style-system/execution-runs/20260531-v20-non-persistent-production-preview-design-hold-plan/CHECKPOINT.md`
- `docs/style-system/execution-runs/20260531-v20-authenticated-production-preview-scope-smoke-checklist/CHECKPOINT.md`

No source inspection was needed because the required route-edge and target
selectors were already captured in the immediate prior docs/checkpoints.

## Auth Decision Tree

Documented states:

- Auth gate visible:
  - record `auth-gated`
  - do not log in
  - do not submit credentials
  - stop evidence collection
- Authenticated workspace visible:
  - continue selector checks
  - continue adopted surface checks
  - continue console/hydration baseline
  - continue network baseline
- Ambiguous state:
  - record unclear/tooling hold
  - stop
  - do not force interaction

## Required Selectors

Route-edge selectors:

- `[data-nexus-production-page-shell-boundary="v1"]`
- `[data-nexus-page-shell="workspace"]`
- `[data-nexus-production-apply="blocked"]`

Target selector:

- `main.nexus-shell.nexus-outer-shell-frame`

Core surface selectors:

- `.nexus-top-bar-frame`
- `.nexus-right-floating-dock-rail`
- `.nexus-workspace`

Stateful/optional surface selectors:

- `.nexus-message-bubble`
- `.nexus-agent-window`
- `.nexus-command-palette-shell`
- `.nexus-agent-branch-modal-shell`
- `.nexus-datapad-shell`
- `.nexus-control-icon-button-shell`

## No-Mutation Rules

Allowed:

- read DOM
- read visibility
- read computed style
- read console
- read network logs
- safe visibility checks
- safe open/close only when no command, submit, save/delete/upload/download, or
  workspace mutation can occur

Forbidden:

- setting CSS variables
- inline style mutation
- class mutation
- document root mutation
- localStorage / IndexedDB writes
- login / credential submission
- form submit
- command execution
- message send
- save/delete/upload/download
- deliberate store/backend/API-triggering actions
- source edits

## Network Baseline Policy

Evidence windows documented:

1. before route load, if possible
2. route load baseline
3. after workspace stable
4. optional safe interaction
5. future apply window
6. future revert window
7. future after-revert window

Required tracked items:

- `POST /api/v1/sync/operations`
- notebook requests
- recovery requests
- prompt requests
- auth/session requests
- workspace state requests
- console errors/warnings
- hydration mismatch
- Chrome Translate state
- `bg-surface-shell.webp` known baseline

Policy:

- `POST /api/v1/sync/operations` is route-load baseline unless future evidence
  proves preview caused it
- preview implementation must not add new API calls
- if network tooling is unavailable, implementation remains held

## Pass / Hold / Block Criteria

Pass requires:

- authenticated workspace visible
- route-edge selectors present
- target exists exactly once
- target visible and not document root/body
- TopBar, right dock, and workspace visible
- optional/stateful surfaces recorded honestly
- console/hydration baseline recorded
- route-load network baseline recorded
- no deliberate mutation
- no source changes
- no credentials submitted

Hold includes:

- auth gate
- target missing
- required surfaces hidden due route state
- console/network tooling unavailable
- route-load baseline not separable
- safe interaction unavailable

Blocked includes:

- workspace crash
- required UI missing in otherwise healthy workspace
- target duplicated
- target is document root/body
- mutation required to observe target
- hydration crash
- unexpected production behavior regression
- command/form/Datapad/workspace mutation required
- preview would need store/backend/API writes

## Next Seed

If evidence passes, next seed:

- `V20 Non-Persistent Production Preview First Cut Design`

The runbook states that this is still design-first unless the user explicitly
approves implementation.

## Forbidden Boundaries Held

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

No source code, runtime state, persistence, backend data, production preview
state, or applied style variables were created.

## Residual Risk

Residual repository risk: below 5%.

Operational confidence remains held until a future run executes this runbook in
a pre-existing authenticated session.
