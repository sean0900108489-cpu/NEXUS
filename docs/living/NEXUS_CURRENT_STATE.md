# NEXUS Current State

Last updated: 2026-06-17 12:11 UTC / 22:11 Australia/Sydney
Updated by: ChatGPT Atlas handoff session

## Product stance

NEXUS is Sean's AI Ops / multi-agent workflow product. It is not a generic chat app and it is not BYOK.

The MVP productization path remains:

Supabase Auth -> Plan Gate -> Server Model Catalog -> Quota Gate -> user_new_api_tokens -> New API -> model_usage_ledger -> durable output.

Provider keys must stay inside New API channels. End users must not paste New API tokens into the NEXUS UI. The frontend should show connected gateway, plan, available models, and usage only.

## Production and deploy status

Production alias: https://nexus-swart-ten.vercel.app

Latest verified code commit before this docs update:

- `fa0a294e194f8e371e6ca4649269ae9dcffceddc`
- Commit message: `fix: P0 reliability — idempotency lock takeover + stream abort orphan tasks`
- GitHub commit timestamp observed: 2026-06-17 21:49:37 Australia/Sydney / 2026-06-17 11:49:37 UTC
- Vercel commit status check observed as `success`
- Production root served the NEXUS Identity Gate page during verification

Note: this docs commit may itself trigger a later Vercel deployment, but it does not touch gateway/runtime code.

## P0 route code presence

The following routes were verified on `main`:

- `/api/chat` -> `src/app/api/chat/route.ts`
- `/api/v1/agents/[agentId]/stream` -> `src/app/api/v1/agents/[agentId]/stream/route.ts`
- `/api/workflow-pro/brain-draft` -> `src/app/api/workflow-pro/brain-draft/route.ts`

Important route facts from code review:

- `/api/chat` delegates to `executeAiGatewayChatRequest`, resolves Supabase actor, gates plan/catalog/quota, resolves `user_new_api_tokens`, calls New API, and writes `model_usage_ledger`.
- `/api/v1/agents/[agentId]/stream` delegates to `createAgentStreamResponse` with `eventShape: "v1"`. This is the current agent streaming route; do not treat legacy `/api/agent-stream` as the future route.
- `/api/workflow-pro/brain-draft` requires authenticated actor when `useModel !== false`, resolves catalog/plan/token, calls New API, repairs planner output through Graph Brain logic, and writes `brain_draft` ledger success/failure rows.

## Post-commit evidence after fa0a294

Using `fa0a294` timestamp as the deployment boundary (`2026-06-17 11:49:37 UTC`), Supabase production evidence showed:

- `model_usage_ledger`: one post-commit `agent_stream` success at `2026-06-17 11:59:50 UTC`, `status = succeeded`, `error_code = null`, model `gpt-4o-mini`, total tokens `335`, charged points `1`.
- `agent_tasks`: one post-commit `chat` task completed at `2026-06-17 11:59:49 UTC`, `error_code = null`, with an output message id.
- `messages`: one post-commit assistant message persisted at `2026-06-17 11:59:48 UTC`, token count `94`.

This confirms the deployed production path has at least one post-commit successful agent stream + durable task/message persistence.

## Latest known P0 ledger health

Recent ledger rows also showed successful entries for:

- `operator_chat` using `deepseek-chat`, latest observed success `2026-06-17 11:42:12 UTC`
- `brain_draft` using `deepseek-chat`, latest observed success `2026-06-17 10:25:22 UTC`
- multiple `agent_stream` rows, latest observed success `2026-06-17 11:59:50 UTC`

Important limitation: `operator_chat` and `brain_draft` latest observed successes were before the `fa0a294` timestamp, so they should be treated as latest known passes, not as fresh post-deploy replays.

## Current decision

Do not keep changing the gateway unless a fresh authenticated replay proves a blocker. The next useful work should be either:

1. Run an authenticated production replay for `/api/chat` and `/api/workflow-pro/brain-draft` from a logged-in NEXUS session, then update this doc; or
2. If those pass, move to P1 product reliability / UX items.

## Keep out of scope for MVP unless it becomes a real P0 leak/bypass/data-loss issue

- Domain / HTTPS / Cloudflare Tunnel
- IP allowlist / port hardening
- full RLS hardening rewrite
- audit log SECURITY DEFINER work
- full NexusOps rewrite
- Nova / CortexBrain runtime migration
- schema-live / blackbox CI gates
