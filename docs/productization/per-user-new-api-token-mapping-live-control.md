# Per-user New API Token Mapping Live Control

Last updated: 2026-06-10

This is the living control document for the next productization iteration. Update it before implementation slices, not after.

## Goal

Move NEXUS from one shared server `NEW_API_KEY` toward per-user New API downstream tokens:

```txt
Frontend / Operator / Graph / Workflow / Image / Memory / Predictive
  -> NEXUS backend
  -> authenticated user
  -> user_new_api_tokens lookup
  -> decrypt token server-side
  -> NEW_API_BASE_URL
  -> New API handles quota / group / model restrictions
  -> NEXUS writes minimal usage log
```

This round does not build billing. New API remains the quota / group / channel authority. NEXUS only maps user -> downstream token, validates catalog/model shape, forwards server-side, and records minimal usage.

## Out Of Scope

- Stripe.
- Top-up.
- Invoice.
- Refund.
- Subscription cycle.
- Full quota transaction ledger.
- Full admin dashboard.
- Full operator/conversation DB migration.
- UI redesign.
- Global current model selector.
- Frontend New API token access.
- Frontend direct New API calls.

## Current Repo Findings

1. `/api/chat` entrypoint:
   - File: `src/app/api/chat/route.ts`
   - Delegates to `executeAiGatewayChatRequest`.
   - Gateway file: `src/lib/backend/models/ai-gateway-service.ts`.
   - New API call file: `src/lib/backend/models/new-api-chat-service.ts`.

2. Shared server token usage status:
   - Done: `src/lib/backend/models/new-api-chat-service.ts` now requires explicit request-scoped `apiKey`.
   - Done: `src/lib/backend/runtime/provider-adapter.ts` now uses explicit request-scoped `apiKey`.
   - Done for product users: `src/app/api/image-gen/route.ts` uses the current user's mapped token after product access/gate. Local no-user fallback still reads server env for dev/mock compatibility.
   - Done: `src/app/api/v1/agents/memory-compress/route.ts` uses the current user's mapped token.
   - Done: `src/app/api/predictive-intel/route.ts` uses the current user's mapped token.
   - Remaining legacy: `src/app/api/memory-compress/route.ts` reads `process.env.NEW_API_KEY`, but this legacy route is production-blocked.
   - Remaining legacy/helper: `src/lib/backend/api/agent-stream-service.ts` keeps shared-key logic only for legacy event-shape fallback and exported helper compatibility; v1 stream path uses mapped tokens.
   - Production blocked special case: `src/app/api/workflow-pro/brain-draft/route.ts` still contains local-only `OPENAI_API_KEY` planner code, but model-backed drafts are now blocked in production so it cannot bypass per-user New API token mapping.

3. Server model catalog:
   - File: `src/lib/backend/models/model-catalog.ts`.
   - Public types: `src/lib/models/model-catalog-types.ts`.
   - Route: `src/app/api/models/route.ts`.
   - Keep this route. It remains the UI catalog source and must not return tokens.

4. Usage ledger:
   - File: `src/lib/backend/models/usage-ledger.ts`.
   - Migration: `supabase/migrations/20260609001000_model_usage_ledger.sql`.
   - Added migration: `supabase/migrations/20260610043000_add_model_usage_ledger_source_type_and_nullable_tokens.sql`.
   - Fields now include nullable `source_type`, `input_tokens`, `output_tokens`, and `total_tokens`.
   - `workspace_id` remains intentionally deferred.

5. Supabase admin access:
   - File: `src/lib/supabase/admin.ts`.
   - Uses `SUPABASE_SERVICE_ROLE_KEY` server-side.
   - `hasSupabaseServiceRoleConfig()` already controls admin repository fallback patterns.

6. Auth helper:
   - File: `src/lib/backend/api/api-auth.ts`.
   - `resolveApiActor(request, { required: true })` returns `actorUserId`.
   - Underlying verifier: `src/lib/backend/security/auth-session.ts`.

7. Encryption / secret helpers:
   - Existing `SecretBoundaryService` handles scanning/redaction/hash-only metadata.
   - It is not an encrypt/decrypt store helper.
   - Add a minimal server-only token encryption helper using `node:crypto` and `NEW_API_TOKEN_ENCRYPTION_SECRET`.
   - Do not use browser `crypto.subtle` for this secret storage path.

8. AI entrypoint status from previous iteration:
   - `/api/chat` goes backend -> New API.
   - Operator stream uses backend stream route.
   - Graph / Workflow Lite LLM uses backend stream route.
   - Image workflow uses `/api/image-gen`.
   - Memory compression uses `/api/v1/agents/memory-compress`.
   - Predictive intel uses `/api/predictive-intel`.

## Design Decision

Recommended approach: **server-side token mapping service first, route migration second**.

Do not let route code query Supabase or decrypt tokens directly. Add one server-only service that owns:

- lookup by `userId`
- enabled check
- decrypt
- test/in-memory override
- development fallback policy
- no-token error shape

Then route-level New API callers consume a token value passed through dependencies or request-scoped options.

## Data Model Checklist

Create migration:

`supabase/migrations/YYYYMMDDHHMMSS_user_new_api_tokens.sql`

Table: `public.user_new_api_tokens`

- [x] `id uuid primary key default gen_random_uuid()`
- [x] `user_id uuid not null`
- [x] `new_api_token_name text`
- [x] `encrypted_new_api_token text not null`
- [x] `new_api_token_id text`
- [x] `new_api_group text`
- [x] `plan text not null default 'free'`
- [x] `enabled boolean not null default true`
- [x] `note text`
- [x] `created_at timestamptz not null default now()`
- [x] `updated_at timestamptz not null default now()`
- [x] `created_by uuid`
- [x] `updated_by uuid`
- [x] `unique (user_id)`
- [x] index on `(user_id)`
- [x] index on `(enabled)`
- [x] trigger or function to update `updated_at`
- [x] RLS enabled
- [x] no anon grants
- [x] service_role can select/insert/update/delete
- [x] authenticated users cannot select `encrypted_new_api_token`

Security stance:

- MVP backend uses service role for token lookup.
- Direct client access to this table is not a product feature.
- If a read policy is added later, expose only a separate safe view without `encrypted_new_api_token`.

## Backend Service Checklist

Create:

- [x] `src/lib/backend/new-api-token/token-crypto.ts`
- [x] `src/lib/backend/new-api-token/user-new-api-token-service.ts`
- [x] `src/lib/backend/new-api-token/user-new-api-token-service.test.ts`

Service API:

```ts
type UserNewApiToken = {
  group?: string | null;
  plan: string;
  token: string;
  tokenId?: string | null;
  tokenName?: string | null;
  userId: string;
};

async function getUserNewApiToken(input: {
  userId: string;
}): Promise<UserNewApiToken>;
```

Behavior checklist:

- [x] looks up `user_new_api_tokens` by `user_id`
- [x] requires `enabled = true`
- [x] decrypts token server-side
- [x] throws `USER_NEW_API_TOKEN_NOT_CONFIGURED` if missing
- [x] throws `USER_NEW_API_TOKEN_DISABLED` if disabled
- [x] never returns encrypted token
- [x] never logs token
- [x] allows test in-memory fixture tokens
- [x] production must not fall back to global `NEW_API_KEY`
- [ ] development/test may fall back to `NEW_API_KEY` only with explicit helper name and comments; current remaining env fallback is legacy/local and documented above.

Add API error codes:

- [x] `USER_NEW_API_TOKEN_NOT_CONFIGURED`
- [x] `USER_NEW_API_TOKEN_DISABLED`
- [x] `USER_NEW_API_TOKEN_DECRYPT_FAILED`

## Forwarding Migration Checklist

Keep `NEW_API_BASE_URL` from env.

Replace direct global key use in this order:

1. `/api/chat`
   - [x] `executeAiGatewayChatRequest` resolves authenticated user.
   - [x] gateway gets user token through token service.
   - [x] `callNewApiChatCompletion` accepts `apiKey` as an explicit dependency.
   - [x] missing token rejects before fetch.
   - [x] tests cover different users using different tokens and verify response/ledger do not contain raw tokens.

2. Operator stream / Graph LLM / Workflow Lite LLM
   - [x] `agent-stream-service` resolves user token after `resolveApiActor`.
   - [x] `OpenAICompatibleAdapter.createChatStream` accepts request-scoped token.
   - [x] no production fallback to shared `NEW_API_KEY` in v1 stream path.

3. Image workflow
   - [x] `/api/image-gen` uses current user's token when authenticated product access exists.
   - [x] legacy local/mock behavior remains safe when no product user exists in non-production.

4. Memory compression
   - [x] `/api/v1/agents/memory-compress` uses current user's token.
   - [x] legacy `/api/memory-compress` remains production-blocked.

5. Predictive intel
   - [x] `/api/predictive-intel` uses current user's token when provider fetch is attempted.

Known special case:

- [x] `src/app/api/workflow-pro/brain-draft/route.ts` still contains a local-only `OPENAI_API_KEY` planner path, but model-backed drafts are production-blocked and covered by `src/app/api/workflow-pro/brain-draft/route.test.ts`.

## Usage Log Checklist

Existing ledger fields:

- `user_id`
- `operator_id`
- `conversation_id`
- `request_id`
- `model_id`
- `new_api_model`
- `provider_family`
- `input_tokens`
- `output_tokens`
- `total_tokens`
- `charged_points`
- `source_type`
- `status`
- `error_code`
- `created_at`

Round decision:

- [x] Do not store New API token.
- [x] Do not store encrypted token.
- [x] Do not store provider key.
- [x] Keep current ledger if possible.
- [x] Add nullable `source_type`.
- [x] Add nullable token usage columns for remote/live schema parity.
- [x] Keep `workspace_id` deferred.

Source type coverage:

- [x] `/api/chat`: `operator_chat`
- [x] `/api/v1/agents/:agentId/stream`: `agent_stream`
- [x] `/api/image-gen`: `image_workflow`
- [x] `/api/v1/agents/memory-compress`: `memory_compress`
- [x] `/api/predictive-intel`: `predictive_intel`

## Manual Setup Path

Recommended MVP setup path: **safe script + SQL template**, not admin UI.

Create:

- [x] `scripts/new-api-token-encrypt.mjs`
- [x] `docs/productization/user-new-api-token-manual-setup.md`

Script behavior:

- [x] reads token from `--token-file` or `--token`; `--token-file` is documented as preferred
- [x] requires `NEW_API_TOKEN_ENCRYPTION_SECRET`
- [x] prints encrypted payload only
- [x] SQL template is documented separately with placeholders
- [x] never prints the raw token after reading it

Manual SQL template must insert/update:

```sql
insert into public.user_new_api_tokens (
  user_id,
  new_api_token_name,
  encrypted_new_api_token,
  new_api_token_id,
  new_api_group,
  plan,
  enabled,
  note,
  created_by,
  updated_by
) values (
  '<USER_ID>'::uuid,
  '<TOKEN_NAME>',
  '<ENCRYPTED_TOKEN>',
  '<NEW_API_TOKEN_ID>',
  '<NEW_API_GROUP>',
  '<PLAN>',
  true,
  '<NOTE>',
  '<ADMIN_USER_ID>'::uuid,
  '<ADMIN_USER_ID>'::uuid
)
on conflict (user_id) do update set
  new_api_token_name = excluded.new_api_token_name,
  encrypted_new_api_token = excluded.encrypted_new_api_token,
  new_api_token_id = excluded.new_api_token_id,
  new_api_group = excluded.new_api_group,
  plan = excluded.plan,
  enabled = excluded.enabled,
  note = excluded.note,
  updated_by = excluded.updated_by,
  updated_at = now();
```

## Required Tests

TDD order:

- [x] token crypto encrypt/decrypt round trip
- [x] token crypto rejects wrong secret
- [x] token service returns enabled user token
- [x] token service rejects missing token
- [x] token service rejects disabled token
- [x] `/api/chat` rejects unauthenticated requests
- [x] `/api/chat` rejects authenticated user with no token and does not call fetch
- [x] `/api/chat` uses a mapped user token
- [x] `/api/chat` uses user B token in a separate explicit route test
- [x] `/api/chat` response does not contain user token
- [x] usage ledger does not contain user token
- [x] `/api/models` response does not contain token or encrypted token from previous model catalog tests and frontend exposure scan
- [x] unknown model id is still rejected before New API from previous catalog/chat tests
- [ ] New API quota/group/model rejection is sanitized; not expanded this slice beyond existing provider error sanitization
- [x] frontend scan has no `encrypted_new_api_token`

Follow-up route tests:

- [x] stream route / provider adapter uses user token
- [x] image route uses user token
- [x] memory route uses user token
- [x] predictive route uses user token

## Verification Checklist

Run at end of this iteration:

- [x] `npm test` full suite
- [x] targeted per-user token migration test suite
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `node scripts/auth-boundary-scan.mjs`
- [x] frontend New API env scan
- [x] provider credential path scan
- [ ] vault implementation scan
- [x] token table / encrypted token frontend scan:

```sh
rg -n "user_new_api_tokens|encrypted_new_api_token|NEW_API_TOKEN_ENCRYPTION_SECRET" src/components src/store src/lib src/app --glob '!src/lib/backend/**' --glob '!src/app/api/**' --glob '!**/*.test.ts' --glob '!**/*.test.tsx'
```

## Current Status

Implemented MVP token mapping slice and completed a local live smoke on 2026-06-10.

Remote Supabase project `NEXUS` (`xjuglddxwnikvcwxfbzg`) has the two required additive migrations applied:

- `model_usage_ledger`
- `user_new_api_tokens`

Verified both new tables exist in `public` and have RLS enabled.

Local smoke env:

- `NEW_API_BASE_URL` points to the local New API `/v1` endpoint.
- `SUPABASE_SERVICE_ROLE_KEY` is present in local `.env.local`.
- `NEW_API_TOKEN_ENCRYPTION_SECRET` is present in local `.env.local`.
- Raw New API downstream tokens and encryption secrets are intentionally not written into this document.

Live downstream token checks:

- User A mapped to a DeepSeek-only downstream token.
  - New API `/v1/models` returned only `deepseek-chat` and `deepseek-reasoner`.
  - Backend `/api/chat` using `deepseek-chat` succeeded.
  - NEXUS ledger recorded `user_id`, `operator_id`, `conversation_id`, `request_id`, `model_id`, `new_api_model`, `provider_family`, `status`, and `charged_points`.
- User B mapped to a broader downstream token.
  - New API `/v1/models` returned OpenAI, Claude, Gemini, and DeepSeek families.
  - Backend `/api/chat` using `gpt-4o` succeeded.
  - NEXUS ledger recorded a separate User B usage row with the actual model used for that request.
- Frontend UI smoke:
  - Logged into NEXUS as User B through the visible AuthScreen.
  - Sent a workspace chat message through the visible composer.
  - UI received `NEXUS_UI_B_OK`.
  - NEXUS ledger added a succeeded row for `operator_id = agent-archivist`, `model_id = gpt-4o-mini`, `new_api_model = gpt-4o-mini`, `charged_points = 1`.
- New API admin API smoke:
  - Token list shows User B remaining quota decreased after the backend/UI smokes.
  - Token list shows User A remaining quota decreased after the DeepSeek backend smoke.

Observed follow-up:

- New API admin token list reported the User B token group as `default`, not `svip`, during live smoke. NEXUS mapping has now been marked `svip` for User B, but New API remains the actual authority for the downstream token group. Use the official New API token edit flow to change the real token group and verify quota/model limits after saving.
- Remote `model_usage_ledger` has been upgraded with nullable `source_type`, `input_tokens`, `output_tokens`, and `total_tokens`.

Round 2.5 cleanup on 2026-06-10:

- Added migration `20260610043000_add_model_usage_ledger_source_type_and_nullable_tokens.sql`.
- Applied the migration to remote Supabase project `xjuglddxwnikvcwxfbzg`.
- Verified remote `model_usage_ledger` has nullable `source_type`, `input_tokens`, `output_tokens`, and `total_tokens`.
- Updated User B NEXUS-side `user_new_api_tokens.new_api_group` to `svip`.
- Kept New API token group changes as official New API admin responsibility to avoid overwriting quota/model whitelist fields.
- Added explicit `/api/chat` route test proving User A and User B use different mapped downstream tokens.
- Added Graph Brain production-block test so `OPENAI_API_KEY` cannot bypass the user token gateway in production.
- Added `src/app/api/workflow-pro/brain-draft/route.ts` to the auth boundary scanner legacy/special-case production block list.

Round 3 MVP AI entrypoint convergence inventory:

| Entrypoint | Status | Notes |
| --- | --- | --- |
| `/api/chat` | `connected_to_user_token_gateway` | Uses `executeAiGatewayChatRequest`, server catalog, mapped user token, and `source_type=operator_chat`. |
| Operator chat send path | `connected_to_user_token_gateway` | Frontend posts through backend stream/chat paths; no frontend New API token. |
| `/api/v1/agents/:agentId/stream` | `connected_to_user_token_gateway` | Uses `getUserNewApiToken` and request-scoped `OpenAICompatibleAdapter`; ledger `source_type=agent_stream`. |
| Graph LLM node | `connected_to_user_token_gateway` | Workflow Lite LLM client calls `/api/v1/agents/:agentId/stream`; server token stays backend-only. |
| Workflow Lite LLM | `connected_to_user_token_gateway` | Same stream route as above. |
| Image workflow / composer image | `connected_to_user_token_gateway` | `/api/image-gen` uses current user's mapped token after product access gate; ledger `source_type=image_workflow`. |
| `/api/v1/agents/memory-compress` | `connected_to_user_token_gateway` | Authenticated route uses mapped token; ledger `source_type=memory_compress`. |
| `/api/predictive-intel` | `connected_to_user_token_gateway` | Uses mapped token for provider fetch; ledger `source_type=predictive_intel`. |
| `/api/memory-compress` legacy | `production_blocked` | Keeps local legacy env fallback only behind production block. |
| `/api/agent-stream` legacy | `production_blocked` | Legacy event-shape fallback remains blocked in production. |
| `/api/workflow-pro/brain-draft` model-backed THINK | `production_blocked` | Local-only OpenAI Responses path remains for non-production, but production model-backed branch returns 404. |
| `/api/v1/providers/verify` | `production_blocked` | Provider credential verification is legacy/user-key surface and remains guarded by auth boundary scan. |

Fresh verification:

- `npm test`
  - Result: passed, 136 files passed, 865 tests passed.
- `npm test -- src/lib/backend/new-api-token/token-crypto.test.ts src/lib/backend/new-api-token/user-new-api-token-service.test.ts src/lib/backend/models/new-api-chat-service.test.ts src/lib/backend/models/ai-gateway-service.test.ts src/app/api/chat/route.test.ts src/lib/backend/runtime/agent-runtime.test.ts src/lib/backend/api/api-contract.test.ts src/app/api/image-gen/route.test.ts`
  - Result: 8 files passed, 67 tests passed.
- `npm run typecheck`
  - Result: passed.
- `npm run lint`
  - Result: passed with 9 existing warnings, 0 errors.
- `node scripts/auth-boundary-scan.mjs`
  - Result: passed, `blockingFindings: []`.
- Frontend token exposure scan:
  - Result: no hits for `user_new_api_tokens`, `encrypted_new_api_token`, `NEW_API_TOKEN_ENCRYPTION_SECRET`, or `NEW_API_KEY` outside backend/API/docs/tests.
- Server provider-key scan:
  - `src/app/api/chat`, `/api/v1/agents/:agentId/stream`, `/api/v1/agents/memory-compress`, and `/api/predictive-intel` are on mapped user token paths for product usage.
  - `src/app/api/image-gen/route.ts` uses mapped user tokens for authenticated product users and keeps only local/mock env fallback for no-user non-production compatibility.
  - `src/app/api/memory-compress/route.ts`, legacy `/api/agent-stream`, and model-backed `src/app/api/workflow-pro/brain-draft/route.ts` are production-blocked special/legacy paths.
  - `src/app/api/v1/providers/status/route.ts`, `src/lib/media/image-api-credential.ts`, and `src/lib/backend/deployment/environment-validator.ts` are configuration/status/helper surfaces, not frontend token exposure paths.

## Round 3.5 New API Admin Drift Check

Goal: stop relying on memory for whether NEXUS mapping metadata matches the actual New API downstream token group.

Implemented on 2026-06-10:

- Added platform-admin guard:
  - File: `src/lib/backend/admin/platform-admin.ts`
  - Admin/root access is controlled by server-only env allowlists:
    - `NEXUS_ADMIN_USER_IDS`
    - `NEXUS_ROOT_USER_IDS`
    - `NEXUS_PLATFORM_ADMIN_USER_IDS`
  - Workspace `owner/admin` is intentionally not enough for platform token administration.
- Added drift service:
  - File: `src/lib/backend/new-api-admin/token-drift-service.ts`
  - Reads `user_new_api_tokens` through service role.
  - Selects only safe mapping metadata: `user_id`, `new_api_token_name`, `new_api_token_id`, `new_api_group`, `plan`, `enabled`.
  - Does not select `encrypted_new_api_token`.
  - Does not decrypt or return downstream tokens.
- Added drift check route:
  - `GET /api/admin/new-api-token-drift`
  - Admin-only.
  - Calls New API management `GET /api/token/{id}` when admin read access is configured.
  - Compares NEXUS `plan/new_api_group` with New API actual token `group`.
  - Returns sanitized `quotaSummary`, `modelLimitSummary`, `groupMatch`, and `suggestedAction`.
  - Never returns raw token, encrypted token, New API admin cookie, or admin bearer.
- Added conservative sync route:
  - `POST /api/admin/new-api-token-group-sync`
  - Admin-only.
  - Returns `409` with `syncEnabled=false` and a manual checklist.
  - Does not call New API `PUT /api/token/`.
  - Reason: New API docs expose `PUT /api/token/`, but do not guarantee partial group-only update. Until that is verified against the exact running New API version, NEXUS must not risk overwriting quota, model whitelist, token limits, or token identity.
- Added audit:
  - Uses existing `permission_audit_logs`.
  - `new_api_token_drift_check` records aggregate counts only.
  - `new_api_token_group_sync_attempt` records the manual-required sync attempt.
  - Audit metadata is sanitized by the existing `SecurityAuditRepository`.
- Updated scanner:
  - `scripts/auth-boundary-scan.mjs` now requires the two admin routes to call `resolvePlatformAdminActor`.

Required server env for live drift checks:

```txt
NEXUS_ADMIN_USER_IDS=<comma-separated Supabase user ids allowed to use platform admin routes>
NEW_API_BASE_URL=http://localhost:8787/v1
```

Optional New API admin read auth:

```txt
NEW_API_ADMIN_BASE_URL=http://localhost:8787
NEW_API_ADMIN_COOKIE=<server-side New API admin session cookie>
NEW_API_ADMIN_USER_ID=<New API dashboard user id required by this New API version>
```

or:

```txt
NEW_API_ADMIN_BEARER_TOKEN=<server-side New API admin bearer token>
NEW_API_ADMIN_USER_ID=<New API dashboard user id required by this New API version>
```

If neither admin cookie nor admin bearer is configured, drift check still runs and reports `new_api_admin_unavailable` per mapping. That is intentional: no route should pretend to know actual New API group state without authenticated admin read access.

Round 3.5 verification:

- `npm test`
  - Result: passed, 138 files passed, 869 tests passed.
- `npm test -- src/app/api/admin/new-api-token-drift/route.test.ts src/app/api/admin/new-api-token-group-sync/route.test.ts`
  - Result: passed, 2 files passed, 4 tests passed.
- `npm run typecheck`
  - Result: passed.
- `npm run lint`
  - Result: passed with 9 existing warnings, 0 errors.
- `node scripts/auth-boundary-scan.mjs`
  - Result: passed, `blockingFindings: []`, `platformAdminGate.requiredRoutes=2`, `platformAdminGate.routesWithAdminGuard=2`.
- Frontend token exposure scan:
  - Result: no hits for `user_new_api_tokens`, `encrypted_new_api_token`, `NEW_API_TOKEN_ENCRYPTION_SECRET`, `NEW_API_KEY`, `NEW_API_ADMIN_COOKIE`, `NEW_API_ADMIN_BEARER_TOKEN`, `NEW_API_ADMIN_KEY`, or raw `sk-` token patterns outside backend/API/docs/tests.

Round 3.5 live drift validation:

- New API was started locally on `http://localhost:8787`.
- NEXUS was started locally on `http://localhost:3000`.
- A dedicated Supabase auth user was used as the NEXUS platform admin through `NEXUS_ADMIN_USER_IDS`.
- New API admin session auth was configured server-side through `NEW_API_ADMIN_COOKIE` plus `NEW_API_ADMIN_USER_ID`.
- `user_new_api_tokens.new_api_token_id` was backfilled from the New API token list:
  - `NEXUS-Test-DeepSeek` -> New API token id `2`
  - `NEXUS-UserB-All` -> New API token id `3`
- `GET /api/admin/new-api-token-drift` returned `200`.
- Drift summary:
  - `checked=4`
  - `drifted=2`
  - `missingTokenId=0`
  - `newApiLookupFailed=0`
  - `unavailable=0`
- Verified matching rows:
  - `NEXUS-Test-DeepSeek`: NEXUS group `default`, New API group `default`, `groupMatch=true`, model limits restricted to DeepSeek models.
- Verified drift rows:
  - `NEXUS-UserB-All`: NEXUS group `svip`, New API group `default`, `groupMatch=false`, suggested action `update_new_api_group_to_match_nexus_mapping`.
- Response leak scan:
  - No raw downstream token.
  - No encrypted token.
  - No New API admin cookie.
  - No `session=` value.

Round 3.5 drift remediation:

- Updated New API token id `3` (`NEXUS-UserB-All`) from group `default` to `svip`.
- The update used the existing token payload and changed only `group`.
- Verified New API token id `3` after update:
  - group changed to `svip`
  - remaining quota stayed unchanged
  - used quota stayed unchanged
  - `model_limits_enabled` stayed unchanged
  - `model_limits` stayed unchanged
  - status and expiration stayed unchanged
- Re-ran `GET /api/admin/new-api-token-drift`.
- Final drift summary:
  - `checked=4`
  - `drifted=0`
  - `missingTokenId=0`
  - `newApiLookupFailed=0`
  - `unavailable=0`
- Final group check:
  - `NEXUS-Test-DeepSeek`: NEXUS group `default`, New API group `default`, `groupMatch=true`
  - `NEXUS-UserB-All`: NEXUS group `svip`, New API group `svip`, `groupMatch=true`
- Response leak scan remained clean.

Mapping uniqueness check:

- Remote `public.user_new_api_tokens` has `UNIQUE (user_id)` through constraint `user_new_api_tokens_user_unique`.
- Query confirmed there are no users with more than one total row or more than one enabled mapping.
- Current duplicate state is not "multiple mappings for one user"; it is "multiple test users sharing the same New API downstream token id/name".
- Duplicate downstream token mappings were marked in `note` as live-smoke/test duplicate mappings, without deleting or disabling any user mapping.
- This marking avoids breaking real users while making test duplication visible before production cleanup.

Next action:

1. Configure a server-only New API admin read credential, then run `GET /api/admin/new-api-token-drift` as a platform admin and verify User B reports actual `svip`.
2. Only implement real group sync after verifying the exact New API version supports group-only partial update without touching quota/model whitelist/token limits.
3. Optional hardening: add New API quota/group/model restriction mapping test with a fake 403/429 response.
4. Decide whether to migrate or retire special-case legacy routes:
   - `src/app/api/workflow-pro/brain-draft/route.ts`
   - `src/app/api/memory-compress/route.ts`
   - legacy event-shape stream fallback/helper paths.

## Round 4 Launch Readiness Validation

Scope:

- This round is validation only. No Stripe, top-up, invoice, refund, full billing cycle, admin dashboard, or UI redesign work was added.
- NEXUS local dev server was opened on `http://localhost:3000`.
- New API remained local on `http://localhost:8787`.

Mapping cleanup:

- `public.user_new_api_tokens` still has `UNIQUE (user_id)` through `user_new_api_tokens_user_unique`, so one NEXUS user cannot have more than one mapping row.
- The Round 3.5 disposable live-smoke duplicate mappings were disabled instead of deleted.
- Current enabled mappings:
  - Free/default smoke user -> `NEXUS-Test-DeepSeek`, New API token id `2`.
  - Pro/svip smoke user -> `NEXUS-UserB-All`, New API token id `3`.
- Query confirmed there are no users with more than one enabled mapping and no enabled downstream-token duplicates.

Drift check:

- `GET /api/admin/new-api-token-drift` returned `200`.
- Summary:
  - `checked=2`
  - `drifted=0`
  - `missingTokenId=0`
  - `newApiLookupFailed=0`
  - `unavailable=0`
- Verified rows:
  - `NEXUS-Test-DeepSeek`: NEXUS group `default`, New API group `default`, `groupMatch=true`, model limits restricted to `deepseek-chat` and `deepseek-reasoner`.
  - `NEXUS-UserB-All`: NEXUS group `svip`, New API group `svip`, `groupMatch=true`, no token-level model whitelist.
- Response leak scan:
  - No raw downstream token.
  - No encrypted token.
  - No New API admin cookie or admin bearer value.

Live model/quota checks:

- Free/default user:
  - `/api/models` returned only `gpt-4o-mini` and `deepseek-chat`.
  - `POST /api/chat` with `deepseek-chat` returned `200`.
  - New API token id `2` quota changed from `remaining=99997, used=3` to `remaining=99996, used=4`, so quota was charged to the mapped user token.
  - `POST /api/chat` tampered to `gpt-4o` returned `403` with `PERMISSION_DENIED`, before a successful upstream charge.
- Pro/svip user:
  - `POST /api/chat` with `gpt-4o` reached the server gateway but returned `504 PROVIDER_TIMEOUT`.
  - `POST /api/chat` with `deepseek-chat` also returned `504 PROVIDER_TIMEOUT`.
  - New API token id `3` quota stayed unchanged at `remaining=999909, used=91`.

SVIP launch blocker:

- New API token id `3` is correctly set to group `svip`.
- New API channels currently have group `default` only:
  - `OpenAI`: `default`
  - `DeepSeek`: `default`
  - `Anthropic-Claude`: `default`
  - `Google-Gemini`: `default`
- Querying New API channels with `group=svip` returned zero channels.
- Root-cause hypothesis: the `svip` token has no satisfiable channel for `gpt-4o` or `deepseek-chat`, so live requests time out before quota is charged.
- Low-risk remediation options:
  - Add `svip` to the relevant channel groups, for example `default,svip`.
  - Or create dedicated `svip` channels.
- Safety note: the New API channels currently have no tag, so the safer tag-edit API cannot be used. Full channel update may touch provider credential fields and should be done manually in the New API dashboard or with a dedicated reviewed script that preserves every non-group field.

Usage ledger checks:

- `round4-free-deepseek`:
  - `status=succeeded`
  - `source_type=operator_chat`
  - `model_id=deepseek-chat`
  - `new_api_model=deepseek-chat`
  - `provider_family=DeepSeek`
  - `input_tokens=13`
  - `output_tokens=2`
  - `total_tokens=15`
  - `charged_points=1`
- `round4-free-gpt4o-denied`:
  - `status=failed`
  - `error_code=PERMISSION_DENIED`
  - `charged_points=0`
- `round4-svip-gpt4o` and `round4-svip-deepseek`:
  - `status=failed`
  - `error_code=PROVIDER_TIMEOUT`
  - `charged_points=0`
- No usage rows include raw New API tokens or encrypted token values.

Production bypass and legacy checks:

- Env-key scan still finds expected legacy/dev references:
  - `src/app/api/memory-compress/route.ts` is production blocked.
  - `src/app/api/workflow-pro/brain-draft/route.ts` is production blocked when `useModel !== false`.
  - `src/app/api/agent-stream/route.ts` legacy event-shape path is production blocked.
  - `src/app/api/image-gen/route.ts` uses the current user's mapped New API token in the formal production-gated path; env fallback is a dev/non-product fallback.
  - `src/app/api/v1/providers/status/route.ts` reports configured status only.
- `node scripts/auth-boundary-scan.mjs` confirmed:
  - `blockingFindings=[]`
  - `legacyProductionGate.requiredRoutes=7`
  - `legacyProductionGate.routesWithProductionBlock=7`
  - `platformAdminGate.requiredRoutes=2`
  - `platformAdminGate.routesWithAdminGuard=2`

Verification commands:

- `npm test -- src/app/api/admin/new-api-token-drift/route.test.ts src/app/api/admin/new-api-token-group-sync/route.test.ts src/app/api/chat/route.test.ts src/lib/backend/new-api-token/user-new-api-token-service.test.ts src/lib/backend/models/usage-ledger.test.ts`
  - Result: passed, 5 files passed, 12 tests passed.
- `npm run typecheck`
  - Result: passed.
- `npm run lint`
  - Result: passed with 0 errors and 9 existing warnings.
- `node scripts/auth-boundary-scan.mjs`
  - Result: passed, no blocking findings.
- Frontend token exposure scan:
  - Result: no hits in frontend/client surfaces for `user_new_api_tokens`, `encrypted_new_api_token`, New API server env names, admin credential env names, or raw `sk-` token patterns.
- `/api/models` response leak check:
  - Result: no token or secret findings.
- `/api/admin/new-api-token-drift` response leak check:
  - Result: no token or secret findings.

Round 4 status:

- Passed:
  - Formal users do not need to share a New API token; enabled mappings now point Free and Pro/svip users to different downstream token ids.
  - Free/default permission and quota behavior is live verified.
  - Drift check is live verified.
  - Usage ledger is queryable and records request/user/operator/conversation/model/source/tokens/status.
  - Frontend/API responses do not expose downstream tokens.
  - Legacy production blocks are present.
- Blocked before launch:
  - `svip` group has no New API channel coverage. Configure `svip` channel access before claiming Pro/svip live model access.
  - No separate `vip` live downstream token was configured for this validation round, so vip cannot be honestly marked verified yet.
