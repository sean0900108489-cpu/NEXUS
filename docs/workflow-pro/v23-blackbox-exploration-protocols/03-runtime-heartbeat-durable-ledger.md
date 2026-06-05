# Protocol 03: Runtime Heartbeat Durable Ledger

## Mission

Prove whether long-running workflows are alive, traceable, durable, recoverable,
and understandable to the user. The audit must distinguish true failure from
valid long computation.

Target rigor: 91 / 100.

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
claim that a workflow is alive, durable, recoverable, progressing, or visible in
the UI must satisfy the live evidence gate or be marked `blocked` /
`not-yet-verified`.

Before completion, run:

```bash
node scripts/validate-blackbox-checkpoint.mjs docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>
```

## Black-Box Start Command

```txt
Run a black-box runtime heartbeat and durable ledger audit for /Users/sean/Documents/FreeChat.

Do not assume slow means broken. Do not assume success means durable. Discover
runtime execution, heartbeat, trace, output persistence, generated history, and
recovery behavior from source, tests, safe local probes, and browser checks.

Before the first scan, create an active checkpoint:
docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>/00-active-checkpoint.md

Read the active checkpoint before every phase and branch. If a long task is
observed, update the checkpoint while it runs, not only after it ends. Do not
print or persist secrets.
```

## Checkpoint Loop

Every phase uses this loop:

1. Read `00-active-checkpoint.md`.
2. Record whether the phase is checking liveness, durability, recovery, or UI
   transparency.
3. Run the smallest useful scan/probe.
4. Append runtime events while they happen when observing long tasks.
5. Append inference separately from evidence.
6. Append "true failure vs valid long computation" classification.
7. Write the next command before moving to the next phase.

## Phase 1: Core Exploration

Map the runtime lifecycle:
Read `00-active-checkpoint.md` first and record what will count as alive,
stalled, failed, durable, and unknown for this run.

```bash
rg -n "runId|groupId|nodeId|taskId|traceId|heartbeat|progress|running|success|failed|paused|complete|outputId|artifact|generated history|ContextPacket|runtimeLite" src scripts docs supabase
npm run check:output-durability
```

Core ledger row:

```json
{
  "workflowAction": "",
  "runIdProducer": "",
  "groupIdProducer": "",
  "nodeStatusProducer": "",
  "heartbeatProducer": "",
  "traceProducer": "",
  "outputProducer": "",
  "artifactProducer": "",
  "durableReadPath": "",
  "uiProgressPath": "",
  "recoveryPath": "",
  "evidence": []
}
```

Checkpoint: `P03-core-runtime-ledger`.

## Phase 2: Detail Exploration Branches

### Branch A: Long Task Transparency

Questions:

- Can the UI show active node and completed node count?
- Can a user tell the difference between thinking, queued, generating, saving,
  and stalled?
- Is there a heartbeat or equivalent progress event?

Probe:

```bash
rg -n "progress|heartbeat|activeNode|completedNodes|totalNodes|running|waiting|queued|generating|saving|stalled|pause|resume" src/components src/lib src/app
```

Checkpoint: `P03-long-task-transparency`.

### Branch B: Durable Output Authority

Questions:

- Is output persisted before completion is reported?
- Is generated media stored as a durable asset rather than only a browser preview?
- Can history be reconstructed without current browser local state?

Probe:

```bash
rg -n "persist.*before|completeTask|outputMessageId|message.*upsert|artifact.*create|asset.*storage|history.*hydrate|download|archive" src/lib src/app scripts supabase
```

Checkpoint: `P03-durable-output-authority`.

### Branch C: Replay And Recovery

Questions:

- Can a run be replayed by id?
- Can a generated output be recovered after reload?
- Can failed node state be tied to provider, permission, storage, or runtime layer?

Probe:

```bash
rg -n "recover|replay|retry|archive|versions|references|runtime-trace|observability|metrics|events|run history|group record" src/app src/lib scripts docs
```

Checkpoint: `P03-replay-recovery`.

## Phase 3: Collision Possibility Exploration

Collision classes:

- node UI says success before durable write
- trace event exists but output content missing
- generated preview exists but artifact retrieval fails
- workflow group exists but run history cannot join it
- provider response succeeded but storage materialization failed
- browser local history hides missing backend record

Checkpoint: `P03-runtime-collision-map`.

## Phase 4: Suspicion Possibility Exploration

Generate at least 12 falsifiable suspicions:

| Suspicion | Layer | Evidence Needed | Probe | User Impact If True |
|---|---|---|---|---|

At least 4 must involve long-running workflows. At least 4 must involve durable
outputs. At least 4 must involve generated media.

Checkpoint: `P03-suspicion-list`.

## Phase 5: Optional Live Probe

If safe and explicitly scoped, operate the UI to run a small workflow and record:

- time to first visible progress
- node state transitions
- generated output id
- durable read path
- reload recovery behavior

Do not use destructive payloads.

## Completion Gate

Complete only when the final report can answer:

- Is the workflow alive?
- Which node is active?
- What evidence proves progress?
- What evidence proves durable output?
- What evidence proves recovery?
- What remains unknown?
