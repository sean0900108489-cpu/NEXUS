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
