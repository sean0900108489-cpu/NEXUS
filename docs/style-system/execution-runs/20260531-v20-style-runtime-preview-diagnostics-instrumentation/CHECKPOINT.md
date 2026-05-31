# V20 Style Runtime Preview Diagnostics Instrumentation

Date: 2026-05-31
Branch: `codex/v19-production-shell-style-upgrade`
Base commit: `b220ce5 feat: show roi gated style runtime budget report`

## Goal

Add Style Lab-only preview diagnostics so the local Production Chrome Smoke apply/revert path becomes measurable before any future non-persistent production preview preflight.

This round did not add visual specimens, production aliases, selectors, persistence, production runtime apply, or production `/` behavior.

## ROI Diagnostics Field Decision

Primary fields:
- `status`: `idle`, `applied`, `reverted`, or `failed`
- `applyDurationMs`
- `revertDurationMs`
- `variableCount`
- `checksum`
- `sessionId`
- `targetScope`
- `residueCheck`

These fields directly answer whether a local preview operation can be trusted enough to graduate toward preview diagnostics / production bridge preflight.

Secondary fields:
- timestamp
- fail-safe text
- last error message
- browser/tooling notes
- variable family count

These were kept secondary to avoid turning the panel into a noisy diagnostics console.

## Diagnostics Added

Target scope:
- `style-lab-production-chrome-smoke`

Panel:
- `Style Runtime Preview Diagnostics`

Displayed fields:
- status
- preview preflight eligibility
- fail-safe status
- session id
- target scope
- checksum
- apply duration
- revert duration
- variable count
- residue check
- last update timestamp

The checksum is sourced from the Warm Glass budget summary:
- `nexus-style-fnv1a32:85e89afc`

## Measurement Behavior

Apply path:
- Uses `performance.now()` when available, with a safe `Date.now()` fallback.
- Fails closed if the smoke variable list is empty.
- Fails closed if the local smoke target ref is missing.
- Applies variables only to the local Style Lab Production Chrome Smoke container.
- Records duration, session id, checksum, target scope, and applied variable count.

Revert path:
- Uses the existing diagnostics session id when available.
- Fails closed if the local smoke target ref is missing.
- Removes only the known smoke variables from the local Style Lab container.
- Runs a residue check by counting remaining known inline smoke variables.
- Reports `pass` when all known smoke variables are removed.

No document root mutation was added. No storage, backend, API, Supabase, workspace, or production runtime path was touched.

## Changed Files

- `src/components/style-engine/nexus-style-lab.tsx`
- `src/components/style-engine/nexus-style-lab-warm-glass-coverage.test.ts`
- `docs/style-system/execution-runs/20260531-v20-style-runtime-preview-diagnostics-instrumentation/CHECKPOINT.md`

## Verification

Passed:
- `git diff --check`
- `npm run test -- src/components/style-engine/nexus-style-lab-warm-glass-coverage.test.ts`
- `npm run test -- src/lib/style-engine/v2-style-runtime-budget.test.ts`
- `npm run typecheck`
- `npm run lint -- src/components/style-engine/nexus-style-lab.tsx src/lib/style-engine`
- `npm run build`

Build note:
- Existing Next warning observed: edge runtime disables static generation for that page. This was not introduced by this round.

## Browser Smoke

Target:
- `http://localhost:3000/style-lab`

Result:
- Full local Style Lab smoke pass.

Confirmed:
- Style Lab loaded.
- Style Runtime Budget panel rendered.
- Style Runtime Preview Diagnostics panel rendered.
- Warm Glass Scene Preview rendered.
- Production Chrome Smoke panel rendered.
- Apply Smoke Vars updated diagnostics:
  - status: `applied`
  - apply duration: `0.60ms`
  - variable count: `30`
  - checksum: `nexus-style-fnv1a32:85e89afc`
  - target scope: `style-lab-production-chrome-smoke`
- Revert Smoke Vars updated diagnostics:
  - status: `reverted`
  - revert duration: `0.50ms`
  - residue check: `pass`
  - remaining local inline smoke vars: `0`
- Console error count: `0`

Token preview note:
- Warm Glass fixture review was accepted in the browser session.
- Token preview controls were disabled in the current Style Lab state, so no token preview mutation was forced.

Production `/` was not visited.

## Fail-Closed Behavior

Covered by source guard:
- Missing target ref records failed diagnostics instead of applying.
- Empty variable list records failed diagnostics instead of applying.
- Revert without a target ref records failed diagnostics.
- Diagnostics path remains local-container scoped and does not mutate `document.documentElement`.

## Remaining Before Production Preview Preflight

- Add a local preview diagnostics gate that consumes:
  - budget verdict
  - diagnostics status
  - residue check
  - checksum/session trace
- Define a non-persistent production bridge preflight contract.
- Keep production `/` out of scope until the local diagnostics gate is stable.
- Keep persistence and runtime token apply behind an explicit later gate.

## Residual Risk

Estimated residual failure risk: below 5%.

Main residual risks:
- Browser click tooling can still be flaky in future runs, but this round achieved a full local apply/revert diagnostics pass.
- Diagnostics currently measures the Production Chrome Smoke local scope only, not production `/`.
- Durations are browser/session dependent and should be treated as diagnostic evidence, not hard performance benchmarks.

## Rollback Path

Revert this commit to remove:
- diagnostics state and panel from Style Lab
- focused source guard additions
- this checkpoint

No persisted state, storage cleanup, backend cleanup, or production token cleanup is required.

## Next Recommended Target Seed

Task name:
- `V20 Style Runtime Diagnostics Preflight Gate`

Goal:
- Add a Style Lab-only preflight gate that combines budget verdict, diagnostics status, residue check, checksum, and target scope before enabling any future non-persistent preview bridge path.

Allowed direction:
- local Style Lab diagnostics / read-only or gated preview controls only
- no production `/`
- no persistence
- no backend/store/API
- no production runtime apply
