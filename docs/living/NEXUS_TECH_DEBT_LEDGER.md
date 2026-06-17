# NEXUS Tech Debt Ledger

> 最後更新：2026-06-17
> 版本：V30

---

## Active Debt (by priority)

### P0 — Fixed in V30

| # | 問題 | 修復 | 檔案 |
|---|---|---|---|
| 5 | Idempotency pending lock 24h no takeover | Takeover expired pending records | `idempotency-repository.ts` |
| 6 | Stream abort → orphan streaming tasks | signal passthrough + reader.releaseLock | `provider-adapter.ts` |
| 8 | Sync stuck at "1 syncing" | Terminal state guarantee in save/export | See V30 commit |
| 9 | Maximize triggers Branch UI | Fixed action mapping | See V30 commit |
| 10 | Graph Delete no confirm | Added window.confirm guard | See V30 commit |

### P1 — Next iteration

| # | 問題 | 來源報告 | 影響 |
|---|---|---|---|
| 17 | Per-agent ResizeObserver N+1 polling | Report 01 | Main thread saturation |
| 18 | SSE handler in NexusOps root | Report 01 | Token-by-token root re-render |
| 19 | Zundo undo stack stores full workspace | Report 02 | Memory pressure |
| 20 | reasoningContent persist bloat | Report 02 | IndexedDB/zundo bloat |
| 29 | Artifact no offline queue | Report 05 | Data loss on failure |
| 30 | syncHistoricalArtifact is no-op | Report 05 | Data loss risk |
| 11 | Duplicate agent names (cosmetic) | Atlas | UX ambiguity, id-based keys safe |
| 12 | Composer reasoning mode drift | Atlas | Mode state management |
| 13 | Image gen model id not in catalog | Atlas | Needs converge/disabling |

### P2 — Architecture debt

| # | 問題 | 來源報告 |
|---|---|---|
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
