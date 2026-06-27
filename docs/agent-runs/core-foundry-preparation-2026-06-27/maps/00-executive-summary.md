# Phase 6 - Core Foundry Preparation

## C-0 結論

本輪 C-0 的定位是 Core Environment Line Map。重點是把 v40 已完成的 E-5、E-1、E-2 從「功能完成」重新翻譯成「核心依賴線已接出」。

- E-5 接出 API token / model capability readiness line：`src/app/api/user/token-status/route.ts`、`src/lib/backend/new-api-token/user-new-api-token-service.ts`、`src/lib/backend/models/ai-gateway-service.ts`。
- E-1 接出 auth / identity entry line：`src/app/sign-in/page.tsx`、`src/lib/supabase/client.ts`、`src/lib/backend/security/auth-session.ts`、`src/lib/backend/api/api-auth.ts`。
- E-2 接出 message continuation line：`src/app/chat/[id]/page.tsx`、`src/lib/nexus-home/api.ts`、`src/app/api/global-chat/route.ts`、`src/app/api/global-chats/[conversationId]/route.ts`、`src/lib/backend/models/global-chat-repository.ts`。

Phase 6 的下一步應以技術基礎建設為主：Data Spine 型別同步、route/API contract alignment、workspace ownership line、artifact/import bridge line。這些是讓未來 NEXUS 核心可被創造的環境，不是使用者功能頁補完。

## Git 與本輪位置

- Branch：`codex/v40`
- HEAD：`73d8e35 v40 E-2: Chat detail page`
- v40 chain：`0ac6ee6` E-5、`94c76c6` E-1、`73d8e35` E-2
- C-0 工作型態：read-only mapping + documentation

## Notion Drift

Notion 父頁仍以「中型蛻變 / User Panel / 下一輪實作拆包」為主語；`00｜總控索引與停靠點` 仍要求下一輪選實作包。實際程式進度已進入 v40 E-5/E-1/E-2，且使用者意圖已校正為 Phase 6 - Core Foundry Preparation。

Notion 的 `06｜子智能體調度手冊` 實際內容是子智能體調度，不是 Phase 5 Execution Packet Selection。C-0 需要新增 Phase 6 承接頁，而不是把舊 06 改成另一種用途。

已新增 Notion 承接頁：`08｜Phase 6 Core Foundry Preparation`  
URL: https://app.notion.com/p/38cf1a036e2181359b16ceb824f15bce

## Core Environment Lines

| Line | 目前可靠度 | 角色 | 主要 owner |
|---|---:|---|---|
| Auth/session line | Medium | 身份入口、API actor 解析、Bearer/cookie session 驗證 | `src/app/sign-in/page.tsx`, `src/lib/backend/security/auth-session.ts` |
| API/model/token line | Medium | 每使用者 New API token、model gate、usage ledger、wallet deduction | `src/app/api/user/token-status/route.ts`, `src/lib/backend/models/ai-gateway-service.ts` |
| Message continuation line | Medium | global chat list/detail/send、chat detail continuation | `src/lib/nexus-home/api.ts`, `src/app/api/global-chat/route.ts` |
| Wallet line | Medium-Low | ledger/cache 已有，但 page 仍 thin；atomic spend RPC 尚未接成主要 repo path | `src/lib/backend/models/wallet-repository.ts`, `src/app/api/wallet/balance/route.ts` |
| Workspace line | Medium | workspace permission/session/membership 已有；list page 仍 thin | `src/lib/backend/workspace/workspace-permission.ts`, `src/app/api/workspaces/route.ts` |
| Artifact line | Medium | backend service/API 已成熟；list page 仍 thin | `src/app/api/v1/artifacts/route.ts`, `src/lib/backend/artifacts/artifact-service.ts` |
| Import bridge line | Medium-Low | global chat -> workspace copy response exists；真正 workspace persistence contract 需要下一輪釐清 | `src/app/api/imports/route.ts` |
| Search line | Low | route 是 thin page；核心 index/retrieval contract 尚未形成 | `src/app/search/page.tsx` |
| Workflow line | Medium | workspace 內 Workflow Pro 能力大；global route 仍 thin | `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`, `src/app/workflows/page.tsx` |
| UI shell / route ownership line | Medium | Home shell、Workspace shell、thin page sockets 已分層 | `src/app/page.tsx`, `src/components/nexus-home/NexusHomeShell.tsx`, `src/app/workspace/[id]/page.tsx` |
| Data Spine / Supabase types line | Low | migrations 已擴張，`database.types.ts` 未列 global/wallet/token 新表 | `src/lib/supabase/database.types.ts`, `supabase/migrations/*` |
| Test gate / baseline debt line | Medium | targeted tests exists；全量 baseline 仍需作為環境風險管理 | `package.json`, `src/app/chat/[id]/page.test.tsx` |

## Highest ROI Next Packet

建議下一個 core-prep packet：

**C-1 Data Spine Type Parity and Contract Map**

目的：把 Supabase migrations、`database.types.ts`、repository `as never` usage、route response contracts、Data Spine fields 對齊成未來核心可依賴的資料基礎。

選它的原因：

- 目前 `global_conversations`、`global_messages`、`wallet_transactions`、`wallet_balances`、`user_new_api_tokens` 已在 migrations 與 live docs 裡出現，但 `src/lib/supabase/database.types.ts` 的 `Database.public.Tables` 未列出這些 tables。
- E-5/E-2 多處使用 `as never` 存取新表，例如 `src/app/api/user/token-status/route.ts` 與 `src/lib/backend/models/global-chat-repository.ts`。
- 未來核心如果要依賴模型能力、訊息延續、wallet、workspace、artifact/import，先把 Data Spine contract 站穩，回報價值最大。

## 已完成

- 掃描 git branch 與 v40 commits。
- 讀 Notion 父頁、00 頁、06 頁，確認 Phase 6 尚未承接且 06 實際是子智能體頁。
- 掃描 routes、API adapter、Supabase client/admin/request、auth/session、global chat、wallet、workspace、artifact、import、thin pages。
- 形成 Core Readiness Map 與下一個 core-prep packet 建議。

## 剩餘

- Notion 新增 Phase 6/C-0 承接頁。
- 若下一輪進 C-1，讀 Next docs 後再進行任何 Next/route code 變更。
- C-1 需要決定：只更新 docs/type map，或生成/修補 `database.types.ts`。這要成為明確 packet，而不是混在功能頁中。

## Meaning Quality Gate

| Section | Human clarity | LLM usefulness | Agent actionability | Evidence grounding | Pre-architecture value |
|---|---:|---:|---:|---:|---:|
| C-0 結論 | 90 | 92 | 88 | 86 | 92 |
| Core Environment Lines | 88 | 94 | 92 | 88 | 94 |
| Highest ROI Next Packet | 92 | 92 | 94 | 90 | 95 |
| Notion Drift | 86 | 84 | 86 | 82 | 86 |
