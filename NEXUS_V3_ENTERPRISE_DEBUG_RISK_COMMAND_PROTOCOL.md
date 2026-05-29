# NEXUS V3 Enterprise Debug Risk Command Protocol

## 0. Positioning

This document is Candidate C for a V3 enterprise audit protocol. It is optimized
for enterprise debugging operations: triage, blast-radius control, risk ranking,
repair sequencing, and release-readiness decisions.

Baseline:

- V2 reference score: 75 / 100.
- V3 target band: 92 to 96 / 100.
- Primary strength: executive-level clarity plus engineering-grade evidence.

Do not rely on prior chat context, prior audit results, or any known operational
history. The report must stand alone.

---

## 1. Operating Model

The audit is run as a command loop:

```txt
discover
-> classify
-> verify
-> rank
-> repair-design
-> test-design
-> release-gate
```

Each finding must answer:

- What user capability or data asset is affected?
- What is the failure mode?
- What is the blast radius?
- What evidence proves it?
- What would make it safe?
- What test would prevent recurrence?

---

## 2. Enterprise Scorecard

| Dimension | Points | Description |
|---|---:|---|
| Surface coverage | 15 | all user-visible and implied capabilities inventoried |
| System boundary coverage | 12 | frontend, local state, sync, API, backend, DB, recovery |
| Evidence quality | 15 | line refs, commands, SQL counts, tests, browser checks when safe |
| Risk classification | 12 | severity, blast radius, exploit/loss path, confidence |
| Repair usability | 12 | ordered repair plan, migration notes, test plan |
| Replayability | 10 | exact commands/queries and blocked checks |
| Release gating | 10 | clear pass/fail gates for deployment readiness |
| Security/privacy discipline | 8 | secret-safe checks and content minimization |
| Report clarity | 6 | concise executive summary plus technical appendix |

Scoring target:

- 88+: useful engineering audit.
- 92+: enterprise triage quality.
- 95+: release-gate quality.
- 98+: release-gate quality plus full replay harness and browser/backend proof.

---

## 3. Severity And Blast Radius

Severity:

- P0: core generated output or core user action can be lost, misreported,
  unrecoverable, or falsely marked successful.
- P1: important workflow has local-only, pointer-only, schema-drifted, or
  recovery-incomplete behavior.
- P2: non-core workflow works partially, lacks test proof, or has confusing UI
  status.
- P3: naming, metadata, documentation, or low-impact affordance issue.

Blast radius:

- single control
- single asset type
- workflow graph
- chat/runtime system
- recovery system
- storage/schema layer
- whole workspace
- multi-user/project

Confidence:

- High: W1 plus W2/W3/W4.
- Medium: W1 only or W0 plus partial validation.
- Low: search lead or inferred path only.

---

## 4. Debug Phases

### Phase 0: Preflight

Collect:

- repo path
- branch and dirty summary
- package scripts
- app framework constraints
- available connectors
- no-secret boundary
- destructive action boundary

### Phase 1: Capability Discovery

Run a front-to-back sweep.

```bash
rg -n "button|Button|onClick|onSubmit|onKeyDown|aria-label|title=|role=|href=|Dialog|Dropdown|Popover|Tabs|Select|input|textarea" src
rg -n "cursor-pointer|hover:|active:|focus:|disabled:|aria-disabled|pointer-events-none|data-state|data-disabled" src
rg -n "run|start|stop|retry|rerun|save|create|new|delete|archive|copy|export|import|download|upload|sync|recover|restore" src
```

Create:

| Capability | User Surface | Owner File | Handler | Expected Effect | Business Criticality |
|---|---|---|---|---|---|

### Phase 2: Backend And Data Discovery

Run:

```bash
rg -n "workspace_snapshots|sync_operations|messages|artifacts|notebooks|prompts|agent_tasks|agent_runtime_events|tool_runs" src supabase
rg -n "output_message_id|source_message_id|content_url|content_text|rawText|displayText|outputSnapshot|inputSnapshot" src supabase
rg -n "compact|truncate|sanitize|redact|preview|contentLength|payload_size|payloadSize" src supabase
```

Create:

| Asset | Producer | Local Source | Backend Source | Recovery Source | Authority |
|---|---|---|---|---|---|

### Phase 3: Closure Verification

For each critical capability:

```txt
surface
-> handler
-> state mutation
-> local persistence
-> sync/API/runtime
-> repository
-> durable record
-> recovery/read
-> test
```

Classify:

- `release-safe`
- `needs-test`
- `needs-backend-proof`
- `needs-recovery-proof`
- `local-only`
- `pointer-only`
- `false-affordance`
- `blocked`

### Phase 4: Live Service Verification

If Supabase is available:

- verify schema contract
- verify task/message joins
- verify snapshot shape
- verify sync operation status versus domain writes
- verify artifact/blob retrievability by metadata only unless content access is
  explicitly safe

If Vercel is available:

- inspect deployment status and build/runtime logs only when relevant to the
  audited capability
- do not treat deployment success as functional closure

If GitHub is available:

- inspect CI/test status only when relevant to release gating
- do not treat CI green as data durability proof

If browser access is available:

- verify core visible controls
- inspect console/runtime errors
- inspect storage only under no-secret rules
- use screenshots or textual summaries

### Phase 5: Risk Command Table

Every finding must fit this table:

| ID | Severity | Capability/Asset | Blast Radius | Failure Mode | Evidence | Confidence | Release Gate |
|---|---|---|---|---|---|---|---|

Release gate values:

- `block-release`
- `allow-with-warning`
- `allow-with-test-debt`
- `informational`

### Phase 6: Repair Sequencing

Order repairs by:

1. prevents irreversible data loss
2. fixes false success or false durability
3. restores recovery path
4. resolves schema drift
5. removes false affordance
6. adds tests and alerts
7. improves UX clarity

Output:

| Order | Repair | Why Now | Files/Tables | Test Gate |
|---|---|---|---|---|

---

## 5. Enterprise Verification Templates

### Schema Contract Check

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

### Task Content Integrity Check

```sql
select
  t.task_type,
  count(*) as task_count,
  count(*) filter (where t.status = 'completed') as completed_count,
  count(*) filter (
    where t.status = 'completed'
      and t.output_message_id is not null
  ) as completed_with_pointer,
  count(*) filter (
    where t.status = 'completed'
      and length(coalesce(m.content, '')) > 0
  ) as completed_with_content
from public.agent_tasks t
left join public.messages m on m.id = t.output_message_id
where t.workspace_id = :workspace_id
  and t.created_at between :start_utc and :end_utc
group by t.task_type
order by t.task_type;
```

### Snapshot Archive Suitability

```sql
select
  count(*) as snapshot_count,
  bool_or(payload::text like '%"messages"%') as has_messages_key,
  bool_or(payload::text like '%"messageRefs"%') as has_message_refs,
  bool_or(payload::text like '%"rawText"%') as has_raw_text,
  bool_or(payload::text like '%"truncated":true%') as has_truncated_packet,
  min(payload_size_bytes) as min_payload_size_bytes,
  max(payload_size_bytes) as max_payload_size_bytes
from public.workspace_snapshots
where workspace_id = :workspace_id
  and updated_at between :start_utc and :end_utc;
```

---

## 6. Report Format

```md
# NEXUS Enterprise Debug Risk Command Report

## 1. Executive Summary
## 2. Scope And Preflight
## 3. Scorecard
## 4. Capability Discovery
## 5. Data Authority Map
## 6. Closure Verification
## 7. Live Service Verification
## 8. Risk Command Table
## 9. Release Gates
## 10. Repair Sequencing
## 11. Test Gates
## 12. Evidence Appendix
## 13. Blocked Or Untested Boundaries
## 14. Final Release Readiness Verdict
```

Executive summary rules:

- State the top 3 risks only.
- State whether release should be blocked, warned, or allowed.
- Do not overstate evidence.
- Keep detailed proof in the appendix.

---

## 7. Test Gate Matrix

| Gate | Required Test |
|---|---|
| Functional closure | UI/action or store/API integration proves action effect |
| Generated output durability | exact output recoverable from backend after local state unavailable |
| Task content integrity | completed output-producing task resolves to content |
| Snapshot recovery | recovery does not claim archive semantics unless content is exact |
| Artifact durability | inline or blob content is retrievable and hash-matched |
| Schema parity | live schema matches repository/generated type contract |
| False affordance prevention | visible enabled controls have real handlers or are disabled/hidden |

---

## 8. Execution Prompt

```txt
Read NEXUS_V3_ENTERPRISE_DEBUG_RISK_COMMAND_PROTOCOL.md first.

Run an enterprise debug-risk audit of /Users/sean/Documents/FreeChat. Do not rely
on prior conversation context.

Discover capabilities from UI surfaces, handlers, CSS affordance states, stores,
API routes, repositories, migrations, and tests. Map data authority for every
generated or user-authored asset. Verify closure and durability with static
evidence, live schema/count checks when available, targeted tests, and browser
checks when safe.

Rank findings by severity, blast radius, confidence, and release-gate impact.
Produce repair sequencing and test gates. Return the report in the required
format.
```

---

## 9. Completion Gate

The audit is complete only when:

- release gate is explicit
- every high-risk item has blast radius and confidence
- every release-blocking claim has replayable evidence
- every repair has a test gate
- every untested boundary is listed
- final readiness verdict is scoped to proven evidence
