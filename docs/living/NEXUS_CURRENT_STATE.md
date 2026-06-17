# NEXUS Current State

> 最後更新：2026-06-17
> 版本：V30 (branch `codex/v30`)

---

## Production

| 項目 | 值 |
|---|---|
| URL | `https://nexus-swart-ten.vercel.app` |
| GitHub | `sean0900108489-cpu/NEXUS` |
| Branch | `codex/v30` (dev), `main` (production) |
| Deploy | Vercel (auto from main) |

## Backend

| 服務 | 狀態 |
|---|---|
| `/api/chat` | ✅ Live (deepseek-chat, deepseek-v4-flash, deepseek-v4-pro) |
| `/api/v1/agents/[agentId]/stream` SSE | ✅ Live |
| `/api/workflow-pro/brain-draft` Graph Brain | ✅ Live |
| `/api/model-gateway/provision` | ✅ Live |
| `model_usage_ledger` | ✅ operator_chat, agent_stream, brain_draft |
| New API VPS | `170.64.201.54` Docker, port 80→3000 |
| Token provision | Python microservice port 3002 |
| Idempotency lock | ✅ Fixed (takeover expired pending) |
| Stream abort | ✅ Fixed (signal passthrough + reader cancel) |

## Database

| 項目 | 值 |
|---|---|
| Supabase | `xjuglddxwnikvcwxfbzg` (ap-southeast-2) |
| RLS | Service role only for sensitive tables |
| plan_config | Free → deepseek-chat, gpt-4o-mini; Basic → +v4-flash; Pro → +v4-pro; Team → same as Pro |

## Known Issues

See `NEXUS_TECH_DEBT_LEDGER.md` for full list.

Active P1:
- ResizeObserver N+1 polling
- SSE handler in NexusOps root
- Zundo undo stack bloat
- reasoningContent persist
- Artifact sync durability
- Duplicate agent names (UX)
- Composer reasoning mode drift
- Image gen catalog mismatch

## Next Steps

V30 P1 items above. Choose one and start.
