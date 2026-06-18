# NEXUS Agent Handoff

> 給接手這個專案的 agent / 新上下文
> 最後更新：2026-06-18 AEST
> 版本：V32 (Phase 2B complete, commit `59eb863`)

---

## 快速啟動

新 agent 打開 repo 後，依序讀：
1. `docs/living/NEXUS_AGENT_HANDOFF.md` ← 最重要的入口（先讀這個）
2. `docs/living/NEXUS_CURRENT_STATE.md` ← 最新 production/backend/UI 狀態
3. `docs/living/NEXUS_SMOKE_TESTS.md` ← 全部 smoke test 記錄
4. `docs/living/NEXUS_TECH_DEBT_LEDGER.md` ← 已修/未修技術債完整清單
5. `docs/living/NEXUS_MODEL_GATEWAY.md` ← New API 架構參考
6. `docs/NEW_API_OPS_GUIDE.md` ← New API 運維操作手冊
如有需要再讀：`docs/V29_HANDOFF.md`、`docs/V29_TECH_DEBT_CROSS_REFERENCE.md`（歷史參考）

## 關鍵事實速查

| 問 | 答 |
|---|---|
| Production URL | `https://nexus-swart-ten.vercel.app` |
| GitHub | `sean0900108489-cpu/NEXUS` |
| Branch | `main` = V32 (`59eb863`: Phase 2B complete + Riverflow) |
| New API 在哪 | VPS `170.64.201.54`, Docker, port 80→3000 |
| SSH 到 VPS | `ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54` |
| New API 管理後台 | `http://170.64.201.54`（root / Nexus2026Secure!） |
| VPS Channels | DeepSeek (ch1) + OpenAI-General (ch2) + OpenRouter (ch3) |
| 能用哪些模型 | deepseek-chat, deepseek-v4-pro, deepseek-v4-flash, gpt-4o-mini, gpt-4o, gemini-2.5-flash, gemini-2.5-pro, claude-sonnet-4, img2, riverflow-v2.5-fast |
| 圖片生成模型 | img2 (GPT Image 2, DALL-E path) + riverflow-v2.5-fast (Riverflow v2.5 Fast, chat-completions path) |
| ModelRatio 價格 | 全部 0（MVP 階段 intentional） |
| Token 怎麼 provision | `POST /api/model-gateway/provision`（自動，用戶不需手動貼） |
| 哪些 route 被 legacy block | fs-scanner, web-surfer, memory-compress, predictive-intel, providers/verify |
| Local dev | `http://localhost:3000`（next dev） |

## Scope Rules

- MVP 階段：product reliability > security hardening
- Nova out of scope
- Domain/HTTPS/Cloudflare out of scope
- 不要叫使用者手動貼 token
- 不要做 full NexusOps rewrite
- 不要新增大功能
- 不要印 secrets

## Phase 2A — Completed (`fbfbd48`)

- Zundo limit 50→20
- IndexedDB cache strip (artifactVault, notebooksCache, deletedNotebooksCache)
- nexus-ops dead code removal (-97 lines)

## Phase 2B — Completed (`d2f35e2`)

- Connector hooks: useTopBarProps, useRightDockProps, useAgentSettingsSidebarProps
- Workflow Pro read-model extraction: useWorkflowProReadModel
- nexus-ops.tsx: 3,764 → 3,676 lines

## Image Gen — Riverflow v2.5 Fast (`59eb863`)

- Catalog: `riverflow-v2.5-fast` → `new_api_model: "sourceful/riverflow-v2.5-fast"`
- Plan: Free/Basic/Pro/Team, multiplier=1
- Composer: "Riverflow v2.5 Fast" option alongside "GPT Image 2"
- Adapter: sourceful/* routes through /v1/chat/completions (no modalities param)
- img2 unchanged, gpt-image-2 never exposed

## Remaining P2 Debt

| # | 問題 | 狀態 |
|---|---|---|
| 18 | SSE handler in NexusOps root | 未處理 |
| 19 | Zundo undo stack bloat | ✅ Fixed — limit 50→20 (Phase 2A) |
| 20 | reasoningContent persist bloat | 未處理 |
| 28 | Macro save no local queue | 未處理 |
| 33 | NexusOps god object | 部分改善（Phase 2B extracted connectors + read-model） |
| 23 | /api/models contract drift | 未處理 |
| 11 | Duplicate agent names (cosmetic UX) | 未處理 |
| — | Composer quality UI shown for models that ignore it | 未處理 |
