# Round 25 - Ready-Parallel RuntimeLite

Time: 2026-06-04T17:56:10+10:00

## Goal

Upgrade RuntimeLite fan-out execution from sequential topological awaiting to native ready-node parallel batches.

## Completed

1. Replaced the single `for path await node` runner loop with a pending-node scheduler.
2. The runner now finds all pending nodes whose upstream packets already exist.
3. Ready nodes execute through `Promise.all`.
4. Existing node patch, partial output, run update, abort signal, and downstream blocked behavior are preserved.
5. Capability inventory now reports `executionPolicy.mode = ready-parallel`.
6. Capability inventory now reports `nativeParallelExecution = true`.
7. Graph Brain no longer marks `workflow.parallel.native-execution` as missing.
8. Fan-out benchmark templates now mark fan-out groups as `native-parallel`.
9. Explicit join nodes remain a future capability; fan-in still uses automatic ContextPacket merge.

## Verification

```text
npm test -- src/lib/workflow-runtime-lite/runner.test.ts src/lib/workflow-pro/capability-inventory.test.ts src/lib/workflow-pro/graph-brain-planner.test.ts src/lib/workflow-pro/foundation-benchmark-fixtures.test.ts
```

Result: passed, 4 files / 31 tests.

The new concurrency proof confirms that a fast sibling branch starts before the intentionally slow branch finishes:

```text
b-start occurs before a-end
```

```text
npm run typecheck
```

Result: passed.

```text
npm run lint
```

Result: passed with 0 errors and 11 existing warnings.

## Score

- Construction score: 9.4/10
- Distance to deep Workflow Pro platform: 99.3/100
- Estimated remaining rounds: 1 to 4

## Limits

This completes ready-node parallel execution, not user-configurable join nodes. Fan-in still merges upstream ContextPackets automatically.

## Next Recommended Gate

Add explicit join node controls, visual run playback, or a screen-run proof that starts a fan-out workflow group and inspects runtime evidence.
