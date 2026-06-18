# NEXUS V32 — Release Hardening Handoff

> 給接手這個專案的 agent / 新上下文
> 最後更新：2026-06-18 AEST
> 版本：V32 (Phase 2B complete + Riverflow, baseline `f7cdcc6`)
> 狀態：**可進入 release hardening，不建議立即上架**

---

## 快速啟動（和之前一樣）

新 agent 打開 repo 後，依序讀：
1. `docs/living/NEXUS_AGENT_HANDOFF.md` ← 最重要的入口
2. `docs/living/NEXUS_CURRENT_STATE.md` ← 最新 production/backend/UI 狀態
3. `docs/living/NEXUS_SMOKE_TESTS.md` ← 全部 smoke test 記錄
4. `docs/living/NEXUS_TECH_DEBT_LEDGER.md` ← 已修/未修技術債完整清單
5. `docs/living/NEXUS_MODEL_GATEWAY.md` ← New API 架構參考
6. `docs/NEXUS_ADD_MODEL_GUIDE.md` ← 新增模型完整教學
7. `docs/NEW_API_OPS_GUIDE.md` ← New API 運維操作手冊

---

## 關鍵事實速查

| 問 | 答 |
|---|---|
| Production URL | `https://nexus-swart-ten.vercel.app` |
| GitHub | `sean0900108489-cpu/NEXUS` |
| Branch | `main` = V32 (`f7cdcc6`: Phase 2B complete + Riverflow) |
| New API 在哪 | VPS `170.64.201.54`, Docker, port 80→3000 |
| SSH 到 VPS | `ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54` |
| New API 管理後台 | `http://170.64.201.54`（root / Nexus2026Secure!） |
| VPS Channels | DeepSeek (ch1) + OpenAI-General (ch2) + OpenRouter (ch3) |
| 能用哪些模型 | deepseek-chat/v4-flash/v4-pro, gpt-4o-mini, gpt-4o, gemini-2.5-flash/pro, claude-sonnet-4, **img2, riverflow-v2.5-fast** |
| 圖片生成模型 | img2 (GPT Image 2, DALL-E path) + riverflow-v2.5-fast (Riverflow v2.5 Fast, chat-completions path) |
| ModelRatio 價格 | 全部 0（MVP 階段 intentional） |
| Token 怎麼 provision | `POST /api/model-gateway/provision`（自動） |
| 哪些 route 被 legacy block | fs-scanner, web-surfer, memory-compress, predictive-intel, providers/verify |

---

## 已完成項目（V30-V32）

### V30-V31 核心修復
- ✅ `/api/chat`、agent stream SSE、Graph Brain smoke test ALL PASS
- ✅ model_usage_ledger 三條 sourceType succeeded
- ✅ idempotency pending lock → 過期自動 takeover
- ✅ stream abort → orphan task 修復
- ✅ Sync counter "1 syncing" 卡住 → forceCleanStaleSyncing()
- ✅ Graph Delete → window.confirm()
- ✅ ResizeObserver N+1 → 單一 root observer
- ✅ syncHistoricalArtifact no-op → offline queue
- ✅ saveArtifact fire-and-forget → offline queue
- ✅ Image gen catalog converge → img2 only (GPT Image 2 label)

### Phase 2A (State Diet + Dead Code)
- ✅ Zundo limit 50→20（記憶體 -60%）
- ✅ IndexedDB cache strip（artifactVault, notebooksCache, deletedNotebooksCache）
- ✅ nexus-ops dead code removal (-97 lines)

### Phase 2B (Connector Hooks + Read-Model)
- ✅ Connector hooks: useTopBarProps, useRightDockProps, useAgentSettingsSidebarProps
- ✅ Workflow Pro read-model: useWorkflowProReadModel (10 useMemo → 1 hook)
- ✅ nexus-ops.tsx: 3,764 → 3,676 lines

### Riverflow v2.5 Fast 圖片模型
- ✅ Catalog + plan access (Free/Basic/Pro/Team)
- ✅ Chat-completions adapter path (sourceful/* → /v1/chat/completions, no modalities)
- ✅ image_config.aspect_ratio from composer
- ✅ VPS OpenRouter channel (ch3) configured

---

## 重要決策

1. MVP connectivity/stability 階段，不做 security hardening
2. Nova 是獨立項目，完全 out-of-scope
3. 不要處理 domain / HTTPS / Cloudflare
4. 不要讓用戶手動貼 New API token（已有 auto-provision）
5. 除非 token 外洩或 production 無法使用，安全債先記錄不插隊
6. NEXUS 是計費平台，所有 LLM 請求必須經過 New API，不可繞過

---

## P0 Architecture Boundaries（不可碰）

以下在 Phase 2B 驗證全部 UNCHANGED：

| 路徑 | 狀態 |
|---|---|
| handleSend (nexus-ops.tsx L2319) | UNCHANGED |
| SSE contract (meta/token/reasoning/done, 30ms/50ms batching) | UNCHANGED |
| /api/chat | PRESENT, unchanged |
| /api/v1/agents/[agentId]/stream | PRESENT, unchanged |
| /api/workflow-pro/brain-draft | PRESENT, unchanged |
| /api/image-gen | PRESENT (new_api_model routing added) |
| Workflow handoff useEffect | PRESENT, unchanged |
| Zundo limit=20, persist version=16 | CORRECT |
| Model catalog (img2 + riverflow) | CORRECT |
| Plan config (all plans include riverflow) | CORRECT |
| Image adapter routing (sourceful/* → chat-completions) | CORRECT |

---

## Supabase DB Baseline（2026-06-18）

| 表 | 狀態 |
|---|---|
| sync_operations | 418 synced, **44 conflicted**, 0 failed/queued/syncing |
| agent_tasks | 141 completed, 20 failed, **3 queued + 1 created (stuck)** |
| artifacts | 45 total, **9 inline base64 (max 4.4MB)** |
| model_usage_ledger | agent_stream=138, operator_chat=21, image_workflow=16, brain_draft=14, NULL=5 |
| user_new_api_tokens | 4 enabled, 2 disabled |
| messages | 正常 |

---

## 已診斷的 Release Blockers

### P0-1：Sync Conflict — 44 conflicted operations

**根因：** Workspace snapshot checksum mismatch。多個 client 並行推 snapshot 時 baseChecksum 不同步。Server 端 `tryApply()` 丟出 WORKSPACE_STATE_CONFLICT → client 端 `mapServerStatusToLocalQueueStatus` 直接映射 → 44 個 conflicted 留在 IndexedDB 和 Supabase。

**影響：** 資料不會損壞（conflict 表示操作被拒絕，未寫入 data table），但 cloud 端 44 個版本落後。User 點 sync retry 只會 compact（丟棄）這些操作。Sync counter UI 沒有顯示 conflict 數量。

**修復位置：**
1. `src/lib/sync/local-sync-queue-adapter.ts:361-363` — flushOperation silent return on null accessToken → 應設 AUTH_REQUIRED 錯誤
2. `src/lib/backend/sync/sync-queue-service.ts:340-344` — conflicted 後應自動排程重試（帶 fresh checksum）
3. `src/components/nexus/nexus-ops.tsx` — retryFailedSyncOperation 只處理第一個，應處理全部 conflicted

### P0-2：Sync Retry / Identity Gate 斷層

**發現：** Sync retry 本身不會觸發 Identity Gate。它們是兩條獨立路徑：
- Sync queue 的 `flushOperation` 在 accessToken=null 時 silent return（不報錯、不通知）
- Identity Gate 由 Supabase `onAuthStateChange` 觸發

**影響：** User 可能點 sync retry，看到 "Sync retry queued." 通知，但操作永遠不會 flush（token 已過期）。Identity Gate 只在 page reload 時出現。User 體驗：點 sync → 沒反應 → refresh → 被踢回登入 → 以為 sync 把他登出了。

**修復位置：**
1. `src/lib/sync/local-sync-queue-adapter.ts:361-363` — 設 AUTH_REQUIRED 錯誤並發 CustomEvent
2. `src/components/nexus/nexus-ops.tsx` — sync counter 應顯示 conflict/error 數量，不只一個 Synced badge

### P0-3：Artifact Vault — 9 筆 inline base64（最大 4.4MB）

**根因：** image-gen route 會把 base64 decode + upload 到 Supabase Storage。但 client 端的 artifact create 直接把 base64 data URL 當 contentUrl 傳給 `POST /api/v1/artifacts`。`ArtifactMaterializer` 不檢測 base64 → DB 直接存。List API 回傳 contentUrl → 前端 list view 把 base64 當文字 render。

**影響：** 效能（list API payload 可達 20MB+）、UI（base64 亂碼顯示在 artifact list）、DB 肥大。

**修復位置：**
1. `src/lib/backend/artifacts/artifact-repository.ts:297-319` — toVaultRecord() 從 list response 移除 contentUrl
2. `src/components/nexus/nexus-agent-settings-sidebar.tsx:1301,1385` — fallback chain 移除 contentUrl
3. `src/lib/backend/artifacts/artifact-materializer.ts:23-60` — 檢測 base64，upload 到 Supabase Storage

### P1-1：Duplicate Agent 誤報 — 實際上 code 正確

**診斷：** `duplicateAgent()` 不碰 workspace ID、不改 workspace name、不碰 cloud session。Toolbar actions 全都是 explicit callbacks，非 index-based。JSON.clone 對當前 agent data shape 是安全的。

**但 Smoke test 報告過 "duplicate changes workspace name/cloud session"。** 可能原因：
1. 混淆了 `duplicateAgent` 和 `branchAgent`（branchAgent 設 activeWorkspaceId）
2. `bindActiveWorkspaceToCloudSession` useEffect race condition
3. Zundo undo/redo 在 duplicate 之後重播了 workspace switch

**建議：** duplicateAgent 缺 `queueWorkspaceCloudSync()`（其他 CRUD 都有），加上即可。不需大修。

### P1-2：Workspace Menu 混雜 debug 訊息

STREAM: live、ROLE: owner 等 badge 直接顯示在 workspace dropdown 和 agent settings sidebar。沒有任何 debug gate。

**修復位置：**
1. `src/components/nexus/nexus-panels.tsx:263-282` — 從 workspace menu 移除 STREAM/ROLE badge
2. `src/components/nexus/nexus-agent-settings-sidebar.tsx:822-829` — sidebar 保留（診斷用途）

### P1-3：Composer Quality 對所有模型顯示

Riverflow 不理會 quality 參數，但 composer 仍顯示 standard/high/ultra 選項。

**修復位置：**
1. `src/lib/composer/image-generation-settings.ts` — 為 riverflow 標記 `supportsQuality: false`
2. `src/components/nexus/workspace-chat-composer-shell.tsx:607-625` — 隱藏不支援 quality 的模型

### P1-4：4 個 stuck agent_tasks

3 個 memory_compress（5/30 至今，19 天 stale）+ 1 個 chat（6/17，created, attempt_count=0）。workerAvailable=false，worker pool idle。

### P1-5：5 筆 model_usage_ledger source_type=NULL

成本追蹤不完整。需調查是哪個 code path 沒設 source_type。

---

## 建議的 Release Hardening 輪次

最短上架版（**4 輪**）：
1. Baseline 鎖定 + 清理 44 conflicted
2. 修 sync retry/auth recovery
3. 修 artifact base64
4. 完整 regression smoke

建議版（**6 輪**，加上 P1 UX）：
5. Workspace menu / composer quality UX fix
6. Stuck tasks cleanup + source_type NULL fix

目前 consensus：可進入 release hardening，不建議立即上架。需要至少 4 輪 P0 修復。

---

## 其他已修技術債（在此階段不需處理）

| # | 問題 | 狀態 |
|---|---|---|
| 19 | Zundo undo stack bloat | ✅ Fixed — limit 50→20 |
| — | IndexedDB cache bloat | ✅ Fixed — artifactVault, notebooksCache, deletedNotebooksCache stripped |
| — | nexus-ops dead code | ✅ Fixed — duplicate rightDockPanels, dead helpers, unused imports |
| 33 | NexusOps god object | 部分改善 — connector hooks + read-model extracted |

## Out of scope（不要碰）

- Nova RAG tables
- RLS/audit log security hardening
- Domain / HTTPS / Cloudflare
- Full NexusOps rewrite
- SSE handler extraction (P2)
- Message ref-only store (P2)
- reasoningContent persist bloat (P2)
