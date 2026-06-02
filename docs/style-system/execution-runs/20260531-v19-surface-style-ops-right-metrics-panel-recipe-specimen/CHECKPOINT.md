# V19 Surface Style Ops Right Metrics Panel Recipe Specimen

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Starting HEAD: `e4fc5e8 feat: add surface style scene preview`

## Goal

Add a Style Lab-only Surface Style Ops right metrics panel recipe/specimen.

This loop did not connect production right-dock panels, store, backend,
Supabase, API, workspace persistence, runtime token apply, or production shell
behavior.

## Specimen Structure

Placement:

- `/style-lab`
- existing `Surface Style Scene Preview`
- right-side specimen target:
  - `data-testid="surface-style-right-metrics-specimen"`

Sections:

- selected agent summary
- collaboration map
- context stack
- goal metrics bars
- run execution chrome
- memory/history block

The specimen is static display-only. Its run execution chrome is rendered as
inert visual spans, not real buttons or behavior.

## Supported Capabilities

Supported now:

- surface style panel hierarchy inside the local scene preview
- direct alias-backed local preview variables
- right-side inspector density and hierarchy
- metric-card and status-block visual recipe evidence
- browser-visible relationship between workspace, agent window, and metrics
  panel composition

## Simulated-Only Capabilities

Simulated in Style Lab only:

- selected agent data
- collaboration topology
- context stack contents
- goal metrics
- run execution state
- memory/history events
- right-side panel composition

These do not create production selectors, production routes, persistence, API
calls, or right-dock behavior.

## Missing Production Capabilities

Still missing:

- production right metrics panel selector/recipe boundary
- safe adoption path for real right-dock panel content
- store-backed data mapping
- authenticated production `/` visual smoke
- layout preset/page shell arrangement
- broader typography density policy

## Changed Files

- `src/components/style-engine/nexus-style-lab.tsx`
- `src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts`
- `docs/style-system/surface-style-ops-direct-alias-preview-audit-v1.md`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v19-surface-style-ops-right-metrics-panel-recipe-specimen/CHECKPOINT.md`

## Verification

Passed:

- `git diff --check`
- `npm run test -- src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts`
- `npm run typecheck`
- `npm run lint -- src/components/style-engine/nexus-style-lab.tsx`
- `npm run build`

Build note:

- Next build emitted the known edge-runtime static-generation warning.
- Build output mentioned `.env.local`; this loop did not read `.env` or
  secrets.

## Browser Smoke

Target:

- `http://127.0.0.1:3000/style-lab`

Passed:

- Style Lab loaded.
- Surface Style fixture review accepted.
- token preview/revert worked.
- `Surface Style Scene Preview` rendered.
- `Right Metrics` specimen rendered.
- selected agent, collaboration map, context stack, goal metrics, run
  execution, and memory/history sections existed and were visible.
- Production Chrome Smoke apply/revert still worked.
- console errors: none observed.

No production `/` visit, no login, no persistence, and no workspace mutation.

## Visual Similarity Movement

Before this loop:

- Style Lab visual similarity estimate: about `52-55%`
- production skinning readiness estimate: about `68-72%`

After this loop:

- Style Lab visual similarity estimate: about `58-62%`
- production skinning readiness estimate: about `70-73%`

Reason:

- the right metrics panel is a major reference-image identity surface
- the scene preview now shows a denser right-side inspector hierarchy instead
  of a placeholder metrics block
- the implementation remains honest specimen/recipe evidence rather than
  pretending production right-dock behavior is tokenized

## Residual Risk

Estimated residual risk: below 5 percent.

Reasoning:

- Style Lab-only source change
- no production component files touched
- no `globals.css` touched
- no store/sync/backend/Supabase/API touched
- no document-root mutation, storage, remote URL, or copied reference asset
- focused tests, typecheck, lint, build, and browser smoke passed

## Rollback Path

Revert this loop commit.

That removes:

- right metrics specimen data/constants
- right metrics specimen markup in Style Lab
- source guard updates
- audit/map/checkpoint documentation updates

No persisted state or production cleanup is required.

## Forbidden Boundaries Held

Held:

- no push
- no deploy
- no `.env` or secrets read
- no package/config/deploy edits
- no `exports/**`
- no Supabase/database/migrations
- no store/sync/backend/API
- no React Flow/graph behavior
- no production shell behavior changes
- no runtime token persistence
- no backend persistence
- no asset pack production apply
- no layout preset production apply
- no `src/components/nexus/**`
- no `src/app/globals.css`
- no remote image URL
- no reference image copied into repo

## Next Recommended Target Seed

Task name:

`V19 Surface Style Ops Agent Card Bank Specimen`

Goal:

Create a Style Lab-only static agent card/bank recipe specimen that expands the
left-side Surface Style identity using direct aliases and local preview data.

Stop conditions:

- if it requires production AgentWindow behavior edits
- if it requires store/sync/backend/Supabase/API
- if it requires production runtime apply or persistence
- if it requires layout preset production apply
