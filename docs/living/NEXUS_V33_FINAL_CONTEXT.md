新上下文起手式
新 agent 打開 repo 後，依序讀：
docs/living/NEXUS_RELEASE_HARDENING_HANDOFF.md ← 最重要的入口（先讀這個！）
docs/living/NEXUS_AGENT_HANDOFF.md ← 快速事實速查
docs/living/NEXUS_CURRENT_STATE.md ← 最新 production/backend/UI 狀態
docs/living/NEXUS_SMOKE_TESTS.md ← 全部 smoke test 記錄
docs/living/NEXUS_TECH_DEBT_LEDGER.md ← 已修/未修技術債完整清單
docs/living/NEXUS_MODEL_GATEWAY.md ← New API 架構參考
docs/NEXUS_ADD_MODEL_GUIDE.md ← 新增模型完整教學（LLM/VLLM/MLLM）
docs/NEW_API_OPS_GUIDE.md ← New API 運維操作手冊

關鍵事實速查
問	答
Production URL	https://nexus-swart-ten.vercel.app
GitHub	sean0900108489-cpu/NEXUS
Branch	main = V33 Release Hardening 完成 (8903032)
V33 分支	codex/v33 (P0 修復完成), codex/v33p3 (P1 + 技術債 + deploy)
V32 baseline	95f152e
V33 total commits	16（from 54ba52b to 8903032）
V33 total Δ	13 files, +365/-102 lines vs V32 baseline
Last tsc	npx tsc --noEmit: PASS (zero errors)
Last deploy	2026-06-18, Vercel auto-deploy from main
New API 在哪	VPS 170.64.201.54, Docker, port 80→3000
SSH 到 VPS	ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54
New API 管理後台	http://170.64.201.54（root / Nexus2026Secure!）
VPS Channels	DeepSeek (ch1) + OpenAI-General (ch2) + OpenRouter (ch3)
能用哪些模型	deepseek-chat/v4-flash/v4-pro, gpt-4o-mini, gpt-4o, gemini-2.5-flash/pro, claude-sonnet-4, img2, riverflow-v2.5-fast
圖片生成模型	img2 (GPT Image 2, DALL-E path) + riverflow-v2.5-fast (Riverflow v2.5 Fast, chat-completions path)
ModelRatio 價格	全部 0（MVP 階段 intentional）
Token 怎麼 provision	POST /api/model-gateway/provision（自動，用戶不需手動貼）
哪些 route 被 legacy block	fs-scanner, web-surfer, memory-compress, predictive-intel, providers/verify

重要決策
1. NEXUS 是計費平台，所有 LLM 請求必須經過 New API，不可繞過直接用上游 API key
2. MVP connectivity/stability 階段，不做 security hardening
3. Nova 是獨立項目，完全 out-of-scope
4. 不要處理 domain / HTTPS / Cloudflare
5. 不要讓用戶手動貼 New API token（已有 auto-provision）
6. 除非 token 外洩或 production 無法使用，安全債先記錄不插隊

當前階段：V33 Release Hardening 完成 ✅
V33 已完成 12 輪（Phase 1-6），3 個 P0 全部修復並在 production 驗證
核心檔案控制良好：nexus-ops 3,684 行，nexus-store 4,679 行，image-adapter 401 行（zero drift）
Release Hardening 詳細記錄在 NEXUS_RELEASE_HARDENING_HANDOFF.md

已修復項目（V30-V33）
V30-V31 核心修復
✅ /api/chat、agent stream SSE、Graph Brain smoke test 全部 PASS
✅ model_usage_ledger 三條 sourceType 都 succeeded
✅ idempotency pending lock → 過期自動 takeover
✅ stream abort → orphan task 修復（signal passthrough + reader.releaseLock）
✅ Sync counter "1 syncing" 卡住 → forceCleanStaleSyncing()
✅ Graph Delete → window.confirm()
✅ ResizeObserver N+1 → 單一 root observer
✅ syncHistoricalArtifact no-op → offline queue
✅ saveArtifact fire-and-forget → offline queue
✅ Image gen catalog converge → img2 only（GPT Image 2 label，無 gpt-image-2 暴露）

Phase 2A — State Diet + Dead Code
✅ Zundo limit 50→20（記憶體 -60%）
✅ IndexedDB cache strip（artifactVault, notebooksCache, deletedNotebooksCache 移除）
✅ nexus-ops dead code removal（-97 lines，duplicate rightDockPanels + dead helpers + unused imports）

Phase 2B — Connector Hooks + Read-Model
✅ Connector hooks: useTopBarProps, useRightDockProps, useAgentSettingsSidebarProps
✅ Workflow Pro read-model: useWorkflowProReadModel（10 useMemo → 1 hook）
✅ nexus-ops.tsx: 3,764 → 3,676 lines

Riverflow v2.5 Fast 圖片模型
✅ Catalog entry: riverflow-v2.5-fast → sourceful/riverflow-v2.5-fast（Free+）
✅ Plan access: Free/Basic/Pro/Team，multiplier=1
✅ Composer option: "Riverflow v2.5 Fast" 並排 "GPT Image 2"
✅ Chat-completions adapter path（sourceful/* → /v1/chat/completions, no modalities）
✅ VPS OpenRouter ch3: base_url + API key 已設定，ModelRatio=0

V33 Release Hardening — P0 修復（Phase 2）
✅ P0-3: Artifact base64 storage — uploadBase64ContentUrl → Supabase Storage, toVaultRecord filter
✅ P0-1: 44 conflicted sync operations — compactAllConflictedOperations + server SQL cleanup（44→0）
✅ P0-2: Sync retry silent auth failure — CustomEvent bridge（nexus:sync-auth-required → Identity Gate）

V33 Release Hardening — P1 UX（Phase 3）
✅ P1-1: Workspace menu STREAM/ROLE badges removed
✅ P1-2: Composer quality selector hidden for riverflow（supportsQuality metadata）

V33 技術債收斂（Phase 4-5）
✅ accessToken propagation fix（uploadBase64ContentUrl 第四參數）
✅ V29_TECH_DEBT_CROSS_REFERENCE.md deprecated header
✅ #40 model catalog retry loop re-added to ledger
✅ Regression smoke: 9/9 static checks PASS
✅ DB baseline update

V33 Production Deploy（Phase 6）
✅ Merged to main, deployed to Vercel
✅ Server SQL: 44 conflicted → 0 compacted
✅ Production smoke: 5/5 DB checks PASS, /api/chat alive
✅ 1 stale memory_compress task cleaned

Docs 完成
✅ 四份 living docs 全部對齊（CURRENT_STATE, TECH_DEBT_LEDGER, AGENT_HANDOFF, SMOKE_TESTS）
✅ NEXUS_RELEASE_HARDENING_HANDOFF.md（8-agent deep dive + 完整 V33 roadmap）
✅ NEXUS_ADD_MODEL_GUIDE.md（LLM/VLLM/MLLM 新增教學）
✅ Obsidian 部署筆記已更新（V32 full refresh）
✅ V33 final report with DB baseline comparison

剩餘 known issues（不阻擋上架）
⬜ 3 stuck agent_tasks（6/17，非 critical）
⬜ 5 NULL source_type model_usage_ledger records
⬜ 9 old base64 artifact records in DB（UI filtered, new records use Storage）
⬜ #40 model catalog retry loop（recorded in ledger, not yet fixed）
⬜ P1-2 composer reasoning mode（診斷 root cause 完成，未實作 UI fix）
⬜ P1-3 default agent prompt 不符合 NEXUS 定位
⬜ P1-4 agent/workspace name 可辨識性不足
⬜ P1-5 New API VPS healthcheck endpoint
⬜ P1-6 Supabase security advisors 分類
