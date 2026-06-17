# NEXUS Current State

> 最後更新：2026-06-18
> 版本：V31 (branch `codex/v30`)

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

## V31 P1 Fixes (on codex/v30, not yet deployed)

| # | 修復 | 檔案 |
|---|---|---|
| P1-1 | ResizeObserver N+1 去重 → single root observer | `nexus-agent-window.tsx` |
| P1-2 | Artifact + historicalArtifact → offline queue | `state-sync.ts` |
| P1-3 | Composer reasoning mode source-of-truth documented | N/A |
| P1-4 | Image gen catalog → img2/gpt-image-2 only | `image-generation-settings.ts`, `plan-config.ts` |

## Image Gen

| 項目 | 值 |
|---|---|
| Composer models | img2, gpt-image-2 (was img2, gpt-image-1, DALL-E 3, Nano Banana) |
| Plan gate | img2 in Free+; gpt-image-2 in Basic/Pro/Team |
| Default | img2 |

## Known Issues

See `NEXUS_TECH_DEBT_LEDGER.md` for full list.

Active P2:
- SSE handler in NexusOps root
- Zundo undo stack bloat
- reasoningContent persist
- NexusOps god object
- Duplicate agent names (UX)
- Export wording/placeholders/names
