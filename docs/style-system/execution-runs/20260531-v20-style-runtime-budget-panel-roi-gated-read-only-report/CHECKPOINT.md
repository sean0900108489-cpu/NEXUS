# V20 Style Runtime Budget Panel ROI-Gated Read-Only Report

Date: 2026-05-31
Branch: `codex/v19-production-shell-style-upgrade`
Base commit confirmed: `b496710 feat: add style runtime budget model`

## Goal

Expose the V20 style runtime budget model in `/style-lab` as a read-only, ROI-gated readiness report for the next preview diagnostics / non-persistent production bridge preflight stage.

This round intentionally did not add production apply, persistence, DOM mutation outside normal React render, aliases, selectors, or production shell changes.

## ROI Field Decision

Primary fields shown above the fold because they answer whether the Warm Glass Render/Bridge output can proceed to preview diagnostics:

- `verdict`
- preview diagnostics eligibility
- CSS variable pressure against the safe threshold
- estimated apply cost against the safe threshold
- high-cost effect pressure
- unsupported critical gap count
- checksum / summary traceability

Secondary fields were kept in lower-priority detail rows to avoid a noisy dashboard:

- direct alias count
- alias family count
- fallback-driven count
- smoke-only count
- info-only unsupported capabilities
- degradation hint count / short hint list

## Panel Added

Added a read-only `Style Runtime Budget` panel in `src/components/style-engine/nexus-style-lab.tsx`.

The panel shows:

- `SAFE / WARN / BLOCK` verdict strip
- preview diagnostics eligibility
- primary reason
- next ROI step: preview diagnostics instrumentation
- checksum / summary trace
- pressure row: CSS vars, estimated apply cost, high-cost effects, critical gaps
- detail row: direct aliases, families, fallback, smoke-only, info gaps, hints
- degradation hints

The panel is explicitly labeled:

- read-only
- no production apply
- no persistence

## Warm Glass Budget Result Displayed

Warm Glass fixture budget result:

- verdict: `safe`
- CSS variables: `83/120`
- direct aliases: `58`
- alias families: `10`
- fallback-driven: `0`
- smoke-only: `0`
- unsupported count: `0`
- info-only unsupported capabilities: `6`
- high-cost effects: `24/36`
- estimated apply cost: `131/180`
- estimated apply cost level: `low`
- checksum: `nexus-style-fnv1a32:85e89afc`
- degradation hints: none

Preview diagnostics eligibility:

- `preview diagnostics ready`

## Changed Files

- `src/components/style-engine/nexus-style-lab.tsx`
- `src/components/style-engine/nexus-style-lab-warm-glass-coverage.test.ts`
- `docs/style-system/execution-runs/20260531-v20-style-runtime-budget-panel-roi-gated-read-only-report/CHECKPOINT.md`

## Verification

Passed:

- `git diff --check`
- `npm run test -- src/components/style-engine/nexus-style-lab-warm-glass-coverage.test.ts`
  - 1 file passed
  - 8 tests passed
- `npm run test -- src/lib/style-engine/v2-style-runtime-budget.test.ts`
  - 1 file passed
  - 8 tests passed
- `npm run typecheck`
- `npm run lint -- src/components/style-engine/nexus-style-lab.tsx src/lib/style-engine`
- `npm run build`

Build note:

- Existing Next.js warning observed: `Using edge runtime on a page currently disables static generation for that page`.
- No new build failure or lint/typecheck regression.

## Browser Smoke

Dev server:

- Started temporary `npm run dev` after non-browser verification passed.

Read-only `/style-lab` browser evidence:

- `/style-lab` loaded.
- `Style Runtime Budget` panel rendered.
- verdict visible: `safe`
- preview diagnostics eligibility visible: `preview diagnostics ready`
- CSS variable pressure visible: `83/120`
- estimated apply cost visible: `131/180`
- high-cost effect pressure visible: `24/36`
- critical gaps visible: `0`
- checksum visible: `nexus-style-fnv1a32:85e89afc`
- Warm Glass Scene Preview selector exists.
- Production Chrome Smoke section exists.
- token preview/revert controls exist.
- console errors: `0`

Interaction limitation:

- In the in-app browser session, Playwright locator clicks, DOM CUA clicks, and coordinate clicks did not trigger React state updates for existing Style Lab controls.
- Desktop Chrome could not connect to the temporary local dev server from its existing localhost tab.
- Therefore token preview/revert and Production Chrome Smoke apply/revert were not re-executed as full interactive browser actions in this run.
- This is recorded as a browser tooling limitation, not a product regression:
  - this round did not alter preview/revert handlers
  - focused source guards passed
  - existing preview/revert controls remained present
  - console errors remained `0`

## No Behavior Changes

No apply/revert behavior changed.

No production runtime touched.

No persistence, storage, backend, Supabase, API, production shell, graph, or `src/app/globals.css` files touched.

## Remaining Work For Preview Diagnostics

Next preview diagnostics should add instrumentation around the existing preview path, still without production persistence:

- measure token preview duration
- measure bridge preview duration
- count applied CSS variables per preview session
- capture budget summary id/checksum per preview session
- detect warn/block before preview
- keep all measurements local and non-persistent

## Residual Risk

Estimated residual failure risk: below 5%.

Rationale:

- panel is read-only
- helper remains pure
- no production runtime path changed
- no persistence introduced
- source/build gates passed
- browser DOM/read-only evidence confirms the new report renders

The only unresolved confidence gap is the browser-tooling-limited inability to re-click existing preview/apply controls in this run.

## Rollback Path

Revert the commit for this round to remove:

- the `Style Runtime Budget` panel
- the focused Style Lab source guard update
- this checkpoint

No persisted state cleanup is required.

## Next Recommended Target Seed

Task name:

`V20 Style Runtime Preview Diagnostics Instrumentation`

Goal:

Add local, non-persistent preview diagnostics around Style Lab token preview and production bridge preview paths using the budget summary as preflight evidence.

Allowed direction:

- Style Lab-only diagnostics
- pure timing/count helpers if needed
- no production apply
- no persistence
- no backend/store/API

Stop condition:

- stop if diagnostics would require production runtime mutation, persisted telemetry, or broad preview handler refactor.
