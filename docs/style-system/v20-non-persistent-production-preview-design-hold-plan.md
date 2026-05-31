# V20 Non-Persistent Production Preview Design Hold Plan

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Base evidence:

- `0943a14 docs: record authenticated production preview scope smoke`
- `5c3019f docs: map production preview target scopes`
- `8de062d feat: add production preview preflight contract`

## Purpose

This plan pushes Option A design to a ready-but-held state.

It does not implement production preview. It does not authorize production
apply, DOM mutation, persistence, store writes, backend writes, source edits, or
auth bypass.

The goal is to make the first future non-persistent production preview
implementation small and reviewable once authenticated workspace evidence is
available.

## Current Verdict

Option A design can continue.

Option A implementation remains blocked.

Reason:

- the route-edge boundary exists
- the preflight contract exists
- Style Lab budget/diagnostics/preflight evidence exists
- but authenticated workspace target evidence is missing
- route-load network activity must be classified before preview mutation can be
  separated from baseline app behavior

## Blocker Classification

### A. Hard Blockers

Hard blocker: no authenticated workspace target scope evidence.

Evidence:

- `/` was auth-gated during the latest smoke.
- `main.nexus-shell` existed, but it was the auth gate shell.
- `main.nexus-shell.nexus-outer-shell-frame` was not observed.
- Adopted workspace surfaces did not render.

Why this blocks implementation:

- the intended preview target has not been observed in a real authenticated
  workspace
- there is no selector evidence for the exact future mutation target
- applying variables without target evidence risks either doing nothing or
  broadening scope unsafely

### B. Evidence Blockers

Evidence blocker: adopted production surfaces were not visible in `/`.

Missing evidence:

- `.nexus-top-bar-frame`
- `.nexus-right-floating-dock-rail`
- `.nexus-workspace`
- `.nexus-message-bubble`
- `.nexus-agent-window`
- `.nexus-command-palette-shell`
- `.nexus-agent-branch-modal-shell`
- `.nexus-datapad-shell`
- `.nexus-control-icon-button-shell`

Why this matters:

- the future preview target is useful only if adopted aliases cascade into real
  visible workspace surfaces
- Style Lab evidence proves local preview mechanics, not authenticated
  production workspace coverage

### C. Baseline Classification Blockers

Baseline classification blocker: route-load API/sync activity exists.

Observed during the latest smoke:

- `GET /api/v1/prompts?...`
- `GET /api/v1/workspaces/recovery?...`
- `GET /api/v1/notebooks`
- `GET /api/v1/workspaces/.../state` with `404`
- `POST /api/v1/sync/operations 200`

Classification:

- treat this as existing route-load baseline unless future evidence shows it is
  preview-caused
- do not classify the latest run as fully zero-network-mutation evidence
- future preview implementation must not add new API calls

Why this matters:

- a non-persistent preview path can still be safe, but the smoke evidence must
  distinguish baseline app network behavior from preview-caused mutation
- without a route-load baseline, a later preview smoke cannot prove whether new
  write traffic came from preview or normal app load

### D. Not Blockers

These are not blockers:

- route-edge boundary exists:
  `[data-nexus-production-page-shell-boundary="v1"]`
- page shell marker exists:
  `[data-nexus-page-shell="workspace"]`
- production apply blocked marker exists:
  `[data-nexus-production-apply="blocked"]`
- auth gate shell exists:
  `main.nexus-shell`
- pure production preview preflight contract exists
- Style Runtime Budget model exists
- Style Runtime Preview Diagnostics exists
- Style Runtime Preflight Gate exists

Interpretation:

- the guard rails are present
- the design has enough foundation to continue
- implementation still waits for authenticated workspace evidence

## Future Target Scope Design

Intended first target:

- selector: `main.nexus-shell.nexus-outer-shell-frame`
- scope id: `nexus-outer-shell-frame`
- scope type: `authenticated-production-route`
- persistence: `none`
- mutation target: `production-route-container`
- auth smoke required: yes

Why this target:

- it is below document root
- it is the smallest currently known production-adhered shell target with
  meaningful visual cascade
- it aligns with `NexusOpsOuterShellFrame`
- it can carry current adopted alias variables to shell, workspace, TopBar,
  dock, windows, messages, command palette, modal, and Datapad surfaces when
  those surfaces are present
- rollback can remove variables from a single declared target

Why not document root:

- the preflight contract blocks root-level mutation for production route
  preview
- blast radius is app-wide
- rollback would need guarantees outside the production shell

Why not the whole route-edge boundary:

- `NexusProductionPageShellBoundary` is `className="contents"`
- it is a guard/evidence marker, not a visual mutation target
- it explicitly marks production apply as blocked

Why not generic `main.nexus-shell`:

- the latest smoke proved `main.nexus-shell` also exists for the auth gate
- using the generic selector could target the wrong shell
- `nexus-outer-shell-frame` narrows the target to authenticated workspace shell

Why not individual surfaces first:

- they are excellent future smoke targets
- they fragment the preview session and rollback
- the first implementation should prove one target scope before multi-surface
  targeting is considered

Required selector evidence:

- authenticated workspace renders `main.nexus-shell.nexus-outer-shell-frame`
- the element is visible
- the element is not `document.documentElement`, `body`, or an app root outside
  the production shell
- route-edge boundary still wraps the workspace and still says
  `data-nexus-production-apply="blocked"`

Required authenticated smoke evidence:

- pre-existing authenticated session is available
- no login automation or credential submission is required
- adopted surfaces are visible enough for visual smoke
- console and hydration baseline are recorded
- route-load network baseline is recorded before any preview transaction

## Future Apply/Revert Transaction Design

This section defines design only. It is not implementation.

### Transaction Metadata

A future transaction must record:

- transaction id
- session id
- budget checksum
- diagnostics checksum
- target scope id
- target selector
- production apply mode: `non-persistent-preview`
- variable count
- exact variable names
- start timestamp
- apply duration
- revert duration
- final status

### Previous Inline Values Snapshot

Before applying variables, the transaction must snapshot previous inline values
for every variable it will touch:

- variable name
- previous inline value
- whether the value was absent

Revert must restore previous inline values exactly:

- absent before apply: remove the inline variable
- present before apply: restore that previous value

This prevents the preview from erasing unrelated inline values that existed
before the transaction.

### Apply Rules

Apply may proceed only if:

- production preflight is `eligible`
- target exists exactly once
- target matches the declared selector
- target is not document root
- target is not `body`
- target is not a broad app root outside the production shell
- variable map is non-empty
- checksum matches budget and diagnostics evidence
- authenticated smoke evidence is present
- rollback plan exists
- no store/backend/storage writes are part of the path
- no production behavior is touched

Apply must:

- mutate only inline CSS variables on the declared target element
- avoid selectors, raw CSS blocks, class changes, layout changes, and behavior
  changes
- record duration
- fail closed on any missing evidence

### Revert Rules

Revert must:

- restore the exact previous inline values snapshot
- remove variables that were absent before apply
- record duration
- run a residue check
- report remaining preview variables if any
- leave no persisted state

### Residue Check

Residue check must confirm:

- all preview variables were removed or restored to prior values
- no preview session marker remains on the target
- no document root variables were added
- no localStorage, IndexedDB, workspace store, backend, API, or Supabase writes
  were created by preview

### Fail-Closed Rules

Fail closed if:

- target missing
- target count is not exactly one
- target is document root or `body`
- checksum missing or mismatched
- variable count is `0`
- authenticated smoke evidence missing
- route-load network baseline missing
- rollback snapshot fails
- route is translated and hydration baseline cannot be separated
- any unsafe write flag is present
- production behavior would be touched

## Route-Load Baseline Network Policy

Future preview smoke must separate baseline route activity from preview-caused
activity.

### Baseline Definition

Route-load baseline is the network/server activity emitted by loading
authenticated `/` before any preview apply is attempted.

The latest auth-gated smoke observed existing activity including:

- `GET /api/v1/prompts?...`
- `GET /api/v1/workspaces/recovery?...`
- `GET /api/v1/notebooks`
- `GET /api/v1/workspaces/.../state` with `404`
- `POST /api/v1/sync/operations 200`

Policy:

- classify `POST /api/v1/sync/operations 200` as existing route-load baseline
  unless future evidence proves it is preview-caused
- record it explicitly
- do not treat it as a V20 preview regression by itself
- do not claim zero-network-mutation evidence when this baseline appears

### Acceptable Baseline

Acceptable baseline activity:

- requests that happen before preview apply
- requests already present with no preview implementation
- auth/session/workspace recovery reads
- pre-existing sync activity documented before preview mutation

Acceptable does not mean harmless for all purposes. It means the activity is
not caused by preview unless it appears only during preview windows.

### Preview-Caused Mutation

Preview-caused mutation includes:

- new API calls that begin only during apply/revert
- store/backend/storage writes caused by preview code
- new `POST`, `PUT`, `PATCH`, or `DELETE` requests caused by preview
- localStorage or IndexedDB writes caused by preview
- workspace state changes caused by preview
- any mutation required to reveal or test the target scope

Preview implementation must not add any new API calls.

### Required Future Recording Windows

Future smoke should record requests in four windows:

1. before preview:
   - load route
   - wait for steady baseline
   - record existing requests
2. during apply:
   - record requests while variables are applied
   - expected preview-caused network: none
3. during revert:
   - record requests while variables are reverted
   - expected preview-caused network: none
4. after revert:
   - record delayed requests
   - confirm no preview-caused write traffic

If tooling cannot reliably observe network activity:

- record tooling limitation
- keep implementation in hold
- do not fabricate clean network evidence

## No-Persistence / No-Write Guards

Future implementation must prove:

- no localStorage writes
- no IndexedDB writes
- no workspace store writes
- no backend/API/Supabase writes
- no file writes
- no runtime token persistence
- no production behavior touch
- no asset/layout production apply

Preview state must be memory-only and tied to a transaction that can be
reverted.

## Rollback And Recovery

Rollback requirements:

- transaction metadata is captured before apply
- previous inline values snapshot exists before apply
- revert restores every previous inline value
- residue check passes
- if apply partially fails, revert still runs for any touched variables
- if revert fails, fail closed and report the remaining variables

Repository rollback:

- future implementation must be isolated to the approved small-cut files
- revert the implementation commit if the preview path behaves unexpectedly

Runtime rollback:

- no persisted cleanup should be required
- no backend cleanup should be required
- no workspace data cleanup should be required

## Implementation Unlock Criteria

Option A implementation may start only when all criteria are met:

1. authenticated session already exists; no login automation is required
2. `main.nexus-shell.nexus-outer-shell-frame` is observed in authenticated `/`
3. adopted production surfaces are visible enough for smoke
4. baseline console and hydration state are recorded
5. route-load network baseline is recorded
6. Style Lab budget/diagnostics/preflight evidence remains passing
7. production preview preflight contract is `eligible`, or the only hold reason
   has been resolved by authenticated smoke evidence
8. rollback/revert transaction strategy is approved
9. no persistence/store/backend/API writes are required by preview
10. implementation scope is limited to one non-persistent preview target
11. document root mutation remains blocked
12. no command execution, modal submit, Datapad save/delete/upload/download,
    drag/resize/focus/z-index, React Flow, graph, or production behavior change
    is needed

If any criterion is missing:

- keep Option A implementation blocked
- continue evidence collection or design review only

## Next Safe Step

Recommended next seed:

- `V20 Authenticated Production Preview Scope Evidence Retry`

Goal:

- rerun authenticated production scope smoke with a pre-existing authenticated
  session and no credential submission inside the task
- confirm `main.nexus-shell.nexus-outer-shell-frame`
- record adopted surface visibility
- record route-load network baseline
- keep production preview apply blocked

## Explicit Hold Statement

Option A design can continue.

Option A implementation remains blocked.
