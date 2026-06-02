# V19 TopBar Frame Token Alias Spike Checkpoint

## Scope

This run added a token-alias spike for the already extracted
`NexusOpsTopBarFrame`.

This was a single-frame production-facing visual alias change. It did not add
runtime token apply, persistence, registry/contract work, broader production
styling, or production shell behavior changes.

## Pre-Update Wide Scan

- Branch: `codex/v19-production-shell-style-upgrade`
- Starting HEAD: `eb79927`
- `src/app/page.tsx` still renders the inert production page shell boundary
  around `NexusOps`.
- `NexusStyleRuntimeProvider` remains scoped to local CSS variable preview and
  revert mechanics only.
- `NexusOpsTopBarFrame` remained a children-only presentation wrapper before
  the alias spike.
- TopBar behavior ownership stayed in `src/components/nexus/nexus-ops.tsx`,
  including workspace menu state, rename flow, dropdowns, buttons, sync badge,
  handlers, callbacks, and view-mode actions.
- The right floating dock alias path was used as the proven pattern.
- No store, sync, backend, Supabase, API, React Flow, graph, window, modal,
  drag, resize, focus, z-index, feature placement, or layout preset path was
  required.

## Changed Files

- `src/components/nexus/nexus-ops-top-bar-frame.tsx`
- `src/components/nexus/nexus-ops-top-bar-frame.test.tsx`
- `src/app/globals.css`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v19-top-bar-frame-token-alias-spike/CHECKPOINT.md`

Note: `docs/style-system/v19-production-shell-style-required-reading.md` was
present as a pre-existing untracked file and was intentionally left unstaged
because it was not an allowed file for this implementation round.

## Aliases Added

The TopBar frame received one stable selector:

- `.nexus-top-bar-frame`

Dedicated aliases added in `src/app/globals.css`:

- `--nexus-top-bar-bg`
- `--nexus-top-bar-border`
- `--nexus-top-bar-shadow`
- `--nexus-top-bar-blur`
- `--nexus-top-bar-radius`

## Fallback Chain

- background: `--nexus-top-bar-bg` -> `--nexus-panel-bg` -> `rgb(0 0 0 / 0.2)`
- border: `--nexus-top-bar-border` -> `--nexus-panel-border` ->
  `rgb(255 255 255 / 0.1)`
- shadow: `--nexus-top-bar-shadow` -> `--nexus-panel-shadow` ->
  `0 0 0 transparent`
- blur: `--nexus-top-bar-blur` -> `--nexus-panel-blur` -> `--glass-blur`
- radius: `--nexus-top-bar-radius` -> `--nexus-panel-radius` -> `0`

## Intentionally Not Tokenized

- child button active/inactive/hover states
- workspace menu or dropdown contents
- sync badge, status counters, latency labels, and status labels
- text or icon colors
- focus rings
- pointer events
- z-index
- fixed/sticky positioning
- height, spacing, layout, overflow, or responsive behavior
- handlers, callbacks, maps, conditionals, refs, or state transitions

## Verification

- `git diff --check`: passed before checkpoint creation
- `npm run test -- src/components/nexus/nexus-ops-top-bar-frame.test.tsx`:
  passed, 6 tests
- `npm run typecheck`: passed
- `npm run lint -- src/components/nexus/nexus-ops-top-bar-frame.tsx src/components/nexus/nexus-ops-top-bar-frame.test.tsx src/app/globals.css`:
  passed with one existing tooling warning that `src/app/globals.css` was
  ignored because no matching lint configuration was supplied
- `npm run build`: passed

Build warning recorded separately from this change:

- using edge runtime on a page currently disables static generation for that
  page

## Browser Smoke

Runtime smoke used the local Chrome session on `http://localhost:3000/` after
non-browser verification passed.

Observed:

- authenticated NexusOps UI was visible
- route-edge production shell boundary remained present
- TopBar was visible
- right floating dock was visible
- workspace menu opened and closed with a safe click smoke
- browser-only CSS variables applied on `document.documentElement` visibly
  changed the TopBar frame
- removing those browser-only variables restored the baseline TopBar appearance
- no intentional workspace edit was performed and no CSS variable preview state
  was persisted

The existing app emitted its normal background API/sync requests during page
load. This run did not change those paths and did not intentionally submit or
persist workspace content.

Browser-only variables used:

- `--nexus-top-bar-bg: rgb(255 0 128 / 0.65)`
- `--nexus-top-bar-border: rgb(0 255 255 / 0.95)`
- `--nexus-top-bar-shadow: 0 0 24px rgb(255 0 128 / 0.55)`
- `--nexus-top-bar-radius: 10px`

The blur alias is covered by source CSS and focused tests; the browser visual
probe targeted the visible bg, border, shadow, and radius aliases.

## Browser Tooling Limitations

- Playwright was not installed in the local repo, so a Playwright console probe
  was not available.
- Chrome JavaScript execution through AppleScript was disabled by the browser
  profile, so console capture through AppleScript was not available.
- A Safari AppleScript probe hung; only the probe process started for this run
  was stopped.

Because of those tooling limits, strict console capture was not certified in
this checkpoint. The visible UI smoke and alias apply/revert behavior passed.

## Known Baseline Issues Separated From Regressions

- `bg-surface-shell.webp` placeholder asset load failure is a known baseline issue
  from the previous triage and was not introduced by this run.
- Chrome Translate was active in the observed Chrome tab, which can mutate
  visible text and cause the known hydration mismatch. It must not be treated
  as a TopBar alias regression unless reproduced in an untranslated tab.

No new visible layout regression was observed during the TopBar alias smoke.

## Forbidden Boundaries Held

- `src/components/nexus/nexus-ops.tsx` was not edited.
- No React Flow or graph file was edited.
- No store, sync, backend, Supabase, API, package, config, deploy, or
  `exports/**` file was edited.
- No runtime token apply or persistence was introduced.
- No feature placement or layout preset production adoption was introduced.
- No button, dropdown, sync badge, active state, focus, pointer, z-index, or
  behavior-bearing styling was changed.

## Rollback Path

To rollback this spike:

1. Remove the `nexus-top-bar-frame` stable selector from
   `NexusOpsTopBarFrame`.
2. Remove the `.nexus-shell .nexus-top-bar-frame` rule from
   `src/app/globals.css`.
3. Revert the TopBar test and extraction map entries from this run.

The legacy Tailwind classes remain on the TopBar frame, so rollback preserves
the existing surface-shell baseline.

## Next Recommended Smallest Unit

Do not expand to broad production shell styling. The next safe unit should be
a focused assessment of another already extracted inert visual frame, with
source/build/runtime alias confirmation before implementation.

Candidate: one docs-first assessment for whether `NexusOpsOuterShellFrame` or
another already extracted frame has a visual-only surface suitable for aliases.
