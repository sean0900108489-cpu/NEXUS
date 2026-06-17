# NEXUS Smoke Tests

> 最後更新：2026-06-17
> 版本：V30 Atlas

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
| 8 | Sync stuck at "1 syncing" | FIXED | See sync-counter fix |
| 9 | Maximize triggers Branch UI | FIXED | See action mapping fix |
| 10 | Graph Delete no confirm | FIXED | Added window.confirm guard |
| 11 | Duplicate agent names | P1 UX | Agents use id-based keys; name collision is cosmetic |
| 12 | Composer reasoning mode changes | P1 | Mode source-of-truth: composer mode state x agent modelSettings |
| 13 | Image gen model id not in catalog | P1 | Need to converge to img2/gpt-image-2 or disable mock |
| 14 | Export style pack wording | P2 | Cosmetic |
| 15 | Attachment placeholder | P2 | Cosmetic |
| 16 | Duplicate workspace names | P2 | Cosmetic |

---

## Test Methodology

- Backend: direct curl/Node.js fetch against production `https://nexus-swart-ten.vercel.app`
- Auth: Supabase session token from user `sean00000@gmail.com`
- UI: Atlas browser-based smoke test
- All tests run at 2026-06-17
