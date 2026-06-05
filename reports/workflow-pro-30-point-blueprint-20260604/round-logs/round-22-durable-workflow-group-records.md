# Round 22 - Durable Workflow Group Records

Time: 2026-06-04T17:37:20+10:00

## Goal

Make newly appended Workflow Pro groups leave a durable backend traceable record, instead of existing only inside the local workspace snapshot.

## Completed

1. Added `nexus.workflowPro.groupRecord.v1`.
2. Added `workflow.group_record.upserted` backend events.
3. Added `POST /api/v1/workflows/groups`.
4. Stored group records through `system_events` / ObservabilityService, avoiding a risky new table migration during this pass.
5. Required editor role for group record writes.
6. Denied viewer writes and verified that security evidence is emitted.
7. Rejected raw payload keys including `rawText`, `displayText`, `inputSnapshot`, `outputSnapshot`, `prompt`, `dataUrl`, `binary`, `apiKey`, `providerKey`, `token`, and `secret`.
8. Added a client helper that turns one RuntimeLite group into a narrow payload.
9. Connected `appendWorkflowRuntimeGroup` to publish the group record in the background.
10. Kept canvas append non-blocking if durable record publication fails.

## Verification

```text
npm test -- src/lib/backend/observability/workflow-group-records.test.ts src/app/api/v1/workflows/groups/route.test.ts src/lib/workflow-pro/group-record-client.test.ts src/store/nexus-store.test.ts
```

Result: passed, 4 files / 35 tests.

```text
npm run typecheck
```

Result: passed.

```text
npm run lint
```

Result: passed with 0 errors and 11 existing warnings.

Screen verification:

```text
Chrome / localhost:3000 remained loaded.
Workflow groups remain visible on the canvas and Trace panel remains available.
```

## Score

- Construction score: 9.3/10
- Distance to deep Workflow Pro platform: 98/100
- Estimated remaining rounds: 3 to 7

## Limits

This records durable group metadata as observability events. It does not yet provide a dedicated UI query filtered by workflow group ID, nor a separate normalized workflow groups table.

## Next Recommended Gate

Add a group-level durable event reader in the Trace panel, or implement the first real compiler adapter behind `nexus.attachmentCompilerManifest.v1`.
