# V19 Production Skinning 20-to-40 ROI Loop 02 Checkpoint

## Scope

This run expanded one high-impact production primitive:
`.nexus-workspace`.

The change adds workspace chrome token aliases for border, shadow, and radius
while preserving the existing workspace background/grid/wash aliases. It does
not add runtime token apply, token persistence, registry/contract work, broad
production styling, or behavior changes.

## Preflight

- Branch: `codex/v19-production-shell-style-upgrade`
- Starting HEAD: `ab61f6dca549e06548d2dcccb169f83e0f8c4602`
- HEAD includes `ab61f6d feat: advance production skinning visual coverage`
- Recent commits confirmed:
  - `ab61f6d feat: advance production skinning visual coverage`
  - `52e9b35 feat: add top bar token aliases`
  - `eb79927 docs: update v18 production shell style runbook`
  - `83acb87 docs: add v18 production shell style upgrade runbook`
  - `61d2847 docs: triage baseline console hydration`
  - `576e499 docs: confirm right dock alias on fresh dev server`
  - `7fd4575 docs: diagnose right dock alias css bundle`
  - `401054d docs: record right dock alias browser confirmation`
- Pre-existing untracked file recorded and left unstaged:
  - `docs/style-system/v19-production-shell-style-required-reading.md`

## Candidate Ranking

Selected:

- `.nexus-workspace`

Top candidates assessed:

| Candidate | Files involved | Coverage gain | Surfaces affected | Behavior risk | Alias opportunity | Browser smoke clarity | Rollback | Safe this round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `.nexus-workspace` primitive | `src/app/globals.css`, focused primitive test | High: primary production canvas/workspace visual field | Main workspace surface, including panel and graph modes without touching either branch | Medium if component touched; low with CSS-only primitive expansion | Add border, shadow, and radius aliases to existing bg/grid/wash aliases | Clear: selector visible and computed style readable | Remove one CSS rule and focused test/docs | Yes |
| `.nexus-agent-window` primitive | `src/app/globals.css`, `src/components/nexus/nexus-ops.tsx` if done fully | High: all agent windows | Agent windows and sandbox windows | High: Rnd wrapper plus inline selected/sandbox background, border, and shadow logic | Possible, but would need careful state-specific source changes | Clear if safe, but source risk too high | More complex due inline state fallbacks | No |
| `.nexus-message-bubble` primitive | `src/app/globals.css`, likely `nexus-ops.tsx` for role selectors | Medium-high: all visible chat messages | User, agent, and tool message bubbles | Medium: generic override would flatten role semantics | Role-specific aliases likely needed | Clear when messages exist | Moderate | Not this round |
| `.nexus-panel` primitive | `src/app/globals.css` | Already high, but already covered | Left dock, minimized rail, command palette, collapsed rail | Low | Already has bg, border, text, radius, shadow, blur aliases | Clear | Simple | No meaningful new ROI |
| Command palette/modal/datapad chrome | Several component files | Medium-high when open | Modal/palette/datapad panels | High: focus, z-index, Rnd, modal, provider/state ownership | Possible after extraction | Requires interaction smoke | Complex | No |

Why selected target was highest ROI:

- It is one of the prioritized production primitive selectors.
- It affects the most visible central production surface.
- It was implementation-safe in CSS only, avoiding the Workspace element's
  `workspaceRef`, measurement, panel/graph conditional, React Flow branch, and
  floating-window children.
- It adds multiple aliases rather than a wrapper-only or single-alias change.

## Changed Files

- `src/app/globals.css`
- `src/components/nexus/nexus-workspace-primitive.test.ts`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v19-production-skinning-20-to-40-roi-loop-02/CHECKPOINT.md`

## Aliases Added

New workspace chrome aliases:

- `--nexus-workspace-border`
- `--nexus-workspace-shadow`
- `--nexus-workspace-radius`

Existing workspace surface aliases preserved:

- `--nexus-workspace-bg`
- `--nexus-workspace-grid-primary`
- `--nexus-workspace-grid-secondary`
- `--nexus-workspace-wash`

Fallback chain:

- border: `--nexus-workspace-border` -> `--nexus-panel-border` ->
  `rgb(255 255 255 / 0.1)`
- shadow: `--nexus-workspace-shadow` -> `--nexus-panel-shadow` ->
  `0 25px 50px -12px rgb(0 0 0 / 0.25)`
- radius: `--nexus-workspace-radius` -> `--nexus-panel-radius` ->
  `--surface-radius`

## Intentionally Not Tokenized

- layout, dimensions, overflow, isolation, z-index, or positioning
- workspace refs or measurement
- panel/graph conditionals
- React Flow nodes, edges, minimap, controls, or graph behavior
- floating windows, drag, resize, focus, z-index, or modal behavior
- child button, input, dropdown, status, label, or active states

## Verification

- `git diff --check`: passed
- `npm run test -- src/components/nexus/nexus-workspace-primitive.test.ts`:
  passed, 4 tests
- `npm run typecheck`: passed
- `npm run lint -- src/components/nexus/nexus-workspace-primitive.test.ts src/app/globals.css`:
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
- outer shell still visible at `.nexus-outer-shell-frame`
- TopBar still visible at `.nexus-top-bar-frame`
- right floating dock still visible at `.nexus-right-floating-dock-rail`
- selected workspace target visible at `.nexus-workspace`
- loaded runtime CSS contains `.nexus-shell .nexus-workspace`
- loaded runtime CSS contains `--nexus-workspace-border`
- loaded runtime CSS contains `--nexus-workspace-shadow`
- loaded runtime CSS contains `--nexus-workspace-radius`
- computed workspace styles were readable:
  - border color: `rgba(255, 255, 255, 0.1)`
  - radius: `4px`
  - shadow: `rgba(0, 0, 0, 0.25) 0px 25px 50px -12px`
- root inline style did not retain workspace probe variables
- browser log read returned no errors or warnings in the in-app browser

Browser-only apply/revert result:

- Partial/tool-limited.
- The in-app Browser evaluation surface is read-only for DOM mutation, and the
  previous Loop 01 confirmed `javascript:` bookmarklet mutation is blocked by
  Browser security policy.
- This run did not force a mutation workaround.
- Runtime selector visibility, runtime CSS rule loading, computed baseline
  styles, and absence of persisted inline workspace variables were confirmed.

## Known Baseline Issues Versus Regressions

Known baseline / non-regression observations:

- `bg-cyberpunk.webp` placeholder asset load failure remains a known baseline
  issue if observed; this run did not touch asset URLs.
- Chrome Translate hydration mismatch remains a known baseline issue only when
  Translate is active. The smoke title/text showed `NEXUS // AI OPS`.
- Local workspace state endpoint 404 output can appear during dev smoke and is
  not introduced by this CSS primitive change.

Regressions:

- No source, typecheck, lint, build, visible layout, or browser-console
  regression was observed.

## Rollback Path

To rollback this loop:

1. Remove the `.nexus-shell .nexus-workspace` chrome rule from
   `src/app/globals.css`.
2. Remove `src/components/nexus/nexus-workspace-primitive.test.ts`.
3. Revert the Loop 02 extraction map entry and this checkpoint.

The existing `.nexus-workspace` background/grid/wash aliases and legacy Tailwind
classes remain intact.

## Residual Risk

Estimated residual failure risk: below 5%.

Reasoning:

- The implementation is CSS-only for an existing primitive selector.
- The focused test guards against adding layout, pointer, positioning, or
  z-index authority to the new rule.
- No component behavior, refs, handlers, conditionals, child order, or props
  changed.
- Runtime CSS loading and computed styles were confirmed in the authenticated
  browser.
- The only incomplete browser gate is visual apply/revert, blocked by tooling
  rather than an observed source failure.

## Actual Progress Toward 40%

This materially moved readiness toward 40% more than Loop 01 because it expands
a central production primitive with multiple skinning aliases across the primary
workspace surface, while Right Dock, TopBar, and OuterShell remain intact.

## Forbidden Boundaries Held

- `src/components/nexus/nexus-ops.tsx` was read only for candidate assessment and
  test characterization; it was not edited.
- No React Flow or graph file was edited.
- No store, sync, backend, Supabase, API, package, config, deploy, or
  `exports/**` file was edited.
- No runtime token apply or persistence was introduced.
- No feature placement or layout preset production adoption was introduced.
- No LeftDock, Workspace component behavior, window, modal, drag, resize,
  focus, z-index, or behavior-bearing styling was changed.

## Next Recommended Target Seed

Next seed: extract or stabilize role-specific message bubble visual selectors
before token adoption. A safe next prompt should assess `MessageBubble` for
adding `nexus-message-bubble-agent`, `nexus-message-bubble-user`, and
`nexus-message-bubble-tool` selectors without changing role logic, then add
role-aware aliases only if that characterization remains behavior-free.
