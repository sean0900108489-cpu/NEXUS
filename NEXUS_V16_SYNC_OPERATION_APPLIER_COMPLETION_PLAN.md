# NEXUS V16 Sync Operation Applier Completion

Generated: 2026-05-28
Status: read-only planning report; no implementation code changed; no tests run
Scope: V16 sync operation semantics, durable operation appliers, Datapad / Notebook durable sync, workspace login recovery, and no-data-loss sync projection rules.

This document is meant to be enough for a later Codex implementation round to complete V16 by reading it, then reading the source files it names. The first implementation slice must be `V16-A: Datapad / Notebook Durable Sync + Workspace Login Recovery`.

## 0. Use This File First

Before implementing V16, read this file from top to bottom, then read the source files named in Section 8. Do not start with code. Start with trace chains, operation status semantics, and no-data-loss rules.

During implementation, reread this file once more after Phase 2 and before changing `SyncOperationApplier`, local queue status mapping, notebook fetch merge, workspace hydration, or any destructive/potentially overwriting behavior. This second read is mandatory so the model does not forget that `queued != synced` and remote empty results must not erase local visible data.

Repo rule reminder: `AGENTS.md` says this is not the familiar Next.js version. If V16 touches route handlers, Server Components, Client Components, App Router behavior, or backend-for-frontend routes, read the relevant local guide under `node_modules/next/dist/docs/` before code changes.

## 1. 起點敘述（依照目前的狀況）

V15 landed as a conservative no-data-loss metadata pass. Active messages and memory are preserved locally with metadata that says durable projection is not yet proven. The next structural blocker is V16: sync operations are accepted and queued, but several operation types do not actually apply to durable domain tables.

Current critical state:

- `workspace/snapshot` can be applied by `SyncOperationApplier` and saved through `WorkspaceStateService`.
- `agent`, `message`, `prompt`, `notebook`, and `artifact_reference` currently return `{ status: "queued" }` from `SyncOperationApplier`.
- The local sync queue currently treats backend statuses other than `failed` or `conflicted` as local `synced`.
- Datapad / Notebook writes enqueue local sync operations, but the backend applier does not write the `notebooks` table.
- Notebook fetch can replace local notebook cache with a remote empty result.
- Export includes `state.notebooksCache`, so if the cache was wiped by remote empty fetch, export also contains no datapads.
- Login currently updates `authVault.user`, but does not discover account workspaces or hydrate the latest cloud workspace snapshot into local state.

The biggest present risk is not just whether the queue can flush. The biggest risk is that an operation can flush to `/api/v1/sync/operations`, remain backend `queued`, be displayed locally as `synced`, then remote empty data overwrites local cache. That can make user-visible Datapads disappear and make export files omit them.

## 2. 確定 Goal 描述

V16 Goal:

Complete the local-first sync loop so every supported sync operation has truthful status, durable application or explicit unapplied state, safe fetch merge behavior, and observable recovery. No user-visible data may be lost because the frontend mistook backend `queued` for durable `synced`.

V16-A Goal:

Make Datapad / Notebook and workspace login recovery safe before broadening to every sync entity.

V16-A is successful when:

- notebook upsert/delete operations are applied to the durable `notebooks` table or remain visibly unapplied;
- frontend status can distinguish `queued`, `applied/synced`, `failed`, and `conflicted`;
- remote empty notebook fetch does not overwrite non-empty local dirty or pending notebooks;
- export includes local visible datapads and any pending/draft recovery metadata needed to prevent data loss;
- login can recover account workspace state through workspace discovery or latest snapshot hydration;
- workspace hydration never overwrites newer local state without a conflict path.

Full V16 is successful when:

- every `SyncEntityType` has either a durable applier or a documented hard block from queue usage;
- message, prompt, notebook, and artifact reference operations no longer silently stall as backend `queued`;
- sync status projections are truthful and observable;
- retries, idempotency, conflicts, tombstones, size limits, and secret checks are tested per operation type;
- V15 message trimming remains blocked until message durability is proven by V16.

## 3. Weight and Priority

V16 inherited final score `9.3` from `NEXUS_ITERATION_UPGRADE_RANKING.md`.

| Dimension | Weight | V16 reason |
| --- | ---: | --- |
| Zero-friction future changes | 20% | New feature work can trust one sync path instead of guessing whether data is local-only or durable. |
| Stability | 20% | Prevents silent data loss, false synced badges, failed retries, and missing account recovery. |
| Architecture logic | 20% | Completes queue -> applier -> service -> repository -> projection ownership. |
| Frontend/backend/function coupling | 15% | Makes UI action to backend projection traceable for each entity. |
| Frontend speed / UI hygiene | 10% | Safe fetch merge avoids cache wipe and unnecessary refetch churn. |
| Feature/extensibility value | 10% | Unlocks durable datapads, prompts, messages, and artifact references. |
| Codex execution readability | 5% | Gives future agents an operation matrix and exact gates. |

Recommended V16 internal effort split:

| Workstream | Weight | Output |
| --- | ---: | --- |
| Status semantics and queue truth | 20% | `queued != synced`; frontend can show unapplied operations. |
| V16-A notebook durable sync | 20% | Notebook service/repository/applier, tombstones, safe merge, tests. |
| Workspace login recovery | 15% | Account workspace discovery or latest snapshot hydration with conflict rules. |
| Message durable applier | 15% | Message upsert/create path enough to prove V15 future trimming later. |
| Prompt durable applier | 10% | Prompt upsert/delete parity with fetch. |
| Artifact reference parity | 8% | Sync path equals direct artifact reference behavior or is blocked. |
| Observability and status projection | 7% | Applied/failed/conflicted events without content leaks. |
| Documentation/checkpoint discipline | 5% | Updated maps, checkpoint, implementation report. |

## 4. Mandatory Trace Chain

Before every implementation batch, draw this exact trace chain:

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

If the chain cannot be drawn, do not land that behavior.

If the change is local-only, export-only, or test-only, write:

```text
Trace chain: N/A local-only
Reason: <why no API/service/repository path is needed>
Risk: <what prevents hidden durable truth or data loss>
```

## 5. 過程規則

These are hard gates:

- `queued != synced`. Backend `queued` must not be projected locally as fully synced/applied.
- Remote empty fetch must not overwrite non-empty local visible data if there are pending, dirty, draft, or unapplied operations.
- Login hydration must not overwrite newer local state.
- Delete must use a tombstone or retry-safe delete semantics before local data becomes unrecoverable.
- Export must preserve the user-visible local state plus pending metadata as the minimum safety source.
- Sync payloads must remain bounded and secret-free.
- Do not create a second sync queue.
- Do not bypass `nexusApiClient`, `apiHandler`, service/repository boundaries, or observability events for governed JSON APIs.
- Do not implement broad message trimming from V15 until message durability is proven here.
- If an operation cannot be made durable in V16, explicitly block it from queue usage or keep it visible as unapplied.

## 6. User Summary Integrated Into V16

### 6.1 Datapad / Notebook 保存鏈斷點

- Datapad window content first lives in component draft state. Only pressing Save calls `updateNotebook`; unsaved drafts do not enter store, queue, or export.
- `createNotebook`, `updateNotebook`, and `deleteNotebook` update `notebooksCache`, then call `supabaseStateSyncManager.upsertNotebook/deleteNotebook`.
- `upsertNotebook` only enqueues to `localSyncQueueAdapter`.
- `/api/v1/sync/operations -> SyncQueueService -> SyncOperationApplier` currently returns `{ status: "queued" }` for `notebook`; it does not write `notebooks`.
- The local queue currently maps server statuses other than `failed/conflicted` to local `synced`.
- Startup `fetchNotebooks()` calls `setNotebooksCache(notebooks)`. If remote returns empty, local notebooks and open windows can be cleared.

### 6.2 Export 為什麼可能沒有 datapads

`exportActiveWorkspace` includes only the current `state.notebooksCache`. If remote empty fetch wiped the cache, export is empty. Unsaved Datapad drafts are also absent because they never entered store.

Cloud workspace snapshot serializer does not include notebooks. It stores bounded message refs, not full transcript. Notebook durability must therefore be solved through notebook durable sync or explicit export/local recovery, not through workspace cloud snapshot alone.

### 6.3 登入後 Workspace Recovery 是否完整

Current login is incomplete. Auth state updates `authVault.user`, but the frontend does not yet discover account workspaces or hydrate cloud snapshots into local state.

The backend has `GET /api/v1/workspaces/[workspaceId]/state`, but the frontend must already know `workspaceId`. `WorkspaceHydrationService` exists, but it is not wired into login recovery.

### 6.4 V16-A Must Come First

V16 should first split out:

```text
V16-A: Datapad / Notebook Durable Sync + Workspace Login Recovery
```

V16-A exit criteria:

- notebook upsert/delete confirms applied to durable `notebooks`;
- frontend distinguishes `queued`, `applied/synced`, `failed`, and `conflicted`;
- remote empty fetch cannot wipe non-empty local visible notebooks unless an applied tombstone/empty authoritative projection exists;
- login can recover account workspace list or latest workspace snapshot;
- export includes local durable cache, pending notebook ops, and necessary draft recovery metadata.

## 7. Apply Matrix

| Operation | Current durable apply | Current frontend truth | V16-A / V16 requirement |
| --- | --- | --- | --- |
| `notebook upsert/delete` | Only queue; applier returns `queued`; no `notebooks` table write. | Local queue may show synced; remote empty fetch can clear cache. | V16-A must add notebook service/repository/applier and safe merge fetch. |
| `workspace snapshot` | Applies to `workspace_snapshots` and rebuilds projection. | Frontend lacks login hydrate; local queue badge only. | V16-A must connect account recovery/hydration. |
| `message create/upsert` | Only queue; message repository currently lists/archives, no insert/upsert path. | Active local transcript exists; clean browser cannot restore transcript. | Full V16 must implement durable message applier before V15 trimming. |
| `prompt upsert/delete` | Only queue; fetch reads Supabase `prompts`; write is not applied by applier. | Remote empty refresh can clear local prompt cache. | Add prompt applier after notebook or mark unsafe. |
| `artifact_reference create/delete` | Sync applier does not handle it; direct artifact API/repository can write references. | Queue path is unreliable; direct route path is stronger. | Either implement sync parity or forbid this entity from queue usage. |

## 8. Source Files To Read Before Editing

Read these in order:

1. `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md`
2. `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`
3. `NEXUS_ITERATION_UPGRADE_RANKING.md`
4. `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`
5. `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md`
6. `src/lib/backend/sync/sync-operation-applier.ts`
7. `src/lib/backend/sync/sync-queue-service.ts`
8. `src/lib/sync/local-sync-queue-adapter.ts`
9. `src/lib/state-sync.ts`
10. `src/app/api/v1/sync/operations/route.ts`
11. `src/app/api/v1/sync/status/route.ts`
12. `src/store/nexus-store.ts`
13. `src/components/nexus/DatapadWindow.tsx`
14. `src/components/nexus/nexus-ops.tsx`
15. `src/lib/nexus-types.ts`
16. `src/lib/supabase/database.types.ts`
17. `supabase/migrations/20260527000000_security_boundary_rls_foundation.sql`
18. `supabase/migrations/20260527003000_durable_sync_queue.sql`
19. `src/lib/backend/workspace/workspace-state-service.ts`
20. `src/lib/backend/workspace/workspace-hydration-service.ts`
21. `src/app/api/v1/workspaces/[workspaceId]/state/route.ts`
22. `src/lib/backend/history/message-repository.ts`
23. `src/lib/backend/artifacts/artifact-service.ts`

If editing any route handler or App Router boundary, read relevant local Next.js docs under `node_modules/next/dist/docs/` before code.

## 9. Required Trace Templates

### 9.1 Datapad Save / Notebook Upsert

```text
UI action:
  DatapadWindow Save button
Zustand:
  updateNotebook / createNotebook in nexus-store
registry/type:
  NotebookRecord, SyncEntityType = "notebook", LocalSyncQueueOperation
nexusApiClient/state-sync:
  SupabaseStateSyncManager.upsertNotebook -> localSyncQueueAdapter.enqueue
/api/v1:
  POST /api/v1/sync/operations
apiHandler:
  sync operations route
service:
  SyncQueueService.createOperation -> SyncOperationApplier.apply
repository:
  V16-A NotebookRepository writing notebooks table
observability/sync projection:
  notebook.applied / notebook.failed / notebook.conflicted, sync.operation.status
Current break:
  applier returns queued; no durable notebook write.
```

### 9.2 Datapad Delete

```text
UI action:
  DatapadWindow delete button
Zustand:
  deleteNotebook removes from notebooksCache/open windows
registry/type:
  NotebookRecord, tombstone/delete operation, SyncEntityType = "notebook"
nexusApiClient/state-sync:
  SupabaseStateSyncManager.deleteNotebook -> localSyncQueueAdapter.enqueue
/api/v1:
  POST /api/v1/sync/operations
apiHandler:
  sync operations route
service:
  SyncQueueService -> SyncOperationApplier
repository:
  NotebookRepository delete/tombstone
observability/sync projection:
  notebook.deleted or notebook.delete_queued; retry-safe tombstone status
V16 decision:
  Do not make delete irreversible locally until applied or recoverable.
```

### 9.3 Notebook Fetch Safe Merge

```text
UI action:
  app boot / right panel notebooks refresh
Zustand:
  setNotebooksCache
registry/type:
  NotebookRecord plus dirty/pending/tombstone metadata if added
nexusApiClient/state-sync:
  SupabaseStateSyncManager.fetchNotebooks
/api/v1:
  direct Supabase currently; V16 may add governed route if needed
apiHandler:
  required if a new /api/v1 route is added
service:
  notebook query service or state-sync fetch adapter
repository:
  notebooks table
observability/sync projection:
  notebook.fetch.merged, notebook.fetch.skipped_empty, sync status
V16 decision:
  Remote empty cannot erase local non-empty notebooks with pending/dirty state.
```

### 9.4 Workspace Login Recovery

```text
UI action:
  auth state change / login success
Zustand:
  authVault.user update, workspace hydration action to be added
registry/type:
  WorkspaceCloudSnapshotPayload, WorkspaceHydrationPlan
nexusApiClient/state-sync:
  nexusApiClient get workspace list/latest snapshot or existing state route
/api/v1:
  workspace discovery route or GET /api/v1/workspaces/[workspaceId]/state when id is known
apiHandler:
  governed /api/v1 route
service:
  WorkspaceStateService + WorkspaceHydrationService
repository:
  WorkspaceSnapshotRepository / workspace membership repository
observability/sync projection:
  workspace.hydration.planned/applied/conflict/skipped
Current break:
  login stores user but does not discover or hydrate workspaces.
```

### 9.5 Local Queue Status Semantics

```text
UI action:
  save/update/delete creates queued local operation
Zustand:
  sync queue badge/status reads localSyncQueueAdapter.getStatus
registry/type:
  LocalSyncQueueOperation.status, SyncOperationSummary.status
nexusApiClient/state-sync:
  localSyncQueueAdapter.flushOperation -> nexusApiClient.post
/api/v1:
  POST /api/v1/sync/operations
apiHandler:
  sync operations route
service:
  SyncQueueService
repository:
  SyncOperationRepository plus entity repository if applied
observability/sync projection:
  queued/unapplied/applied/synced/failed/conflicted status
V16 decision:
  Server queued must remain local queued/unapplied, not local synced.
```

### 9.6 Message Upsert

```text
UI action:
  AgentWindow submit / stream final / tool result
Zustand:
  addMessage / finishMessage / runTool
registry/type:
  AgentMessage, HistoricalMessageRecord, SyncEntityType = "message"
nexusApiClient/state-sync:
  queueMessageCloudSync -> insertMessage/syncHistoricalMessage
/api/v1:
  POST /api/v1/sync/operations or governed message write route
apiHandler:
  sync operations route or new message route
service:
  SyncQueueService -> MessageHistoryService/message applier
repository:
  MessageRepository insert/upsert/archive
observability/sync projection:
  message.applied/failed/conflicted without raw secret content
Current break:
  repository supports list/archive, not durable upsert from sync.
```

### 9.7 Prompt Upsert/Delete

```text
UI action:
  prompt vault create/update/delete
Zustand:
  promptsCache mutation
registry/type:
  PromptRecord, PromptRevisionRecord, SyncEntityType = "prompt"
nexusApiClient/state-sync:
  upsertPrompt/deletePrompt -> sync queue
/api/v1:
  POST /api/v1/sync/operations
apiHandler:
  sync operations route
service:
  prompt service/applier
repository:
  prompts, prompt_revisions
observability/sync projection:
  prompt.applied/failed/conflicted
V16 decision:
  Fetch must not wipe dirty local prompt cache.
```

### 9.8 Artifact Reference

```text
UI action:
  artifact save/link from message/notebook/prompt/tool
Zustand:
  artifact vault/update path
registry/type:
  ArtifactReference, referenced_by_type, SyncEntityType = "artifact_reference"
nexusApiClient/state-sync:
  direct artifact API or sync queue
/api/v1:
  artifact route or sync operations route
apiHandler:
  governed route
service:
  ArtifactService or sync applier
repository:
  artifact_references
observability/sync projection:
  artifact_reference.applied/failed/conflicted
V16 decision:
  Direct route and sync route must have parity, or queue path must be blocked.
```

## 10. Implementation Phases

### Phase 0 - Read-Only Preflight

Output: checkpoint with exact trace chains and operation matrix.

Required:

- read Section 8 files;
- confirm current local queue status mapping;
- confirm `SyncOperationApplier` queued domains;
- confirm notebook fetch overwrite behavior;
- confirm login recovery gap;
- create/update `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`.

Do not edit code in Phase 0.

### Phase 1 - Status Semantics First

Output: truthful local/backend sync status.

Rules:

- backend `queued` remains local `queued` or `unapplied`;
- local `synced` only means backend operation is applied or terminally accepted by a durable direct route;
- frontend badge must not say Synced for unapplied operations;
- `/api/v1/sync/status` projection should expose unapplied counts.

This must happen before notebook durable sync so users stop receiving false confidence.

### Phase 2 - Notebook Durable Applier

Output: notebook upsert/delete is durable.

Required components:

- notebook service/repository with Supabase and in-memory test adapter;
- schema validation for title/content/workspace/id;
- idempotency by client mutation and notebook id;
- stale update conflict policy;
- tombstone/delete strategy;
- applied/failed/conflicted observability events without notebook content;
- tests for offline retry, delete tombstone, size limit, secret scan, and empty remote non-destructive behavior.

After Phase 2, reread this V16 document before modifying fetch merge or workspace recovery.

### Phase 3 - Safe Notebook Fetch Merge and Draft Recovery

Output: remote empty cannot wipe local visible datapads.

Required:

- track local dirty/pending/unapplied notebooks or derive from local queue;
- merge remote results with local visible notebooks when local pending exists;
- preserve open notebook ids when corresponding local notebook still exists;
- add draft autosave/recovery or export pending draft metadata;
- export must include local visible notebooks plus pending metadata.

### Phase 4 - Workspace Login Recovery

Output: account login can recover workspace state.

Required:

- discover account workspace ids or latest workspace snapshots;
- wire `WorkspaceHydrationService` into login/auth flow;
- conflict if local state is newer;
- hydrate when local missing/corrupt/explicit restore;
- do not wipe local workspace on failed remote fetch;
- tests for clean browser, local newer conflict, missing cloud, permission denied, and multi-workspace user.

### Phase 5 - Message Durable Applier

Output: messages can be durably written/read after clean browser.

Required:

- message insert/upsert repository method;
- idempotency by message id and content hash;
- conflict on same id with different content;
- secret-safe metadata/redaction;
- stream final retry path;
- history fetch proves data exists after local cache is clean.

### Phase 6 - Prompt Durable Applier

Output: prompts are no longer fetch-only durable.

Required:

- prompt upsert/delete applier;
- prompt revision handling;
- fetch merge that protects dirty local prompts;
- idempotency and conflict rules.

### Phase 7 - Artifact Reference Parity

Output: sync queue and direct artifact APIs agree.

Required:

- define whether artifact references may use sync queue;
- if yes, implement applier parity with `ArtifactService`;
- if no, block queue usage and document direct route as canonical.

### Phase 8 - Final Verification and Docs

Output: V16 implementation report.

Verification should be targeted first, then full-suite when machine load is acceptable:

```bash
npm test -- src/lib/backend/sync/sync-queue.test.ts
npm test -- src/lib/sync/local-sync-queue-adapter.test.ts
npm test -- src/store/nexus-store.test.ts
npm test -- src/lib/backend/workspace/workspace-state.test.ts
npm run typecheck
npm run lint
npm test
```

Run `npm run build` only when route/UI hydration changes are in scope and the machine can tolerate the load.

## 11. Operation Test Requirements

| Operation | Required checks |
| --- | --- |
| notebook | Idempotent by `clientMutationId + notebook.id`; stale update conflict; title/content/workspace schema; 128KB local/server size; secret scan; emit `notebook.applied/failed/conflicted` without content; offline retry; delete tombstone; empty remote non-destructive tests. |
| workspace snapshot | Checksum idempotency; baseChecksum conflict; 512KB cap; snapshot validator; secret-free bounded snapshot; projection success/failure event; login hydrate conflict test. |
| message | Idempotent by `message.id + contentHash`; same id different content conflicts; message size/schema/metadata redaction; stream final message retry; history fetch after clean browser. |
| prompt | Idempotent prompt id and revision id; updated_at/baseVersion conflict; revision cap; secret/size/schema; delete tombstone; fetch must not wipe dirty local prompt. |
| artifact_reference | Unique `(workspace, artifact, referencedByType, referencedById)`; artifact existence; enum/id schema; dedup conflict policy; direct route and sync route parity tests. |

## 12. Decision Gates

Codex must answer these before implementation:

| Question | Required answer |
| --- | --- |
| Could this erase visible local user data? | If yes, block or add recovery/tombstone/merge first. |
| Is backend `queued` being shown as synced? | Must be no. |
| Does the operation have a durable repository write? | Yes, or it remains unapplied/blocked. |
| Does fetch overwrite local dirty/pending state? | Must be no. |
| Does login hydration know which workspace to restore? | Must be yes before claiming recovery. |
| Is local newer than remote? | Conflict or skip; never blind overwrite. |
| Are secrets and raw content excluded from observability? | Must be yes. |
| Are payload sizes bounded? | Must be yes. |
| Is there a test for idempotency and conflict? | Required per operation. |
| Did this add a parallel queue or shadow store? | Must be no. |

## 13. Recommended Implementation Order

1. Fix status semantics: server `queued` must not become local `synced`.
2. Implement notebook backend service/repository/applier and applied observability.
3. Change notebook fetch to safe merge.
4. Add Datapad draft autosave/recovery and export pending metadata.
5. Implement account workspace discovery and login hydration.
6. Add message durable applier.
7. Add prompt durable applier.
8. Resolve artifact_reference queue parity.
9. Update docs and execution maps.

Do not start destructive V15 message trimming until message durability and clean-browser recovery are proven.

## 14. Shutdown / Resume Protection

V16 may be long-running. Codex should create/update `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md` before each implementation batch.

Each checkpoint must include:

- current phase;
- files read;
- files changed;
- trace chains approved;
- operations touched;
- commands run;
- test results;
- known blockers;
- next safe step.

Resume rule:

When resuming after sleep, restart, shutdown, or context loss, first read:

- this V16 file;
- `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`, if it exists;
- `git status --short`;
- diff of changed files;
- current local queue/status code if sync behavior was touched.

Then restate current phase, current data-loss risk, and next safe step before continuing.

## 15. Slow Execution Anti-Drift Rule

Slow execution is allowed, but it must stay evidence-based and convergent.

- Do not use "slowly" as permission to explore indefinitely.
- Every implementation batch must produce at least one concrete artifact: a trace chain, a small diff, a targeted test result, a checkpoint update, or a clearly marked blocker.
- Before changing code, cite the source lines or files that justify the change.
- After changing code, run the smallest relevant verification before moving on.
- If two consecutive batches do not move V16-A closer to durable Datapads or login recovery, stop and restate the plan.
- Do not rely on memory-only conclusions; reread the V16 plan, checkpoint, and changed files when the session becomes long.
- If a claim cannot be backed by code, diff, test output, or documentation, mark it `Needs verification` instead of treating it as true.

## 16. Next-Round Codex Starter Prompt

Use this external prompt when starting implementation:

```text
請先讀取並遵守 `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md`，目標是實作 V16 Sync Operation Applier Completion，但第一刀必須先做 `V16-A: Datapad / Notebook Durable Sync + Workspace Login Recovery`。

不要急著改碼。請慢慢做、分批做、低負載做；我的電腦效能可能有限，跑很久、跑整天都可以，穩定比速度重要。但慢慢做不代表無限探索：每個小批次都要有證據與產物，例如 trace chain、小 diff、targeted test、checkpoint 更新，或明確 blocker。

開始前先完成文件要求的 Phase 0 preflight scan，列出每個準備修改 flow 的 trace chain：
UI action → Zustand → registry/type → nexusApiClient/state-sync → /api/v1 → apiHandler → service → repository → observability/sync projection

畫不出 trace chain 的地方不要落地。`queued != synced`，遠端空資料不得覆蓋本地非空 visible/pending datapads，登入 hydrate 不得覆蓋 newer local workspace。

請建立或更新 `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`。每個小批次後記錄目前 phase、已讀文件、已改文件、trace chain、操作類型、跑過的指令、測試結果、blocker、下一個安全步驟。

請避免慢到失焦：如果連續兩個小批次沒有讓 V16-A 更接近 durable Datapads 或 login recovery，請停下來重述目前目標、風險、下一個最小可驗證步驟。任何無法由程式碼、diff、測試輸出或文件支持的判斷，都標成 `Needs verification`。

做到 Phase 2 後，停下來重讀本 V16 文件、`NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`、`NEXUS_ITERATION_UPGRADE_RANKING.md`、`NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`，再繼續。
```

## 17. Final Guardrail

V16 is not complete when operations merely flush. V16 is complete when flushed operations are truthfully represented, durably applied or visibly unapplied, safely recoverable, and impossible to confuse with synced user data.
