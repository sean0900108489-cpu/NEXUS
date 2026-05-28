# NEXUS V15 Implementation Checkpoint

Updated: 2026-05-28 20:13:28 AEST

## Current Phase

- Phase 0 preflight scan completed.
- No V15 implementation code has been edited yet.
- This checkpoint file was created as the user-requested shutdown/resume note.

## Files Read / Inspected

- `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md` fully read.
- `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md` was absent before this checkpoint.
- `git status --short` and `git diff --stat` checked.
- `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md` inspected for state, sync, history, memory, and snapshot boundaries.
- `NEXUS_ITERATION_UPGRADE_RANKING.md` inspected for V15/V16/V18 ranking and dependency ordering.
- `ARCHITECTURE.md` and `NEXUS_ARCHITECTURE_BLUEPRINT.md` inspected for tiered state and persistence rules.
- Source sections inspected:
  - `src/store/nexus-store.ts`
  - `src/lib/nexus-types.ts`
  - `src/lib/workspace-kernel.ts`
  - `src/lib/backend/workspace/workspace-snapshot-serializer.ts`
  - `src/lib/state-sync.ts`
  - `src/lib/sync/local-sync-queue-adapter.ts`
  - `src/lib/backend/sync/sync-operation-applier.ts`
  - `src/lib/backend/history/historical-data-fetcher.ts`
  - `src/lib/backend/history/message-history-service.ts`
  - `src/lib/backend/history/message-repository.ts`
  - `src/lib/backend/history/agent-memory-record-repository.ts`
  - `src/lib/backend/history/history-constants.ts`
  - `src/app/api/v1/agents/[agentId]/messages/route.ts`
  - `src/app/api/v1/agents/[agentId]/messages/archive/route.ts`
  - `src/app/api/v1/agents/[agentId]/memory/route.ts`
  - `src/app/api/v1/sync/operations/route.ts`
  - `src/lib/backend/sync/sync-queue-service.ts`
  - `src/app/api/v1/workspaces/[workspaceId]/state/route.ts`
  - `src/lib/backend/workspace/workspace-state-service.ts`
  - `src/lib/backend/workspace/workspace-snapshot-repository.ts`
  - `src/lib/api/nexus-api-client.ts`
  - `src/components/nexus/nexus-ops.tsx`

## Files Changed

- `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md` created.
- No implementation files changed yet.

## Commands Run

- `sed -n '1,220p' NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`
- `sed -n '220,460p' NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`
- `sed -n '460,760p' NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`
- `sed -n '1,240p' NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md` failed because the file did not exist yet.
- `git status --short`
- `git diff --stat`
- `wc -l NEXUS_TOTAL_ARCHITECTURE_SCAN1.md NEXUS_ITERATION_UPGRADE_RANKING.md ARCHITECTURE.md NEXUS_ARCHITECTURE_BLUEPRINT.md`
- `rg -n "Tiered State|persist|IndexedDB|localStorage|historicalMessages|message|memory|SyncOperationApplier|workspace snapshot|cloud snapshot|V15|Active State" NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`
- `rg -n "V15|Active State|ranking|persistence|message|memory|sync|snapshot" NEXUS_ITERATION_UPGRADE_RANKING.md`
- `rg -n "Tiered State|Historical Messages|localStorage|IAsyncDataFetcher|IStateSyncManager|messages|memory|snapshots|sync" ARCHITECTURE.md NEXUS_ARCHITECTURE_BLUEPRINT.md`
- `rg -n "messages:|memory:|historicalMessages|prepareWorkspacesForLocalPersistence|partialize|version:" src/store src/lib`
- `rg -n "syncActiveUiState|insertMessage|fetchHistoricalMessages|fetchHistoricalArtifacts" src/lib src/app`
- `rg -n "WorkspaceSnapshot|WorkspaceCloudSnapshot|messageWindow|messageRefs" src/lib`
- Focused `sed` and `rg` reads of the source files listed above.
- `date '+%Y-%m-%d %H:%M:%S %Z'`

## Phase 0 Findings

- Zustand persist version is currently `13`.
- `historicalMessages` is runtime-only and excluded from persisted Zustand state.
- `prepareWorkspacesForLocalPersistence(state.workspaces)` is the local persistence shaping boundary.
- `NexusAgent.messages` and `NexusAgent.memory` are still inside persisted workspaces.
- `createActiveUiStateSnapshot` passes full agents into state sync.
- Cloud snapshots cap message refs at `WORKSPACE_SNAPSHOT_MESSAGE_REF_LIMIT = 8`.
- Cloud snapshots still include full `agent.memory`.
- `HistoricalDataFetcher.fetchHistoricalMessages` reads `/api/v1/agents/[agentId]/messages`.
- `HistoricalDataFetcher.fetchHistoricalArtifacts` returns an empty page.
- Message archive route exists, but it archives repository records that already exist.
- `SyncOperationApplier` applies only `workspace` `snapshot`; `agent`, `message`, `prompt`, `notebook`, and `artifact_reference` return `queued`.
- Memory repository has insert/list support, but the API surface read in Phase 0 exposes only `GET /api/v1/agents/[agentId]/memory`.

## Trace Chains

### Active Message Write / Finish

UI action:
`AgentWindow.submit` / media generation / tool result in `src/components/nexus/nexus-ops.tsx`

Zustand:
`addMessage`, `appendToMessage`, `appendReasoningToMessage`, `finishMessage`, `runTool` in `src/store/nexus-store.ts`

registry/type:
`AgentMessage`, `NexusAgent.messages`, `SyncEntityType = "message"`, `MessageHistoryRecord`, `MessageHistoryPageResponse`

nexusApiClient/state-sync:
`queueMessageCloudSync` -> `supabaseStateSyncManager.insertMessage`

/api/v1:
`localSyncQueueAdapter.flushOperation` -> `POST /api/v1/sync/operations`

apiHandler:
`src/app/api/v1/sync/operations/route.ts`

service:
`SyncQueueService.createOperation` -> `tryApply`

repository:
`SyncOperationRepository`

observability/sync projection:
`SyncQueueService.emitSyncEvent` emits `sync.operation.status`

Current break:
`SyncOperationApplier` returns `queued` for `message`.

V15 gate:
Destructive trimming or dropping older persisted messages is blocked unless a durable read/write/archive path is proven later. For now, message diet must be conservative and no-data-loss.

### Workspace Layout / Settings / Active Cloud Snapshot

UI action:
move/resize/minimize/select/edit workspace settings in `nexus-ops.tsx`

Zustand:
workspace mutations -> `queueWorkspaceCloudSync` -> `createActiveUiStateSnapshot`

registry/type:
`NexusWorkspace`, `ActiveUiStateSnapshot`, `WorkspaceCloudSnapshotPayload`

nexusApiClient/state-sync:
`SupabaseStateSyncManager.syncActiveUiState`

/api/v1:
`localSyncQueueAdapter.flushOperation` -> `POST /api/v1/sync/operations`; checksum fetch may call `GET /api/v1/workspaces/[workspaceId]/state`

apiHandler:
`src/app/api/v1/sync/operations/route.ts`; `src/app/api/v1/workspaces/[workspaceId]/state/route.ts`

service:
`SyncQueueService` -> `SyncOperationApplier` -> `WorkspaceStateService`

repository:
`WorkspaceSnapshotRepository`; projection through `WorkspaceStateEntityRepository`

observability/sync projection:
`sync.operation.status`; `workspace.state.snapshot`

V15 gate:
Complete chain for active workspace snapshots. Keep layout/settings locally persisted.

### Historical Message Read

UI action:
`AgentWindow` Load history button

Zustand:
`fetchHistoricalMessages(agentId)` updates `historicalMessages` runtime cache

registry/type:
`IAsyncDataFetcher`, `HistoricalDataQuery`, `HistoricalMessageRecord`, `MessageHistoryPageResponse`

nexusApiClient/state-sync:
`HistoricalDataFetcher.fetchHistoricalMessages` -> `nexusApiClient.get`

/api/v1:
`GET /api/v1/agents/[agentId]/messages`

apiHandler:
`src/app/api/v1/agents/[agentId]/messages/route.ts`

service:
`MessageHistoryService.listMessages`

repository:
`MessageRepository`

observability/sync projection:
`history.messages.page`; Zustand `historicalMessages` runtime cache

V15 gate:
Complete read chain. Keep `historicalMessages` non-persisted.

### Memory Edit / Durable Memory

UI action:
Right Intel memory textarea

Zustand:
`updateMemoryBlock(agentId, memoryId, content)`

registry/type:
`AgentMemoryBlock`, `AgentMemoryRecordType`, `AgentMemoryRecordsResponse`

nexusApiClient/state-sync:
No durable memory write path found from store/state-sync.

/api/v1:
`GET /api/v1/agents/[agentId]/memory` exists for reads only.

apiHandler:
memory GET route uses `apiHandler`.

service:
`MessageHistoryService.listMemoryRecords`

repository:
`AgentMemoryRecordRepository`

observability/sync projection:
`history.memory.page`

Current break:
No traced memory write/update route from active memory edits.

V15 gate:
Do not remove full active memory from local persistence or cloud snapshots until a bounded active-memory policy or durable write path is proven. Mark stricter memory diet as V18 dependency if needed.

### Local Persistence Serializer

Trace chain: N/A local-only

Reason:
`prepareWorkspacesForLocalPersistence` shapes Zustand persist output for IndexedDB/localStorage fallback. It is not an API/service/repository behavior.

Risk:
This must not become a hidden durable transcript source of truth. Until message and memory durability are proven, local persistence changes must preserve user-visible messages and memory or be future-only and explicitly documented.

### Export / Import Workspace

Trace chain: N/A local-only

Reason:
`exportActiveWorkspace` and `importWorkspace` use `workspace-kernel` validation/sanitization and local file boundaries.

Risk:
Export/import can carry full active messages. Backward compatibility and secret stripping must remain intact.

### Provider Credential Safety

Trace chain: N/A local-only for persistence diet

Reason:
Credentials live in `authVault`; provider verify is not part of the V15 local persistence diet batch.

Risk:
No V15 serializer/snapshot/sync payload may move `apiKey`, `baseUrl`, tokens, or auth headers into agents, messages, memory, snapshots, logs, or observability metadata.

## Test Results

- No tests run yet. Phase 0 was read-only scan plus checkpoint creation.

## Blockers / Needs Verification

- Message durability is not proven because `SyncOperationApplier` returns `queued` for `message`.
- Durable memory write/update trace is incomplete. Memory GET exists; memory repository insert exists; no active UI write route/state-sync path was found.
- `fetchHistoricalArtifacts` returns an empty page and is out of scope unless V15 touches artifact persistence.
- Any Next.js route/server edit would require reading the relevant local Next docs under `node_modules/next/dist/docs/` before code changes.

## Next Safe Step

1. Enter Phase 1 and choose the V15 data policy.
2. Keep message policy conservative: no destructive trim of existing messages.
3. Keep memory policy conservative or explicitly mark stricter memory diet as blocked by durable write trace.
4. Draft Phase 2 serializer/migration design before editing implementation files.
5. Update this checkpoint before the first implementation edit.

## Phase 1 Data Policy Draft

- Active message window target: reuse `ACTIVE_WINDOW_DEFAULT_LIMIT = 80` and `ACTIVE_WINDOW_MAX_LIMIT = 250` from `src/lib/backend/history/history-constants.ts`.
- Active message enforcement in V15: conservative preserve-full mode. Do not trim existing or future local persisted active messages while `SyncOperationApplier` still returns `queued` for `message`.
- Omitted older message representation in V15: `omittedCount = 0` and `durability = needs_sync_operation_applier_message_projection`.
- Historical messages: keep using `historicalMessages` as runtime-only cache loaded by `HistoricalDataFetcher`; never persist it.
- Active memory cap in V15: conservative preserve-full mode. Do not trim active memory while active UI memory edits have no traced durable write/update route.
- Memory omitted representation in V15: `omittedBlockCount = 0` and `durability = needs_memory_write_route`.
- Export/import: keep `WorkspaceSnapshot.schemaVersion = 1` and keep full active messages/memory for backward compatibility and no-data-loss.
- Cloud snapshots: keep existing bounded message refs. Do not remove full cloud memory in this V15 batch; classify stricter memory diet as blocked by durable memory write verification.
- Provider credentials: no change; secrets stay in `authVault` and must not enter messages/memory/snapshots/sync payloads.

## Phase 2 Serializer / Migration Design Draft

- Target boundary: `prepareWorkspacesForLocalPersistence` remains the only Zustand persist shaping boundary.
- Planned helper names:
  - `prepareAgentForLocalPersistence`
  - `prepareMessagesForLocalPersistence`
  - `prepareMemoryForLocalPersistence`
  - `createMessageRetentionMetadata`
  - `createMemoryRetentionMetadata`
- Planned type addition: optional per-agent local persistence metadata on `NexusAgent`, recording V15 policy, retained counts, omitted counts, target limits, and the blocked durability reason.
- Planned local persistence behavior:
  - preserve all current `agent.messages`;
  - preserve all current `agent.memory`;
  - attach metadata proving no messages/memory were omitted;
  - keep layout, panels, graph, theme, model settings, selected/active agent ids, notebooks, auth vault, and transaction history behavior stable.
- Planned persist version: bump Zustand persist `version` from `13` to `14` because the persisted workspace shape gains optional metadata.
- Planned migration behavior:
  - normalize old workspaces first;
  - pass migrated workspaces through the new local persistence serializer;
  - keep `historicalMessages` reset/non-persisted;
  - preserve active workspace selection, layout, panels, graph, notebooks, auth vault, import errors, and bounded transaction history.
- Planned tests:
  - add a focused store persistence helper test proving messages and memory are preserved and metadata marks durability as not yet proven;
  - run the targeted test before broader verification.

## Mandatory Post-Phase-2 Gate

Before editing `src/store/nexus-store.ts`, `src/lib/nexus-types.ts`, or tests, reread:

- `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`
- `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`
- `NEXUS_ITERATION_UPGRADE_RANKING.md`
- exact source sections being edited

Then restate the trace chains and no-data-loss decision.

Gate status: completed before first implementation edit.

No-data-loss decision restated:

- Message write trace reaches the sync queue but not durable message projection; preserve all active messages in local persistence.
- Memory edit trace does not have a durable write/update route; preserve all active memory blocks in local persistence and cloud snapshots.
- The first implementation batch may add local persistence metadata and migration normalization only.
- No `/api/v1` route, Next.js route handler, repository write, second sync queue, second transcript store, or credential persistence change is allowed in this batch.

## Batch 1 Result

Updated: 2026-05-28 20:26:22 AEST

Files changed:

- `src/lib/nexus-types.ts`
- `src/store/nexus-store.ts`
- `src/store/nexus-store.test.ts`
- `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md`

Implementation summary:

- Added optional `AgentLocalPersistenceMetadata` to classify message and memory local persistence policy.
- Updated `prepareWorkspacesForLocalPersistence` to call focused helpers and attach preserve-full retention metadata.
- Bumped Zustand persist `version` from `13` to `14`.
- Updated migration to pass old workspaces through the V15 local persistence serializer.
- Added a focused serializer test proving messages and memory are preserved and metadata marks durability as unproven.

No-data-loss status:

- Active messages are preserved with `omittedCount = 0`.
- Active memory blocks are preserved with `omittedBlockCount = 0`.
- `historicalMessages` remains non-persisted.
- No cloud memory trimming, route edit, applier edit, or new durable store was added.

Commands run after Batch 1:

- `npm test -- src/store/nexus-store.test.ts --runInBand` failed because Vitest 4 does not support `--runInBand`.
- `npm test -- src/store/nexus-store.test.ts` initially failed because the test expected exact graph equality before `runtimeLite` normalization; this was fixed.
- `npm test -- src/store/nexus-store.test.ts` passed: 1 file, 2 tests.
- `npm run typecheck` passed.
- `npm run lint -- src/lib/nexus-types.ts src/store/nexus-store.ts src/store/nexus-store.test.ts` passed.

Next safe step:

- Run targeted existing snapshot/export tests: `src/lib/workspace-kernel.test.ts` and `src/lib/backend/workspace/workspace-state.test.ts`.
- If those pass, update docs for the V15 state contract and checkpoint again.

## Batch 2 Documentation / Verification Result

Updated: 2026-05-28 20:30:30 AEST

Files changed:

- `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`
- `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`
- `NEXUS_CODEX_EXECUTION_MAP.md`
- `NEXUS_ITERATION_UPGRADE_RANKING.md`
- `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md`

Documentation-only trace:

- Trace chain: N/A local-only
- Reason: docs were updated to reflect the V15 conservative metadata implementation and remaining `Needs verification` boundaries.
- Risk control: no runtime behavior, route, repository, sync queue, or persisted user data was changed in this batch.

Verification after Batch 2:

- `npm test -- src/lib/workspace-kernel.test.ts src/lib/backend/workspace/workspace-state.test.ts` passed: 2 files, 32 tests.
- `npm test -- src/store/nexus-store.test.ts src/lib/workspace-kernel.test.ts src/lib/backend/workspace/workspace-state.test.ts` passed: 3 files, 34 tests.
- Earlier Batch 1 verification remains valid after docs-only changes:
  - `npm test -- src/store/nexus-store.test.ts` passed.
  - `npm run typecheck` passed.
  - `npm run lint -- src/lib/nexus-types.ts src/store/nexus-store.ts src/store/nexus-store.test.ts` passed.

Current status:

- V15 conservative Active State Hygiene and Local Persistence Diet is implemented.
- No user-visible message or memory data is trimmed.
- Persist version is now `14`.
- `historicalMessages` remains runtime-only.
- Remaining dependencies are V16 message sync projection and V18 memory lifecycle/write path.

Next safe step:

- Optional broader verification: full `npm test -- --run`, full `npm run lint`, and build/check when machine load is acceptable.
- If continuing architecture work, start V16 rather than adding destructive trimming under V15.

## Final Verification Addendum

Updated: 2026-05-28 20:31:57 AEST

Additional commands:

- `npm test` passed: 23 files, 178 tests.
- `npm run lint` passed.

Verification not run:

- `npm run build` was not run because V15 requested low-load, targeted-first verification and the documented V15 command set was covered by tests, typecheck, and lint.

Final next safe step:

- V15 is complete at conservative metadata scope.
- Proceed to V16 sync operation applier completion before enabling destructive active message trimming.

## Batch 3 Migration Test Addendum

Updated: 2026-05-28 20:49:57 AEST

Files changed:

- `src/store/nexus-store.test.ts`
- `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md`

Test-only trace:

- Trace chain: N/A test-only
- Reason: this batch adds coverage for Zustand persist rehydrate/migration behavior using a custom in-memory persist storage.
- Risk control: no runtime code, route, repository, sync queue, or persisted user data behavior changed in this batch.

Implementation summary:

- Added a v13 -> v14 rehydrate test that feeds a legacy persisted workspace payload into `useNexusStore.persist.rehydrate()`.
- Verified active messages and active memory survive migration.
- Verified V15 local persistence metadata is attached after migration.
- Verified `historicalMessages` resets to runtime-only empty state.
- Verified transaction history remains bounded at 100.
- Verified migration writes back through persist storage with version `14`.

Commands run after Batch 3:

- `npm test -- src/store/nexus-store.test.ts` initially failed because the test expected a stale open notebook id to survive the post-rehydrate notebook cache refresh; the assertion was removed because that behavior is outside V15 persistence diet.
- `npm test -- src/store/nexus-store.test.ts` passed: 1 file, 3 tests.
- `npm run typecheck` passed.
- `npm run lint -- src/store/nexus-store.test.ts` passed.

Next safe step:

- Re-run full `npm test` only if desired; the new migration coverage has already passed at targeted scope.
