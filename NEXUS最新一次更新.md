目標：為 NEXUS 後端建立全域共用的基礎型別、介面與標準規範（包含 ID 命名規則、API Envelope、Error Code 命名空間、Trace Context、權限與冪等性介面）
。 硬性限制：本階段只允許新增或整理 TypeScript 型別、介面、常數、純 helper、no-op event emitter 與註解規範。不得新增或修改任何 database migration、Supabase table、RLS policy、database.types.ts generated schema、前端 Zustand store、IndexedDB 流程、API route 業務邏輯、Agent runtime、Tool execution、Artifact layer 或 Observability table。若需要接入既有檔案，請以最小改動 export/import shared primitives，不得建立平行系統
。

--------------------------------------------------------------------------------
第一個大指令：實作 V0 基礎原語 (請直接複製以下內容給 Codex)
# 任務：實作 NEXUS AI OPS 後端基礎原語 (V0: Shared Backend Primitives)

## 任務背景與硬性限制
我們正在進行 NEXUS 後端的連續架構升級。第一步（V0）的目標是建立全域共用的基礎型別與介面，讓後續的 API、Sync、Tool、Artifact 等模組有一致的「共用語言」。

**【硬性限制】**：本階段只允許新增或整理 TypeScript 型別、介面、常數、純 helper、no-op event emitter 與註解規範。**不得新增或修改任何 database migration、Supabase table、RLS policy、database.types.ts generated schema、前端 Zustand store、IndexedDB 流程、API route 業務邏輯、Agent runtime、Tool execution、Artifact layer 或 Observability table**。若需要接入既有檔案（如 src/lib/nexus-types.ts），請以最小改動 export/import shared primitives，不得建立平行系統。

**【輸出檔案範圍】**：優先在 src/lib/backend/primitives、src/lib/backend/contracts、src/lib/backend/observability 或現有相近位置新增型別與純函式。若專案已有既有 types 檔案，請優先整合。

---

## 實作規格請嚴格遵守以下指示：

### 1. 共用 ID 命名規則
請定義全域型別與命名檢查規範，所有 TypeScript API surface 必須使用 camelCase，且必須固定為以下邏輯名稱：
- workspaceId, agentId, taskId, toolRunId, artifactId, traceId, requestId, clientMutationId。
- **禁止**出現新的同義名稱（如 ws_id, workspaceUid, agentUid, runId, mutationId）。

### 2. 共用 API Envelope
**定義供 /api/v1 使用的共用 response envelope 型別；本階段不需要重構現有 route。** 包含以下型別：
- ApiSuccess<T>: 包含 ok: true, data: T, error: null, meta: { requestId: string, traceId: string, schemaVersion?: number }
- ApiFailure: 包含 ok: false, data: null, error: { code: string, message: string, retryable: boolean, details?: Record<string, unknown> }, meta: { requestId: string, traceId: string }

### 3. 共用 Error Code Namespace
請建立 Error Code 的 Enum 或常數集合，格式必須為 DOMAIN_REASON。
必須保留的 namespace 包含：AUTH_*, WORKSPACE_*, PERMISSION_*, VALIDATION_*, IDEMPOTENCY_*, SYNC_*, AGENT_*, PROVIDER_*, TOOL_*, ARTIFACT_*, OBSERVABILITY_*, DEPLOYMENT_*, HISTORY_*, INTERNAL_*。
範例：WORKSPACE_ACCESS_DENIED, VALIDATION_FAILED。

### 4. 共用 Trace Context 介面
請定義 TraceContext 型別，供後續 Observability 使用：
- 欄位包含：requestId, traceId, workspaceId?, userId?, source (限制為 "api" | "sync" | "agent" | "tool" | "artifact" | "security" | "deployment" | "history"), resourceType?, resourceId?。

### 5. 權限 (Permission) 與冪等性 (Idempotency) 介面
- 定義權限檢查介面 PermissionCheckInput (含 workspaceId, userId, action, resourceType, resourceId?) 與回傳介面 PermissionDecision (含 decision, reasonCode, requiredScopes, riskLevel)。
- **冪等性**：只定義 header contract、型別與 helper，**不建立 api_idempotency_keys table，不實作真正 idempotency persistence**。所有 mutation API 必須接受 X-Request-Id 與 X-Idempotency-Key 的型別定義。

### 6. Status Vocabulary 與 Metadata Schema
- 定義基礎狀態列舉 (如 created, pending, running, succeeded, failed 等)，供各 domain 沿用。
- 定義 BackendMetadata jsonb 型別，必須包含：schemaVersion?, source?, registryVersion?, redactionStatus? ("clean" | "redacted" | "hash_only") 以及 provenance。

### 7. Feature Flag 介面與 Observability Hook
- 定義介面 FeatureFlagProvider，包含 isEnabled(flagKey: string, context: { workspaceId?: string, userId?: string }): Promise<boolean>。
- 實作一個簡單的事件發送器 emitBackendEvent(event)，目前先做為 no-op 或 console.log 使用，以便後續 V9 Observability 接入。

### 8. 架構分層與 Redaction 原則（註解與規範層）
- 請在程式碼架構中明確以型別或註解建立分層原則：API Route → apiHandler / validateRequest → PermissionService → DomainService → Repository → Supabase Adapter。
- Redaction 規則：透過純輔助函式 (helper) 或攔截器確保 API key、provider token 等敏感資訊不可進入儲存層，僅能保存 hash 或長度。

---

## 驗收標準 (Acceptance Criteria)
1. **不得**產生任何 database migration 或修改資料庫 table。
2. **不得**修改前端 Zustand store 或現有 API route 的業務邏輯。
3. 所有新增的 Shared Primitives 需可被後續的 API / Sync / Agent / Tool / Artifact 順利 import。
4. 新增的 redaction helper 需至少覆蓋檢查/遮罩 Authorization、API key、provider token 等字串邏輯。

顯示較少
下午1:05


適用於 6m 13s
已完成 V0 Shared Backend Primitives。

新增在 src/lib/backend，並用 src/lib/nexus-types.ts (line 3) 做最小 re-export，後續 API / Sync / Agent / Tool / Artifact 都可以從既有入口或 @/lib/backend 匯入。

包含：

canonical ID 型別與命名檢查 helper
/api/v1 ApiSuccess<T> / ApiFailure envelope
DOMAIN_REASON error code namespace
TraceContext
Permission / Idempotency contracts
status vocabulary 與 BackendMetadata
FeatureFlagProvider
no-op emitBackendEvent
backend layering contract 註解
redaction helper，覆蓋 Authorization、API key、provider token、Bearer token 等遮罩/儲存摘要邏輯
未修改 migration、Supabase table/RLS/generated schema、Zustand store、IndexedDB、API route 業務邏輯、Agent runtime、Tool execution、Artifact layer 或 Observability table。工作樹裡原本已有的 NEXUS_ARCHITECTURE_BLUEPRINT.md / 後端校正nexus.md 我也沒有碰。

驗證通過：

npm run typecheck
npm run lint
npm run test：5 files / 41 tests passed
npm run build：通過；僅出現既有 edge runtime static generation warning。

已編輯 17 個檔案
+654
-2
復原
查看
src/lib/backend/contracts/api-envelope.ts
src/lib/backend/contracts/feature-flags.ts
src/lib/backend/contracts/idempotency.ts

顯示另外 14 個檔案




下午1:12
# 任務：實作 NEXUS AI OPS 後端安全邊界  
## V1: Backend Security Boundary & RLS Foundation

## 給 Codex 的最終目標

目標：為 NEXUS 後端建立堅固的 Workspace 級別安全邊界。包含：

- 新增並實作 workspace_memberships
- 新增並實作 permission_audit_logs
- 補齊既有資料表的 workspace / owner / created_by 欄位
- 建立分階段 RLS policies
- 實體化 PermissionService
- 實體化 SecretBoundaryService
- 建立 WorkspaceIdentityRepairService
- 建立 RLS smoke tests 與安全驗收測試

本階段的核心任務是：

> Database Migration + RLS Foundation + Backend Security Boundary

---

## 一、硬性限制（我目前也沒給你v2如果你不知道v2是沒問題的）

本階段只允許做 V1 範圍內的安全與資料庫基礎建設。

### 絕對不得做以下事項

1. 不得定義、重構或導入 /api/v1 Response Envelope。  
   這是 V2 的工作。

2. 不得建立 api_idempotency_keys。  
   這是 V2 的工作。

3. 不得建立 Workspace Snapshot、workspace_snapshots、workspace_state_entities。  
   這是 V3 的工作。

4. 不得建立 Durable Sync Queue、sync_operations 或重試隊列。  
   這是 V4 的工作。

5. 不得建立 feature_flags 資料表。  
   這是 V5 的工作。  
   本階段如需 feature flag，只能使用 V0 FeatureFlagProvider interface、env-based fallback 或常數開關。

6. 不得建立 Agent Task、Agent Runtime Session、Tool Run 或 Artifact Provenance。  
   這些分別屬於 V6、V7、V8。

7. 不得建立 system-wide observability table，例如 system_events 或 usage_metrics。  
   這是 V9 的工作。  
   本階段只能使用 V0 emitBackendEvent(...) 發送 minimal event。

8. 不得重構前端 Zustand root object。

9. 不得靜默改寫 IndexedDB root state。

10. 不得建立完整 RBAC 管理 UI、權限管理 Dashboard 或成員管理前端。

11. 不得把 service-role key、API key、Authorization header、provider token 或任何 raw secret 寫入資料庫、log、audit metadata、snapshot 或 frontend bundle。

---

## 二、實作前 Preflight 要求

在撰寫 migration 前，請先檢查目前 Supabase schema 與專案結構。

### 必須確認

1. 目前是否已存在以下 tables：
   - workspaces
   - messages
   - artifacts
   - prompts
   - notebooks
   - workflow_templates

2. 若 table 不存在，不得硬寫會失敗的 migration。  
   請用安全方式處理，例如：
   - 分開 migration
   - if exists
   - 在註解中標明該 table 不存在所以略過
   - 或建立安全的 conditional migration block

3. Migration 必須 additive-first。  
   不得直接刪欄位、改型別、drop table 或破壞既有資料。

4. 所有新增到既有 table 的欄位，第一階段必須 nullable。  
   等 backfill 完成、smoke tests 通過後，未來版本才可考慮 strict not-null enforcement。

5. 若專案使用 Supabase generated types，migration 後必須更新 database.types.ts 或專案對應的 generated DB type 檔案。

---

## 三、Database Schema 升級

請建立 SQL migration 檔案。

### 1. 新增 workspace_memberships

建立 workspace_memberships table。

欄位：

- id uuid primary key，預設 gen_random_uuid()
- workspace_id text not null
- user_id uuid not null
- role text not null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

Role 僅允許：

- owner
- admin
- editor
- viewer

請建立 check constraint：
sql
role in ('owner', 'admin', 'editor', 'viewer')


請建立 unique constraint：
sql
unique (workspace_id, user_id)

請建立 index：
sql
idx_workspace_memberships_user_workspace
idx_workspace_memberships_workspace_role
idx_workspace_memberships_workspace

如果目前 schema 中 workspaces.id 是 text，且可以安全引用，請加上 FK：
sql
workspace_id references workspaces(id) on delete cascade

如果 Supabase auth.users(id) 可安全引用，請加上：
sql
user_id references auth.users(id) on delete cascade

若專案現況不適合 FK，請在 migration 註解中清楚說明原因，不要硬加造成 migration 失敗。

---

### 2. 新增 permission_audit_logs

建立 permission_audit_logs table。

欄位：

* id uuid primary key，預設 gen_random_uuid()
* workspace_id text nullable
* actor_user_id uuid nullable
* action text not null
* resource_type text not null
* resource_id text nullable
* decision text not null
* reason_code text nullable
* metadata jsonb not null default '{}'::jsonb
* created_at timestamptz not null default now()

Decision 僅允許：

* allowed
* denied
* requires_confirmation

請建立 check constraint：
sql
decision in ('allowed', 'denied', 'requires_confirmation')

請建立 index：
sql
idx_permission_audit_workspace_created
idx_permission_audit_actor_created
idx_permission_audit_resource
idx_permission_audit_decision_created

Audit metadata 必須永遠經過 redaction，不得包含 raw request body、API key、Authorization header、provider token、service-role key、raw secret 或 stack trace。

---

### 3. 擴充既有 tables

請以 additive、nullable-first 的方式擴充既有資料表。

#### workspaces

新增：

* owner_user_id uuid nullable
* created_by uuid nullable
* updated_at timestamptz nullable/default now()

#### messages

新增：

* created_by uuid nullable

如果 messages 目前已經有 workspace_id，不得重建欄位。
如果沒有，請先檢查現有資料模型。只有在確認 message 確實需要 workspace-scoped RLS 且不破壞現有資料時，才新增 nullable workspace_id。否則請註解說明留給 V10 或現有 message schema owner 處理。

#### artifacts

新增：

* created_by uuid nullable

如果已存在 workspace_id，不得重複新增。
如果不存在，請先檢查 artifacts 是否已經透過 workspace 或 message 關聯。如果缺少 workspace scope，請以 nullable workspace_id additive 方式加入，並標明 backfill 策略。

#### prompts

新增：

* created_by uuid nullable

如果已存在 workspace_id，不得重複新增。
如果不存在，請依現有 prompts schema 判斷是否需要 nullable workspace_id。

#### notebooks

新增：

* workspace_id text nullable
* created_by uuid nullable

#### workflow_templates

新增：

* workspace_id text nullable
* created_by uuid nullable

---

### 4. updated_at trigger

如果專案已有共用 updated_at trigger function，請沿用。
如果沒有，請建立簡單且安全的 set_updated_at() function，並套用到：

* workspace_memberships
* workspaces

不得因為 trigger 建立失敗而破壞既有 table。

---

## 四、Backfill 策略

RLS 不得在 backfill 前硬切。

請建立安全的 backfill 邏輯，目標是：

1. 既有 workspaces 補上：

   * owner_user_id
   * created_by
   * updated_at

2. 為每個已知 owner 建立 workspace_memberships：

   * role = 'owner'

3. 既有 notebooks、workflow_templates 補上：

   * workspace_id
   * created_by

4. 既有 messages、artifacts、prompts 補上：

   * created_by
   * 如果安全且必要，補上 workspace_id

### Backfill 原則

* 不得猜測 user ownership。
  如果找不到可靠 user id，請保持 nullable，並建立 repair path，不得亂填假 user。

* 不得把所有資料硬塞給同一個 user，除非目前專案確實是 single-user local seed 且能從 auth/session 或既有 metadata 明確推導。

* backfill 必須可以重複執行，不得產生 duplicate membership。

* 對 workspace-nexus-ops 的處理必須保守，不得靜默 cascade 改寫 local state。

---

## 五、RLS Helper Functions

請優先建立 PostgreSQL helper functions，避免每張 table 重複寫複雜 policy，也避免 recursive RLS。

建議建立：
sql
is_workspace_member(target_workspace_id text)
has_workspace_role(target_workspace_id text, allowed_roles text[])

要求：

1. function 必須使用 security definer 時，務必設定固定 search_path，例如：
sql
set search_path = public

2. function 內只能做 membership 判斷，不得寫資料。

3. function 不得洩漏其他 workspace 資訊。

4. function 必須使用 auth.uid() 判斷目前 user。

5. 必須避免 workspace_memberships policy recursive lookup 問題。

---

## 六、RLS 分階段上線

RLS 上線必須分階段，絕對禁止一次硬開。

### 階段 1：Schema Additive Migration

* 新增 nullable 欄位
* 新增 workspace_memberships
* 新增 permission_audit_logs
* 新增 indexes
* 新增 helper functions

### 階段 2：Backfill

* 補 owner / created_by / workspace_id
* 建立 owner membership
* 確認沒有 duplicate membership
* 確認無法判斷 ownership 的資料保持 nullable 並進入 repair list

### 階段 3：建立 RLS Policies，但先避免破壞既有資料

請為以下 tables 建立 workspace-scoped RLS policies：

* workspaces
* workspace_memberships
* permission_audit_logs
* notebooks
* workflow_templates
* messages，若已具備 workspace scope
* artifacts，若已具備 workspace scope
* prompts，若已具備 workspace scope

原則：

* workspace member 可以 SELECT 自己 workspace 的資料
* owner/admin/editor 可以 INSERT/UPDATE workspace-scoped mutable data
* viewer 只能 SELECT，不可 INSERT/UPDATE/DELETE
* owner/admin 才能管理 membership
* audit logs 一般 client 不可任意讀寫；寫入應透過 server-side service 或安全 RPC/service-role path
* service-role 只允許 server-side 使用，絕不能暴露給 frontend

### 階段 4：RLS Smoke Tests

在 strict enforcement 前，必須通過 smoke tests：

1. User A 看不到 User B 的 workspace。
2. User A 不能讀取 User B 的 notebooks。
3. User A 不能讀取 User B 的 workflow templates。
4. Viewer 可以 SELECT，但不能 INSERT/UPDATE/DELETE。
5. Editor 可以更新 workspace asset，但不能管理 owner membership。
6. Missing membership 必須 denied。
7. Cross-workspace access 必須 denied 並產生 audit record。
8. Audit metadata 不含 secret。
9. service-role key 不出現在 frontend bundle。

### 階段 5：Strict Enforcement

只有在 backfill 與 smoke tests 通過後，才可以啟用 strict RLS enforcement。

不得在未完成 backfill 前讓既有資料變成不可讀或不可寫。

---

## 七、PermissionService

請在後端核心資料夾實作，例如：
txt
src/lib/backend/security/

建立：

* PermissionService
* WorkspaceMembershipRepository
* SecurityAuditRepository
* SecretBoundaryService
* WorkspaceIdentityRepairService

PermissionService 必須依賴 V0 shared primitives，不得重新發明 permission types。

### 必須實作
ts
PermissionService.check(input): Promise<PermissionDecision>

以及：
ts
PermissionService.requireWorkspaceRole({
  workspaceId,
  userId,
  minRole,
  action,
  resourceType,
  resourceId
})

### PermissionService 流程
txt
auth session resolved
→ workspaceId resolved
→ membership loaded
→ role/action/resource checked
→ PermissionDecision created
→ sanitized audit log written
→ minimal backend event emitted
→ allowed / denied / requires_confirmation returned

### 權限規則

Role 權限：

* owner

  * 所有 workspace 操作
  * membership 管理
  * workspace delete
  * owner transfer

* admin

  * 管理 workspace assets
  * 管理 tool/provider settings
  * 不可移除 owner
  * 不可 transfer ownership

* editor

  * 修改 workspace、message、artifact、prompt、notebook、workflow template
  * 不可管理 membership

* viewer

  * 只能讀取
  * 不可寫入
  * 不可執行 tool
  * 不可修改任何 workspace resource

### Fail Closed 原則

以下情況必須 denied：

* auth missing
* membership missing
* workspaceId missing
* PermissionService error
* database/RLS denied
* unknown role
* unknown action
* unknown resource type

高風險操作如果 audit log 寫入失敗，必須 blocked。

---

## 八、Security Audit

當 PermissionService 做出 decision 時，必須：

1. 寫入 permission_audit_logs
2. 呼叫 V0 emitBackendEvent(...) 發送 minimal security event

Minimal event 欄位：
ts
{
  source: "security",
  workspaceId,
  userId,
  resourceType,
  resourceId,
  action,
  decision,
  reasonCode,
  requestId,
  traceId
}

不得建立 system_events table。
不得新增 V9 observability pipeline。

Audit log metadata 只能包含 sanitized metadata，例如：

* requestId
* traceId
* redactionStatus
* riskLevel
* resource summary
* reasonCode
* user agent hash
* ip hash

Audit log metadata 不得包含：

* API key
* Authorization header
* provider token
* service-role key
* raw request body
* raw tool input containing credentials
* stack trace
* .env value
* private file path containing user secret

---

## 九、SecretBoundaryService

請實作 SecretBoundaryService，用於阻止 secret 進入 database、audit log、event metadata 或未來 snapshot。

### 必須提供能力
ts
scanForSecrets(input): SecretScanResult
redact(input): RedactedValue
assertNoSecrets(input): void
sanitizeAuditMetadata(metadata): BackendMetadata

### 必須偵測或攔截

* Authorization
* Bearer ...
* apiKey
* api_key
* x-api-key
* providerToken
* access_token
* refresh_token
* service_role
* SUPABASE_SERVICE_ROLE_KEY
* OpenAI / Anthropic / provider key pattern
* .env raw value
* raw secret-like string

### 儲存規則

不可入庫：

* raw API key
* raw Authorization header
* provider token
* service-role key
* refresh token
* raw secret

可入庫但必須 redacted/hash：

* secret length
* secret hash
* provider id
* model id
* sanitized error message
* redactionStatus
* content hash

---

## 十、WorkspaceIdentityRepairService

目前 local default workspace id 是：
txt
workspace-nexus-ops

在多人登入或 cloud sync 後，該 ID 可能出現 owner collision。

請實作：
ts
WorkspaceIdentityRepairService

### 必須支援

1. dryRun(...)
2. detectConflicts(...)
3. createRepairPlan(...)
4. applyRepairPlan(...)

### 修復原則

* 不得靜默改寫 IndexedDB root state。
* 不得直接修改未知或不存在的 table。
* 不得盲目 cascade update 所有 local objects。
* 只允許更新已存在、已 workspace-scoped、且在 cloud schema 中可安全辨識的資料表。
* Local state rewrite 必須透過既有 sync / workspace identity adapter 進行。
* apply 前必須有 explicit apply step，不得在 detect 階段直接修改資料。
* repair plan 必須列出會受影響的 resource type 與 count。
* 若資料無法安全歸屬，必須標記為 manual repair，不得猜測。

### Collision 情境

當 authenticated user 第一次 cloud sync 時：

1. 如果 workspace-nexus-ops 尚未被其他 owner 使用，可以保留。
2. 如果 workspace-nexus-ops 已被其他 owner 使用，必須產生新的 workspace_* id。
3. 新 id 必須更新該 user 擁有的 cloud workspace-scoped records。
4. 不得改寫其他 owner 的資料。
5. 不得改寫無法確認 owner 的資料。

---

## 十一、前端允許的最小改動

本階段前端只允許：

1. 顯示簡單 Permission Denied 狀態。
2. 確保 service-role key 不被打包到 frontend。
3. 確保前端不複製後端 permission rule。
4. 若既有 API 呼叫需要帶 workspaceId/user session，僅做最小接線。

不得：

* 重構 Zustand root object
* 建完整 RBAC UI
* 建 member management UI
* 建權限設定頁
* 建完整 error normalization layer
* 改 IndexedDB schema，除非是避免 secret 寫入的最小修正
* 實作 V2 Typed API Client

---

## 十二、Testing 要求

請補上測試。

### Migration Tests / SQL Tests

至少覆蓋：

1. workspace_memberships unique (workspace_id, user_id) 生效。
2. role check constraint 生效。
3. permission_audit_logs.decision check constraint 生效。
4. indexes 存在。
5. migration 可重複執行或至少不破壞既有資料。

### RLS Smoke Tests

至少覆蓋：

1. User A 不能讀 User B workspace。
2. User A 不能讀 User B notebook。
3. User A 不能讀 User B workflow template。
4. Viewer 不能 insert/update/delete。
5. Editor 可以寫一般 workspace asset。
6. Editor 不能管理 membership。
7. Missing membership denied。
8. Cross-workspace access denied。
9. Service-role server-side path 可執行必要 audit，但不能進 frontend。

### Service Tests

至少覆蓋：

1. PermissionService.check(...) allowed。
2. PermissionService.check(...) denied。
3. missing membership fail closed。
4. unknown role fail closed。
5. audit log 寫入成功。
6. audit log 寫入失敗時高風險操作 blocked。
7. SecretBoundaryService 可偵測 Authorization header。
8. SecretBoundaryService 可偵測 API key。
9. SecretBoundaryService 可 redacted metadata。
10. audit metadata 不含 secret。

### Frontend Bundle Safety Test

至少確認：

1. SUPABASE_SERVICE_ROLE_KEY 不使用 NEXT_PUBLIC_ 前綴。
2. service-role key 不會出現在 client bundle。
3. browser-accessible code 不 import server-only Supabase admin client。

---

## 十三、Acceptance Criteria

完成後必須符合以下驗收標準：

1. workspace_memberships migration 成功。
2. permission_audit_logs migration 成功。
3. 既有 tables 已以 nullable-first 方式補齊 owner/workspace 欄位。
4. Backfill 不會破壞既有資料。
5. RLS 分階段上線，不會在 backfill 前讓舊資料不可讀不可寫。
6. 不同 user 無法讀取彼此 workspace。
7. Viewer 無法修改或寫入資料。
8. Notebooks 加入 workspace isolation。
9. Workflow templates 加入 workspace isolation。
10. PermissionService 是唯一後端權限判斷入口。
11. API route 或 service 不得直接 query membership table 自行判斷權限。
12. Permission denied 必須寫入 audit log。
13. Audit metadata 不含 API key、Authorization token 或 raw secret。
14. SecretBoundaryService 能阻擋 secret 進入 log/database。
15. WorkspaceIdentityRepairService 能 dry-run 並產出 repair plan。
16. WorkspaceIdentityRepairService 不會靜默破壞 Zustand/IndexedDB local state。
17. service-role key 不出現在 frontend bundle。
18. 不建立 feature_flags table。
19. 不建立 V2/V3/V4/V6/V7/V8/V9 的資料表或 lifecycle。
20. database.types.ts 或對應 generated DB types 已更新。

---

## 十四、Rollback / Safety

Migration 必須支援安全 rollback 或至少安全停用。

### Rollback 原則

* 新欄位 nullable，因此可保留不用。
* RLS policy 可在 staging 暫時切回 permissive，但 production 不建議長期關閉。
* Permission gate 可灰度關閉，但 audit table 不刪。
* 不刪除 membership / audit rows。
* Repair plan 未 explicit apply 前不得改資料。
* 若 smoke test 失敗，不得啟用 strict enforcement。

### 可用的 env fallback / flags

不得建立 feature_flags table。
若需要灰度，只能使用 env 或 V0 FeatureFlagProvider interface，例如：
txt
SECURITY_RLS_ENFORCED=false
SECURITY_PERMISSION_GATE_ENABLED=false
SECURITY_SECRET_BOUNDARY_ENFORCED=true

這些只是暫時 fallback，不得形成 V5 feature flag system。

---

## 十五、交付內容

請輸出或修改以下內容：

1. SQL migration file
2. RLS policies
3. RLS helper functions
4. Backfill script 或 migration block
5. PermissionService
6. WorkspaceMembershipRepository
7. SecurityAuditRepository
8. SecretBoundaryService
9. WorkspaceIdentityRepairService
10. Tests
11. Updated Supabase generated types
12. 簡短 implementation notes，說明：

    * 哪些 tables 已套用 RLS
    * 哪些欄位 nullable-first
    * backfill 策略
    * strict enforcement 是否已啟用
    * 任何無法安全 backfill 的資料
    * 如何執行 smoke tests

請嚴格遵守 V1 scope，不要提前實作 V2 之後的內容。
這版可以直接丟 Codex。  
我建議你實作時還是把它當成 **V1 單獨任務**，不要和 V2 一起跑，因為 V2 會依賴這版產出的 `PermissionService` 與安全邊界。


顯示較少
下午1:28


適用於 15m 54s
已完成 V1 Backend Security Boundary & RLS Foundation。

主要交付：

新增 migration：20260527000000_security_boundary_rls_foundation.sql
新增 security services：PermissionService、SecretBoundaryService、WorkspaceIdentityRepairService
新增 repos：repositories.ts
更新 DB type shim：database.types.ts
新增 tests：security-services.test.ts、security-migration.test.ts、frontend-bundle-safety.test.ts
Implementation notes:

RLS policies covered workspaces, workspace_memberships, permission_audit_logs, messages when workspace-scoped, artifacts, prompts, notebooks, and workflow_templates.
New existing-table columns are nullable-first: owner_user_id, created_by, updated_at, and workspace scope fields where required.
Backfill is conservative: it only derives created_by/owner memberships from existing owner_user_id; it does not guess ownership.
Strict enforcement is not fully forced yet: RLS is enabled, but legacy workspace_id IS NULL compatibility remains for repair/backfill safety. No FORCE ROW LEVEL SECURITY.
permission_audit_logs has no authenticated client policies; it is intended for server-side/service-role paths only.
WorkspaceIdentityRepairService supports dry-run plans and refuses apply without an explicit apply step.
No V2+ tables were added: no api_idempotency_keys, feature_flags, snapshots, sync queue, tool runs, agent runtime/session, artifact provenance, or system observability tables.
Verification passed:

npm run typecheck
npm run lint
npm run test：8 files / 62 tests passed
npm run build passed; only the existing edge runtime static-generation warning appeared.
Existing dirty files NEXUS_ARCHITECTURE_BLUEPRINT.md and 後端校正nexus.md were left alone.


已編輯 13 個檔案
+2,373
-19
復原
查看
supabase/migrations/20260527000000_security_boundary_rls_foundation.sql
supabase/migrations/20260527000000_security_boundary_rls_foundation.sql
src/lib/backend/contracts/permission.ts

顯示另外 10 個檔案




下午1:44
# 任務：實作 NEXUS AI OPS 統一 API 契約  
## V2: Unified API Contract v1

## 給 Codex 的最終目標

建立 NEXUS 的 /api/v1 統一 API 契約，包含：

1. 共用 apiHandler
2. Request validation wrapper
3. 標準 ApiSuccess / ApiFailure response envelope
4. 標準 error code mapping
5. Mutation idempotency middleware
6. api_idempotency_keys 資料表
7. 前端專用 NexusApiClient
8. 既有高風險 API route 的 v1 compatibility wrapper
9. Streaming event shape 標準化
10. Minimal API trace event hook

本階段只建立 API contract layer，不建立後續 domain lifecycle。

---

# 0. 硬性限制

本階段核心任務是「API 基礎建設與路由相容性」。

請嚴格遵守：

1. 不得實作或定義 Workspace Snapshot。
   - workspace_snapshots 屬於 V3。
   - workspace_state_entities 屬於 V3。

2. 不得實作 Durable Sync Queue。
   - sync_operations 屬於 V4。
   - 不得建立 retry queue、operation compaction、manual retry UI。

3. 不得實作 Agent Task Lifecycle。
   - agent_tasks、agent_runtime_sessions、agent_runtime_events 屬於 V6。

4. 不得實作 Tool Run Lifecycle。
   - tool_runs、tool_permissions 屬於 V7。

5. 不得建立 feature flag 資料表或 deployment gate。
   - feature_flags、deployment_checks 屬於 V5。
   - 本階段若需要 feature flag，只能使用 V0 FeatureFlagProvider interface 或 env-based fallback。

6. 不得建立 Observability event table。
   - system_events、usage_metrics 屬於 V9。
   - 本階段只能呼叫 V0 的 emitBackendEvent(event) no-op/minimal hook。

7. 不得修改前端 UI 功能。
   - Zustand store 只能最小幅度接入 NexusApiClient。
   - 不得重構 Zustand root object。
   - 不得改變現有 UI layout 或 user-facing feature。

8. 不得重新定義 V0 primitives。
   - 必須 import / reuse V0 的 ApiSuccess、ApiFailure、TraceContext、Error Code、ID 命名規則、redaction helper。
   - 不得建立平行的 error/envelope/trace/permission/idempotency primitives。

9. 不得重新定義 V1 permission 規則。
   - V2 只接入 V1 PermissionService。
   - 不得在 API route 裡直接 query membership table 來自行判斷權限。

---

# 1. Database Schema 升級：api_idempotency_keys

建立 SQL migration，新增 api_idempotency_keys 資料表。

## 1.1 Table Schema

請建立：
sql
create table if not exists api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),

  idempotency_key text not null,
  workspace_id text not null default '__global__',
  actor_user_id uuid,

  method text not null,
  path text not null,

  request_hash text not null,
  request_fingerprint text not null,

  response_payload jsonb,
  status_code int,

  status text not null default 'pending',
  locked_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),

  constraint api_idempotency_status_check
    check (status in ('pending', 'completed', 'failed')),

  constraint api_idempotency_method_check
    check (method in ('POST', 'PUT', 'PATCH', 'DELETE')),

  constraint api_idempotency_key_not_empty
    check (length(trim(idempotency_key)) > 0),

  constraint api_idempotency_workspace_key_unique
    unique (workspace_id, idempotency_key)
);
1.2 Indexes

請建立：

create index if not exists idx_api_idempotency_workspace_key
  on api_idempotency_keys (workspace_id, idempotency_key);

create index if not exists idx_api_idempotency_expires
  on api_idempotency_keys (expires_at);

create index if not exists idx_api_idempotency_actor_created
  on api_idempotency_keys (actor_user_id, created_at desc);

create index if not exists idx_api_idempotency_status_locked
  on api_idempotency_keys (status, locked_at);
1.3 RLS / Access Boundary

api_idempotency_keys 是 server-side infrastructure table。

要求：

啟用 RLS。
不建立給 frontend Supabase client 直接讀寫的 public policy。
所有讀寫必須透過 server-side IdempotencyRepository。
不得從 browser bundle 直接 import Supabase service-role client。
不得讓 NEXT_PUBLIC_* 暴露 service-role key。

可以使用：

alter table api_idempotency_keys enable row level security;

如果專案已有 server-only repository pattern，請沿用既有模式。

2. Idempotency Contract

所有 mutation API，也就是 POST、PUT、PATCH、DELETE，必須接受：

X-Request-Id
X-Idempotency-Key

前端 local-first mutation 必須生成 clientMutationId，並將它映射為：

X-Idempotency-Key: clientMutationId
2.1 Request Hash 規則

request_hash 必須由 canonical request body 產生。

要求：

使用 stable JSON stringify / canonicalization。
排除 volatile 欄位：
requestId
traceId
timestamp 類欄位
transient UI-only 欄位
不得將 raw request body 存入 table。
request_hash 只保存 hash，例如 sha256:<hash>。
Hash 前必須先經過 V0/V1 redaction helper，避免 secret 進入 fingerprint 過程。
2.2 Request Fingerprint 規則

request_fingerprint 用於區分同 idempotency key 但不同 route/method 的風險。

建議格式：

METHOD PATH WORKSPACE_ID REQUEST_HASH

例如：

POST /api/v1/agents/memory-compress workspace_abc sha256:xxx
2.3 Replay 規則

Idempotency middleware 必須符合：

同一個 workspace_id + idempotency_key 第一次請求：
建立 pending record。
執行 service。
儲存 sanitized response envelope。
標記 completed。
同一個 workspace_id + idempotency_key 第二次請求，且 request_hash 相同：
不得再次執行 service。
直接回傳已儲存的 response_payload 與 status_code。
標記 response meta 或 event 為 idempotencyHit: true。
同一個 workspace_id + idempotency_key 第二次請求，但 request_hash 不同：
回傳 HTTP 409。
Error code 必須為 IDEMPOTENCY_CONFLICT。
不得執行 service。
已過期的 key：
可以視為新請求，但不得造成舊 response 洩漏。
TTL cleanup 可以只提供 repository method，不必建立 background worker。
Pending record 過久：
若 status = pending 且 locked_at 超過安全時間，可回傳 IDEMPOTENCY_PENDING 或 IDEMPOTENCY_LOCKED。
不得重入執行造成 duplicate side effect。
3. 後端 API 基礎設施

請基於 V0 Primitives 與 V1 Security 實作以下模組。

建議位置可依專案結構微調，但不得建立平行 primitive 系統：

src/lib/backend/api/
  api-handler.ts
  api-contract-service.ts
  api-errors.ts
  api-request-validator.ts
  idempotency-middleware.ts
  idempotency-repository.ts
  route-compatibility.ts

src/lib/api/
  nexus-api-client.ts
3.1 apiHandler

建立共用 apiHandler。

標準 request flow 必須為：

1. 解析或生成 requestId
2. 解析或生成 traceId
3. 建立 TraceContext
4. 驗證 HTTP method
5. 解析 JSON body
6. 執行 request validation
7. 解析 auth session
8. 對 workspace-scoped route 呼叫 V1 PermissionService
9. 對 mutation route 執行 idempotency middleware
10. 執行 domain handler
11. 回傳 V0 ApiSuccess / ApiFailure envelope
12. 發送 minimal API event

注意：

Validation failed 不得進入 service 層。
Permission denied 不得進入 domain handler。
Idempotency hit 不得再次執行 domain handler。
Unknown exception 必須轉成 INTERNAL_ERROR，不得暴露 stack trace。
所有 /api/v1 response 必須符合 V0 envelope。
3.2 ApiSuccess / ApiFailure

不得重新定義 envelope。

必須 import V0 的型別。

所有成功 response 必須符合：

{
  ok: true,
  data: T,
  error: null,
  meta: {
    requestId: string,
    traceId: string,
    schemaVersion?: number
  }
}

所有失敗 response 必須符合：

{
  ok: false,
  data: null,
  error: {
    code: string,
    message: string,
    retryable: boolean,
    details?: Record<string, unknown>
  },
  meta: {
    requestId: string,
    traceId: string
  }
}
3.3 Error Mapping

請建立 V2 API error mapping，但不得新增 V0 namespace 以外的混亂命名。

至少支援：

AUTH_REQUIRED
WORKSPACE_ACCESS_DENIED
PERMISSION_DENIED
VALIDATION_FAILED
IDEMPOTENCY_CONFLICT
IDEMPOTENCY_PENDING
IDEMPOTENCY_EXPIRED
PROVIDER_TIMEOUT
PROVIDER_RATE_LIMITED
INTERNAL_ERROR

Retry rule：

AUTH_REQUIRED                 retryable: false
WORKSPACE_ACCESS_DENIED       retryable: false
PERMISSION_DENIED             retryable: false
VALIDATION_FAILED             retryable: false
IDEMPOTENCY_CONFLICT          retryable: false
IDEMPOTENCY_PENDING           retryable: true
PROVIDER_TIMEOUT              retryable: true
PROVIDER_RATE_LIMITED         retryable: true
INTERNAL_ERROR                retryable: true

要求：

Error details 不得包含 stack trace。
Error details 不得包含 Authorization header、API key、provider token、service-role key。
Validation error 可包含欄位路徑，例如 path: ["messages", 0, "content"]。
不得回傳完整敏感 payload。
3.4 ApiRequestValidator

請建立 request validator wrapper。

要求：

支援現有專案使用的 schema 工具；若已有 Zod，優先使用 Zod。
驗證失敗時回傳 VALIDATION_FAILED。
回傳 details 時只包含：
field path
issue code
sanitized message
不得把完整 body 放入 error details。
Validation failed 不得進入 service layer。
3.5 IdempotencyRepository

建立 server-only repository。

必要方法：

type IdempotencyLookupInput = {
  workspaceId: string
  actorUserId?: string
  idempotencyKey: string
  method: string
  path: string
  requestHash: string
  requestFingerprint: string
}

type IdempotencyLookupResult =
  | { type: "miss"; recordId: string }
  | { type: "hit"; statusCode: number; responsePayload: unknown }
  | { type: "conflict" }
  | { type: "pending" }

interface IdempotencyRepository {
  begin(input: IdempotencyLookupInput): Promise<IdempotencyLookupResult>
  complete(recordId: string, statusCode: number, responsePayload: unknown): Promise<void>
  fail(recordId: string, statusCode: number, responsePayload: unknown): Promise<void>
  cleanupExpired(now?: Date): Promise<number>
}

要求：

responsePayload 必須是 sanitized envelope。
不保存 raw request body。
不保存 raw Authorization header。
不保存 provider token。
不保存 API key。
不保存 stack trace。
Streaming route 不得保存 token 級完整 stream。
4. API 路由遷移與相容性

本階段只 v1 化既有高風險 route，不新增後續版本的 domain API。

4.1 /api/memory-compress

請建立：

POST /api/v1/agents/memory-compress

並保留 legacy compatibility wrapper：

POST /api/memory-compress

要求：

新路由必須使用 apiHandler。
新路由必須使用 V0 envelope。
新路由必須支援 validation。
新路由必須支援 idempotency。
舊路由可轉呼叫新 handler 或 adapter，但不得複製一套業務邏輯。
不得改變現有前端功能與 UI。
4.2 /api/agent-stream

請建立：

POST /api/v1/agents/[agentId]/stream

並保留 legacy compatibility wrapper：

POST /api/agent-stream
Streaming 嚴格限制

本階段只標準化 streaming event shape。

標準 event shape：

type AgentStreamEvent =
  | {
      type: "meta"
      requestId: string
      traceId: string
      agentId: string
      workspaceId?: string
    }
  | {
      type: "token"
      token: string
    }
  | {
      type: "done"
      data?: unknown
    }
  | {
      type: "error"
      error: {
        code: string
        message: string
        retryable: boolean
      }
    }

嚴格禁止：

不得建立 agent_tasks。
不得建立 agent_runtime_sessions。
不得保存 token 級完整 stream。
不得實作 resumable task。
不得建立 task lifecycle。
不得把 streaming token payload 寫入 api_idempotency_keys。

Streaming idempotency 規則：

可以要求 streaming route 不套用 full response replay。
可以只保存 final metadata。
如果無法安全 replay stream，請回傳明確錯誤或 bypass response replay，但仍保留 requestId/traceId。
不得因 idempotency 而實作 V6 task lifecycle。
4.3 /api/v1/health

建立：

GET /api/v1/health

嚴格限制：

僅回傳 basic liveness/readiness。
僅回傳 env presence boolean。
不得回傳任何 env raw value。
不得回傳 secret。
不得做 registry drift check。
不得做 migration dry-run。
不得做 deployment gate。
不得做 feature flag dashboard。
不得讀取或建立 deployment_checks。
不得讀取或建立 feature_flags table。

Response 範例：

{
  "ok": true,
  "data": {
    "status": "ok",
    "checks": {
      "supabaseUrlPresent": true,
      "supabaseAnonKeyPresent": true
    }
  },
  "error": null,
  "meta": {
    "requestId": "req_x",
    "traceId": "trace_x"
  }
}
5. Frontend Typed API Client

建立前端專用 NexusApiClient。

建議位置：

src/lib/api/nexus-api-client.ts

或依照現有專案結構放在等價位置。

5.1 Client 責任

NexusApiClient 必須：

自動產生 requestId。
自動產生或傳遞 traceId。
對 mutation 自動產生 clientMutationId。
將 clientMutationId 傳為 X-Idempotency-Key。
將 requestId 傳為 X-Request-Id。
統一解析 ApiSuccess<T>。
統一解析 ApiFailure。
不讓 Zustand store 解析 route-specific error shape。
不暴露 stack trace 給前端 UI。
保留 legacy route compatibility。
5.2 Client API 建議
interface NexusApiClient {
  post<TResponse, TBody>(
    path: string,
    body: TBody,
    options?: {
      workspaceId?: string
      idempotencyKey?: string
      traceId?: string
    }
  ): Promise<TResponse>

  put<TResponse, TBody>(
    path: string,
    body: TBody,
    options?: {
      workspaceId?: string
      idempotencyKey?: string
      traceId?: string
    }
  ): Promise<TResponse>

  get<TResponse>(
    path: string,
    options?: {
      workspaceId?: string
      traceId?: string
    }
  ): Promise<TResponse>
}
5.3 Zustand 接入限制

允許：

將現有 API 呼叫逐步換成 NexusApiClient。
將錯誤解析集中到 client。
在 mutation action 裡生成或傳遞 clientMutationId。

禁止：

重構 Zustand root object。
改變 active workspace state shape。
新增大型 API state manager。
新增 UI 功能。
把 API response envelope 原樣塞滿 store。
6. Minimal API Event Hook

每個 /api/v1 route 在完成時，呼叫 V0 emitBackendEvent(event)。

Event shape 至少包含：

{
  source: "api",
  route: string,
  method: string,
  statusCode: number,
  latencyMs?: number,
  errorCode?: string,
  retryable?: boolean,
  workspaceId?: string,
  requestId: string,
  traceId: string,
  idempotencyHit?: boolean
}

限制：

不建立 system_events table。
不建立 route-specific log table。
不保存 raw request body。
不保存 raw response body。
不保存 secret。
不保存 token stream。
7. Redaction 與 Secret Safety

所有以下位置都必須經過 redaction：

response_payload
validation error details
idempotency event metadata
API event metadata
health response
frontend error object

嚴格禁止保存或回傳：

API key
Authorization header
provider token
service-role key
raw .env value
raw secret
stack trace
full sensitive request payload
token 級 streaming output

允許保存：

hash
content length
provider id
model id
status code
sanitized error message
redaction status
8. Tests / Acceptance Criteria

請新增或更新 contract tests。

8.1 API Envelope

驗收：

所有 /api/v1 success response 符合 ApiSuccess<T>。
所有 /api/v1 failure response 符合 ApiFailure。
requestId 與 traceId 必須出現在 meta。
Unknown exception 不得暴露 stack trace。
8.2 Validation

驗收：

Invalid JSON 回傳 VALIDATION_FAILED。
Invalid body 回傳 VALIDATION_FAILED。
Validation error 包含 sanitized field path。
Validation failed 不得進入 service layer。
8.3 Idempotency

驗收：

同一 X-Idempotency-Key + 相同 payload 重送，回傳相同結果。
同一 X-Idempotency-Key + 不同 payload，回傳 409。
409 error code 必須為 IDEMPOTENCY_CONFLICT。
Idempotency hit 不得再次執行 domain handler。
api_idempotency_keys 不保存 raw request body。
api_idempotency_keys 不保存 API key、Authorization header、provider token 或 stack trace。
workspace_id 必須為 not null，global route 使用 __global__。
8.4 Routing Compatibility

驗收：

/api/v1/agents/memory-compress 可用。
/api/memory-compress legacy wrapper 仍可用。
/api/v1/agents/[agentId]/stream 可用。
/api/agent-stream legacy wrapper 仍可用。
Legacy route 不複製一套業務邏輯。
8.5 Streaming

驗收：

Streaming event 包含標準 meta、token、done、error shape。
不建立 agent_tasks。
不建立 agent_runtime_sessions。
不保存完整 token stream。
不實作 resumable task。
不實作 V6 task lifecycle。
8.6 Health

驗收：

/api/v1/health 成功運作。
不暴露任何 env raw value。
只回傳 presence boolean。
不執行 registry drift check。
不執行 migration dry-run。
不建立 deployment checks。
不建立 feature flags。
8.7 Frontend Client

驗收：

NexusApiClient 可供 Zustand store action 使用。
Client 自動處理 ApiFailure。
Client mutation 自動生成 clientMutationId。
Client 將 clientMutationId 傳為 X-Idempotency-Key。
Store 不再解析 route-specific error shape。
不重構 Zustand root state。
9. Rollback / Feature Flag

本階段可支援以下 env 或 V0 FeatureFlagProvider flag：

api.v1_enabled
api.v1_strict_envelope
api.idempotency_enabled
api.legacy_route_compat_enabled

注意：

不得建立 feature_flags table。
feature_flags table 屬於 V5。

Rollback 策略：

舊 route 保留。
v1 route 可灰度。
idempotency middleware 可暫時旁路，但 table 不刪除。
新前端若收到 legacy response，client adapter 可 normalize。
migration 是 additive，不應破壞現有資料。
10. 實作順序

請依照以下順序實作，避免交叉污染後續版本：

確認並 import V0 primitives。
確認並 import V1 PermissionService。
新增 api_idempotency_keys migration。
實作 IdempotencyRepository。
實作 request hash / request fingerprint helper。
實作 ApiRequestValidator。
實作 apiHandler。
實作 error mapping。
實作 /api/v1/health。
v1 化 /api/memory-compress。
v1 化 /api/agent-stream streaming wrapper。
建立 NexusApiClient。
將最小必要的 frontend API 呼叫切到 client。
補 API contract tests。
補 idempotency tests。
補 streaming event tests。
補 health secret-safety tests。
11. 最終交付內容

請在完成後回報：

新增/修改的 migration 檔案。
新增/修改的 backend API infrastructure 檔案。
新增/修改的 route 檔案。
新增/修改的 frontend client 檔案。
新增/修改的 tests。
是否有任何 legacy route 保留。
是否有任何無法完成項目，以及原因。
確認沒有新增 V3/V4/V5/V6/V7/V9 的資料表或 lifecycle。

顯示較少
下午1:57



適用於 13m 32s
已完成 V2 Unified API Contract v1。

交付重點：

新增 migration：20260527001000_api_idempotency_keys.sql
api_idempotency_keys
constraints / indexes / RLS enabled
無 frontend public policy
新增 API infra：src/lib/backend/api
apiHandler
request validator
API error mapping
request hash / fingerprint
idempotency middleware + repository
route compatibility helper
新增 v1 routes：
GET /api/v1/health
POST /api/v1/agents/memory-compress
POST /api/v1/agents/[agentId]/stream
Legacy routes retained as thin wrappers:
POST /api/memory-compress
POST /api/agent-stream
新增 frontend client：NexusApiClient
Memory compression adapter now uses the v1 client path without changing Zustand root state.
Updated Supabase type shim：database.types.ts
Notes:

/api/v1 JSON routes return V0 ApiSuccess / ApiFailure envelopes.
Mutation idempotency uses X-Request-Id and X-Idempotency-Key; request bodies are canonicalized, redacted, and hashed only.
Streaming route emits standard meta / token / done / error SSE shapes and does not persist token streams.
apiHandler supports V1 PermissionService injection; no route directly queries membership tables.
No V3/V4/V5/V6/V7/V9 lifecycle tables were added.
Verification passed:

npm run typecheck
npm run lint
npm run test：9 files / 77 tests passed
npm run build passed; only the existing edge-runtime static generation warning appeared.

已編輯 25 個檔案
+3,109
-19
復原
查看
src/lib/backend/primitives/errors.ts
src/lib/supabase/database.types.ts
supabase/migrations/20260527001000_api_idempotency_keys.sql

顯示另外 22 個檔案




下午2:10





完整存取權

5.5