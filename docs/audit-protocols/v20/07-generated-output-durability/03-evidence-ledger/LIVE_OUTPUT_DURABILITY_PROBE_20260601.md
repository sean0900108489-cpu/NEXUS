# Live Output Durability Probe - 2026-06-01

Read-only Supabase probe against project `xjuglddxwnikvcwxfbzg`.

Probe source:

- `../02-probe-matrix/live-output-durability-probe.sql`

Evidence policy:

- No raw message content exported.
- No raw output ids exported.
- No keys, tokens, cookies, or Authorization headers exported.
- Missing samples are represented by one-way hashes and timestamps only.

## Result

Generated at: `2026-06-01T04:18:34.372252+00:00`

Scope: completed chat tasks with non-null `output_message_id`.

| Metric | Count |
|---|---:|
| Completed output tasks | 23 |
| Strict durable message joins | 17 |
| Missing strict durable message joins | 6 |
| Missing with any same message id present | 0 |
| Missing with no same message id present | 6 |

By output id shape:

| Shape | Total | Strict durable joins | Missing strict joins |
|---|---:|---:|---:|
| `message_prefix` | 17 | 17 | 0 |
| `workflow_runtime_pattern` | 6 | 0 | 6 |

Missing window:

- First missing task created at: `2026-05-29T01:42:29.048987+00:00`
- Last missing task created at: `2026-05-29T01:50:11.237159+00:00`

Redacted missing task hashes:

- `d5128c8b774b8857055da767d5bdc378`
- `c8ab1b98f53f045d229368697bf7f526`
- `ae321cd346060c66864e2e43def8be0b`
- `0afee76e9fef8ab24bd0aaf5ace8b559`
- `7695a30b964885a29a86b1645a71f09c`
- `db271772cef80e2e2a77a4b28bd044bf`

## Classification

Current live state is not yet stage-complete. The remaining gap is historical
workflow runtime tasks that are marked `completed` but have no authoritative
`messages` row, even by loose message id lookup.

Recommended next action:

- Decide the safe handling for the six historical rows: authoritative backfill
  only if exact content can be proven from a trusted source; otherwise downgrade
  or quarantine them as non-durable lifecycle records.
