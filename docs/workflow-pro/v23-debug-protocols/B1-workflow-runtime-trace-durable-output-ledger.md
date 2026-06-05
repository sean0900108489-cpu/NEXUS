# B1 Workflow Runtime Trace And Durable Output Ledger

## Purpose

Verify that workflow runtime execution, trace events, generated outputs, group
records, and message/artifact joins form a durable ledger that can be replayed
without browser-local state.

Score target: 92 / 100.

## Execution Phases

1. Inventory Runtime Lite, Workflow Pro, graph brain, group records, trace
   client, and generated history code.
2. Map each run from UI action to runtime group, node execution, trace event,
   output id, message/artifact record, and recovery read.
3. Verify persist-before-complete invariants.
4. Verify workflow group identity and trace correlation.
5. Run static output durability scan.
6. Run targeted runtime and workflow-pro tests.
7. Use Supabase read-only checks when available.

## Ledger Matrix

| Run/Group Field | Producer | Local State | Backend Table | Read Path | Test | Verdict |
|---|---|---|---|---|---|---|

## Required Scans

```bash
rg -n "runtime-trace|workflow group|groupId|runId|outputMessageId|taskId|traceId|completeTask|persist|generated history|durable" src scripts supabase
npm run check:output-durability
npm test -- src/lib/workflow-runtime-lite src/lib/workflow-pro src/lib/backend/runtime
```

## Tool Guidance

- Supabase: verify tables, joins, counts, and row shape by lengths/booleans.
- Browser/Chrome: verify run history and generated history UI when safe.
- GitHub/Vercel: use build/check metadata only as supporting evidence.

## API Key Policy

Real provider runtime tests may run when configured. Reports must reference only
request ids, trace ids, counts, hashes, lengths, and statuses, never secrets.

## Evidence Weighting

P0/P1 output ledger findings require W1 plus W2 or W3. End-to-end run replay is
W4 and should be attempted only when safe.

## Contradiction Pass

Check:

- Is any completed state recorded before durable content?
- Is any trace event treated as content storage?
- Is any snapshot treated as an archive?
- Do workflow groups have stable ids across runtime, trace, history, and UI?

## Output Format

```md
# Workflow Runtime Trace And Durable Output Ledger Report
## Scope
## Runtime Topology
## Ledger Matrix
## Persist-Before-Complete Check
## Group Correlation Check
## Backend Evidence
## Test Evidence
## Gaps
## Repair Plan
```

## Completion Gate

Complete only when every generated workflow output has an exact durable record,
an explicit non-durable verdict, or a blocked reason.

## Execution Prompt

```txt
Read docs/workflow-pro/v23-debug-protocols/B1-workflow-runtime-trace-durable-output-ledger.md first.
Audit workflow runtime trace and generated-output durability. Run safe scans,
tests, and read-only backend checks. Produce a ledger report.
```

