# Protocol 04: Surgical Modularization State Cartography

## Mission

Create a black-box modularization blueprint that discovers large-file pressure,
state ownership, render-only extraction candidates, hook candidates, and domain
service boundaries without breaking behavior.

Target rigor: 90 / 100.

## Mandatory Protocol Controls

Before executing this protocol, read:

- `protocol-router.md`
- `events.schema.json`
- `live-evidence-gate.md`
- `checkpoint-template.md`

Every run must create `00-active-checkpoint.md` and `events.ndjson` before the
first scan. The first event must be `checkpoint.created`. Every phase must emit
`checkpoint.read` before `phase.started`, then emit evidence, inference,
contradiction, next-probe, and completion events as the work progresses. Any
claim that an extracted boundary keeps a user-visible behavior working must
satisfy the live evidence gate or be marked `blocked` / `not-yet-verified`.

Before completion, run:

```bash
node scripts/validate-blackbox-checkpoint.mjs docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>
```

## Black-Box Start Command

```txt
Run a black-box surgical modularization and state-owner audit for /Users/sean/Documents/FreeChat.

Do not assume which files are too large. Measure them. Do not assume who owns
state. Prove it from readers, writers, sync triggers, tests, and runtime paths.

Before the first scan, create an active checkpoint:
docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>/00-active-checkpoint.md

Read the active checkpoint before every phase and branch. Every extraction
candidate must be appended to the checkpoint before it appears in the final
blueprint. Do not edit code.
```

## Checkpoint Loop

Every phase uses this loop:

1. Read `00-active-checkpoint.md`.
2. Record the state owner or extraction boundary under inspection.
3. Run the smallest useful scan/probe.
4. Append candidate evidence immediately.
5. Append inference separately from evidence.
6. Append state-owner collision risks before recommending extraction.
7. Write the next command before moving to the next phase.

## Phase 1: Core Exploration

Measure file pressure and state primitives:
Read `00-active-checkpoint.md` first and record the no-edit constraint plus the
first measurement probe.

```bash
find src -type f \\( -name '*.ts' -o -name '*.tsx' \\) -print0 | xargs -0 wc -l | sort -nr | head -40
rg -n "useState|useReducer|useMemo|useCallback|useRef|useNexusStore|create\\(|persist|queue|sync|runWorkflow|artifact|history|brain|provider|auth|workspace" src
```

Checkpoint: `P04-core-file-pressure`.

## Phase 2: Detail Exploration Branches

### Branch A: State Owner Discovery

For each state domain, find owner, readers, writers, and recovery path.

Domains:

- workspace
- graph
- workflow runtime
- graph brain draft
- generated history
- artifact vault
- provider/API settings
- auth/session
- sync queue
- UI panels

State owner row:

```json
{
  "state": "",
  "currentOwner": "",
  "readers": [],
  "writers": [],
  "syncTrigger": "",
  "recoveryPath": "",
  "safeExtractionRule": "",
  "evidence": []
}
```

Checkpoint: `P04-state-owner-map`.

### Branch B: Pure UI Extraction Candidates

Rules:

- Candidate must be render-only or nearly render-only.
- Candidate must not create a second state owner.
- Props and callbacks must be named.
- Browser smoke gate must be listed.

Candidate row:

```json
{
  "candidate": "",
  "sourceFile": "",
  "targetFile": "",
  "props": [],
  "callbacks": [],
  "stateOwner": "unchanged",
  "risk": 0,
  "testGate": "",
  "rollbackSignal": ""
}
```

Checkpoint: `P04-pure-ui-candidates`.

### Branch C: Hook And Domain Boundary Candidates

Rules:

- Hooks may read state before they write state.
- Domain services must own logic, not UI.
- Store mutations must remain traceable.
- Sync triggers must not move accidentally.

Checkpoint: `P04-hook-domain-candidates`.

## Phase 3: Collision Possibility Exploration

Required collisions:

- extracted hook becomes second state owner
- render component starts mutating global store
- sync trigger moves away from mutation source
- generated history UI loses durable backend link
- graph UI and workflow runtime disagree on node status
- auth/provider setting extraction leaks secret to browser persistence

Checkpoint: `P04-modularization-collision-map`.

## Phase 4: Suspicion Possibility Exploration

Create at least 15 suspicion questions:

- 5 state ownership suspicions
- 5 UI behavior closure suspicions
- 5 test coverage or rollback suspicions

Each suspicion must include a falsification probe.

Checkpoint: `P04-suspicion-questions`.

## Phase 5: Extraction Blueprint

Produce three waves:

1. Pure UI components.
2. Selector/read hooks and local UI hooks.
3. Domain services and store action wrappers.

Each extraction item must include:

- exact current owner
- target owner
- prop/callback boundary
- test gate
- browser smoke gate
- rollback signal
- risk score

## Completion Gate

Complete only when no extraction recommendation can move state ownership without
a named owner map and rollback signal.
