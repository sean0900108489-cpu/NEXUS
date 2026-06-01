# V20 Generated Output Durability Stage Goal

## Goal Statement

After this repair stage, NEXUS should be able to prove that any generated or
user-authored asset presented as saved, completed, recoverable, copied, or
durable has an exact authoritative backend record, or is explicitly labeled and
handled as local-only, lifecycle-only, pointer-only, compacted snapshot, or
non-durable.

The central closure question:

```txt
Can the user recover the exact output from backend authority after the original
browser state is gone?
```

## Must Be True

- Completed output-producing tasks cannot exist without exact backend output
  authority.
- `agent_tasks.output_message_id` points to a nonempty `messages` row for every
  completed chat/workflow task, unless the task is intentionally not an output
  task and is documented as such.
- Workflow Runtime Lite node outputs are recoverable from backend authority, not
  only from `outputSnapshot`, local IndexedDB, stream events, or compacted
  workspace snapshots.
- Workspace snapshots can assist recovery, but they cannot be the only proof of
  exact generated output.
- Artifact records must contain exact inline content or point to a retrievable,
  access-controlled blob/object with `content_hash`, `content_size_bytes`, and
  provenance.
- Tool and media outputs cannot be considered durable from redacted
  `tool_runs.output_redacted`, remote URLs, or `TOOL_MATERIALIZATION_NOT_AVAILABLE`.
- Memory compression output and agent memory have a durable record path or are
  classified as local/snapshot lifecycle data.
- Sync operations are treated as transport/control records only; durable proof
  is the applied domain table or blob/object.
- Browser IndexedDB/localStorage is treated as local-only support, not server
  authority.

## Non-Goals For This Stage

- Redesigning every UI surface that displays generated output.
- Exporting private user content for inspection.
- Building a full long-term archival system beyond the current product needs.
- Solving unrelated auth-boundary or visual design issues already covered by
  other V20 lanes.
- Performing destructive data repair without a separate migration and rollback
  plan.

## Closure Bar

This stage is ready for the post-fix scan when:

- Live Supabase count check reports zero completed output tasks missing durable
  message authority.
- Workflow runtime exact recovery is covered by tests.
- Large artifact/media/tool output behavior is either durable or explicitly
  non-durable before UI save/recovery claims.
- Required regression tests pass.
- `npm run check` passes.
- The post-fix scan returns zero `P0`.
