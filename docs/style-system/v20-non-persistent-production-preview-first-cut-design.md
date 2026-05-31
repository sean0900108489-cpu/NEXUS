# V20 Non-Persistent Production Preview First Cut Design

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Base evidence:

- `2d25e3b docs: add authenticated workspace evidence runbook`
- `ffcc578 docs: add production preview design hold plan`
- `8de062d feat: add production preview preflight contract`

## Implementation Status

Implementation blocked until authenticated workspace evidence pass.

This document is design-only. It does not implement production preview, does not
apply CSS variables, does not mutate DOM, does not add persistence, does not
edit source, and does not authorize production runtime changes.

The first cut may be implemented only after the authenticated workspace evidence
runbook produces a `pass` verdict.

## First Cut Scope

Target:

- selector: `main.nexus-shell.nexus-outer-shell-frame`
- scope id: `nexus-outer-shell-frame`
- scope type: `authenticated-production-route`
- persistence: `none`
- mutation target: `production-route-container`

Required precondition:

- authenticated workspace evidence pass
- target selector observed exactly once
- target is visible
- target is not document root, `html`, `body`, or a broad app root
- route-edge boundary remains present and marked:
  - `[data-nexus-production-page-shell-boundary="v1"]`
  - `[data-nexus-page-shell="workspace"]`
  - `[data-nexus-production-apply="blocked"]`

Why this scope:

- it is the smallest useful production shell target currently identified
- it is below document root
- it is narrower than generic `main.nexus-shell`
- it matches `NexusOpsOuterShellFrame`
- it can cascade adopted production aliases through the authenticated workspace
  shell
- it supports one-target rollback for the first cut

Why not document root:

- root mutation is blocked by the production preview preflight contract
- root scope has app-wide blast radius
- rollback would need guarantees beyond the production shell

Why not `html` or `body`:

- both are effectively document-level preview targets
- they can affect routes and surfaces outside `NexusOps`
- they make residue and unrelated inline style restoration riskier

Why not the whole route-edge boundary:

- `NexusProductionPageShellBoundary` is `className="contents"`
- it is a guard/evidence marker
- it explicitly declares production apply blocked
- mutating it would blur guard evidence and preview target ownership

Why not generic `main.nexus-shell`:

- the auth-gated route also renders `main.nexus-shell`
- generic targeting can hit the auth gate shell instead of authenticated
  workspace shell
- the first cut needs a target that only exists in authenticated workspace

Why not individual surfaces first:

- individual surfaces are useful for smoke, but too fragmented for first-cut
  preview
- multi-target rollback increases session complexity
- first cut should prove a single declared target transaction

## Variable Source

Variable source:

- existing Warm Glass direct Bridge Plan aliases
- existing production alias bridge output
- existing budget summary
- existing Style Lab budget/diagnostics/preflight evidence

No new aliases are introduced by this design.

No source changes are required to define the variable source.

Before variables can be applied in a future implementation:

- budget verdict must be `safe`
- Style Lab preflight gate must be `PASS` or equivalent completed safe state
- production preview preflight contract must be `eligible`
- bridge checksum must exist
- budget checksum must exist
- diagnostics checksum must exist
- checksums must match
- variable count must be greater than `0`
- variable count must remain within budget thresholds
- unsupported critical gap count must be `0`

The first cut should use the same direct alias family already covered by the
Warm Glass bridge rather than inventing a smaller ad hoc map.

## Apply Transaction Design

Each future apply transaction must record:

- transaction id
- session id
- bridge checksum
- budget checksum
- diagnostics checksum
- production preview preflight verdict
- target scope id
- target selector
- exact target count
- target tag name
- target class list
- variable names
- variable count
- previous inline values snapshot
- apply start timestamp
- apply end timestamp
- apply duration
- network baseline window id
- status

### Previous Inline Values Snapshot

Before writing any preview variable, snapshot the previous inline state for
every variable that will be touched.

Snapshot shape:

- variable name
- previous inline value
- previous value present: yes/no

Rules:

- if a variable had no inline value, revert removes it
- if a variable had an inline value, revert restores the exact prior value
- unrelated inline styles are never touched
- unrelated inline CSS variables are never touched

### Apply Steps

The future implementation should follow this order:

1. confirm authenticated workspace evidence pass
2. create transaction id and session id
3. confirm production preview preflight verdict is `eligible`
4. resolve target selector
5. confirm target count is exactly `1`
6. confirm target is not document root, `html`, or `body`
7. confirm target class includes `nexus-shell` and `nexus-outer-shell-frame`
8. confirm variable map is non-empty
9. confirm bridge/budget/diagnostics checksums match
10. snapshot previous inline values
11. record route-load network baseline window id
12. apply variables only to the declared target element
13. record apply duration and status
14. record no-network-mutation evidence for the apply window

Apply must not:

- set variables on document root
- set variables on `html`
- set variables on `body`
- add/remove classes
- write raw CSS blocks
- create selectors
- touch layout geometry
- change production behavior
- call backend/store/API/Supabase
- write localStorage or IndexedDB

### Apply Fail-Closed Conditions

Apply fails closed if:

- authenticated workspace evidence is missing
- target count is not exactly `1`
- target is document root, `html`, or `body`
- target does not include `nexus-shell` and `nexus-outer-shell-frame`
- checksum is missing
- checksum mismatches
- variable count is `0`
- budget verdict is not safe
- production preview preflight is not `eligible`
- rollback snapshot cannot be created
- route-load network baseline is missing
- store/backend/storage write would occur
- production behavior would be touched
- Chrome Translate or hydration state makes baseline inseparable

If apply fails closed:

- do not write any preview variables
- record blockers
- leave implementation state idle

## Revert Transaction Design

Revert must be part of the first cut, not a later enhancement.

Each revert must:

- require an existing transaction record
- resolve the same target selector
- confirm target count is exactly `1`
- confirm checksum/session match the active transaction
- restore previous inline values exactly
- remove only variables introduced by preview when no previous value existed
- measure revert duration
- run residue check
- confirm remaining preview variables are `0`
- leave unrelated inline styles untouched
- avoid all backend/store/API calls
- be idempotent

### Revert Idempotency

Calling revert multiple times should be safe:

- first call restores/removes preview variables
- later calls detect no active preview residue
- later calls do not remove unrelated inline values
- later calls do not throw unless target evidence is unsafe or ambiguous

### Revert Fail-Closed Conditions

Revert fails closed if:

- target missing
- target count is not exactly `1`
- transaction record missing
- checksum mismatches
- session id mismatches
- target class no longer matches expected shell
- residue check fails
- target count changed unexpectedly

If revert fails closed:

- report remaining preview variables
- report target state
- do not attempt broader document-root cleanup
- do not mutate unrelated elements

## Residue Check

Residue check must run after every revert.

It must confirm:

- remaining preview variables on the target: `0`
- every variable with a prior inline value was restored exactly
- every variable that was absent before apply was removed
- no preview session marker remains
- no document root variables were added
- no `html` or `body` variables were added
- no localStorage or IndexedDB writes were made by preview
- no backend/store/API/Supabase writes were made by preview
- no new network calls appeared in apply/revert windows

Residue check result:

- `pass`: first cut may be considered mechanically safe
- `hold`: tooling cannot fully observe residue, implementation should not
  advance beyond local review
- `blocked`: residue remains or unsafe mutation occurred

## Checksum / Session Guard

Required checksums:

- bridge checksum
- budget checksum
- diagnostics checksum

Required matching:

- bridge checksum must match the variable map
- budget checksum must match the budget summary used for the session
- diagnostics checksum must match the diagnostics/preflight evidence used to
  authorize the session

Session requirements:

- session id is generated before apply
- transaction id is generated before apply
- session id and transaction id are included in diagnostics
- revert requires the same active session
- stale sessions cannot apply or revert a different transaction

Mismatch handling:

- checksum missing: fail closed
- checksum mismatch: fail closed
- stale session: fail closed
- multiple active sessions: fail closed

## No-Persistence Guard

The first cut must be memory-only.

Forbidden:

- localStorage writes
- IndexedDB writes
- workspace store writes
- backend writes
- API writes
- Supabase writes
- file writes
- runtime token persistence
- asset/layout production apply

Allowed:

- React local state in a future explicitly approved integration
- in-memory transaction record
- inline CSS variables on the declared target only, after all gates pass

No persisted cleanup should be required after revert.

## No-Network-Mutation Rule

Preview must not introduce new network calls.

Network windows:

1. before preview
2. during apply
3. during revert
4. after revert

Rules:

- route-load baseline must be recorded before apply
- existing `POST /api/v1/sync/operations 200` remains route-load baseline
  unless future evidence proves preview caused it
- notebook, recovery, prompt, auth/session, and workspace state requests are
  classified by timing window
- any new `POST`, `PUT`, `PATCH`, or `DELETE` that appears only during
  apply/revert is preview-caused until proven otherwise
- if network tooling is unavailable, implementation remains held
- first cut implementation must not add fetch calls, server actions, API
  requests, or sync operations

## Rollback

Runtime rollback:

- call revert for the active transaction
- restore previous inline values
- remove preview-introduced variables
- run residue check
- report remaining variables if any

Repository rollback:

- future implementation must be a small-cut commit
- revert that implementation commit if preview behavior is unsafe

Data rollback:

- none should be required
- if any backend/store/API persistence is needed, the design is invalid

## Implementation File Boundary Proposal

This section is for a future implementation task only.

Likely future allowed files:

- `src/lib/style-engine/v2-production-preview-transaction.ts`
- `src/lib/style-engine/v2-production-preview-transaction.test.ts`
- optional pure test fixtures under `src/lib/style-engine/**`
- optional Style Lab-only test hook in a later task, if explicitly approved
- production route integration only after separate explicit approval

First implementation should prefer pure transaction planning before UI/runtime
integration.

Future forbidden files:

- `src/store/**`
- `src/lib/sync/**`
- `src/lib/backend/**`
- `src/lib/supabase/**`
- `src/app/api/**`
- production behavior files
- React Flow / graph files
- drag/resize/focus/z-index/window/modal behavior files
- package/config/deploy files
- Supabase/database/migrations
- `exports/**`
- persistence files

Future first implementation should not edit:

- `src/app/globals.css`
- production Nexus behavior components
- store/sync/backend/API modules

## Future Verification Plan

Pure implementation verification:

- `git diff --check`
- focused unit tests for transaction planner
- fail-closed tests:
  - missing target
  - duplicate target
  - root/html/body target
  - checksum mismatch
  - variable count `0`
  - unsafe budget/preflight
  - missing rollback snapshot
  - store/backend/storage write flag
- idempotent revert tests
- previous inline value restoration tests
- residue check tests
- typecheck
- targeted lint
- build

Authenticated browser verification, only after implementation is approved:

- run authenticated workspace evidence runbook first
- confirm target exists exactly once
- confirm route-load network baseline
- apply preview variables to declared target only
- confirm visible style change on adopted surfaces when present
- confirm no document root/html/body variables
- confirm no new API calls during apply
- revert
- confirm previous inline values restored
- confirm remaining preview variables `0`
- confirm no new API calls during revert
- confirm console/hydration baseline remains stable
- final `git status`

No browser verification should log in, submit credentials, send messages,
execute commands, submit modals, save/delete/upload/download Datapad state, or
mutate workspace data.

## Implementation Unlock Criteria

Implementation may start only after:

- authenticated workspace evidence runbook returns `pass`
- target scope is observed exactly once
- route-load network baseline is recorded
- Style Lab budget/diagnostics/preflight remains passing
- production preview preflight contract can return `eligible`
- rollback design is accepted
- user explicitly approves implementation

Until then:

- implementation remains blocked
- production preview apply remains blocked

## Final Statement

This is a first-cut design, not an implementation.

Implementation blocked until authenticated workspace evidence pass.
