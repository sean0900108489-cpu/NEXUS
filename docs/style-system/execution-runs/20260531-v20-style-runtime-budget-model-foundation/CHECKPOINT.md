# V20 Style Runtime Budget Model Foundation

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Starting HEAD:

- `284e806 docs: close v19 production skinning soft landing`

## Goal

Add the first pure implementation foundation for Option B performance-layer
optimization: a Style Runtime Budget model.

This loop did not connect DOM/runtime apply, persistence, production shell
behavior, Style Lab UI, store/backend/Supabase/API, asset/layout production
apply, or any production component.

## Preflight

Confirmed:

- branch: `codex/v19-production-shell-style-upgrade`
- HEAD includes `284e806`
- recent commits include:
  - `284e806 docs: close v19 production skinning soft landing`
  - `1bd3200 docs: consolidate v19 production skinning pre landing`
  - `ae69652 feat: add production control primitive selector`
  - `fa68807 feat: add warm glass control chrome specimen`
- pre-existing untracked file preserved and not staged:
  - `docs/style-system/v19-production-shell-style-required-reading.md`

## Helper Added

Added:

- `src/lib/style-engine/v2-style-runtime-budget.ts`
- `src/lib/style-engine/v2-style-runtime-budget.test.ts`

The helper is pure style-engine code. It imports only existing checksum,
Render Plan, Production Token Bridge, and production alias coverage types.

## API Summary

Exports:

- `createStyleRuntimeBudgetSummary(input)`
- `createStyleRuntimeBudgetSummaryFromRenderPlan(renderPlan, bridgePlanOrCoverage)`
- `DEFAULT_STYLE_RUNTIME_BUDGET_THRESHOLDS`
- `StyleRuntimeBudgetSummary`
- `StyleRuntimeBudgetVerdict`
- `StyleRuntimeBudgetReason`
- `StyleRuntimeBudgetThresholds`
- `StyleRuntimeBudgetUnsupportedCapability`
- `StyleRuntimeBudgetEstimatedApplyCost`

Inputs supported:

- accepted Render Plan
- accepted Production Token Bridge Plan
- production alias coverage report
- normalized CSS variable maps/counts
- unsupported capability metadata
- threshold overrides

Output includes:

- `verdict`: `safe | warn | block`
- `cssVariableCount`
- `directAliasCount`
- `aliasFamilyCount`
- `fallbackDrivenCount`
- `smokeOnlyCount`
- `unsupportedCount`
- `unsupportedCapabilities`
- `highCostEffectCount`
- `estimatedApplyCost`
- `reasons`
- `degradationHints`
- `thresholds`
- deterministic `checksum` and `summaryId`

## Default Thresholds

Defaults:

- safe CSS variables: `<= 120`
- block CSS variables: `> 220`
- safe estimated apply cost: `<= 180`
- block estimated apply cost: `> 320`
- warn unsupported count: `> 0`
- warn high-cost effects: `> 36`
- block high-cost effects: `> 72`

Warm Glass review-only target capability gaps are carried as `info`
capabilities. They remain visible in the summary but do not make the current
Warm Glass bridge unsafe by themselves.

## Safe / Warn / Block Logic

Safe:

- accepted input
- variable and estimated apply cost within thresholds
- no budget-relevant unsupported aliases/capabilities
- no critical unsupported capability

Warn:

- CSS variable count exceeds the safe threshold
- estimated apply cost exceeds the safe threshold
- high-cost effect count exceeds warning threshold
- non-critical unsupported capability or unsupported alias requires degraded
  preview

Block:

- missing or invalid input
- rejected Render Plan, bridge plan, or coverage report
- blocked Render Plan / Bridge Plan performance budget
- CSS variable count exceeds block threshold
- estimated apply cost exceeds block threshold
- high-cost effect count exceeds block threshold
- critical unsupported capability exists

Fail-closed behavior:

- missing input returns `block`
- invalid render plan-like objects return `block`
- rejected/blocked plans do not leak unsafe payloads into the summary

## Degradation Hints

Warn/block summaries return hints such as:

- reduce bridge variable count before runtime preview
- reduce blur intensity and shadow/glow count
- collapse unsupported recipe surfaces to fallback treatment
- keep asset and layout features review-only until gates are approved
- prefer direct bridge aliases before production preview
- avoid production preview until block reasons are resolved

Safe summaries return no degradation hints.

## Warm Glass Fixture Result

Warm Glass budget summary:

- verdict: `safe`
- CSS variables: `83`
- direct aliases: `58`
- alias families: `10`
- fallback-driven aliases: `0`
- smoke-only aliases: `0`
- unsupported count: `0`
- unsupported capabilities carried as info: `6`
- high-cost effect count: `24`
- estimated apply cost:
  - score: `131`
  - level: `low`
- checksum:
  - `nexus-style-fnv1a32:85e89afc`

Interpretation:

- the current Warm Glass bridge output is inside the first runtime budget
  model
- existing unsupported target-image capabilities remain visible but review-only
- this does not authorize production apply or persistence

## Tests

Focused tests cover:

1. Warm Glass fixture / bridge output produces `safe`
2. alias count and family count are computed
3. unsupported capability produces `warn`
4. critical unsupported capability produces `block`
5. excessive CSS variables produce `warn` or `block`
6. missing/invalid input fails closed with `block`
7. degradation hints appear for warn/block
8. checksum is deterministic
9. helper emits no selectors, raw CSS payload, DOM instructions, or behavior
   classes

## Verification

Passed:

- `git diff --check`
- `npm run test -- src/lib/style-engine/v2-style-runtime-budget.test.ts`
- `npm run test -- src/lib/style-engine`
- `npm run typecheck`
- `npm run lint -- src/lib/style-engine`
- `npm run build`

Build notes:

- Next build emitted the known edge-runtime static-generation warning.
- Build output mentioned `.env.local`; this loop did not read `.env` or
  secrets.

No browser smoke was required because this loop added no UI and no DOM/runtime
path.

## What Remains For Style Lab Performance Panel

Remaining future work:

- expose budget summaries in Style Lab coverage/performance panel
- show safe/warn/block status beside Warm Glass coverage
- show variable count, estimated apply cost, high-cost effect count, and hints
- keep display read-only and non-persistent

This was not done in this loop.

## What Remains Before Production Preview

Still required before production preview:

- user decision to proceed with true environment connection or performance
  panel work
- non-persistent preview channel design
- authenticated production smoke plan
- apply/revert duration instrumentation
- scheduling policy for any future apply path
- explicit no-persistence guard
- V20/V21 gates for asset/layout/runtime apply

## Residual Risk

Estimated residual risk: below 5 percent.

Reason:

- pure helper only
- no DOM operation
- no runtime apply/revert
- no persistence
- no store/backend/Supabase/API
- no production components
- no global CSS
- focused tests and full style-engine test suite passed

## Rollback Path

Revert this loop commit.

That removes:

- `v2-style-runtime-budget.ts`
- `v2-style-runtime-budget.test.ts`
- this checkpoint

No production state, persisted data, backend data, or runtime cleanup is
required.

## Forbidden Boundaries Held

Held:

- no push
- no deploy
- no `.env` or secrets read
- no package/config/deploy edits
- no `exports/**`
- no Supabase/database/migrations
- no store/sync/backend/Supabase/API
- no React Flow/graph behavior
- no production shell behavior
- no `src/components/nexus/**`
- no `src/components/**`
- no `src/app/**`
- no `src/app/globals.css`
- no runtime token persistence
- no backend persistence
- no production apply
- no DOM mutation
- no asset/layout production apply

## Next Recommended Target Seed

Task name:

`V20 Style Runtime Budget Panel Read-Only Report`

Goal:

- surface the pure budget summary in Style Lab as a read-only performance panel
  for Warm Glass / bridge previews.

Allowed direction:

- Style Lab display only
- no DOM apply/revert changes
- no production runtime apply
- no persistence

Stop conditions:

- if it requires production apply
- if it requires persistence
- if it changes production shell behavior
- if it tries to optimize runtime before budget display evidence exists
