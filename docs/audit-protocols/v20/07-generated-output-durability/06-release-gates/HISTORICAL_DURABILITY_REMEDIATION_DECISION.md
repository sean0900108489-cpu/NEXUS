# Historical Durability Remediation Decision

This gate covers completed output-producing tasks that do not join to a durable
`messages` row.

## Rule

A historical completed task may be marked durable only when exact output content
is proven from a trusted authoritative source.

Accepted authority:

- A `messages` row with matching `id`, `workspace_id`, `agent_id`, and `task_id`
  plus nonempty assistant content.
- A separately verified object/blob/domain record with content hash, length,
  provenance, and a reversible reference to the task.

Rejected authority:

- UI-visible output only.
- Stream `done` events only.
- `agent_tasks.status = completed` only.
- `agent_runtime_events.stream_completed` only.
- `system_events` lifecycle logs only.
- `workspace_snapshots` or compacted context packets unless they are explicitly
  designated as exact content authority by a later schema contract.
- Browser local storage or IndexedDB only.

## Current Live Decision

The 2026-06-01 read-only probe found 6 historical workflow-runtime completed
chat tasks with no durable `messages` join and no loose `messages.id` match.
Only lifecycle/event evidence exists.

Decision: do not backfill content from the current evidence set.

The 2026-06-01 completion-flow proof showed all 6 rows have:

- `stream_started`
- `first_token`
- `stream_completed`
- no `stream_failed`
- no task `error_code`
- ordered lifecycle timestamps

Authorized remediation was applied as metadata-only DML. The rows were marked
`non_durable_historical_workflow_output` with
`durabilityStatus = quarantined_non_durable`.

No task status was changed. No `messages` rows were changed. No content was
backfilled.

The after-probe showed:

- 17 strict durable message joins
- 6 quarantined non-durable historical rows
- 0 active unclassified missing durable joins
- stage gate pass: `true`

Release gate decision: closed for the historical workflow-output gap.

## Required Before Any Live Mutation

- Run `live-output-durability-probe.sql` and record a redacted before-count.
- Confirm the mutation SQL does not export raw content or secrets.
- Prefer a reversible metadata marker over destructive deletion.
- Run `live-output-durability-probe.sql` again and record an after-count.

## Applied Remediation

- `historical-output-metadata-remediation.sql`
- `../03-evidence-ledger/POST_METADATA_REMEDIATION_AFTER_PROBE_20260601.md`
