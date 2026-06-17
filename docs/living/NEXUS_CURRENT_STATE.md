# NEXUS Current State

> 最後更新：2026-06-18 AEST
> 版本：V31 (all fixes merged to `main`, latest: `e7d41c1`)

---

## Production

| 項目 | 值 |
|---|---|
| URL | `https://nexus-swart-ten.vercel.app` |
| GitHub | `sean0900108489-cpu/NEXUS` |
| Branch | `main` (production), `codex/v30` (dev, PR #6 merged) |
| Deploy | Vercel (auto from main) |
| Latest deploy commit | `e7d41c1` |
| Deploy status | ✅ READY (6/6 post-deploy smoke PASS) |

## Backend

| 服務 | 狀態 |
|---|---|
| `/api/chat` | ✅ Live |
| `/api/v1/agents/[agentId]/stream` SSE | ✅ Live |
| `/api/workflow-pro/brain-draft` Graph Brain | ✅ Live |
| `/api/model-gateway/provision` | ✅ Live |
| `model_usage_ledger` | ✅ Recording |
| `agent_tasks` | ✅ Completed tasks visible |
| `messages` | ✅ Assistant output correct |
| Idempotency lock | ✅ Fixed (takeover expired pending) |
| Stream abort | ✅ Fixed (signal passthrough + reader cancel) |
| Sync counter | ✅ Fixed (stale syncing recovery) |
| Graph delete confirm | ✅ Fixed (window.confirm) |

## V30 → V31 Fixes (all merged to main)

| # | 修復 | Commit | 檔案 |
|---|---|---|---|
| P0-5 | Idempotency lock takeover | `fa0a294` | `idempotency-repository.ts` |
| P0-6 | Stream abort orphan tasks | `fa0a294` | `provider-adapter.ts` |
| P0-1 | Sync stuck "1 syncing" | `044400a` | `local-sync-queue-adapter.ts` |
| P0-3 | Graph delete confirm | `044400a` | `nexus-ops.tsx` |
| P1-1 | ResizeObserver N+1 | `67c4d17` | `nexus-agent-window.tsx` |
| P1-2 | Artifact offline queue | `67c4d17` | `state-sync.ts` |
| P1-2 | syncHistoricalArtifact no-op | `67c4d17` | `state-sync.ts` |
| P1-4 | Image gen catalog converge | `67c4d17` → `e7d41c1` | `image-generation-settings.ts`, `plan-config.ts` |

## Image Gen

| 項目 | 值 |
|---|---|
| Composer model | `img2` only (label: "GPT Image 2") |
| Catalog mapping | `img2` → `new_api_model: "gpt-image-2"` |
| Plan gate | img2 in Free+ |
| Default | img2 |

## Database

| 項目 | 值 |
|---|---|
| Supabase | `xjuglddxwnikvcwxfbzg` (ap-southeast-2) |
| plan_config | Free → deepseek-chat, gpt-4o-mini; Basic → +v4-flash; Pro → +v4-pro; Team → same as Pro |

## New API VPS

| 項目 | 值 |
|---|---|
| IP | `170.64.201.54` |
| SSH | `ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54` |
| Channel | DeepSeek (deepseek-chat, v4-flash, v4-pro) |
| ModelRatio | All 0 (MVP intentional) |
| Ops guide | `docs/NEW_API_OPS_GUIDE.md` |

## Living Docs

- `docs/living/NEXUS_CURRENT_STATE.md` ← this file
- `docs/living/NEXUS_TECH_DEBT_LEDGER.md`
- `docs/living/NEXUS_SMOKE_TESTS.md`
- `docs/living/NEXUS_MODEL_GATEWAY.md`
- `docs/living/NEXUS_AGENT_HANDOFF.md`
- `docs/living/NEXUS_AGENT_REPORT_TEMPLATE.md`
- `docs/NEW_API_OPS_GUIDE.md`
- `docs/V29_HANDOFF.md`
- `docs/V29_TECH_DEBT_CROSS_REFERENCE.md`
