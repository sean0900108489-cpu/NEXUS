# V20 Authenticated Workspace Evidence Runbook

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Base evidence:

- `ffcc578 docs: add production preview design hold plan`
- `0943a14 docs: record authenticated production preview scope smoke`
- `5c3019f docs: map production preview target scopes`

## Purpose

This runbook defines how to collect authenticated workspace evidence for the
future non-persistent production preview target.

It is a no-mutation evidence procedure. It does not authorize production
preview apply, CSS variable mutation, DOM mutation, source edits, login
automation, persistence, store writes, backend writes, or auth bypass.

The runbook is meant to be executed only when a pre-existing authenticated
session is already available.

## Target Decision

Future target scope:

- selector: `main.nexus-shell.nexus-outer-shell-frame`
- scope id: `nexus-outer-shell-frame`
- scope type: `authenticated-production-route`
- persistence: `none`
- mutation target: `production-route-container`

The target evidence is passable only after the authenticated workspace shell
renders. The auth gate shell is not sufficient.

## Auth State Decision Tree

### A. Auth Gate Visible

Signals:

- login form is visible
- text such as `IDENTITY GATE`, `EMAIL`, `PASSWORD`, `LOGIN`, `NEED ACCOUNT`,
  `Checking session...`
- `main.nexus-shell` exists but
  `main.nexus-shell.nexus-outer-shell-frame` is absent

Action:

- record `auth-gated`
- do not log in
- do not type credentials
- do not submit forms
- stop evidence collection

Result:

- evidence verdict: `hold-auth`
- Option A implementation remains blocked

### B. Authenticated Workspace Visible

Signals:

- `main.nexus-shell.nexus-outer-shell-frame` exists exactly once
- route-edge boundary exists
- workspace UI is visible
- at least core surfaces are present, such as TopBar, right dock, and workspace

Action:

- continue selector checks
- continue adopted surface checks
- continue console/hydration baseline
- continue route-load network baseline
- keep all checks read-only unless an explicitly safe open/close smoke is
  required and cannot mutate data

Result:

- evidence verdict can become `pass` if all required criteria pass

### C. Ambiguous State

Signals:

- loading state does not settle
- auth gate text is not clear
- authenticated shell is absent but login UI is also absent
- browser tooling cannot read enough DOM/console/network evidence
- route renders partial UI but required target count is unclear

Action:

- record `ambiguous`
- stop
- do not force interaction
- do not click through unknown flows

Result:

- evidence verdict: `hold-tooling` or `hold-ambiguous`

## Required Selector Evidence

### Route-Edge Selectors

| Selector | Required | Observe with | Pass | Hold | Blocked |
| --- | --- | --- | --- | --- | --- |
| `[data-nexus-production-page-shell-boundary="v1"]` | yes | read-only DOM query | exactly `1` | missing because auth/tooling blocked before app render | duplicated or attached outside expected route shell |
| `[data-nexus-page-shell="workspace"]` | yes | read-only DOM query | exactly `1` | missing because auth/tooling blocked before app render | duplicated or shell id differs unexpectedly |
| `[data-nexus-production-apply="blocked"]` | yes | read-only DOM query | exactly `1` | missing because auth/tooling blocked before app render | absent while authenticated workspace is visible |

Notes:

- The route-edge boundary may have `class="contents"` and visible count `0`.
  That is expected.
- These selectors prove the guard exists. They are not the future mutation
  target.

### Target Selector

| Selector | Required | Observe with | Pass | Hold | Blocked |
| --- | --- | --- | --- | --- | --- |
| `main.nexus-shell.nexus-outer-shell-frame` | yes | read-only DOM query and visibility check | exactly `1`, visible, not document root/body | auth gate or target absent | duplicated, hidden due crash, or requires mutation to reveal |

Pass details:

- element tag is `main`
- class includes both `nexus-shell` and `nexus-outer-shell-frame`
- element is not `document.documentElement`
- element is not `body`
- element is not a broad app root outside the production shell

### Adopted Surface Selectors

| Surface | Selector | Required | Safe interaction | Pass | Hold | Blocked |
| --- | --- | --- | --- | --- | --- | --- |
| TopBar | `.nexus-top-bar-frame` | required | none | visible count at least `1` | authenticated workspace not loaded | missing in otherwise healthy workspace |
| Right dock | `.nexus-right-floating-dock-rail` | required | none | visible count at least `1` | authenticated workspace not loaded | missing in otherwise healthy workspace |
| Workspace | `.nexus-workspace` | required | none | visible count at least `1` | authenticated workspace not loaded | missing in otherwise healthy workspace |
| Message bubbles | `.nexus-message-bubble` | optional-stateful | none | visible if current workspace has messages | no messages in current workspace | rendering crash or message surface broken |
| AgentWindow | `.nexus-agent-window` | optional-stateful | none | visible if windows are open | no windows visible | opening would require behavior mutation |
| CommandPalette | `.nexus-command-palette-shell` | optional-safe | safe open/close only | visible after safe open without command execution | cannot open safely | open executes command or changes data |
| Modal shell | `.nexus-agent-branch-modal-shell` | optional-safe | safe open/close only | visible if already open or opened without submit/validation | cannot open safely | submit/validation/data mutation required |
| Datapad shell | `.nexus-datapad-shell` | optional-safe | safe open/close only | visible if already open or opened without save/delete/upload/download | cannot open safely | save/delete/upload/download/draft mutation required |
| Toolbar/control icon | `.nexus-control-icon-button-shell` | optional-stateful | none | visible if toolbar controls render | controls not visible in current state | checking would require behavior mutation |

Core evidence requires:

- TopBar
- right dock
- workspace
- target selector
- route-edge selectors

Stateful/optional surfaces should be recorded as:

- visible
- absent due current workspace state
- not opened because unsafe
- blocked due required mutation

Do not convert optional absence into failure unless the workspace should clearly
render that surface in the current state.

## No-Mutation Smoke Rules

### Allowed

- read DOM selectors
- read element visibility
- read computed styles
- read console logs
- read network logs if tooling allows
- read server logs if a local dev server is used
- record screenshots only if explicitly requested
- safe open/close of CommandPalette only if it does not execute a command
- safe modal open/close only if it does not submit, validate, or mutate data
- safe Datapad visibility check only if it does not save, delete, upload,
  download, or alter draft persistence

### Forbidden

- setting CSS variables
- setting inline styles
- adding/removing classes
- mutating DOM
- mutating document root
- writing localStorage
- writing IndexedDB
- logging in
- submitting credentials
- submitting forms
- executing commands
- sending messages
- saving/deleting/uploading/downloading
- deliberately triggering store/backend/API writes
- changing React Flow / graph behavior
- changing drag/resize/focus/z-index/window/modal behavior
- changing production source
- changing `src/app/globals.css`

## Console / Hydration Baseline

Record:

- browser console error count
- browser console warning count
- error/warning source if tooling exposes it
- hydration mismatch messages
- Chrome Translate state
- whether the page is translated
- whether mismatch can be separated from Translate
- whether any error appears related to V20 preview scope work

Known baseline separation:

- `bg-cyberpunk.webp` placeholder failure is a known baseline if observed
- Chrome Translate hydration mismatch is baseline only if Translate is active

If console tooling is unavailable:

- record `hold-tooling`
- do not claim console-clean evidence

## Network Baseline Windows

Network evidence must be recorded in windows. The goal is to separate existing
route behavior from future preview-caused mutation.

### Window 0 - Before Route Load

Use if tooling allows.

Record:

- time
- route URL about to load
- existing open tab state
- whether a dev server is already running
- whether network log capture is active before navigation

If not available:

- record `not captured before route load`
- continue only if later windows are available

### Window 1 - Route Load Baseline

Record all requests caused by loading authenticated `/` before any preview
transaction exists.

Track explicitly:

- `POST /api/v1/sync/operations`
- notebook requests
- recovery requests
- prompt requests
- auth/session requests
- workspace state requests
- failed requests and status codes

Classification:

- requests present before preview are `route-load baseline`
- `POST /api/v1/sync/operations` is baseline unless future evidence proves it
  is preview-caused
- baseline write-like traffic means this evidence is not zero-network-mutation,
  but it can still be useful if clearly separated from preview activity

### Window 2 - After Workspace Stable

Record after initial route-load activity settles.

Capture:

- selector counts
- visible surface status
- console/hydration state
- delayed network requests
- whether route continues polling or syncing

If the app continues background sync:

- record cadence if visible
- keep future preview implementation held until background traffic can be
  separated from preview windows

### Window 3 - Optional Safe Interaction

Use only if needed and safe.

Allowed interactions:

- open/close CommandPalette without executing command
- open/close modal only if no submit/validation/data mutation occurs
- reveal Datapad only if no save/delete/upload/download/draft mutation occurs

Record:

- action taken
- selector visible before/after
- network requests during the window
- whether any write traffic occurred

If any interaction could mutate workspace data:

- stop
- classify as `hold-risky-surface`

### Future Window 4 - During Preview Apply

This window is for a later implementation, not this runbook execution.

Expected preview-caused network:

- none

Any new API call that appears only during apply is preview-caused until proven
otherwise.

### Future Window 5 - During Preview Revert

This window is for a later implementation, not this runbook execution.

Expected preview-caused network:

- none

Any new API call that appears only during revert is preview-caused until proven
otherwise.

### Future Window 6 - After Revert

This window is for a later implementation, not this runbook execution.

Record:

- delayed requests
- residue check
- console/hydration state after revert
- final selector status

## Evidence Recording Template

Use this shape for future evidence:

```md
## Authenticated Workspace Evidence

- date/time:
- branch:
- commit:
- route:
- authenticated session pre-existing: yes/no
- login attempted: no
- credentials submitted: no
- browser/tooling:
- Chrome Translate active: yes/no/unknown

### Auth State

- verdict: authenticated-workspace / auth-gated / ambiguous
- visible auth signals:
- visible workspace signals:

### Required Selectors

| Selector | Count | Visible count | Result | Notes |
| --- | ---: | ---: | --- | --- |
| `[data-nexus-production-page-shell-boundary="v1"]` | | | | |
| `[data-nexus-page-shell="workspace"]` | | | | |
| `[data-nexus-production-apply="blocked"]` | | | | |
| `main.nexus-shell.nexus-outer-shell-frame` | | | | |

### Adopted Surfaces

| Surface | Selector | Count | Visible count | Result | Notes |
| --- | --- | ---: | ---: | --- | --- |
| TopBar | `.nexus-top-bar-frame` | | | | |
| Right dock | `.nexus-right-floating-dock-rail` | | | | |
| Workspace | `.nexus-workspace` | | | | |
| Message bubbles | `.nexus-message-bubble` | | | | |
| AgentWindow | `.nexus-agent-window` | | | | |
| CommandPalette | `.nexus-command-palette-shell` | | | | |
| Modal shell | `.nexus-agent-branch-modal-shell` | | | | |
| Datapad shell | `.nexus-datapad-shell` | | | | |
| Toolbar/control icon | `.nexus-control-icon-button-shell` | | | | |

### Console / Hydration

- console errors:
- console warnings:
- hydration mismatch:
- known baseline issues:
- V20 preview-scope related issues:

### Network Baseline

- before route load:
- route load baseline:
- after workspace stable:
- optional safe interaction:
- `POST /api/v1/sync/operations` observed: yes/no
- classification:

### Final Verdict

- evidence verdict:
- Option A design:
- Option A implementation:
- stop condition:
```

## Evidence Verdict Criteria

### Pass

Evidence is `pass` only if:

- authenticated workspace is visible
- route-edge selectors exist
- `main.nexus-shell.nexus-outer-shell-frame` exists exactly once
- target is visible
- target is not document root or `body`
- TopBar, right dock, and workspace are visible
- optional/stateful surfaces are recorded honestly
- console/hydration baseline is recorded
- route-load network baseline is recorded
- no deliberate mutation was performed
- no credentials were submitted
- no source changed

Result:

- Option A design can proceed to first-cut design
- Option A implementation is still not automatic

### Hold

Evidence is `hold` if:

- auth gate is visible
- target selector is missing
- required surfaces are hidden due current route state
- console tooling is unavailable but app appears stable
- network tooling is unavailable
- route-load baseline cannot be separated
- safe interaction would be needed but is not safe to perform

Result:

- Option A design can continue
- Option A implementation remains blocked

### Blocked

Evidence is `blocked` if:

- authenticated workspace crashes
- required UI is missing in a state where it should be present
- target is duplicated
- target is document root or `body`
- a mutation is required to observe the target
- hydration crash prevents route inspection
- unexpected production behavior regression appears
- command execution, form submit, Datapad persistence, upload/download, or
  workspace mutation is required
- preview would need store/backend/API writes

Result:

- stop immediately
- do not proceed to preview design
- record blocker and rollback/no-go recommendation

## Stop Conditions

Stop evidence collection when:

- auth gate appears
- login or credentials would be required
- target cannot be read without mutation
- selector counts are ambiguous and tooling cannot disambiguate safely
- opening CommandPalette would execute a command
- opening modal would submit or validate
- opening Datapad would save/delete/upload/download or alter draft state
- route emits unclassified write traffic that cannot be separated from baseline
- Chrome Translate causes hydration mismatch that cannot be separated
- browser tooling cannot access console/network and confidence is required

## Next Implementation Seed

If evidence verdict is `pass`, the next seed should be:

`V20 Non-Persistent Production Preview First Cut Design`

This next task should still be design-first unless the user explicitly approves
implementation.

It should define:

- target: `main.nexus-shell.nexus-outer-shell-frame`
- variable source: existing Bridge Plan / Warm Glass direct aliases
- apply transaction
- revert transaction
- previous inline value snapshot
- residue check
- no-persistence guard
- no-network-mutation rule
- rollback plan
- implementation file limits
- stop conditions

## Final Rule

Authenticated evidence collection is not production preview.

Passing this runbook is necessary before implementation can be considered, but
it is not itself approval to implement production preview apply.
