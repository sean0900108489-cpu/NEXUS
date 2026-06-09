# Source 039 - reports__security__security-boundary-static-audit.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: 485a4ac2-a8a3-48d7-b872-866fa6ea35da
- title: reports__security__security-boundary-static-audit.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 121
- token_count: 403
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/485a4ac2-a8a3-48d7-b872-866fa6ea35da
- source_added_timestamp: 2026-06-05T05:50:34.484571Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/docs/agent-runs/nexus-current-system-intelligence-20260605-1347/reports/security/security-boundary-static-audit.md
- local_mirror_estimated_word_count: 100

## Local Mirror Content

```md
# Security Boundary Static Audit

No secret values were read or output. Env var names were recorded only as names. Production Supabase was not queried.

| Signal | Value |
| --- | --- |
| Env var names detected | 32 |
| Service role name present in source | SUPABASE_SERVICE_ROLE_KEY name appears in server/admin contexts |
| Production Supabase touched | no |
| Live scripts executed | no |
| Potential review area | admin/service-role boundary, RLS migration alignment, storage policies |

Env var names only: `API_IDEMPOTENCY_ENABLED`, `AUTH_BOUNDARY_LIVE_BASE_URL`, `AUTH_BOUNDARY_LIVE_COOKIE`, `AUTH_BOUNDARY_LIVE_COOKIE_JAR`, `AUTH_BOUNDARY_LIVE_EXPECT_LEGACY_404`, `AUTH_BOUNDARY_LIVE_TIMEOUT_MS`, `DATABASE_URL`, `HISTORY_CURSOR_SECRET`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NODE_ENV`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_IMAGE_BASE_URL`, `OPENAI_IMAGE_MODEL`, `OPENAI_MODEL`, `PRIVATE_STYLE_TOKEN`, `REPORT_MODEL`, `SCHEMA_LIVE_PARITY_DATABASE_URL`, `SCHEMA_LIVE_PARITY_EXPECTED_REF`, `SCHEMA_LIVE_PARITY_REQUIRED`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SYNC_QUEUE_INLINE_APPLY`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_ENV`, `WORKFLOW_BRAIN_MAX_OUTPUT_TOKENS`, `WORKFLOW_BRAIN_MODEL`, `WORKFLOW_BRAIN_MODEL_TIMEOUT_MS`, `WORKFLOW_BRAIN_REASONING_EFFORT`, `WORKFLOW_BRAIN_VERBOSITY`
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.
