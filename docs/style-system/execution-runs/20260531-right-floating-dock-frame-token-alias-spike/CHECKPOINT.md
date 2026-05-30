# V18 Right Floating Dock Frame Token Alias Spike Checkpoint

Date: 2026-05-31

## Scope

This round targeted only `NexusOpsRightFloatingDockFrame`.

It is not broader production styling, runtime token apply, feature placement,
layout integration, or shell behavior extraction.

## Changed Files

- `src/components/nexus/nexus-ops-right-floating-dock-frame.tsx`
- `src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx`
- `src/app/globals.css`
- `docs/style-system/production-shell-extraction-map-v1.md`
- this checkpoint

## Aliases Added

Dedicated right dock aliases:

- `--nexus-right-dock-bg`
- `--nexus-right-dock-border`
- `--nexus-right-dock-shadow`
- `--nexus-right-dock-blur`
- `--nexus-right-dock-radius`

Stable class added:

- `nexus-right-floating-dock-rail`

## Fallback Chain

Each alias follows this chain:

- dedicated right-dock alias
- existing panel bridge alias
- cyberpunk baseline

Examples:

- `--nexus-right-dock-bg` -> `--nexus-panel-bg` -> `rgb(2 6 23 / 0.9)`
- `--nexus-right-dock-border` -> `--nexus-panel-border` -> `rgb(103 232 249 / 0.25)`
- `--nexus-right-dock-shadow` -> `--nexus-panel-shadow` -> current dual cyberpunk shadow
- `--nexus-right-dock-blur` -> `--nexus-panel-blur` -> `--glass-blur`
- `--nexus-right-dock-radius` -> `--nexus-panel-radius` -> `0`

The blur rule is declared after the existing global blur override and uses
`!important` to preserve effective alias control over the existing
`backdrop-blur-xl` class.

## Intentionally Not Tokenized

- outer `nav` pointer events
- outer `nav` fixed position
- outer `nav` z-index
- responsive visibility
- child button active/inactive colors
- text/icon colors
- button handlers, state, map rendering, labels, titles, or icons
- workspace, graph, window, modal, or layout behavior

## Verification

Completed:

- `git diff --check` passed
- `npm run test -- src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx`
  passed: 1 file / 7 tests
- `npm run typecheck`
  passed
- `npm run lint -- src/components/nexus/nexus-ops-right-floating-dock-frame.tsx src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx src/app/globals.css`
  passed with exit code 0
  - note: ESLint warned that `src/app/globals.css` was ignored because no
    matching configuration was supplied
  - TSX frame and test files were linted
- `npm run build`
  passed

## Browser Smoke

Existing `http://localhost:3000/` dev server was available and used. No second
server was started.

Result:

- NexusOps UI was visible before reload
- right floating dock was visible
- no visible hydration/error overlay was observed
- no obvious layout shift was observed
- a temporary `javascript:` CSS variable probe was attempted against the current
  tab, but no visible change was observed; likely the tab still had the prior
  bundle before the new stable rail class loaded
- after reload, the local route returned to the auth gate
- no login was performed and no credentials were submitted
- because the auth gate blocked authenticated NexusOps access after reload, the
  latest-bundle variable visual probe could not be completed in-browser

Browser smoke status:

- partial pass for visible existing NexusOps shell before reload
- blocked for latest-bundle right-dock variable visual probe by local auth gate

The source-level focused test verifies the stable rail class and alias CSS are
present. Build passed with the CSS included.

## Forbidden Boundaries Held

- `src/components/nexus/nexus-ops.tsx` not edited
- no LeftDock or Workspace edits
- no React Flow or graph edits
- no window/modal/drag/resize/focus/z-index behavior edits
- no store/sync/backend/Supabase/API edits
- no style-engine registry/contract edits
- no package/config/deploy edits
- no `exports/**` edits

## Stop Condition

Stop after this single frame token alias spike. Do not continue into TopBar,
LeftDock, Workspace, button active-state tokenization, runtime token apply,
layout preset adoption, feature integration, or broader production styling.
