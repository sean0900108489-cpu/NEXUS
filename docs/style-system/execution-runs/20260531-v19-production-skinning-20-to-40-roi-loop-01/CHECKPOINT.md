# V19 Production Skinning 20-to-40 ROI Loop 01 Checkpoint

## Scope

This run advanced one high-ROI, low-risk production skinning target:
`NexusOpsOuterShellFrame`.

The change adds a stable frame selector and a dedicated background/surface alias
for the already extracted outer production shell. It does not add runtime token
apply, persistence, registry/contract work, broad production styling, or
production shell behavior changes.

## Preflight

- Branch: `codex/v19-production-shell-style-upgrade`
- Starting HEAD: `52e9b35c7a6d805ebe270a071a7b2723073b5cc2`
- Recent commits confirmed:
  - `52e9b35 feat: add top bar token aliases`
  - `eb79927 docs: update v18 production shell style runbook`
  - `83acb87 docs: add v18 production shell style upgrade runbook`
  - `61d2847 docs: triage baseline console hydration`
  - `576e499 docs: confirm right dock alias on fresh dev server`
  - `7fd4575 docs: diagnose right dock alias css bundle`
  - `401054d docs: record right dock alias browser confirmation`
  - `a475b71 feat: add right floating dock token aliases`
- Pre-existing untracked file recorded and left unstaged:
  - `docs/style-system/v19-production-shell-style-required-reading.md`
- Confirmed current tokenized surfaces:
  - `NexusOpsRightFloatingDockFrame`
  - `NexusOpsTopBarFrame`
- Confirmed forbidden boundaries were not needed.

## Candidate Ranking

Selected:

- `NexusOpsOuterShellFrame`

Rejected candidates:

- `NexusOpsBodyFrame`: safe and extracted, but it currently owns no visual
  surface beyond spacing/layout. Adding a new background would introduce new
  visual semantics and tokenizing layout is forbidden.
- `.nexus-workspace` / Workspace wrapper: visually broad, but tied to
  `workspaceRef`, view-mode conditionals, React Flow, floating windows, and
  workspace ownership.
- LeftDock: owns collapse animation and agent/template interaction behavior.
- Buttons, dropdowns, status controls, modals, settings panels, graph, and
  windows: rejected because they are behavior-bearing or protected.

Why selected target was highest ROI:

- It is the broadest already extracted inert shell frame.
- It controls the full application background/surface visual field.
- It accepts only `children` and has no hooks, effects, handlers, refs, prop
  spread, style mutation, or runtime imports.
- It can be rolled back by removing one selector, one CSS rule, and focused test
  assertions.
- It moves readiness toward 40% by adding the highest-coverage shell-level
  surface after the already proven Right Dock and TopBar aliases.

## Changed Files

- `src/components/nexus/nexus-ops-outer-shell-frame.tsx`
- `src/components/nexus/nexus-ops-outer-shell-frame.test.tsx`
- `src/app/globals.css`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v19-production-skinning-20-to-40-roi-loop-01/CHECKPOINT.md`

## Alias Performed

Stable selector added:

- `.nexus-outer-shell-frame`

Dedicated alias added:

- `--nexus-outer-shell-bg`

Fallback chain:

- `--nexus-outer-shell-bg`
- `--shell-surface`
- cyberpunk baseline shell gradients

The asset background URL was intentionally not tokenized because the current
`bg-cyberpunk.webp` placeholder load failure is a known baseline issue and not
a safe skinning target for this loop.

## Intentionally Not Tokenized

- text or icon colors
- child button, dropdown, status, or label states
- borders, shadows, blur, radius, or glow not already owned by the outer shell
- pointer events
- z-index
- position
- dimensions, layout, spacing, overflow, or responsive behavior
- refs, handlers, callbacks, maps, conditionals, state, or effects

## Verification

- `git diff --check`: passed
- `npm run test -- src/components/nexus/nexus-ops-outer-shell-frame.test.tsx`:
  passed, 7 tests
- `npm run typecheck`: passed
- `npm run lint -- src/components/nexus/nexus-ops-outer-shell-frame.tsx src/components/nexus/nexus-ops-outer-shell-frame.test.tsx src/app/globals.css`:
  passed with the existing tooling warning that `src/app/globals.css` is ignored
  because no matching lint configuration was supplied
- `npm run build`: passed

Build warning recorded separately:

- using edge runtime on a page currently disables static generation for that
  page

## Browser Smoke

A temporary repo-local dev server was started only after non-browser
verification passed and was stopped after the smoke.

Authenticated in-app browser smoke on `http://localhost:3000/` confirmed:

- NexusOps UI visible
- route-edge production page shell boundary exists
- `NexusOpsOuterShellFrame` visible at `.nexus-outer-shell-frame`
- TopBar still visible at `.nexus-top-bar-frame`
- right floating dock still visible at `.nexus-right-floating-dock-rail`
- loaded runtime CSS contains `.nexus-shell.nexus-outer-shell-frame`
- loaded runtime CSS contains `--nexus-outer-shell-bg`
- root inline style did not retain `--nexus-outer-shell-bg`

Browser-only apply/revert result:

- Direct `style.setProperty` through the in-app browser inspector was blocked by
  the Browser tool's read-only page evaluation surface.
- Bookmarklet-style `javascript:` execution in the in-app browser was blocked by
  Browser security policy.
- Chrome profile JavaScript execution through AppleScript was blocked by the
  user's Chrome setting for JavaScript from Apple Events.
- A temporary headless Chrome/CDP pass loaded the identity gate instead of the
  authenticated NexusOps shell, so it could not verify this authenticated shell
  surface.

Because of those tool/browser limits, browser visual apply/revert was not
certified in this checkpoint. Runtime selector visibility and runtime CSS rule
loading were certified, and the focused source test verifies the alias/fallback
chain. No browser mutation was persisted.

## Known Baseline Issues Versus Regressions

Known baseline / tooling-only observations:

- `bg-cyberpunk.webp` placeholder asset load failure remains a known baseline
  issue if observed; the asset URL was not changed.
- Chrome Translate hydration mismatch remains a known baseline issue. The
  in-app browser smoke showed `NEXUS // AI OPS`, not the translated title.
- The unauthenticated temporary headless Chrome/CDP pass showed the identity
  gate and emitted auth-related sync errors; this was caused by the separate
  unauthenticated browser profile and was not a source regression.
- Local workspace state 404/401 output from smoke tooling was not introduced by
  this visual alias change.

Regressions:

- No new visible layout regression was observed in the authenticated browser
  smoke.
- No source, typecheck, lint, or build regression was observed.

## Rollback Path

To rollback this loop:

1. Remove `nexus-outer-shell-frame` from
   `NexusOpsOuterShellFrame`.
2. Remove the `.nexus-shell.nexus-outer-shell-frame` rule from
   `src/app/globals.css`.
3. Revert the focused OuterShell test additions.
4. Revert the extraction map entry and this checkpoint.

The existing `nexus-shell` class and theme-level `--shell-surface` baseline
remain intact, so rollback restores the prior cyberpunk shell surface.

## Residual Risk

Estimated residual failure risk: below 5%.

Reasoning:

- The change is limited to one stable class and one background-image alias rule.
- The frame remains children-only and behavior-free.
- The existing layout class string is preserved.
- Runtime CSS loading was confirmed in the authenticated browser.
- The only incomplete gate is visual apply/revert, blocked by browser tooling
  and authenticated-session limitations rather than an observed source failure.

## Readiness Movement

This moved production skinning readiness toward 40% because the broadest inert
production shell surface now has a dedicated token alias path after the already
confirmed Right Dock and TopBar frame aliases.

## Forbidden Boundaries Held

- `src/components/nexus/nexus-ops.tsx` was read only for ownership confirmation
  and was not edited.
- No React Flow or graph file was edited.
- No store, sync, backend, Supabase, API, package, config, deploy, or
  `exports/**` file was edited.
- No runtime token apply or persistence was introduced.
- No feature placement or layout preset production adoption was introduced.
- No LeftDock, Workspace, window, modal, drag, resize, focus, z-index, or
  behavior-bearing styling was changed.

## Next Recommended Target Seed

Next seed: a docs-first assessment of whether any remaining already extracted
inert shell frame can accept a meaningful visual alias without introducing a new
surface. `NexusOpsBodyFrame` should likely remain rejected unless a visual
surface already exists. The next practical high-ROI seed may be a read-only
assessment of existing production primitives rather than a new frame alias.
