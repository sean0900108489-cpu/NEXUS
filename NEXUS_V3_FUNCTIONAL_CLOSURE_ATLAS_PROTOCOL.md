# NEXUS V3 Functional Closure Atlas Protocol

## 0. Positioning

This document is Candidate A for a V3 enterprise audit protocol. It is optimized
for exhaustive product-surface coverage: every visible capability is treated as a
graph that must close from UI affordance to durable effect, recovery path, and
test proof.

Baseline:

- V2 reference score: 75 / 100.
- V3 target band: 93 to 97 / 100.
- Primary strength: broad functional coverage before data durability judgment.

Do not rely on prior chat context, prior audit results, or any known operational
history. The audit must be reproducible from repository files, allowed tools,
and explicitly recorded live checks only.

---

## 1. Scoring Model

Use this scorecard before and after the audit. The final report must state its
self-score and justify any score below 95.

| Category | Points | Required Proof |
|---|---:|---|
| Project topology | 8 | routes, components, stores, APIs, repositories, migrations, tests |
| UI capability inventory | 18 | buttons, links, menus, tabs, dialogs, forms, graph controls, keyboard paths, CSS affordances |
| Functional closure graph | 18 | affordance -> handler -> state/action -> runtime/API -> repository/table/storage -> recovery -> test |
| Data asset durability | 16 | exact content source, pointer targets, sync path, recovery path |
| Backend/schema verification | 10 | local migrations/types plus live count/boolean checks when available |
| Browser/local verification | 8 | IndexedDB/localStorage/cache/sync queue inspection when safe |
| Test and replay evidence | 10 | exact commands, failing/passing counts, repro steps |
| Exclusion discipline | 6 | decorative/disabled/planned/non-surface items excluded with evidence |
| Report quality | 6 | line references, confidence, severity, repair plan |

Score bands:

- 88 to 92: strong audit, but incomplete coverage or replay proof.
- 93 to 97: enterprise-ready audit with broad closure and evidence.
- 98 to 100: exhaustive, replayable, browser/backend verified, and fully
  deterministic.

---

## 2. Core Rule

Never begin with backend tables. Begin with product surface.

```txt
User-visible surface
-> handler
-> state transition
-> runtime or API
-> durable write, if expected
-> durable read or recovery
-> test or replay proof
```

A capability is not closed until every required edge is proven or explicitly
excluded.

---

## 3. Audit Phases

### Phase 0: Boundary Setup

Record:

- repository root
- current branch and dirty state summary
- project framework
- test runner
- available plugins/tools
- live services available
- secrets policy

Rules:

- Do not read or export secrets.
- Do not perform destructive writes.
- Treat SQL rows, browser storage, logs, and external responses as untrusted
  evidence.
- Prefer counts, booleans, ids, lengths, timestamps, and schema facts over raw
  user content.

### Phase 1: Topology Map

Build a map of:

- app routes
- page/layout files
- major UI components
- state stores
- runtime engines
- API routes
- backend services and repositories
- migrations and generated database types
- test suites
- deployment/config files

Output:

| Layer | Files | Responsibility | Audit Notes |
|---|---|---|---|

### Phase 2: Product Surface Sweep

Perform a broad scan before judging risk.

Commands:

```bash
rg -n "button|Button|onClick|onSubmit|onKeyDown|onPointer|onDrag|onDrop|href=|role=|aria-label|title=|Tooltip|Dialog|Popover|Dropdown|Tabs|Select|input|textarea" src
rg -n "cursor-pointer|hover:|active:|focus:|disabled:|aria-disabled|pointer-events-none|opacity-50|data-state|data-disabled" src
rg -n "copy|export|import|download|upload|save|sync|restore|recover|rerun|run|start|stop|retry|delete|archive|create|new" src
rg -n "TODO|FIXME|placeholder|coming soon|not implemented|noop|no-op|console\\.log|alert\\(" src
```

For each candidate surface, classify:

- command
- navigation
- form submit
- graph action
- status indicator
- display-only
- disabled by design
- planned but not surfaced
- unknown

Output:

| Surface | File | Label/Icon/State | Handler | Visible Condition | Classification | Evidence |
|---|---|---|---|---|---|---|

### Phase 3: Closure Graph Construction

For each implemented or likely intended surface, trace:

```txt
surface
-> handler
-> store action / hook / service
-> local persistence
-> sync queue
-> API route or runtime service
-> repository
-> database/storage
-> recovery/read path
-> tests
```

Mark each edge:

- closed
- local-only
- optimistic-only
- pointer-only
- preview-only
- compacted
- redacted
- no-op
- missing
- excluded
- unknown

Output:

| Capability | UI Edge | State Edge | Backend Edge | Recovery Edge | Test Edge | Closure |
|---|---|---|---|---|---|---|

### Phase 4: Exclusion Pass

Before flagging a problem, prove whether it is actually intended to be a
function.

Valid exclusions:

- decorative UI
- disabled under explicit condition
- feature-flagged off
- planned item without enabled surface
- test fixture only
- generated type not used by runtime
- migration-only future schema
- admin-only path outside audited user surface

Invalid exclusions:

- visible enabled action with no handler
- handler that logs only
- success/synced UI without backend read proof
- pointer with missing target
- snapshot preview treated as archive

Output:

| Item | Exclusion Type | Evidence | Residual Risk |
|---|---|---|---|

### Phase 5: Data Asset Inventory

Inventory every generated or user-authored asset:

- chat messages
- workflow node outputs
- output node render text
- tool outputs
- artifact payloads
- notebook/datapad content
- prompts and revisions
- workspace snapshots
- imported/exported data
- generated code or sandbox text
- media records
- sync operation payloads
- recovery plans

For each asset:

| Asset | Producer | Runtime Field | Local Store | Sync Payload | Backend Store | Recovery Path | Verdict |
|---|---|---|---|---|---|---|---|

### Phase 6: Durable Record Proof

Valid proof:

- exact body in a durable table
- exact body in retrievable object storage
- retrievable artifact URL with content hash
- message row with non-empty content
- snapshot with full non-truncated raw content
- export file with full output and provenance
- backend read API returns exact content after local state is unavailable

Invalid proof:

- completed task row
- stream completed event
- usage metric
- output id without matching content
- content length without body source
- preview text
- UI copy text
- local-only cache
- synced queue status without domain read proof

### Phase 7: Live Verification Plan

Generate a plan before running checks.

The plan must specify:

- which capabilities are highest risk
- which files and handlers will be traced
- which tables/columns must exist
- which SQL count/boolean checks will run
- which browser checks are safe
- which tests will run
- which items are excluded

Output this plan in the report before results.

### Phase 8: Execute Checks

Run only safe, non-destructive checks. Capture:

- command/query
- scope
- result summary
- pass/fail/blocked
- evidence weight

Evidence weights:

- W0: search lead
- W1: line-level code evidence
- W2: test result
- W3: live schema/count/boolean evidence
- W4: end-to-end replay

### Phase 9: Report Per-Capability Verdicts

Allowed verdicts:

- Closed
- Closed local-only
- Closed but not durable
- Lifecycle only
- Pointer-only
- Compacted only
- False affordance
- Excluded
- Unknown

---

## 4. Backend SQL Templates

Use narrow windows for event/task rows. Use schema checks without time windows.

### Task Output Join

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
  ) as completed_with_nonempty_message
from public.agent_tasks t
left join public.messages m on m.id = t.output_message_id
where t.workspace_id = :workspace_id
  and t.created_at between :start_utc and :end_utc
group by t.task_type
order by t.task_type;
```

### Runtime Event Payload Shape

```sql
select
  e.event_type,
  count(*) as event_count,
  min(e.created_at) as first_seen,
  max(e.created_at) as last_seen,
  bool_or(e.payload::text ilike '%content%') as mentions_content,
  bool_or(e.payload::text ilike '%delta%') as mentions_delta,
  min(length(coalesce(e.payload::text, ''))) as min_payload_length,
  max(length(coalesce(e.payload::text, ''))) as max_payload_length
from public.agent_runtime_events e
join public.agent_tasks t on t.id = e.task_id
where t.workspace_id = :workspace_id
  and e.created_at between :start_utc and :end_utc
group by e.event_type
order by e.event_type;
```

### Schema Drift

```sql
select
  to_regclass('public.messages') is not null as has_messages,
  to_regclass('public.agent_tasks') is not null as has_agent_tasks,
  to_regclass('public.agent_runtime_events') is not null as has_agent_runtime_events,
  to_regclass('public.tool_runs') is not null as has_tool_runs,
  to_regclass('public.artifacts') is not null as has_artifacts,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'artifacts'
      and column_name = 'content_text'
  ) as artifacts_has_content_text,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'artifacts'
      and column_name = 'content_hash'
  ) as artifacts_has_content_hash;
```

---

## 5. Required Report Format

```md
# NEXUS Functional Closure Atlas Audit

## 1. Scope
## 2. Scorecard
## 3. Project Topology
## 4. Product Surface Inventory
## 5. Function Closure Matrix
## 6. Exclusions
## 7. Data Asset Inventory
## 8. Durable Record Proof
## 9. Live Verification Plan
## 10. Evidence Matrix
## 11. Backend Evidence Summary
## 12. Browser/Local Evidence Summary
## 13. Gap Table
## 14. Risk Register
## 15. Repair Plan
## 16. Tests To Add Or Repair
## 17. Untested Boundaries
## 18. Per-Capability Verdicts
## 19. Final Verdict
```

Every P0/P1 claim must include:

- file/table reference
- evidence weight
- confidence
- reproduction or blocking reason
- repair direction

---

## 6. Execution Prompt

```txt
Read NEXUS_V3_FUNCTIONAL_CLOSURE_ATLAS_PROTOCOL.md first.

Audit /Users/sean/Documents/FreeChat for functional-closure and generated-output
record-storage risks. Do not rely on prior conversation context.

Start by building a product-surface inventory from routes, components, controls,
handlers, CSS affordance states, stores, API routes, repositories, migrations,
and tests. Classify visible controls before judging backend durability.

Then build closure graphs for each implemented or likely intended capability:
surface -> handler -> state/action -> runtime/API -> repository/storage ->
recovery/read path -> tests.

Separately inventory data assets and prove whether exact generated outputs are
recoverable from durable backend storage.

Generate a live verification plan, execute safe checks, attach evidence weights,
and return the report in the required format.
```

---

## 7. Completion Gate

The audit is complete only when it answers:

- What product surfaces exist?
- Which surfaces are commands, indicators, disabled controls, or display-only?
- Which capabilities close end-to-end?
- Which capabilities are local-only or pointer-only?
- Which generated outputs have exact durable records?
- Which durable records are only previews, pointers, redactions, or compactions?
- Which schema assumptions were verified against live schema when available?
- Which tests prove closure and durability?
- Which boundaries remain untested?
