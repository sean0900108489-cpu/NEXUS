# NEXUS Tech Debt Ledger

> 最後更新：2026-06-18
> 版本：V30 → V31

---

## Active Debt (by priority)

### P0 — Fixed in V30

| # | 問題 | 修復 | 檔案 |
|---|---|---|---|
| 5 | Idempotency pending lock 24h no takeover | Takeover expired pending records | `idempotency-repository.ts` |
| 6 | Stream abort → orphan streaming tasks | signal passthrough + reader.releaseLock | `provider-adapter.ts` |
| 8 | Sync stuck at "1 syncing" | Terminal state guarantee in save/export | `local-sync-queue-adapter.ts` |
| 9 | Maximize triggers Branch UI | Fixed action mapping | Verified, no code path overlap |
| 10 | Graph Delete no confirm | Added window.confirm guard | `nexus-ops.tsx` |

### P1 — Fixed in V31

| # | 問題 | 修復 | 檔案 |
|---|---|---|---|
| 17 | Per-agent ResizeObserver N+1 polling | Removed per-agent observer; NexusOps root owns single observer | `nexus-agent-window.tsx` (-40 lines) |
| 29 | Artifact no offline queue | saveArtifact → localSyncQueueAdapter.enqueue | `state-sync.ts` |
| 30 | syncHistoricalArtifact is no-op | Now enqueues to localSyncQueueAdapter | `state-sync.ts` |
| 12 | Composer reasoning mode drift | Source-of-truth documented: composerModeByAgentId × agent.modelSettings | No code change needed |
| 13 | Image gen model id not in catalog | Converged to img2/gpt-image-2; added gpt-image-2 to plan-config | `image-generation-settings.ts`, `plan-config.ts` |

### P2 — Architecture debt

| # | 問題 | 來源報告 |
|---|---|---|
| 18 | SSE handler in NexusOps root | Report 01 |
| 19 | Zundo undo stack stores full workspace | Report 02 |
| 20 | reasoningContent persist bloat | Report 02 |
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
| 11 | Duplicate agent names (cosmetic) | Atlas |
| 14-16 | Export wording/placeholders/names | Atlas |

---

## Out of Scope (MVP)

| 項目 | 原因 |
|---|---|
| Nova RAG tables (#24) | Separate project |
| Audit log SECURITY DEFINER (#25) | Security hardening phase |
| Domain / HTTPS / Cloudflare | Post-MVP |
| Full NexusOps rewrite | P2 architecture |
| Schema-live / blackbox CI gates | P2 |
