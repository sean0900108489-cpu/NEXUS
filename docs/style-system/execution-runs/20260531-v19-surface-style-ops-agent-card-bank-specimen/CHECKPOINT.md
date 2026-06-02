# V19 Surface Style Ops Agent Card Bank Specimen

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Starting HEAD: `530c466 feat: add surface style right metrics specimen`

## Goal

Add a Style Lab-only Surface Style Ops agent card bank recipe/specimen.

This loop did not connect production AgentWindow behavior, production shell,
store, backend, Supabase, API, workspace persistence, runtime token apply, or
production layout behavior.

## Specimen Structure

Placement:

- `/style-lab`
- existing `Surface Style Scene Preview`
- left-side specimen target:
  - `data-testid="surface-style-agent-card-bank-specimen"`

Sections and details:

- agent bank header
- inert add affordance
- five compact agent cards
- Architect / Explorer / Sentinel / Auditor / Steward roles
- soft avatar initial blocks
- role labels
- status dot and status text
- load and queue micro-metrics
- subtle card separators

The specimen is static display-only. The add affordance is rendered as inert
visual text, not a real action or event handler.

## Supported Capabilities

Supported now:

- surface style left-side roster hierarchy inside the local scene preview
- direct alias-backed local preview variables
- agent card density and hierarchy
- visual relationship between agent bank, workspace board, and right metrics
  specimen
- browser-visible card role/status treatment

## Simulated-Only Capabilities

Simulated in Style Lab only:

- agent roster data
- role identity state
- status state
- load and queue values
- add affordance
- actual agent-card production recipe

These do not create production selectors, production routes, persistence, API
calls, or AgentWindow behavior.

## Missing Production Capabilities

Still missing:

- production agent card selector/recipe boundary
- safe adoption path for real roster/card content
- store-backed agent status data
- segmented top navigation specimen
- typography/icon/button polish
- authenticated production `/` visual smoke
- layout preset/page shell arrangement

## Changed Files

- `src/components/style-engine/nexus-style-lab.tsx`
- `src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts`
- `docs/style-system/surface-style-ops-direct-alias-preview-audit-v1.md`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v19-surface-style-ops-agent-card-bank-specimen/CHECKPOINT.md`

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
- `Agent Card Bank` specimen rendered.
- Architect, Explorer, Sentinel, Auditor, and Steward cards existed and were
  visible.
- status indicators existed and were visible.
- inert add affordance existed.
- Right Metrics specimen still rendered.
- Production Chrome Smoke apply/revert still worked.
- console errors: none observed.

No production `/` visit, no login, no persistence, and no workspace mutation.

## Visual Similarity Movement

Before this loop:

- Style Lab visual similarity estimate: about `58-62%`
- production skinning readiness estimate: about `70-73%`

After this loop:

- Style Lab visual similarity estimate: about `63-66%`
- production skinning readiness estimate: about `72-75%`

Reason:

- the left agent bank/card hierarchy is a major reference-image identity
  surface
- the scene preview now shows left roster, central workspace, and right metrics
  composition together
- the implementation remains honest specimen/recipe evidence rather than
  pretending production AgentWindow behavior is tokenized

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

- agent card bank specimen data/constants
- agent card bank specimen markup in Style Lab
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

`V19 Surface Style Ops Segmented Top Navigation Specimen`

Goal:

Create a Style Lab-only static segmented top navigation recipe specimen that
expands the Surface Style command-center header identity using direct aliases and
local preview data.

Stop conditions:

- if it requires production TopBar control behavior edits
- if it requires keyboard/action/focus behavior changes
- if it requires store/sync/backend/Supabase/API
- if it requires production runtime apply or persistence
- if it requires layout preset production apply
