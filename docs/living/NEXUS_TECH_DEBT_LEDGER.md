# NEXUS Tech Debt Ledger

> 最後更新：2026-06-18 AEST
> 版本：V32 (Phase 2B complete, commit `59eb863`)

---

## Fixed (V30 → V31)

### P0 — Fixed in V30

| # | 問題 | 修復 | Commit | 檔案 |
|---|---|---|---|---|
| 5 | Idempotency pending lock 24h no takeover | Takeover expired pending records | `fa0a294` | `idempotency-repository.ts` |
| 6 | Stream abort → orphan streaming tasks | signal passthrough + reader.releaseLock | `fa0a294` | `provider-adapter.ts` |
| 8 | Sync stuck at "1 syncing" | forceCleanStaleSyncing() in flush() | `044400a` | `local-sync-queue-adapter.ts` |
| 10 | Graph Delete no confirm | window.confirm() guard | `044400a` | `nexus-ops.tsx` |

### P1 — Fixed in V31

| # | 問題 | 修復 | Commit | 檔案 |
|---|---|---|---|---|
| 17 | Per-agent ResizeObserver N+1 | Single root observer | `67c4d17` | `nexus-agent-window.tsx` |
| 29 | Artifact no offline queue | saveArtifact → localSyncQueueAdapter | `67c4d17` | `state-sync.ts` |
| 30 | syncHistoricalArtifact no-op | Enqueues to localSyncQueueAdapter | `67c4d17` | `state-sync.ts` |
| 13 | Image gen catalog mismatch | Converged to img2 only | `e7d41c1` | `image-generation-settings.ts`, `plan-config.ts` |

## Phase 2A — Fixed

| # | 問題 | 修復 | Commit |
|---|---|---|---|
| 19 | Zundo undo stack stores full workspace | limit 50→20 | `52ca0ac` |
| — | IndexedDB cache bloat | Stripped artifactVault, notebooksCache, deletedNotebooksCache from persist | `52ca0ac` |
| — | Dead code in nexus-ops.tsx | Removed duplicate rightDockPanels, dead helpers, unused imports (-97 lines) | `fbfbd48` |

## Phase 2B — Completed (no new tech debt, only improvements)

| # | 變更 | Commit |
|---|---|---|
| PR 1 | Connector hooks: useTopBarProps, useRightDockProps, useAgentSettingsSidebarProps | `2605f98` |
| PR 2 | Workflow Pro read-model extraction: useWorkflowProReadModel | `d2f35e2` |
| — | Riverflow v2.5 Fast image model added | `59eb863` |

## Remaining Debt

### Architecture

| # | 問題 | 狀態 |
|---|---|---|
| 18 | SSE handler in NexusOps root | 未處理 |
| 20 | reasoningContent persist bloat | 未處理 |
| 28 | Macro save no local queue | 未處理 |
| 33 | NexusOps god object | 未處理（connector hooks + read-model extracted in Phase 2B） |
| 40 | Model catalog retry loop 無上限重試（nexus-ops.tsx:1278, setTimeout 3s forever） | 未處理 — 從 ledger 被移除但從未修復，V33 審計重新發現 |
| 42 | Sync queue polling 2s | 未處理 |
| 23 | /api/models contract drift | 未處理 |
| 11 | Duplicate agent names (cosmetic UX) | 未處理 |

### Image Gen

| # | 問題 | 狀態 |
|---|---|---|
| — | Composer quality UI (standard/high/ultra) shown for all models regardless of support | ✅ Fixed (V33p3 R5) — quality select hidden when model doesn't support it |
| — | Image adapter routes hardcoded per prefix — no model-capability metadata | 未處理 — should derive from catalog |

### Out of Scope (MVP)

| 項目 | 原因 |
|---|---|
| Nova RAG tables | Separate project |
| Audit log / RLS security hardening | Post-MVP |
| Domain / HTTPS / Cloudflare | Post-MVP |
| Full NexusOps rewrite | P2 architecture |
| ModelRatio = 0 | VPS config, intentional for MVP |
