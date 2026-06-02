# V19 Production Skinning Pre-Landing Consolidation

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Starting HEAD:

- `ae69652 feat: add production control primitive selector`

## Goal

Consolidate V19 production skinning before landing decisions.

This was a docs-only pre-landing round. It did not add token aliases,
selectors, production runtime apply, persistence, source changes, store/backend
work, Supabase/API work, asset apply, layout apply, or broad refactors.

## Preflight

Confirmed:

- branch: `codex/v19-production-shell-style-upgrade`
- recent commits include:
  - `e4fc5e8 feat: add surface style scene preview`
  - `530c466 feat: add surface style right metrics specimen`
  - `f5d3fd5 feat: add surface style agent card specimen`
  - `b7378b8 feat: add surface style segmented nav specimen`
  - `fa68807 feat: add surface style control chrome specimen`
  - `ae69652 feat: add production control primitive selector`
- pre-existing untracked file preserved and not staged:
  - `docs/style-system/v19-production-shell-style-required-reading.md`

## Reading / Evidence

Required consolidation sources were reviewed:

- production extraction map
- Surface Style north-star document
- direct alias preview audit
- typography/icon/button polish audit
- 60 percent gate checkpoint
- production alias bridge expansion checkpoint
- scene wash preview checkpoint
- right metrics specimen checkpoint
- agent card bank specimen checkpoint
- segmented top navigation specimen checkpoint
- icon/button chrome recipe specimen checkpoint
- production control primitive selector-first checkpoint
- Style Lab Surface Style / smoke harness source anchors
- production token bridge source anchors
- production alias coverage source anchors

Targeted production-source evidence was collected with `rg` only.

## Docs Created

- `docs/style-system/v19-production-skinning-pre-landing-consolidation.md`
- `docs/style-system/v19-surface-style-ops-user-testing-guide.md`
- `docs/style-system/execution-runs/20260531-v19-production-skinning-pre-landing-consolidation/CHECKPOINT.md`

Updated:

- `docs/style-system/production-shell-extraction-map-v1.md`

## Adhesion Map Summary

Production-adhered:

- RightDock rail
- TopBar frame
- OuterShell
- Workspace
- MessageBubble roles
- AgentWindow chrome
- CommandPalette shell
- Modal shell
- Datapad shell
- ToolbarIconButton selector prep

Bridge/report adhered:

- Surface Style fixture
- Render Plan / Production Token Bridge
- production alias coverage report

Style Lab-only specimens:

- Production Chrome Smoke harness
- Surface Style Scene Preview
- Right Metrics Panel specimen
- Agent Card Bank specimen
- Segmented Top Navigation specimen
- Icon/Button Chrome recipe specimen

Needs channel before real landing:

- authenticated production smoke
- non-persistent preview channel
- recipe boundaries for metrics/cards/nav/control primitives
- asset/layout gate
- runtime apply/persistence gate

## Landing Readiness Summary

Current estimate:

- production skinning readiness: about `78-79%`

Classification:

- ready for Style Lab user testing:
  Surface Style fixture, coverage panel, scene preview, recipe specimens,
  Production Chrome Smoke
- ready for authenticated production smoke:
  current adopted production aliases/selectors and ToolbarIconButton selector
- ready for cautious follow-up:
  ToolbarIconButton selector path and future primitive scans only one target at
  a time
- needs recipe boundary:
  right metrics, agent cards, segmented navigation, control chrome,
  typography density
- needs V20 gate:
  runtime apply, persistence, asset/background pipeline, layout preset apply,
  broad production behavior adoption

## Candidate Next Tracks

1. User testing guide track
   - recommended first
   - highest value for reducing design/product uncertainty without increasing
     implementation risk
2. Authenticated production smoke track
   - needed to confirm live `/` surfaces behind auth
3. Production alias-to-workspace bridge track
   - should start as non-persistent design before implementation
4. Recipe boundary track
   - needed for Style Lab specimens to become production candidates
5. Production primitive selector track
   - useful but risk is rising; avoid broad badge/status/counter sweeps
6. Asset/layout gate track
   - high visual value but should wait for V20 governance

## Pre-Landing Verdict

V19 should stop broad implementation now.

The work is closer to 80% than 60%, but the final stretch is not more random
component selectors. The missing evidence is user/designer testing,
authenticated production smoke, recipe boundaries, and V20-level gates for
assets/layout/runtime apply.

## What Should Stop Now

Stop:

- blind badge/status/counter selector work
- right-dock artifact/vault persistence panel implementation
- runtime token apply
- token persistence
- production asset/background apply
- layout preset production apply
- broad `nexus-ops.tsx` refactor
- store/sync/backend/Supabase/API work

## Verification

Passed:

- `git diff --check`
- confirmed `git diff --name-only` only contains allowed docs

No tests/build/browser were required because this round was docs-only and no
source files were changed.

## Residual Risk

Estimated residual risk: below 5 percent.

Reason:

- docs-only
- no production runtime/source changes
- no persistence
- no selectors/aliases
- no forbidden systems touched

## Rollback Path

Revert this commit.

That removes:

- pre-landing consolidation doc
- user testing guide
- checkpoint
- extraction-map section

No production cleanup is required.

## Forbidden Boundaries Held

Held:

- no push
- no deploy
- no `.env` or secrets read
- no `src/**` edits
- no package/config/deploy edits
- no `exports/**`
- no Supabase/database/migrations
- no store/sync/backend/Supabase/API
- no React Flow/graph behavior
- no production shell behavior
- no new token alias
- no new selector
- no runtime token persistence
- no backend persistence
- no production apply
- no asset/layout production apply

## Next Recommended Target Seed

Task name:

`V19 Surface Style Ops User Testing Pass`

Goal:

- use the Style Lab testing guide to collect user/designer evidence for Warm
  Glass coverage, preview clarity, recipe quality, and remaining blockers.

Allowed files:

- docs/checkpoint only unless a clearly bounded Style Lab display bug is found

Forbidden files:

- production runtime/source changes
- new aliases/selectors
- persistence
- backend/store/API
- asset/layout production apply

Stop condition:

- if testing indicates the next need is authenticated smoke or V20 asset/layout
  gates, stop and write the evidence instead of implementing a low-ROI selector.
