# Shared Checkpoint Template

Use this template at the start of the run and after every meaningful exploration
update. The checkpoint is a living work memory, not a final appendix. The next
phase must read it before doing new work.

Create this first:

```txt
docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>/00-active-checkpoint.md
```

Then keep appending to it. If a branch grows large, split details into
`branch-<id>.md` and keep the active checkpoint as the current summary.
Every meaningful update must also append one JSON line to `events.ndjson` using
`events.schema.json`.

```md
# Checkpoint: <protocol-id> / <branch-id> / <timestamp>

## Scope

- Repository:
- Branch:
- Environment:
- Tools used:
- Current command round:
- Active checkpoint path:
- Branch checkpoint path:
- Last checkpoint read at:
- Next checkpoint update trigger:

## Initial Operating Assumptions

- Assumption:
- Why it is unproven:
- First falsification probe:

## Evidence Collected

| Evidence ID | Source | Method | Confidence | Notes |
|---|---|---|---:|---|
| E001 | file/path.ts:line | static read | 0.80 | ... |

## Inferences

| Inference ID | Based On | Claim | Confidence | Can Be Falsified By |
|---|---|---|---:|---|
| I001 | E001,E002 | ... | 0.65 | ... |

## Branch State

- Core exploration status:
- Detail branch status:
- Collision branch status:
- Suspicion branch status:
- Remaining unknowns:
- Last completed command:
- Next command:

## Event Log Mirror

- events.ndjson path:
- Last event id:
- Last checkpoint.created event:
- Last checkpoint.read event:
- Last phase.started event:
- Last evidence.added event:
- Last live_evidence.added event:
- Last verdict.added event:
- Mandatory live evidence:
- Mandatory Computer Use evidence:

## Contradictions

| Contradiction | Evidence A | Evidence B | Current Interpretation | Next Probe |
|---|---|---|---|---|

## Risk Register

| Risk | Severity | Likelihood | Blast Radius | Evidence | Next Action |
|---|---:|---:|---|---|---|

## Open Questions

1.
2.
3.

## Next Command

```txt
Continue from this checkpoint. Do not assume any unproven prior conclusion.
Run the next smallest probe that can falsify or confirm the highest-risk
inference.
```
```

## Required Event Examples

Create the first event before scanning:

```json
{"schema":"nexus.workflowPro.blackbox.event.v1","runId":"<run-id>","eventId":"E0001","timestamp":"<iso>","protocolId":"P01","eventType":"checkpoint.created","summary":"Created active checkpoint before first scan.","secretRedactionStatus":"checked","checkpointPath":"docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>/00-active-checkpoint.md"}
```

Read the checkpoint before each phase:

```json
{"schema":"nexus.workflowPro.blackbox.event.v1","runId":"<run-id>","eventId":"E0002","timestamp":"<iso>","protocolId":"P01","phaseId":"P01-core","eventType":"checkpoint.read","summary":"Read active checkpoint before starting core exploration.","secretRedactionStatus":"checked","checkpointPath":"docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>/00-active-checkpoint.md"}
```

Start the phase only after recording the read:

```json
{"schema":"nexus.workflowPro.blackbox.event.v1","runId":"<run-id>","eventId":"E0003","timestamp":"<iso>","protocolId":"P01","phaseId":"P01-core","eventType":"phase.started","summary":"Started core terrain scan.","secretRedactionStatus":"checked","checkpointReadEventId":"E0002"}
```

Add live evidence before any live verdict:

```json
{"schema":"nexus.workflowPro.blackbox.event.v1","runId":"<run-id>","eventId":"E0010","timestamp":"<iso>","protocolId":"P03","phaseId":"P03-live","eventType":"live_evidence.added","summary":"Observed workflow progress in browser.","secretRedactionStatus":"checked","evidence":{"evidenceId":"LE001","method":"browser_live","sourceRefs":["Browser: localhost workflow run"],"confidence":0.9,"sanitizedResult":"Visible node progress changed from queued to generating."}}
```

For final UI/workflow usability verdicts, prefer Computer Use evidence:

```json
{"schema":"nexus.workflowPro.blackbox.event.v1","runId":"<run-id>","eventId":"E0011","timestamp":"<iso>","protocolId":"P03","phaseId":"P03-live","eventType":"live_evidence.added","summary":"Operated the visible workflow UI with Computer Use.","secretRedactionStatus":"checked","evidence":{"evidenceId":"LE-CU-001","method":"computer_use_live","sourceRefs":["Computer Use: localhost Workflow Pro run"],"confidence":0.95,"sanitizedResult":"Opened Workflow Pro, pasted JSON, ran workflow, observed node progress and final output."}}
```

## Checkpoint Quality Gate

- The first checkpoint must exist before the first scan.
- `events.ndjson` must exist and its first event must be `checkpoint.created`.
- Each phase must start by reading the active checkpoint.
- Each `phase.started` event must reference a prior `checkpoint.read` event.
- A checkpoint must include at least one concrete evidence item or explicitly
  say that no evidence was available.
- Each completed phase must have `evidence.added`, `live_evidence.added`, or
  `no_evidence_available` in `events.ndjson`.
- A checkpoint must not contain raw secrets.
- A checkpoint must not collapse inference into fact.
- A checkpoint must include the next falsification probe.
- A live verdict must reference a prior `live_evidence.added` event.
- A final UI/workflow usability verdict must reference a prior
  `computer_use_live` event, unless explicitly blocked.
- A final report without an earlier active checkpoint is invalid.
- Run `node scripts/validate-blackbox-checkpoint.mjs <run-dir>` before treating
  the run as complete.
