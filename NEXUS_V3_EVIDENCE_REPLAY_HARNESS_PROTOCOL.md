# NEXUS V3 Evidence Replay Harness Protocol

## 0. Positioning

This document is Candidate B for a V3 enterprise audit protocol. It is optimized
for replayability: every conclusion must be backed by a command, query, line
reference, browser step, or test result that another agent can repeat.

Baseline:

- V2 reference score: 75 / 100.
- V3 target band: 95 to 99 / 100.
- Primary strength: evidence ledger, exact commands, replay packets, and
  confidence discipline.

Do not rely on prior chat context, prior audit results, or any known operational
history. This protocol must generate a self-contained audit package.

---

## 1. Evidence Quality Bar

The audit must produce both a human report and a replay ledger.

Evidence levels:

| Level | Name | Accepted Evidence |
|---|---|---|
| E0 | Lead | search result only |
| E1 | Static proof | line-level code or migration reference |
| E2 | Test proof | exact command plus result summary |
| E3 | Live proof | SQL/schema/log count or boolean check |
| E4 | Browser proof | UI step or storage inspection with screenshot/summary |
| E5 | Full replay | clean sequence that reproduces the claim end-to-end |

Score target:

- 88: all major claims have E1.
- 92: P0/P1 claims have E1 plus E2 or E3.
- 95: P0/P1 claims have replay commands and exact outputs summarized.
- 98: core flows have E5 and can be repeated without local memory.
- 100: all high-risk flows are replayed across UI, backend, storage, and tests.

---

## 2. Replay Ledger Format

Every non-trivial claim must create a ledger row:

| Claim ID | Claim | Command/Query/Step | Scope | Expected Signal | Observed Signal | Evidence Level | Confidence |
|---|---|---|---|---|---|---|---|

Rules:

- Use stable claim IDs such as `CAP-001`, `DATA-004`, `SCHEMA-002`.
- Do not paste full sensitive content.
- Prefer counts, booleans, lengths, hashes, timestamps, ids, and schema facts.
- If a command is blocked, record the blocker and fallback evidence.
- If a line reference changes during local edits, rerun the reference check.

---

## 3. Audit Workflow

### Phase 0: Create Run Header

Record:

- date and timezone
- repository path
- git branch
- dirty status summary
- package manager
- test commands discovered
- available tools
- unavailable tools

### Phase 1: Read Instructions

Read:

- this protocol
- `AGENTS.md`
- package scripts
- framework-specific local docs when required by project instructions

Record the instructions that affect the audit.

### Phase 2: Build Command Catalog

Create command groups before running broad scans.

```bash
rg --files src supabase scripts
rg -n "export async function (GET|POST|PUT|PATCH|DELETE)|NextRequest|NextResponse" src/app
rg -n "button|Button|onClick|onSubmit|aria-label|title=|role=|href=|Tabs|Dialog|Dropdown|Select" src
rg -n "cursor-pointer|hover:|active:|focus:|disabled:|aria-disabled|pointer-events-none|data-state" src
rg -n "persist\\(|indexedDB|localStorage|idb-keyval|createJSONStorage" src
rg -n "messages|artifacts|notebooks|prompts|workspace_snapshots|sync_operations|agent_tasks|agent_runtime_events|tool_runs" src supabase
rg -n "compact|truncate|redact|sanitize|preview|contentLength|output_message_id|source_message_id|content_url" src supabase
```

Do not treat command catalog output as proof until nearby code is read.

### Phase 3: Build Capability Ledger

For each surface:

1. Find the visible affordance.
2. Find the handler.
3. Find the store/action/service.
4. Find backend or runtime path.
5. Find persistence or recovery path.
6. Find tests.
7. Create a ledger row.

Capability verdicts:

- `closed`
- `closed-local-only`
- `closed-no-durable-output`
- `lifecycle-only`
- `pointer-only`
- `false-affordance`
- `excluded`
- `unknown`

### Phase 4: Build Data Ledger

For each data asset:

1. Identify producer.
2. Identify runtime field.
3. Identify local storage.
4. Identify sync payload.
5. Identify backend write.
6. Identify backend read/recovery.
7. Identify overwrite path.
8. Identify tests.
9. Create ledger row.

Data verdicts:

- `backend-exact`
- `backend-preview`
- `backend-pointer`
- `backend-lifecycle`
- `local-exact`
- `not-recoverable`
- `unknown`

### Phase 5: Generate Replay Plan

The replay plan must include:

- exact shell commands
- exact test commands
- exact SQL templates with parameters
- browser steps if available
- files to inspect
- success/failure signals
- expected report sections affected by each check

### Phase 6: Execute Replay Plan

Run safe checks. For each:

- capture exit code
- summarize important output
- update ledger
- downgrade confidence when checks are blocked

Do not end with unexecuted planned checks unless they are explicitly marked
blocked.

### Phase 7: Cross-Check Claims

Before finalizing, run a contradiction pass:

- Does any "durable" verdict rely only on a snapshot?
- Does any "functional" verdict lack a handler?
- Does any "closed" verdict lack recovery proof when recovery is expected?
- Does any P0/P1 claim lack E1 plus E2/E3/E4?
- Are live row windows narrow enough for event/task claims?
- Are schema checks separated from time-windowed event checks?
- Are line references valid?

---

## 4. SQL Replay Templates

### Output Pointer Join

```sql
select
  t.task_type,
  count(*) as task_count,
  count(*) filter (where t.status = 'completed') as completed_count,
  count(*) filter (
    where t.status = 'completed'
      and t.output_message_id is not null
  ) as completed_with_output_pointer,
  count(*) filter (
    where t.status = 'completed'
      and t.output_message_id is not null
      and length(coalesce(m.content, '')) > 0
  ) as completed_with_nonempty_message,
  count(*) filter (
    where t.output_message_id like 'run_%:%:output'
  ) as workflow_like_output_pointer
from public.agent_tasks t
left join public.messages m on m.id = t.output_message_id
where t.workspace_id = :workspace_id
  and t.created_at between :start_utc and :end_utc
group by t.task_type
order by t.task_type;
```

### Snapshot Shape

```sql
select
  count(*) as snapshot_count,
  bool_or(payload::text like '%"outputSnapshot"%') as has_output_snapshot,
  bool_or(payload::text like '%"rawText"%') as has_raw_text,
  bool_or(payload::text like '%"truncated":true%') as has_truncated_packet,
  min(payload_size_bytes) as min_payload_size_bytes,
  max(payload_size_bytes) as max_payload_size_bytes
from public.workspace_snapshots
where workspace_id = :workspace_id
  and updated_at between :start_utc and :end_utc;
```

### Live Schema Contract

```sql
select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'messages',
    'agent_tasks',
    'agent_runtime_events',
    'workspace_snapshots',
    'sync_operations',
    'artifacts',
    'notebooks',
    'prompts',
    'tool_runs'
  )
order by table_name, ordinal_position;
```

---

## 5. Test Replay Rules

For every test command:

```txt
Command:
Scope:
Exit code:
Passed:
Failed:
Failure summary:
Affected claims:
```

Use targeted tests first, then broader tests if runtime permits.

Suggested discovery:

```bash
cat package.json
rg -n "describe\\(|it\\(|test\\(" src
```

Suggested targets:

- workspace recovery
- sync queue
- workflow runtime
- message history
- artifacts
- notebooks
- prompts
- store actions

---

## 6. Required Report Format

```md
# NEXUS Evidence Replay Audit

## 1. Scope And Run Header
## 2. Scorecard
## 3. Instruction Constraints
## 4. Replay Plan
## 5. Project Topology
## 6. Capability Ledger
## 7. Data Asset Ledger
## 8. SQL Evidence
## 9. Browser/Local Evidence
## 10. Test Evidence
## 11. Evidence Matrix
## 12. Contradiction Pass
## 13. Risk Register
## 14. Repair Plan
## 15. Replay Appendix
## 16. Untested Or Blocked Boundaries
## 17. Per-Asset And Per-Capability Verdicts
## 18. Final Verdict
```

The final verdict must not be broader than the evidence. If asset classes differ,
summarize them separately.

---

## 7. Execution Prompt

```txt
Read NEXUS_V3_EVIDENCE_REPLAY_HARNESS_PROTOCOL.md first.

Run a replayable audit of /Users/sean/Documents/FreeChat for functional-closure
and generated-output record-storage risks. Do not rely on prior conversation
context.

Create a run header, command catalog, capability ledger, data asset ledger, and
replay plan. Execute safe checks and record exact commands, queries, result
summaries, evidence levels, and confidence.

Use line-level references for static claims, count/boolean SQL for live backend
claims when Supabase is available, and targeted test commands for W2/E2 claims.

Before finalizing, run a contradiction pass to ensure no durable/closed verdict
is broader than the evidence.

Return the report in the required format and include a replay appendix.
```

---

## 8. Completion Gate

The audit is complete only when:

- every high-severity claim has a ledger row
- every ledger row has evidence level and confidence
- every live backend claim includes query scope
- every test claim includes exact command and result summary
- every false-affordance claim includes visible surface and handler evidence
- every durable verdict includes a recovery/read path
- every blocked check is marked blocked, not silently omitted
