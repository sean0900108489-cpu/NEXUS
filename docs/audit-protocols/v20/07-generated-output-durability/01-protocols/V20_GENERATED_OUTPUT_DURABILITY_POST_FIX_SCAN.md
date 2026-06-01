# V20 Generated Output Durability Post-Fix Scan

## 0. Purpose

Run this protocol only after the V20 generated-output durability repairs are
implemented. It verifies that Protocol 96 release blockers are closed without
relying on prior conversation context or original browser state.

Core question:

```txt
Does every output presented as completed, saved, recoverable, or durable have an
exact backend authority record, and can it be recovered without local browser
state?
```

## 1. Target Outcome

The scan passes only when all of these are true:

- `P0` findings in this protocol: `0`.
- Completed output-producing tasks join to exact backend output authority.
- Workflow Runtime Lite output can be recovered exactly after local browser
  state is removed.
- Workspace snapshots are not treated as exact output archives.
- Artifacts either store exact inline content or reference retrievable,
  access-controlled blob/object content with hash and length proof.
- Tool/media outputs do not claim durability without materialized authority.
- Memory compression output and agent memory have a durable authority path or a
  clear local/snapshot-only classification.
- Evidence is status-code, count, boolean, schema, hash, length, timestamp, or
  redacted summary only.

Suggested target score: `90+ / 100` with zero `P0`.

## 2. Safety Rules

- Use read-only probes by default.
- Do not export `.env.local`, Vercel env values, Supabase secrets,
  service-role keys, provider keys, Authorization headers, cookies,
  localStorage, IndexedDB, browser auth storage, or full private content.
- Prefer status codes, counts, booleans, schema facts, hashes, lengths, and
  timestamps.
- Do not create, update, delete, or backfill production records during this
  scan.
- If browser checks are needed, inspect only storage key names/counts and never
  dump values.

## 3. Required Preflight

Record:

- repository root
- branch
- commit
- dirty worktree summary
- package scripts relevant to test/typecheck/lint/build
- Next.js version
- Supabase project id/ref
- Vercel project/deployment id
- open PR/merge status if applicable

Read before scanning:

- `AGENTS.md`
- `docs/audit-protocols/NEXUS_GENERATED_OUTPUT_DURABILITY_DATA_AUTHORITY_SCAN_PROTOCOL_96.md`
- this protocol
- relevant local Next.js docs under `node_modules/next/dist/docs/` before any
  route-code change

## 4. Asset Authority Inventory

Build a fresh inventory of every generated or user-authored asset class:

- chat messages
- completed agent tasks
- Workflow Runtime Lite node outputs
- workspace snapshots and workspace projections
- sync operations and local sync queue records
- notebooks/datapads
- prompts and prompt revisions
- artifacts and artifact references
- tool runs
- media/image outputs
- memory compression output and agent memory records
- browser IndexedDB/localStorage caches

For each asset classify authority as one of:

- exact backend authority
- blob/object authority
- lifecycle only
- pointer only
- compacted snapshot
- local only
- schema-blocked
- unknown

## 5. Required Live Supabase Checks

Run read-only SQL. Do not return row content.

Completed task authority gate:

```sql
select
  t.status,
  t.task_type,
  count(*)::int as task_count,
  count(*) filter (where t.output_message_id is not null and t.output_message_id <> '')::int as with_output_message_id,
  count(*) filter (where m.id is not null)::int as output_message_found,
  count(*) filter (where m.id is not null and length(coalesce(m.content,'')) > 0)::int as output_message_nonempty,
  count(*) filter (where m.id is not null and m.content_hash is not null and m.content_hash <> '')::int as output_message_hashed,
  count(*) filter (
    where t.status = 'completed'
      and (t.output_message_id is null or t.output_message_id = '' or m.id is null or length(coalesce(m.content,'')) = 0)
  )::int as completed_missing_durable_message
from public.agent_tasks t
left join public.messages m
  on m.id = t.output_message_id
 and m.workspace_id = t.workspace_id
 and m.agent_id = t.agent_id
group by t.status, t.task_type
order by t.status, t.task_type;
```

Pointer-shape gate:

```sql
select
  case
    when t.output_message_id is null or t.output_message_id = '' then 'no_output_message_id'
    when t.output_message_id like 'message_%' then 'message_prefix'
    when position(':' in t.output_message_id) > 0 then 'workflow_runtime_pattern'
    else 'other_pointer_pattern'
  end as output_pointer_shape,
  count(*)::int as completed_count,
  count(*) filter (where m.id is not null)::int as message_found,
  count(*) filter (where m.id is null)::int as message_missing
from public.agent_tasks t
left join public.messages m
  on m.id = t.output_message_id
 and m.workspace_id = t.workspace_id
 and m.agent_id = t.agent_id
where t.status = 'completed'
group by output_pointer_shape
order by output_pointer_shape;
```

Artifact gate:

```sql
select
  count(*)::int as total_artifacts,
  count(*) filter (where content_text is not null and length(content_text) > 0)::int as with_inline_content_text,
  count(*) filter (where content_hash is not null and content_hash <> '')::int as with_content_hash,
  count(*) filter (where content_size_bytes is not null)::int as with_content_size,
  count(*) filter (where content_url like 'external://artifact-content/%')::int as external_placeholder_url,
  count(*) filter (where content_url ~* '^https?://')::int as remote_url_only,
  count(*) filter (where source_message_id is not null)::int as source_message_links,
  count(*) filter (where source_task_id is not null)::int as source_task_links,
  count(*) filter (where source_tool_run_id is not null)::int as source_tool_links,
  max(content_size_bytes)::int as max_content_size_bytes
from public.artifacts;
```

Tool/media gate:

```sql
select
  count(*)::int as total_tool_runs,
  count(*) filter (where status in ('succeeded','materialized'))::int as successful,
  count(*) filter (where output_redacted is not null)::int as with_output_redacted,
  count(*) filter (where output_hash is not null and output_hash <> '')::int as with_output_hash,
  count(*) filter (where artifact_id is not null)::int as with_artifact,
  count(*) filter (where status in ('succeeded','materialized') and artifact_id is null)::int as successful_without_artifact
from public.tool_runs;
```

Memory authority gate:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'agent_memory_records'
order by ordinal_position;
```

The scan fails if `completed_missing_durable_message > 0`.

## 6. Static Trace Requirements

Trace these code paths:

- stream producer -> `persistTaskOutputMessage` -> `completeTask`
- workflow runtime `outputMessageId` generation
- workflow output hydrate/recovery path
- local sync queue -> `/api/v1/sync/operations` -> domain table write
- workspace snapshot serializer and materializer
- artifact materializer and repository
- tool executor adapter and materialization status
- memory compression route and memory persistence path
- browser persistence partialize/migrate logic

Required proof points:

- completion cannot be written before output authority exists
- workflow output pointers resolve to exact backend content
- compacted snapshots are never treated as exact generated-output authority
- oversized artifact text/media is not pointer-only when marked saved
- local queue `synced` status is backed by a durable domain record
- local browser state is not part of the final authority proof

## 7. Required Recovery Probes

Use a safe local or staging environment unless the user explicitly asks for
production. Prefer fixtures and tests over live writes.

| Probe | Expected |
|---|---|
| completed task join SQL | `completed_missing_durable_message = 0` |
| workflow runtime generated output after browser clear | exact output restored from backend |
| workspace snapshot hydrate | restores shell but does not claim exact transcript authority |
| artifact list -> artifact get | list may show preview; get returns exact content/blob metadata |
| oversized artifact fixture | exact blob/object retrievable, or save is rejected/non-durable |
| successful media tool fixture | artifact/blob exists, or UI reports non-durable |
| memory compression fixture | durable memory/message/artifact exists, or lifecycle-only classification |

## 8. Required Regression Tests

The repair should add or preserve tests for:

- completed task cannot remain completed if output message persistence fails
- workflow `outputMessageId` with colon-style ids persists and joins correctly
- workflow output recovery does not depend on local `outputSnapshot`
- workspace snapshot serializer remains compacted/non-authoritative for messages
- large artifact content is blob-backed or rejected as non-durable
- tool/media output cannot report durable materialization without artifact/blob
- memory compression output persistence or explicit lifecycle-only downgrade
- live/read-only SQL gate fixture for completed task join count

Run:

```bash
npm test -- src/lib/backend/runtime/agent-runtime.test.ts src/lib/backend/artifacts/artifact-service.test.ts src/lib/backend/history/message-history-service.test.ts src/lib/backend/sync/sync-queue.test.ts src/lib/backend/workspace/workspace-state.test.ts src/lib/backend/tools/tool-execution.test.ts
npm run check
```

## 9. Vercel And GitHub Deployment Check

Record only:

- Vercel project id/name
- latest preview deployment id/state/commit
- production deployment commit
- GitHub PR number/state/merge status
- status checks

Do not inspect or export environment variables.

## 10. P0 Signatures

Classify as `P0` if any remain:

1. A completed output-producing task has no exact backend output record.
2. Workflow Runtime Lite displays or recovers output only from local/snapshot
   state while claiming saved/completed durability.
3. A generated output can be marked saved/synced/complete while the only backend
   record is a lifecycle event, sync operation, compacted snapshot, or pointer.
4. A protected output read API returns content from caller-controlled identity
   without a verified server-side actor and permission decision.

## 11. Required Report Format

Return the report using this structure:

```md
# V20 Generated Output Durability Post-Fix Scan

## 1 Executive Summary
## 2 Scope And Preflight
## 3 Stage Goal Verdict
## 4 Asset Authority Inventory
## 5 Producer-To-Authority Trace
## 6 Durable Record Proof
## 7 Live Supabase Verification
## 8 Browser And Local Storage Boundary
## 9 Recovery Probe Results
## 10 Regression Test Results
## 11 Vercel/GitHub Deployment Context
## 12 Evidence Matrix
## 13 P0/P1 Risk Register
## 14 Release Gate Decision
## 15 Required Follow-Ups
```

## 12. Pass/Fail Rule

Pass:

- zero `P0`
- completed task join gate is zero
- workflow exact recovery is proven without browser state
- artifact/tool/media durability claims have exact authority proof
- memory output is durable or explicitly non-durable
- required tests pass
- `npm run check` passes

Fail:

- any completed output-producing task lacks exact backend authority
- any UI-visible generated output is treated as durable from local-only,
  lifecycle-only, pointer-only, or compacted snapshot evidence
