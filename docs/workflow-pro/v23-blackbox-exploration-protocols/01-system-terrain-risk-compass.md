# Protocol 01: System Terrain Risk Compass

## Mission

Build a neutral, first-principles map of the project before any targeted audit
or refactor. The agent must discover the architecture, high-risk surfaces,
runtime flows, and unknowns without being told the current suspected issue.

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
claim that a user-visible behavior works must satisfy the live evidence gate or
be marked `blocked` / `not-yet-verified`.

Before completion, run:

```bash
node scripts/validate-blackbox-checkpoint.mjs docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>
```

## Black-Box Start Command

```txt
You are performing a black-box system terrain audit for /Users/sean/Documents/FreeChat.

Do not rely on prior chat context, old reports, or known findings. Discover the
system shape from the repository, scripts, tests, safe local probes, and
available tools.

Before the first scan, create an active checkpoint:
docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>/00-active-checkpoint.md

Use this template:
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoint-template.md

Read the active checkpoint before every phase and branch. Append new evidence
as soon as it changes the risk map; do not wait for the final report.

Do not edit code. Do not print, persist, or copy secret values.
```

## Checkpoint Loop

Every phase uses this loop:

1. Read `00-active-checkpoint.md`.
2. Write the phase objective and the next falsification probe.
3. Run only the smallest useful scan/probe.
4. Append new evidence immediately.
5. Append inference separately from evidence.
6. Append contradictions and unresolved questions.
7. Write the next command before moving to the next phase.

## Phase 1: Core Exploration

Goal: identify the project surfaces without interpreting them too early.
Read `00-active-checkpoint.md` before running the first command, then record the
initial scope and first probe.

Run or inspect:

```bash
pwd
git status --short
find . -maxdepth 3 -name AGENTS.md -o -name package.json -o -name next.config.* -o -name vercel.json -o -name supabase
node -e "const p=require('./package.json'); console.log(JSON.stringify({scripts:p.scripts,dependencies:Object.keys(p.dependencies||{}),devDependencies:Object.keys(p.devDependencies||{})},null,2))"
find src/app/api -name route.ts | sort
find src -maxdepth 3 -type f | sed 's#^\./##' | sort | head -300
```

Checkpoint: `P01-core-terrain`.

## Phase 2: Detail Exploration Branches

Run these branches independently. Before each branch, read
`00-active-checkpoint.md`; each branch must append a checkpoint update before
continuing.

### Branch A: Runtime And Workflow Surfaces

```bash
rg -n "workflow|runtime|runId|groupId|traceId|ContextPacket|output|artifact|history" src scripts docs supabase
```

Deliverable: workflow surface map with producers, consumers, persistence, and
missing evidence.

### Branch B: API And Authority Surfaces

```bash
rg -n "Authorization|auth|required|getUser|getSession|permission|workspaceId|resourceId|audit|service_role|requestScoped|cookie" src/app src/lib scripts
```

Deliverable: route authority overview, without claiming a bug until evidence
links route -> identity -> workspace -> resource -> action.

### Branch C: Frontend State And File Pressure

```bash
wc -l src/components/nexus/*.tsx src/components/nexus/workflow-pro/*.tsx src/store/*.ts 2>/dev/null
rg -n "useState|useMemo|useCallback|useNexusStore|set\\(|get\\(|persist|sync|queue|artifact|brain|workflow" src/components/nexus src/store src/lib
```

Deliverable: state owner candidates and large-surface pressure map.

## Phase 3: Collision Possibility Exploration

Search for places where two valid subsystems may collide.

Collision classes:

- local state vs backend state
- generated artifact vs preview artifact
- Supabase auth vs provider runtime credentials
- long-running task vs user-visible completion state
- read-only workspace vs mutation UI
- route-level permission vs storage-level permission

Command:

```bash
rg -n "fallback|mock|local|production|VERCEL_ENV|NODE_ENV|complete|success|failed|denied|unauthorized|Permission|storage|bucket|download|preview" src scripts supabase
```

Checkpoint: `P01-collision-map`.

## Phase 4: Suspicion Possibility Exploration

The agent must generate suspicion questions that are not yet findings.

Required format:

| Suspicion | Why It Could Exist | Evidence Needed | Probe | Severity If True |
|---|---|---|---|---|

At least 12 suspicions are required. At least 4 must be about authority, 4 about
runtime durability, and 4 about frontend/state ownership.

Checkpoint: `P01-suspicion-map`.

## Phase 5: Synthesis

Produce:

- architecture terrain map
- top 10 risk surfaces
- top 10 unknowns
- three recommended next protocols
- checkpoint bundle index
- do-not-touch list for risky refactors

## Completion Gate

Complete only when every major surface has at least one evidence item, one
unknown, and one recommended next probe.
