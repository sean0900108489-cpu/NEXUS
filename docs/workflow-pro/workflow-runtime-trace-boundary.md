# Workflow Runtime Trace Boundary

Created: 2026-06-04T16:19:32+10:00

## Purpose

Workflow Pro needs traceability that works across local RuntimeLite, future backend persistence, and account-scoped permission checks. The trace boundary should not copy raw prompts, raw output, provider keys, or binary artifact payloads into observability events.

This document describes the additive boundary added in R22-14, the first editor-gated write route added in R22-16, the RuntimeLite sync bridge added in R22-17, and the Trace panel durable-event correlation added in R22-18.

## Current Adapter

File:

```text
src/lib/backend/observability/workflow-runtime-events.ts
```

Schema:

```text
nexus.workflowRuntime.traceEvent.v1
```

The adapter converts a `WorkflowRun` into a backend `BackendEvent`.

It records:

- workflow run ID
- workflow ID
- workflow group ID
- workflow group label
- workflow group source
- run status
- duration
- node count
- node status counts
- artifact count

It intentionally does not record:

- raw `ContextPacket.rawText`
- raw prompt text
- full model output
- provider URLs
- data URLs
- API keys or tokens
- artifact binary payloads

## Existing Backend Fit

The repo already has:

- `system_events`
- `ObservabilityService`
- `RedactionPipeline`
- `SystemEventRepository`
- `/api/v1/observability/events` read route

Because those already exist, R22-14 does not create a duplicate trace table. The next implementation should send workflow runtime events into the existing observability service or a narrow server route that calls the same service.

## Event Shape

Example event name:

```text
workflow.runtime_lite.run.succeeded
workflow.runtime_lite.run.failed
workflow.runtime_lite.run.updated
```

Resource:

```text
resourceType: workflow.run
resourceId: <runId>
source: agent
```

Metadata payload:

```json
{
  "schema": "nexus.workflowRuntime.traceEvent.v1",
  "workflowRunId": "run-a",
  "workflowId": "workspace-a",
  "workflowGroupId": "wf_group_brain",
  "workflowGroupLabel": "Brain Draft",
  "workflowGroupSource": "brain",
  "status": "success",
  "severity": "info",
  "durationMs": 4000,
  "nodeCount": 2,
  "artifactCount": 1
}
```

## Permission Boundary

The read side currently uses `assertObservabilityAccess()` and requires authenticated workspace access. That path should stay the read gate.

Before adding a write route, the route must:

1. Require authentication.
2. Resolve workspace session.
3. Require editor or owner for workflow run writes.
4. Emit a request-scoped permission audit result.
5. Pass only sanitized workflow trace payloads to `ObservabilityService`.

This avoids the previous failure mode where the owner account worked but new accounts hit permission failures.

## Write Route

File:

```text
src/app/api/v1/workflows/runtime-trace/route.ts
```

Endpoint:

```text
POST /api/v1/workflows/runtime-trace
```

The route accepts only a narrow run summary:

- workspace ID
- run ID
- workflow ID
- group reference
- run status
- start/completion timestamps
- node IDs and node statuses
- optional artifact reference IDs

The route rejects raw runtime payload keys such as:

- `rawText`
- `displayText`
- `inputSnapshot`
- `outputSnapshot`
- `prompt`
- `apiKey`
- `providerKey`
- `dataUrl`
- `binary`

This keeps the durable trace event useful for debugging without turning observability into a prompt, model output, or binary artifact store.

## Permission Boundary

The write route calls:

```text
assertObservabilityAccess({
  action: "workflow.trace.write",
  trace,
  workspaceId
})
```

This requires editor or higher by the R22-15 permission matrix.

Viewer denial still emits security audit evidence, but does not write a `workflow.runtime_lite.*` event.

The route explicitly disables API idempotency because this endpoint is an append-only observability log path. Requiring `X-Idempotency-Key` here would create client-side friction before the runtime-to-cloud bridge is ready.

## Next Gate

RuntimeLite run completion now publishes to the route through:

```text
RuntimeLite run completed -> sanitized run summary -> POST /api/v1/workflows/runtime-trace
```

The run stores `traceSync` status locally so the UI can show whether durable trace persistence is syncing, synced, or failed.

## Trace Correlation

The Trace panel correlates durable backend events with the latest local run:

```text
latestRun.traceSync.traceId -> GET /api/v1/observability/events?traceId=...
```

Then the panel highlights whether a matching `workflow.runtime_lite.*` event exists next to local evidence.

Correlation statuses:

- `no-local-run`
- `local-only`
- `syncing`
- `failed`
- `synced-unloaded`
- `matched`
- `missing`

This is intentionally separate from the local runtime snapshot. `Local Workflow Evidence` can exist before durable persistence; `Durable Trace Match` proves whether backend observability has the matching event.

## Verification

```text
npm test -- src/lib/backend/observability/workflow-runtime-events.test.ts src/lib/backend/observability/observability-service.test.ts src/lib/workflow-runtime-lite/runner.test.ts
```

Result: passed, 3 files / 28 tests.

```text
npm run typecheck
```

Result: passed.

R22-17 bridge verification:

```text
npm test -- src/lib/workflow-runtime-lite/trace-client.test.ts src/lib/workflow-pro/runtime-evidence.test.ts src/store/nexus-store.test.ts src/app/api/v1/workflows/runtime-trace/route.test.ts
```

Result: passed, 4 files / 35 tests.

```text
npm run typecheck
```

Result: passed.

R22-18 durable trace correlation verification:

```text
npm test -- src/lib/workflow-pro/runtime-trace-correlation.test.ts src/lib/workflow-runtime-lite/trace-client.test.ts src/lib/workflow-pro/runtime-evidence.test.ts src/store/nexus-store.test.ts src/app/api/v1/workflows/runtime-trace/route.test.ts
```

Result: passed, 5 files / 39 tests.

```text
npm run typecheck
```

Result: passed.

Screen verification:

```text
Chrome / localhost:3000 / Trace panel shows Durable Trace Match above Local Workflow Evidence.
```

R22-16 route verification:

```text
npm test -- src/app/api/v1/workflows/runtime-trace/route.test.ts src/app/api/v1/observability/observability-route-helpers.test.ts src/lib/backend/observability/workflow-runtime-events.test.ts src/lib/backend/observability/observability-service.test.ts
```

Result: passed, 4 files / 18 tests.

```text
npm run typecheck
```

Result: passed.
