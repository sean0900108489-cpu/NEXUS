# 新上下文啟動詞 - Phase 6 Core Foundry Preparation

你正在接續 NEXUS 的大型蛻變期，現在進入：

Phase 6 - Core Foundry Preparation

核心校正：

本階段不是補使用者功能頁，也不是把 queued packet 逐一做成產品能力。現在的任務是把 NEXUS 新核心誕生以前需要依賴的技術線整理清楚，建立一個可承載大型核心功能的創造環境。

已完成的 v40 commits 要理解成「依賴線已接出」：

- `0ac6ee6` E-5：API token / model capability readiness line
- `94c76c6` E-1：auth / identity entry line
- `73d8e35` E-2：message continuation line

請先讀：

1. `docs/agent-runs/core-foundry-preparation-2026-06-27/maps/00-executive-summary.md`
2. `docs/agent-runs/core-foundry-preparation-2026-06-27/maps/10-feature-capability-map.md`
3. `docs/agent-runs/core-foundry-preparation-2026-06-27/maps/11-current-system-logic-map.md`
4. `docs/agent-runs/core-foundry-preparation-2026-06-27/maps/20-risk-register.md`
5. `docs/agent-runs/core-foundry-preparation-2026-06-27/context-packs/current-system-context.md`
6. `AGENTS.md`

下一個建議 packet：

C-1 - Data Spine Type Parity and Contract Map

C-1 目標：

把 Supabase migrations、`src/lib/supabase/database.types.ts`、repository `as never` usage、route response contracts、Data Spine fields 對齊成未來核心可依賴的資料基礎。

C-1 第一層問題：

1. `database.types.ts` 為什麼沒有列出 `global_conversations`、`global_messages`、`wallet_transactions`、`wallet_balances`、`user_new_api_tokens`？
2. 哪些 source files 正在用 `as never` 繞過缺失型別？
3. 哪些 route/API contract 已穩定，哪些仍是 hand-rolled envelope？
4. C-1 應該只產出 contract map，還是同步修補 generated types？
5. 若要修補 types，需要讀哪些 Next/Supabase 指令與跑哪些 verification？

執行原則：

- 以技術基礎建設、依賴線、contract、Data Spine 為主。
- queued pages 只作為依賴線 socket 觀察，不作為功能頁實作入口。
- 優先做 read-only mapping、type parity analysis、route contract comparison。
- 需要補丁時，補丁目的只能是讓核心依賴線更可靠。
- baseline test/lint failure 先記錄成 core environment risk；只有阻礙 C-1 判斷時才處理。

完成後回報：

- Data Spine type parity status
- `as never` usage map
- route/API contract alignment map
- 是否需要修 `database.types.ts`
- 下一個 core-prep packet
- Notion 是否已更新
- git status

