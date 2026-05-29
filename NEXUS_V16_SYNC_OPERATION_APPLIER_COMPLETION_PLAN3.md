# NEXUS V16 Sync Operation Applier Completion Plan 3

Generated: 2026-05-29
Status: V16 continuation plan. This is not V17.
Purpose: finish the remaining V16 sync, recovery, data-protection, and architecture hygiene gaps after the Plan2 implementation pass.

This file is the canonical next implementation document if `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN2.md` is still missing from the main project root. If Plan2 is restored later, read it for history, but do not let it override the Plan3 findings below unless the code has changed and the evidence is refreshed.

## 0. How To Use This File

Read this file first. Then read:

1. `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md`
2. `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`
3. `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`
4. `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`
5. `NEXUS_ITERATION_UPGRADE_RANKING.md`
6. relevant source files named in each phase

Do not open V17 work. This is still V16 completion.

Work at a normal safe engineering pace. The previous low-speed computer constraint is lifted. Do not artificially slow down, but do not skip trace chains, tests, or checkpoint updates to move faster.

Before each code batch, write the trace chain:

```text
UI action -> Zustand -> registry/type -> nexusApiClient/state-sync -> /api/v1 -> apiHandler -> service -> repository -> observability/sync projection
```

If a flow is local-only, export-only, migration-only, verification-only, or test-only, write:

```text
Trace chain: N/A <reason>
Data-loss guard: <why this cannot erase, expose, or hide user-visible state>
```

After Phase 3, reread this Plan3 file, the original V16 plan, the checkpoint, and the V15 architecture hygiene file before continuing. The biggest remaining risks are not feature count; they are account isolation, false sync truth, and recovery decisions based on the wrong local workspace.

## 1. 起點（目前狀況描述）

Current scanned state:

- V16 Plan2 implementation is partly landed in the main project working tree.
- `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN2.md` is not present in the main project root. A Plan2 copy was found in an older Codex worktree, but the main repo cannot rely on that for future recovery.
- The main project has many uncommitted V16 files. Do not revert them.
- Last recorded verification in the checkpoint: targeted tests passed, targeted lint passed, `npm run typecheck` passed, `npm run build` passed, dev server reached `200 OK`, and `/api/v1/health` returned `200`.
- Review follow-up verification also reran targeted tests, typecheck, `git diff --check`, and basic curl health checks successfully.

Approximate V16 completion after scan: 82%.

Already completed or mostly completed:

- `queued != synced` status truth.
- notebook durable applier through `SyncOperationApplier -> NotebookService -> NotebookRepository`.
- notebook tombstone fields and additive migration file.
- Datapad local draft autosave/export recovery.
- governed notebook fetch route at `/api/v1/notebooks`.
- authenticated recovery routes with bearer/session resolver.
- workspace recovery list/picker path and local checksum support.
- message durable applier.
- prompt durable applier, prompt tombstones, and safe local prompt merge.
- `artifact_reference` queue path rejection with canonical direct-route pointer.

Still incomplete or unsafe:

- Account-scoped Global Datapads are not fully safe. `workspace_id IS NULL` notebooks can currently be selected as global rows without filtering to the verified account, and the RLS policy allows `workspace_id IS NULL`.
- Message applier does not yet prove idempotency by `message.id + contentHash`. Same id with different content can overwrite existing durable content.
- Selected workspace recovery can send the active local workspace checksum while recovering a different selected cloud workspace. That can create false conflicts or false skips.
- Plan2 file is missing in the main repo, weakening restart/recovery instructions.
- New Supabase migrations have not been run against a disposable database.
- `public.messages` base table is still assumed by the repo; current migrations harden it but do not create it from scratch.
- Browser interaction verification has not been run for recovery picker, Datapad draft recovery, governed notebook fetch, and delete/tombstone flows.
- Prompt fetch still uses the existing direct Supabase path in `state-sync.ts`; safe merge exists, but a governed prompt fetch route is still not implemented.
- Prompt revision durability remains future hardening unless explicitly finished in this V16 pass.

## 2. 需要注意狀況

### 2.1 Frontend Layer

Frontend is still the active UI cache. It must not be treated as proof of cloud durability.

Important current paths:

- Datapad UI: `DatapadWindow.tsx`
- workspace/recovery UI: `nexus-ops.tsx`
- durable UI cache and export: `nexus-store.ts`
- local recovery helpers: `workspace-recovery-local.ts`
- direct sync adapter: `state-sync.ts`

Frontend risks to remove:

- A recovered selected workspace must compare against the local workspace with the same id, not whichever workspace is currently active.
- Datapad drafts must remain local/export recoverable until explicitly saved and durably applied.
- Prompt safe merge must not let remote empty results erase newer local prompts.
- Status UI must not show cloud truth when operations are merely queued or locally visible.

### 2.2 Backend/API Layer

Governed behavior should use:

```text
nexusApiClient/state-sync -> /api/v1 route -> apiHandler -> service -> repository -> observability
```

Backend risks to remove:

- `workspace_id IS NULL` notebook rows must mean account-scoped global, not public global.
- Recovery routes must derive identity from verified session/auth context, not client-provided identity.
- Same message id with different content must conflict instead of overwrite.
- Repositories must not implement competing identity rules. If the route says user-scoped, the repository query and RLS must enforce the same rule.
- Observability must emit operation outcome metadata without raw notebook, prompt, or message content.

### 2.3 Functional Layer

V16 is complete only when a sync operation either:

- applies durably and reports applied/synced truthfully;
- conflicts safely and preserves local data;
- fails visibly and remains retryable;
- or is explicitly blocked from queue usage with a canonical alternative.

Do not allow backend `queued` to become a hidden dead end.

### 2.4 Coupling and Naming Rules

Keep existing definitions aligned:

- `NotebookRecord`
- `PromptRecord`
- `PromptRevisionRecord`
- `MessageHistoryRecord`
- `WorkspaceRecoveryStateResponse`
- `WorkspaceRecoveryListResponse`
- `WorkspaceHydrationPlan`
- `SyncEntityType`
- `SyncOperationStatus`
- `NotebookRepository`
- `PromptRepository`
- `MessageRepository`

Do not introduce parallel names for the same concept unless the registry/type layer is updated in the same batch and tests prove the mapping.

Specific naming/ownership rule:

- "Global Datapads" means cross-workspace for the same account/operator. It does not mean visible to every authenticated account.
- If the schema uses `workspace_id IS NULL` for global notebooks, then `created_by` or a dedicated owner/account field must scope those rows.
- If ownership cannot be proven for legacy null-owner rows, do not expose them broadly. Preserve them and mark migration/backfill as `Needs verification`.

## 3. Goal

Complete V16 without opening V17.

End state:

- Global Datapads are durable, exportable, and account-scoped.
- notebook, message, prompt, workspace snapshot, and artifact reference sync semantics are explicit and truthful.
- recovery routes cannot leak or overwrite account/workspace data.
- clean-browser login recovery can restore workspace state without erasing newer local work.
- the project can survive Codex restart or computer shutdown through checkpoint and docs.
- future Codex runs can read the docs and trace chains without guessing where data lives.

## 4. Plan3 Priority Order

### Phase 0 - Evidence Refresh And Document Recovery

Purpose: avoid implementing from stale memory.

Read:

- this Plan3 file
- original V16 plan
- V16 checkpoint
- any restored Plan2 file, if present
- current git status and diff

Commands:

```bash
git status --short
test -f NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN2.md; echo plan2:$?
rg -n "Needs verification|Remaining blockers|Plan2|Plan3" NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md
rg -n "notebook|message|prompt|artifact_reference|recovery|queued|synced" src supabase/migrations
```

Required output in checkpoint:

- current V16 completion estimate;
- Plan2 file status;
- changed files already present;
- remaining blockers;
- next smallest safe change.

Do not restore or rewrite Plan2 unless explicitly useful. Plan3 can be the canonical continuation.

### Phase 1 - Account-Scoped Global Datapads

Problem:

`public.notebooks` currently allows global rows with `workspace_id IS NULL`. Repository fetch also appends global rows without account filtering. This can turn "Global Datapads" into public datapads for all authenticated users.

Trace chain:

```text
UI action:
  open Global Datapads, create/save/fetch a datapad
Zustand:
  createNotebook/updateNotebook/setNotebooksCache
registry/type:
  NotebookRecord, Notebooks, NotebookUpsert
nexusApiClient/state-sync:
  fetchNotebooks/upsertNotebook/deleteNotebook
/api/v1:
  GET /api/v1/notebooks, POST /api/v1/sync/operations
apiHandler:
  notebook route and sync operations route with verified user context
service:
  NotebookService.listVisibleNotebooks/upsertNotebook/deleteNotebook
repository:
  NotebookRepository.listVisible/upsert/deleteById
observability/sync projection:
  notebook.fetch.visible, notebook.applied/deleted/conflicted
```

Required changes:

- Make account-scoped global notebook semantics explicit.
- If `workspace_id IS NULL` is kept, require global rows to be scoped by verified user, usually `created_by = auth.uid()` or a dedicated owner column.
- Update repository `listVisible` so global rows are filtered by the verified user id.
- Update RLS so `workspace_id IS NULL` does not grant broad authenticated access.
- Add tests proving user A cannot see user B global notebooks.
- Preserve legacy null-owner rows. Do not delete them. Mark them as requiring backfill or admin review.

Exit criteria:

- global notebooks are cross-workspace only within the same account;
- remote fetch cannot expose another account's global datapad;
- tests cover repository/service/route or RLS SQL text where possible.

### Phase 2 - Message Content-Hash Idempotency And Conflict

Problem:

Message durable applier exists, but repository upsert can overwrite the same message id with different content. That violates V16's requirement: idempotent by `message.id + contentHash`, conflict on same id different content.

Trace chain:

```text
UI action:
  final assistant/user message committed after chat/stream
Zustand:
  active workspace agent messages
registry/type:
  MessageHistoryRecord, SyncEntityType = "message"
nexusApiClient/state-sync:
  insertMessage/syncHistoricalMessage -> local sync queue
/api/v1:
  POST /api/v1/sync/operations
apiHandler:
  sync operations route
service:
  SyncQueueService -> SyncOperationApplier -> MessageHistoryService
repository:
  MessageRepository
observability/sync projection:
  history.message.applied or history.message.conflicted
```

Required changes:

- Add repository/service conflict logic before overwrite.
- Same message id and same content hash should be idempotent.
- Same message id and different content hash should return `SYNC_CONFLICT` and leave the durable row unchanged.
- Workspace/agent/role mismatch for the same message id must be conflict or validation failure.
- Add tests for in-memory repository/service and sync applier path.
- Avoid logging raw message content.

Exit criteria:

- durable message content cannot be silently replaced by a retry or stale operation;
- local queue status reflects conflict/failure honestly;
- clean-browser transcript recovery has a trustworthy message base.

### Phase 3 - Selected Workspace Recovery Conflict Guard

Problem:

The selected workspace recovery flow can build local recovery context from the active local workspace while recovering another selected workspace id. The backend currently treats any local checksum/updatedAt as local state present.

Trace chain:

```text
UI action:
  choose a cloud workspace from recovery picker
Zustand:
  applyWorkspaceRecoveryState
registry/type:
  WorkspaceRecoveryStateResponse, WorkspaceRecoveryListResponse, WorkspaceHydrationPlan
nexusApiClient/state-sync:
  fetchWorkspaceRecoveryState
/api/v1:
  GET /api/v1/workspaces/recovery/[workspaceId]
apiHandler:
  selected recovery route
service:
  WorkspaceStateService.getRecoveryState
repository:
  WorkspaceSnapshotRepository
observability/sync projection:
  workspace.recovery.applied/skipped/conflicted
```

Required changes:

- Client should send local recovery context only for a local workspace with the same selected workspace id.
- Server should treat local state as present only when `localWorkspaceId === snapshot.workspaceId`, unless a future explicit compare mode is added.
- If no same-id local workspace exists, recovery should behave as local missing.
- Add tests for selected workspace A while active workspace B is newer.

Exit criteria:

- selecting a cloud workspace is not blocked by unrelated active local state;
- newer local protection still works for the same workspace id.

Checkpoint requirement:

After Phase 3, reread this file, original V16 plan, V16 checkpoint, V15 hygiene file, and the total architecture scan before continuing.

### Phase 4 - Migration Reality Check

Problem:

The code now depends on new durable tables/columns. SQL text tests are useful, but they do not prove migrations apply to a real database.

Trace chain:

```text
Trace chain: N/A migration-only
Data-loss guard:
  forward-only migration verification must run against a disposable database or dry-run environment, never production data.
```

Required checks:

- Run new migrations against a disposable Supabase/local database if tooling and env are available.
- Verify:
  - `20260527010000_notebook_durable_tombstones.sql`
  - `20260527011000_prompt_durable_tombstones.sql`
  - message history migration assumptions
- Decide whether V16 must add a guarded `CREATE TABLE IF NOT EXISTS public.messages` migration or explicitly document that `public.messages` is an older required base table.
- Update `database.types.ts` only through the project's accepted type-generation or carefully bounded manual schema update if generation is unavailable.

Exit criteria:

- migration apply result is recorded;
- failures are blockers, not ignored;
- no destructive migration is introduced.

### Phase 5 - Governed Prompt Fetch And Prompt Revision Decision

Problem:

Prompt durable applier exists, and prompt safe merge exists, but fetch still reads Supabase directly. Prompt revisions are still not fully durable.

Trace chain:

```text
UI action:
  open Prompt Vault, save/edit/delete prompt
Zustand:
  promptsCache, setPromptsCache, updatePrompt/deletePrompt
registry/type:
  PromptRecord, PromptRevisionRecord
nexusApiClient/state-sync:
  fetchPrompts/upsertPrompt/deletePrompt/fetchPromptRevisions
/api/v1:
  governed prompt route if implemented
apiHandler:
  prompt route with verified user/workspace boundary
service:
  PromptService
repository:
  PromptRepository
observability/sync projection:
  prompt.fetch.visible, prompt.applied/deleted/conflicted
```

Required decision:

- Either implement a governed prompt fetch route in V16, or explicitly mark direct Supabase fetch as accepted for V16 with safe merge and a follow-up hardening note.
- Either implement prompt revision durability in V16, or explicitly mark revision durability outside this V16 closure.

Exit criteria:

- the decision is documented in the checkpoint and Plan3 completion note;
- if implemented, tests prove prompt fetch does not wipe dirty/newer local prompts.

### Phase 6 - Browser Interaction Verification

Problem:

Build/curl proves the app serves. It does not prove the UI flows actually preserve drafts or recover workspaces.

Trace chain:

```text
Trace chain: N/A verification-only
Data-loss guard:
  use disposable/local data or test accounts; do not clear real operator data.
```

Required browser checks:

- Datapad draft autosave survives close/reopen or refresh path.
- notebook save reaches visible state and does not falsely show synced while queued.
- notebook delete creates recoverable tombstone/export metadata.
- recovery picker lists workspaces and applies a selected workspace.
- selected workspace recovery does not conflict against unrelated active local workspace.
- prompt safe merge behavior does not erase newer local prompt in the tested UI path, if feasible.

Record:

- target URL;
- test account/data used;
- screenshots or textual browser findings;
- console/runtime errors.

### Phase 7 - Final Verification And V16 Closure

Required commands, adjusted only if dependencies are missing:

```bash
npm test -- src/lib/backend/sync/sync-queue.test.ts src/store/nexus-store.test.ts src/lib/backend/workspace/workspace-state.test.ts src/lib/backend/notebooks/notebook-route.test.ts src/lib/workspace-recovery-local.test.ts src/lib/workspace-kernel.test.ts
npm run typecheck
npm run lint
npm run build
git diff --check
```

Also run any new targeted tests added in Plan3.

Final checkpoint must include:

- completed phases;
- exact tests run and results;
- migration verification result or blocker;
- browser verification result or blocker;
- remaining risks, if any;
- whether V16 can be called complete.

## 5. 專案升級規則

Rules that must not be broken:

- `queued != synced`.
- Remote empty is not delete proof.
- Global Datapads are account-scoped, not public.
- Login hydrate must not overwrite newer local workspace state.
- Selected workspace recovery compares only with the same local workspace id.
- Same message id with different content hash is a conflict, not an overwrite.
- Delete must use tombstone, retry, or recoverable export metadata.
- Export must preserve currently visible user data plus pending/draft recovery metadata.
- No component should write directly to Supabase for governed durable sync behavior.
- No new queue should be created.
- No broad refactor while closing V16.
- No raw notebook, prompt, message, artifact content, secrets, tokens, or Authorization headers in observability.
- Every code batch updates `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`.

## 6. Shutdown And Restart Protection

Every batch must update `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md` with:

- phase;
- files read;
- files changed;
- trace chain;
- operation type;
- commands run;
- test result;
- blockers;
- next safe step.

If the computer shuts down or Codex restarts:

1. Read this Plan3 file.
2. Read original V16 plan.
3. Read `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`.
4. Run `git status --short`.
5. Inspect current diff before editing.
6. Resume from the last checkpointed next safe step.

Do not trust memory-only claims. If a claim cannot be backed by code, diff, test output, checkpoint text, or browser/migration evidence, mark it `Needs verification`.

## 7. Definition Of Done

V16 can be marked complete only when:

- Plan2 missing-file risk is resolved by Plan3 being present and checkpointed, or Plan2 is restored.
- account-scoped Global Datapads are fixed and tested.
- message id/contentHash conflict behavior is fixed and tested.
- selected workspace recovery local-context mismatch is fixed and tested.
- migrations are tested on a disposable DB or the blocker is clearly recorded.
- browser interaction checks pass or remaining UI verification is clearly scoped.
- governed prompt fetch/revision durability is either implemented or explicitly accepted as non-blocking for V16 closure.
- final tests/typecheck/lint/build/diff-check are run and recorded.
- no known high-severity data loss or account data exposure risk remains.

## 8. Final Implementation Prompt

Use this prompt for the next Codex implementation round:

```text
請先讀取並遵守 `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN3.md`。這是 V16 completion，不開 V17。接著讀取原本的 `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md`、`NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`、`NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md`、`NEXUS_TOTAL_ARCHITECTURE_SCAN1.md`、`NEXUS_ITERATION_UPGRADE_RANKING.md`。如果 `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN2.md` 仍不存在，請記錄為文件恢復風險，並以 Plan3 作為本輪 canonical plan。

解除低速運轉限制：請用正常安全工程節奏執行，不需要刻意慢跑。但不要為了速度省略 trace chain、測試、checkpoint、diff 檢查或資料保護判斷。

開始前先完成 Plan3 Phase 0 evidence refresh，確認目前哪些 V16 內容已完成、哪些仍是缺口，並列出每個準備修改 flow 的 trace chain：

UI action -> Zustand -> registry/type -> nexusApiClient/state-sync -> /api/v1 -> apiHandler -> service -> repository -> observability/sync projection

畫不出 trace chain 的地方不要落地。local-only / export-only / migration-only / verification-only / test-only 必須明確標成 N/A，並說明資料不會遺失、不會被錯誤暴露、也不會被假同步狀態掩蓋的原因。

請優先照 Plan3 順序補完：
1. account-scoped Global Datapads，修正 `workspace_id IS NULL` notebook 可能跨帳戶可見的問題
2. message durable applier 的 `message.id + contentHash` idempotency 與 same-id-different-content conflict
3. selected workspace recovery 只能跟同 workspace id 的 local checksum/updatedAt 比較
4. disposable DB migration verification，並確認 `public.messages` base table 假設是否需要 V16 migration 補強
5. governed prompt fetch 與 prompt revision durability 做 V16 內完成或明確 non-blocking 決策
6. browser interaction verification：Datapad draft、delete tombstone/export、recovery picker、selected recovery conflict guard
7. final tests/typecheck/lint/build/git diff check/checkpoint closure

請遵守 no-data-loss / no-leak 規則：`queued != synced`；remote empty 不是刪除證明；Global Datapads 是同帳戶跨 workspace，不是公開全域；登入 hydrate 不得覆蓋 newer local workspace；selected recovery 不得拿無關 active workspace 製造 conflict；same message id different content hash 必須 conflict；delete 必須 tombstone 或可恢復；export 必須保護使用者目前可見資料與 pending/draft metadata。

請建立或更新 `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`。每個小批次後記錄目前 phase、已讀文件、已改文件、trace chain、操作類型、跑過的指令、測試結果、blocker、下一個安全步驟。若中途重啟，先讀 Plan3、原 V16 plan、checkpoint、`git status --short`、diff，再繼續。

做到 Plan3 Phase 3 後，停下來重讀 Plan3、原 V16 文件、checkpoint、V15 hygiene 文件、總架構掃描與迭代排名，再繼續。任何無法由程式碼、diff、測試輸出、migration/browser evidence 或文件支持的判斷，都標成 `Needs verification`。

測試請正常執行，不需要低速限制。若 `vitest`、Supabase CLI、browser tooling 或依賴不存在，請記錄 blocker，不要宣稱測試通過。完整 build 在 route/UI/hydration 修改完成後必跑，除非有明確環境 blocker。
```
