# V20 Generated Output Durability And Data Authority Lane

This lane tracks the V20 generated-output durability repair work that follows
Protocol 96. It is separate from the completed auth-boundary lane because the
core risk is different: visible output, completed lifecycle state, stream
events, sync operations, and workspace snapshots must not be mistaken for exact
backend authority.

## Stage Target

This stage is complete only when generated or user-authored assets that the UI
presents as saved, completed, recoverable, copied, or durable can be recovered
from an exact authoritative backend record without relying on the original
browser state.

Target state:

- `P0` count is zero for generated output durability.
- Every completed output-producing `agent_tasks` row joins to a nonempty
  authoritative `messages` row or is explicitly downgraded from completed.
- Workflow Runtime Lite output has an exact backend authority path and a tested
  recovery path after browser state is cleared.
- Workspace snapshots remain restore/hydration state only and are not treated as
  exact generated-output archives.
- Oversized text artifacts and media/tool outputs are either stored in
  access-controlled object/blob authority with hashes and lengths, or marked
  non-durable before the UI presents them as saved.
- Memory compression output and agent memory records have a durable domain table
  or are clearly classified as snapshot/local lifecycle data.
- Legacy messages have content hashes and minimum provenance, or are quarantined
  as legacy records that do not satisfy the current durability gate.
- Read-only Supabase checks prove the live schema and live counts match the
  repair target.

Suggested target score: `90+ / 100` for this stage, with zero `P0`.

## Folder Plan

| Folder | Purpose |
|---|---|
| `00-goals/` | Stage goal, closure criteria, score target, and accepted non-goals. |
| `01-protocols/` | Executable post-fix scan protocol for Protocol 96 durability closure. |
| `02-probe-matrix/` | SQL, route, recovery, and no-browser-state probe inventory. |
| `03-evidence-ledger/` | Redacted evidence summaries and count/schema proof collected during scans. |
| `04-results/` | Completed post-fix scan reports after repairs land. |
| `05-regression-tests/` | Required test inventory and observed test command results. |
| `06-release-gates/` | Final release gate checklist and sign-off notes for this lane. |

## Primary Protocol

Run this only after the durability fixes land:

- [V20_GENERATED_OUTPUT_DURABILITY_POST_FIX_SCAN.md](./01-protocols/V20_GENERATED_OUTPUT_DURABILITY_POST_FIX_SCAN.md)

## Operating Rule

This lane stores read-only verification plans and redacted evidence. Do not
store secrets, tokens, provider keys, service-role keys, Authorization headers,
cookies, raw browser storage, raw generated private content, full user-authored
content, or full response bodies.
