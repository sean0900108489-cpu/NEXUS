# Core Line Capability Map

## Reading Rule

本文件把 routes/pages/features 讀成核心依賴線。評估標準是「未來核心能否依賴它」，而不是「使用者功能是否完整」。

## Auth / Session Line

**Evidence**

- `src/app/sign-in/page.tsx:29` 啟動時檢查 Supabase session，成功時 `router.replace("/")`。
- `src/app/sign-in/page.tsx:73` 到 `src/app/sign-in/page.tsx:100` 使用 `supabase.auth.signInWithPassword` / `signUp`，並處理 email confirmation path。
- `src/lib/backend/security/auth-session.ts:17` 到 `src/lib/backend/security/auth-session.ts:45` 以 Bearer token 或 Supabase cookie token 呼叫 `auth.getUser(token)`。
- `src/lib/backend/api/api-auth.ts:16` 到 `src/lib/backend/api/api-auth.ts:47` 將 request 解析成 `actorUserId`，並檢查 declared user mismatch。

**Readiness**

Medium。身份入口與 server API actor 線已形成；下一輪需要把 session verification、route redirect、test gate、cookie/Bearer source 清楚變成核心 contract。

## API / Model / Token Capability Line

**Evidence**

- `src/app/api/user/token-status/route.ts:19` 到 `src/app/api/user/token-status/route.ts:69` 回傳使用者 token configured/enabled/plan/lastError，且不暴露 token。
- `src/lib/backend/new-api-token/user-new-api-token-service.ts:87` 到 `src/lib/backend/new-api-token/user-new-api-token-service.ts:127` 從 `user_new_api_tokens` 讀 encrypted token，解密後交給 backend 使用。
- `src/lib/backend/models/ai-gateway-service.ts:117` 到 `src/lib/backend/models/ai-gateway-service.ts:128` 在模型呼叫前檢查 credits 與 per-user token。
- `src/lib/backend/models/ai-gateway-service.ts:143` 到 `src/lib/backend/models/ai-gateway-service.ts:177` 寫 usage ledger 並建立 wallet deduction。

**Readiness**

Medium。能力線可依賴，但 Data Spine 型別與 token table type parity 是核心風險。

## Message Continuation Line

**Evidence**

- `src/app/chat/[id]/page.tsx:36` 到 `src/app/chat/[id]/page.tsx:83` 載入 conversation messages、workspaces、models。
- `src/app/chat/[id]/page.tsx:90` 到 `src/app/chat/[id]/page.tsx:146` 以 existing conversation id 送出 continuation。
- `src/lib/nexus-home/api.ts:31` 到 `src/lib/nexus-home/api.ts:73` 共用 `requestJson`，自動附 session token。
- `src/lib/nexus-home/api.ts:164` 到 `src/lib/nexus-home/api.ts:194` 連接 detail load 與 send global message。
- `src/app/api/global-chat/route.ts:21` 到 `src/app/api/global-chat/route.ts:147` 做 create/continue global conversation、AI call、message persistence。

**Readiness**

Medium。E-2 已從 thin page 變成 message continuation surface，但它仍應被視為核心訊息線，不是完整聊天產品線。

## Wallet Line

**Evidence**

- `src/app/api/wallet/balance/route.ts:13` 到 `src/app/api/wallet/balance/route.ts:27` 提供 authenticated balance endpoint。
- `src/lib/backend/models/wallet-repository.ts:125` 到 `src/lib/backend/models/wallet-repository.ts:177` 讀 `wallet_balances`，缺 cache 時從 `wallet_transactions` SUM。
- `src/lib/backend/models/wallet-repository.ts:179` 到 `src/lib/backend/models/wallet-repository.ts:239` 插入 transaction 並 upsert balance cache。
- `supabase/migrations/20260620181653_create_wallet_tables.sql:11` 到 `supabase/migrations/20260620181653_create_wallet_tables.sql:60` 定義 immutable ledger 與 derived cache。

**Readiness**

Medium-Low。資料模型強，但 `src/app/wallet/page.tsx:5` 到 `src/app/wallet/page.tsx:20` 仍是 thin page；atomic spend RPC 已在 migration 補強，但 repository 主要路徑仍是 JS transaction + upsert。

## Workspace Line

**Evidence**

- `src/app/workspace/[id]/page.tsx:20` 到 `src/app/workspace/[id]/page.tsx:30` 將成熟 workspace surface 保留在 `/workspace/[id]`。
- `src/app/api/workspaces/route.ts:15` 到 `src/app/api/workspaces/route.ts:64` 讀 membership 與 workspace details。
- `src/lib/backend/workspace/workspace-permission.ts:53` 到 `src/lib/backend/workspace/workspace-permission.ts:165` 定義 Supabase membership store。
- `src/lib/backend/workspace/workspace-permission.ts:205` 到 `src/lib/backend/workspace/workspace-permission.ts:247` 建立 permission service，依 service role/request client/local fallback 選擇 backing store。

**Readiness**

Medium。權限和 membership 線已存在；workspace list page 仍是 socket，下一輪應整理 ownership/membership contract，而不是直接補管理 UI。

## Artifact Line

**Evidence**

- `src/app/api/v1/artifacts/route.ts:16` 到 `src/app/api/v1/artifacts/route.ts:67` 以 `apiHandler`、workspace permission、idempotency 接 artifact list/create。
- `src/app/api/v1/artifacts/[artifactId]/route.ts:12` 到 `src/app/api/v1/artifacts/[artifactId]/route.ts:33` 接單一 artifact 讀取與 permission。
- `src/lib/backend/artifacts/artifact-service.ts:54` 到 `src/lib/backend/artifacts/artifact-service.ts:96` materialize 並建立 artifact。
- `src/lib/backend/artifacts/artifact-service.ts:98` 到 `src/lib/backend/artifacts/artifact-service.ts:122` list/get artifact。

**Readiness**

Medium。backend core 偏成熟；`src/app/artifacts/page.tsx:5` 到 `src/app/artifacts/page.tsx:20` 是 thin page。Phase 6 應先整理 artifact visibility/storage/ownership contract。

## Import Bridge Line

**Evidence**

- `src/app/api/imports/route.ts:16` 到 `src/app/api/imports/route.ts:62` 驗證 user、workspaceId、sourceConversationId、workspace write permission。
- `src/app/api/imports/route.ts:64` 到 `src/app/api/imports/route.ts:107` 確認 source conversation ownership 與 messages。
- `src/app/api/imports/route.ts:120` 到 `src/app/api/imports/route.ts:145` 回傳 import provenance、workspace URL、imported messages。

**Readiness**

Medium-Low。它是 bridge response，不是完整 workspace persistence contract。下一輪要確認它會進 workspace state、artifact、note、task、或 context bundle 的哪條線。

## Search / Workflow Lines

**Evidence**

- `src/app/search/page.tsx:5` 到 `src/app/search/page.tsx:19` 是 thin route。
- `src/app/workflows/page.tsx:5` 到 `src/app/workflows/page.tsx:19` 是 thin route。
- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx:94` 是 workspace 內 Workflow Pro surface 入口，檔案長度 1721 行。
- `src/components/nexus/nexus-graph.tsx:1055` 是 graph surface 入口，檔案長度 2409 行。

**Readiness**

Search: Low。Workflow: Medium in workspace, Low as global route. Phase 6 應把 Workflow 作為大型核心能力候選，不先補 global workflow page。

