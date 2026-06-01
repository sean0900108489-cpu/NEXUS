# Historical Missing Authority Candidates - 2026-06-01

Read-only Supabase probe against project `xjuglddxwnikvcwxfbzg`.

Probe source:

- `../02-probe-matrix/historical-missing-authority-candidates.sql`

## Result

Scope: the 6 completed workflow-runtime chat tasks that have no strict durable
`messages` join.

| Candidate source | Matched rows |
|---|---:|
| Any `messages.id = output_message_id` | 0 |
| `workspace_snapshots` references output id | 0 |
| `workspace_snapshots` references task id | 0 |
| `sync_operations` references output id | 0 |
| `sync_operations` references task id | 0 |
| `agent_runtime_events.stream_completed` exists | 6 |
| `agent_runtime_events.payload` references output id | 0 |
| `system_events` references task/output | 6 |

## Decision

There is lifecycle evidence that the tasks completed, but no authoritative
content source was found. Runtime events and system events are not exact
generated-output authority and must not be used to reconstruct message content.

Backfill is not approved from this evidence set.

Recommended handling:

- If exact content is later proven from a trusted authority source, backfill with
  an idempotent migration that preserves `output_message_id`, `workspace_id`,
  `agent_id`, `task_id`, role, content hash, and provenance metadata.
- If exact content cannot be proven, quarantine or downgrade these six task rows
  with an explicit `non_durable_historical_workflow_output` marker so completed
  lifecycle state is not mistaken for recoverable content.
- Any live data mutation must be separately approved and must be preceded and
  followed by the live durability probe.
