# V20 Non-Persistent Production Preview Design Hold Plan Checkpoint

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Base commit: `0943a14 docs: record authenticated production preview scope smoke`

## Task

Create a design hold plan for future non-persistent production preview.

This run was docs-only. It did not implement production preview, did not mutate
DOM, did not apply variables, did not add persistence, did not edit source, and
did not attempt login or auth bypass.

## Preflight

- Branch confirmed: `codex/v19-production-shell-style-upgrade`
- HEAD included: `0943a14 docs: record authenticated production preview scope smoke`
- Recent commits recorded:
  - `0943a14 docs: record authenticated production preview scope smoke`
  - `5c3019f docs: map production preview target scopes`
  - `8de062d feat: add production preview preflight contract`
  - `9bf090e feat: add style runtime preflight gate`
  - `e1ead5d feat: add style runtime preview diagnostics`
  - `b220ce5 feat: show roi gated style runtime budget report`
  - `b496710 feat: add style runtime budget model`
  - `284e806 docs: close v19 production skinning soft landing`
- Pre-existing untracked file recorded and not staged:
  - `docs/style-system/v19-production-shell-style-required-reading.md`

## Docs Created

- `docs/style-system/v20-non-persistent-production-preview-design-hold-plan.md`
- `docs/style-system/execution-runs/20260531-v20-non-persistent-production-preview-design-hold-plan/CHECKPOINT.md`

## Read-Only Evidence Used

- `docs/style-system/v20-authenticated-production-preview-scope-smoke-checklist.md`
- `docs/style-system/execution-runs/20260531-v20-authenticated-production-preview-scope-smoke-checklist/CHECKPOINT.md`
- `docs/style-system/v20-production-preview-target-scope-candidate-map.md`
- `docs/style-system/execution-runs/20260531-v20-non-persistent-production-preview-preflight-contract/CHECKPOINT.md`
- `src/lib/style-engine/v2-production-preview-preflight.ts`
- `src/components/nexus/nexus-production-page-shell-boundary.tsx`
- `src/components/nexus/nexus-ops-outer-shell-frame.tsx`

## Blockers

Hard blocker:

- authenticated workspace target evidence is missing
- `main.nexus-shell.nexus-outer-shell-frame` was not observed in `/`

Evidence blockers:

- adopted production surfaces did not render because the route was auth-gated
- authenticated smoke is still missing

Baseline classification blocker:

- route-load API/sync activity exists and must be separated from preview-caused
  mutation before implementation starts
- `POST /api/v1/sync/operations 200` is classified as existing route-load
  baseline unless future evidence proves preview caused it

Not blockers:

- route-edge boundary exists
- auth gate shell exists
- preflight contract exists
- Style Runtime Budget, Diagnostics, and Preflight Gate exist

## Future Target Scope

Future intended first target:

- selector: `main.nexus-shell.nexus-outer-shell-frame`
- scope id: `nexus-outer-shell-frame`
- scope type: `authenticated-production-route`
- persistence: `none`
- mutation target: `production-route-container`
- auth smoke required: yes

Reason:

- it is below document root
- it is narrower than generic `main.nexus-shell`
- it is a production-adhered outer shell wrapper
- it can cascade current alias families once authenticated workspace renders
- rollback can remove variables from one declared target

Rejected targets:

- document root: blocked
- route-edge boundary: guard/evidence marker, not mutation target
- generic `main.nexus-shell`: too broad and exists for auth gate
- individual surfaces: useful smoke targets, too fragmented for first preview

## Apply/Revert Transaction Design

Future design must record:

- transaction id
- session id
- budget checksum
- diagnostics checksum
- target scope id
- target selector
- variable count
- exact variable names
- previous inline values snapshot
- apply duration
- revert duration
- final status
- residue check

Apply must fail closed if:

- target missing
- target count is not exactly one
- target is document root or `body`
- checksum missing or mismatched
- variable count is `0`
- authenticated smoke evidence missing
- route-load network baseline missing
- rollback snapshot fails
- unsafe write flags are present
- production behavior would be touched

Revert must:

- restore every previous inline value
- remove variables that were absent before apply
- run residue check
- leave no persistence

## Route-Load Network Baseline Policy

Future smoke must record request windows:

1. before preview
2. during apply
3. during revert
4. after revert

Policy:

- route-load network activity is baseline if it occurs before preview apply and
  exists without preview implementation
- preview implementation must not add API calls
- new write traffic during apply/revert is preview-caused mutation unless
  proven otherwise
- if tooling cannot observe network reliably, keep implementation held

## Unlock Criteria

Option A implementation may start only when:

1. a pre-existing authenticated session is available
2. `main.nexus-shell.nexus-outer-shell-frame` is observed
3. adopted production surfaces are visible enough for smoke
4. console/hydration baseline is recorded
5. route-load network baseline is recorded
6. Style Lab budget/diagnostics/preflight evidence remains passing
7. production preview preflight contract is eligible, or its auth-smoke hold is
   resolved
8. rollback/revert transaction strategy is approved
9. preview path requires no persistence/store/backend/API writes
10. implementation scope is limited to one non-persistent preview target
11. document root mutation remains blocked
12. no production behavior, command execution, modal submit, Datapad
    save/delete/upload/download, drag/resize/focus/z-index, React Flow, or graph
    behavior is touched

## Explicit Hold

Option A design can continue.

Option A implementation remains blocked.

## Forbidden Boundaries Held

- No push
- No deploy
- No `.env` or secrets read
- No `src/**` edits
- No package/config/deploy edits
- No `exports/**`
- No Supabase/database/migrations
- No store/sync/backend/Supabase/API source edits
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
state, or applied style variables were created.

## Residual Risk

Residual repository risk: below 5%.

Operational confidence remains held until authenticated workspace evidence is
collected.

## Next Recommended Target Seed

`V20 Authenticated Production Preview Scope Evidence Retry`

Goal:

- rerun authenticated scope smoke with a pre-existing authenticated session
- confirm `main.nexus-shell.nexus-outer-shell-frame`
- record adopted surface visibility
- record route-load network baseline
- keep production preview apply blocked
