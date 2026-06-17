# Database / RLS / Security 子代理 — 完整報告與執行指令

> 來源：nexus技術債整理.md · 自動分割產生 · 2026-06-17

---

第四個：Database / RLS / Security 子代理。

這個子代理的任務是審查 Supabase 層是否真的能承受 production 使用者資料、workspace 隔離、token 儲存、runtime event、usage ledger、audit log。它不是只看 table schema 漂不漂亮，而是要驗證「就算前端或 API 出錯，資料庫本身是否還能守住邊界」。

第一步要建立 Supabase data-domain map。把 public schema 裡的表分成幾個 bounded context：workspace 核心資料、workspace snapshots、sync operations、messages、artifacts、agent runtime sessions/events/tasks、tool runs/tool permissions、model usage ledger、permission audit logs、prompts、notebooks、workflow templates、Nova RAG documents/chunks/ingest、LINE system、user NEW API tokens。每個 bounded context 都要標出：主 owner 是 user 還是 workspace；是否有 workspace_id；是否有 created_by/user_id；是否應該支援 soft delete；是否應該被 anon、authenticated、service role、server API 存取。

第二步要做 RLS coverage matrix。每張表都要列出：RLS 是否 enabled、是否有 SELECT/INSERT/UPDATE/DELETE policy、policy 是否以 workspace_memberships 或 user_id 為核心、是否允許 anon、是否有 using (true) / with check (true) 類型的寬鬆 policy。已知 advisors 已經指出幾個高風險訊號：api_idempotency_keys、deployment_checks、permission_audit_logs、user_new_api_tokens 有 RLS enabled 但 no policy；nova_chunks、nova_documents、nova_ingest_runs 有過度寬鬆的 true policy。這些要先列為 P0/P1，不是普通 cleanup。

第三步要審查 SECURITY DEFINER / RPC。特別是 record_permission_audit_log(...) 與 nexus_ensure_workspace_session(...) 這類 function。子代理要查：function 是否固定 search_path；是否可被 anon 呼叫；是否接受 caller-controlled workspace/user 參數；是否自己做 membership 驗證；是否會被前端直接透過 Supabase REST RPC 呼叫。這點非常重要，因為目前 client state sync 會透過 Supabase REST RPC 去 ensure workspace session，這代表某些 DB function 已經是 public contract，不只是內部 helper。

第四步要審查 token 與 secret storage。user_new_api_tokens 有 encrypted token 欄位，這代表資料庫內有真正敏感資料。子代理要確認：client 永遠不能直接 select encrypted token；只有 server/service path 可以解密或使用；RLS no-policy 狀態是否造成 app 無法讀寫或迫使 service role 繞路；token metadata、enabled、plan、group 等欄位是否足以支援 revoke、audit、quota；是否有 updated_at trigger 的 search_path 問題。

第五步要審查 auditability。permission_audit_logs、system_events、agent_runtime_events、usage_metrics、model_usage_ledger 這些表要能回答四個問題：誰做了什麼、對哪個 workspace/resource、結果成功或失敗、成本/風險是多少。子代理要查 API event emission 是否真的能落到 DB、permission check failure 是否記錄、tool run confirmation 是否記錄、usage ledger 是否能追到 requestId/conversation/task。Backend 的 apiHandler 已經有 best-effort API event emission，所以 DB 子代理要驗證 receiving side 是否完整，而不是只看 API 層。

第六步要做 migration / advisor policy。所有修 RLS、RPC、index、constraint 的變更都不能直接在 production 手修；要提出 migration plan。每個 migration 都要有 rollback 思路、資料 backfill 思路、以及 advisor rerun 驗收。Performance advisors 已經指出很多 unused indexes，不代表要立刻刪；子代理要先分出「真的 unused」、「新功能預留」、「目前沒有查詢但應該加測試保護」三類。刪 index 是最後一步，不是第一步。

這個子代理最後要輸出五份東西：DB bounded-context map、RLS policy matrix、RPC/security-definer risk report、sensitive data access map、migration remediation plan。最高優先級是先封住 anon/authenticated 過寬存取、SECURITY DEFINER search_path、以及 token/audit/idempotency 這幾類資料的 policy 缺口

我先以「第四子代理」做 live Supabase 審查。目標 project 是 `NEXUS`，project ref `xjuglddxwnikvcwxfbzg`，Postgres 17，region `ap-southeast-2`。我沒有執行任何 migration 或資料修改，只做 advisor 與 read-only SQL 查詢。

結論先講：NEXUS 的 workspace / artifact / message / runtime / prompt / notebook 主幹 RLS 做得比一般專案成熟，基本上都以 `workspace_memberships`、`is_workspace_member()`、`has_workspace_role()` 做邊界。但現在有三個 production blocker：Nova RAG 表對 anon/authenticated 過度開放、`record_permission_audit_log` 這個 SECURITY DEFINER RPC 可被 anon/authenticated 執行、以及 server-only 表雖然刻意 no policy，但還需要把「no client grant + no client policy」變成明確 migration/test contract。另有一個 P1：`user_new_api_tokens` trigger function 沒有固定 `search_path`。

以下是第四子代理輸出。

一、DB bounded-context map

我把 public schema 分成 14 個 bounded context。

|Context|Tables|Owner model|workspace_id|user/creator|Soft delete|Intended access|
|---|---|--:|--:|--:|--:|---|
|Workspace core|`workspaces`, `workspace_memberships`|workspace + owner user|`workspaces.id`, `workspace_memberships.workspace_id`|`owner_user_id`, `created_by`, `user_id`|無|authenticated 依 membership；service role|
|Workspace recovery / state|`workspace_snapshots`, `workspace_state_entities`|workspace|有|snapshot 有 `user_id`|無|authenticated member/editor；service role|
|Sync operations|`sync_operations`|workspace|有|`created_by`|有狀態欄位但非 soft delete|authenticated editor insert/update/select；service role|
|Messages|`messages`|workspace|有|`created_by`|`archived_at`|authenticated member/editor；service role|
|Artifacts|`artifacts`, `artifact_references`|workspace|有|`created_by`|`status = deleted/archived`，不是 `deleted_at`|authenticated member/editor；service role|
|Agent runtime|`agent_runtime_sessions`, `agent_tasks`, `agent_runtime_events`, `agent_memory_records`|workspace + task/session|有；events 經 task 關聯|sessions 有 `user_id`|無|authenticated member/editor；events read-only to member；service role|
|Tools|`tool_runs`, `tool_permissions`|workspace|有|`created_by`, `confirmed_by`|無|authenticated admin/operator；service role|
|Usage / quota|`model_usage_ledger`, `usage_metrics`|user + optional workspace|ledger 無 workspace_id，metrics 有|`user_id`|無|目前應 server-write；user/member read|
|Audit / observability|`permission_audit_logs`, `system_events`, `deployment_checks`|server/system + optional workspace|audit/system 有 optional workspace；deployment 無|audit/system 有 actor/user|無|應 server-only write；restricted read|
|Prompts|`prompts`, `prompt_revisions`|workspace|prompts 有；revisions 經 prompt|`created_by`|prompts 有 `deleted_at/deleted_by`|authenticated member/editor；service role|
|Notebooks|`notebooks`|workspace 或 account-global|nullable|`created_by`, `deleted_by`|有 `deleted_at/deleted_by`|workspace member/editor 或 owner self|
|Workflow templates|`workflow_templates`|workspace 或 account-global|nullable|`created_by`|無|workspace member/editor 或 owner self|
|Nova RAG|`nova_documents`, `nova_chunks`, `nova_ingest_runs`|目前不像 workspace/user scoped|無|無|無|現狀是 anon/authenticated 全開，需重定義|
|LINE system|`line_system_*`|LINE/system user|無 workspace|多數有 `user_id`|無|service_role only，現狀合理偏 server-only|
|User NEW API tokens|`user_new_api_tokens`|user|無|`user_id`, `created_by`, `updated_by`|`enabled` revoke|service_role only，client 不應直接 select|

最重要的架構判讀是：NEXUS 的主產品資料大多已經 workspace-scoped，但 Nova RAG 是例外，它目前是 global corpus model，沒有 `workspace_id` / `user_id` / owner 欄位。只要它繼續在 public schema 並且 anon 可寫，這就是 P0。

二、RLS coverage matrix

整體狀態：所有 public user tables 都已啟用 RLS。這是好事。問題不在於沒有啟 RLS，而在於部分表的 policy/grant 語義不符合 production 邊界。

P0 / P1 表先列：

|Table|RLS|Policies|Grants|Risk|
|---|--:|--:|---|---|
|`nova_documents`|enabled|SELECT/INSERT/UPDATE/DELETE 全部 `true`|anon/authenticated/service_role 全 DML|P0：匿名使用者可讀寫刪全域 RAG documents|
|`nova_chunks`|enabled|SELECT/INSERT/UPDATE/DELETE 全部 `true`|anon/authenticated/service_role 全 DML|P0：匿名使用者可讀寫刪 embeddings/chunks|
|`nova_ingest_runs`|enabled|SELECT/INSERT/UPDATE `true`|anon/authenticated/service_role 全 DML|P0：匿名/登入者可偽造 ingest run 狀態|
|`permission_audit_logs`|enabled|0 policies|service_role only table grants|P1：server-only 設計合理，但 RPC 使 authenticated 可間接寫入|
|`user_new_api_tokens`|enabled|0 policies|service_role only table grants|P1：table access 正確偏 server-only；但需要補 search_path 與 contract test|
|`api_idempotency_keys`|enabled|0 policies|service_role only table grants|P1：server-only 設計合理；要確保永遠不授權 client|
|`deployment_checks`|enabled|0 policies|service_role only table grants|P2：server-only 設計合理；缺明確 test 防止 grant drift|
|`model_usage_ledger`|enabled|SELECT self only|anon/authenticated/service_role 全 DML grants|P1：RLS 擋住 anon 寫入，但 grants 過寬；未來 policy 一變就危險|

主幹 workspace 表：

|Table|RLS policy shape|Assessment|
|---|---|---|
|`workspaces`|authenticated select member/owner；insert owner；update editor；delete owner/admin|基本合理。注意 insert policy 對新 workspace 的 `has_workspace_role(id, ...)` 分支幾乎依賴 RPC/service path，不應讓 direct client create 成為主要路徑|
|`workspace_memberships`|self/manager select；owner/admin 管理|基本合理。要補「不能移除最後 owner」constraint/function guard，目前只看到 role check 與 unique constraint|
|`workspace_snapshots`|insert/update 需要 snapshot `user_id = auth.uid()` + editor；select self 或 member|合理，但 select member 可讀別人的 snapshot payload；若 payload 含本地私有 UI/session，需要重審|
|`workspace_state_entities`|member select；editor write/delete|合理|
|`sync_operations`|member select；editor insert/update；created_by optional self check|合理。DB 有 payload size 128 KiB、entity/operation/status checks，這點很好|
|`messages`|member select；editor insert/update/delete|合理。已有 `workspace_id required` check|
|`artifacts`|workspace_id 必須非 null；member select；editor write/delete|合理。content_url 權限仍取決於 storage/CDN，不在 DB RLS 內|
|`artifact_references`|member select；editor insert/delete|合理|
|`prompts`|member select；editor write/delete|合理，有 soft delete 欄位|
|`prompt_revisions`|經 prompts 檢查 workspace membership/editor|合理|
|`notebooks`|workspace member/editor 或 account-global `created_by = auth.uid()`|合理|
|`workflow_templates`|workspace member/editor 或 account-global `created_by = auth.uid()`|合理|
|`agent_runtime_sessions`|member select；editor insert/update；insert 要 `user_id = auth.uid()`|合理|
|`agent_tasks`|member select；editor insert/update|合理|
|`agent_runtime_events`|只有 select；透過 task workspace membership|合理；write 應 server/service|
|`agent_memory_records`|member select；editor CRUD|合理|
|`tool_permissions`|member select；admin insert/update|合理|
|`tool_runs`|member select；owner/admin insert/update|偏保守。若 editor 也能執行 tools，API 層和 DB 層角色模型要對齊|
|`usage_metrics`|member select only|合理；write 應 server/service|
|`system_events`|member select only|合理；write 應 server/service|
|`line_system_*`|service_role ALL only|合理，偏 server-only|

RLS 目前最強的地方是 workspace 主幹一致性：大多數表不是裸 `user_id = auth.uid()`，而是透過 workspace membership/role。這適合 multi-agent workspace 產品。最弱的地方是 Nova RAG 完全沒有 owner boundary。

三、RPC / SECURITY DEFINER risk report

我查了五個關鍵 function：`record_permission_audit_log`、`nexus_ensure_workspace_session`、`set_user_new_api_tokens_updated_at`、`is_workspace_member`、`has_workspace_role`。

`is_workspace_member(target_workspace_id)` 和 `has_workspace_role(target_workspace_id, allowed_roles)` 是 SQL wrapper，`SECURITY INVOKER`，固定 `search_path = public, private`，呼叫 private schema function。這個設計比直接在 policy 寫複雜 SQL 好，整體可接受。它們目前 anon/authenticated/service_role 都可 execute；因為它們用 `auth.uid()` 判斷，anon 正常會回 false。不是 P0，但可以考慮只授權 authenticated/service_role，減少 API 表面。

`nexus_ensure_workspace_session(p_preferred_workspace_id, p_preferred_workspace_name)` 是 `SECURITY DEFINER`，固定 `search_path = public, auth`。它會要求 `auth.uid()` 非 null，會驗證 preferred workspace id 格式，會確認 caller 是該 workspace member；如果沒有任何 workspace，就建立一個新 workspace 和 owner membership。advisor 指出 authenticated 可透過 `/rest/v1/rpc/nexus_ensure_workspace_session` 執行。我的判斷是：這很可能是有意的 public contract，因為 client 需要 ensure session。但它必須被視為「正式 API」，而不是 helper。風險是它有 definer 權限、會 insert workspace/membership，而且允許 caller 傳 workspace name。建議保留 authenticated execute，但補 contract tests：未登入不可呼叫、不能 claim 別人的 preferred workspace、invalid preferred id 不能產生奇怪資料、workspace_name 長度與字元要限制。

`record_permission_audit_log(...)` 是 `SECURITY DEFINER`，固定 `search_path = public, auth`。它要求 `auth.uid()` 非 null；如果有 workspace_id，要求 caller 是 member；decision 只能是 `allowed/denied/requires_confirmation`；metadata 超過 8192 bytes 會 truncate。這些內部防線不錯。但它目前 anon 和 authenticated 都可 execute。anon 因 `auth.uid()` null 會失敗，但 still exposed；authenticated 使用者可以對自己有 membership 的 workspace 寫入任意 action/resource/decision。若 permission audit 是可信審計資料，這是 P1：使用者不應能偽造「allowed/denied」審計事件。應改為 service_role only，或至少拆成兩個 function：server-only `record_permission_audit_log` 和 user-callable `submit_permission_event`，後者 decision 固定為 request/ack，不可偽造 authorization decision。

`set_user_new_api_tokens_updated_at()` 是 trigger function，非 SECURITY DEFINER，但沒有固定 search_path。advisor 已經指出 `function_search_path_mutable`。這是 P1，因為它掛在敏感 token table 上。修法很小：改成 `CREATE OR REPLACE FUNCTION ... SET search_path TO public ...`。同類 function `set_updated_at()`、`set_nova_updated_at()` 已經有 search_path；只有 token trigger function 漏了。

`model_usage_ledger` 不是 RPC，但 grants 值得放在這裡講：它對 anon/authenticated 有完整 table privileges，雖然 RLS policy 只有 authenticated self SELECT，沒有 insert/update/delete policy，所以目前不等於可寫。但這是「latent risk」。建議撤回 anon/authenticated 的 INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER，只保留 authenticated SELECT 或改成 view/RPC 讀取。

四、Sensitive data access map

`user_new_api_tokens` 是最敏感表。欄位包含 `encrypted_new_api_token not null`、`new_api_token_id`、`new_api_group`、`plan`、`enabled`、`created_by`、`updated_by`。目前 table grants 只有 service_role，RLS enabled 但 no policy；這代表 client 不能直接 select，是正確方向。資料也已有 `user_new_api_tokens_user_unique`，每 user 一筆 token mapping，另有 `enabled` index、`user_id` index、plan check。這對 revoke、quota routing、server lookup 足夠，但缺少兩個欄位：`last_used_at` 和 `revoked_at`。如果要做安全稽核和 token hygiene，建議補。

`permission_audit_logs` 是可信審計表。欄位有 workspace、actor、action、resource、decision、reason_code、metadata、created_at；索引有 workspace_created、actor_created、decision_created、resource。資料量約 1550 rows，已經在用。table 本身 service_role only 是好的；問題是 `record_permission_audit_log` 讓 authenticated 可間接寫。這會污染 audit trust model。

`api_idempotency_keys` 是 server-only idempotency ledger。欄位包含 workspace_id、actor_user_id、method/path、request_hash/fingerprint、response_payload、status_code/status、lock/completion/expires。資料量約 538 rows，但 total size 約 24 MB，遠大於 row count，推測 `response_payload` 或 dead tuples/TOAST 可能膨脹。它有 expires index、status_locked index、workspace_key unique。安全上 service_role only 合理；營運上需要定期 purge expired keys 和 vacuum policy。

`system_events` 是 observability spine。資料量約 7864 rows，是目前最大表；comment 已提醒 metadata 要 redacted/size-capped。RLS 只允許 workspace member select；service role write。這合理，但要補 metadata size check 或 repository-level redaction test，因為 DB 目前只靠註解約束。

`agent_runtime_events` payload comment 明確要求不能存 raw provider errors/API keys/token deltas。RLS 只允許 member select，write 沒給 authenticated。這是好的，但同樣需要 payload size/redaction constraint 或測試。

`tool_runs` 有 `input_redacted`，但也有 `executable_input jsonb not null`。這是高敏欄位。雖然 RLS 限 workspace owner/admin select，若 `executable_input` 真的含未遮蔽參數，那 workspace admin 可看見是產品語義還是安全風險要決定。建議把 `executable_input` 改成 server-only 表或拆欄：client-readable view 只暴露 redacted fields，真實 executable input 由 service-only table 保存。

`model_usage_ledger` comment 說不存 API keys、provider tokens、prompts、response bodies。欄位也確實主要是 model/tokens/points/status/request。它能追 `request_id`、conversation/operator/user，但沒有 `workspace_id`、`task_id`。如果你要把 usage ledger 和 workspace runtime audit 串起來，目前只能靠 request/conversation/operator，而不是 DB FK。這不是安全缺口，但會削弱 forensic trace。

五、Migration remediation plan

我會分四批 migration，不建議一次大改。

第一批，P0：封 Nova RAG public write/delete/update。

目標：立刻移除 anon/authenticated 對 `nova_documents`、`nova_chunks`、`nova_ingest_runs` 的 unrestricted DML。

建議 migration：

```sql
begin;

revoke insert, update, delete, truncate, references, trigger
on public.nova_documents, public.nova_chunks, public.nova_ingest_runs
from anon, authenticated;

drop policy if exists nova_documents_insert on public.nova_documents;
drop policy if exists nova_documents_update on public.nova_documents;
drop policy if exists nova_documents_delete on public.nova_documents;

drop policy if exists nova_chunks_insert on public.nova_chunks;
drop policy if exists nova_chunks_update on public.nova_chunks;
drop policy if exists nova_chunks_delete on public.nova_chunks;

drop policy if exists nova_runs_insert on public.nova_ingest_runs;
drop policy if exists nova_runs_update on public.nova_ingest_runs;

commit;
```

如果 Nova 是 public read corpus，可以暫時保留 SELECT `USING true`，但 write/delete/update 必須 server-only。更好的第二階段是加 `workspace_id` 或 `owner_user_id`，把 Nova 納入 workspace boundary。現在三張 Nova 表只有 1 row 左右，backfill 成本很低，這是最佳重構窗口。

Rollback：重新 grant DML 並重建原本 `true` policies。這不建議，但可以作為 emergency rollback。

驗收：security advisor 不再出現 `rls_policy_always_true` for INSERT/UPDATE/DELETE；anon 用 REST 對 Nova insert/update/delete 應回 401/403。

第二批，P1：收斂 SECURITY DEFINER / function grants。

先修 audit RPC：

```sql
begin;

revoke execute on function public.record_permission_audit_log(
  text, text, text, text, text, text, jsonb
) from anon, authenticated;

grant execute on function public.record_permission_audit_log(
  text, text, text, text, text, text, jsonb
) to service_role;

commit;
```

如果前端目前真的直接呼叫這個 RPC，就不要直接上 production；先改 API 層由 server/service role 寫 audit，再 revoke client execute。這是重要 sequencing。

`nexus_ensure_workspace_session` 我暫時不建議直接 revoke authenticated，因為它看起來就是 client session bootstrap contract。但要補明確 grant 狀態，避免 public 預設權限漂移：

```sql
revoke execute on function public.nexus_ensure_workspace_session(text, text) from anon;
grant execute on function public.nexus_ensure_workspace_session(text, text) to authenticated;
```

再補 function-level tests：anon blocked、authenticated creates only own workspace、preferred workspace must already belong to caller。

修 token trigger search_path：

```sql
create or replace function public.set_user_new_api_tokens_updated_at()
returns trigger
language plpgsql
set search_path to public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

驗收：security advisor 不再出現 `anon_security_definer_function_executable` for audit RPC，也不再出現 `function_search_path_mutable` for token trigger。

第三批，P1/P2：收斂 table grants，建立 server-only contract。

這批不改 RLS policy，先改 grants，降低未來誤開 policy 的 blast radius。

```sql
begin;

revoke insert, update, delete, truncate, references, trigger
on public.model_usage_ledger
from anon, authenticated;

revoke all on public.api_idempotency_keys,
  public.permission_audit_logs,
  public.deployment_checks,
  public.user_new_api_tokens
from anon, authenticated;

grant select on public.model_usage_ledger to authenticated;

commit;
```

四張 server-only no-policy 表目前 table grants 已只有 service_role，所以這段多半是 idempotent hardening；真正要防的是未來 migration 不小心 grant 給 authenticated。建議加一個 schema-live check：server-only tables must have zero anon/authenticated grants and zero client policies。

第四批，P2：audit/runtime integrity 與 performance hygiene。

先不刪 unused indexes。原因是 project 還在早期，`pg_stat_user_indexes.idx_scan = 0` 不等於永遠不用，可能只是 uptime/traffic 不夠。我的分類：

「先保留，新功能/稽核合理」：`idx_system_events_resource`、`idx_permission_audit_actor_created`、`idx_api_idempotency_status_locked`、`idx_api_idempotency_expires`、runtime/artifact provenance indexes、Nova vector/Gin indexes。

「可觀察一段時間再判斷」：`idx_deployment_checks_*`、部分 `usage_metrics` provider/model/task indexes、部分 artifact parent/root/source indexes。

「不建議刪」：所有 primary key、unique constraint indexes、workspace query indexes、idempotency unique key、token user unique。

需要新增的不是 index，而是保留策略：`api_idempotency_keys` 538 rows 但 24 MB，應有 expired cleanup job；`system_events` 7864 rows 是最大成長點，應有 retention policy；`permission_audit_logs` 則通常要長保留，但 metadata 要限長。

最高優先技術債清單

P0：`nova_documents`、`nova_chunks`、`nova_ingest_runs` 對 anon/authenticated 全 DML + true policies。這是目前資料庫層最大 production blocker。

P1：`record_permission_audit_log` 是 SECURITY DEFINER，authenticated 可寫可信 audit log。即使有 membership check，也會讓使用者偽造 permission decision 記錄。

P1：`set_user_new_api_tokens_updated_at` 沒有固定 search_path，且掛在 sensitive token table 上。

P1：`model_usage_ledger` grants 過寬。RLS 目前擋住大部分實際風險，但 grants 應收斂成 authenticated SELECT only 或 server-only API read。

P1：`tool_runs.executable_input` 與 `agent_runtime_events.payload` 屬於高敏 runtime payload。RLS 目前還可以，但應補 redaction/size tests，或拆 client-readable view。

P2：server-only no-policy 表目前是正確意圖，但 advisor 會持續報 `RLS enabled no policy`。建議用註解 + schema-live test 固化，不一定要加 deny-all policy；重點是確保 anon/authenticated 沒有 grants。

P2：`workspace_memberships` 沒看到「最後 owner 不可刪/降權」防線。這類 business invariant 不能只靠 API，應有 RPC 或 trigger/constraint 防護。

P2：audit/usage/runtime trace 可以回答大部分「誰做了什麼」，但 `model_usage_ledger` 沒有 workspace_id/task_id，forensic join 會弱。建議後續加 nullable `workspace_id`、`task_id`、`agent_id`，由 API 寫入。

我的判斷：NEXUS 的 Supabase 主體不是亂的，反而已經有明確 production 意識；真正危險是幾個「旁路」沒有被納入同一套 workspace/security contract。先修 Nova、audit RPC、token trigger search_path，再把 server-only grants 和 live checks 固化，資料庫層就會從「大致安全但有洞」提升到「可作為 production 防線」。



---

## V29 迭代修復記錄 (2026-06-17)

### 已處理
| 問題 | 修復 | 檔案 |
|---|---|---|
| `user_new_api_tokens` 使用正確加密 secret | Vercel env `NEW_API_TOKEN_ENCRYPTION_SECRET` 與本機一致 | Vercel env |
| `model_usage_ledger` 記錄 brain_draft sourceType | brain-draft 成功/失敗寫入 ledger | `brain-draft/route.ts` |

### 仍待處理
- P1: Nova RAG 表 (`nova_documents`, `nova_chunks`, `nova_ingest_runs`) anon/authenticated 全開 (Section 2)
- P1: `record_permission_audit_log` SECURITY DEFINER 可被 anon call (Section 2)
- P1: `user_new_api_tokens` trigger function search_path 未固定 (Section 2)
- P1: `model_usage_ledger` grant 過寬 (Section 2)
