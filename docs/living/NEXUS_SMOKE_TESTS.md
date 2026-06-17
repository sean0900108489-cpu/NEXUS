# NEXUS Smoke Tests

Last updated: 2026-06-17 12:11 UTC / 22:11 Australia/Sydney
Updated by: ChatGPT Atlas handoff session

## Scope

This smoke doc tracks MVP production checks only. It should not expand into domain/HTTPS, Cloudflare, IP allowlist, full RLS hardening, Nova, or broad security-hardening work unless a true P0 leak/bypass/data-loss issue is found.

## Production target

- App: https://nexus-swart-ten.vercel.app
- Supabase project ref: `xjuglddxwnikvcwxfbzg`
- New API base configured in Vercel: `http://170.64.201.54/v1`
- Latest runtime commit under verification: `fa0a294e194f8e371e6ca4649269ae9dcffceddc`

## P0 smoke matrix

| Check | Expected | Latest observed status | Notes |
| --- | --- | --- | --- |
| Production root | NEXUS Identity Gate loads | PASS | Root page served `NEXUS // AI OPS` / Identity Gate. |
| Vercel deploy for `fa0a294` | Commit status success / READY equivalent | PASS | GitHub combined status returned Vercel `success`. |
| `/api/chat` with `deepseek-chat` | Authenticated POST succeeds and writes `operator_chat` ledger row | LATEST KNOWN PASS, NEEDS POST-DEPLOY REPLAY | Latest observed `operator_chat` success was `2026-06-17 11:42:12 UTC`, before the `fa0a294` timestamp boundary. |
| `/api/v1/agents/[agentId]/stream` | SSE emits normal stream, task completes, assistant message persists, `agent_stream` ledger succeeds | PASS POST-COMMIT | Post-commit success at `2026-06-17 11:59:50 UTC`; related task completed and assistant message persisted. |
| `/api/workflow-pro/brain-draft` | Authenticated POST returns valid Graph Brain draft and writes `brain_draft` ledger row | LATEST KNOWN PASS, NEEDS POST-DEPLOY REPLAY | Latest observed `brain_draft` success was `2026-06-17 10:25:22 UTC`, before the `fa0a294` timestamp boundary. |
| `model_usage_ledger` latest rows | No unexplained gateway blocker; failures are explainable by plan/token state | PASS WITH NOTES | Recent expected failures included `PERMISSION_DENIED` for gated v4 model and `USER_NEW_API_TOKEN_NOT_CONFIGURED` for a user without mapping. |
| `agent_tasks` latest rows | Latest chat task completed with no error | PASS POST-COMMIT | Latest post-commit chat task completed at `2026-06-17 11:59:49 UTC`. |
| `messages` latest assistant output | Assistant output persisted | PASS POST-COMMIT | Latest post-commit assistant message persisted at `2026-06-17 11:59:48 UTC`. |

## Exact DB observations captured

Boundary used: `2026-06-17 11:49:37 UTC`, the observed commit timestamp for `fa0a294`.

Post-boundary rows:

- `model_usage_ledger`: `agent_stream`, `succeeded`, `error_code = null`, model `gpt-4o-mini`, total tokens `335`, charged points `1`, created at `2026-06-17 11:59:50 UTC`.
- `agent_tasks`: `chat`, `completed`, `error_code = null`, updated at `2026-06-17 11:59:49 UTC`, output message present.
- `messages`: assistant message, token count `94`, created at `2026-06-17 11:59:48 UTC`.

Recent pre-boundary known-good rows:

- `operator_chat`: `deepseek-chat`, `succeeded`, `error_code = null`, total tokens `21`, created at `2026-06-17 11:42:12 UTC`.
- `brain_draft`: `deepseek-chat`, `succeeded`, `error_code = null`, total tokens `2579`, created at `2026-06-17 10:25:22 UTC`.

## Follow-up required for full post-deploy PASS

A logged-in production session should replay:

1. `/api/chat` with `deepseek-chat`
2. `/api/workflow-pro/brain-draft` with Graph Brain THINK enabled

Then verify new rows appear after the replay time:

```sql
select created_at, source_type, status, error_code, model_id, new_api_model, provider_family, total_tokens, charged_points
from public.model_usage_ledger
where created_at >= timestamp with time zone '<replay-start-utc>'
order by created_at desc;
```

Do not ask Sean to paste a New API token. If a 403 appears, inspect `model_usage_ledger.error_code` first before guessing.
