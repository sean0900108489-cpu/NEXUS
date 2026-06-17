# NEXUS Tech Debt Ledger

> 最後更新：2026-06-18 AEST
> 版本：V31 (all fixes merged to `main`, latest: `e7d41c1`)

---

## Fixed (V30 → V31)

### P0 — Fixed in V30

| # | 問題 | 修復 | Commit | 檔案 |
|---|---|---|---|---|
| 5 | Idempotency pending lock 24h no takeover | Takeover expired pending records | `fa0a294` | `idempotency-repository.ts` |
| 6 | Stream abort → orphan streaming tasks | signal passthrough + reader.releaseLock | `fa0a294` | `provider-adapter.ts` |
| 8 | Sync stuck at "1 syncing" | forceCleanStaleSyncing() in flush() | `044400a` | `local-sync-queue-adapter.ts` |
| 10 | Graph Delete no confirm | window.confirm() guard | `044400a` | `nexus-ops.tsx` |
| — | Post-deploy docs + living docs | docs/living/ directory | `072a45f` | new files |

### P1 — Fixed in V31

| # | 問題 | 修復 | Commit | 檔案 |
|---|---|---|---|---|
| 17 | Per-agent ResizeObserver N+1 | Removed per-agent observer; root owns single | `67c4d17` | `nexus-agent-window.tsx` |
| 29 | Artifact no offline queue | saveArtifact → localSyncQueueAdapter | `67c4d17` | `state-sync.ts` |
| 30 | syncHistoricalArtifact no-op | Enqueues to localSyncQueueAdapter | `67c4d17` | `state-sync.ts` |
| 13 | Image gen catalog mismatch | Converged to img2 only (label: GPT Image 2) | `e7d41c1` | `image-generation-settings.ts`, `plan-config.ts` |
| 12 | Composer reasoning mode | Source-of-truth documented | — | N/A |

---

## Remaining Debt

### P2 — Architecture

| # | 問題 | 來源報告 |
|---|---|---|
| 18 | SSE handler in NexusOps root | Report 01 |
| 19 | Zundo undo stack stores full workspace | Report 02 |
| 20 | reasoningContent persist bloat | Report 02 |
| 28 | Macro save no local queue | Report 05 |
| 33 | NexusOps god object | Report 01 |
| 34 | Ephemeral UI in document state | Report 02 |
| 35 | Workflow runtime in store action | Report 02 |
| 36 | Store persist full workspace | Report 02 |
| 37 | /api/agent-stream legacy path | Report 03 |
| 38 | Docs drift | Report 06 |
| 39 | React Flow panel recompute | Dalton report |
| 40 | Model catalog retry loop forever | Report 01 |
| 41 | Auth/recovery race | Report 01 |
| 42 | Sync queue polling 2s | Report 01 |
| 43 | Schema-live gate RLS coverage narrow | Report 06 |
| 44 | Gate scripts no TypeScript | Report 06 |
| 23 | /api/models contract drift | Report 03 |
| 11 | Duplicate agent names (cosmetic UX) | Atlas |
| 14-16 | Export wording/placeholders/names | Atlas |

### Out of Scope (MVP)

| 項目 | 原因 |
|---|---|
| Nova RAG tables (#24) | Separate project, not NEXUS MVP |
| Audit log SECURITY DEFINER (#25) | Security hardening phase |
| user_new_api_tokens search_path (#26) | Security hardening phase |
| model_usage_ledger grant (#27) | Security hardening phase |
| Domain / HTTPS / Cloudflare | Post-MVP |
| Full NexusOps rewrite | P2 architecture |
| Schema-live / blackbox CI gates (#31-32) | P2 |
| ModelRatio = 0 | VPS config, intentional for MVP |
