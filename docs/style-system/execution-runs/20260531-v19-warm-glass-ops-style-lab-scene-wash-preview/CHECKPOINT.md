# V19 Warm Glass Ops Style Lab Scene Wash Preview

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Starting HEAD: `015f704 docs: audit warm glass direct alias preview`

## Goal

Add a Style Lab-only Warm Glass scene/wash preview so the Warm Glass fixture and
direct bridge variables produce visible north-star evidence instead of only
coverage/reporting evidence.

This loop did not apply anything to production `/`, add persistence, copy the
reference image, use remote image URLs, add asset pipeline behavior, or change
production shell behavior.

## Preview Design

Placement:

- `/style-lab`
- section: `Warm Glass Scene Preview`
- local isolated preview target:
  - `data-testid="warm-glass-scene-preview-target"`

Design:

- local custom property map using already adopted Warm Glass production alias
  names
- CSS gradients approximate desert/atelier warmth and a soft backlit scene wash
- frosted workspace board over the wash
- static left agent bank/cards
- static central AgentWindow/message/chrome area
- static right metrics panel
- static segmented-navigation mood row
- static mini Command/Modal/Datapad chrome row

No reference image or generated asset file was copied into the repository.

## Supported Surfaces Shown

- `--nexus-panel-*`
- `--nexus-glass-*`
- `--nexus-workspace-*`
- `--nexus-agent-window-*`
- `--nexus-message-*`
- `--nexus-command-palette-*`
- `--nexus-modal-shell-*`
- `--nexus-datapad-shell-*`

The preview uses the same adopted alias names that the Warm Glass Bridge Plan
can now emit directly, but it applies them only to a local Style Lab preview
container.

## Simulated-Only Parts

- desert atelier scene gradients
- left agent bank/card composition
- right metrics panel composition
- segmented top navigation mood
- command-center layout arrangement

These are visual specimens only. They do not create production selectors,
behavior, persistence, or layout apply.

## Missing Production Capabilities

Still missing:

- asset/background production pipeline
- right metrics panel recipe/selector boundary
- agent card recipe/selector boundary
- segmented nav recipe/selector boundary
- typography density policy
- layout preset production apply
- authenticated production `/` smoke

## Changed Files

- `src/components/style-engine/nexus-style-lab.tsx`
- `src/components/style-engine/nexus-style-lab-warm-glass-coverage.test.ts`
- `docs/style-system/warm-glass-ops-direct-alias-preview-audit-v1.md`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v19-warm-glass-ops-style-lab-scene-wash-preview/CHECKPOINT.md`

## Verification

Passed:

- `git diff --check`
- `npm run test -- src/components/style-engine/nexus-style-lab-warm-glass-coverage.test.ts src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts`
- `npm run typecheck`
- `npm run lint -- src/components/style-engine/nexus-style-lab.tsx src/components/style-engine/nexus-style-lab-warm-glass-coverage.test.ts src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts`
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
- `Warm Glass Scene Preview` rendered.
- warm gradient/background wash was present.
- workspace board used warm background/border values.
- supported/simulated/missing summaries rendered.
- Warm Glass fixture review accepted.
- token preview/revert worked.
- Production Chrome Smoke apply/revert still worked.
- console errors: none observed.

No production `/` visit, no login, no persistence, and no workspace mutation.

## Visual Similarity Movement

Before this loop:

- visual similarity estimate: about `40%`

After this loop:

- Style Lab visual similarity estimate: about `52-55%`
- readiness estimate: about `68-72%`

Reason:

- the largest missing visual layer, the warm desert/atelier scene wash, is now
  represented in Style Lab
- the preview shows the relationship between direct alias coverage and the
  north-star visual direction
- remaining gaps are now more specifically recipe/composition work rather than
  low-level alias work

## Residual Risk

Estimated residual risk: below 5 percent.

Reasoning:

- isolated Style Lab-only section
- no production component files touched
- no `globals.css` touched
- no backend/store/sync/Supabase/API touched
- no document-root mutation, storage, remote URL, or copied reference asset
- focused tests, typecheck, lint, build, and browser smoke passed

## Rollback Path

Revert this loop commit.

That removes:

- Style Lab scene preview section
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
- no reference image copied into repo
- no remote image URL
- no raw CSS payload acceptance

## Next Recommended Target Seed

Task name:

`V19 Warm Glass Ops Right Metrics Panel Specimen`

Goal:

Create a Style Lab-only static right metrics panel specimen and recipe candidate
that uses direct Warm Glass aliases. Keep it isolated from right-dock
artifact/vault persistence panels and production behavior.

Stop conditions:

- if it requires right-dock production behavior edits
- if it requires store/sync/backend/Supabase/API
- if it requires production runtime apply or persistence
- if it requires layout preset production apply
