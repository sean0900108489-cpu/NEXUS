# NEXUS V16 Supabase Deep Readiness Report

Generated: 2026-05-29
Scope: first full Supabase-enabled deep exploration for V16 release verification.
Status: read-only scan and ordering report. No production data was changed. No branch was created in this scan.

## 0. Executive Judgment

V16 is still code/test closed, but it is not release-verified against the live Supabase project.

After enabling Supabase access, the remaining release work is larger than a simple final click. The live `NEXUS` database is behind the local V16 schema and has several public tables with RLS disabled. This is more important than immediately testing selected recovery. The correct order is:

1. Create a disposable Supabase branch.
2. Apply and verify V16 migrations there.
3. Verify schema/RLS/policies and account isolation.
4. Only then run live interaction checks on disposable data.
5. Keep production untouched until branch verification passes.

Do not apply V16 migrations directly to production yet.

## 1. 起點（目前狀況描述）

Local project:

- Main workspace: `/Users/sean/Documents/FreeChat`
- Supabase project from `.env.local`: `NEXUS`
- Project ref: `xjuglddxwnikvcwxfbzg`
- Region: `ap-southeast-2`
- Status: `ACTIVE_HEALTHY`
- Local `.env.local` has:
  - `NEXT_PUBLIC_SUPABASE_URL`: present
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: present
  - `SUPABASE_SERVICE_ROLE_KEY`: missing

Important implication:

- Local browser/client can talk to Supabase with anon/session context.
- Backend repositories that require service role fall back to in-memory locally when `SUPABASE_SERVICE_ROLE_KEY` is missing.
- Therefore local tests prove code behavior, but they do not prove live Supabase durable writes unless a real backend/service-role environment or Supabase branch verification is used.

Working tree:

- V16 implementation files are still uncommitted.
- Do not revert or reset.
- `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN3.md` is present and should remain the canonical V16 completion plan.

## 2. Supabase Live Scan

Read-only project scan found:

| Table | Live rows | RLS | V16 readiness |
| --- | ---: | --- | --- |
| `public.workspaces` | 11 | disabled | High risk. Public table without RLS. Missing V16 membership model dependency. |
| `public.messages` | 149-150 estimated | disabled | High risk. Missing V16 durability/idempotency/archive columns. |
| `public.workflow_templates` | 1 | disabled | Security risk. Existing table is public without RLS. |
| `public.artifacts` | 0 | enabled, no policy | Blocks access through RLS; policies missing. |
| `public.prompts` | 0 | disabled | High risk. Missing tombstone/owner fields. |
| `public.prompt_revisions` | 0 | disabled | High risk. Missing V16 title revision fields and RLS. |
| `public.notebooks` | 0 | enabled, no policy | Blocks access through RLS; missing V16 workspace/owner/tombstone fields. |

Supabase migrations list:

- Supabase Management API returned no tracked migrations for this project.
- Live tables appear to have been created outside the current local migration history or before migration tracking was established.

Policies:

- `pg_policies` returned no policies in `public`.
- Tables with RLS enabled but no policies currently deny normal table access through RLS.
- Tables with RLS disabled are exposed through the public API surface according to Supabase advisor warnings.

Advisor findings:

- Security advisor:
  - `public.messages`, `public.workspaces`, `public.workflow_templates`, `public.prompts`, `public.prompt_revisions` have RLS disabled.
  - `public.artifacts` and `public.notebooks` have RLS enabled but no policies.
  - leaked password protection is disabled.
- Performance advisor:
  - `public.prompt_revisions.prompt_id` foreign key lacks a covering index in live DB.

Official Supabase docs confirm that public schema tables should use RLS to protect data exposed through Supabase APIs:

- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/secure-data
- https://supabase.com/docs/guides/local-development/testing/overview

## 3. Schema Drift Against V16

Live DB is missing V16-required structures.

Missing tables:

- `public.workspace_memberships`
- `public.workspace_snapshots`
- `public.workspace_state_entities`
- `public.sync_operations`
- `public.artifact_references`
- many V6+ runtime/tool/observability/deployment tables from local migrations

Missing critical columns:

| Table | Missing V16 columns |
| --- | --- |
| `notebooks` | `workspace_id`, `created_by`, `deleted_at`, `deleted_by` |
| `prompts` | `created_by`, `deleted_at`, `deleted_by` |
| `prompt_revisions` | `previous_title`, `new_title` |
| `messages` | `content_hash`, `role`, `metadata`, `created_by`, `updated_at`, `is_active_window`, `archived_at`, `token_count`, `task_id`, `source_tool_run_id` |

This means the current production/live schema cannot honestly prove the V16 durable sync loop yet.

## 4. Frontend / Backend / Function Layer Closure

### Datapads / Notebooks

Current intended trace chain:

```text
Global Datapads UI -> Zustand create/update/deleteNotebook -> NotebookRecord
-> SupabaseStateSyncManager upsert/deleteNotebook -> /api/v1/sync/operations
-> SyncQueueService -> SyncOperationApplier -> NotebookService
-> NotebookRepository -> notebook observability / sync projection
```

Code state:

- Frontend no longer re-scopes Global Datapads to active workspace.
- Backend repository/service expects `workspace_id`, `created_by`, `deleted_at`, `deleted_by`.
- Live DB does not yet have those notebook columns.

Release implication:

- Branch migration must run before live durable Datapads can be release-verified.

### Messages

Current intended trace chain:

```text
chat final message -> Zustand active messages -> MessageHistoryRecord
-> SupabaseStateSyncManager insert/syncHistoricalMessage -> /api/v1/sync/operations
-> SyncQueueService -> SyncOperationApplier -> MessageHistoryService
-> MessageRepository -> messages table / history projection
```

Code state:

- Same `message.id + contentHash + identity` is idempotent.
- Same id with different content/workspace/agent/role conflicts.
- Live DB lacks `content_hash`, `role`, `metadata`, `updated_at`, and archive fields.

Release implication:

- The code is ready, but live durable verification must wait for branch schema apply.

### Prompts

Current intended trace chain:

```text
Prompt Vault UI -> Zustand promptsCache update/delete -> PromptRecord/PromptRevisionRecord
-> SupabaseStateSyncManager fetch/upsert/deletePrompt -> /api/v1/prompts or /api/v1/sync/operations
-> PromptService -> PromptRepository -> prompt/revision observability
```

Code state:

- Prompt fetch is governed through `/api/v1/prompts`.
- Prompt revisions are recorded through prompt upsert applier.
- Live DB lacks prompt tombstone/owner fields, revision title fields, RLS policies, and covering index state.

Release implication:

- Branch migration and RLS tests are required before production rollout.

### Workspace Recovery

Current intended trace chain:

```text
login / Cloud Recovery picker -> Zustand applyWorkspaceRecoveryState
-> WorkspaceRecoveryStateResponse / WorkspaceHydrationPlan
-> SupabaseStateSyncManager recovery routes
-> /api/v1/workspaces/recovery
-> WorkspaceStateService -> WorkspaceSnapshotRepository
-> workspace recovery observability
```

Code state:

- selected recovery compares local context only when local workspace id equals selected cloud workspace id.
- live DB lacks `workspace_snapshots` and `workspace_memberships`.

Release implication:

- Live selected recovery cannot be truthfully verified until branch migrations create and protect recovery tables.

### Sync Queue

Current intended trace chain:

```text
local queue -> /api/v1/sync/operations -> SyncQueueService
-> SyncOperationRepository -> SyncOperationApplier
-> domain service/repository -> sync status projection
```

Code state:

- queue status semantics are fixed: `queued != synced`.
- artifact references are blocked from queue path and directed to canonical artifact reference route.
- live DB lacks `sync_operations`.

Release implication:

- Branch migration must verify sync queue table, constraints, indexes, and RLS before release.

## 5. Coupling / Naming / Definition Review

Good alignment:

- V16 keeps one sync queue and one applier.
- `NotebookRecord`, `PromptRecord`, `PromptRevisionRecord`, `MessageHistoryRecord`, `WorkspaceRecoveryStateResponse`, `WorkspaceHydrationPlan`, and `SyncOperationStatus` remain coherent.
- Frontend state remains the active UI cache; durable truth is expected from service/repository paths.
- Route/service/repository boundaries are now clearer for notebooks, prompts, recovery, and messages.

Current friction:

- Local `database.types.ts` describes a schema the live DB does not yet have.
- Local tests rely on in-memory fallback when service-role config is absent.
- Live schema has manually-created/older tables, while local migrations assume a more complete schema lifecycle.
- V16 migrations are additive, but applying them to live tables with existing rows must be verified on a branch first.

Potential future complexity if not fixed now:

- Backend code may silently use in-memory repositories in environments missing `SUPABASE_SERVICE_ROLE_KEY`.
- RLS disabled tables make frontend anon-key access dangerous and can hide broken route/service boundaries.
- No tracked Supabase migrations means future Codex runs may not know production schema history.

## 6. Is There Something More Important Than The Remaining 5%?

Yes.

Before doing live selected recovery or calling V16 release-complete, the project must resolve Supabase schema/RLS drift in a disposable branch.

This is more important because:

- RLS disabled on `messages` and `workspaces` is a security risk.
- V16 backend code expects tables/columns that live DB does not currently have.
- Applying migrations directly to production would be risky because live has existing workspace/message data.
- Selected recovery cannot be proven if `workspace_snapshots` and `workspace_memberships` are absent.

So the next work should not be "click recovery in live". The next work should be "branch migration verification and schema/RLS closure".

## 7. Recommended Work Order

### Phase A - Branch Creation And Migration Apply

Goal:

- Create a Supabase branch from `NEXUS`.
- Apply local migrations to the branch only.
- Confirm no destructive behavior and no migration ordering failure.

Rules:

- Do not apply migrations to production.
- Do not delete production data.
- If branch creation requires cost confirmation, confirm the hourly cost before creation.
- Record branch id/ref in checkpoint.

### Phase B - Branch Schema/RLS Verification

Goal:

- Compare branch schema to local `database.types.ts` and V16 required tables.
- Verify RLS enabled and policies exist.
- Run advisor checks again on the branch.

Checks:

- `workspace_memberships` exists with policies.
- `workspace_snapshots` exists with policies.
- `sync_operations` exists with constraints/indexes/policies.
- `notebooks` has `workspace_id`, `created_by`, `deleted_at`, `deleted_by`.
- `messages` has `content_hash`, archive fields, metadata, role, identity fields.
- `prompts` and `prompt_revisions` have tombstone/revision fields and policies.
- no V16-owned public table remains with RLS disabled.

### Phase C - RLS/Account Scope Test Data

Goal:

- Use disposable users/workspaces/data on the branch.
- Prove account isolation for:
  - Global Datapads
  - workspace notebooks
  - messages
  - prompts
  - workspace snapshots/recovery

Rules:

- Use generated test ids/emails.
- Avoid real user data.
- Prefer SQL/route tests that can be repeated.

### Phase D - Live App Against Branch

Goal:

- Point local app to branch project URL/keys only if branch credentials are available.
- Verify:
  - Datapad create/save/delete/tombstone/export
  - prompt fetch/save/revision
  - message durable applier
  - workspace recovery list/picker/selected click
  - queued status truth

Rules:

- Do not use production project URL for destructive verification.
- Keep checkpoint evidence for every flow.

### Phase E - Production Rollout Decision

Goal:

- Decide whether production is ready for migrations.

Production rollout requires:

- branch migration apply passes;
- branch advisor checks acceptable or consciously waived;
- branch RLS tests pass;
- branch app interaction checks pass;
- backup/export strategy is documented;
- production migration order is fixed.

## 8. Checkpoint Addendum For Next Round

Add this to the next implementation prompt:

```text
請先讀取 `NEXUS_V16_SUPABASE_DEEP_READINESS_REPORT.md`、`NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN3.md`、`NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md`。這是 V16 release verification，不開 V17。

Supabase 已可用，但 production 專案 `NEXUS` 不能直接跑 migration。先建立或使用 disposable Supabase branch，再 apply V16 migrations。若 branch 建立需要費用確認，先確認費用再建立。

優先順序：
1. branch migration apply
2. branch schema/RLS/policy/advisor verification
3. disposable account/workspace RLS tests
4. local app against branch live interaction checks
5. checkpoint closure and production rollout recommendation

不得對 production DB 做 destructive migration 或測試資料寫入。所有判斷必須有 Supabase schema/advisor/query evidence、程式碼 evidence、測試結果或 browser evidence。無法證明的項目標成 `Needs verification`。
```

## 9. Final Target

V16 release verification is complete only when:

- branch migration apply succeeds;
- branch schema matches V16 expected tables/columns enough for the app paths;
- RLS is enabled with policies on V16-owned public tables;
- advisor critical security warnings are cleared or explicitly scoped;
- account-scoped Global Datapads are proven on branch;
- message contentHash conflict is proven against branch durable DB;
- workspace recovery list/selected click is proven on disposable data;
- checkpoint records exact branch/project, commands, query evidence, and remaining production rollout risk.

Until then:

- V16 is code/test closed.
- V16 is not yet production release-verified.
