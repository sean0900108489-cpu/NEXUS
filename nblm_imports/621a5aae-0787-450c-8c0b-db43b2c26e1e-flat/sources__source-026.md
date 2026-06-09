# Source 026 - maps__14-localhost-runtime-http-trace.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: bad5b1b5-e674-4141-ae33-8da07dac00e2
- title: maps__14-localhost-runtime-http-trace.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 459
- token_count: 1188
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/bad5b1b5-e674-4141-ae33-8da07dac00e2
- source_added_timestamp: 2026-06-05T05:51:22.912752Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/docs/agent-runs/nexus-current-system-intelligence-20260605-1347/maps/14-localhost-runtime-http-trace.md
- local_mirror_estimated_word_count: 521

## Local Mirror Content

```md
# 14 Localhost Runtime HTTP Trace

Round: `round-03-localhost-runtime-trace`

This round ran the app in a temporary sandbox that excluded `.env*`, `.git`, `.next`, `node_modules`, and previous agent-run reports. It used dummy local environment variables and only performed safe GET requests against `127.0.0.1:3137`.

| Check | Result |
| --- | --- |
| Sandbox path | /tmp/freechat-nexus-runtime-20260605-141343 |
| .env files in sandbox | 0 |
| Production Supabase touched | no |
| src business logic modified | no |
| Runtime server | Next.js 16.2.6 dev --webpack |
| Mutating requests sent | no |

## HTTP Results

| Path | Status | Bytes | Content type | Body head |
| --- | --- | --- | --- | --- |
| / | 200 | 14840 | - | <!DOCTYPE html><html lang="en" class="__variable_246ccd __variable_4c40f6 h-full antialiased"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initia |
| /style-lab | 200 | 216015 | - | <!DOCTYPE html><html lang="en" class="__variable_246ccd __variable_4c40f6 h-full antialiased"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initia |
| /api/v1/health | 200 | 265 | application/json | {"ok":true,"data":{"database":true,"deployment":true,"env":true,"mode":"local","registry":true,"status":"warning"},"error":null,"meta":{"requestId":"req_efc4f8d2-b4f7-4040-91a6-7a2 |
| /api/system-status | 200 | 63 | application/json | {"streamMode":"mock","openAICompatible":false,"keySource":"ui"} |
| /api/v1/public-config | 200 | 279 | application/json | {"ok":true,"data":{"supabase":{"anonKey":"<dummy-anon-key>","configured":true,"url":"http://127.0.0.1:54321"}},"error":null,"meta":{"requestId":"req_ece764c1-7346-45bc-b315-7bcd41a |
| /api/v1/providers/status | 200 | 174 | application/json | {"ok":true,"server":{"openai":{"apiKeyConfigured":true,"baseUrlConfigured":true,"defaultBaseUrl":"https://api.openai.com/v1","imageModel":null,"imageModelConfigured":false}}} |
| /api/v1/observability/events?workspaceId=local-runtime-trace | 401 | 234 | application/json | {"ok":false,"data":null,"error":{"code":"AUTH_REQUIRED","message":"Authentication is required.","retryable":false},"meta":{"requestId":"req_049e0997-51d6-4515-b7c2-fe6347900217","t |

## Runtime Observations

- Turbopack attempt failed in sandbox because node_modules symlink pointed outside filesystem root; webpack fallback was used successfully.
- GET / compiled and returned 200 in about 15.9s on first request.
- GET /style-lab compiled and returned 200 in about 3.9s on first request.
- GET /api/v1/health returned 200 with warning status in local mode.
- GET /api/v1/observability/events without auth returned 401 AUTH_REQUIRED as expected.
- Observability event insertion attempted and was dropped with fetch failed because dummy localhost Supabase was not running; production Supabase was not contacted.

## Interpretation

- The primary route `/` and the style lab `/style-lab` are runnable in an isolated localhost environment.
- Public diagnostic/config routes respond without production services.
- Auth-protected observability route correctly rejects unauthenticated GET with 401.
- Observability write attempts are present even during safe GETs; with dummy local Supabase unavailable, they fail closed as dropped events.
- Turbopack is sensitive to sandbox symlinked `node_modules`; future isolated runtime runs should use `--webpack` or copy/install dependencies inside sandbox.

## Remaining

- Browser visual screenshot / accessibility snapshot.
- Chrome DevTools protocol console/network trace, if tool config is available.
- Optional read-only Supabase daily log audit, only with explicit live-data approval.

## Estimated Distance

After Round 03, current-system understanding is about `92%` of the practical quality ceiling. Estimated remaining: `1` round for browser visual/accessibility trace, plus optional read-only Supabase daily-data audit if you want live history verification.
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.
