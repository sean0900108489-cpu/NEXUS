<!--
  ╔══════════════════════════════════════════════════════════════╗
  ║  DEPRECATED — 2026-06-18 (V33)                              ║
  ║                                                              ║
  ║  This file is a historical snapshot from V29. Many issues    ║
  ║  marked "尚未處理" have since been fixed in V30-V33.         ║
  ║                                                              ║
  ║  AUTHORITY SOURCE for current tech debt status:              ║
  ║  → docs/living/NEXUS_TECH_DEBT_LEDGER.md                    ║
  ║                                                              ║
  ║  Do not use this file for planning or auditing.              ║
  ╚══════════════════════════════════════════════════════════════╝
-->

# V29 迭代技術債交叉對照 (DEPRECATED)

> 生成時間：2026-06-17  
> 來源：6 份技術債子代理報告 × V29 實際修復  
> Obsidian 原始報告：`Nexus技術債子代理報告/01-06`

---

## V29 已處理項目（本迭代完成）

| # | 問題 | 來源報告 | 修復內容 | 檔案 |
|---|---|---|---|---|
| 1 | deepseek-v4 未在 server catalog | 新功能 | 新增 `deepseek-v4-pro`, `deepseek-v4-flash` | `src/lib/backend/models/model-catalog.ts` |
| 2 | `isModelAllowedByPlan` 白名單缺 v4 模型 | 新功能 | 加入 Basic/Pro/Team 的 `allowedModelIds` | `src/lib/backend/models/plan-config.ts` |
| 3 | brain-draft production 被封鎖 | Report 03 (legacy block) | Whitelist `brain-draft`，加入 production whitelist | `src/lib/backend/security/legacy-tool-route-boundary.ts` |
| 4 | brain-draft 缺 product gate | Report 03 | 加入 `resolveApiActor` + `getUserPlan` + `assertModelAllowedForPlan` + `isModelAllowedByPlan` | `src/app/api/workflow-pro/brain-draft/route.ts` |
| 5 | brain-draft 缺 usage ledger | Report 03 | 成功/失敗皆寫 `brain_draft` sourceType 到 `model_usage_ledger` | 同上 |
| 6 | brain-draft LLM output schema 不穩定 | 壓測發現 | 加入 `repairBrainReviewProposal()` — 自動補 `schema`、`outputs[].id`、`nodes[].id`、`edges[].id` | 同上 |
| 7 | agent-stream production 被封鎖 | Report 03 | Whitelist `agent-stream`（legacy 過渡，前端已改用 V1） | `src/lib/backend/security/legacy-tool-route-boundary.ts` |
| 8 | Message 無上限累積 → 瀏覽器 OOM | Report 02 (State ownership) | `addMessage` 自動 `.slice(-80)` | `src/store/nexus-store.ts` |
| 9 | reasoningContent 無上限累積 → 瀏覽器 OOM | Report 02 (Undo stack) | `appendReasoningToMessage` 只保留最後 8192 chars | `src/store/nexus-store.ts` |
| 10 | Token-by-token root re-render → UI freeze | Report 01 (Section 1.K) | Content token 30ms batch, reasoning 50ms batch | `src/components/nexus/nexus-ops.tsx` |
| 11 | `reasoningContent` 渲染欄位名不匹配 | 壓測發現 | 修正 `nexus-agent-window.tsx` 讀取 `reasoningContent` | `src/components/nexus/nexus-agent-window.tsx` |
| 12 | New API ModelRatio 未設定 | VPS 部署 | 所有 14 模型設為 0（⚠️ 正式上線前須改） | VPS `/opt/new-api/data/one-api.db` |
| 13 | New API STREAMING_TIMEOUT 預設 120s 太短 | 壓測發現 | 設為 600s + RELAY_TIMEOUT=600s | VPS `docker-compose.yml` |
| 14 | VPS 無 token provision 機制 | 新功能 | Python microservice on port 3002 + admin Bearer auth + iptables rate limit | VPS `/opt/new-api/token-provision-server.py` |
| 15 | NEXUS 無 platform-managed provisioning | 新功能 | `POST /api/model-gateway/provision` — auto provision, encrypt, upsert to Supabase | `src/app/api/model-gateway/provision/route.ts` |
| 16 | UI 顯示手動 token 輸入 | 新功能 | `GatewayProvisionButton` — 按需 Initialize/Repair，不顯示 token | `src/components/nexus/nexus-agent-settings-sidebar.tsx` |

---

## 尚未處理的技術債（從 6 份報告提取）

### P1 — 下次迭代應優先處理

| # | 問題 | 來源報告 | 影響 |
|---|---|---|---|
| 17 | Per-agent 重複 ResizeObserver + 800ms interval（N+1 polling） | Report 01, Section 1.G | 主線程飽和，加速 freeze |
| 18 | SSE stream handler 在 NexusOps root component | Report 01, Section 1.K | Token-by-token root re-render（已 batching 緩解，未根治） |
| 19 | Zundo undo stack 存完整 workspace（含 messages） | Report 02, Section 3 | 50 個 history snapshot × 完整 state → 記憶體壓力 |
| 20 | reasoningContent 仍寫入 IndexedDB/zundo persist | Report 02, Section 3 | 持久化儲存肥大 |
| 21 | Idempotency pending lock 24h no takeover | Report 03, Section 2 | Vercel kill 後 idempotency key 鎖死 24h |
| 22 | Stream abort 不 cancel task → orphan streaming tasks | Report 03, Section 4 | task 卡在 `streaming`，recovery 困住 |
| 23 | `/api/models` 不走 `apiHandler` + envelope | Report 03, Section 1 | Contract drift |
| 24 | Nova RAG 表 (`nova_documents`, `nova_chunks`, `nova_ingest_runs`) anon/authenticated 全開 | Report 04, Section 2 | **安全洞：匿名可讀寫刪全庫 RAG 資料** |
| 25 | `record_permission_audit_log` SECURITY DEFINER 可被 anon call | Report 04, Section 2 | **安全洞：匿名可寫入 audit log** |
| 26 | `user_new_api_tokens` trigger function search_path 未固定 | Report 04, Section 2 | 安全風險 |
| 27 | `model_usage_ledger` grant 過寬（anon/authenticated 有 DML grants） | Report 04, Section 2 | RLS 變更即暴露 |
| 28 | Macro save 無 local queue/idempotency | Report 05, Section 1 | 離線/失敗無 replay |
| 29 | Artifact 無離線 queue | Report 05, Section 1 | 同上 |
| 30 | `syncHistoricalArtifact()` 是 no-op | Report 05, Section 1 | 資料遺失風險 |
| 31 | `check:schema-live` 預設 skipped，不會 fail CI | Report 06, Section 1 | Gate weakness |
| 32 | `check:blackbox-protocols` / `check:auth-boundary:live` 沒進主 `check` | Report 06, Section 1 | 手動 gate，遺忘率高 |

### P2 — 架構債

| # | 問題 | 來源報告 |
|---|---|---|
| 33 | NexusOps 神物件（UI shell + orchestration + sync） | Report 01, Sections A-K |
| 34 | Ephemeral UI state 混在 document state | Report 02, Section 1 |
| 35 | Workflow runtime 在 store action 內同步執行 | Report 02, Section 4 |
| 36 | Store persist 寫完整 workspace（不含 trim） | Report 02, Section 2 |
| 37 | `/api/agent-stream` legacy 路徑仍在 whitelist | Report 03, Section 1 |
| 38 | Docs drift（README 描述與實作不一致） | Report 06, Section 5 |
| 39 | React Flow 在 panel view 也 recompute | Dalton 子代理發現 |
| 40 | Model catalog retry loop 每 3 秒 forever | Report 01, Risk 2 |
| 41 | Auth/recovery race → 可能 infinite render loop | Report 01, Risk 3 |
| 42 | Sync queue status polling 每 2 秒 | Report 01, Risk 4 |
| 43 | Schema-live gate RLS/policy coverage 太窄 | Report 06, Section 1 |
| 44 | Gate scripts 用 `.mjs` 無 TypeScript 保護 | Report 06, Section 3 |

---

## V29 Commit History

```
89918a0 fix: cap messages at 80, reasoningContent at 8KB; batch content tokens 30ms
39e9433 fix: batch reasoning tokens every 50ms; fix reasoningContent render field
e39291a fix: add schema repair for Graph Brain LLM output
03674ed fix: add deepseek-v4-flash/pro to plan; plan gate + usage ledger to brain-draft
af72cdf fix: whitelist brain-draft and agent-stream past legacy production block
8ea3f0a fix: lowercase plan for DB constraint
1c82724 fix: provision via secure port 3002
af4560f feat: platform-managed New API token provisioning
2fd5663 fix: add deepseek-v4-pro and deepseek-v4-flash to server model catalog
```

---

## 下次迭代建議優先級

1. **P0 安全**：#24, #25（Nova RAG + audit log anon access）
2. **P1 可靠性**：#21, #22（idempotency lock + orphan tasks）
3. **P1 效能**：#17, #19（ResizeObserver 去重 + undo stack 減肥）
4. **P1 耐久性**：#29, #30（artifact sync no-op）
5. **P2 架構**：#33（NexusOps 拆分 seam）
