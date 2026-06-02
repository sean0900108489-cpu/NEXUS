# V18 Production Shell / Style System Upgrade Runbook

## 1. Current Status

Current branch:

```text
codex/v18-style-pack-contract-prep
```

Current confirmed track:

V18 is not a full product rewrite. V18 is the controlled upgrade path from hardcoded Nexus production UI toward a Style Pack / Render Plan / Token Bridge / Production Shell system.

Completed capabilities:

- V2 Skin Pack contracts, validators, fixtures
- Style Lab V2 review/import
- token preview/revert
- specimen gallery
- Render Plan IR
- Production Token Bridge Plan
- `.nexus-panel`, `.nexus-glass`, `.nexus-workspace` production-facing token bridge spikes
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

Current validation state:

- Right floating dock token alias mechanics: confirmed
- Source CSS: confirmed
- Build CSS: confirmed
- Runtime CSS after fresh dev server: confirmed
- Visual apply/revert: confirmed
- Strict console-clean: not confirmed due to known baseline issues

Known baseline issues:

- `bg-surface-shell.webp` points to a placeholder CDN asset and may fail loading.
- Chrome Translate can mutate visible text and cause hydration mismatch.
- These are known baseline issues and must not be misclassified as token alias regressions unless they change or worsen.

Current TopBar state:

- `NexusOpsTopBarFrame` already exists at `src/components/nexus/nexus-ops-top-bar-frame.tsx`.
- It accepts `children` only.
- It currently renders a static `<header>` with the original visual classes:

```text
flex h-11 shrink-0 items-center border-b border-white/10 bg-black/20 px-3
```

- It currently has no dedicated `nexus-top-bar-*` token aliases.
- It currently has no dedicated stable selector class for alias adoption.
- Its focused source tests already guard against hooks, effects, event handlers, prop spread, style mutation, and forbidden runtime imports.

## 2. V18 Upgrade Intent

The real intent of V18:

> Upgrade Nexus from a hardcoded production UI into a controlled, testable, reversible production shell that can gradually consume Style Pack / Render Plan / Token Bridge output without breaking workspace, graph, agent, sync, or backend behavior.

V18 is allowed to improve:

- visual shell primitives
- production shell boundaries
- inert frame extraction
- token alias adoption
- Style Lab validation and preview
- isolated prototypes
- extraction maps
- browser smoke reliability

V18 is not allowed to become:

- full NexusOps rewrite
- backend/data lifecycle migration
- store/sync/Supabase refactor
- React Flow behavior rewrite
- drag/resize/window manager rewrite
- unrestricted skin runtime apply
- layout preset production adoption without a separate gate

## 3. Global Boundaries

Forbidden unless explicitly opened by a later approved phase:

- push
- deploy
- Supabase/database/migrations
- package/config/deploy files
- `exports/**`
- store/sync/backend/API mutation
- `.env` or secrets access
- React Flow behavior changes
- drag/resize/focus/z-index/window/modal behavior changes
- agent/business logic changes
- workspace persistence changes
- feature registry/layout preset production apply
- runtime token persistence
- broad `nexus-ops.tsx` refactor

Allowed by current V18 track:

- docs under `docs/style-system/**`
- focused tests
- inert presentation wrappers
- CSS variable alias adoption for already extracted visual frames
- Style Lab isolated preview/prototype updates
- source-level characterization tests
- browser smoke and diagnostics
- extraction maps and checkpoints

## 4. Execution Process

Every phase must follow this order:

1. Preflight
   - confirm branch
   - confirm clean git status
   - confirm current HEAD
   - read relevant docs/source
   - list allowed and forbidden files

2. Scan
   - inspect source before editing
   - identify behavior ownership
   - identify visual-only candidates
   - identify existing tests/smoke needs

3. Decide path
   - implement if candidate is safe
   - downgrade to docs/checkpoint if unsafe
   - skip unsafe candidates and record why
   - stop only on unrecoverable boundary violation

4. Implement
   - smallest viable unit
   - no opportunistic refactor
   - no second target in same phase unless explicitly allowed

5. Verify
   - focused tests first
   - typecheck
   - targeted lint
   - build only for route/production component extraction or final gate
   - browser smoke when UI/runtime changes

6. Checkpoint
   - record files changed
   - record verification results
   - record skipped candidates
   - record known baseline issues
   - record next recommended unit

7. Commit
   - stage only allowed files
   - one local commit per phase
   - no push/deploy
   - final `git status --short` must be clean

## 5. Low-Intensity Execution Rules

To keep the local machine stable:

- Do not run heavy commands in parallel.
- Do not run multiple dev servers.
- Use an existing dev server if available.
- If a fresh dev server is needed, start only one and stop only that server.
- Prefer targeted tests over full test suite.
- Run `npm run build` only when the phase touches production route/component or final review requires it.
- If the machine becomes slow:
  - finish current command
  - checkpoint
  - commit clean state
  - pause further heavy work

## 6. Required Scans Before Further Token Adoption

Before the next token alias target:

1. Confirm previous target status
   - source CSS exists
   - build CSS includes aliases
   - runtime CSS includes aliases after fresh server
   - browser-only variable apply/revert works

2. Confirm baseline console status
   - known `bg-surface-shell.webp` issue unchanged
   - Chrome Translate disabled or explicitly identified
   - no new hydration/layout/interaction regression

3. Confirm target safety
   - frame already extracted, or extraction is visual-only
   - no hooks/effects/handlers moved
   - no child order change
   - no behavior-bearing props
   - no store/sync/backend imports
   - no z-index/pointer/focus/position behavior change

## 7. Current Recommended Next Track

Do not continue broad styling.

Next track should be scan-and-act:

```text
TopBar Scan-And-Act Token Alias Spike
```

Current decision:

- `NexusOpsTopBarFrame` already exists.
- The next round should not perform TopBar extraction.
- The next round may perform a single TopBar token alias spike if preflight confirms the frame remains pure/static.
- If TopBarFrame has drifted into behavior-bearing code, do no source change and record a No-Go checkpoint.

Do not combine TopBar token alias with another frame, button state tokenization, dropdown styling, layout adoption, or runtime token apply.

## 8. TopBar Token Alias Scope

Allowed first-round visual surfaces:

- frame background / surface
- border
- shadow / glow
- blur
- optional radius

Recommended alias chain:

```text
--nexus-top-bar-bg -> --nexus-panel-bg -> surface-shell baseline
--nexus-top-bar-border -> --nexus-panel-border -> surface-shell baseline
--nexus-top-bar-shadow -> --nexus-panel-shadow -> surface-shell baseline
--nexus-top-bar-blur -> --nexus-panel-blur -> surface-shell baseline
--nexus-top-bar-radius -> --nexus-panel-radius -> surface-shell baseline
```

Because the current frame has no dedicated selector class, the minimal safe implementation may add exactly one stable class to the existing header:

```text
nexus-top-bar-frame
```

That class may be added only to the extracted `NexusOpsTopBarFrame`, with the existing visual classes preserved. The focused test must be updated to assert the stable class and preserve source-level behavior guards.

## 9. TopBar No-Go Surfaces

Do not tokenize or alter:

- workspace menu behavior
- sync/status counters
- latency labels
- dropdown contents
- agent controls
- button active/inactive/hover states
- text/icon colors
- focus rings
- pointer-events
- z-index
- fixed/sticky positioning
- height, spacing, layout, overflow, or responsive behavior
- handlers, callbacks, maps, conditionals, or state transitions

## 10. Suggested Next Execution Prompt

Task name:

```text
V18 TopBar Frame Token Alias Spike
```

Preflight:

1. Confirm branch is `codex/v18-style-pack-contract-prep`.
2. Confirm `git status --short` is clean.
3. Read:
   - `docs/style-system/v18-production-shell-style-upgrade-runbook.md`
   - `docs/style-system/v18-production-shell-style-current-status.md`
   - `docs/style-system/production-shell-extraction-map-v1.md`
   - `src/components/nexus/nexus-ops-top-bar-frame.tsx`
   - `src/components/nexus/nexus-ops-top-bar-frame.test.tsx`
   - `src/app/globals.css`
4. Confirm `NexusOpsTopBarFrame` still accepts only `children`.
5. Confirm its source has no hooks, effects, event handlers, prop spread, store/sync/backend/Supabase/React Flow/window manager/style-engine imports, or behavior authority.
6. If any safety check fails, stop or produce docs-only No-Go checkpoint.

Allowed files if implementation proceeds:

- `src/components/nexus/nexus-ops-top-bar-frame.tsx`
- `src/components/nexus/nexus-ops-top-bar-frame.test.tsx`
- `src/app/globals.css`
- `docs/style-system/production-shell-extraction-map-v1.md`
- one round checkpoint under `docs/style-system/execution-runs/**`

Forbidden files:

- `src/components/nexus/nexus-ops.tsx`
- LeftDock / Workspace / React Flow / graph files
- window/modal/drag/resize/focus/z-index behavior files
- store/sync/backend/Supabase/API files
- style-engine registry/contract files
- package/config/deploy files
- `exports/**`

Implementation limits:

- Add only the stable `nexus-top-bar-frame` selector class if needed.
- Add only dedicated TopBar CSS variable aliases with panel/surface-shell fallbacks.
- Do not alter TopBar child controls.
- Do not alter button classes.
- Do not alter layout, height, positioning, pointer behavior, z-index, focus, or handlers.

Verification:

1. `git diff --check`
2. `npm run test -- src/components/nexus/nexus-ops-top-bar-frame.test.tsx`
3. `npm run typecheck`
4. `npm run lint -- src/components/nexus/nexus-ops-top-bar-frame.tsx src/components/nexus/nexus-ops-top-bar-frame.test.tsx src/app/globals.css`
5. `npm run build`
6. Browser smoke `/` in an untranslated tab/session

Browser smoke should record:

- route loaded
- NexusOps UI visible
- route-edge production shell boundary present
- TopBar visible
- TopBar selector exists
- right floating dock still visible
- workspace menu / safe TopBar trigger remains usable if available
- temporary TopBar variable apply/revert if token alias phase
- console findings
- known baseline issues separately from regressions

Known baseline allowances:

- `bg-surface-shell.webp` placeholder load failure may be recorded as known baseline.
- Chrome Translate hydration mismatch may be ignored only if Translate is active.

Not allowed:

- new hydration mismatch in untranslated tab
- missing NexusOps UI
- broken right dock
- broken workspace menu
- layout shift
- broken pointer interaction
- new error clearly caused by touched files

Stop immediately if:

- completing the task requires editing `nexus-ops.tsx`
- `NexusOpsTopBarFrame` is missing or behavior-bearing
- button/status/dropdown styling must be changed
- behavior-bearing controls must be touched
- store/sync/backend/Supabase/API files become necessary
- React Flow or window/modal behavior becomes involved
- browser smoke in an untranslated tab shows a new hydration/layout regression

## 11. Recovery Protocol

If interrupted:

1. Check current branch.
2. Run `git status --short`.
3. Read latest run folder:
   - `TECHNICAL_RUNBOOK.md`
   - `PHASE_STATUS.md`
   - `CHECKPOINTS.md`
   - latest `CHECKPOINT.md`
4. Check last 5 commits.
5. Determine last completed phase.
6. Continue only from clean state.
7. If dirty:
   - inspect changed files
   - if only allowed run docs, checkpoint/commit
   - if source dirty, do not proceed until scoped and understood

## 12. Stop Conditions

Stop immediately if:

- implementation requires forbidden files
- implementation requires moving behavior core
- implementation requires touching React Flow, store, sync, backend, Supabase, drag/resize/focus/z-index
- browser smoke shows new serious regression
- build/typecheck reveals server/client boundary caused by the current phase
- target cannot be made safe without broad refactor

Do not stop for:

- unsafe optional candidate; skip and record
- known baseline asset issue
- Chrome Translate hydration mismatch when Translate is active
- stale dev CSS; refresh/restart repo-local dev server safely
- focused test timeout; rerun decomposed if reasonable

## 13. V18 Completion Criteria

V18 can be considered complete when:

- Style Pack to production visual primitive path is proven.
- At least one extracted production frame has confirmed token alias apply/revert.
- Production shell route-edge boundary exists and is guarded.
- NexusOps extraction map exists and is current.
- At least one inert production shell frame extraction is completed and smoked.
- Behavior core remains inside NexusOps.
- No store/sync/backend/database changes are introduced.
- Known baseline console issues are documented.
- Next major track is explicitly chosen:
  - deeper shell extraction
  - controlled token adoption
  - History/Memory Lifecycle
  - Generated Output Durability

## 14. Next Execution Rule

Before running the next implementation phase, the executor must first write a short phase plan:

- selected target
- selected path
- allowed files
- forbidden files
- expected verification
- stop condition

Then execute without asking for more strategy unless a stop condition is hit.
