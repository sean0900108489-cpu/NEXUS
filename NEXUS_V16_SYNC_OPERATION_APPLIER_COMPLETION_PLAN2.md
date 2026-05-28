# NEXUS V16 Sync Operation Applier Completion Plan 2

Generated: 2026-05-28  
Status: read-only scan + next implementation plan; this file is the continuation plan after the V16-A first slice.  
Reference: `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md` and `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`.

This plan is for the next Codex implementation round. It assumes V16-A first slice has already landed: status truth, notebook durable applier, safe notebook merge, export recovery metadata, and latest workspace login recovery. It does not assume full V16 is complete.

## 0. How To Use This File

Read this file before code. Then read:

1. `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md`
2. `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`
3. `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`
4. `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`
5. `NEXUS_ITERATION_UPGRADE_RANKING.md`
6. the source files named in each phase below

Work slowly and in small batches. The project can run all day if needed; stability is more important than speed. If dependencies or tests are missing in a worktree, record that in the checkpoint before trying heavy installation or full-suite runs.

Mandatory trace chain before every code batch:

```text
UI action → Zustand → registry/type → nexusApiClient/state-sync → /api/v1 → apiHandler → service → repository → observability/sync projection
```

If a flow is local-only, export-only, migration-only, or test-only, write:

```text
Trace chain: N/A <reason>
Data-loss guard: <why this cannot erase or hide user-visible state>
```

Reread this file after Phase 3 and again before Phase 6. The most common failure mode is forgetting that `queued != synced`, remote empty is not authoritative, and account recovery must not trust a client-provided user id by itself.

## 1. 起點（目前狀況描述）

The current scanned state is V16-A first slice, not full V16.

Completed or partially completed:

- `queued != synced` is implemented in `local-sync-queue-adapter`; backend `queued` now remains local `queued`.
- `notebook` sync operations are handled by `SyncOperationApplier -> NotebookService -> NotebookRepository`.
- notebook upsert/delete can become `synced` only after the applier returns applied.
- notebook remote fetch is merged conservatively with local cache; empty remote and omitted local-only notebooks do not wipe local visible Datapads.
- export includes `snapshot.notebooks` from `notebooksCache` and pending notebook operation metadata from the local sync queue.
- login recovery has a latest-workspace snapshot route and a frontend call after auth state changes.

Still incomplete:

- Unsaved Datapad window drafts are still component-local until Save.
- notebook delete is still local immediate removal and backend hard delete; there is no tombstone/undo/recovery model.
- `public.notebooks` is referenced by code and RLS, but the scanned migrations do not create the table. They only alter it if it already exists.
- notebook fetch still reads Supabase directly from `state-sync.ts`, not through a governed `/api/v1` service route.
- workspace recovery route trusts `X-User-Id`; it does not prove the user from an authenticated Supabase session.
- workspace recovery returns latest snapshot only, not a workspace list/picker.
- workspace cloud snapshots contain message refs, not full transcript content; clean-browser login does not restore full chat transcripts.
- `message`, `prompt`, and `artifact_reference` still return backend `queued` from `SyncOperationApplier`.
- prompt fetch can still replace local prompt cache without the same safe merge/tombstone protections notebooks now have.
- direct artifact reference APIs exist, but sync queue parity for `artifact_reference` is not implemented.

## 2. 需要注意狀況

### 2.1 Frontend State Boundaries

Zustand is still the active interaction cache. Do not turn it into an unbounded durable database. Active UI state belongs in `nexus-store`; durable/history data must be backed by service/repository paths.

Current frontend state risks:

- Datapad draft state is inside `DatapadWindow`; closing, refresh, or remote overwrite before Save can still lose draft text.
- Prompt editor draft state is inside `PromptVaultManager`; it is not protected by sync until Save.
- `exportActiveWorkspace` exports the current visible cache. It is a safety source, not proof that cloud durability succeeded.
- Login recovery currently activates the recovered latest workspace; this preserves existing local workspaces but can surprise the user without a picker.

### 2.2 Backend/API Boundaries

Governed data paths should use:

```text
nexusApiClient -> /api/v1 route -> apiHandler -> service -> repository -> observability
```

Current backend risks:

- `GET /api/v1/workspaces/recovery/latest` reads `X-User-Id` directly. That header is client-controlled in the current `nexusApiClient`.
- notebook repository uses `notebooks` but the table creation is not guaranteed by scanned migrations.
- notebook repository currently upserts on `id`; the migration must guarantee the matching unique constraint.
- hard delete has no tombstone, so other clients cannot know whether a missing remote notebook means deleted, failed fetch, missing permission, or old data.
- `message`, `prompt`, and `artifact_reference` queue operations still have no durable applier.

### 2.3 Definition and Naming Rules

Keep names aligned with current project definitions:

- `NotebookRecord` is the frontend/store record.
- `PromptRecord` and `PromptRevisionRecord` are prompt cache records.
- `WorkspaceRecoveryStateResponse` is current latest recovery response.
- `WorkspaceHydrationPlan` is the local/cloud conflict decision.
- `SyncEntityType` currently includes `workspace`, `agent`, `message`, `prompt`, `notebook`, `artifact_reference`.
- `SyncOperationStatus` includes `pending`, `queued`, `syncing`, `synced`, `retrying`, `failed`, `conflicted`, `cancelled`, `compacted`.
- Do not add parallel status words unless they are mapped to these types or intentionally added in one registry/type update.

### 2.4 Coupling Rules For Zero-Friction Upgrade

- Do not create a second sync queue.
- Do not add component-to-Supabase writes for governed sync behavior.
- Do not duplicate repository logic in frontend adapters.
- Do not let direct Supabase reads and `/api/v1` reads become competing sources of truth.
- Do not treat remote empty as authoritative unless an applied tombstone or explicit empty projection proves it.
- Do not make workspace recovery destroy or replace a newer local workspace.
- Do not log raw notebook, prompt, message, or artifact content in observability.
- Do not start broad V15 localStorage trimming until message durability and clean-browser transcript recovery are proven.

## 3. Goal

Full V16 goal:

Complete sync operation application so every supported `SyncEntityType` either has a durable applier and safe recovery semantics, or is explicitly blocked from queue usage with a visible unapplied status. The user must be able to trust sync status, export, and login recovery without hidden data loss.

V16 Plan 2 exit goals:

- Datapads are safe across Save, unsaved draft recovery, export, remote fetch, delete, retry, and account login.
- workspace recovery uses authenticated user identity, exposes a workspace list or picker, passes local checksum, and never overwrites newer local state.
- `message`, `prompt`, and `artifact_reference` are no longer silently accepted as backend `queued` forever.
- all destructive operations use tombstones, undo windows, or explicit conflict paths.
- frontend/backend/type names are aligned, documented, and tested.
- the project has a resume-safe checkpoint process for long or interrupted Codex runs.

## 4. Current Scan Matrix

| Area | Current state | V16 Plan 2 requirement |
| --- | --- | --- |
| Queue status truth | Mostly done. Server `queued` remains local `queued`. | Keep it; add UI wording for unapplied/pending operations. |
| Notebook upsert | Backend applier writes through `NotebookService`. | Add migration guarantee, governed fetch route, stronger auth, and operation tests against schema behavior. |
| Notebook delete | Backend hard delete, frontend immediate local removal. | Add tombstone + undo/recovery semantics before claiming no-data-loss delete. |
| Notebook fetch | Direct Supabase read, safe local merge in store. | Move to governed `/api/v1` route with service/repository, tombstone-aware merge, observability. |
| Datapad unsaved draft | Component-local only. | Add bounded local draft autosave/recovery and export draft metadata. |
| Export | Includes visible notebooks + pending op metadata. | Include unsaved draft recovery metadata and delete/tombstone state without raw queue payload leaks. |
| Login recovery | Latest snapshot only, header user id. | Authenticated account recovery, workspace list/picker, local checksum guard. |
| Workspace snapshots | Bounded cloud snapshot with message refs. | Do not claim transcript recovery until message applier exists. |
| Message sync | Still queued. Message repository lists/archives only. | Add durable message upsert/create applier and clean-browser restore tests. |
| Prompt sync | Still queued. Direct Supabase fetch + local cache replacement. | Add prompt service/repository/applier, revisions, tombstones, safe merge. |
| Artifact reference sync | Still queued, direct artifact service can create references. | Implement sync parity or block queue entity. |
| Migrations | No scanned `CREATE TABLE public.notebooks`. | Add forward-only migration and update typed schema. |
| Checkpoint | Exists. | Continue updating after every small batch and after restarts. |

## 5. Execution Weights

| Workstream | Weight | Why |
| --- | ---: | --- |
| Auth/session hardening for recovery APIs | 15% | Prevents account data from being recovered by spoofed headers. |
| Notebook schema + tombstone + governed fetch | 18% | Completes the Datapad durability promise. |
| Datapad draft autosave/export recovery | 12% | Fixes the remaining user-visible unsaved draft gap. |
| Workspace discovery/picker + checksum hydrate | 15% | Makes login recovery useful and safe across workspaces/devices. |
| Message durable applier | 15% | Required before future V15 storage diet can safely trim transcripts. |
| Prompt durable applier + safe merge | 10% | Brings Prompt Vault into the same no-data-loss model. |
| Artifact reference sync parity | 7% | Removes a split-brain direct route vs sync queue behavior. |
| Observability/status UI/docs/tests | 8% | Keeps future Codex runs and operators from guessing. |

## 6. 執行升級過程

### Phase 0 - Preflight And Evidence Refresh

Purpose: verify the current worktree and avoid implementing from stale memory.

Read:

- this plan2 file
- original V16 plan
- V16 checkpoint
- `src/lib/backend/sync/sync-operation-applier.ts`
- `src/lib/sync/local-sync-queue-adapter.ts`
- `src/lib/state-sync.ts`
- `src/store/nexus-store.ts`
- `src/components/nexus/DatapadWindow.tsx`
- `src/components/nexus/nexus-ops.tsx`
- `src/lib/nexus-types.ts`
- relevant Next local docs if touching routes/UI boundaries

Commands:

```bash
git status --short
rg -n "notebook|prompt|message|artifact_reference|recovery|queued|synced" src NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md
rg -n "create table.*notebooks|public.notebooks|notebooks" supabase src/lib/supabase/database.types.ts
```

Checkpoint output:

- current phase
- exact changed files, if any
- operation matrix
- blockers
- next safe step

### Phase 1 - Authenticated Recovery Boundary

Problem:

`GET /api/v1/workspaces/recovery/latest` currently trusts `X-User-Id`. `nexusApiClient` can set that header from the browser. Account recovery must not rely on that as proof of identity.

Trace chain:

```text
UI action:
  Supabase login/session change
Zustand:
  syncSupabaseSessionUser + recovery action
registry/type:
  WorkspaceRecoveryStateResponse, WorkspaceHydrationPlan
nexusApiClient/state-sync:
  fetchLatestWorkspaceRecoveryState with authenticated session token/cookie
/api/v1:
  GET /api/v1/workspaces/recovery/latest or replacement recovery route
apiHandler:
  route validates authenticated user from trusted session context
service:
  WorkspaceStateService / WorkspaceRecoveryService
repository:
  WorkspaceSnapshotRepository
observability/sync projection:
  workspace.recovery.authenticated / denied / failed
```

Required:

- Add a shared server-side auth resolver for `/api/v1` routes or recovery routes.
- Prefer Supabase session/cookie/token verification over client-provided `X-User-Id`.
- Continue supporting local/dev fallback only if explicitly bounded and tested.
- Add tests: missing auth, spoofed `X-User-Id`, valid user, wrong-user snapshot denial.
- Update `nexusApiClient` only if needed to pass real auth metadata consistently.

Exit:

- recovery APIs derive user id from a trusted server-side path;
- client-provided user id alone cannot recover cloud workspace data.

### Phase 2 - Notebook Schema Foundation And Tombstones

Problem:

Notebook code now assumes `public.notebooks`, but migrations only alter/policy the table if it exists. Delete is hard delete and cannot distinguish remote deletion from remote fetch omission.

Trace chain:

```text
UI action:
  Datapad create/save/delete
Zustand:
  createNotebook/updateNotebook/deleteNotebook plus local tombstone state
registry/type:
  NotebookRecord + tombstone/delete metadata
nexusApiClient/state-sync:
  upsertNotebook/deleteNotebook -> localSyncQueueAdapter
/api/v1:
  POST /api/v1/sync/operations
apiHandler:
  sync operations route
service:
  SyncQueueService -> SyncOperationApplier -> NotebookService
repository:
  NotebookRepository with Supabase/in-memory tombstone support
observability/sync projection:
  notebook.applied / tombstoned / restored / conflicted
```

Required:

- Add a forward-only migration that creates `public.notebooks` if missing.
- Add or verify unique constraint compatible with repository upsert. If the repository uses `onConflict: "id"`, guarantee unique `id`.
- Add tombstone columns such as `deleted_at`, `deleted_by`, `delete_client_mutation_id`, and optional `restored_at`.
- Update `src/lib/supabase/database.types.ts`.
- Update `NotebookRepository` so delete writes tombstone by default instead of hard delete.
- Keep hard purge as a separate admin/retention operation, not the normal sync delete.
- Add tests for create table migration text, upsert idempotency, stale update conflict, tombstone delete, restore/undo if implemented, and fetch hiding deleted notebooks.

Exit:

- notebook table exists from migrations in a clean DB;
- delete is retry-safe and observable;
- remote missing data is not confused with applied delete.

### Phase 3 - Datapad Draft Autosave And Export Recovery

Problem:

Unsaved Datapad title/content lives in `DatapadWindow` local component state until Save.

Trace chain:

```text
UI action:
  user types in DatapadWindow without pressing Save
Zustand:
  bounded notebookDraftRecovery or equivalent local recovery store
registry/type:
  NotebookDraftRecoveryRecord / WorkspaceNotebookDraftRecoveryMetadata
nexusApiClient/state-sync:
  N/A local-only until user Save, unless product chooses autosave-to-notebook
/api/v1:
  N/A local-only
apiHandler:
  N/A local-only
service:
  N/A local-only
repository:
  N/A local-only
observability/sync projection:
  optional local-only status; no raw content in backend observability
```

Required:

- Add bounded local draft recovery state for each open notebook.
- Keep draft size capped; follow notebook payload max.
- Persist enough draft metadata to survive refresh/restart.
- Export unsaved draft recovery metadata or materialize drafts into exported notebooks with clear `draft` marker.
- Do not send unsaved draft content to backend observability.
- UI should indicate unsaved/recovered draft state without adding explanatory text that clutters the app.
- Tests: draft survives store rehydrate, export includes unsaved draft recovery, saved draft clears recovery, remote refresh does not wipe newer draft.

Exit:

- user typing in Datapad is recoverable even before Save;
- export protects visible draft content or explicitly marks the draft recovery payload.

### Phase 4 - Governed Notebook Fetch Route

Problem:

`fetchNotebooks()` currently reads Supabase directly from frontend state-sync. The write path is governed by sync queue; read path is direct. This creates coupling and makes tombstone-aware fetch harder.

Trace chain:

```text
UI action:
  app boot / right panel notebook refresh
Zustand:
  setNotebooksCache / merge notebook cache
registry/type:
  NotebookRecord, tombstone metadata if exposed
nexusApiClient/state-sync:
  SupabaseStateSyncManager.fetchNotebooks -> nexusApiClient.get
/api/v1:
  GET /api/v1/workspaces/[workspaceId]/notebooks or equivalent
apiHandler:
  notebook list route with permission/auth
service:
  NotebookService.listNotebooks
repository:
  NotebookRepository.listByWorkspace
observability/sync projection:
  notebook.fetch.merged / skipped_empty / tombstone_applied
```

Required:

- Add notebook list route under `/api/v1`.
- Use `apiHandler`, permission checks, and the trusted auth resolver.
- Move frontend fetch to `nexusApiClient`.
- Make merge tombstone-aware: applied tombstones can remove local records; failed/unknown empty results cannot.
- Add tests for empty fetch, omitted local-only, newer local, applied tombstone, permission denied, and fetch error.

Exit:

- notebook reads and writes share backend service/repository definitions;
- no direct frontend Supabase notebook read remains for governed behavior.

### Phase 5 - Workspace Discovery, Picker, And Checksum Recovery

Problem:

Login recovery currently returns only the latest snapshot. It does not list account workspaces and the frontend does not pass local checksum.

Trace chain:

```text
UI action:
  login success / explicit restore workspace
Zustand:
  authVault.user + workspace recovery list state + applyWorkspaceRecoveryState
registry/type:
  WorkspaceRecoveryListResponse, WorkspaceRecoveryCandidate, WorkspaceHydrationPlan
nexusApiClient/state-sync:
  fetchWorkspaceRecoveryCandidates / fetchWorkspaceRecoveryState
/api/v1:
  GET /api/v1/workspaces/recovery or /api/v1/workspaces/recovery/latest
apiHandler:
  authenticated recovery route
service:
  WorkspaceRecoveryService + WorkspaceStateService + WorkspaceHydrationService
repository:
  WorkspaceSnapshotRepository + workspace membership/list repository
observability/sync projection:
  workspace.recovery.listed / selected / applied / conflict / skipped
```

Required:

- Add account workspace candidate list with workspace id, name, updatedAt, checksum, snapshot type, and safety status.
- Add UI recovery picker or explicit operator choice when multiple cloud workspaces exist.
- Compute/pass local checksum for active local workspace where possible.
- Keep newer-local conflict guard on both server and client.
- Preserve existing local workspaces if cloud recovery applies.
- Add tests: no cloud state, single workspace auto-recover, multiple workspace picker data, local newer conflict, checksum match skip, wrong user denied.

Exit:

- login recovery is safe and understandable across multiple workspaces;
- clean browser can recover at least workspace structure/settings/latest active snapshot.

### Phase 6 - Message Durable Applier

Problem:

Cloud workspace snapshots keep message refs only. Full chat transcript recovery requires durable message writes. `message` sync operations still return backend `queued`.

Trace chain:

```text
UI action:
  user sends message / assistant stream final / tool result creates message
Zustand:
  active agent messages + historical message sync call
registry/type:
  AgentMessage, HistoricalMessageRecord, SyncEntityType = "message"
nexusApiClient/state-sync:
  insertMessage or syncHistoricalMessage -> localSyncQueueAdapter
/api/v1:
  POST /api/v1/sync/operations
apiHandler:
  sync operations route
service:
  SyncQueueService -> SyncOperationApplier -> MessageHistoryService/MessageService
repository:
  MessageRepository insert/upsert + list/archive
observability/sync projection:
  message.applied / conflicted / failed, no raw content
```

Required:

- Add message repository insert/upsert.
- Define idempotency by `message.id + contentHash`.
- Conflict on same id with different content unless an explicit revision/update policy exists.
- Bound message content size and redact metadata.
- Add sync applier branch for `message`.
- Add clean-browser recovery test through history fetch.
- Do not enable V15 message trimming until this phase passes.

Exit:

- message operations no longer silently remain backend `queued`;
- clean local cache can fetch durable transcript pages.

### Phase 7 - Prompt Durable Applier And Safe Merge

Problem:

Prompt Vault writes enqueue `prompt` operations, but sync applier still returns backend `queued`. Fetch directly reads Supabase and store replacement can wipe dirty local prompts.

Trace chain:

```text
UI action:
  PromptVaultManager save/delete
Zustand:
  updatePrompt/deletePrompt/promptsCache
registry/type:
  PromptRecord, PromptRevisionRecord, SyncEntityType = "prompt"
nexusApiClient/state-sync:
  upsertPrompt/deletePrompt -> localSyncQueueAdapter
/api/v1:
  POST /api/v1/sync/operations and governed prompt fetch route if added
apiHandler:
  sync route / prompt route
service:
  PromptService
repository:
  prompts + prompt_revisions
observability/sync projection:
  prompt.applied / revision_created / tombstoned / conflicted
```

Required:

- Add prompt service/repository or reuse a clear existing boundary if one exists.
- Add prompt upsert/delete sync applier.
- Preserve prompt revisions; cap revision count.
- Add prompt tombstone/delete semantics.
- Add safe fetch merge like notebook merge.
- Add tests for stale update conflict, revision creation, delete tombstone, remote empty non-destructive, secret/size validation.

Exit:

- prompt queue operations apply durably or visibly fail/conflict;
- prompt fetch does not erase dirty local edits.

### Phase 8 - Artifact Reference Sync Parity

Problem:

Direct artifact reference APIs can create references, but `artifact_reference` sync operations remain backend `queued`.

Trace chain:

```text
UI action:
  artifact linked from message/notebook/prompt/tool
Zustand:
  artifact vault/update path
registry/type:
  ArtifactReferenceRecord, ArtifactReferencedByType, SyncEntityType = "artifact_reference"
nexusApiClient/state-sync:
  direct artifact API or localSyncQueueAdapter
/api/v1:
  artifact reference route or sync operations route
apiHandler:
  governed route
service:
  ArtifactService / ArtifactReferenceResolver
repository:
  artifact_references
observability/sync projection:
  artifact_reference.applied / deduplicated / failed / conflicted
```

Required decision:

- Either implement sync applier parity with `ArtifactService.createReference`;
- or explicitly block `artifact_reference` from sync queue usage and document direct artifact API as canonical.

Required tests:

- unique `(workspace, artifact, referencedByType, referencedById)`;
- missing artifact rejection;
- direct route and sync route parity if enabled;
- no false `synced` if the route is blocked.

Exit:

- artifact references cannot sit silently as backend `queued` without operator-visible meaning.

### Phase 9 - Status UI, Observability, And Sync Projection

Problem:

Queue truth is improved, but user-facing status and backend observability must consistently say what is actually durable.

Required:

- Review all "Synced" wording and badges.
- Distinguish `queued/unapplied`, `syncing`, `synced/applied`, `failed`, `conflicted`.
- `/api/v1/sync/status` should expose unapplied counts clearly.
- Observability events must include ids, lengths, hashes, statuses, and reasons, but not raw content.
- Tests should assert backend `queued` does not appear as UI `Synced`.

Exit:

- the UI and status projections cannot give false confidence.

### Phase 10 - Final Verification, Docs, And Build Gate

Run targeted checks first:

```bash
npm test -- src/lib/sync/local-sync-queue-adapter.test.ts
npm test -- src/lib/backend/sync/sync-queue.test.ts
npm test -- src/lib/backend/workspace/workspace-state.test.ts
npm test -- src/lib/workspace-kernel.test.ts
npm test -- src/store/nexus-store.test.ts
npm run typecheck
```

Then add new targeted tests for phases touched.

Run broader checks only when the machine can tolerate them:

```bash
npm run lint
npm test
npm run build
```

If `vitest` or other local dependencies are unavailable, record `blocked: dependency missing` in the checkpoint and do not claim verification passed.

Update:

- `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`
- this plan2 file if scope decisions change
- architecture/execution maps if new routes/services/repositories are added

## 7. Project Upgrade Rules

1. Every destructive operation needs a tombstone, undo, or explicit applied-delete proof.
2. Remote empty is not proof of deletion.
3. Backend `queued` is not durable `synced`.
4. A route that returns account data must derive user identity from trusted auth, not just `X-User-Id`.
5. Frontend state may cache active data but must not become the hidden durable source of truth.
6. Export is a last-resort safety source and must include user-visible local data plus recovery metadata.
7. Services own domain validation; repositories own persistence; components must not own persistence logic.
8. Observability must not leak raw notebook/prompt/message/artifact content.
9. Tests must include idempotency, stale conflict, fetch merge, delete/tombstone, and clean-browser recovery where applicable.
10. Do not add broad refactors while closing V16 sync gaps.

## 8. Shutdown / Resume Protection

V16 Plan 2 is expected to be long-running. Every implementation batch must update `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`.

Checkpoint format:

```text
Current phase:
Files read:
Files changed:
Trace chains approved:
Operations touched:
Commands run:
Test results:
Data-loss risk:
Blockers / Needs verification:
Next safe step:
```

Resume rule after sleep, shutdown, crash, or context loss:

1. Read this file.
2. Read original V16 plan.
3. Read `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`.
4. Run `git status --short`.
5. Inspect diffs for changed files.
6. Restate current phase and no-data-loss risk.
7. Continue only with the next safe small batch.

Do not rely on memory-only claims after a long run. If the model cannot back a statement with code, diff, test output, or this document, mark it `Needs verification`.

## 9. Definition Of Done For Full V16

Full V16 is done only when:

- all supported sync entities either apply durably or are explicitly blocked from queue usage;
- Datapads survive Save, unsaved draft, export, reload, remote empty fetch, delete retry, and account login recovery;
- workspace login recovery is authenticated, multi-workspace aware, checksum guarded, and non-destructive;
- messages can be durably written and fetched after clean local cache;
- prompts use durable sync and safe merge;
- artifact reference sync behavior matches the direct artifact API or is blocked;
- status UI and `/sync/status` distinguish queued/unapplied from synced/applied;
- migrations support clean DB setup for every table the code requires;
- all new routes use local Next.js route-handler rules and `apiHandler`;
- checkpoint and docs explain exactly what changed and what remains blocked.

## 10. Next-Round Codex Starter Prompt

Use this prompt for the implementation round:

```text
請先讀取並遵守 `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN2.md`，再讀取原本的 `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md` 與 `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`。目標是完成 V16 Plan 2 的剩餘同步、恢復、資料保全升級。

不要急著改碼。請慢慢做、分批做、低負載做；我的電腦效能可能有限，跑很久、跑整天都可以，穩定比速度重要。

每次動手前先畫完整 trace chain：
UI action → Zustand → registry/type → nexusApiClient/state-sync → /api/v1 → apiHandler → service → repository → observability/sync projection

畫不出 trace chain 的地方不要落地；local-only / export-only / migration-only / test-only 必須明確標成 N/A 並說明資料不會遺失的原因。

請優先補：recovery route 真正的 auth/session 邊界、notebooks table migration 與 tombstone、Datapad unsaved draft recovery、governed notebook fetch route、workspace recovery list/picker/local checksum。之後再做 message、prompt、artifact_reference durable applier。

請遵守 no-data-loss 規則：queued 不等於 synced；remote empty 不是刪除證明；登入 hydrate 不得覆蓋 newer local；delete 必須 tombstone 或可恢復；export 必須保護使用者目前可見資料。

請持續更新 `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`。每個小批次後記錄目前 phase、已讀文件、已改文件、trace chain、跑過的指令、測試結果、blocker、下一個安全步驟。若中途重啟，先讀 plan2、原 V16 plan、checkpoint、git status、diff，再繼續。

做到 Phase 3 後，停下來重讀 plan2、原 V16 plan、V15 文件與 checkpoint，再繼續。測試分批跑；若 vitest 或依賴不存在，請記錄 blocker，不要宣稱測試通過。
```
