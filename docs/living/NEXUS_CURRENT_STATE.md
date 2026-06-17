# NEXUS Current State

> 最後更新：2026-06-17 23:30 AEST
> 版本：V30 (branch `codex/v30`, deployed `fa0a294` on `main`)

---

## Production

| 項目 | 值 |
|---|---|
| URL | `https://nexus-swart-ten.vercel.app` |
| GitHub | `sean0900108489-cpu/NEXUS` |
| Branch | `main` (production), `codex/v30` (dev, PR #6 open) |
| Deploy | Vercel (auto from main) |
| Latest deploy commit | `fa0a294` |
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
| New API VPS | `170.64.201.54` Docker, port 80→3000 |
| Token provision | Python microservice port 3002 |
| Idempotency lock | ✅ Fixed (takeover expired pending) |
| Stream abort | ✅ Fixed (signal passthrough + reader cancel) |
| Sync counter | ✅ Fixed (stale syncing recovery) |
| Graph delete confirm | ✅ Fixed (window.confirm) |

## Database

| 項目 | 值 |
|---|---|
| Supabase | `xjuglddxwnikvcwxfbzg` (ap-southeast-2) |
| RLS | Service role only for sensitive tables |
| plan_config | Free → deepseek-chat, gpt-4o-mini; Basic → +v4-flash; Pro → +v4-pro; Team → same as Pro |

## Living Docs

- `docs/living/NEXUS_CURRENT_STATE.md` ← this file
- `docs/living/NEXUS_TECH_DEBT_LEDGER.md` ← debt with priorities
- `docs/living/NEXUS_SMOKE_TESTS.md` ← smoke test history
- `docs/living/NEXUS_MODEL_GATEWAY.md` ← gateway architecture
- `docs/living/NEXUS_AGENT_HANDOFF.md` ← next-agent startup
- `docs/living/NEXUS_AGENT_REPORT_TEMPLATE.md` ← iteration report template
