# User New API Token Manual Setup

Round 2 deliberately does not add an admin UI. Use this manual path to bind one NEXUS user to one New API downstream token.

## 1. Set Server Secret

Set the same secret in every server runtime:

```bash
NEW_API_TOKEN_ENCRYPTION_SECRET="replace-with-a-long-random-secret"
```

Do not expose this as `NEXT_PUBLIC_*`.

## 2. Encrypt The New API Token

Prefer a temporary file so the raw token is not saved in shell history:

```bash
printf "%s" "sk-your-new-api-downstream-token" > /tmp/nexus-new-api-token.txt
NEW_API_TOKEN_ENCRYPTION_SECRET="replace-with-the-server-secret" \
  node scripts/new-api-token-encrypt.mjs --token-file /tmp/nexus-new-api-token.txt
rm /tmp/nexus-new-api-token.txt
```

The command prints only the encrypted token string.

## 3. Upsert Mapping

Run this in Supabase SQL editor with your real NEXUS `user_id` and encrypted token:

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
  '00000000-0000-0000-0000-000000000000',
  'production-user-token',
  'napi1.encrypted-token-output-here',
  null,
  'default',
  'free',
  true,
  'Manual MVP binding. Raw token lives only in New API and encrypted server DB row.',
  null,
  null
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

## Safety Notes

- `encrypted_new_api_token` is service-role only; frontend clients should never query or receive it.
- Do not store the raw New API token in `.env.local`, localStorage, sessionStorage, docs, logs, or usage ledger.
- `NEW_API_BASE_URL` remains a server env var.
- `NEW_API_KEY` is no longer the production path for user AI requests; keep it only for explicit admin/test fallback work.
- `new_api_group` is a NEXUS-side intended/admin note for the mapped downstream token, for example `default`, `vip`, or `svip`.
- New API remains the authority for the actual downstream token group, quota, model whitelist, channel routing, and model倍率. If you need to change a token from `default` to `svip`, edit it in the New API admin UI/API using the official token edit flow and verify quota/model limits after saving.
- Updating `new_api_group` in NEXUS does not mutate the New API token. This is intentional for the MVP so a NEXUS setup script cannot accidentally overwrite New API quota or model whitelist fields.

## Drift Check

After binding or editing a mapped token, use the admin-only drift route to compare the NEXUS mapping against the actual New API token metadata:

```txt
GET /api/admin/new-api-token-drift
```

Required server env:

```txt
NEXUS_ADMIN_USER_IDS=<comma-separated Supabase user ids allowed to run platform admin routes>
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

The drift response intentionally contains only safe summaries: `user_id`, token name, NEXUS plan/group, New API group, group match status, quota summary, model-limit summary, and suggested action. It must not contain raw downstream tokens, encrypted tokens, New API admin cookies, or admin bearer values.

`POST /api/admin/new-api-token-group-sync` currently returns a manual-required response instead of calling New API update APIs. New API exposes `PUT /api/token/`, but this project has not yet verified that the running New API version supports group-only partial updates without overwriting quota, model whitelist, token limits, or token identity.
