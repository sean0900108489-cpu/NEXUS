# Round 15 - Workspace Permission Matrix

Time: 2026-06-04T16:25:35+10:00

## High-ROI Action

R22-15 fixed the observability access boundary that could cause lower-role or new accounts to fail even when the action was only a workspace read.

## Changes

- `assertObservabilityAccess()` now treats read-like observability actions as `viewer` minimum role.
- Write-like observability actions such as `workflow.trace.write` still require `editor`.
- Usage metrics now explicitly require `editor`.
- Tests now prove viewer read access for events and traces, viewer denial for usage metrics, and editor allowance for future write-like trace actions.

## Why This Matters

Workflow Pro will soon persist runtime trace events and generated asset history. Before adding write routes, the permission matrix needs to be explicit. This round prevents the previous failure mode where one privileged account succeeds while another valid workspace member is blocked by an accidental editor-only read gate.

## Verification

```text
npm test -- src/app/api/v1/observability/observability-route-helpers.test.ts src/lib/backend/observability/observability-service.test.ts src/lib/backend/workspace/workspace-permission-request.test.ts src/lib/backend/workspace/workspace-session-service.test.ts
```

Result:

```text
Passed: 4 files / 23 tests
```

## Score

- Construction score: 9/10
- Deep Workflow Pro distance: 88/100
- Estimated remaining rounds: 10 to 14

## Next Suggested Round

Add the authenticated server write route for sanitized workflow runtime trace events, using the existing `nexus.workflowRuntime.traceEvent.v1` adapter and the R22-15 editor write gate.
