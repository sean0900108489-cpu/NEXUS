# NEXUS Smoke Tests

> 最後更新：2026-06-17 23:30 AEST
> 版本：V30 post-deploy (fa0a294)

---

## Post-Deploy Verification (Production)

| # | Endpoint | Status | Details |
|---|---|---|---|
| 1 | `POST /api/chat` | ✅ PASS | deepseek-chat → "POST_DEPLOY_OK" |
| 2 | `POST /api/v1/agents/[agentId]/stream` (SSE) | ✅ PASS | meta→token→done, 無 error |
| 3 | `POST /api/workflow-pro/brain-draft` (Graph Brain) | ✅ PASS | 3 nodes, 2 edges, 1 output, all ids present |
| 4 | `model_usage_ledger` latest | ✅ PASS | operator_chat, agent_stream, brain_draft 全部 succeeded |
| 5 | `agent_tasks` latest | ✅ PASS | latest task completed |
| 6 | `messages` latest assistant | ✅ PASS | content = "STREAM_POST_DEPLOY_OK" |

---

## Backend Model Gateway Smoke (V29 → V30)

| # | Endpoint | Status | Details |
|---|---|---|---|
| 1 | `POST /api/chat` | ✅ PASS | deepseek-chat via VPS New API |
| 2 | `POST /api/v1/agents/[agentId]/stream` (SSE) | ✅ PASS | meta→token→done, no errors |
| 3 | `POST /api/workflow-pro/brain-draft` (Graph Brain) | ✅ PASS | schema repair working, outputs/nodes/edges all have id |
| 4 | `model_usage_ledger` records | ✅ PASS | operator_chat, agent_stream, brain_draft all succeeded |
| 5 | deepseek-v4-flash/pro routing | ✅ OK | VPS channel includes v4 models; plan gate blocks Free users correctly; ModelRatio=0 intentional for MVP |
| 6 | Idempotency lock 24h takeover | ✅ FIXED (V30) | Expired pending records now return miss (takeover) |
| 7 | Stream abort → orphan tasks | ✅ FIXED (V30) | decodeOpenAIStream now accepts AbortSignal, cancels reader |

---

## UI Reliability Smoke (Atlas Report → V30)

| # | Issue | V30 Status | Details |
|---|---|---|---|
| 8 | Sync stuck at "1 syncing" | FIXED | forceCleanStaleSyncing() recovers stale syncing records after 2min |
| 9 | Maximize triggers Branch UI | Verified | Explicit callbacks, no code path overlap; CSS/z-index visual only |
| 10 | Graph Delete no confirm | FIXED | window.confirm() on agent/edge/node remove |
| 11 | Duplicate agent names | P1 UX | Agents use id-based keys; name collision is cosmetic |
| 12 | Composer reasoning mode changes | P1 | Mode source-of-truth: composer mode state x agent modelSettings |
| 13 | Image gen model id not in catalog | P1 | Need to converge to img2/gpt-image-2 or disable mock |
| 14 | Export style pack wording | P2 | Cosmetic |
| 15 | Attachment placeholder | P2 | Cosmetic |
| 16 | Duplicate workspace names | P2 | Cosmetic |

---

## Test Methodology

- Backend: direct Node.js fetch against production `https://nexus-swart-ten.vercel.app`
- Auth: Supabase session token from user `sean00000@gmail.com`
- UI: Atlas browser-based smoke test
- Post-deploy: fresh session token, production endpoint, 2026-06-17 23:27 AEST
