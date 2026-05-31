# V19 Production Control Primitive Selector-First Scan

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Starting HEAD: `fa68807 feat: add warm glass control chrome specimen`

## Goal

Use the Style Lab Warm Glass control chrome recipe as a visual standard, then
scan production button, input, badge, and icon-control primitives for a safe
selector-first path.

This loop was selector-first only. It did not add token aliases, global CSS,
production styling, runtime token apply, persistence, store/backend/API changes,
or production behavior changes.

## Scan Method

Required reading:

- `docs/style-system/warm-glass-ops-typography-icon-button-polish-audit-v1.md`
- `docs/style-system/execution-runs/20260531-v19-warm-glass-ops-icon-button-chrome-recipe-specimen/CHECKPOINT.md`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `src/components/style-engine/nexus-style-lab.tsx`
- `src/app/globals.css` read-only

Targeted `rg` scan covered:

- `button`
- `input`
- `textarea`
- `badge`
- `status`
- `aria-pressed`
- `disabled`
- `onClick`
- `onSubmit`
- `onKeyDown`
- `focus`
- `Command`
- `Send`
- `Save`
- `Sync`
- `Run`
- `nexus-`
- `className=`

Read source anchors were limited to high-ROI control candidates in:

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/PromptVaultManager.tsx`
- `src/components/nexus/auth-screen.tsx`
- `src/components/nexus/AgentBranchModal.tsx`
- `src/components/nexus/DatapadWindow.tsx`
- `src/components/nexus/nexus-graph.tsx`

## Candidate Ranking

| Rank | Candidate group | Source anchors | Behavior ownership | Selector boundary result | Risk | Next action |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | AgentWindow toolbar icon controls | `src/components/nexus/nexus-ops.tsx`, `ToolbarIconButton` | `onClick`, `disabled`, `active`, `tone` props remain behavior-bearing | Safe selector prep in existing visual class string | Low | Selected Path A |
| 2 | TopBar/menu action buttons and sync badge | `TopMenuAction`, `SyncBadge` in `nexus-ops.tsx` | menu action callbacks, active state, sync retry behavior | Defer | Medium | scan helper-level badge/button selector later |
| 3 | AgentWindow composer input and send button | `nexus-ops.tsx`, agent window form | submit, keydown, focus ref, draft state, streaming/thinking disabled state | No-Go for this loop | High | extraction-first input wrapper scan |
| 4 | Status badges/counters | `nexus-ops.tsx`, Datapad, modal, graph, tool cards | scattered status classes and state-driven text | Defer | Medium | dedicated badge selector scan |
| 5 | Command palette controls | `nexus-ops.tsx` command palette area | focus, keyboard, input state, close behavior, command execution | No-Go | High | keep shell aliases only |
| 6 | Modal controls | `AgentBranchModal.tsx` | close, busy state, branch execution, validation, range input state | No-Go | High | keep modal shell aliases only |
| 7 | Datapad controls | `DatapadWindow.tsx` | save/delete/close, draft state, focus-on-mount, Rnd drag/resize/z-index | No-Go | High | keep Datapad shell aliases only |
| 8 | Graph controls | `nexus-graph.tsx` | React Flow and workflow runtime behavior | Excluded | High | no action under standing boundary |

## Selected Path

Selected path:

- Path A - selector prep

Selected target:

- AgentWindow toolbar icon-control shell
- `ToolbarIconButton` in `src/components/nexus/nexus-ops.tsx`

Selector added:

- `nexus-control-icon-button-shell`

Why this target:

- high-frequency, high-visibility production icon-control chrome
- directly maps to the Warm Glass control chrome recipe specimen
- helper-level class string can receive a selector without touching behavior
- covers many toolbar icon buttons from one surgical source change

## Changed Files

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-control-primitive-selector.test.ts`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v19-production-control-primitive-selector-first-scan/CHECKPOINT.md`

## Selector Prep

Added:

- `nexus-control-icon-button-shell`

Not changed:

- handlers
- `disabled`
- active/default/danger logic
- focus behavior
- keyboard behavior
- submit behavior
- validation
- form state
- command execution
- layout
- CSS aliases
- `src/app/globals.css`

## Verification

Passed:

- `git diff --check`
- `npm run test -- src/components/nexus/nexus-control-primitive-selector.test.ts`
- `npm run typecheck`
- `npm run lint -- src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-control-primitive-selector.test.ts`
- `npm run build`

Build note:

- Next build emitted the known edge-runtime static-generation warning.
- Build output mentioned `.env.local`; this loop did not read `.env` or
  secrets.

Focused test coverage:

- selector exists in `ToolbarIconButton`
- `aria-label`, `disabled`, `onClick`, `title`, and `type="button"` remain
  present
- active/default/danger ownership remains present
- no `--nexus-control-*` CSS aliases were added to `src/app/globals.css`

## Browser Smoke

Target:

- `http://localhost:3000/`

Result:

- partial / auth-gated

Observed:

- local `/` loaded
- `nexus-shell` existed
- Identity Gate / Global Vault rendered
- `.nexus-control-icon-button-shell` count was `0` because AgentWindow UI did
  not render without an authenticated session
- no login was attempted
- no forms were submitted
- no workspace data was mutated

Known baseline:

- `https://cdn.example.com/nexus/bg-cyberpunk.webp` failed with
  `ERR_NAME_NOT_RESOLVED`
- this is the known placeholder issue and was not introduced or worsened by
  this loop

## Readiness Movement

Before:

- production skinning readiness estimate: about `76-78%`

After:

- production skinning readiness estimate: about `78-79%`

Reason:

- this creates the first production selector boundary for a high-visibility
  icon-control primitive family
- no aliases or production styling were added, so this prepares the path toward
  80 rather than completing the control primitive theme layer

## Residual Risk

Estimated residual risk: below 5 percent.

Reasoning:

- one class selector added to an existing helper class string
- no handler, state, focus, keyboard, submit, validation, disabled, active, or
  layout logic changed
- no CSS aliases or global styling added
- focused source guard, typecheck, lint, build, and auth-gated browser smoke
  completed

## Rollback Path

Revert this loop commit.

That removes:

- `nexus-control-icon-button-shell` from `ToolbarIconButton`
- focused source guard
- checkpoint and extraction-map entry

No persisted state, runtime cleanup, backend cleanup, or CSS cleanup is
required.

## Forbidden Boundaries Held

Held:

- no push
- no deploy
- no `.env` or secrets read
- no package/config/deploy edits
- no `exports/**`
- no Supabase/database/migrations
- no store/sync/backend/Supabase/API edits
- no React Flow/graph behavior edits
- no production shell behavior edits
- no runtime token persistence
- no backend persistence
- no submit/validation logic changes
- no focus/keyboard behavior changes
- no active/disabled state logic changes
- no form state changes
- no command execution changes
- no production visual styling changes
- no `src/app/globals.css` changes

## Next Recommended Target Seed

Task name:

`V19 Production Control Primitive Badge Selector Scan`

Goal:

Scan production status badge/counter displays for a safe helper-level selector
boundary such as `nexus-control-badge-shell`. Prefer a helper or inert display
wrapper. Do not touch retry behavior, sync state, tool execution state, modal
busy state, or graph runtime state. If the badge displays are too scattered or
behavior-bound, stop with a No-Go extraction map.

Stop conditions:

- selector requires changing active/disabled/status logic
- selector requires changing retry/tool/modal/datapad/graph behavior
- selector requires CSS aliases or `globals.css`
- selector requires broad `nexus-ops.tsx` refactor
