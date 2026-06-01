# Post Metadata Remediation After Probe - 2026-06-01

Read-only Supabase after-probe against project `xjuglddxwnikvcwxfbzg`.

## Scope

Completed chat tasks with non-null `output_message_id` after authorized
metadata-only remediation of the historical workflow-runtime rows.

## Result

Generated at: `2026-06-01T04:38:20.019237+00:00`

| Metric | Count |
|---|---:|
| Completed output tasks | 23 |
| Strict durable message joins | 17 |
| Quarantined non-durable historical rows | 6 |
| Active unclassified missing durable joins | 0 |
| Accounted for by durable join or quarantine | 23 |
| Missing with any same message id present | 0 |
| Missing with no same message id present | 6 |

Stage gate:

- `active_unclassified_p0_count`: `0`
- `pass`: `true`

By output id shape:

| Shape | Total | Strict durable joins | Quarantined non-durable | Active unclassified missing |
|---|---:|---:|---:|---:|
| `message_prefix` | 17 | 17 | 0 | 0 |
| `workflow_runtime_pattern` | 6 | 0 | 6 | 0 |

## Idempotency

The metadata marker SQL was rerun after the first live mutation.

| Check | Result |
|---|---|
| Updated rows on rerun | `0` |
| Idempotent | `true` |

## Safety Notes

- No raw message content exported.
- No raw output ids exported.
- No `messages` rows changed.
- No task `status` values changed.
- No historical assistant content was backfilled.
- The six historical workflow rows are explicitly classified as
  non-durable, flow-proven lifecycle records.
