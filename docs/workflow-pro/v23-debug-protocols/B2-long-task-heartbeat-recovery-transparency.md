# B2 Long Task Heartbeat And Recovery Transparency Protocol

## Purpose

Audit long-running workflow behavior: heartbeat, progress, stall detection,
retry, cancellation, recovery messaging, and user-visible transparency.

Score target: 90 / 100.

## Core Questions

- Can the user see whether a long workflow is alive, stalled, failed, or queued?
- Can the backend prove heartbeat/progress without storing secrets?
- Can failed or interrupted work be retried or recovered?

## Execution Phases

1. Inventory streaming, runtime, image generation, tool execution, and workflow
   trace routes.
2. Map status states: queued, running, first-token, heartbeat, stalled, retrying,
   failed, completed, cancelled.
3. Trace UI display for each state.
4. Trace backend event or metric evidence for each state.
5. Verify retry/cancel/resync controls.
6. Run targeted runtime, sync, and observability tests.
7. Produce a transparency matrix.

## Transparency Matrix

| Operation | Status State | UI Signal | Backend Signal | Retry/Cancel | Recovery Guidance | Verdict |
|---|---|---|---|---|---|---|

## Required Scans

```bash
rg -n "heartbeat|keep-alive|first_token|stream_completed|retry|cancel|stalled|timeout|syncing|queued|failed|interrupted|resync" src scripts
npm test -- src/lib/backend/observability src/lib/backend/runtime src/lib/backend/sync src/lib/workflow-runtime-lite
```

## Tool Guidance

- Browser/Chrome: verify long task UI states when safe.
- Supabase: verify event/metric shape, not raw payload content.
- Vercel: inspect runtime logs only when debugging deployment behavior.

## API Key Policy

Real long-running provider tests may run when configured and cost limits are
accepted. Reports must not include secret values or raw sensitive prompts.

## Evidence Weighting

- W1 status state code proof
- W2 tests for retry/cancel/stall
- W3 event/metric counts
- W4 browser run observation

## Contradiction Pass

Check:

- Does UI say done when backend only says queued?
- Does backend say completed without durable output proof?
- Is stalled distinguishable from slow?
- Can the user recover from each failure mode?

## Output Format

```md
# Long Task Heartbeat And Recovery Transparency Report
## Scope
## Operation Inventory
## Transparency Matrix
## Event And Metric Evidence
## UI Evidence
## Recovery Gaps
## Repair Plan
## Test Gates
```

## Completion Gate

Complete only when every long-running operation has a status lifecycle and a
user-visible recovery story.

## Execution Prompt

```txt
Read docs/workflow-pro/v23-debug-protocols/B2-long-task-heartbeat-recovery-transparency.md first.
Audit long-running workflow transparency, heartbeat, stall detection, and
recovery. Use safe tools and produce the required report.
```

