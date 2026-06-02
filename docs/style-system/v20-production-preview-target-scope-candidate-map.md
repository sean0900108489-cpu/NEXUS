# V20 Production Preview Target Scope Candidate Map

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

## Purpose

This map selects the first safe target scope candidate for a future
non-persistent production preview path.

It does not implement production preview. It does not authorize production
apply. It does not add persistence, DOM mutation, selectors, aliases, or runtime
behavior.

The current highest ROI is deciding where a future preview may be scoped before
any production route is touched.

## Current Evidence

Known foundations:

- Style Runtime Budget model exists.
- Style Runtime Budget panel exists.
- Style Runtime Preview Diagnostics exists.
- Style Runtime Preflight Gate exists.
- Production Preview Preflight Contract exists.
- Surface Style budget verdict is `safe`.
- Style Lab local preflight flow reaches `PASS` after apply/revert and residue
  pass.
- Production preview contract can return `eligible`, `hold`, or `blocked`.

Route-edge evidence:

- `src/app/page.tsx` renders:
  `NexusStyleRuntimeProvider -> NexusProductionPageShellBoundary(shellId="workspace") -> NexusOps`.
- `NexusProductionPageShellBoundary` marks the route edge with:
  - `data-nexus-page-shell="workspace"`
  - `data-nexus-production-page-shell-boundary="v1"`
  - `data-nexus-production-apply="blocked"`
- `NexusOpsOuterShellFrame` renders:
  `main.nexus-shell.nexus-outer-shell-frame`.
- `NexusOpsBodyFrame` is a layout section:
  `section.flex.min-h-0.flex-1.gap-2.p-2`.
- Style Lab Production Chrome Smoke currently targets a local isolated
  container and remains evidence-only for production.

## Candidate Scope Inventory

| Candidate | Scope id | Scope type | Persistence | Expected mutation target | Auth smoke | Rollback expectation | Blast radius | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Style Lab isolated container | `style-lab-production-chrome-smoke` | `style-lab` | `none` | `local-container` | not required | remove known local smoke variables from local ref | low | evidence-only | Already works and produces diagnostics, but it is not the production route. Use it to prove contract shape, not as Option A target. |
| Route-edge page shell boundary | `nexus-page-shell:workspace` | `authenticated-production-route` | `none` | route boundary guard, not first mutation target | required | no mutation until child target chosen; evidence records boundary attrs | broad | hold | Strong guard/evidence point because it wraps `NexusOps` and declares production apply blocked. As `contents`, it is better as a boundary marker than the first preview mutation target. |
| `main.nexus-shell` | `nexus-shell-main` | `authenticated-production-route` | `none` | `production-route-container` | required | remove all bridge variables from the `main.nexus-shell` inline style | high | hold | Meaningful coverage because adopted aliases are scoped under `.nexus-shell`; however generic `main.nexus-shell` is broad and should be narrowed to the extracted outer-shell class. |
| `NexusOpsOuterShellFrame` | `nexus-outer-shell-frame` | `authenticated-production-route` | `none` | `production-route-container` | required | remove every bridge variable from `main.nexus-shell.nexus-outer-shell-frame`; record checksum/session/scope | medium-high | recommended first candidate, currently hold | Best first future target: actual production route element, below document root, aligned with extracted shell, cascades to adopted alias families, and can be reverted with a single target style cleanup. It remains hold until authenticated smoke evidence exists. |
| `NexusOpsBodyFrame` | `nexus-ops-body-frame` | `authenticated-production-route` | `none` | not currently stable without new selector | required | would need a stable selector first; no mutation now | medium | hold | It is a broad layout body and currently has no dedicated stable selector. Source changes are out of scope for this mapping round. |
| Individual adopted surfaces | `surface-family:*` | `authenticated-production-route` | `none` | many production surface containers | required | remove only variables applied to each declared surface; requires multi-target session trace | low-to-medium per surface, high if many | hold | Useful for authenticated smoke and fine-grained verification, but inefficient as the first production preview target because it fragments target scope and rollback. |
| RightDock rail | `surface-family:right-dock` | `authenticated-production-route` | `none` | `.nexus-right-floating-dock-rail` | required | remove right-dock variables from rail target | low | hold | Safe visual surface, but too narrow for first whole-preview path. Active right-dock panels remain excluded. |
| TopBar frame | `surface-family:top-bar` | `authenticated-production-route` | `none` | `.nexus-top-bar-frame` | required | remove top-bar variables from frame target | low | hold | Good smoke target; child controls/counters remain behavior-bearing. |
| AgentWindow chrome | `surface-family:agent-window` | `authenticated-production-route` | `none` | `.nexus-agent-window` and handle | required | remove agent-window variables from visible windows | medium | hold | Meaningful but depends on live authenticated workspace state with visible windows. Do not touch drag/resize/focus/z-index behavior. |
| CommandPalette shell | `surface-family:command-palette` | `authenticated-production-route` | `none` | `.nexus-command-palette-shell` | required | remove command palette variables after open/close smoke | medium | hold | High-value surface, but requires opening the palette without executing commands. |
| Modal shell | `surface-family:modal-shell` | `authenticated-production-route` | `none` | `.nexus-agent-branch-modal-shell` | required | remove modal variables after open/close smoke | medium | hold | Requires safe modal visibility without submit/validation/close behavior mutation. |
| Datapad shell | `surface-family:datapad-shell` | `authenticated-production-route` | `none` | `.nexus-datapad-shell` | required | remove datapad variables after open/close smoke | medium | hold | Requires no save/delete/upload/download/draft persistence. |
| MessageBubble roles | `surface-family:message-bubble` | `authenticated-production-route` | `none` | `.nexus-message-bubble-*` | required | remove message variables from visible bubbles | low-to-medium | hold | Great content smoke target; live workspace may not have all roles visible. |
| Authenticated production document root | `document-root` | `authenticated-production-route` | `none` | `root-document` | required | would require root cleanup and wider app guarantees | very high | blocked | The production preview contract blocks root-level mutation for production route preview. This is too broad and risks unrelated app state. |

## Contract Evaluation

The conceptual evaluation applies `createProductionPreviewPreflight` rules:

| Candidate | Budget safe | Diagnostics evidence | Checksum/session | Target scope valid | Persistence none | Unsafe writes expected | Document root mutation | Production behavior touch | Auth smoke | Contract outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Style Lab isolated container | yes | yes | yes | yes | yes | no | no | no | not required | eligible as evidence-only |
| Route-edge page shell boundary | yes | Style Lab only | yes from Style Lab | valid as boundary | yes | no | no | no | missing | hold |
| `main.nexus-shell` | yes | Style Lab only | yes from Style Lab | valid but broad | yes | no | no | avoid | missing | hold |
| `NexusOpsOuterShellFrame` | yes | Style Lab only | yes from Style Lab | valid and concrete | yes | no | no | avoid | missing | hold, recommended first |
| `NexusOpsBodyFrame` | yes | Style Lab only | yes from Style Lab | needs stable selector evidence | yes | no | no | avoid | missing | hold |
| Individual adopted surfaces | yes | Style Lab only | yes from Style Lab | valid per surface | yes | no | no | avoid | missing | hold |
| Document root | yes | irrelevant | irrelevant | valid metadata but unsafe | yes | no | yes | possible | missing | blocked |

Current reason the recommended candidate is still `hold`:

- authenticated production smoke is missing
- production route target existence has not been recorded in an authenticated
  workspace
- future apply/revert must be separately designed and kept non-persistent

## Recommended First Target Scope

Recommended first future Option A target:

- scope id: `nexus-outer-shell-frame`
- scope type: `authenticated-production-route`
- persistence: `none`
- mutation target: `production-route-container`
- target selector for future planning:
  `main.nexus-shell.nexus-outer-shell-frame`
- guard evidence:
  `data-nexus-page-shell="workspace"` and
  `data-nexus-production-apply="blocked"` on `NexusProductionPageShellBoundary`
- auth smoke required: yes
- current contract status: `hold`

Why this is highest ROI:

- it is the smallest useful production container that can cascade the current
  adopted alias families without using document root
- it aligns with an extracted inert production frame
- it sits below the route-edge boundary but above individual surface fragments
- rollback can be defined as removing all preview variables from one declared
  target element
- it meaningfully covers shell, workspace, windows, command/modal/datapad,
  messages, TopBar, and dock aliases if the variables cascade as expected

Why not route-edge boundary as the mutation target:

- it is `className="contents"` and better used as a guard/marker
- it intentionally says production apply is blocked
- mutating the boundary itself would blur guard evidence and preview target

Why not document root:

- the contract blocks production route root mutation
- root mutation has a high blast radius
- rollback would need guarantees outside the production shell

Why not individual surfaces first:

- they are excellent authenticated smoke targets
- they are too fragmented for the first production preview channel
- multi-target rollback/session trace would add complexity before the single
  container path is proven

## Authenticated Smoke Evidence Plan

Authenticated smoke should be a separate task before any production preview
implementation.

Required confirmations:

1. Authenticated `/` route loads without submitting credentials in the task.
2. Route-edge boundary exists:
   - `data-nexus-page-shell="workspace"`
   - `data-nexus-production-page-shell-boundary="v1"`
   - `data-nexus-production-apply="blocked"`
3. Recommended target exists:
   - `main.nexus-shell.nexus-outer-shell-frame`
4. Previously completed surfaces are visible when available:
   - RightDock rail
   - TopBar frame
   - Workspace surface
   - MessageBubble roles if messages are present
   - AgentWindow chrome if windows are visible
   - CommandPalette shell open/close without command execution
   - AgentBranchModal shell only if it can be opened without submit/data change
   - Datapad shell only if it can be opened without save/delete/upload/download
5. Console and hydration baseline are recorded.
6. Known baseline issues are separated:
   - `bg-surface-shell.webp` placeholder failure
   - Chrome Translate hydration mismatch if Translate is active
7. No workspace mutation occurs.
8. No store/backend/API/Supabase writes occur.
9. No persistence is created.

Evidence record shape:

- date/time
- branch and commit
- authenticated session available: yes/no
- route URL
- route-edge boundary selector result
- recommended target selector result
- visible surface selector results
- console errors/warnings
- known baseline issues
- stop condition encountered, if any
- screenshots only if explicitly requested
- final `git status`

Stop conditions:

- auth gate blocks the route
- smoke would require login credential submission
- target exists only at document root
- CommandPalette smoke would execute a command
- modal smoke would submit or validate a form
- Datapad smoke would save/delete/upload/download or alter draft persistence
- any check requires store/backend/API/Supabase mutation
- Chrome Translate is active and causes hydration mismatch that cannot be
  separated from the test

## Rollback / Revert Requirements For Future Preview

Any future non-persistent production preview using the recommended scope must:

- record preview session id
- record budget checksum
- record diagnostics checksum
- record target scope id
- record exact variable names applied
- apply only to the declared target element
- never write localStorage, IndexedDB, workspace store, backend, API, Supabase,
  or files
- provide a revert path that removes every applied variable from that target
- run a residue check after revert
- fail closed if the target is missing, checksum mismatches, variables are
  empty, or authenticated smoke evidence is missing

## Option A Readiness

Option A design can start after this map.

Implementation cannot start yet.

The next safe step is not production apply. It is an authenticated production
scope smoke checklist or a pure target-scope metadata helper that encodes this
map.

Recommended next seed:

- `V20 Authenticated Production Preview Scope Smoke Checklist`

Goal:

- collect authenticated route evidence for `NexusProductionPageShellBoundary`
  and `main.nexus-shell.nexus-outer-shell-frame` without applying variables,
  mutating workspace data, or touching production runtime.

## No-Go List

Do not do in the next step:

- production preview apply
- runtime token persistence
- backend/store/API/Supabase writes
- document root mutation
- asset/layout production apply
- command execution
- modal submit
- Datapad save/delete/upload/download
- React Flow / graph behavior changes
- drag/resize/focus/z-index/window/modal behavior changes
