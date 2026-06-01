# NEXUS V20 Auth Boundary Repair Scan Workspace

This folder tracks the V20 auth, identity, and permission-boundary repair lane.
It is intentionally separate from the reusable V98 protocol so the phase-one
repair target can stay narrow, replayable, and easy to close.

## Phase-One Target

Phase one is complete only when the release-blocking auth-boundary findings from
the 2026-06-01 audit are removed and proven by focused tests plus read-only
probes.

Target state:

- `P0` count is zero for phase-one scope.
- `/api/tools/fs-scanner` is unavailable in production unless a verified actor
  and explicit workspace/admin permission are proven first.
- `/api/tools/web-surfer` is unavailable in production unless a verified actor
  and explicit workspace/admin permission are proven first.
- `/api/v1/agents/[agentId]/stream` always proves workspace permission before
  task, session, message, or runtime writes.
- Supabase session `Authorization` is never reused as a provider/runtime API key.
- Caller-controlled `X-User-Id`, `X-Workspace-Id`, query params, and body
  identity fields remain untrusted hints until a verified server actor and
  workspace permission decision exist.
- Production without required service-role configuration fails closed for
  permission-protected backend paths.
- Supabase Auth leaked password protection is enabled and verified by the live
  security advisor.
- Focused regression tests and status-only probes pass without exporting
  secrets, auth tokens, service-role keys, provider keys, or browser storage.

## Folder Plan

| Folder | Purpose |
|---|---|
| `00-goals/` | Phase target, closure criteria, and accepted non-goals. |
| `01-protocols/` | Executable scan protocols to run after fixes land. |
| `02-probe-matrix/` | Route/probe inventory and expected status-code matrix. |
| `03-evidence-ledger/` | Raw evidence summaries, redacted command outputs, and links. |
| `04-results/` | Completed post-fix scan reports. |
| `05-regression-tests/` | Required and observed regression test inventory. |
| `06-release-gates/` | Final release gate checklists and sign-off notes. |
| `07-generated-output-durability/` | Protocol 96 follow-up lane for exact generated-output authority and recovery scans. |

## Primary Protocol

Run this after the full phase-one fix is implemented:

- [V20_PHASE_1_AUTH_BOUNDARY_POST_FIX_SCAN.md](./01-protocols/V20_PHASE_1_AUTH_BOUNDARY_POST_FIX_SCAN.md)

Generated-output durability follow-up lane:

- [V20 Generated Output Durability Lane](./07-generated-output-durability/README.md)
- [V20_GENERATED_OUTPUT_DURABILITY_POST_FIX_SCAN.md](./07-generated-output-durability/01-protocols/V20_GENERATED_OUTPUT_DURABILITY_POST_FIX_SCAN.md)

## Latest Technical Closeout

- [PHASE_7_LIVE_HTTP_INVENTORY_PROBE_20260601.md](./04-results/PHASE_7_LIVE_HTTP_INVENTORY_PROBE_20260601.md)
- [PHASE_8_FINAL_FULL_CHECK_AND_SIGNOFF_20260601.md](./04-results/PHASE_8_FINAL_FULL_CHECK_AND_SIGNOFF_20260601.md)
- [V20_FINAL_CONSOLIDATED_AUTH_BOUNDARY_REPORT_20260601.md](./04-results/V20_FINAL_CONSOLIDATED_AUTH_BOUNDARY_REPORT_20260601.md)
- [V20_FINAL_TECHNICAL_SIGNOFF_20260601.md](./06-release-gates/V20_FINAL_TECHNICAL_SIGNOFF_20260601.md)

## Operating Rule

This workspace is for read-only verification plans and redacted evidence. Do not
store secrets, tokens, provider keys, service-role keys, raw browser storage, or
full response bodies that may contain sensitive data.
