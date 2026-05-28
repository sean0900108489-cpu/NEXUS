# NEXUS V16 Implementation Checkpoint

Updated: 2026-05-28 23:22:58 AEST

## Current Phase

- V16-A first slice is complete and stopped at a review checkpoint.
- Implemented scope: status truth, notebook durable applier, notebook safe merge, export recovery metadata, and latest workspace login recovery.
- This is a preview/review candidate, not a full V16 completion marker.

## V16-A Scope

- First slice only: `V16-A: Datapad / Notebook Durable Sync + Workspace Login Recovery`.
- Hard gates:
  - `queued != synced`.
  - Remote empty notebook fetch must not overwrite non-empty visible/pending local datapads.
  - Login hydration must not overwrite newer local workspace state.
  - Delete must be retry-safe before local data becomes unrecoverable.
  - No second sync queue, no direct component-to-Supabase writes for governed sync behavior, no content leaks in observability.

## Files Read / Inspected

- `AGENTS.md` instructions supplied in the thread.
- `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md` fully read.
- `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md` read.
- `NEXUS_ITERATION_UPGRADE_RANKING.md` read.
- `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md` read.
- `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md` read.
- Next.js local docs read before route/UI work:
  - `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
  - `node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`
- V16 Section 8 source files inspected:
  - `src/lib/backend/sync/sync-operation-applier.ts`
  - `src/lib/backend/sync/sync-queue-service.ts`
  - `src/lib/sync/local-sync-queue-adapter.ts`
  - `src/lib/state-sync.ts`
  - `src/app/api/v1/sync/operations/route.ts`
  - `src/app/api/v1/sync/status/route.ts`
  - `src/store/nexus-store.ts`
  - `src/components/nexus/DatapadWindow.tsx`
  - `src/components/nexus/nexus-ops.tsx`
  - `src/lib/nexus-types.ts`
  - `src/lib/supabase/database.types.ts`
  - `supabase/migrations/20260527000000_security_boundary_rls_foundation.sql`
  - `supabase/migrations/20260527003000_durable_sync_queue.sql`
  - `src/lib/backend/workspace/workspace-state-service.ts`
  - `src/lib/backend/workspace/workspace-hydration-service.ts`
  - `src/app/api/v1/workspaces/[workspaceId]/state/route.ts`
  - `src/lib/backend/history/message-repository.ts`
  - `src/lib/backend/artifacts/artifact-service.ts`
- Additional source/test context inspected:
  - `src/lib/backend/sync/sync-operation-repository.ts`
  - `src/lib/backend/sync/sync-constants.ts`
  - `src/lib/backend/workspace/workspace-snapshot-repository.ts`
  - `src/lib/backend/workspace/workspace-permission.ts`
  - `src/lib/workspace-kernel.ts`
  - `src/lib/backend/sync/sync-queue.test.ts`
  - `src/lib/sync/local-sync-queue-adapter.test.ts`
  - `src/store/nexus-store.test.ts`
  - `src/lib/backend/workspace/workspace-state.test.ts`

## Files Changed

- `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md` created.
- No implementation files changed in this V16 batch.

## Existing Dirty Worktree Noted

- Existing modified files before V16 edits:
  - `src/lib/nexus-types.ts`
  - `src/store/nexus-store.ts`
- Existing untracked docs/tests before V16 edits:
  - `NEXUS_CODEX_EXECUTION_MAP.md`
  - `NEXUS_ITERATION_UPGRADE_RANKING.md`
  - `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`
  - `NEXUS_V14_CODEX_EXECUTION_MAP_PROMPT.md`
  - `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`
  - `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md`
  - `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md`
  - `src/store/nexus-store.test.ts`

## Phase 0 Findings

- Local queue status mapping bug confirmed: `local-sync-queue-adapter.ts` maps any server status other than `failed` or `conflicted` to local `synced`, so backend `queued` currently becomes local `synced`.
- `SyncOperationApplier` durable apply gap confirmed: only `workspace/snapshot` applies through `WorkspaceStateService`; `agent`, `message`, `prompt`, `notebook`, and `artifact_reference` return `queued`.
- Datapad save/delete path confirmed: `DatapadWindow` calls `updateNotebook` / `deleteNotebook`; store mutates `notebooksCache`; `SupabaseStateSyncManager.upsertNotebook/deleteNotebook` enqueues local sync operations.
- Notebook fetch overwrite risk confirmed: boot refresh calls `fetchNotebooks().then(setNotebooksCache)` and `setNotebooksCache` replaces cache and closes open windows missing from the remote result.
- Export datapad dependency confirmed: `exportActiveWorkspace` passes `state.notebooksCache` into `createWorkspaceSnapshot`; if cache is wiped, export omits datapads.
- Login recovery gap confirmed: auth session flow calls `syncSupabaseSessionUser`, which only updates `authVault.user`; no workspace discovery or hydration is wired into login.
- Workspace hydration guard exists but is not wired: `WorkspaceHydrationService` conflicts on newer local state and has tests for newer-local protection.
- Workspace state route exists for known workspace id: `GET/PUT /api/v1/workspaces/[workspaceId]/state` uses `apiHandler`, `WorkspaceStateService`, and snapshot repository.
- Workspace discovery gap confirmed: only `src/app/api/v1/workspaces/[workspaceId]/state/route.ts` exists under workspace routes; no account workspace list/latest route was found.
- Notebook durable repository gap confirmed: no backend NotebookRepository/NotebookService found. `database.types.ts` has `Notebooks` and `NotebookUpsert`, and RLS policy migration references existing `public.notebooks`, but no create-table migration for notebooks was found in the current scan. Needs verification if table exists from an earlier/non-repo schema.
- Current notebook delete is locally destructive immediately. It removes `notebooksCache`, closes windows, then queues delete. V16-A needs tombstone/recovery semantics before claiming safe delete.

## Approved / Prepared Trace Chains

### Local Queue Status Semantics

UI action:
save/update/delete/create mutations that enqueue sync operations

Zustand:
`createNotebook`, `updateNotebook`, `deleteNotebook`, workspace snapshot queue, and related sync status projection in `NexusOps`

registry/type:
`LocalSyncQueueOperation.status`, `SyncOperationSummary.status`, `SyncOperationStatus`

nexusApiClient/state-sync:
`localSyncQueueAdapter.flushOperation` -> `nexusApiClient.post`

/api/v1:
`POST /api/v1/sync/operations`; `GET /api/v1/sync/status`

apiHandler:
`src/app/api/v1/sync/operations/route.ts`; `src/app/api/v1/sync/status/route.ts`

service:
`SyncQueueService.createOperation` / `getStatus`

repository:
`SyncOperationRepository`

observability/sync projection:
`sync.operation.status`; local `QueueStatusProjection`

Current break:
backend `queued` is projected as local `synced`.

Next safe change:
Phase 1 should preserve server `queued` locally as `queued`/pending and update focused queue tests first.

### Datapad Save / Notebook Upsert

UI action:
`DatapadWindow` Save button

Zustand:
`updateNotebook`; `createNotebook` for new datapad creation

registry/type:
`NotebookRecord`, `SyncEntityType = "notebook"`, `LocalSyncQueueOperation`

nexusApiClient/state-sync:
`SupabaseStateSyncManager.upsertNotebook` -> `localSyncQueueAdapter.enqueue`

/api/v1:
`POST /api/v1/sync/operations`

apiHandler:
`src/app/api/v1/sync/operations/route.ts`

service:
`SyncQueueService.createOperation` -> `SyncOperationApplier.apply`

repository:
V16-A `NotebookRepository` to add; current code has no backend notebook repository/service.

observability/sync projection:
add `notebook.applied` / `notebook.failed` / `notebook.conflicted`, plus `sync.operation.status`

Current break:
applier returns `queued` for `notebook`; no durable notebook table write occurs through sync applier.

### Datapad Delete

UI action:
Datapad delete button

Zustand:
`deleteNotebook`

registry/type:
`NotebookRecord`, `SyncEntityType = "notebook"`, delete/tombstone operation

nexusApiClient/state-sync:
`SupabaseStateSyncManager.deleteNotebook` -> `localSyncQueueAdapter.enqueue`

/api/v1:
`POST /api/v1/sync/operations`

apiHandler:
`src/app/api/v1/sync/operations/route.ts`

service:
`SyncQueueService.createOperation` -> `SyncOperationApplier.apply`

repository:
V16-A `NotebookRepository` delete/tombstone path to add.

observability/sync projection:
`notebook.deleted` or `notebook.delete_queued`, plus `sync.operation.status`

Current break:
local cache deletion is immediate and destructive while backend applier leaves operation `queued`.

Gate:
do not claim safe delete until tombstone/recovery or applied durable delete semantics exist.

### Notebook Fetch Safe Merge

UI action:
app boot / notebook refresh

Zustand:
`setNotebooksCache`

registry/type:
`NotebookRecord`; pending/dirty/unapplied metadata is not currently represented

nexusApiClient/state-sync:
`SupabaseStateSyncManager.fetchNotebooks`

/api/v1:
currently direct Supabase read in `state-sync.ts`; if V16-A changes this to governed fetch, add `/api/v1` route first.

apiHandler:
N/A currently; required if a new governed route is added.

service:
currently state-sync fetch adapter; possible V16-A notebook query service if governed route is added.

repository:
`notebooks` table; backend repository missing in current code.

observability/sync projection:
add `notebook.fetch.merged` / `notebook.fetch.skipped_empty` if backend/observability path is touched.

Current break:
remote empty result replaces non-empty local notebooks and closes open notebook windows.

Gate:
remote empty fetch must not wipe local visible/pending datapads.

### Export Datapads / Recovery Metadata

Trace chain: N/A local-only

Reason:
`exportActiveWorkspace` and `createWorkspaceSnapshot` are local file/export boundaries. No API/service/repository write is needed for export itself.

Risk:
export only sees `state.notebooksCache`; if fetch wiped local cache, exported datapads are absent. V16-A export changes must preserve visible notebooks and pending metadata without creating a hidden durable source of truth.

### Workspace Login Recovery

UI action:
auth state change / login success in `NexusOps`

Zustand:
`syncSupabaseSessionUser` / `login` updates `authVault.user`; hydration action to add only after discovery chain is complete.

registry/type:
`WorkspaceCloudSnapshotPayload`, `WorkspaceHydrationPlan`, future workspace discovery response type if added.

nexusApiClient/state-sync:
`nexusApiClient.get` to workspace discovery/latest snapshot route, or existing `GET /api/v1/workspaces/[workspaceId]/state` when workspace id is known.

/api/v1:
existing known-id route: `GET /api/v1/workspaces/[workspaceId]/state`;
missing route: account workspace discovery/list/latest.

apiHandler:
existing known-id route uses `apiHandler`; new discovery route must use `apiHandler`.

service:
`WorkspaceStateService` + `WorkspaceHydrationService`; possible workspace discovery service/repository to add.

repository:
`WorkspaceSnapshotRepository` for snapshots; membership/workspace repository for discovery is missing or incomplete for list/latest.

observability/sync projection:
add `workspace.hydration.planned` / `workspace.hydration.applied` / `workspace.hydration.conflict` / `workspace.hydration.skipped`.

Current break:
login stores user but does not discover account workspaces or hydrate a snapshot. Known-id state fetch exists, but login does not know which workspace id to recover.

Gate:
do not hydrate over local workspace if local `updatedAt` is newer than cloud `updatedAt`.

## Operations Touched

- Documentation/checkpoint only in this batch.
- Planned first runtime operation: sync status semantics (`queued != synced`).
- Planned second runtime operation: notebook upsert/delete durable applier.

## Commands Run

- `pwd`
- `git status --short`
- `git diff -- src/lib/nexus-types.ts src/store/nexus-store.ts src/store/nexus-store.test.ts`
- `rg --files ...`
- `rg -n ...` focused scans for notebooks, workspace hydration, workspace discovery, sync status, and tests.
- `wc -l ...` for V16 docs and target source files.
- `sed -n ...` / `nl -ba ...` focused reads of V16/V15 docs, Next local docs, Section 8 source files, and relevant tests.
- `date '+%Y-%m-%d %H:%M:%S %Z'`
- `test -f NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`

## Test Results

- No tests run yet in V16 Phase 0.
- Existing V15 checkpoint reports prior tests passed, but V16 has not yet verified new behavior.

## Blockers / Needs Verification

- Needs verification: whether `public.notebooks` is created outside the current migration set; current scan found type definitions and RLS references but no create-table migration.
- Needs verification: exact durable notebook delete/tombstone schema. Current `Notebooks` type has no `deleted_at`/tombstone field.
- Needs verification: account workspace discovery ownership. Current backend has membership lookup for a known workspace/user, but no list-workspaces route or repository method.
- Needs verification: frontend sync status UI wording after status semantic change.
- Needs verification: safe reconstruction from `WorkspaceCloudSnapshotPayload` to full `NexusWorkspace` for login hydration, because cloud snapshots contain message refs, not full active transcripts/datapads.

## Next Safe Step

1. Enter Phase 2: design/add notebook durable repository/service/applier in small steps.
2. Before code, restate the notebook upsert/delete trace chain and schema/tombstone decision.
3. Add focused tests around notebook upsert/delete durable application, idempotency, and delete safety before broadening.

## Batch 1 Result - Phase 1 Status Semantics

Updated: 2026-05-28 22:17:28 AEST

Files changed in this V16 batch:

- `src/lib/sync/local-sync-queue-adapter.ts`
- `src/lib/sync/local-sync-queue-adapter.test.ts`
- `src/lib/nexus-types.ts` only for allowing local queue `cancelled` status. Note: this file already had pre-existing V15 changes before V16 started.
- `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`

Trace chain:

UI action:
save/update/delete/create mutations that enqueue sync operations

Zustand:
`createNotebook`, `updateNotebook`, `deleteNotebook`, workspace snapshot queue, and sync status projection in `NexusOps`

registry/type:
`LocalSyncQueueOperation.status`, `SyncOperationSummary.status`, `SyncOperationStatus`

nexusApiClient/state-sync:
`localSyncQueueAdapter.flushOperation` -> `nexusApiClient.post`

/api/v1:
`POST /api/v1/sync/operations`; `GET /api/v1/sync/status`

apiHandler:
`src/app/api/v1/sync/operations/route.ts`; `src/app/api/v1/sync/status/route.ts`

service:
`SyncQueueService.createOperation` / `getStatus`

repository:
`SyncOperationRepository`

observability/sync projection:
`sync.operation.status`; local `QueueStatusProjection`

Implementation summary:

- Replaced the old local queue mapping that converted every non-failed/non-conflicted backend status into local `synced`.
- Added a direct server-status-to-local-status projection helper so backend `queued` remains local `queued`.
- Allowed local queue operations to store `cancelled`, matching the backend status union.
- Updated local queue tests so a server `queued` response remains pending and only a server `synced` response becomes local `synced`.

Commands run after Batch 1:

- `git diff -- src/lib/sync/local-sync-queue-adapter.ts src/lib/sync/local-sync-queue-adapter.test.ts src/lib/nexus-types.ts`
- `npm test -- src/lib/sync/local-sync-queue-adapter.test.ts`
- `npm test -- src/lib/backend/sync/sync-queue.test.ts`
- `npm run typecheck`
- `date '+%Y-%m-%d %H:%M:%S %Z'`
- `git diff --stat`

Test results:

- `npm test -- src/lib/sync/local-sync-queue-adapter.test.ts` passed: 1 file, 9 tests.
- `npm test -- src/lib/backend/sync/sync-queue.test.ts` passed: 1 file, 10 tests.
- `npm run typecheck` passed.

No-data-loss / truth status:

- Backend `queued` is no longer locally marked as `synced`.
- No notebook cache, workspace hydration, repository, route, or delete behavior changed in this batch.
- Datapad data is still not durable; Phase 2 remains required before claiming durable notebook sync.

Known blockers / Needs verification after Batch 1:

- Needs verification: whether pending `queued` operations should get a later explicit local `unapplied` status instead of staying retryable `queued`.
- Needs verification: notebook durable repository and tombstone/delete policy.
- Needs verification: workspace discovery route for login recovery.

## Batch 2 Result - Phase 2 Notebook Durable Applier

Updated: 2026-05-28 22:28:18 AEST

Files changed in this V16 batch:

- `src/lib/backend/notebooks/notebook-repository.ts`
- `src/lib/backend/notebooks/notebook-service.ts`
- `src/lib/backend/sync/sync-operation-applier.ts`
- `src/lib/backend/sync/sync-queue.test.ts`
- `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`

Trace chain:

UI action:
Datapad save/update/delete from notebook windows

Zustand:
`createNotebook`, `updateNotebook`, `deleteNotebook`

registry/type:
`NotebookRecord`, `SyncOperationRequest`, `SyncOperationResponse`, `SyncEntityType = "notebook"`

nexusApiClient/state-sync:
`SupabaseStateSyncManager.upsertNotebook` / `deleteNotebook` -> `localSyncQueueAdapter.enqueue`

/api/v1:
`POST /api/v1/sync/operations`

apiHandler:
`src/app/api/v1/sync/operations/route.ts`

service:
`SyncQueueService.createOperation` -> `SyncOperationApplier.apply` -> `NotebookService`

repository:
`NotebookRepository` with `SupabaseNotebookRepository` and `InMemoryNotebookRepository`

observability/sync projection:
`notebook.applied`, `notebook.deleted`, `notebook.conflicted`, plus `sync.operation.status`

Implementation summary:

- Added a backend notebook repository boundary with Supabase and in-memory implementations.
- Added a backend notebook service for notebook validation, secret scanning, bounded content size, stale-update conflict detection, idempotent delete, and sanitized observability events.
- Wired `SyncOperationApplier` so notebook `create` / `update` / `upsert` operations apply through `NotebookService` and return applied status to `SyncQueueService`.
- Wired notebook `delete` operations through `NotebookService.deleteNotebook`.
- Removed `notebook` from the unsupported queued-domain list.
- Added targeted backend sync queue tests proving durable notebook upsert, stale upsert conflict, and idempotent delete.

Commands run after Batch 2:

- `git diff -- src/lib/backend/sync/sync-operation-applier.ts src/lib/backend/sync/sync-queue.test.ts src/lib/backend/notebooks/notebook-repository.ts src/lib/backend/notebooks/notebook-service.ts src/lib/sync/local-sync-queue-adapter.ts src/lib/sync/local-sync-queue-adapter.test.ts src/lib/nexus-types.ts`
- `npm test -- src/lib/backend/sync/sync-queue.test.ts`
- `npm test -- src/lib/sync/local-sync-queue-adapter.test.ts`
- `npm run typecheck`
- `npm run lint -- src/lib/backend/notebooks/notebook-repository.ts src/lib/backend/notebooks/notebook-service.ts src/lib/backend/sync/sync-operation-applier.ts src/lib/backend/sync/sync-queue.test.ts src/lib/sync/local-sync-queue-adapter.ts src/lib/sync/local-sync-queue-adapter.test.ts src/lib/nexus-types.ts`
- `date '+%Y-%m-%d %H:%M:%S %Z'`
- `git status --short`

Test results:

- `npm test -- src/lib/backend/sync/sync-queue.test.ts` passed: 1 file, 13 tests.
- `npm test -- src/lib/sync/local-sync-queue-adapter.test.ts` passed: 1 file, 9 tests.
- `npm run typecheck` passed.
- `npm run lint -- src/lib/backend/notebooks/notebook-repository.ts src/lib/backend/notebooks/notebook-service.ts src/lib/backend/sync/sync-operation-applier.ts src/lib/backend/sync/sync-queue.test.ts src/lib/sync/local-sync-queue-adapter.ts src/lib/sync/local-sync-queue-adapter.test.ts src/lib/nexus-types.ts` passed.

No-data-loss / truth status:

- Notebook sync operations can now become `synced` only after the applier writes or deletes through the notebook service.
- Stale notebook upserts conflict and do not overwrite newer durable repository data.
- Local fetch/merge behavior is unchanged in this batch; remote empty can still wipe local visible notebooks if `fetchNotebooks()` returns an empty array and `setNotebooksCache` replaces the cache.
- Local delete UI/store behavior is unchanged in this batch; the visible cache still removes immediately before remote confirmation.
- Workspace login recovery is unchanged in this batch.

Known blockers / Needs verification after Batch 2:

- Needs verification: production Supabase schema must include `public.notebooks`; the current scan found type definitions and RLS references, but no create-table migration.
- Needs verification: whether notebook deletes require durable tombstones rather than hard delete. Current table type has no `deleted_at` field, so this batch implements idempotent hard delete only.
- Needs verification: safe fetch merge policy and pending operation metadata before touching `setNotebooksCache`.
- Needs verification: account workspace discovery route/repository for login recovery.

Mandatory reread gate before next code batch:

- Before continuing beyond Phase 2, reread `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md`, `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`, `NEXUS_ITERATION_UPGRADE_RANKING.md`, and `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`.

Next safe step:

1. Complete the mandatory reread gate.
2. Enter the smallest Phase 3 slice: make notebook fetch hydration preserve local visible/pending notebooks when the remote result is empty or older, with focused Zustand/store tests.

## Mandatory Reread Gate Completed After Phase 2

Updated: 2026-05-28 22:28:18 AEST

Files reread:

- `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md`
- `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`
- `NEXUS_ITERATION_UPGRADE_RANKING.md`
- `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`

Commands run:

- `wc -l NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md NEXUS_TOTAL_ARCHITECTURE_SCAN1.md NEXUS_ITERATION_UPGRADE_RANKING.md NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`
- `rg -n "V16-A|Phase|Datapad|Notebook|notebook|hydrate|hydration|login|remote empty|queued != synced|newer local|workspace" NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md`
- `rg -n "Datapad|Notebook|notebook|hydrate|hydration|login|workspace|local persistence|remote empty|queued|synced|V15|V16" NEXUS_TOTAL_ARCHITECTURE_SCAN1.md NEXUS_ITERATION_UPGRADE_RANKING.md NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`
- Focused `sed -n ...` reads of V16 sections 0-8, 10, 11-17; architecture sections 4, 8, 9, 10, known gaps; ranking sections 1-6; and V15 rules/results sections.

Reread conclusions backed by docs:

- Continue Phase 3 before login recovery: safe notebook fetch merge is the next recommended order after status semantics and durable notebook applier.
- `queued != synced` remains a hard gate.
- Remote empty fetch must not overwrite local visible data when local pending, dirty, draft, or unapplied operations exist.
- Delete still needs tombstone or retry-safe semantics before local data becomes unrecoverable; current code only has retry-safe backend hard delete, not a full tombstone model.
- V15 requires `notebooksCache` and `openNotebookIds` to remain stable unless intentionally changed with no-data-loss evidence.
- No second sync queue or shadow store may be introduced.

Next safe step:

Enter Phase 3 small slice. Read `src/lib/state-sync.ts`, `src/store/nexus-store.ts`, `src/store/nexus-store.test.ts`, and `src/components/nexus/nexus-ops.tsx` around notebook fetch/store behavior; then add focused tests and the smallest store/state-sync change that prevents remote empty from wiping visible/pending notebooks.

## Batch 3 Result - Phase 3 Safe Notebook Empty Fetch Guard

Updated: 2026-05-28 22:35:29 AEST

Files read in this batch:

- `src/store/nexus-store.ts`
- `src/store/nexus-store.test.ts`
- `src/lib/state-sync.ts`
- `src/components/nexus/nexus-ops.tsx`
- `src/lib/sync/local-sync-queue-adapter.ts`

Files changed in this V16 batch:

- `src/store/nexus-store.ts`
- `src/store/nexus-store.test.ts`
- `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`

Trace chain:

UI action:
app boot / notebook refresh in `NexusOps`

Zustand:
`setNotebooksCache`

registry/type:
`NotebookRecord`

nexusApiClient/state-sync:
existing `SupabaseStateSyncManager.fetchNotebooks`

/api/v1:
N/A for this local-only merge guard; existing fetch path reads Supabase directly and this batch does not claim a new governed route.

apiHandler:
N/A for this local-only merge guard.

service:
N/A for this local-only merge guard.

repository:
existing remote `notebooks` read source only; no new repository write in this batch.

observability/sync projection:
local cache/open-window projection only. Needs verification: add explicit `notebook.fetch.skipped_empty` observability if/when fetch is moved behind `/api/v1` or a backend service.

Implementation summary:

- Added `mergeRemoteNotebooksWithLocalCache` inside `src/store/nexus-store.ts`.
- `setNotebooksCache([])` now preserves the current local notebook cache when local notebooks exist, because there is no tombstone/authoritative empty projection yet.
- Existing open notebook ids and notebook window layers are preserved when the local notebooks are preserved.
- Added store tests proving an empty remote hydrate does not wipe visible local notebooks and that export still includes the preserved visible notebook.

Commands run after Batch 3:

- `rg -n "setNotebooksCache|createNotebook|updateNotebook|deleteNotebook|openNotebook|notebooksCache|fetchNotebooks|exportActiveWorkspace|createWorkspaceSnapshot|pending" src/store/nexus-store.ts`
- `rg -n "fetchNotebooks|setNotebooksCache|notebooks|localSyncQueueAdapter|upsertNotebook|deleteNotebook" src/lib/state-sync.ts src/components/nexus/nexus-ops.tsx`
- `rg -n "notebook|notebooksCache|openNotebookIds|createNotebook|updateNotebook|deleteNotebook|rehydrate|persist|export" src/store/nexus-store.test.ts src/lib/workspace-kernel.test.ts`
- Focused `nl -ba ... | sed -n ...` reads around store notebook actions, state-sync notebook fetch/upsert/delete, NexusOps boot refresh, and local sync queue status.
- `git diff -- src/store/nexus-store.ts src/store/nexus-store.test.ts`
- `npm test -- src/store/nexus-store.test.ts`
- `npm run typecheck`
- `npm run lint -- src/store/nexus-store.ts src/store/nexus-store.test.ts`
- `date '+%Y-%m-%d %H:%M:%S %Z'`
- `git diff --stat`
- `git status --short`

Test results:

- `npm test -- src/store/nexus-store.test.ts` passed: 1 file, 5 tests.
- `npm run typecheck` passed.
- `npm run lint -- src/store/nexus-store.ts src/store/nexus-store.test.ts` passed.

No-data-loss / truth status:

- Remote empty notebook fetch no longer erases a non-empty local `notebooksCache`.
- Open notebook ids/window layers remain if the preserved local notebook still exists.
- Export continues to include preserved visible notebooks after an empty remote hydrate.
- This batch does not add a second queue or hidden durable source of truth.

Known blockers / Needs verification after Batch 3:

- Needs verification: pending/unapplied notebook metadata should be derived from `localSyncQueueAdapter` and included in export/recovery metadata.
- Needs verification: non-empty remote results that omit a locally pending notebook are not yet protected.
- Needs verification: Datapad draft autosave/recovery for unsaved component draft state is not implemented.
- Needs verification: delete still removes local visible notebook immediately; backend delete is retry-safe hard delete, but no tombstone model exists.
- Workspace login recovery is unchanged in this batch.

Next safe step:

Continue Phase 3 with the smallest pending metadata slice: inspect `WorkspaceSnapshot` and `workspace-kernel` notebook export shape, then add export metadata for pending/unapplied notebook operations without changing durable truth or adding a second queue.

## Batch 4 Result - Phase 3 Notebook Export Recovery Metadata

Updated: 2026-05-28 22:42:22 AEST

Files read in this batch:

- `src/lib/nexus-types.ts`
- `src/lib/workspace-kernel.ts`
- `src/lib/workspace-kernel.test.ts`
- `src/store/nexus-store.ts`
- `src/components/nexus/nexus-ops.tsx`
- `src/lib/sync/local-sync-queue-adapter.ts`

Files changed in this V16 batch:

- `src/lib/nexus-types.ts`
- `src/lib/workspace-kernel.ts`
- `src/lib/workspace-kernel.test.ts`
- `src/store/nexus-store.ts`
- `src/store/nexus-store.test.ts`
- `src/components/nexus/nexus-ops.tsx`
- `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`

Trace chain:

UI action:
Export Workspace menu/button

Zustand:
`exportActiveWorkspace`

registry/type:
`WorkspaceSnapshot`, `WorkspaceNotebookRecoveryMetadata`, `LocalSyncQueueOperation`, `NotebookRecord`

nexusApiClient/state-sync:
N/A local export boundary; local queue read uses existing `localSyncQueueAdapter.getOperations()`.

/api/v1:
N/A local export boundary.

apiHandler:
N/A local export boundary.

service:
N/A local export boundary.

repository:
N/A local export boundary.

observability/sync projection:
N/A local export boundary. Recovery metadata is a snapshot/export projection, not a durable backend write.

Implementation summary:

- Added optional `WorkspaceNotebookRecoveryMetadata` to `WorkspaceSnapshot`.
- Added `createNotebookRecoveryMetadata` in `workspace-kernel` to derive pending/unapplied notebook operation metadata from `LocalSyncQueueOperation[]`.
- Metadata includes mutation id, notebook id, operation type, status, payload hash, workspace id, and timestamps.
- Metadata excludes raw sync payload fields such as notebook title/content; visible notebook content remains in `snapshot.notebooks`.
- Updated UI export to read `localSyncQueueAdapter.getOperations()` and attach derived notebook recovery metadata before downloading.
- If local queue read fails, UI export falls back to the normal workspace snapshot instead of blocking export.
- Updated store export to accept optional recovery metadata without changing its synchronous default path.

Commands run after Batch 4:

- `rg -n "type WorkspaceSnapshot|interface WorkspaceSnapshot|notebooks\\?|createWorkspaceSnapshot|validateWorkspaceSnapshot|sanitizeWorkspace|WorkspaceSnapshot" src/lib/nexus-types.ts src/lib/workspace-kernel.ts src/lib/workspace-kernel.test.ts src/store/nexus-store.ts`
- `rg -n "exportActiveWorkspace|download|snapshot|Import|Export|handleExport" src/components/nexus/nexus-ops.tsx src/components -g '*.tsx'`
- Focused `nl -ba ... | sed -n ...` reads around workspace snapshot types, workspace-kernel validation/export, workspace-kernel tests, and NexusOps export.
- `git diff -- src/lib/nexus-types.ts src/lib/workspace-kernel.ts src/lib/workspace-kernel.test.ts src/store/nexus-store.ts src/store/nexus-store.test.ts src/components/nexus/nexus-ops.tsx`
- `npm test -- src/lib/workspace-kernel.test.ts`
- `npm test -- src/store/nexus-store.test.ts`
- `npm run typecheck`
- `npm run lint -- src/lib/nexus-types.ts src/lib/workspace-kernel.ts src/lib/workspace-kernel.test.ts src/store/nexus-store.ts src/store/nexus-store.test.ts src/components/nexus/nexus-ops.tsx`
- `date '+%Y-%m-%d %H:%M:%S %Z'`
- `git status --short`
- `git diff --stat`

Test results:

- `npm test -- src/lib/workspace-kernel.test.ts` passed: 1 file, 20 tests.
- `npm test -- src/store/nexus-store.test.ts` passed: 1 file, 5 tests.
- `npm run typecheck` passed.
- `npm run lint -- src/lib/nexus-types.ts src/lib/workspace-kernel.ts src/lib/workspace-kernel.test.ts src/store/nexus-store.ts src/store/nexus-store.test.ts src/components/nexus/nexus-ops.tsx` passed.

No-data-loss / truth status:

- Export now includes visible notebooks plus optional local pending/unapplied notebook operation metadata.
- Pending metadata does not pretend the queued operation is synced and does not duplicate the queue as a new durable store.
- Raw pending notebook payload content is not copied into recovery metadata; the visible notebook export remains the content-bearing recovery source.

Known blockers / Needs verification after Batch 4:

- Needs verification: Datapad unsaved draft autosave/recovery is still not implemented; unsaved component-local drafts remain outside store/export until Save.
- Needs verification: non-empty remote results that omit a locally pending notebook are still not protected.
- Needs verification: delete still removes local visible notebook immediately; no frontend tombstone/undo recovery metadata exists.
- Workspace login recovery is unchanged and remains the next V16-A phase.

Next safe step:

Enter Phase 4. Read the auth/login flow, workspace state route/service/repository, and hydration service again. Implement only the smallest recovery path that can prove login will not overwrite newer local workspace state.

## Batch 5 Result - Phase 4 Workspace Login Latest Snapshot Recovery

Updated: 2026-05-28 22:56:17 AEST

Files read in this batch:

- `src/components/nexus/nexus-ops.tsx`
- `src/store/nexus-store.ts`
- `src/lib/state-sync.ts`
- `src/lib/nexus-types.ts`
- `src/lib/workspace-kernel.ts`
- `src/lib/backend/workspace/workspace-hydration-service.ts`
- `src/lib/backend/workspace/workspace-snapshot-repository.ts`
- `src/lib/backend/workspace/workspace-state-service.ts`
- `src/lib/backend/workspace/workspace-state.test.ts`
- `src/app/api/v1/workspaces/[workspaceId]/state/route.ts`
- `src/lib/backend/api/api-handler.ts`

Files changed in this V16 batch:

- `src/app/api/v1/workspaces/recovery/latest/route.ts`
- `src/components/nexus/nexus-ops.tsx`
- `src/lib/backend/workspace/workspace-hydration-service.ts`
- `src/lib/backend/workspace/workspace-snapshot-repository.ts`
- `src/lib/backend/workspace/workspace-state-service.ts`
- `src/lib/backend/workspace/workspace-state.test.ts`
- `src/lib/nexus-types.ts`
- `src/lib/state-sync.ts`
- `src/lib/workspace-kernel.ts`
- `src/store/nexus-store.ts`
- `src/store/nexus-store.test.ts`
- `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`

Trace chain:

UI action:
Supabase login/auth state event in `NexusOps`

Zustand:
`syncSupabaseSessionUser` updates `authVault.user`; `applyWorkspaceRecoveryState` applies or refuses the recovery plan.

registry/type:
`WorkspaceRecoveryStateResponse`, `WorkspaceHydrationPlan`, `WorkspaceStateGetResponse`, `WorkspaceCloudSnapshotPayload`, `NexusWorkspace`

nexusApiClient/state-sync:
`SupabaseStateSyncManager.fetchLatestWorkspaceRecoveryState`

/api/v1:
`GET /api/v1/workspaces/recovery/latest`

apiHandler:
`src/app/api/v1/workspaces/recovery/latest/route.ts`

service:
`WorkspaceStateService.getLatestRecoveryState` + `WorkspaceHydrationService.createHydrationPlan`

repository:
`WorkspaceSnapshotRepository.getLatestSnapshotForUser`

observability/sync projection:
`workspace.state.snapshot` read event for the recovered latest snapshot; client logs conflict/failure without overwriting local state.

Implementation summary:

- Added account-level latest workspace recovery route through `apiHandler`.
- Added `WorkspaceSnapshotRepository.getLatestSnapshotForUser` for in-memory and Supabase repositories.
- Added `WorkspaceStateService.getLatestRecoveryState`, which uses `WorkspaceHydrationService` to return hydrate/skip/conflict plans.
- Moved hydration plan types into shared `nexus-types` so the frontend can consume the route result without importing backend-only code.
- Added `SupabaseStateSyncManager.fetchLatestWorkspaceRecoveryState`.
- Added `materializeWorkspaceFromCloudSnapshot` to rebuild a bounded active `NexusWorkspace` from cloud workspace snapshot refs. It intentionally restores message windows as empty active messages because cloud snapshots store refs, not raw transcript.
- Added Zustand `applyWorkspaceRecoveryState`, with a second local-newer guard before applying.
- Wired login/session handling in `NexusOps` to run recovery once per signed-in user and never on logout.

Commands run after Batch 5:

- `rg -n "login\\(|logout\\(|syncSupabaseSessionUser|onAuthStateChange|authVault|WorkspaceHydration|hydrate|hydration|workspace.*state|workspaces/.*/state|WorkspaceState" src/store/nexus-store.ts src/components/nexus/nexus-ops.tsx src/lib/backend/workspace src/app/api/v1/workspaces -g '*.ts' -g '*.tsx'`
- `rg -n "WorkspaceSnapshotRepository|workspace_memberships|list|latest|get.*workspace|owner|membership|WorkspaceStateService|WorkspaceHydrationService" src/lib/backend src/app/api/v1 -g '*.ts'`
- `rg -n "WorkspaceState|WorkspaceHydration|hydrate|workspaces" src/lib/nexus-types.ts src/lib/api/nexus-api-client.ts src/lib/state-sync.ts`
- `find src/app/api/v1/workspaces -maxdepth 4 -type f -name 'route.ts' -print`
- Focused `nl -ba ... | sed -n ...` reads around auth flow, store login, state-sync workspace checksum fetch, hydration service, snapshot repository, state service, apiHandler, workspace serializer, and workspace-state tests.
- `mkdir -p src/app/api/v1/workspaces/recovery/latest`
- `git diff -- src/lib/nexus-types.ts src/lib/backend/workspace/workspace-hydration-service.ts src/lib/backend/workspace/workspace-snapshot-repository.ts src/lib/backend/workspace/workspace-state-service.ts src/app/api/v1/workspaces/recovery/latest/route.ts src/lib/state-sync.ts src/lib/workspace-kernel.ts src/store/nexus-store.ts src/components/nexus/nexus-ops.tsx src/lib/backend/workspace/workspace-state.test.ts src/store/nexus-store.test.ts`
- `npm test -- src/lib/backend/workspace/workspace-state.test.ts`
- `npm test -- src/store/nexus-store.test.ts`
- `npm run typecheck`
- `npm run lint -- src/app/api/v1/workspaces/recovery/latest/route.ts src/components/nexus/nexus-ops.tsx src/lib/backend/workspace/workspace-hydration-service.ts src/lib/backend/workspace/workspace-snapshot-repository.ts src/lib/backend/workspace/workspace-state-service.ts src/lib/backend/workspace/workspace-state.test.ts src/lib/nexus-types.ts src/lib/state-sync.ts src/lib/workspace-kernel.ts src/store/nexus-store.ts src/store/nexus-store.test.ts`
- `date '+%Y-%m-%d %H:%M:%S %Z'`
- `git status --short`
- `git diff --stat`

Test results:

- `npm test -- src/lib/backend/workspace/workspace-state.test.ts` passed: 1 file, 14 tests.
- `npm test -- src/store/nexus-store.test.ts` passed: 1 file, 7 tests.
- `npm run typecheck` passed.
- First lint run had one unused type-import warning in `workspace-hydration-service.ts`; fixed by removing the unused import.
- Final `npm run lint -- src/app/api/v1/workspaces/recovery/latest/route.ts src/components/nexus/nexus-ops.tsx src/lib/backend/workspace/workspace-hydration-service.ts src/lib/backend/workspace/workspace-snapshot-repository.ts src/lib/backend/workspace/workspace-state-service.ts src/lib/backend/workspace/workspace-state.test.ts src/lib/nexus-types.ts src/lib/state-sync.ts src/lib/workspace-kernel.ts src/store/nexus-store.ts src/store/nexus-store.test.ts` passed.

No-data-loss / truth status:

- Login can now ask the backend for the latest cloud workspace snapshot owned by the signed-in user.
- The backend returns a hydration plan and conflicts when the matching local workspace is newer.
- The frontend applies only hydrate plans and still refuses to overwrite if its local workspace is newer at apply time.
- Clean/missing local workspace recovery is covered by store tests: the cloud workspace is added and activated while the existing local workspace is preserved.
- Cloud snapshot recovery does not claim full transcript recovery; active messages materialized from cloud snapshots are empty because cloud snapshots intentionally store message refs only.

Known blockers / Needs verification after Batch 5:

- Needs verification: multi-workspace picker. This batch recovers the latest snapshot only, not a user-selectable workspace list.
- Needs verification: local checksum is not yet computed/passed from frontend login recovery, so checksum-match skip relies on future wiring.
- Needs verification: full message transcript recovery remains blocked until message durable applier/history projection is proven.
- Needs verification: Datapad draft autosave/recovery and delete tombstone remain incomplete.

Next safe step:

Run the combined targeted V16-A verification set, then decide whether to stop for review or add one more very small safety patch for notebook non-empty remote merge/delete recovery.

## Batch 6 Result - Phase 3 Non-Empty Notebook Merge Guard

Updated: 2026-05-28 23:00:54 AEST

Files changed in this V16 batch:

- `src/store/nexus-store.ts`
- `src/store/nexus-store.test.ts`
- `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`

Trace chain:

UI action:
app boot / notebook refresh in `NexusOps`

Zustand:
`setNotebooksCache`

registry/type:
`NotebookRecord`

nexusApiClient/state-sync:
existing `SupabaseStateSyncManager.fetchNotebooks`

/api/v1:
N/A local merge guard; no governed route added for notebook fetch in this batch.

apiHandler:
N/A local merge guard.

service:
N/A local merge guard.

repository:
existing remote `notebooks` read source only; no repository write in this batch.

observability/sync projection:
local cache/open-window projection only. Needs verification: backend fetch observability if notebook fetch is later moved behind `/api/v1`.

Implementation summary:

- Extended notebook cache merge so non-empty remote fetches no longer drop local-only notebooks.
- For the same notebook id, the newer local `updated_at`/`created_at` copy wins over an older remote copy.
- This is intentionally conservative until notebook tombstones/authoritative deletes exist.
- Added store tests for local-only notebook preservation and newer-local-over-older-remote preservation.

Commands run after Batch 6:

- `npm test -- src/store/nexus-store.test.ts`
- `npm run typecheck`
- `npm run lint -- src/store/nexus-store.ts src/store/nexus-store.test.ts`
- `npm test -- src/lib/sync/local-sync-queue-adapter.test.ts src/lib/backend/sync/sync-queue.test.ts src/lib/backend/workspace/workspace-state.test.ts src/lib/workspace-kernel.test.ts src/store/nexus-store.test.ts`
- `date '+%Y-%m-%d %H:%M:%S %Z'`
- `git status --short`
- `git diff --stat`

Test results:

- `npm test -- src/store/nexus-store.test.ts` passed: 1 file, 9 tests.
- `npm run typecheck` passed.
- `npm run lint -- src/store/nexus-store.ts src/store/nexus-store.test.ts` passed.
- Combined targeted suite passed: 5 files, 65 tests.

No-data-loss / truth status:

- Remote empty fetch cannot wipe local notebooks.
- Remote non-empty fetch cannot omit local-only notebooks.
- Older remote copies cannot overwrite newer local notebook copies.
- This still does not claim remote delete authority because no notebook tombstone exists.

Known blockers / Needs verification after Batch 6:

- Needs verification: frontend delete tombstone/undo recovery remains incomplete.
- Needs verification: unsaved Datapad component-local drafts remain outside store/export until Save.
- Needs verification: notebook fetch still reads Supabase directly rather than through `/api/v1`.
- Needs verification: login recovery has latest-snapshot recovery, not a multi-workspace picker.
- Needs verification: full message transcript recovery remains blocked until message durable applier/history projection.

Current V16-A status:

- Status semantics: implemented and tested.
- Notebook durable backend applier: implemented and tested for upsert, stale conflict, and idempotent delete.
- Notebook safe fetch merge: implemented and tested for empty remote, local-only omissions, and newer local copies.
- Export recovery metadata: implemented and tested for pending/unapplied notebook operations without raw payload content.
- Workspace login recovery: latest cloud snapshot recovery implemented and tested with newer-local conflict guard.

Next safe step:

Stop this first V16-A implementation slice for review, or continue only with explicitly scoped follow-up work such as delete tombstones, draft autosave, governed notebook fetch route, or multi-workspace recovery picker.

## Final Verification For V16-A First Slice

Updated: 2026-05-28 23:02:28 AEST

Additional command:

- `git diff --check`

Result:

- `git diff --check` passed with no whitespace errors.

Stopping point:

- Stop for review. V16-A first slice has concrete code, tests, trace chains, and checkpoint coverage.
- Remaining V16-A hardening items are explicitly marked `Needs verification` above rather than treated as complete.
