以下是依照你提供的 NEXUS // AI OPS Blueprint 重新校正後的最終後端迭代篇章。

這不是一般 roadmap。
這是一份後端連續手術計畫。

核心前提已鎖定：

NEXUS 目前是 local-first / registry-first / schema-first / z-axis disciplined。
Zustand + IndexedDB 目前仍是完整 active workspace 的主要真相來源。
Supabase 目前是部分 durable support plane，不是完整 canonical state plane。
新後端能力必須接入既有 socket：nexus-types.ts、nexus-registry.ts、state-sync.ts、database.types.ts。
不能讓前端 store 因後端升級而無限制膨脹。
不能讓 Agent、Tool、Artifact、Sync、Observability 各自發明一套 lifecycle。
不能讓 registry、permission、audit、trace、artifact provenance 被重複包裝。
0. 後端需求端痛點總結
根據 Blueprint，後端目前最痛的不是「功能不夠」，而是後端尚未成為可信控制平面。

需求端	現在後端承受的壓力
Database	Supabase 只保存部分 records，完整 workspace graph / layout / settings / memory / tool state 仍主要在 IndexedDB。
API	/api/memory-compress、/api/agent-stream、/api/predictive-intel 等 route 尚未統一 envelope / error / idempotency / versioning。
State Sync	大量 sync 是 void ... .catch(() => undefined)，UI 不被阻塞，但 sync failure 被吞掉。
Agent Runtime	Agent 狀態仍偏 UI object，idle / thinking / streaming / error 不足以描述 task lifecycle。
Tool Execution	registry socket 已有，但 executor id、tool slot、permission、audit、tool run 尚未形成控制平面。
Artifact Storage	artifact 仍偏聊天附件 / vault cache，不是完整 asset layer。
Security	workspace/user/RLS/secret/tool risk 邊界尚未成為地基。
Observability	transactionHistory capped 100，無法串起 API → sync → task → tool → artifact。
Deployment	env、schema、registry、mock/live、RLS、migration 缺少 preflight gate。
Cost / Performance	historical messages 尚未真正 paging，active Zustand 會被長期資料拖垮。
Frontend State	前端現在承擔太多 sync、runtime、tool、error 特例。
Middleware / Adapter	Provider、Tool、Sync、Artifact、Permission adapter 還沒有穩定後端 contract。
Extension Layer	多 Agent、多 Tool、多 Workspace、多 Provider 未來會重複包裝現有 socket，除非先建立 bounded context。
1. 衝突掃描後的責任邊界定案
以下是最終邊界。後續所有版本都必須遵守。

潛在衝突	最終歸屬	禁止事項
API middleware vs Security middleware	V1 Security 定義 permission；V2 API 只接入。	V2 不重新定義 permission。
permission audit vs observability event	V1 permission_audit_logs 記安全決策；V9 system_events 記 trace/debug。	V9 不取代 audit log。
workspace snapshot vs sync queue	V3 定義 cloud state；V4 定義 mutation queue。	V4 不重建 workspace schema。
task lifecycle vs tool lifecycle	V6 管 Agent task；V7 管單次 tool run。	Tool run 不取代 task。
tool output vs artifact content	V7 保存 execution result summary；V8 才 materialize 成 artifact。	Tool 不直接變 artifact content primary source。
agent runtime events vs system events	V6 task-local events；V9 cross-system events。	V9 不存 token 級 streaming 事件。
workspace snapshot vs normalized tables	Snapshot 用於 restore/hydration；normalized entity 用於 partial query/projection。	兩者不能同時宣稱唯一 primary source。
historical paging vs runtime	V10 只移出歷史資料；不改 Agent runtime contract。	V10 不重寫 task/tool/artifact lifecycle。
frontend permission logic	後端給 decision；前端只顯示 decision。	前端不複製 permission rule。
registry validation	V5/V7 接既有 nexus-registry.ts。	不新增平行 registry。
2. 最終保留版本順序
全部版本評分皆為 95 分以上。低於 95 的版本不輸出。

順序	篇章	評分	核心目的
V0	Shared Backend Primitives	100	防止後續所有版本重複造基礎設施。
V1	Backend Security Boundary & RLS Foundation	99	先建立 user/workspace/RLS/secret 邊界。
V2	Unified API Contract v1	98	統一 envelope、error、idempotency、typed client。
V3	Canonical Cloud Workspace State	99	讓 Supabase 承接 durable workspace state。
V4	Durable Sync Queue & Conflict Resolution	99	把 fire-and-forget 變成可恢復同步隊列。
V5	Deployment Safety Gate & Runtime Health System	96	在資料/API 改動後盡早建立部署防線。
V6	Agent Runtime Sessions & Task Lifecycle	98	把 Agent execution 從 UI store 拆到 runtime layer。
V7	Tool Execution Control Plane	97	工具執行可治理、可稽核、可確認、可追蹤。
V8	Artifact Asset Layer & Provenance Graph	96	將 artifact 升級成可引用、可版本化資產。
V9	Observability Event Spine	96	建立 API→sync→task→tool→artifact trace spine。
V10	Historical Data Paging & Storage Partition	96	將歷史資料移出 active frontend state。
3. 資料表歸屬鎖定
這張表是防衝突用的。後續版本不得越權改 ownership。

Table / Resource	Owner Version	其他版本規則
workspace_memberships	V1	其他版本只讀 permission decision。
permission_audit_logs	V1	其他版本只能透過 PermissionService 間接寫。
api_idempotency_keys	V2	所有 mutation API 共用。
workspace_snapshots	V3	V4 可透過 V3 service 寫，不可直接改 schema。
workspace_state_entities	V3	僅作 projection / partial state，不存 messages/artifacts/tool runs。
sync_operations	V4	所有 local mutation 可建立 operation。
feature_flags	V5	所有高風險版本透過它灰度。
deployment_checks	V5	只記 deployment/preflight 結果。
agent_runtime_sessions	V6	只有 Agent Runtime service 寫。
agent_tasks	V6	Tool/Artifact 只能引用 task_id。
agent_runtime_events	V6	task-local runtime event，不是全系統 observability。
tool_runs	V7	Agent task 可建立；Artifact 可引用。
tool_permissions	V7	使用 V1 permission model，不重新定義 security。
artifacts	V8	Tool/Agent/Message 透過 ArtifactService 寫。
artifact_references	V8	Message/Notebook/Tool 只能透過 service 建立 reference。
system_events	V9	所有服務可 emit，但不可直接操作資料表。
usage_metrics	V9	Provider/Agent/Tool 透過 ObservabilityService 寫。
agent_memory_records	V10	Historical storage owner；V6 只引用。
messages paging fields	V10	V6 可寫 message，但不改 paging contract。
V0｜Shared Backend Primitives
評分：100 / 100

本版目標與為什麼
目標：先建立後端共用原語，讓後續 Security、API、Workspace State、Sync、Agent、Tool、Artifact、Observability 不會各自發明 ID、error、status、permission、trace、metadata、redaction、feature flag。

為什麼必須先做：
如果 V1～V10 各自定義 requestId、traceId、error code、status enum、permission check、metadata schema，後端會在還沒平台化前就先碎裂。

後端痛點
後端現在最脆弱的不是缺表，而是缺共用語言：

API error shape 可能每條 route 不同。
workspaceId / workspace_id / ws_id 可能混用。
Tool、Agent、Sync、Artifact 可能各自發明 lifecycle。
Observability 如果晚做，前面版本會沒有 trace context。
Permission 如果不是 interface，後續版本會各自重寫 check。
版本定位
從「每個功能隱含自己的基礎規格」升級成「所有後端版本共享同一組 primitive」。

本篇章只做什麼
定義共用 ID 命名規則。
定義 API envelope。
定義 error code namespace。
定義 trace context。
定義 permission interface。
定義 idempotency interface。
定義 status enum 命名原則。
定義 service / repository / adapter 分層原則。
定義 redaction 規則。
定義 metadata schema 原則。
定義 feature flag interface。
提供 no-op/minimal event emitter，讓 V9 之前也能預留 observability hook。
本篇章明確不做什麼
不建立業務資料表。
不建立 RLS policy。
不改 Zustand store。
不改 Supabase sync 行為。
不新增 Agent runtime。
不新增 Tool execution。
不新增 Artifact layer。
不新增 Observability event table。
不碰 React Flow、tldraw、z-axis、UI layout。
不處理 historical paging。
共用 ID 命名規則
邏輯名稱固定如下：

workspace_id
agent_id
task_id
tool_run_id
artifact_id
trace_id
request_id
client_mutation_id
TypeScript API surface 可以用 camelCase：

workspaceId
agentId
taskId
toolRunId
artifactId
traceId
requestId
clientMutationId
但禁止出現新的同義名稱：

// 禁止
ws_id
workspaceUid
agentUid
runId // 如果指 tool_run_id，必須叫 toolRunId
mutationId // 如果是 client mutation，必須叫 clientMutationId
ID prefix 建議：

workspace_*
agent_*
task_*
toolrun_*
artifact_*
trace_*
req_*
mutation_*
共用 API Envelope
所有 /api/v1 使用同一 response envelope：

type ApiSuccess<T> = {
  ok: true
  data: T
  error: null
  meta: {
    requestId: string
    traceId: string
    schemaVersion?: number
  }
}

type ApiFailure = {
  ok: false
  data: null
  error: {
    code: string
    message: string
    retryable: boolean
    details?: Record<string, unknown>
  }
  meta: {
    requestId: string
    traceId: string
  }
}
共用 Error Code Namespace
格式：

DOMAIN_REASON
保留 namespace：

AUTH_*
WORKSPACE_*
PERMISSION_*
VALIDATION_*
IDEMPOTENCY_*
SYNC_*
AGENT_*
PROVIDER_*
TOOL_*
ARTIFACT_*
OBSERVABILITY_*
DEPLOYMENT_*
HISTORY_*
INTERNAL_*
範例：

AUTH_REQUIRED
WORKSPACE_ACCESS_DENIED
VALIDATION_FAILED
IDEMPOTENCY_CONFLICT
SYNC_CONFLICT
AGENT_TASK_FAILED
PROVIDER_TIMEOUT
TOOL_PERMISSION_DENIED
ARTIFACT_STORAGE_FAILED
OBSERVABILITY_EVENT_WRITE_FAILED
DEPLOYMENT_REGISTRY_MISMATCH
HISTORY_CURSOR_EXPIRED
INTERNAL_ERROR
共用 Trace Context
type TraceContext = {
  requestId: string
  traceId: string
  workspaceId?: string
  userId?: string
  source:
    | "api"
    | "sync"
    | "agent"
    | "tool"
    | "artifact"
    | "security"
    | "deployment"
    | "history"
  resourceType?: string
  resourceId?: string
}
V9 完整 Observability 尚未落地前，所有版本仍必須傳遞 traceId。

共用 Permission Interface
V1 實作，其他版本只能依賴 interface：

type PermissionCheckInput = {
  workspaceId: string
  userId: string
  action: string
  resourceType: string
  resourceId?: string
}

type PermissionDecision = {
  decision: "allowed" | "denied" | "requires_confirmation"
  reasonCode?: string
  requiredScopes?: string[]
  riskLevel?: "low" | "medium" | "high"
}
共用 Idempotency 規則
所有 mutation API 必須接受：

X-Request-Id
X-Idempotency-Key
如果前端是 local-first mutation，idempotency key 必須等於或可追溯到：

client_mutation_id
共用 Status Vocabulary
不同 domain 可以有自己的 lifecycle，但只能使用共用語彙，不可亂造。

基礎狀態：

created
pending
queued
running
syncing
retrying
awaiting_confirmation
blocked
succeeded
completed
failed
cancelled
conflicted
archived
deleted
Domain-specific 狀態必須說明 owner：

Sync status：V4 owner。
Agent task status：V6 owner。
Tool run status：V7 owner。
Artifact status：V8 owner。
Deployment check status：V5 owner。
Message historical status：V10 owner。
分層原則
禁止 API route 直接碰 database。必須經過：

API Route
→ apiHandler / validateRequest
→ PermissionService
→ DomainService
→ Repository
→ Supabase Adapter
Adapter 只處理外部系統：

Supabase adapter
Provider adapter
Tool executor adapter
Artifact storage adapter
Feature flag adapter
Redaction 規則
不可入庫：

API key
Authorization header
provider token
service-role key
raw secret
.env value
private file path with user secret
raw high-risk tool input containing credentials
可入庫但需 redacted / hashed：

prompt hash
input hash
output hash
content length
model id
provider id
token usage
sanitized error message
Metadata Schema 原則
所有 metadata jsonb 至少遵守：

type BackendMetadata = {
  schemaVersion?: number
  source?: string
  registryVersion?: string
  redactionStatus?: "clean" | "redacted" | "hash_only"
  provenance?: {
    workspaceId?: string
    agentId?: string
    taskId?: string
    toolRunId?: string
    artifactId?: string
    messageId?: string
  }
}
Feature Flag 原則
V0 只定 interface，不建表：

type FeatureFlagProvider = {
  isEnabled(flagKey: string, context: {
    workspaceId?: string
    userId?: string
  }): Promise<boolean>
}
實際資料表由 V5 建立。

狀態流與錯誤流
V0 不擁有業務 lifecycle，只擁有命名規則。

錯誤流：

throw domain error
→ apiHandler normalize
→ standard envelope
→ minimal event emit
→ sanitized frontend display
安全與權限邊界
V0 不實作 permission。
V0 鎖定 permission interface。
V0 鎖定 secret 不可入 snapshot / log / idempotency payload。
V0 鎖定 error 不暴露 stack trace。
Observability Hook
建立：

emitBackendEvent(event)
V9 前可以 no-op、console、transaction logger。
V9 後接 system_events。

Failure Handling
Primitive 載入失敗：build fail。
Error code 未註冊：contract test fail。
不合規 metadata：schema test fail。
Redaction test fail：阻止 merge。
Frontend / Middleware / Extension 跟進
Layer	跟進
L1 Frontend Feature	不跟進，避免無意義 UI 膨脹。
L2 Frontend State / Client	只新增共用 API type、error type、trace type，不重構 store。
L3 Middleware / Adapter / Extension	所有 ProviderAdapter、ToolExecutorAdapter、SyncQueueAdapter 未來必須 import V0 primitive。
擴充性判斷
支撐：

多 Agent
多 Tool
多 Workspace
多 Provider
多 Model
多 Artifact Type
多 Memory Layer
多 Deployment Mode
但 V0 只留 interface，不實作完整系統。

系統負擔
DB write volume：不增加。
API latency：不增加。
frontend state size：不增加。
migration risk：無。
deployment complexity：低。
工程收益極高。
驗收標準
所有 ID 命名通過 lint/contract test。
API envelope type 可被所有 v1 route import。
Error code namespace 不重複。
TraceContext 可在 API / sync / agent / tool / artifact 中傳遞。
Permission interface 不依賴具體 table。
Redaction test 覆蓋 Authorization、API key、provider token。
FeatureFlag interface 無 DB dependency。
所有後續版本不得新增平行 primitive。
Rollback / Feature Flag
不需要 feature flag。
可直接 rollback code。
無資料破壞。
無 migration。
V1｜Backend Security Boundary & RLS Foundation
評分：99 / 100

本版目標與為什麼
目標：建立 NEXUS 的後端安全邊界，包括 user/workspace membership、RLS、permission decision、secret boundary、security audit。

為什麼必須現在做：
Blueprint 顯示目前 Supabase 已有 workspaces、messages、artifacts、prompts、notebooks、workflow_templates，但 workspace/user 隔離尚未完整。如果先擴張 workspace snapshots、tool runs、agent tasks，再補 RLS，會造成大規模重工。

後端痛點
後端現在的安全痛點是：

workspaces 只有 id/name/created_at，缺少 owner/member 邊界。
notebooks 沒有 workspace_id，未來多 workspace 會混淆。
workflow_templates 目前缺 workspace scope。
前端 authVault.globalApiKey 可用，但 secret boundary 不是後端地基。
Tool permission 還不是標準後端 gate。
Supabase RLS 尚未以 workspace membership 為核心閉環。
錯誤或 transaction log 若不規範，可能記錄 secret。
版本定位
從「功能各自避免越權」升級成「後端統一 workspace-scoped security boundary」。

本篇章只做什麼
建立 workspace_memberships。
補齊 workspace-scoped RLS policy。
新增 PermissionService。
新增 SecretBoundaryService。
新增 permission_audit_logs。
對既有 Supabase tables 補 workspace/user 隔離欄位。
讓所有後續 API 只依賴 permission decision，不重寫規則。
本篇章明確不做什麼
不定義 API response envelope；那是 V2。
不建立 sync retry queue；那是 V4。
不建立 tool run lifecycle；那是 V7。
不建立 artifact provenance；那是 V8。
不建立 system-wide observability；那是 V9。
不保存完整 workspace snapshot；那是 V3。
不改 Agent UI status。
不重構 Zustand store。
不直接處理 tldraw / Infinite Canvas。
實作順序
新增 security schema migration。
對既有 tables 補 workspace_id / created_by / owner_user_id。
建立 workspace_memberships。
建立 PermissionService interface implementation。
建立 RLS policies。
建立 SecretBoundaryService。
建立 permission_audit_logs。
補 RLS tests。
將既有 Supabase sync route/service 接入 permission check。
用 feature flag 灰度 enforcement。
資料結構升級
新增 workspace_memberships
id uuid primary key
workspace_id text not null
user_id uuid not null
role text not null -- owner/admin/editor/viewer
created_at timestamptz not null
updated_at timestamptz not null
Index：

idx_workspace_memberships_user_workspace
idx_workspace_memberships_workspace_role
Role enum：

owner
admin
editor
viewer
新增 permission_audit_logs
id uuid primary key
workspace_id text
actor_user_id uuid
action text not null
resource_type text not null
resource_id text
decision text not null -- allowed/denied/requires_confirmation
reason_code text
metadata jsonb
created_at timestamptz not null
Index：

idx_permission_audit_workspace_created
idx_permission_audit_actor_created
idx_permission_audit_resource
調整既有 tables
workspaces 新增：

owner_user_id uuid
created_by uuid
updated_at timestamptz
messages 新增：

created_by uuid
artifacts 新增：

created_by uuid
prompts 新增：

created_by uuid
notebooks 新增：

workspace_id text
created_by uuid
workflow_templates 新增：

workspace_id text
created_by uuid
Default workspace id 風險處理
目前 default workspace id 是：

workspace-nexus-ops
這在多人環境有衝突風險。

本版處理方式：

保留 workspace-nexus-ops 作為 local seed/template id。
新 authenticated user 第一次 cloud sync 時，如果 cloud workspace id 已被其他 owner 使用，必須產生新的 workspace_*。
local workspace id rewrite 必須同步更新：
agents 所屬 workspace reference
graph
prompts
notebooks
messages
artifacts
sync metadata
此 rewrite 必須 feature-flagged，不可靜默破壞既有 local state。

API / Service / Repository 升級
新增 service：

PermissionService
WorkspaceMembershipRepository
SecurityAuditRepository
SecretBoundaryService
核心方法：

PermissionService.check(input): Promise<PermissionDecision>

PermissionService.requireWorkspaceRole({
  workspaceId,
  userId,
  minRole,
  action,
  resourceType,
  resourceId
})
所有 workspace-scoped API 必須接：

auth session
→ workspace membership
→ permission decision
→ service execution
禁止 API route 直接查 membership table 後自行判斷。

狀態流與錯誤流
Permission decision 狀態：

allowed
denied
requires_confirmation
confirmed
expired
revoked
流程：

request enters
→ auth resolved
→ workspace_id resolved
→ membership loaded
→ action checked
→ decision created
→ audit written
→ service allowed or blocked
Retry：

AUTH_REQUIRED 不 retry，等使用者登入。
WORKSPACE_ACCESS_DENIED 不 retry。
PERMISSION_SERVICE_UNAVAILABLE fail closed。
audit log 寫入失敗時，高風險操作不可執行。
安全與權限邊界
Role rule：

Role	可以做
owner	所有 workspace 操作、membership、delete。
admin	管理 workspace 資產、工具設定，不可移除 owner。
editor	修改 workspace、agent、message、artifact、prompt、notebook。
viewer	只能讀，不可執行 tool，不可修改。
Secret rule：

API key 不可入 workspace_snapshots。
Authorization header 不可入 log。
provider base URL 可保存，但需標記為 config，不可含 token。
service-role key 永不可出現在 frontend 或 NEXT_PUBLIC_*。
tool input 如果包含 secret pattern，必須 redacted 或 rejected。
Observability 跟進
V1 不建 system_events。
只 emit minimal event：

source=security
workspace_id
resource_type
resource_id
action
decision
reason_code
request_id
trace_id
並寫入 permission_audit_logs。

Failure Handling
Failure	行為
permission service error	fail closed
membership missing	denied
RLS denied	回 WORKSPACE_ACCESS_DENIED
secret detected in snapshot/tool log	reject write
audit log write failed	高風險操作 blocked
old workspace lacks owner	migration repair / admin script
cross-workspace access	denied + audit
Frontend / Middleware / Extension 跟進
Layer	跟進行動
L1 Frontend Feature	顯示 permission denied state。不要做完整 permission UI。
L2 Frontend State / Client	前端不再自己判斷 role 規則，只吃後端 decision。authVault 不把 secret 塞進 workspace snapshot。
L3 Middleware / Adapter / Extension	新增 PermissionGate middleware。Tool、Artifact、Sync、Agent 後續只能接這個 gate。
擴充性升級判斷
支撐：

多 user
多 team
多 workspace
多 tool permission
多 artifact visibility
多 environment RLS smoke test
不做：

enterprise org billing
fine-grained ABAC policy engine
full approval workflow system
只保留 action/resource interface。

系統負擔判斷
面向	負擔	Mitigation
DB write volume	中，audit log 增加 write	audit 只記 decision，不記 raw payload
API latency	低～中，permission check 增加查詢	membership cache / indexed query
migration risk	中，需補 workspace_id	nullable → backfill → enforce
frontend state	不增加	前端只保存 decision projection
deployment complexity	中	V5 會補 preflight
收益大於負擔，保留。

驗收標準
RLS tests 全部通過。
不同 user 無法讀彼此 workspace。
viewer 無法寫 workspace / message / artifact / prompt / notebook。
notebook 已加入 workspace isolation。
workflow template 已加入 workspace isolation。
snapshot payload 含 secret 會被拒絕。
permission denied 有 audit record。
audit log 不含 API key。
service-role key 不出現在 frontend bundle。
default workspace id collision 有 migration/repair 策略。
所有 workspace-scoped API 可接 PermissionService。
Rollback / Feature Flag
Feature flags：

security.rls_enforced
security.permission_gate_enabled
security.secret_boundary_enforced
Rollback：

新欄位先 nullable，可保留不用。
RLS policy 可暫時切回 permissive，但 production 不建議。
Permission gate 可灰度關閉，但 audit 仍保留。
不刪除 membership/audit rows。
舊前端若沒傳 workspace id，API 回標準 error，不 crash。
V2｜Unified API Contract v1
評分：98 / 100

本版目標與為什麼
目標：建立 /api/v1 contract，統一 response envelope、error code、idempotency、request validation、typed client、stream event format。

為什麼必須做在大量 API 擴張前：
後續 V3～V10 都會新增 API。若不先統一 contract，前端 store 會被迫吸收後端混亂，每個 route 都有自己的 error shape、retry rule、validation rule。

後端痛點
/api/memory-compress 是 edge route，但不在 /api/v1。
/api/agent-stream streaming event 邊界尚未標準化。
sync、artifact、prompt、notebook API error shape 不一致。
前端無法可靠知道錯誤是 auth、RLS、validation、provider、quota、network 還是 conflict。
mutation 缺少統一 idempotency。
版本定位
從「功能型 route」升級成「版本化、typed、可測試、可回溯的 API contract layer」。

本篇章只做什麼
建立 /api/v1。
建立 apiHandler。
建立 request validation wrapper。
建立 idempotency middleware/table。
建立 error code catalog。
建立 typed API client。
建立 API contract tests。
替現有 route 建 compatibility wrapper。
本篇章明確不做什麼
不定義 permission 規則；接 V1。
不定義 workspace snapshot schema；那是 V3。
不定義 sync retry；那是 V4。
不定義 agent task lifecycle；那是 V6。
不定義 tool run lifecycle；那是 V7。
不建立 observability event table；那是 V9。
不改 frontend feature UI。
不改 Zustand store shape，除非只是接 typed client。
實作順序
新增 ApiEnvelope type。
新增 ApiErrorCode catalog。
新增 apiHandler。
新增 validateRequestBody(schema)。
新增 api_idempotency_keys。
新增 typed createNexusApiClient()。
將 /api/memory-compress 包成 /api/v1/agents/memory-compress。
將 /api/agent-stream 包成 /api/v1/agents/:agentId/stream compatibility。
加 contract tests。
前端逐步切 typed client。
資料結構升級
新增 api_idempotency_keys：

idempotency_key text not null
workspace_id text
method text not null
path text not null
request_hash text not null
response_payload jsonb
status_code int
created_at timestamptz not null
expires_at timestamptz not null
Primary / unique：

unique(workspace_id, idempotency_key)
Index：

idx_api_idempotency_workspace_key
idx_api_idempotency_expires
Redaction：

request_hash 保存 hash。
response_payload 不可保存 secret。
streaming response 不保存完整 token stream，只保存 final metadata 或 task id。
API / Service / Repository 升級
新增：

ApiContractService
IdempotencyRepository
ApiRequestValidator
NexusApiClient
標準 request flow：

read requestId / generate
read traceId / generate
validate method
validate body
auth
permission check
idempotency check
service execute
store idempotency result
return envelope
emit minimal event
優先 v1 化：

POST /api/v1/agents/memory-compress
POST /api/v1/agents/:agentId/stream
PUT  /api/v1/workspaces/:workspaceId/state
POST /api/v1/sync/operations
POST /api/v1/tools/:toolId/run
POST /api/v1/artifacts
GET  /api/v1/artifacts
GET  /api/v1/health
狀態流與錯誤流
API request states：

received
validated
authorized
idempotency_hit
executing
succeeded
failed
錯誤格式固定：

{
  "ok": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request body is invalid.",
    "retryable": false,
    "details": {}
  },
  "meta": {
    "requestId": "req_x",
    "traceId": "trace_x"
  }
}
Retry rule：

Error	retryable
AUTH_REQUIRED	false
WORKSPACE_ACCESS_DENIED	false
VALIDATION_FAILED	false
IDEMPOTENCY_CONFLICT	false
PROVIDER_TIMEOUT	true
PROVIDER_RATE_LIMITED	true
SYNC_CONFLICT	false
INTERNAL_ERROR	true, capped
安全與權限邊界
所有 workspace API 必須接 V1 PermissionService。
error details 不可暴露 stack trace。
validation error 可回傳欄位路徑，不回傳完整敏感 payload。
/api/v1/health 不暴露 env values。
idempotency table 不保存 secret。
Authorization header 不進 metadata。
Observability 跟進
V2 emit minimal API event：

source=api
route
method
status_code
latency_ms
error_code
retryable
workspace_id
request_id
trace_id
idempotency_hit
V9 之前不可新增 route-specific log table。

Failure Handling
Failure	行為
invalid JSON	VALIDATION_FAILED
validation failed	不進 service
idempotency conflict	409
duplicate idempotency key same hash	回原結果
permission denied	403 + audit
provider timeout	retryable true
unknown exception	INTERNAL_ERROR，不暴露 stack
partial batch result	回 per-item result，不用整批 ambiguous fail
Frontend / Middleware / Extension 跟進
Layer	跟進行動
L1 Frontend Feature	不跟進。不要因 API contract 增加 UI。
L2 Frontend State / Client	新增 typed API client。store 不再解析 route-specific error。local mutation 統一生成 clientMutationId。
L3 Middleware / Adapter / Extension	ProviderAdapter、SyncQueueAdapter、ToolExecutorAdapter 都用同一 envelope/error。
擴充性升級判斷
支撐：

多 API version
多 provider route
streaming route
batch sync route
future OpenAPI / schema generation
contract testing
不做：

GraphQL
full public API platform
external developer portal
系統負擔判斷
面向	負擔	Mitigation
DB write volume	低，idempotency keys	TTL cleanup
API latency	低，validation/idempotency	hash + indexed key
migration risk	低	additive table
frontend state	降低	typed client 收斂錯誤處理
deployment complexity	低～中	V5 接 health/preflight
驗收標準
所有 /api/v1 response 符合 envelope。
API contract tests 覆蓋 success/error。
idempotency key 重送回傳相同結果。
idempotency key 同 key 不同 hash 回 409。
validation error 不進 service。
requestId / traceId 出現在 response meta。
deprecated route 有 compatibility wrapper。
error 不含 secret。
streaming API 有標準 meta/token/done/error event。
typed client 可供 Zustand store 使用。
Rollback / Feature Flag
Feature flags：

api.v1_enabled
api.v1_strict_envelope
api.idempotency_enabled
Rollback：

舊 route 保留。
v1 route 可灰度。
idempotency table 可停止寫入但不刪資料。
舊前端仍可走 compatibility wrapper。
新前端若收到 legacy response，client adapter 做 normalize。
V3｜Canonical Cloud Workspace State
評分：99 / 100

本版目標與為什麼
目標：讓 Supabase 從「部分 durable records」升級成「可信 cloud workspace state plane」。

為什麼必須做：
目前完整 workspace graph、agent layout、settings、themeConfig、branch metadata、memory/tool active state 主要在 IndexedDB。只要清瀏覽器、換裝置、sync failure，完整 workspace 就不可恢復。

後端痛點
syncActiveUiState(snapshot) 目前只 upsert workspace id/name。
Supabase 不保存完整 graph/layout/settings/themeConfig。
Branch metadata 沒有 cloud durable anchor。
IndexedDB 是唯一 full-fidelity source。
未來 Agent runtime、Tool run、Artifact provenance 都需要 stable workspace_id anchor。
snapshot 若無 schema version，未來 migration 不可控。
版本定位
從「IndexedDB 是唯一完整工作區真相來源」升級成「Supabase 保存 durable canonical workspace state，IndexedDB 作為 local-first cache」。

本篇章只做什麼
建立 workspace_snapshots。
建立 workspace_state_entities projection。
建立 WorkspaceStateService。
建立 snapshot schema version。
建立 checksum conflict detection。
建立 cloud hydration。
讓 syncActiveUiState 寫完整 workspace control-plane state。
本篇章明確不做什麼
不建立 durable retry queue；那是 V4。
不改 message historical paging；那是 V10。
不改 Agent runtime lifecycle；那是 V6。
不建立 Tool run；那是 V7。
不建立 Artifact provenance；那是 V8。
不重寫 Zustand root object。
不讓 Supabase 阻塞 local interaction。
不保存 secret。
不保存 unbounded transcript。
實作順序
定義 WorkspaceCloudSnapshotPayload in nexus-types.ts。
新增 workspace_snapshots migration。
新增 workspace_state_entities migration。
建立 WorkspaceSnapshotSerializer。
建立 WorkspaceSnapshotValidator。
建立 WorkspaceStateRepository。
改 syncActiveUiState(snapshot) 寫 cloud snapshot。
建立 WorkspaceHydrationService。
加 checksum conflict detection。
灰度 cloud hydrate。
資料結構升級
新增 workspace_snapshots
id uuid primary key
workspace_id text not null
user_id uuid not null
schema_version int not null
snapshot_type text not null -- active/checkpoint/imported/recovered
payload jsonb not null
checksum text not null
payload_size_bytes int
created_at timestamptz not null
updated_at timestamptz not null
Index：

idx_workspace_snapshots_workspace_updated
idx_workspace_snapshots_user_workspace
idx_workspace_snapshots_checksum
新增 workspace_state_entities
id uuid primary key
workspace_id text not null
entity_type text not null -- agent/graph/settings/theme/memory/tool_state/branch
entity_id text not null
schema_version int not null
payload jsonb not null
checksum text
updated_at timestamptz not null
Index：

idx_workspace_state_entities_workspace_type
idx_workspace_state_entities_entity
Payload 邊界
Snapshot 可包含：

workspace id/name/settings
agent profile active fields
agent layout
graph topology
themeConfig
branchMetadata
memory/contextNotes active working set
tools active projection
active message window reference or bounded messages
Snapshot 不可包含：

API key
provider token
Authorization header
service-role key
full unbounded transcript
raw high-risk tool input/output
artifact binary content
local-only modal state
abort controller / streaming refs
API / Service / Repository 升級
新增 API：

GET /api/v1/workspaces/:workspaceId/state
PUT /api/v1/workspaces/:workspaceId/state
PUT request：

{
  "schemaVersion": 11,
  "snapshot": {},
  "baseChecksum": "sha256:old",
  "clientMutationId": "mutation_x"
}
Response：

{
  "ok": true,
  "data": {
    "workspaceId": "workspace_x",
    "checksum": "sha256:new",
    "snapshotStatus": "saved"
  },
  "error": null,
  "meta": {
    "requestId": "req_x",
    "traceId": "trace_x"
  }
}
新增 service/repository：

WorkspaceStateService
WorkspaceSnapshotRepository
WorkspaceStateEntityRepository
WorkspaceHydrationService
WorkspaceSnapshotValidator
狀態流與錯誤流
Snapshot states：

draft
validating
saving
saved
conflicted
failed
recovered
流程：

local workspace changed
→ serializer builds snapshot
→ SecretBoundaryService scans
→ validator checks schema version
→ checksum compared
→ repository saves
→ projection entities updated
→ frontend receives checksum
衝突：

baseChecksum != currentChecksum
→ return WORKSPACE_STATE_CONFLICT
→ do not overwrite
→ provide remote checksum
安全與權限邊界
PUT/GET workspace state 需要 editor/read permission。
viewer 可讀不可寫。
snapshot payload 必須過 secret scan。
RLS 限制 workspace_id。
logs 不記 payload，只記 checksum/size/schemaVersion。
imported snapshot 必須 validate registry ids：
model id 必須符合 NEXUS_MODEL_CATALOG
tool id 必須符合 TOOL_SLOT_REGISTRY
graph node type 必須符合 GRAPH_NODE_REGISTRY
Observability 跟進
Emit minimal event：

source=workspace_state
workspace_id
schema_version
payload_size_bytes
checksum
snapshot_status
latency_ms
error_code
request_id
trace_id
不建新 log table。

Failure Handling
Failure	行為
network failure	local state 保留，V4 queue 後續處理
schema mismatch	不覆蓋 cloud
checksum conflict	標記 conflicted
secret detected	reject snapshot
validation failed	reject write
Supabase failure	UI 不阻塞，但回 error 給 sync layer
hydration failed	fallback IndexedDB
payload too large	reject or require history partition
Frontend / Middleware / Extension 跟進
Layer	跟進行動
L1 Frontend Feature	不新增 UI。可在 settings/debug 顯示 cloud saved time，但非必要。
L2 Frontend State / Client	新增 snapshot serializer/hydrator。Zustand root 不重構。IndexedDB 仍 local-first。
L3 Middleware / Adapter / Extension	新增 WorkspaceStateAdapter。Sync queue 後續只能透過它寫 state，不直接碰 snapshot table。
擴充性升級判斷
支撐：

多 workspace restore
多 device hydrate
future tldraw/canvas typed state
multi-agent graph restore
schema version migration
branch checkpoint
不做：

full CRDT
real-time collaboration
unbounded canvas history
historical transcript storage
只保留 schema socket。

系統負擔判斷
面向	負擔	Mitigation
DB write volume	中，snapshot writes	debounce + checksum skip
API latency	中，大 payload	payload size cap
frontend state	不增加	serializer only
migration risk	中	additive migration
storage cost	中	checkpoint retention policy
coupling	低	service boundary
驗收標準
workspace_snapshots migration 成功。
syncActiveUiState 不再只 upsert id/name。
graph/layout/settings/themeConfig 可 cloud restore。
IndexedDB 清空後可從 cloud hydrate。
snapshot payload 不含 API key。
schema version mismatch 不覆蓋 cloud。
checksum conflict 可被偵測。
RLS 測試通過。
大 workspace snapshot 不阻塞 UI。
registry invalid id 會被拒絕。
Rollback / Feature Flag
Feature flags：

workspace.cloud_state_enabled
workspace.cloud_hydration_enabled
workspace.snapshot_projection_enabled
Rollback：

關閉 cloud hydrate，回 IndexedDB。
snapshot table 保留，不讀即可。
舊 workspace id/name upsert 保留 compatibility。
schema migration additive，不破壞舊資料。
若 snapshot schema 有問題，使用 latest valid checksum rollback。
V4｜Durable Sync Queue & Conflict Resolution
評分：99 / 100

本版目標與為什麼
目標：將目前 fire-and-forget sync 升級成 durable、可重試、可觀測、可衝突處理的 local-first sync queue。

為什麼必須做：
NEXUS 的 local-first 互動是優勢，但現在 sync failure 被 .catch(() => undefined) 吞掉。後端不知道哪些資料真的同步，前端也不知道哪些狀態只是 local 成功。

後端痛點
queueWorkspaceCloudSync 失敗不可查。
queueMessageCloudSync 失敗不可恢復。
syncHistoricalMessage / syncHistoricalArtifact 目前是 stub。
offline 後 pending mutation 沒有 durable lifecycle。
同一 mutation 重送可能 duplicate。
layout/theme/message/prompt/notebook sync 沒有一致 retry model。
版本定位
從「非阻塞但不可追蹤」升級成「非阻塞且最終一致、可恢復的 durable sync plane」。

本篇章只做什麼
建立 local mutation log。
建立 cloud sync_operations。
建立 SyncQueueService。
建立 idempotent operation apply。
建立 retry/backoff。
建立 conflict status。
建立 operation compaction。
建立 sync status projection 給 UI。
本篇章明確不做什麼
不重新定義 workspace snapshot；使用 V3。
不重新定義 API envelope；使用 V2。
不重新定義 permission；使用 V1。
不做 Agent runtime task；那是 V6。
不做 tool run；那是 V7。
不做 artifact versioning；那是 V8。
不做 historical paging；那是 V10。
不讓 sync 阻塞 UI interaction。
實作順序
定義 SyncOperation type in nexus-types.ts。
新增 IndexedDB local queue store。
新增 sync_operations table。
建立 SyncQueueService。
建立 operation compaction。
改 existing fire-and-forget ports：workspace/message/artifact/prompt/notebook。
新增 /api/v1/sync/operations。
新增 /api/v1/sync/status。
接 UI sync projection。
測試 offline/retry/idempotency/conflict。
資料結構升級
新增 sync_operations：

id text primary key -- client_mutation_id
workspace_id text not null
entity_type text not null -- workspace/agent/message/artifact/prompt/notebook/tool_run
entity_id text not null
operation_type text not null -- create/update/delete/upsert/append
payload jsonb not null
payload_hash text
base_version text
status text not null
attempt_count int not null default 0
last_error_code text
last_error_message text
next_retry_at timestamptz
created_at timestamptz not null
updated_at timestamptz not null
Index：

idx_sync_operations_workspace_status
idx_sync_operations_next_retry
idx_sync_operations_entity
Payload rule：

不存 secret。
大內容只存 reference/hash。
workspace state operation 必須交給 V3 service apply。
API / Service / Repository 升級
新增 API：

POST /api/v1/sync/operations
GET  /api/v1/sync/status?workspaceId=...
POST /api/v1/sync/operations/:operationId/retry
POST /api/v1/sync/operations/:operationId/cancel
新增：

SyncQueueService
SyncOperationRepository
SyncOperationApplier
SyncConflictResolver
LocalSyncQueueAdapter
Operation apply 必須透過 domain service：

entity_type	apply service
workspace	WorkspaceStateService
message	MessageService
artifact	ArtifactService
prompt	PromptService
notebook	NotebookService
tool_run	ToolExecutionService
禁止 SyncOperationApplier 直接寫各 domain table。

狀態流與錯誤流
Sync statuses：

pending
queued
syncing
synced
retrying
failed
conflicted
cancelled
compacted
流程：

local mutation
→ create clientMutationId
→ write local state
→ persist local queue
→ flush
→ API apply
→ per-operation result
→ update status
Retry：

network failure：retry with backoff。
provider failure：按 domain retry rule。
validation failure：不 retry。
permission failure：不 retry。
conflict：人工/merge input。
duplicate idempotency：回原結果。
安全與權限邊界
每個 operation apply 前檢查 workspace permission。
delete operation 需要 editor/admin。
viewer 不可建立 mutation。
payload schema validate。
不允許跨 workspace entity id。
failed error message 必須 sanitized。
local queue 不保存 API key。
Observability 跟進
Emit minimal event：

source=sync
operation_id
workspace_id
entity_type
entity_id
operation_type
sync_status
attempt_count
retry_count
latency_ms
error_code
request_id
trace_id
不建新 log table。

Failure Handling
Failure	行為
offline	queue 保留 IndexedDB
tab close	下次啟動繼續
auth expired	block queue until login
validation failed	operation failed，不阻塞其他
max retry	failed，可 manual retry
conflict	conflicted，不自動覆蓋
duplicate mutation	idempotent return
partial batch failure	per-item status
Frontend / Middleware / Extension 跟進
Layer	跟進行動
L1 Frontend Feature	顯示 sync status badge、failed count、manual retry。避免大型 sync dashboard。
L2 Frontend State / Client	新增 local queue projection。store action 生成 clientMutationId。不要重構整個 Zustand。
L3 Middleware / Adapter / Extension	新增 SyncQueueAdapter。所有 cloud sync ports 不再直接 fire-and-forget 到 Supabase。
擴充性升級判斷
支撐：

多 workspace sync
offline recovery
prompt/notebook/message/artifact sync
future tldraw mutation sync
future collaborative merge socket
不做：

full CRDT
live multiplayer
operational transform
background worker cluster
系統負擔判斷
面向	負擔	Mitigation
DB write volume	中，operation records	compaction + retention
frontend state size	低～中	projection only，queue 存 IndexedDB
API latency	batch apply 有增加	per-item result + batching
migration risk	低	additive table
event volume	中	V9 前 minimal emit
cost	低	no model calls
驗收標準
斷線新增 message，重連後同步。
重整頁面 pending queue 不消失。
同一 operation 重送不 duplicate。
layout 拖曳 50 次，只同步 final compacted state。
sync failure 可查 status。
conflict 不靜默覆蓋。
prompt/notebook/artifact/message 均走 queue。
payload 不含 secret。
retry exhausted 後可 manual retry。
API contract tests 通過。
Rollback / Feature Flag
Feature flags：

sync.queue_enabled
sync.operation_compaction_enabled
sync.manual_retry_enabled
Rollback：

關閉 queue 後可回 legacy fire-and-forget。
已建立 operations 保留，之後可 replay。
不刪 local queue。
舊前端不懂 sync status 時不 crash。
domain writes 仍透過 existing sync manager fallback。
V5｜Deployment Safety Gate & Runtime Health System
評分：96 / 100

本版目標與為什麼
目標：建立 deployment preflight、schema drift check、registry consistency check、env validator、health endpoint、feature flag rollout。

為什麼此時做：
V1～V4 已開始動 RLS、API、workspace state、sync queue。若不建立 deployment gate，錯誤會在 production 才爆出，尤其 Supabase migration、database.types.ts、registry mismatch、Vercel env、mock/live mode。

後端痛點
database.types.ts 需人工同步 migration。
TOOL_SLOT_REGISTRY 與 runtime executor map 有已知 mismatch。
mock-review-mesh vs mock.review-mesh 需要 deliberate cleanup，不可 incidental。
real-video-gen slot 與 mock-video-gen runtime fallback 需要明確聲明。
Vercel env 缺失會讓 Supabase client build 後才壞。
RLS policy 若錯，production 才發現。
mock/live/mixed mode 缺 preflight gate。
版本定位
從「靠開發紀律部署」升級成「部署前自動驗證、上線後可健康檢查、失敗可灰度 rollback」。

本篇章只做什麼
建立 deployment checks。
建立 feature flags table。
建立 /api/v1/health。
建立 schema drift checker。
建立 registry consistency checker。
建立 environment validator。
建立 migration dry run CI。
建立 RLS smoke test。
建立 mock/live mode preflight。
本篇章明確不做什麼
不新增業務功能。
不定義 tool execution；V7 做。
不修所有 registry mismatch；只檢查與允許明確 alias/fallback。
不暴露 secret value。
不建立 full admin console。
不替代 observability；V9 做完整 event spine。
不改 frontend store。
實作順序
建立 feature_flags table。
建立 deployment_checks table。
新增 FeatureFlagService。
新增 EnvironmentValidator。
新增 SchemaDriftChecker。
新增 RegistryConsistencyChecker。
新增 /api/v1/health。
CI 加 migration dry run。
CI 加 generated types drift check。
staging rollout before production。
資料結構升級
新增 feature_flags
id uuid primary key
flag_key text not null
workspace_id text
enabled boolean not null
rollout_percentage int not null default 0
metadata jsonb
created_at timestamptz not null
updated_at timestamptz not null
Index：

idx_feature_flags_key_workspace
新增 deployment_checks
id uuid primary key
release_version text
environment text -- local/staging/production
check_type text not null
status text not null -- pending/running/passed/warning/failed/blocked
details jsonb
created_at timestamptz not null
Index：

idx_deployment_checks_release_created
idx_deployment_checks_status
API / Service / Repository 升級
新增 API：

GET /api/v1/health
GET /api/v1/deployment/checks/latest
GET /api/v1/feature-flags?workspaceId=...
POST /api/v1/feature-flags/:flagKey/toggle
新增 services：

DeploymentCheckService
RegistryConsistencyChecker
SchemaDriftChecker
EnvironmentValidator
FeatureFlagService
RuntimeHealthService
Health checks：

database
rls
registry
supabase_env
provider_config
storage
feature_flags
migration_version
狀態流與錯誤流
Deployment check states：

pending
running
passed
warning
failed
blocked
流程：

CI starts
→ typecheck
→ migration dry run
→ database.types drift check
→ registry consistency check
→ env presence check
→ RLS smoke test
→ health endpoint smoke test
→ deploy or block
Registry mismatch rule：

known alias must be explicit。
declared fallback allowed。
unknown mismatch blocks deploy。
安全與權限邊界
/api/v1/health 不回 env value。
只回 env variable present/missing。
deployment checks admin only。
feature flag toggle admin only。
feature flag changes 寫 permission audit。
RLS smoke test 使用最小權限 test user。
service-role key 不進 frontend 或 health response。
Observability 跟進
Emit minimal event：

source=deployment
check_type
check_status
release_version
environment
latency_ms
error_code
request_id
trace_id
V9 後寫入 system_events。

Failure Handling
Failure	行為
registry mismatch	block deploy
migration dry run failed	block deploy
env missing	block live mode
provider unavailable	warning / mock fallback
RLS smoke failed	block deploy
health warning	allow staging, block production full rollout
feature flag toggle failed	rollback flag
schema drift detected	critical
Frontend / Middleware / Extension 跟進
Layer	跟進行動
L1 Frontend Feature	可加 admin-only health warning banner。一般使用者不顯示。
L2 Frontend State / Client	只接 feature flag projection，不把所有 health checks 放進 store。
L3 Middleware / Adapter / Extension	RegistryValidator、FeatureFlagAdapter、Mock/Live mode adapter 接入。
擴充性升級判斷
支撐：

staging / production
mock / live / mixed mode
future provider expansion
future tool registry expansion
Supabase migration safety
Vercel env validation
不做：

full release management platform
enterprise deployment approval workflow
系統負擔判斷
面向	負擔	Mitigation
DB write volume	低	only deployment events
API latency	health endpoint 有多 check	cache short TTL
deployment complexity	中	但降低 production 爆炸風險
frontend state	極低	projection only
migration risk	低	additive
驗收標準
NEXT_PUBLIC_SUPABASE_URL 缺失會被檢出。
NEXT_PUBLIC_SUPABASE_ANON_KEY 缺失會被檢出。
health response 不含 secret value。
migration dry run 失敗會 block deploy。
database.types.ts drift 會被檢出。
registry unknown mismatch 會 block deploy。
mock-review-mesh alias 必須明確聲明，不可隱性通過。
real-video-gen → mock-video-gen fallback 必須明確聲明。
RLS smoke test 通過。
feature flag 可灰度開啟 V3/V4/V6/V7/V8/V9/V10。
Rollback / Feature Flag
Feature flags：

deployment.gate_enforced
deployment.registry_check_enforced
deployment.rls_smoke_enforced
Rollback：

Gate 可先 warning-only。
health endpoint 可保留。
feature flags table 不破壞業務資料。
registry check 可從 blocking 降為 warning，但 production 建議 blocking。
migration check 不應關閉。
V6｜Agent Runtime Sessions & Task Lifecycle
評分：98 / 100

本版目標與為什麼
目標：把 Agent execution 從 UI store 裡的 transient 狀態升級成後端 runtime session、task lifecycle、provider adapter、resumable execution record。

為什麼必須做：
Blueprint 顯示 Agent status 目前只有 idle / thinking / streaming / error。這不足以支撐多 Agent、tool chain、handoff、branch compression、provider fallback、long-running task。

後端痛點
streaming controller 是 transient ref，重整後不可恢復。
agent.status 只是 UI status，不是 execution lifecycle。
branch compression 是 async job，但沒有後端 task record。
provider/model call 沒有 execution record。
multi-agent handoff socket 已保留，但 runtime 尚未後端化。
memory/context/tools/artifacts 混在 Agent active object。
版本定位
從「Agent 是 UI workbench object」升級成「Agent 有後端 runtime session 與 task lifecycle」。

本篇章只做什麼
建立 agent_runtime_sessions。
建立 agent_tasks。
建立 agent_runtime_events。
建立 AgentRuntimeService。
建立 ProviderAdapter interface。
將 /api/agent-stream 收斂到 task API。
讓 branch compression 建立 task。
讓 frontend 使用 task projection，而非單一 thinking/streaming/error。
本篇章明確不做什麼
不定義 tool permission；V7 接 V1/V7。
不建立 tool run table；V7。
不建立 artifact layer；V8。
不建立 full observability dashboard；V9。
不重寫 message historical paging；V10。
不重建 model catalog；使用 NEXUS_MODEL_CATALOG。
不把 provider API key 寫進 task metadata。
不移除現有 agent.status，先做 projection compatibility。
實作順序
定義 Agent task schema in nexus-types.ts。
新增 runtime tables。
建立 AgentRuntimeService。
建立 ProviderAdapter。
包裝現有 /api/agent-stream。
新增 task create/get/cancel API。
branch compression 接 task。
前端接 task projection。
加 streaming interruption tests。
加 provider fallback tests。
資料結構升級
新增 agent_runtime_sessions
id uuid primary key
workspace_id text not null
agent_id text not null
user_id uuid not null
provider text
model text
status text not null
started_at timestamptz
ended_at timestamptz
metadata jsonb
Index：

idx_sessions_workspace_agent
idx_sessions_status
新增 agent_tasks
id uuid primary key
session_id uuid
workspace_id text not null
agent_id text not null
task_type text not null -- chat/memory_compress/tool_chain/handoff/artifact_generate/branch
status text not null
input_message_id text
output_message_id text
parent_task_id uuid
attempt_count int not null default 0
error_code text
metadata jsonb
created_at timestamptz not null
updated_at timestamptz not null
Index：

idx_agent_tasks_workspace_agent_status
idx_agent_tasks_session
idx_agent_tasks_parent
新增 agent_runtime_events
id uuid primary key
task_id uuid not null
event_type text not null
payload jsonb
created_at timestamptz not null
Index：

idx_runtime_events_task_created
Event payload rule：

token 級 event 不長期全量保存。
可以保存 milestone event：
started
provider_selected
first_token
tool_requested
fallback_used
completed
failed
cancelled
API / Service / Repository 升級
新增 API：

POST /api/v1/agents/:agentId/tasks
GET  /api/v1/agents/:agentId/tasks/:taskId
POST /api/v1/agents/:agentId/tasks/:taskId/cancel
GET  /api/v1/agents/:agentId/tasks?workspaceId=...
Streaming event format：

{ "type": "meta", "taskId": "task_x", "traceId": "trace_x" }
{ "type": "token", "delta": "..." }
{ "type": "done", "messageId": "msg_x", "usage": {} }
{ "type": "error", "error": { "code": "PROVIDER_TIMEOUT", "retryable": true } }
新增：

AgentRuntimeService
AgentTaskRepository
AgentRuntimeEventRepository
ProviderAdapter
RuntimeEventEmitter
狀態流與錯誤流
Task statuses：

created
queued
running
streaming
waiting_for_tool
waiting_for_confirmation
completed
failed
cancelled
retrying
fallback_used
流程：

user message saved
→ task created
→ permission + budget check
→ runtime session created
→ provider adapter selected
→ streaming starts
→ token events sent to frontend
→ optional tool requested
→ final message saved
→ task completed
哪些狀態可 retry：

Status	retry
failed provider timeout	yes
failed validation	no
cancelled	manual only
waiting_for_confirmation	no auto retry
fallback_used	already handled
安全與權限邊界
建立 task 需要 workspace editor。
viewer 不可 create task。
cancel task 需要同 workspace permission。
provider API key 不進 metadata。
context truncation 不保存 raw secret。
task input size cap。
memory/context 引用需 workspace scoped。
error 不暴露 provider raw stack。
Observability 跟進
Emit minimal event：

source=agent
task_id
session_id
workspace_id
agent_id
provider
model
task_status
latency_ms
first_token_latency_ms
input_tokens
output_tokens
error_code
request_id
trace_id
V9 後寫 usage metrics。

Failure Handling
Failure	行為
provider timeout	retrying or failed
provider rate limited	retryable
no API key	mock mode fallback + fallback_used
stream aborted	task cancelled，message interrupted
runtime crash	task 保留最後 event
context too large	truncate/compress + event
branch compression failed	fallback mock compressor
permission denied	task not created
Frontend / Middleware / Extension 跟進
Layer	跟進行動
L1 Frontend Feature	顯示 task status badge、stop stream、retry failed task。不要做 full job dashboard。
L2 Frontend State / Client	agent.status 先保留，但由 backend task projection 派生。不要重構整個 Agent store。
L3 Middleware / Adapter / Extension	新增 ProviderAdapter。不可建立平行 model map，必須用 NEXUS_MODEL_CATALOG。
擴充性升級判斷
支撐：

多 Agent 並行
provider fallback
branch compression task
multi-agent handoff
future tool chain
future resumable task
不做：

distributed worker fleet
full workflow orchestrator
autonomous handoff engine 完整實作
系統負擔判斷
面向	負擔	Mitigation
DB write volume	中，task/session/events	event retention, no token full log
API latency	低	async runtime
frontend state	降低	projection only
cost	可觀測後可控	usage hook
coupling	中	ProviderAdapter boundary
驗收標準
每次 agent send 都建立 task。
streaming 中斷後 task 狀態為 cancelled/interrupted。
provider fallback 有 runtime event。
branch compression 建立 task。
task 可查歷史狀態。
task metadata 不含 API key。
multi-agent 同時 streaming 不互相污染。
重整後可知道上一 task 狀態。
agent.status 與 task projection 不衝突。
provider/model 必須來自 registry。
Rollback / Feature Flag
Feature flags：

agent.runtime_tasks_enabled
agent.streaming_v1_enabled
agent.branch_task_enabled
Rollback：

關閉 task runtime 後回 legacy /api/agent-stream。
已建立 task rows 保留。
前端 fallback 使用現有 agent.status。
不刪 runtime events。
streaming route 保留 compatibility。
V7｜Tool Execution Control Plane
評分：97 / 100

本版目標與為什麼
目標：建立 tool execution control plane，讓每次工具執行都有 registry validation、permission gate、input/output schema、risk level、confirmation、tool_run、audit、artifact binding。

為什麼必須做：
Blueprint 顯示 NEXUS 已有 TOOL_SLOT_REGISTRY 與 TOOL_EXECUTOR_REGISTRY，但 runtime executor id 存在 mismatch，且 tool result 目前偏 Agent tool state/message，不是 durable execution record。

後端痛點
mock-review-mesh vs mock.review-mesh 命名不一致。
real-video-gen slot 存在，但 runtime fallback 是 mock-video-gen。
tool result 沒有標準 durable tool run。
高風險工具如 local-fs、db-query、external write 缺 confirmation。
input/output schema 不統一。
tool execution 無法由 task trace 回查。
tool output 與 artifact content 容易重複保存。
版本定位
從「工具可以被呼叫」升級成「工具可治理、可稽核、可確認、可追蹤、可資產化」。

本篇章只做什麼
建立 tool_runs。
建立 tool_permissions。
建立 ToolExecutionService。
建立 ToolRegistryValidator。
建立 ToolPermissionGate。
建立 input/output schema validation。
建立 high-risk confirmation flow。
建立 tool result → artifact materialization hook。
本篇章明確不做什麼
不重新定義 permission model；使用 V1。
不重新定義 task lifecycle；引用 V6 task_id。
不建立 artifact search/versioning；V8。
不建立 full observability；V9。
不把每個 tool result 都變 artifact。
不保存 raw secret input。
不新增平行 tool registry。
不讓前端直接執行 high-risk tool。
實作順序
在 nexus-registry.ts 補 explicit alias/fallback metadata。
新增 ToolExecutor interface。
新增 tool_runs table。
新增 tool_permissions table。
建立 ToolRegistryValidator。
建立 ToolExecutionService。
建立 confirmation API。
接 Agent task waiting_for_tool。
接 artifact materialization hook。
CI 加 registry mismatch test。
資料結構升級
新增 tool_runs
id uuid primary key
workspace_id text not null
agent_id text
task_id uuid
tool_id text not null
executor_id text
status text not null
risk_level text not null -- low/medium/high
input_hash text
input_redacted jsonb
output_redacted jsonb
output_hash text
artifact_id uuid
error_code text
error_message text
cost_estimate numeric
confirmation_expires_at timestamptz
confirmed_by uuid
confirmed_at timestamptz
started_at timestamptz
ended_at timestamptz
created_by uuid
created_at timestamptz not null
Index：

idx_tool_runs_workspace_agent
idx_tool_runs_task
idx_tool_runs_status
idx_tool_runs_tool
新增 tool_permissions
id uuid primary key
workspace_id text not null
tool_id text not null
scope text not null
enabled boolean not null
requires_confirmation boolean not null
created_at timestamptz not null
updated_at timestamptz not null
Index：

idx_tool_permissions_workspace_tool
API / Service / Repository 升級
新增 API：

POST /api/v1/tools/:toolId/run
POST /api/v1/tool-runs/:toolRunId/confirm
POST /api/v1/tool-runs/:toolRunId/cancel
GET  /api/v1/tool-runs?workspaceId=...&agentId=...&cursor=...
GET  /api/v1/tool-runs/:toolRunId
新增：

ToolExecutionService
ToolRunRepository
ToolPermissionRepository
ToolRegistryValidator
ToolPermissionGate
ToolResultMaterializer
ToolExecutorAdapter
Executor interface：

type ToolExecutor<I, O> = {
  id: string
  inputSchema: JsonSchema
  outputSchema: JsonSchema
  riskLevel: "low" | "medium" | "high"
  execute(input: I, context: ToolExecutionContext): Promise<O>
}
狀態流與錯誤流
Tool run statuses：

created
blocked
awaiting_confirmation
running
succeeded
failed
cancelled
materialized
流程：

Agent task requests tool
→ registry validates tool_id/executor_id
→ input schema validates
→ permission gate
→ risk check
→ awaiting_confirmation if high-risk
→ execute
→ output schema validates
→ output redacted/hash stored
→ optional artifact materialization
→ task resumes
Retry：

schema invalid：不可 retry。
executor missing：blocked。
timeout：可 retry。
permission denied：不可 retry。
output invalid：failed，可人工修 executor。
artifact materialization failed：tool succeeded，artifact failed separately。
安全與權限邊界
viewer 不可 execute tool。
high-risk tool 必須 confirmation。
local-fs、db-query、external write 預設 high-risk。
executor 不直接讀 global API key，必須經 secure provider boundary。
input 存 input_redacted + input_hash。
output 大內容交給 ArtifactService，不重複存 full content。
disabled tool 不可執行。
tool permission per workspace。
Observability 跟進
Emit minimal event：

source=tool
tool_run_id
workspace_id
agent_id
task_id
tool_id
executor_id
tool_run_status
risk_level
latency_ms
confirmation_wait_ms
error_code
cost_estimate
request_id
trace_id
Failure Handling
Failure	行為
registry mismatch	blocked
executor missing	blocked
input invalid	failed，不 retry
permission denied	blocked + audit
confirmation expired	blocked
timeout	retryable
output invalid	failed，保存 output hash only
artifact save failed	tool succeeded，materialization failed event
cancellation	cancelled
Frontend / Middleware / Extension 跟進
Layer	跟進行動
L1 Frontend Feature	high-risk confirmation modal、tool status badge、retry/cancel button。
L2 Frontend State / Client	frontend 不直接執行工具，只保存 toolRun projection。
L3 Middleware / Adapter / Extension	ToolExecutorAdapter、RegistryValidator、ToolPermissionGate 接入。不可重建 registry。
擴充性升級判斷
支撐：

多 tool
多 executor
mock/live executor
local-fs/web/db/media generation
tool-node future
artifact materialization
per-workspace tool policy
不做：

marketplace
plugin sandbox isolation 完整系統
long-running worker pool
系統負擔判斷
面向	負擔	Mitigation
DB write volume	中，每次 tool run	retention + pagination
API latency	high-risk confirmation 增加等待	explicit UX
frontend state	低	projection only
cost	可增加	cost_estimate
security overhead	中	必要且高收益
驗收標準
每次 tool call 都有 tool_runs row。
mock-review-mesh mismatch 被 explicit alias 處理。
unknown registry mismatch block deploy。
high-risk tool 必須 confirmation。
viewer 無法 execute tool。
input/output schema validation 有效。
tool run 可由 task_id 查回。
tool result 可選擇 materialize artifact。
audit log 不含 secret。
disabled tool 不可執行。
mock/live executor 走同一 contract。
Rollback / Feature Flag
Feature flags：

tools.control_plane_enabled
tools.high_risk_confirmation_enabled
tools.registry_validator_blocking
Rollback：

關閉 control plane 後可回 legacy runTool。
high-risk tool 不應 fallback 到 unsafe direct execution。
已建立 tool_runs 保留。
registry validator 可從 blocking 降到 warning，但 production 不建議。
artifact materialization hook 可獨立關閉。
V8｜Artifact Asset Layer & Provenance Graph
評分：96 / 100

本版目標與為什麼
目標：將 artifact 從聊天附件 / vault cache 升級成可保存、可引用、可搜尋、可版本化、可追溯來源的資產層。

為什麼必須做：
Blueprint 顯示 artifact 目前只保存 workspace_id / source_message_id / content_url / type。這不足以支撐 sandbox output、media generation、tool result、notebook references、long-term AI knowledge assets。

後端痛點
artifactVault local cache capped to 80，不是完整 durable index。
artifact 缺 title、metadata、source agent/task/tool run、hash、version。
tool output、message output、sandbox output 無統一 asset model。
transcript 刪除可能影響 artifact 可追溯性。
artifact 搜尋與引用不足。
artifact 與 notebook/macro/message/tool 的 relation 不完整。
版本定位
從「artifact 是輸出附件」升級成「artifact 是 workspace-scoped durable asset node」。

本篇章只做什麼
擴充 artifacts schema。
建立 artifact_references。
建立 ArtifactService。
建立 provenance graph。
建立 versioning。
建立 searchable metadata。
建立 artifact reference API。
建立 tool/message/sandbox output materialization。
本篇章明確不做什麼
不執行 tool；V7。
不定義 Agent task；V6。
不重寫 historical paging；V10。
不建立 full observability；V9。
不把 message content 與 artifact content 重複保存。
不把所有 tool result 強制 materialize。
不保存 secret content。
不改 React Flow / tldraw schema。
實作順序
擴充 artifacts table。
新增 artifact_references。
定義 ArtifactRecord in nexus-types.ts。
建立 ArtifactService。
建立 ArtifactRepository。
建立 ArtifactReferenceResolver。
建立 tool result materializer。
改 saveArtifactToCloud 走 v1 API。
建立 search/index。
前端 artifactVault 改為 projection cache。
資料結構升級
調整 artifacts
新增/補齊：

title text
content_text text
content_hash text
source_agent_id text
source_task_id uuid
source_tool_run_id uuid
metadata jsonb
version int not null default 1
parent_artifact_id uuid
status text not null default 'saved'
created_by uuid
updated_at timestamptz
保留：

id
workspace_id
source_message_id
content_url
type
created_at
Index：

idx_artifacts_workspace_type_created
idx_artifacts_source_message
idx_artifacts_source_task
idx_artifacts_source_tool_run
idx_artifacts_parent
Full-text index：

title
content_text
metadata
新增 artifact_references
id uuid primary key
workspace_id text not null
artifact_id uuid not null
referenced_by_type text not null -- message/notebook/prompt/macro/agent_memory/tool_run
referenced_by_id text not null
created_at timestamptz not null
Index：

idx_artifact_references_artifact
idx_artifact_references_referrer
API / Service / Repository 升級
新增 API：

POST /api/v1/artifacts
GET  /api/v1/artifacts?workspaceId=...&type=...&q=...&cursor=...
GET  /api/v1/artifacts/:artifactId
POST /api/v1/artifacts/:artifactId/references
POST /api/v1/artifacts/:artifactId/versions
POST /api/v1/artifacts/:artifactId/archive
新增：

ArtifactService
ArtifactRepository
ArtifactSearchIndexService
ArtifactReferenceResolver
ArtifactMaterializer
Artifact create request：

{
  "workspaceId": "workspace_x",
  "title": "Generated UI Prototype",
  "type": "code",
  "content": {
    "url": null,
    "text": "<html>...</html>"
  },
  "source": {
    "messageId": "msg_x",
    "agentId": "agent_x",
    "taskId": "task_x",
    "toolRunId": "toolrun_x"
  },
  "metadata": {}
}
狀態流與錯誤流
Artifact statuses：

draft
saving
saved
indexed
failed
archived
deleted
流程：

message/tool/sandbox output
→ ArtifactService validate
→ secret scan
→ compute hash
→ save content/ref
→ save provenance
→ create references
→ index searchable fields
→ return artifact_id
Retry：

storage failed：retryable。
validation failed：not retryable。
indexing failed：artifact saved，可 retry index。
source missing：保存但標記 source_unresolved。
duplicate hash：可建立新 reference，不重複內容。
安全與權限邊界
artifact 必須 workspace scoped。
viewer 可讀不可寫。
editor 可 create/update/archive。
private artifact 不可跨 workspace reference。
content_text 過 secret scan。
metadata 不存 API key。
source_task/tool_run 必須同 workspace。
delete/archive 需要 editor/admin。
Observability 跟進
Emit minimal event：

source=artifact
artifact_id
workspace_id
artifact_type
artifact_status
source_task_id
source_tool_run_id
content_hash
content_size
index_status
latency_ms
error_code
request_id
trace_id
Failure Handling
Failure	行為
storage failed	不進 saved
indexing failed	saved but not indexed
source missing	saved + source_unresolved
duplicate hash	reuse content / create reference
large content	reject or external storage
secret detected	reject
reference invalid	artifact saved，reference failed event
Frontend / Middleware / Extension 跟進
Layer	跟進行動
L1 Frontend Feature	artifact reference UI、artifact card、source link。不要做完整 DAM 系統。
L2 Frontend State / Client	artifactVault 改成 by-id projection cache，不保存大量 content。
L3 Middleware / Adapter / Extension	ArtifactMaterializer、ArtifactReferenceResolver。Tool 不直接寫 artifact table。
擴充性升級判斷
支撐：

多 artifact type
sandbox/code/media/url
tool output asset
notebook reference
future tldraw/canvas artifact
provenance graph
artifact versioning
不做：

vector search
CDN asset pipeline 完整系統
enterprise retention/legal hold
系統負擔判斷
面向	負擔	Mitigation
DB write volume	中	materialize only important outputs
storage cost	中	hash dedup + external storage
API latency	中，indexing	async index
frontend state	降低	by-id cache
migration risk	中	additive columns
驗收標準
sandbox save 產生完整 artifact row。
tool result 可 materialize 成 artifact。
artifact 可由 message/task/tool_run 查回。
artifact 支援 cursor pagination。
artifact search 可查 title/content metadata。
artifact version 遞增正確。
artifact 不含 secret。
workspace 隔離測試通過。
artifactVault 可從 API hydrate。
transcript 刪除不會自動刪 artifact，除非明確 cascade policy。
Rollback / Feature Flag
Feature flags：

artifacts.asset_layer_enabled
artifacts.search_index_enabled
artifacts.versioning_enabled
Rollback：

關閉 asset layer 後可回 legacy content_url/type。
新欄位保留 nullable。
reference table 不影響舊 artifact fetch。
search index 可獨立關閉。
materialization hook 可關閉，不影響 tool success。
V9｜Observability Event Spine
評分：96 / 100

本版目標與為什麼
目標：建立全鏈路 observability event spine，讓 API、sync、workspace state、agent task、tool run、artifact、provider、deployment 可以透過 trace 串起。

為什麼現在做完整化：
V0 已要求 trace context 提前存在。等 V6/V7/V8 resource id 穩定後，V9 才能建立不重複、不侵入業務表的 event spine。

後端痛點
transactionHistory capped 100，偏 UI 層。
sync failure 以前會被吞掉。
tool run 沒有全鏈路 debug。
provider latency/token/cost 沒有集中統計。
message → task → tool → artifact 無 trace。
deployment health 無歷史查詢。
若每個版本自己建 log table，會爆量且重複。
版本定位
從「局部 telemetry」升級成「全系統 traceable observability spine」。

本篇章只做什麼
建立 system_events。
建立 usage_metrics。
實作 ObservabilityService。
將 V0 minimal emitter 接到 persistent event spine。
提供 trace query API。
提供 cost/token/latency metrics。
建立 event taxonomy。
建立 redaction/retention/rate limit。
本篇章明確不做什麼
不取代 permission_audit_logs。
不取代 agent_tasks。
不取代 tool_runs。
不取代 sync_operations。
不保存 token 級完整 stream。
不保存 raw prompt / raw secret。
不建立 business table 大雜燴。
不把 observability 寫入變成 request critical path，除高風險 security audit 外。
實作順序
定義 event taxonomy。
新增 system_events。
新增 usage_metrics。
建立 ObservabilityService。
將 V0 emitter 接入。
接 API middleware。
接 SyncQueueService。
接 AgentRuntimeService。
接 ToolExecutionService。
接 ArtifactService。
建 trace query API。
加 redaction/rate limit/retention。
資料結構升級
新增 system_events
id uuid primary key
trace_id text not null
request_id text
workspace_id text
user_id uuid
event_type text not null
severity text not null -- debug/info/warn/error/critical
source text not null -- api/sync/agent/tool/artifact/database/provider/security/deployment/history
resource_type text
resource_id text
message text
metadata jsonb
created_at timestamptz not null
Index：

idx_system_events_trace
idx_system_events_workspace_created
idx_system_events_source_severity
idx_system_events_resource
新增 usage_metrics
id uuid primary key
workspace_id text
agent_id text
task_id uuid
tool_run_id uuid
provider text
model text
input_tokens int
output_tokens int
cost_estimate numeric
latency_ms int
created_at timestamptz not null
Index：

idx_usage_metrics_workspace_created
idx_usage_metrics_task
idx_usage_metrics_provider_model
API / Service / Repository 升級
新增 API：

GET /api/v1/observability/events?workspaceId=...&traceId=...&severity=...
GET /api/v1/observability/traces/:traceId
GET /api/v1/observability/metrics?workspaceId=...
新增：

ObservabilityService
SystemEventRepository
UsageMetricsRepository
TraceContextMiddleware
RedactionPipeline
EventRetentionWorker
狀態流與錯誤流
Event severity：

debug
info
warn
error
critical
Event flow：

API entry creates trace
→ permission event
→ service event
→ DB/provider/tool/artifact event
→ result event
→ error event if failed
→ usage metric if provider/model involved
不可把所有 token delta 寫入 system_events。
token stream 只記 milestone：

stream_started
first_token
stream_completed
stream_failed
安全與權限邊界
observability API 需要 workspace admin/editor。
security events 只有 admin/owner 可看完整。
user id 可 hash display。
raw prompt 預設不入 log。
raw content 預設不入 log。
secret 永不入 log。
metadata size cap。
critical security audit 寫入失敗時，高風險操作不可執行。
Observability 跟進
本版即完整 observability 地基，覆蓋：

API latency
sync status
workspace state conflict
agent task status
provider latency/tokens/cost
tool run status
artifact save/index
security deny
deployment health
history paging performance
Failure Handling
Failure	行為
event write failed	不阻塞一般 request
usage metric failed	async retry
metadata too large	truncate
redaction failed	drop event / critical
event ingestion spike	rate limit
security critical audit failed	block high-risk operation
trace not found	TRACE_NOT_FOUND
Frontend / Middleware / Extension 跟進
Layer	跟進行動
L1 Frontend Feature	admin/debug trace viewer、health warning banner。一般操作 UI 不膨脹。
L2 Frontend State / Client	transactionHistory 可改讀 recent system events projection，不保存 raw payload。
L3 Middleware / Adapter / Extension	TraceContext middleware 接所有 ProviderAdapter、ToolExecutorAdapter、SyncQueueAdapter。
擴充性升級判斷
支撐：

多 provider cost
多 model usage
multi-agent trace
multi-tool chain trace
artifact provenance debug
deployment diagnosis
不做：

full APM replacement
real-time analytics warehouse
business intelligence system
系統負擔判斷
面向	負擔	Mitigation
DB write volume	中～高	sampling, retention, severity filter
API latency	低	async emit
storage cost	中	retention policy
frontend state	低	query on demand
coupling	低	ObservabilityService boundary
驗收標準
每個 /api/v1 request 有 requestId/traceId。
sync operation 可查 trace。
agent task 可查 provider latency/token。
tool run 可查 permission/schema/execution event。
artifact save/index failure 可查。
error 不含 secret。
每日 token/cost 可聚合。
critical event 可篩選。
trace query 可還原 API → task → tool → artifact。
event 寫入失敗不拖垮一般 API。
permission audit 沒被 system_events 取代。
Rollback / Feature Flag
Feature flags：

observability.spine_enabled
observability.usage_metrics_enabled
observability.trace_query_enabled
Rollback：

關閉 persistent event write，回 V0 minimal emitter。
usage metrics 可獨立關閉。
system_events table 保留。
前端 trace viewer 隱藏。
不影響業務資料。
V10｜Historical Data Paging & Storage Partition
評分：96 / 100

本版目標與為什麼
目標：將 messages、artifacts、memory 的長期歷史資料從 active Zustand / IndexedDB workspace state 移出，改由後端分頁、索引、active window 承接。

為什麼最後做：
它依賴 V3 cloud state、V4 sync queue、V6 task lifecycle、V8 artifact layer。若太早做，會過早改 runtime contract；現在做可以只切 storage boundary，不重寫 Agent runtime。

後端痛點
Agent messages 目前仍在 active NexusAgent.messages。
長期使用後，Zustand、IndexedDB、snapshot payload、render 都會膨脹。
syncHistoricalMessage / syncHistoricalArtifact 目前是 stub。
historical data boundary 已在 Blueprint 標記，但尚未落地。
10,000 messages 會拖垮 hydration 和 local persist。
active messages 與 historical messages 邊界不清。
版本定位
從「active workspace 裝載過多歷史資料」升級成「active state 只保留工作集，歷史資料由後端分頁承接」。

本篇章只做什麼
擴充 messages paging fields。
建立 agent_memory_records。
實作 MessageHistoryService。
實作 IAsyncDataFetcher。
實作 syncHistoricalMessage。
實作 syncHistoricalArtifact routing。
建立 active window policy。
前端只保存 active messages + paged cache projection。
本篇章明確不做什麼
不重寫 Agent task lifecycle；V6 owner。
不重寫 artifact schema；V8 owner。
不重寫 sync queue；V4 owner。
不重寫 workspace snapshot；V3 owner。
不把所有 messages 從 UI 一次清空。
不破壞 current chat UX。
不做 vector memory system。
不做 full data warehouse。
實作順序
定義 active window policy。
擴充 messages table。
新增 agent_memory_records。
建立 MessageHistoryService。
建立 paged messages API。
實作 IAsyncDataFetcher。
改 syncHistoricalMessage 實際寫 backend。
前端分離 active window / historical pages。
workspace snapshot 改只存 active working set refs。
壓測 10,000 messages。
資料結構升級
調整 messages
新增：

role text -- user/assistant/system/tool
task_id uuid
source_tool_run_id uuid
token_count int
content_hash text
metadata jsonb
is_active_window boolean default true
archived_at timestamptz
updated_at timestamptz
保留：

id
workspace_id
agent_id
content
type
created_at
Index：

idx_messages_workspace_agent_created
idx_messages_task
idx_messages_active_window
idx_messages_source_tool_run
新增 agent_memory_records
id text primary key
workspace_id text not null
agent_id text not null
memory_type text not null -- active/compressed/archived/context_note
content text not null
content_hash text
intensity int
source_task_id uuid
created_at timestamptz not null
updated_at timestamptz not null
Index：

idx_memory_workspace_agent_type
idx_memory_source_task
API / Service / Repository 升級
新增 API：

GET  /api/v1/agents/:agentId/messages?workspaceId=...&cursor=...&limit=50
POST /api/v1/agents/:agentId/messages
POST /api/v1/agents/:agentId/messages/archive
GET  /api/v1/agents/:agentId/memory?workspaceId=...&type=compressed
新增：

MessageHistoryService
MessageRepository
AgentMemoryRecordRepository
HistoricalDataFetcher
StoragePartitionService
Cursor rule：

cursor 不暴露 raw DB offset。
cursor expired 回 HISTORY_CURSOR_EXPIRED。
default limit 50。
max limit 100。
狀態流與錯誤流
Message lifecycle：

draft
active
streaming
finalized
archived
paged
deleted
流程：

message created in active window
→ finalized
→ sync via V4
→ stored in messages
→ active window limit exceeded
→ archive old messages
→ snapshot stores refs/latest window only
→ UI scroll loads paged history
Active window rule：

每 agent 只保留最近 N 則 active messages。
system summary / compressed memory 可以保留。
historical messages 由 API 分頁載入。
安全與權限邊界
messages 必須 workspace scoped。
viewer 可讀不可寫。
message content 過 redaction policy。
memory records 不跨 workspace/agent。
deleted message 與 artifact reference cascade policy 必須明確。
system prompt 或 secret-like content 不進 observability raw log。
pagination API 接 PermissionService。
Observability 跟進
Emit event：

source=history
workspace_id
agent_id
page_size
cursor_status
active_window_size
archive_count
hydration_size
latency_ms
error_code
request_id
trace_id
V9 後寫 system_events。

Failure Handling
Failure	行為
message insert failed	保留 local pending message
page fetch failed	UI retry，不影響 active chat
archive failed	不刪 local active data，稍後 retry
cursor expired	從 latest page 重新查
backend unavailable	fallback active local window
duplicate message id	idempotent return
artifact reference exists	archive 不破壞 reference
Frontend / Middleware / Extension 跟進
Layer	跟進行動
L1 Frontend Feature	history scroll/loading indicator、retry history fetch。不要一次做完整 archive UI。
L2 Frontend State / Client	active messages 與 historical pages 分離。Zustand 不再保存 unbounded transcript。IndexedDB persist size 限制。
L3 Middleware / Adapter / Extension	HistoricalDataFetcher 接 IAsyncDataFetcher。SyncQueue 仍負責 mutation，不改 contract。
擴充性升級判斷
支撐：

10,000+ messages
multi-agent long-running history
compressed memory
future search index
future vector memory layer
artifact/message relation stability
不做：

vector DB
semantic search
permanent legal archive
analytics warehouse
只保留 storage partition socket。

系統負擔判斷
面向	負擔	Mitigation
DB write volume	中	already writing messages，增加 archive update
API latency	pagination query	indexes + cursor
frontend state	大幅降低	active window
migration risk	中	nullable fields first
IndexedDB size	大幅降低	partialize
runtime coupling	低	不改 V6 contract
驗收標準
10,000 messages 初始 hydrate 不載入全部。
active snapshot size 可控。
history scroll 可分頁。
syncHistoricalMessage 實際寫 backend。
messages 有 workspace/agent index。
streaming finalized 後可查。
斷線 message 不遺失。
archive 不破壞 artifact reference。
IndexedDB persisted size 明顯下降。
frontend Zustand 不保存 unbounded transcript。
Rollback / Feature Flag
Feature flags：

history.paging_enabled
history.active_window_enabled
history.memory_records_enabled
Rollback：

關閉 paging 後回 active messages legacy。
新 message fields nullable。
archived messages 可重新標回 active。
historical API 可保留不用。
前端可 fallback local active window。
不破壞 V6 task/message relation。
4. 最終可執行總路線
4.1 最終順序
V0 Shared Backend Primitives
→ V1 Backend Security Boundary & RLS Foundation
→ V2 Unified API Contract v1
→ V3 Canonical Cloud Workspace State
→ V4 Durable Sync Queue & Conflict Resolution
→ V5 Deployment Safety Gate & Runtime Health System
→ V6 Agent Runtime Sessions & Task Lifecycle
→ V7 Tool Execution Control Plane
→ V8 Artifact Asset Layer & Provenance Graph
→ V9 Observability Event Spine
→ V10 Historical Data Paging & Storage Partition
4.2 依賴關係
Version	Depends On
V0	無
V1	V0
V2	V0、接 V1 interface
V3	V0、V1、V2
V4	V0、V1、V2、V3
V5	V0、V1、V2；可與 V3/V4 部分並行
V6	V0、V1、V2、V3、V5
V7	V0、V1、V2、V5、V6
V8	V0、V1、V2、V6、V7
V9	V0 trace context；完整落地等 V6/V7/V8
V10	V3、V4、V6、V8、V9 hook
4.3 可以並行的項目
可並行	條件
V1 schema/RLS 與 V2 API primitive	V0 已 freeze。
V5 registry/env checker 與 V3 cloud state	不互改業務 schema。
V6 ProviderAdapter 與 V5 deployment checks	V2 contract 已穩。
V8 artifact schema design 與 V7 tool control plane	只能設計，不先接 materialization。
V9 event taxonomy 與 V6/V7/V8	V9 不建表侵入前面 service，先用 V0 emitter。
4.4 必須串行的項目
必須串行	原因
V0 → all	沒有 primitive 會重複造輪子。
V1 → V3/V4/V6/V7/V8/V10	資料擴張前必須先有 workspace security。
V2 → V3/V4/V6/V7/V8/V10	大量 API 前必須先有 contract。
V3 → V4	Sync queue 必須知道要同步到哪個 canonical state。
V6 → V7	Tool run 必須掛在 Agent task 下。
V7 → V8	Tool output materialization 需要 tool_run_id。
V8 → V10 artifact history	Historical partition 不可重定義 artifact。
V9 full → V10 validation	Paging performance 需要 observability 指標。
4.5 會影響資料 migration 的版本
Version	Migration Risk
V1	高，補 workspace/user/RLS。
V2	低，新增 idempotency table。
V3	中，新增 snapshot/entity tables。
V4	中，新增 sync operations。
V5	低，新增 deployment/feature tables。
V6	中，新增 runtime task tables。
V7	中，新增 tool run/permission tables。
V8	中～高，擴充 artifacts。
V9	中，新增 event/metrics tables。
V10	中～高，messages paging fields。
4.6 會影響前端 L1 的版本
Version	L1 Impact
V1	permission denied state。
V4	sync status badge / retry。
V5	admin-only health warning。
V6	task status badge / stop / retry。
V7	tool confirmation modal。
V8	artifact reference UI。
V9	admin/debug trace viewer。
V10	history loading / retry。
V0、V2、V3 原則上不需要 L1 膨脹。

4.7 會影響前端 L2 的版本
Version	L2 Impact
V0	shared types。
V2	typed API client。
V3	snapshot serializer/hydrator。
V4	local sync queue projection。
V6	task projection。
V8	artifact by-id cache。
V10	active messages / historical pages 分離。
注意：
V10 是唯一真正需要明顯 frontend state partition 的版本。前面版本不得提前重構整個 Zustand。

4.8 會影響中間層 L3 的版本
Version	L3 Impact
V0	primitives/interfaces。
V1	PermissionGate middleware。
V2	apiHandler / typed client。
V3	WorkspaceStateAdapter。
V4	SyncQueueAdapter。
V5	RegistryValidator / FeatureFlagAdapter。
V6	ProviderAdapter。
V7	ToolExecutorAdapter / ToolPermissionGate。
V8	ArtifactMaterializer。
V9	TraceContext middleware。
V10	HistoricalDataFetcher。
4.9 需要 Feature Flag 的版本
Version	Flag
V1	security.rls_enforced
V2	api.v1_enabled
V3	workspace.cloud_state_enabled
V4	sync.queue_enabled
V5	deployment.gate_enforced
V6	agent.runtime_tasks_enabled
V7	tools.control_plane_enabled
V8	artifacts.asset_layer_enabled
V9	observability.spine_enabled
V10	history.paging_enabled
4.10 每版完成後才允許下一版開始的 Gate
Gate	必須通過
V0 完成	primitive tests、error code namespace、redaction test。
V1 完成	RLS tests、permission audit、secret rejection。
V2 完成	API contract tests、idempotency tests。
V3 完成	cloud hydrate、checksum conflict、snapshot redaction。
V4 完成	offline retry、duplicate prevention、manual retry。
V5 完成	migration dry run、registry check、env check、health endpoint。
V6 完成	task lifecycle、stream cancel、provider fallback。
V7 完成	tool run audit、confirmation、schema validation。
V8 完成	artifact provenance、versioning、reference integrity。
V9 完成	trace API、usage metrics、redaction。
V10 完成	10,000 messages hydrate 不爆、active window/paging。
5. 最終執行原則
V0 先凍結。
沒有 shared primitive，不准開 V1～V10。

Security 早於資料擴張。
V1 必須先於 snapshot、sync、runtime、tool、artifact。

API contract 早於 API 擴張。
V2 必須先於大量 /api/v1/*。

Cloud state 早於 Sync queue。
V3 定義「同步到哪裡」，V4 才定義「怎麼同步」。

Deployment gate 不可拖太晚。
V1～V4 一旦開始 migration，V5 必須同步落地。

Agent task 早於 Tool run。
Tool execution 必須掛在 task lifecycle 下。

Tool run 早於 Artifact provenance。
Artifact 才能引用 source_tool_run_id。

Observability 完整化等 resource id 穩定。
Trace context 從 V0 開始；完整 event spine 到 V9。

Historical paging 最後做。
它是 storage partition，不應過早重寫 runtime。

前端只接 projection，不重寫後端邏輯。
Permission、sync retry、task lifecycle、tool confirmation、artifact provenance 都由後端提供 decision/status。

6. 一句話總結
這條後端迭代線的本質是：

先建立共同語言，再建立安全邊界，再統一 API，再把 cloud state 與 sync 變可靠，接著把 Agent、Tool、Artifact 從 UI 狀態中拆成後端控制平面，最後用 Observability 與 Historical Paging 讓系統可診斷、可擴充、可長期運行。