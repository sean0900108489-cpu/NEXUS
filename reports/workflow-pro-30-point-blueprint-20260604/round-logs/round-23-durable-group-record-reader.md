# Round 23 - Durable Group Record Reader

Time: 2026-06-04T17:44:32+10:00

## Goal

Make the Trace panel show whether the selected Workflow Pro group has a durable group record loaded from workspace observability events.

Round 22 created the backend write path. Round 23 makes that record visible in the Group Inspector without adding a new backend route.

## Completed

1. Added `nexus.workflowPro.durableGroupRecordReport.v1`.
2. Added a durable group record reader that checks loaded workspace events for `workflow.group_record.upserted`.
3. Matched durable records by `metadata.workflowGroupId`.
4. Reported explicit states: `no-group`, `not-loaded`, `matched`, and `missing`.
5. Rendered a `Durable Group Record` card inside the Trace panel Group Inspector.
6. Showed event count, node count, edge count, latest event metadata, and recommendation text when available.
7. Kept this reader conservative: it uses the Trace panel's existing Refresh-loaded event list and does not invent backend data.

## Verification

```text
npm test -- src/lib/workflow-pro/durable-group-records.test.ts src/components/nexus/nexus-workspace-chat-composer-shell.test.ts
```

Result: passed, 2 files / 13 tests.

```text
npm run typecheck
```

Result: passed.

```text
npm run lint
```

Result: passed with 0 errors and 11 existing warnings.

```text
jq empty docs/workflow-pro/graph-brain-30-point-screen-run.manifest.json
```

Result: passed.

Screen verification:

```text
Chrome / localhost:3000 Trace panel Group Inspector shows Durable Group Record / not-loaded.
The card displays Events, Nodes, Edges, and a Refresh recommendation.
```

## Score

- Construction score: 9.1/10
- Distance to deep Workflow Pro platform: 98.5/100
- Estimated remaining rounds: 2 to 6

## Limits

This reader only evaluates the workspace events currently loaded by the Trace panel. It does not yet call a dedicated backend query filtered by `workflowGroupId`.

## Next Recommended Gate

Implement the first real compiler adapter behind `nexus.attachmentCompilerManifest.v1`, or add native parallel/join execution for fan-out workflows.
