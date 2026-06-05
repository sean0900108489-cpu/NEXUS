# Workflow Pro Permission Matrix

Created: 2026-06-04T16:25:35+10:00

## Purpose

Workflow Pro needs account behavior that is predictable before durable workflow trace writes land. The previous risk was that an owner-like local account could use generation or nodes, while a new or lower-role account would hit a permission failure after the UI looked ready.

This document records the R22-15 permission boundary for observability and future workflow runtime trace persistence.

## Current Roles

The workspace roles remain:

- owner
- admin
- editor
- viewer

The intended behavior is:

- Viewer can read workspace events and trace projections.
- Viewer cannot write workflow runtime traces.
- Viewer cannot read provider usage metrics.
- Editor can read workspace events and trace projections.
- Editor can read provider usage metrics.
- Editor can write future workflow runtime trace events.
- Owner and admin inherit the appropriate higher privileges.

## Implemented Boundary

File:

```text
src/app/api/v1/observability/observability-route-helpers.ts
```

The helper now resolves its minimum role from the action:

```text
read-like action  -> viewer
write-like action -> editor
explicit minRole  -> explicit route override
```

This fixes the mismatch where `workspace.read` was named as a read action but still required `editor`.

## Route Policy

Current route behavior:

- `GET /api/v1/observability/events`
  - default read policy
  - viewer allowed
- `GET /api/v1/observability/traces/[traceId]`
  - default read policy
  - viewer allowed
- `GET /api/v1/observability/metrics`
  - explicit `minRole: editor`
  - viewer denied

Metrics stay editor-scoped because provider usage, cost estimates, token totals, and model usage are more sensitive than basic workflow trace visibility.

## Future Write Policy

The future workflow runtime trace write route should call:

```text
assertObservabilityAccess({
  action: "workflow.trace.write",
  trace,
  workspaceId,
})
```

That action is write-like and therefore requires editor or higher. The same helper will keep a request-scoped permission audit trail through the existing workspace permission service.

## Verification

```text
npm test -- src/app/api/v1/observability/observability-route-helpers.test.ts src/lib/backend/observability/observability-service.test.ts src/lib/backend/workspace/workspace-permission-request.test.ts src/lib/backend/workspace/workspace-session-service.test.ts
```

Result:

```text
Passed: 4 files / 23 tests
```

Covered cases:

- viewer workspace reads are allowed by default
- viewer write-like observability actions are denied
- editor write-like observability actions are allowed
- viewer can read workspace event lists
- viewer can read trace lifecycle projections
- viewer cannot read usage metrics
- request-scoped Supabase permission behavior remains covered by existing workspace tests

## Next Gate

The platform can now safely add the server write route for sanitized workflow runtime trace events. That route should persist only the adapter output from `nexus.workflowRuntime.traceEvent.v1`, not arbitrary client metadata.
