# NEXUS V15 Active State Hygiene and Local Persistence Diet

Generated: 2026-05-28
Status: implemented conservative metadata pass; V16/V18 dependencies remain
Scope: active UI state hygiene, local persistence diet, local/cloud snapshot boundaries, no-data-loss migration rules, and trace-chain gating for implementation.

This document is meant to be enough for Codex to complete the V15 upgrade by reading it, then reading the source files it names. It is documentation only until a later implementation pass changes code.

## 0. Use This File First

Before implementing V15, read this file from top to bottom, then read the named source files. During implementation, reread this file once more after Phase 2 and before changing persistence or migration logic. This second read is mandatory so the model does not forget the no-data-loss and trace-chain rules mid-run.

Use the exact local scan file name `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`. If another document references `NEXUS_TOTAL_ARCHITECTURE_SCAN.md`, resolve that reference to `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md` unless the project intentionally renames the file in a separate documentation cleanup.

Repo rule reminder: `AGENTS.md` says this is not the familiar Next.js version. If V15 touches `src/app/**`, route handlers, Server Components, Client Components, caching, or backend-for-frontend behavior, read the relevant local guide under `node_modules/next/dist/docs/` before code changes.

## 1. 起點敘述（依照目前的狀況）

V15 starts from a local-first NEXUS workspace where immediate UI interaction is driven by Zustand and persisted to IndexedDB through `src/store/nexus-store.ts`. The project already has backend domains for workspace snapshots, sync operations, message history, memory records, artifacts, observability, route envelopes, and typed API access.

The current architecture is already strongly schema-first and registry-first, but active state is still too heavy:

- `prepareWorkspacesForLocalPersistence` persists normalized `workspaces` as full active workspaces.
- `NexusAgent` still contains `messages: AgentMessage[]` and `memory: AgentMemoryBlock[]`.
- `historicalMessages` is correctly excluded from persisted Zustand state, but active `agent.messages` and `agent.memory` still ride inside persisted workspaces.
- `createActiveUiStateSnapshot` sends full `agents` into active cloud snapshot serialization.
- Cloud snapshot serialization is bounded for message refs, but still includes full `agent.memory`.
- Export/import snapshots still use `WorkspaceSnapshot` and can include the full active workspace.
- Backend message history reads exist through `/api/v1/agents/[agentId]/messages`.
- Backend message archive exists through `/api/v1/agents/[agentId]/messages/archive`.
- Backend memory reads exist through `/api/v1/agents/[agentId]/memory`, but memory write/update is not fully exposed as a route.
- `SyncOperationApplier` applies `workspace/snapshot`, while `agent`, `message`, `prompt`, `notebook`, and `artifact_reference` remain queued instead of fully projected.
- `HistoricalDataFetcher.fetchHistoricalMessages` is implemented; `fetchHistoricalArtifacts` currently returns an empty page.

The main risk is not a single broken function. The risk is that future work continues adding features while root active state stays an unbounded local database. That raises hydration cost, IndexedDB payload size, cloud snapshot pressure, import/export ambiguity, and future Codex confusion about which layer owns durable history.

## 2. 確定 Goal 描述

V15 Goal:

Make active UI state small, bounded, readable, and recoverable without losing user-visible messages, memory, workspace layout, provider safety, or future sync clarity.

V15 is successful when:

- Zustand remains the source of immediate active interaction, not the durable transcript database.
- Local persistence stores only bounded active windows and lightweight references where a durable or recoverable path exists.
- Historical messages stay behind `IAsyncDataFetcher` and backend history APIs.
- Workspace cloud snapshots remain bounded and do not grow with transcript length.
- Memory persistence is explicitly classified as active memory, durable memory, compressed memory, or `Needs verification`; no silent memory deletion is allowed.
- Import/export behavior is documented and backward compatible.
- Any migration bumps the Zustand persist version and preserves older user data safely.
- Every implementation step can draw the required trace chain before landing code.

V15 does not mean deleting chat history just to shrink storage. It means separating active UI windows from historical/durable records with clear migration, fallback, and verification rules.

## 3. Ranking Weight and Why V15 Is First

V15 inherited the top ranking from `NEXUS_ITERATION_UPGRADE_RANKING.md` with final score `9.5`.

| Dimension | Weight | V15 reason |
| --- | ---: | --- |
| Zero-friction future changes | 20% | Future work can find state, history, sync, import/export, and test boundaries without guessing. |
| Stability | 20% | Reduces data loss, local bloat, hydration errors, snapshot overflow, and hidden persistence growth. |
| Architecture logic | 20% | Clarifies active state vs durable history vs cloud projection. |
| Frontend/backend/function coupling | 15% | Forces UI action to store to API/service/repository traceability before code lands. |
| Frontend speed / UI hygiene | 10% | Shrinks persisted payload and hydration/render pressure from large message arrays. |
| Feature/extensibility value | 10% | Unlocks safer future history, memory, artifact, sync, and customization upgrades. |
| Codex execution readability | 5% | Gives Codex a stable map for state changes and no-duplicate rules. |

Recommended V15 internal effort split:

| Workstream | Weight | Output |
| --- | ---: | --- |
| State inventory and trace map | 20% | Confirm every active message/memory/layout path and mark complete vs incomplete chains. |
| State tier contract | 20% | Define active window, historical page cache, durable backend record, export snapshot, and cloud snapshot roles. |
| Local persistence diet | 20% | Bound persisted workspaces without deleting unrecoverable data. |
| Migration and backward compatibility | 15% | Persist version bump, legacy shape migration, import/export compatibility. |
| Sync/API safety | 10% | Keep existing ports; do not create a second queue or bypass `nexusApiClient`/`state-sync`. |
| Tests and verification | 10% | Store persistence, serializer, workspace kernel, sync queue, history boundary tests. |
| Documentation and Codex readability | 5% | Update scan/execution docs after implementation. |

## 4. 過程描述

V15 should be implemented as a controlled diet, not a rewrite.

1. Read the current contracts and limits.
2. Draw the trace chain for every state mutation that will change.
3. Classify each data field into active, persisted active, historical fetched, durable backend, export-only, or cloud projection.
4. Add or adjust serializers and selectors before changing migrations.
5. Prove recoverability before trimming local persisted data.
6. Bump persisted schema version only after the new migration path is explicit.
7. Update tests around storage shape, migration, snapshots, history fetches, and secret boundaries.
8. Update docs so V16 and later work can see the new state contract.

V15 should prefer small local functions and existing interfaces over new architecture. If a new helper is needed, it should live next to the boundary it serves, such as store persistence helpers in `src/store/nexus-store.ts` or snapshot shaping in `src/lib/backend/workspace/workspace-snapshot-serializer.ts`.

## 5. 過程規則

These rules are hard gates. If a gate fails, do not land the code. Mark the missing link as `Needs verification` and either reduce the change to documentation/tests or schedule it as a V16/V18 dependency.

### Rule 1 - Mandatory Trace Chain

Before every code edit, draw the complete trace chain:

```text
UI action → Zustand → registry/type → nexusApiClient/state-sync → /api/v1 → apiHandler → service → repository → observability/sync projection
```

Expanded working form:

```text
UI action
  -> Zustand
  -> registry/type
  -> nexusApiClient/state-sync
  -> /api/v1
  -> apiHandler
  -> service
  -> repository
  -> observability/sync projection
```

If this chain cannot be drawn, do not implement that behavior.

If the change is truly local-only, export-only, or test-only, write:

```text
Trace chain: N/A local-only
Reason: <why no API/service/repository path exists or is needed>
Risk: <what keeps this from becoming a hidden durable source of truth>
```

Do not skip the chain silently.

### Rule 2 - No Data Loss

Do not remove, truncate, or stop persisting active messages or memory unless one of these is true:

- the same data is already durably written and readable through the backend path;
- the data is intentionally kept inside a bounded active window and older data is archived through an existing backend route;
- the migration preserves a fallback copy that can be restored or exported;
- the change is only a new cap for future records and does not delete old records.

Current warning: message writes through sync are not fully projected by `SyncOperationApplier`, because `message` operations currently return `queued`. Therefore, V15 must not assume every message is durably recoverable unless the implementation proves a specific backend write/read path.

### Rule 3 - No Shadow Stores

Do not create a second local sync queue, a duplicate transcript store, a parallel memory map, or a hidden local database. Use existing boundaries:

- active interaction: `src/store/nexus-store.ts`
- typed contracts: `src/lib/nexus-types.ts`
- extension sockets: `src/lib/nexus-registry.ts`
- API client: `src/lib/api/nexus-api-client.ts`
- sync port: `src/lib/state-sync.ts`
- durable local queue: `src/lib/sync/local-sync-queue-adapter.ts`
- backend history: `src/lib/backend/history/**`
- workspace snapshots: `src/lib/backend/workspace/**`

### Rule 4 - Secret Safety

Provider credentials belong in `authVault` and secret-boundary services. Do not move `apiKey`, `baseUrl`, authorization headers, or provider secrets into agents, workspace snapshots, logs, sync payloads, messages, memory, artifacts, or observability metadata.

Existing `workspace-kernel` tests already verify that agent-level `apiKey` and `baseUrl` are stripped from snapshots. Keep that invariant.

### Rule 5 - Persist Version Discipline

Any persisted shape change in Zustand must:

- bump `version` in the persist middleware;
- migrate old shapes conservatively;
- keep `historicalMessages` non-persisted;
- keep `transactionHistory` bounded;
- preserve active workspace selection, layout, panels, view mode, notebooks, auth vault, and import errors unless intentionally changed.

### Rule 6 - Backend Scope Discipline

Do not sneak V16 into V15. If V15 discovers that full message durability requires completing `SyncOperationApplier` for `message`, stop and mark it as a dependency instead of building a partial duplicate path.

V15 may adjust frontend/state serializers and tests. It should only add backend routes or repository writes if the trace chain is complete and the new route follows existing `/api/v1` + `apiHandler` conventions.

### Rule 7 - Midway Context Refresh

After Phase 2 and before changing persistence, migration, or snapshot behavior, Codex must reread:

- this file;
- `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`;
- `NEXUS_ITERATION_UPGRADE_RANKING.md`;
- the exact source files being edited.

Then restate the active trace chains and no-data-loss decision in its working notes before continuing.

## 6. Source Files To Read Before Editing

Read these in order:

1. `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`
2. `NEXUS_ITERATION_UPGRADE_RANKING.md`
3. `ARCHITECTURE.md`
4. `NEXUS_ARCHITECTURE_BLUEPRINT.md`
5. `src/store/nexus-store.ts`
6. `src/lib/nexus-types.ts`
7. `src/lib/workspace-kernel.ts`
8. `src/lib/backend/workspace/workspace-snapshot-serializer.ts`
9. `src/lib/state-sync.ts`
10. `src/lib/sync/local-sync-queue-adapter.ts`
11. `src/lib/backend/sync/sync-operation-applier.ts`
12. `src/lib/backend/history/historical-data-fetcher.ts`
13. `src/lib/backend/history/message-history-service.ts`
14. `src/app/api/v1/agents/[agentId]/messages/route.ts`
15. `src/app/api/v1/agents/[agentId]/messages/archive/route.ts`
16. `src/app/api/v1/agents/[agentId]/memory/route.ts`

If V15 edits route handlers or app/server boundaries, also read the relevant local Next.js 16 docs under `node_modules/next/dist/docs/`.

## 7. Current Evidence Map

| Evidence | Current status | V15 implication |
| --- | --- | --- |
| Zustand persist name | `nexus-ai-ops-workspace` | Migration must preserve this store and version forward. |
| Persist version | `14` after V15 conservative metadata pass | Started at `13`; V15 bumped after adding optional local persistence metadata. |
| Local storage engine | IndexedDB via `idb-keyval`, localStorage fallback | Migration must handle both persisted shapes. |
| Persisted workspaces | `prepareWorkspacesForLocalPersistence(state.workspaces)` with focused V15 helpers | Main V15 target; now classifies messages/memory before local persistence. |
| Local persistence metadata | `NexusAgent.localPersistence` | Records preserve-full message/memory policy, retained counts, omitted counts, target limits, and blocked durability reasons. |
| Active messages | `NexusAgent.messages` inside workspace, preserved full with `omittedCount = 0` | Must not be trimmed until durable message projection is proven. |
| Active memory | `NexusAgent.memory` inside workspace and cloud snapshot, preserved full with `omittedBlockCount = 0` | Durable memory write route remains `Needs verification`; stricter diet is blocked. |
| Historical message cache | `historicalMessages` reset and excluded from persist | Keep this behavior. |
| Cloud message refs | last `8` refs in `WorkspaceCloudSnapshotAgent.messageWindow` | Good existing diet pattern. |
| Cloud memory | full `agent.memory` in workspace snapshot serializer | V15 should classify and bound this. |
| History page limit | default `50`, max `100` | Use for fetched history pages, not active UI persistence. |
| Active archive window | default `80`, max `250` | Candidate cap for active message windows if backend archive/read path is verified. |
| Message sync applier | `message` operations return `queued` | Do not treat sync queue as durable projected history. |
| Memory route | GET only | Memory write/update trace is incomplete. |
| Artifact historical fetch | returns empty page | Out of scope unless V15 touches artifact persistence. |

## 8. State Tier Contract

V15 must preserve these tiers:

| Tier | Owner | May persist locally? | May grow unbounded? | Rule |
| --- | --- | ---: | ---: | --- |
| Active UI window | Zustand workspace | Yes, bounded | No | Current visible/interactive state only. |
| Historical page cache | `historicalMessages` + `IAsyncDataFetcher` | No | No | Runtime cache only, fetched through backend. |
| Durable message history | backend history service/repository | Backend only | Controlled by paging/archive | Do not duplicate in root Zustand. |
| Active memory | agent memory used by UI/runtime | Yes, bounded or summarized | No | Must have explicit cap and no secret leakage. |
| Durable/compressed memory | backend memory repository | Backend only | Controlled by repository limits | Do not assume write path exists until traced. |
| Cloud active snapshot | `IStateSyncManager` + workspace serializer | Backend projection | No | Store refs/windows, not full history. |
| Export/import snapshot | `workspace-kernel` | User file | Can be larger, but validated | Backward compatible, secrets stripped. |
| Sync queue payload | `localSyncQueueAdapter` | Yes, temporary | No | Existing cap and secret scan must remain. |

## 9. Required Trace Templates

Use these templates while planning and editing. Update them with exact function names if implementation changes.

### 9.1 Active Message Write / Finish

```text
UI action:
  AgentWindow submit / streaming finish
Zustand:
  addMessage / appendMessage / finishMessage path in src/store/nexus-store.ts
registry/type:
  AgentMessage, NexusAgent.messages, HistoricalMessageRecord, MessageHistoryPageResponse
nexusApiClient/state-sync:
  queueMessageCloudSync -> supabaseStateSyncManager.insertMessage
/api/v1:
  localSyncQueueAdapter -> /api/v1/sync/operations, or a verified history route if one exists
apiHandler:
  sync operations route or message history route must use apiHandler unless streaming/special
service:
  SyncQueueService or MessageHistoryService
repository:
  SyncOperationRepository or MessageRepository
observability/sync projection:
  sync status, history events, fetched historicalMessages cache
Current break:
  SyncOperationApplier returns queued for message operations.
V15 decision:
  Do not hard-drop older persisted messages unless durable message read/write is proven or archive fallback is added through existing backend contracts.
```

### 9.2 Workspace Layout / Settings Snapshot

```text
UI action:
  move/resize/minimize agent, edit settings, change panel/view/theme
Zustand:
  withActiveWorkspace + queueWorkspaceCloudSync
registry/type:
  NexusWorkspace, ActiveUiStateSnapshot, WorkspaceCloudSnapshotPayload
nexusApiClient/state-sync:
  SupabaseStateSyncManager.syncActiveUiState
/api/v1:
  /api/v1/sync/operations or workspace state route, depending on current state-sync implementation
apiHandler:
  governed /api/v1 route
service:
  SyncQueueService -> SyncOperationApplier -> WorkspaceStateService
repository:
  WorkspaceSnapshotRepository / Supabase
observability/sync projection:
  workspace state event, sync operation status, cloud checksum/projection
V15 decision:
  Keep layout/settings in active persistence. Diet messages/memory, not core workspace control state.
```

### 9.3 Historical Message Read

```text
UI action:
  open/load older messages
Zustand:
  fetchHistoricalMessages(agentId) updates historicalMessages runtime cache
registry/type:
  IAsyncDataFetcher, HistoricalDataQuery, HistoricalMessageRecord
nexusApiClient/state-sync:
  HistoricalDataFetcher -> nexusApiClient.get
/api/v1:
  GET /api/v1/agents/[agentId]/messages
apiHandler:
  apiHandler in messages route
service:
  MessageHistoryService.listMessages
repository:
  MessageRepository
observability/sync projection:
  history.messages.page event, cache result in historicalMessages
V15 decision:
  Keep this as the read path for old transcript pages. Do not persist historicalMessages in Zustand.
```

### 9.4 Memory Edit / Compression

```text
UI action:
  edit agent memory or memory compression result
Zustand:
  updateMemoryBlock / memory-related active workspace mutation
registry/type:
  AgentMemoryBlock, AgentMemoryRecordType, AgentMemoryRecordsResponse
nexusApiClient/state-sync:
  currently incomplete for durable memory write
/api/v1:
  GET /api/v1/agents/[agentId]/memory exists; write/update route must be verified before use
apiHandler:
  memory GET route uses apiHandler
service:
  MessageHistoryService.listMemoryRecords
repository:
  AgentMemoryRecordRepository
observability/sync projection:
  history.memory.page event, active workspace/cloud snapshot memory projection
Current break:
  Durable memory write/update trace is incomplete.
V15 decision:
  Do not remove full active memory from local persistence or cloud snapshots until a bounded active-memory policy or durable write path is implemented and tested.
```

### 9.5 Export / Import Workspace

```text
UI action:
  exportActiveWorkspace / importWorkspace
Zustand:
  exportActiveWorkspace, importWorkspace
registry/type:
  WorkspaceSnapshot, NexusWorkspace, validateWorkspaceSnapshot
nexusApiClient/state-sync:
  N/A local-only
/api/v1:
  N/A local-only
apiHandler:
  N/A local-only
service:
  workspace-kernel validation/sanitization only
repository:
  local file boundary only
observability/sync projection:
  lastImportError and workspace state after import
Risk:
  Export/import can carry full active messages. If V15 changes snapshot shape, migration must be backward compatible and secrets must remain stripped.
```

### 9.6 Provider Credential Safety

```text
UI action:
  set global/provider API key or base URL
Zustand:
  authVault mutations
registry/type:
  provider registry, auth vault types
nexusApiClient/state-sync:
  N/A for local secret storage unless verification route is called
/api/v1:
  /api/v1/providers/verify is special direct JSON probe
apiHandler:
  N/A for provider verify currently
service:
  provider verification service if routed there
repository:
  no workspace snapshot storage for raw secrets
observability/sync projection:
  redacted verification result only
V15 decision:
  Never move credentials into agents, messages, memory, snapshots, or logs during persistence diet work.
```

## 10. Implementation Phases

### Phase 0 - Preflight Scan

Output: a short working note with exact files and trace chains.

Steps:

1. Read the files in Section 6.
2. Run targeted searches:

```bash
rg -n "messages:|memory:|historicalMessages|prepareWorkspacesForLocalPersistence|partialize|version:" src/store src/lib
rg -n "syncActiveUiState|insertMessage|fetchHistoricalMessages|fetchHistoricalArtifacts" src/lib src/app
rg -n "WorkspaceSnapshot|WorkspaceCloudSnapshot|messageWindow|messageRefs" src/lib
```

3. Confirm current persist version and migration behavior.
4. Confirm current sync applier status for `message` and `memory`.
5. Mark each planned code edit as complete chain, local-only chain, or `Needs verification`.

Do not edit files in Phase 0.

### Phase 1 - Define V15 Data Policy

Output: exact names and limits for active state.

Decisions to make:

- active message window limit;
- whether to reuse `ACTIVE_WINDOW_DEFAULT_LIMIT` and `ACTIVE_WINDOW_MAX_LIMIT`;
- how to represent omitted older messages in active state, such as count, cursor, oldest retained id, or refs;
- active memory cap and summary policy;
- whether export snapshots keep full active messages or use a V15 export version marker;
- whether cloud snapshots should keep memory inline, summary-only, or refs.

Required judgment:

If older messages are not durably readable, V15 may only add future caps, warning metadata, or archival prompts. It must not silently discard old local-only messages.

### Phase 2 - Persistence Serializer Design

Output: serializer/migration plan before code.

Target boundary:

- `prepareWorkspacesForLocalPersistence` becomes the only place that shapes workspace data before local persistence.
- It should call focused helpers rather than mutate data in place.
- Helpers must preserve layout, model settings, panels, graph, theme, selection, provider ids, and active UI fields.
- Helpers must bound or classify `agent.messages` and `agent.memory`.
- `historicalMessages` stays excluded from `partialize`.

Potential helper names:

- `prepareAgentForLocalPersistence`
- `prepareMessagesForLocalPersistence`
- `prepareMemoryForLocalPersistence`
- `createMessageRetentionMetadata`

After Phase 2: stop and reread this file plus the scan docs before writing persistence/migration code.

### Phase 3 - Conservative Migration

Output: versioned migration that preserves user data.

Rules:

- bump persist `version` beyond `13`;
- preserve old workspaces through normalization first;
- avoid immediate destructive trimming unless recoverability is proven;
- if trimming is applied, preserve retention metadata and test it;
- keep localStorage fallback compatibility;
- keep `authVault` normalization;
- keep `notebooksCache`, `openNotebookIds`, `transactionHistory`, `viewMode`, and layout behavior stable.

Recommended migration posture:

- First migration can preserve full existing messages and only enforce the new diet on future writes if backend recoverability is incomplete.
- A stricter migration can be allowed only if tests prove older data is archived or recoverable.

### Phase 4 - Sync and API Guardrails

Output: no accidental second persistence channel.

Steps:

1. Verify `queueWorkspaceCloudSync` still sends an active UI snapshot, not a full transcript archive.
2. Verify `queueMessageCloudSync` is not treated as guaranteed durable projection while message applier is queued.
3. If adding any `/api/v1` route, use `apiHandler`, validation, idempotency where needed, permission, and typed `nexusApiClient`.
4. If changing sync payload shape, keep `LOCAL_SYNC_QUEUE_MAX_PAYLOAD_BYTES` and secret scan behavior intact.
5. If the trace requires `SyncOperationApplier` completion for messages, stop and create a V16 dependency note instead of partial implementation.

### Phase 5 - Import / Export Compatibility

Output: validated snapshot behavior.

Steps:

1. Decide whether `WorkspaceSnapshot` remains a full export format or gains a V15 bounded marker.
2. Keep `validateWorkspaceSnapshot` backward compatible.
3. Keep `createWorkspaceSnapshot` stripping `apiKey` and `baseUrl`.
4. Test old snapshots with full messages.
5. Test V15 snapshots with any new retention metadata.

### Phase 6 - Tests and Verification

Minimum tests to update or add:

- `src/lib/workspace-kernel.test.ts`
- `src/lib/backend/workspace/workspace-state.test.ts`
- `src/lib/sync/local-sync-queue-adapter.test.ts` if sync payloads change
- `src/lib/backend/history/message-history-service.test.ts` if archive/history assumptions change
- a focused store persistence/migration test if the project has a workable store test pattern

Verification commands:

```bash
npm test -- --run
npm run typecheck
npm run lint
```

If the repo does not provide one of these scripts, record that explicitly in the implementation report and run the closest available command from `package.json`.

### Phase 7 - Documentation Update

Output: docs reflect the new state contract.

Update relevant docs after code:

- this V15 document, marking implementation result;
- `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`, state/persistence sections;
- `NEXUS_CODEX_EXECUTION_MAP.md`, if trace maps changed;
- `NEXUS_ITERATION_UPGRADE_RANKING.md`, if V15 completion changes the next top ranking.

## 11. Codex Decision Gates

Codex must answer these before each implementation batch:

| Question | Required answer before code |
| --- | --- |
| What user-visible data could be lost? | Either none, recoverable, archived, or blocked. |
| Which tier owns this data after V15? | Active UI, historical cache, durable backend, cloud snapshot, export-only, or sync queue. |
| Is the trace chain complete? | Full chain or justified `N/A local-only`. |
| Does this create a duplicate store/queue/registry? | Must be no. |
| Does this touch Next.js route/server behavior? | If yes, local Next docs have been read. |
| Does this persist secrets or provider credentials? | Must be no. |
| Does this change persisted shape? | If yes, version bump and migration test required. |
| Does this rely on message sync projection? | If yes, prove it or block as V16 dependency. |
| Does this rely on memory durable write? | If yes, prove route/service/repository or block as V18 dependency. |

## 12. Acceptance Criteria

V15 is complete only when all applicable items are true:

- `prepareWorkspacesForLocalPersistence` no longer blindly persists unbounded active transcript and memory payloads without policy.
- The active message policy is explicitly bounded, recoverable, or future-only conservative.
- The active memory policy is explicitly bounded, summarized, recoverable, or marked with a blocked dependency.
- `historicalMessages` remains runtime-only and excluded from persisted Zustand state.
- Cloud active snapshots stay below their intended role as active projections, not historical archives.
- Export/import behavior remains backward compatible and secret-safe.
- Persist version and migration are updated if persisted shape changes.
- Tests prove no secret leakage into snapshots or sync payloads.
- Tests prove old persisted workspaces still hydrate.
- Tests prove active layout, selection, panels, graph, notebooks, and theme survive the diet.
- Implementation notes include trace chains for every changed flow.
- Docs are updated so V16/V18/V19 can build on the new state contract.

## 13. What Not To Do

- Do not delete old messages from local persistence just because the array is large.
- Do not assume `queueMessageCloudSync` means messages are durably projected.
- Do not persist `historicalMessages`.
- Do not create another IndexedDB database for transcripts.
- Do not create another sync queue.
- Do not add another registry for message or memory types.
- Do not put provider secrets into snapshots, messages, memory, artifacts, logs, or observability metadata.
- Do not change `/api/v1` JSON routes outside `apiHandler` unless it is a deliberate streaming/special exception.
- Do not mix visible frontend cleanup or large component decomposition into V15 unless it is required to complete state hygiene.
- Do not implement V16 sync applier completion under the V15 label unless the user explicitly expands scope.

## 14. Expected Final Implementation Report

When V15 is implemented, the final report should include:

1. Starting condition:
   - current persist version;
   - current active message/memory behavior;
   - current incomplete chains.
2. Goal confirmation:
   - exact V15 state policy chosen;
   - bounded limits and migration behavior.
3. Process summary:
   - files changed;
   - trace chains used;
   - blocked chains and why.
4. Verification:
   - tests run;
   - commands that failed or were unavailable;
   - storage/migration evidence.
5. Remaining dependencies:
   - V16 sync operation applier items;
   - V18 history/memory lifecycle items;
   - any import/export or artifact follow-up.

## 15. V15 One-Line Guardrail

Every V15 code change must make active state smaller or clearer without making user data less recoverable.

## 16. Next-Round Codex Starter Prompt

Use this external prompt when starting the implementation round:

```text
請先讀取並遵守 `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`，目標是實作 V15 Active State Hygiene and Local Persistence Diet。

不要急著改碼。請慢慢做、分批做、低負載做；我的電腦效能可能有限，跑很久、跑整天都可以，穩定比速度重要。

開始前先完成文件要求的 Phase 0 preflight scan，列出每個準備修改的 flow 的 trace chain：
UI action → Zustand → registry/type → nexusApiClient/state-sync → /api/v1 → apiHandler → service → repository → observability/sync projection

畫不出 trace chain 的地方不要落地；local-only / export-only / test-only 必須明確標成 N/A local-only 並說明原因。

請遵守 no-data-loss 規則，不要為了瘦身而直接刪除或截斷尚未證明可恢復的 messages / memory。做到 Phase 2 後，請停下來重讀本 V15 文件、`NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`、`NEXUS_ITERATION_UPGRADE_RANKING.md`，再繼續實作。

請建立或更新 `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md` 作為中途關機/重啟恢復用 checkpoint。每個小批次後記錄目前 phase、已讀文件、已改文件、trace chain、跑過的指令、測試結果、blocker、下一個安全步驟。若中途重啟，先讀 V15 文件、checkpoint、`git status --short`、diff，再繼續。

請優先用小步提交式的工作節奏：掃描 → trace → 小改 → 小測 → 報告目前狀態。避免一次開很多高負載程序；測試可以分批跑，必要時先跑 targeted tests，再跑完整 verification。
```

## 17. Low-Load Execution Rule

V15 implementation should optimize for safety and machine stability, not wall-clock speed.

- Prefer targeted reads and targeted tests before full-suite commands.
- Avoid running multiple heavy commands at the same time, such as full test suite plus build plus dev server.
- Prefer `rg`, focused `sed`, and exact test files while exploring.
- Long-running verification is allowed. Do not interrupt it just because it takes a long time.
- If a command appears expensive, explain why it is needed before running it.
- If the computer becomes slow, pause after the current safe checkpoint and report what has already been verified.
- Keep intermediate notes concise but frequent enough that a later Codex can resume without guessing.

## 18. Shutdown / Resume Protection

Codex should assume that the computer may sleep, restart, lose power, or close the session during V15. Running commands will stop if the machine shuts down. Codex should not rely on memory-only context for recovery.

Before each implementation batch, Codex must create or update a simple checkpoint note in the working conversation or, if the implementation has already started touching files, in a local markdown file such as `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md`.

Each checkpoint should include:

- current phase;
- files already read;
- files changed;
- trace chains already approved;
- commands already run;
- test results or failures;
- known blockers;
- exact next safe step.

Recommended checkpoint rhythm:

1. After Phase 0 scan.
2. Before first code edit.
3. After every small code-edit batch.
4. Before any long-running test/build command.
5. After any failed command.
6. Before stopping for the day or leaving a long task running.

Resume rule:

When a later Codex resumes V15 after a shutdown or interruption, it must first read:

- `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`;
- `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md`, if it exists;
- `git status --short`;
- the diff of any changed files;
- the files listed as changed in the checkpoint.

Then it must restate the current phase, current risk, and next safe step before continuing. If checkpoint notes and git diff disagree, trust the filesystem and git diff first, then update the checkpoint.

## 19. Implementation Result

V15 landed as a conservative no-data-loss metadata pass:

- Added optional `AgentLocalPersistenceMetadata` on `NexusAgent`.
- Updated `prepareWorkspacesForLocalPersistence` to call focused helpers and attach preserve-full retention metadata.
- Bumped Zustand persist version from `13` to `14`.
- Migrated old workspaces through the V15 local persistence serializer.
- Preserved all active messages and active memory blocks; no truncation was applied.
- Kept `historicalMessages` runtime-only and excluded from persisted state.
- Left cloud message refs bounded at `8`; cloud memory remains full until durable memory write is verified.

Verification completed:

- `npm test -- src/store/nexus-store.test.ts`
- `npm test -- src/store/nexus-store.test.ts` now includes v13 -> v14 persist rehydrate/migration coverage.
- `npm test -- src/lib/workspace-kernel.test.ts src/lib/backend/workspace/workspace-state.test.ts`
- `npm run typecheck`
- `npm run lint -- src/lib/nexus-types.ts src/store/nexus-store.ts src/store/nexus-store.test.ts`

Remaining dependencies:

- V16: complete `SyncOperationApplier` projection for `message` before any destructive active message trim.
- V18: complete memory write/update route/service path before stricter active memory diet.
- V20: historical artifact fetch remains out of scope.
