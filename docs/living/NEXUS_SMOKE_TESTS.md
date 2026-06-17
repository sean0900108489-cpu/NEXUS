# NEXUS Smoke Tests

> 最後更新：2026-06-18 AEST
> 版本：V31 (deployed `e7d41c1`)

---

## Post-Deploy Verification (Production)

| # | Endpoint | Status | Details |
|---|---|---|---|
| 1 | `POST /api/chat` | ✅ PASS | deepseek-chat → "POST_DEPLOY_OK" |
| 2 | `POST /api/v1/agents/[agentId]/stream` SSE | ✅ PASS | meta→token→done, no errors |
| 3 | `POST /api/workflow-pro/brain-draft` Graph Brain | ✅ PASS | 3 nodes, 2 edges, 1 output, all ids present |
| 4 | `model_usage_ledger` latest | ✅ PASS | operator_chat, agent_stream, brain_draft all succeeded |
| 5 | `agent_tasks` latest | ✅ PASS | latest task completed |
| 6 | `messages` latest assistant | ✅ PASS | content = "STREAM_POST_DEPLOY_OK" |

---

## Backend Model Gateway

| # | Endpoint | Status |
|---|---|---|
| 1 | `/api/chat` | ✅ PASS |
| 2 | Agent stream SSE | ✅ PASS |
| 3 | Graph Brain | ✅ PASS |
| 4 | Usage ledger | ✅ PASS |
| 5 | deepseek-v4-flash/pro routing | ✅ OK (plan gate blocks Free correctly; VPS channel OK) |
| 6 | Idempotency lock takeover | ✅ FIXED |
| 7 | Stream abort → orphan tasks | ✅ FIXED |

---

## UI Reliability

| # | Issue | Status | Details |
|---|---|---|---|
| 8 | Sync stuck at "1 syncing" | ✅ FIXED | forceCleanStaleSyncing() recovers after 2min |
| 9 | Maximize triggers Branch UI | ✅ Verified | Explicit callbacks, no code path overlap |
| 10 | Graph Delete no confirm | ✅ FIXED | window.confirm() guard |
| 17 | ResizeObserver N+1 | ✅ FIXED | Single root observer |
| 29-30 | Artifact sync durability | ✅ FIXED | Offline queue + historical queue |
| 13 | Image gen catalog | ✅ FIXED | img2 only, label "GPT Image 2" |

---

## Test Methodology

- Backend: direct Node.js fetch against production `https://nexus-swart-ten.vercel.app`
- Auth: Supabase session token from user `sean00000@gmail.com`
- UI: Atlas browser-based smoke test
- Post-deploy: fresh session token, 2026-06-17 23:27 AEST
