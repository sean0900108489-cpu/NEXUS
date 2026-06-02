# V19 Production Shell Style Required Reading

## 2026-06-01 Supersession Notice

This file started as the V19 entrypoint and remains useful historical context,
but it is no longer the current execution frontier.

Current landing track:

```text
V20 production style controls / scoped preview / workspace style payload
```

Current latest readiness entrypoint:

```text
docs/style-system/v20-production-style-main-landing-readiness.md
```

Current required reading before any final main landing, push, or new style
feature work:

1. `docs/style-system/v20-production-style-main-landing-readiness.md`
2. `docs/style-system/v20-production-style-layer-contract.md`
3. `docs/style-system/v20-style-architecture-relationship-chain-stabilization-audit.md`
4. `docs/style-system/v20-production-preview-first-cut-operating-guide.md`
5. `docs/style-system/v20-imported-workspace-style-review-qa-guide.md`
6. `docs/style-system/execution-runs/20260531-v20-production-theme-panel-live-style-controls-mvp/CHECKPOINT.md`
7. `docs/style-system/execution-runs/20260601-v20-production-style-layer-contract-definition/CHECKPOINT.md`

The older "Next Recommended V19 Unit" and TopBar alias sections below are
historical. Do not treat them as the active next task. TopBar and RightDock
material alignment have already landed, and the active product track is now the
production Theme panel style controls plus workspace export/import continuity.

## Purpose

This is the required-reading entrypoint for the V19 production shell / style
system upgrade track.

V19 starts from the preserved V18 result and continues the controlled migration
from hardcoded Nexus production UI toward a Style Pack / Render Plan / Token
Bridge / Production Shell system.

This document is both a status file and an execution gate. Every V19 executor
must read it before touching source files.

## Current Starting Point

Current branch:

```text
codex/v19-production-shell-style-upgrade
```

V19 starting HEAD:

```text
eb79927
```

Preserved V18 source branch:

```text
codex/v18-style-pack-contract-prep
```

Do not treat the V18 branch name inside older docs as the active branch. Those
docs remain baseline context; the active implementation branch is V19.

Before any implementation, confirm the live repo state again:

```text
git branch --show-current
git status --short --untracked-files=all
git rev-parse --short HEAD
git log --oneline -8
```

Do not start source edits from a dirty tree unless the dirty files are explicitly
understood, allowed, and part of the current task.

## Required Reading Order

Read these in order before any V19 implementation phase:

1. `docs/style-system/v19-production-shell-style-required-reading.md`
2. `docs/style-system/v18-production-shell-style-current-status.md`
3. `docs/style-system/v18-production-shell-style-upgrade-runbook.md`
4. `docs/style-system/production-shell-extraction-map-v1.md`
5. `docs/style-system/execution-runs/20260531-baseline-console-hydration-triage/CHECKPOINT.md`
6. `docs/style-system/execution-runs/20260531-right-dock-alias-fresh-dev-server-confirmation/CHECKPOINT.md`
7. `src/app/page.tsx`
8. `src/components/style-engine/nexus-style-runtime-provider.tsx`
9. `src/components/nexus/nexus-ops-top-bar-frame.tsx`
10. `src/components/nexus/nexus-ops-top-bar-frame.test.tsx`
11. `src/components/nexus/nexus-ops-right-floating-dock-frame.tsx`
12. `src/app/globals.css`

Read `src/components/nexus/nexus-ops.tsx` only as scoped context. Do not start
with a broad `nexus-ops.tsx` refactor.

## Confirmed Baseline Carried Into V19

Completed and preserved:

- V2 Skin Pack contracts, validators, fixtures
- Style Lab V2 review/import
- token preview/revert
- specimen gallery
- Render Plan IR
- Production Token Bridge Plan
- `.nexus-panel`, `.nexus-glass`, `.nexus-workspace` production-facing token
  bridge spikes
- Workspace Layout Slot Boundary
- Page Shell Feature Registry boundary
- Isolated Page Shell Prototype
- inert production route-edge page shell wrapper
- source guard for `src/app/page.tsx`
- production shell extraction map for `NexusOps`
- `NexusOpsOuterShellFrame`
- `NexusOpsBodyFrame`
- `NexusOpsTopBarFrame`
- `NexusOpsRightFloatingDockFrame`
- right floating dock token alias spike
- fresh dev server confirmation for right dock alias apply/revert
- baseline console/hydration triage
- V18 production shell style upgrade runbook
- V18 production shell style current status file

## Current Production Frame Status

| Frame | Status | V19 Meaning |
| --- | --- | --- |
| Route-edge production page shell boundary | Landed | Keep inert; do not add runtime style apply here. |
| `NexusOpsOuterShellFrame` | Landed | Presentation boundary only. |
| `NexusOpsBodyFrame` | Landed | Presentation boundary only. |
| `NexusOpsTopBarFrame` | Landed, not token-aliased | First V19 token alias candidate. |
| `NexusOpsRightFloatingDockFrame` | Landed and token-aliased | Proven production-frame alias path. |

## Current Function-To-Visual Logic Chain

The current production UI chain is:

```text
route edge
  -> NexusStyleRuntimeProvider
  -> inert production page shell boundary
  -> NexusOps
  -> extracted presentation frames
  -> CSS visual primitives / token aliases
```

The current data and backend chain is:

```text
API / backend service / local sync
  -> store or local NexusOps state
  -> NexusOps props and derived UI state
  -> TopBar, Workspace, RightDock, AgentWindow, Datapad, CommandPalette
  -> existing CSS classes and token aliases
```

Important mapping:

| Layer | Owner | Visual effect path |
| --- | --- | --- |
| Route edge | `src/app/page.tsx` | Wraps `NexusOps` with runtime provider and inert page shell boundary. |
| Runtime preview scope | `NexusStyleRuntimeProvider` | Applies scoped CSS variable preview/revert only; no persistence. |
| Production shell coordinator | `NexusOps` | Still owns hooks, store selectors, state transitions, API calls, panels, windows, graph routing, and handlers. |
| Store / sync | `src/store/nexus-store.ts`, `src/lib/sync/**` | Drives workspace, agents, sync status, tools, notebooks, artifacts, history, and auth state. |
| Backend/API | `src/app/api/**`, `src/lib/backend/**` | Feeds store and NexusOps through fetch/client calls; must not be touched for visual token adoption. |
| Visual primitives | `src/app/globals.css` | `.nexus-panel`, `.nexus-glass`, `.nexus-workspace`, right dock rail, global shell variables. |
| Extracted frames | `src/components/nexus/nexus-ops-*-frame.tsx` | Safe frame-level visual alias targets when they remain children-only presentation wrappers. |

Protected mapping:

- Sync status from backend/local queue reaches `TopBar` through `SyncBadge`.
- Workspace/menu/recovery state reaches `TopBar` through `NexusOps` props.
- Tool runs and artifacts reach agent windows and right panels through store/API calls.
- React Flow and workspace graph behavior remain protected and outside token alias work.
- LeftDock and Workspace remain behavior-bearing and are not token alias targets in this track.

## Known Baseline Issues

Do not misclassify these as V19 regressions unless they change or worsen:

- `bg-surface-shell.webp` references `https://cdn.example.com/nexus/bg-surface-shell.webp`,
  a known placeholder CDN asset.
- Chrome Translate can mutate text from `NEXUS // AI OPS` to `NEXUS // AI 作戰`,
  causing hydration mismatch in translated tabs.
- Local workspace state endpoint 404s may appear in dev output, but prior triage
  observed UI recovery to synced state.

For hydration-sensitive smoke, use an untranslated tab/session.

## V19 Upgrade Intent

The real intent of V19:

> Continue turning Nexus from a hardcoded production UI into a controlled,
> testable, reversible production shell that can gradually consume Style Pack /
> Render Plan / Token Bridge output without breaking workspace, graph, agent,
> sync, or backend behavior.

V19 is allowed to improve:

- visual shell primitives
- extracted production frame surfaces
- dedicated CSS variable aliases
- token alias fallback chains
- source-level guards and characterization tests
- browser smoke reliability
- run docs, checkpoints, recovery notes

V19 is not allowed to become:

- full NexusOps rewrite
- backend/data lifecycle migration
- store/sync/Supabase refactor
- React Flow behavior rewrite
- drag/resize/window manager rewrite
- unrestricted runtime token apply
- layout preset production adoption
- feature registry production placement

## Global Boundaries

Forbidden unless a later approved phase explicitly opens the boundary:

- push
- deploy
- Supabase/database/migrations
- package/config/deploy files
- `exports/**`
- `.env` or secrets access
- store/sync/backend/API mutation
- React Flow behavior changes
- drag/resize/focus/z-index/window/modal behavior changes
- agent/business logic changes
- workspace persistence changes
- feature registry/layout preset production apply
- runtime token persistence
- broad `nexus-ops.tsx` refactor

Allowed by current V19 track:

- docs under `docs/style-system/**`
- focused tests
- inert presentation wrapper tests
- CSS variable alias adoption for already extracted visual frames
- source-level characterization tests
- browser smoke and diagnostics
- extraction maps and checkpoints

## Pre-Update Wide Scan Gate

Before the next implementation phase, the executor must run a read-only scan
that pulls the previous execution results forward and traces the current
frontend/backend function layers into the visual layer.

This scan is required because token alias work can look small while still
touching surfaces that are fed by backend state, store state, or interaction
logic.

Required scan checklist:

- [ ] Confirm branch is `codex/v19-production-shell-style-upgrade`.
- [ ] Confirm `git status --short --untracked-files=all`.
- [ ] Confirm HEAD and recent commits.
- [ ] Read the required docs listed above.
- [ ] Confirm the previous V18/V19 execution results still exist in source/docs.
- [ ] Scan route edge: `src/app/page.tsx`.
- [ ] Scan runtime style scope: `NexusStyleRuntimeProvider`.
- [ ] Scan target frame file and focused test.
- [ ] Scan `src/app/globals.css` for existing primitive aliases and fallback chains.
- [ ] Scan `NexusOps` only for the target's parent/child ownership.
- [ ] Trace backend/API/store influence into the target UI surface.
- [ ] Confirm the target is visual-only and does not own hooks, handlers, refs, maps,
  conditionals, API calls, store selectors, z-index behavior, focus, drag, resize,
  or layout authority.
- [ ] Confirm the proposed alias cannot alter store/sync/backend, React Flow, window
  manager, workspace persistence, or feature placement.
- [ ] Record known baseline console issues separately from candidate regressions.

If this scan finds that the target has become behavior-bearing, downgrade the
phase to docs/checkpoint only and do not implement source changes.

## Execution Process

Every V19 phase must follow this order:

1. Preflight
   - confirm branch
   - confirm clean or explicitly understood git status
   - confirm current HEAD
   - read relevant docs/source
   - list allowed and forbidden files

2. Wide scan
   - pull forward previous execution results
   - scan frontend/backend function layers that feed the target visual surface
   - scan visual primitive and CSS alias layers
   - verify no hidden behavior ownership is required

3. Decide path
   - implement only if the candidate is safe
   - downgrade to docs/checkpoint if unsafe
   - skip unsafe candidates and record why
   - stop only on unrecoverable boundary violation

4. Implement
   - smallest viable unit
   - no opportunistic refactor
   - no second target in the same phase unless explicitly allowed

5. Verify
   - `git diff --check`
   - focused tests first
   - typecheck
   - targeted lint
   - build only for route/production component extraction or token alias source
     phases
   - browser smoke when UI/runtime changes

6. Checkpoint
   - record files changed
   - record scan result
   - record verification results
   - record skipped candidates
   - record known baseline issues
   - record next recommended unit

7. Commit
   - stage only allowed files
   - one local commit per phase
   - no push/deploy
   - final `git status --short` must be clean unless the task explicitly leaves a
     docs draft uncommitted

## Low-Intensity Execution Rules

- Do not run heavy commands in parallel.
- Do not run multiple dev servers.
- Use existing dev server if available.
- If a fresh dev server is needed, start only one and stop only that server.
- Prefer targeted tests over the full test suite.
- Run `npm run build` only when the phase touches production route/component/CSS
  or final review requires it.
- If the machine becomes slow, finish the current command, checkpoint, commit
  clean state if appropriate, and pause further heavy work.

## Next Recommended V19 Unit

Task name:

```text
V19 TopBar Frame Token Alias Spike
```

Why:

- `NexusOpsTopBarFrame` already exists.
- It currently accepts `children` only.
- It has source-level tests guarding against behavior authority.
- It is visible and shell-level, but still narrow enough for a single-frame token
  alias spike.
- It does not require editing `nexus-ops.tsx` if implementation remains
  frame-level.

Decision path:

- Path A: If `NexusOpsTopBarFrame` is still pure presentation, do one TopBar
  token alias spike.
- Path B: If the frame exists but lacks a stable selector, add only the stable
  selector and alias CSS in the same narrow phase.
- Path C: If TopBar frame has become behavior-bearing, do no source change and
  record a No-Go checkpoint.

Do not do broader production shell styling.

## Minimal Safe TopBar Implementation Shape

If implementation is approved:

1. Add exactly one stable selector class to `NexusOpsTopBarFrame`, if needed:

```text
nexus-top-bar-frame
```

2. Preserve the existing visual class semantics:

```text
flex h-11 shrink-0 items-center border-b border-white/10 bg-black/20 px-3
```

3. Add only dedicated TopBar aliases in `src/app/globals.css`:

```text
--nexus-top-bar-bg
--nexus-top-bar-border
--nexus-top-bar-shadow
--nexus-top-bar-blur
--nexus-top-bar-radius
```

4. Use fallback chain:

```text
top-bar alias -> panel alias -> surface-shell baseline
```

5. Update only the focused TopBar frame test and docs/checkpoint as needed.

## TopBar No-Go List

Do not touch:

- `src/components/nexus/nexus-ops.tsx`
- TopBar child button classes
- workspace menu behavior
- sync/status counters
- latency labels
- dropdown contents
- agent controls
- text/icon colors
- focus rings
- pointer-events
- z-index
- fixed/sticky positioning
- height, spacing, layout, overflow, or responsive behavior
- handlers, callbacks, maps, conditionals, or state transitions
- store/sync/backend/Supabase/API files
- React Flow or graph files
- LeftDock / Workspace behavior
- runtime token apply or persistence

## Required Phase Plan Before Implementation

Before running the next implementation phase, the executor must write a short
phase plan:

- selected target
- selected path
- allowed files
- forbidden files
- expected verification
- browser smoke plan
- stop condition

Then execute without asking for more strategy unless a stop condition is hit.

## Expected Verification For TopBar Alias Spike

Run sequentially:

1. `git diff --check`
2. `npm run test -- src/components/nexus/nexus-ops-top-bar-frame.test.tsx`
3. `npm run typecheck`
4. `npm run lint -- src/components/nexus/nexus-ops-top-bar-frame.tsx src/components/nexus/nexus-ops-top-bar-frame.test.tsx src/app/globals.css`
5. `npm run build`
6. Browser smoke `/` in an untranslated tab/session

Browser smoke should confirm:

- route loaded
- NexusOps UI visible
- route-edge production shell boundary present
- TopBar visible
- TopBar selector exists
- right floating dock still visible
- workspace menu / safe TopBar trigger remains usable if available
- temporary TopBar variable apply/revert if token alias phase
- known baseline issues recorded separately from regressions

## Stop Conditions

Stop immediately if:

- implementation requires editing `nexus-ops.tsx`
- `NexusOpsTopBarFrame` has become behavior-bearing
- button/status/dropdown styling must be changed
- behavior-bearing controls must be touched
- store/sync/backend/Supabase/API files become necessary
- React Flow or window/modal behavior becomes involved
- browser smoke in an untranslated tab shows a new hydration/layout regression
- build/typecheck reveals a server/client boundary issue caused by the current phase

Do not stop for:

- unsafe optional candidate; skip and record
- known `bg-surface-shell.webp` placeholder issue
- Chrome Translate hydration mismatch when Translate is active
- stale dev CSS that can be resolved by safely refreshing/restarting the
  repo-local dev server
- focused test timeout; rerun decomposed if reasonable

## Stop Permission Checklist

Before stopping, handing off, or claiming the phase is complete, check every item
that applies:

- [ ] Branch and HEAD were recorded.
- [ ] Git status was recorded.
- [ ] Existing dirty files were identified and either included in scope or left
  untouched intentionally.
- [ ] Required docs/source were read.
- [ ] Pre-update wide scan was completed.
- [ ] Frontend/backend function-to-visual chain was checked for the target.
- [ ] Allowed files and forbidden files were listed.
- [ ] Target was confirmed visual-only or downgraded to No-Go.
- [ ] No forbidden files were edited.
- [ ] No store/sync/backend/Supabase/API/React Flow/window/modal behavior was
  touched.
- [ ] No runtime token persistence was introduced.
- [ ] No feature placement or layout preset production apply was introduced.
- [ ] Focused tests were run or a precise reason was recorded.
- [ ] Typecheck/lint/build were run when required, or a precise reason was
  recorded.
- [ ] Browser smoke was run for UI/runtime changes, or a precise blocker was
  recorded.
- [ ] Known baseline issues were separated from regressions.
- [ ] Checkpoint or final report records changed files, verification, blockers,
  rollback path, and next smallest unit.
- [ ] Final `git status --short` was recorded.

If a required checkbox cannot be completed, do not claim completion. Record the
blocker and stop at the safest clean checkpoint.

## V19 Final Upgrade Closure Goal

V19 can be considered ready to close when:

- Style Pack to production visual primitive path is proven and documented.
- At least two extracted production frame surfaces have confirmed token alias
  apply/revert behavior, with right dock already serving as the first proven
  frame.
- TopBar frame token alias path is either completed and smoked, or explicitly
  rejected with a No-Go checkpoint.
- Route-edge production shell boundary remains inert and guarded.
- NexusOps extraction map remains current.
- Behavior core remains inside `NexusOps`.
- No store/sync/backend/database/Supabase/API changes are introduced by style
  adoption.
- React Flow, drag/resize/focus/z-index/window/modal behavior remains unchanged.
- Known baseline console/hydration issues are documented separately from style
  regressions.
- Browser smoke evidence exists for each production-facing token alias spike.
- Rollback path is simple: remove frame-level alias selector/CSS and keep legacy
  surface-shell fallbacks.

After V19 closure, the next major track must be explicitly chosen before work
continues:

- deeper production shell extraction
- controlled frame token adoption expansion
- isolated feature placement prototype
- History/Memory Lifecycle
- Generated Output Durability

Do not continue from V19 into a larger rewrite without a new runbook or approved
phase gate.
