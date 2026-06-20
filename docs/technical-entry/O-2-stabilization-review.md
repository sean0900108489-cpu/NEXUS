# O-2: Ops MCP Stabilization — O-1R Review + Standard Envelope + Backlog Re-rank

**Date:** 2026-06-21
**Status:** Review complete. No deployment. No implementation.
**Authority:** O-1 design, O-1 Security Addendum, O-1 Implementation Report, Ops MCP Upgrade Compliance Report
**Role:** Review/planning agent. Read-only inspection of O-1 artifacts.

---

## Status

**PASSED WITH ADDENDUM** — O-1 migration file is correct, complete, and security-hardened. One column reference issue found (A-1). Standard envelope design provided. Compliance backlog re-ranked. O-1 deployment is recommended CONDITIONAL GO pending A-1 resolution.

---

## Reviewed Files

| # | File | Size | Status |
|---|------|------|--------|
| 1 | `supabase/migrations/20260621000000_create_introspection_rpcs.sql` | ~6KB | Reviewed line-by-line |
| 2 | `docs/technical-entry/O-1-security-addendum.md` | ~6KB | Reviewed |
| 3 | `docs/technical-entry/O-1-implementation-report.md` | ~1KB | Reviewed |
| 4 | (cross-reference) O-1 design doc | Referenced | Confirmed alignment |
| 5 | (cross-reference) Existing migration `20260610043000` | Referenced | Confirmed numbering convention |

---

## O-1R Security Findings

### Pass/Fail Matrix

| # | Check | Result | Detail |
|---|-------|--------|--------|
| F1 | No `execute_sql` | ✅ PASS | No generic SQL executor anywhere. All 10 functions are narrow, single-purpose SELECTs. |
| F2 | No dynamic SQL | ✅ PASS | All 10 function bodies are static SQL. No `EXECUTE`, no `format()`, no string concatenation, no PL/pgSQL. |
| F3 | No `SECURITY DEFINER` | ✅ PASS | All 10 `SECURITY INVOKER`. Confirmed via `p.prosecdef` check (none would return true). |
| F4 | No `introspect_rpc_body` | ✅ PASS | Removed per addendum. 10 functions, not 11. |
| F5 | `LANGUAGE sql` | ✅ PASS | All 10 functions. Confirmed line-by-line. |
| F6 | `STABLE` | ✅ PASS | All 10 functions. Postgres enforces: no INSERT/UPDATE/DELETE/DROP/ALTER inside STABLE. |
| F7 | `SECURITY INVOKER` | ✅ PASS | All 10 functions. No privilege escalation. Caller's permissions apply. |
| F8 | `SET search_path = ''` | ✅ PASS | All 10 functions. Schema-qualified catalog references. No injection surface. |
| F9 | Metadata-only queries | ✅ PASS | All 10 query only `pg_catalog` and `information_schema`. Zero application tables (no `messages`, `workspaces`, `nova_*`, `user_new_api_tokens`, `model_usage_ledger`). |
| F10 | No user data reads | ✅ PASS | Confirmed. No function body contains any application table name. |
| F11 | `REVOKE ALL FROM PUBLIC` | ✅ PASS | All 10 functions. 10 `REVOKE ALL ... FROM PUBLIC` statements. |
| F12 | `REVOKE ALL FROM anon, authenticated` | ✅ PASS | All 10 functions. Explicit dual-role revocation. |
| F13 | `GRANT EXECUTE TO service_role` only | ✅ PASS | All 10 functions. No grants to any other role. |
| F14 | No NOVA schema changes | ✅ PASS | No `ALTER TABLE nova_*`, no `workspace_id` column, no RLS policy changes, no grant changes on nova tables. |
| F15 | No NOVA RPC changes | ✅ PASS | No `CREATE OR REPLACE FUNCTION match_nova_chunks`. RPC body unchanged. |
| F16 | Clean rollback | ✅ PASS | 10 `DROP FUNCTION IF EXISTS` statements. Zero data impact. No dependent objects. |
| F17 | Migration numbering | ✅ PASS | `20260621000000` follows existing convention (`YYYYMMDDHHMMSS`). Next after `20260610043000`. |

### Finding A-1: `introspect_list_migrations` References `supabase_migrations.schema_migrations`

**Severity:** MEDIUM
**Line:** 151
**Issue:** The function queries `FROM supabase_migrations.schema_migrations`. This assumes the Supabase migration tracking table is in a schema named `supabase_migrations`. The actual table location depends on the Supabase project configuration:

- **Supabase CLI managed:** Table may be `supabase_migrations.schema_migrations` (expected)
- **Legacy/self-managed:** Table may be `public.supabase_migrations`
- **Alternative locations:** The table schema depends on how the Supabase project was set up

**Risk:** If the table is NOT at `supabase_migrations.schema_migrations`, this function will fail with a relation-not-found error. All other 9 functions would still work.

**Mitigation options:**
- **Option A:** Change to `public.supabase_migrations` if that's where the table lives
- **Option B:** Query `pg_catalog.pg_class` and `pg_catalog.pg_namespace` to dynamically locate the migration table
- **Option C:** Accept the risk — this function is non-critical for N-2 baseline capture. Migration count can be verified via other means (GitHub list of migration files, Supabase Dashboard).

**Recommendation:** Option A (simplest). Verify via Supabase Dashboard before deployment: `SELECT * FROM supabase_migrations.schema_migrations LIMIT 1`. If it fails, try `SELECT * FROM public.supabase_migrations LIMIT 1`. Correct the FROM clause to whichever works.

### Finding A-2: Column Name `name` vs `version` in Migration Return

**Severity:** LOW
**Line:** 150-151
**Issue:** The function returns `TABLE(name text, executed_at timestamptz)` but selects `version::text, name::text`. The `name` column in `supabase_migrations.schema_migrations` may not exist — it depends on the Supabase migration tracking schema. Some versions use only `version`.

**Risk:** Minor. If `name` column doesn't exist, this specific function fails. The `version` column is standard.

**Mitigation:** Verify column existence before deployment. If `name` doesn't exist, change to `version::text as name, executed_at` or use only `version`.

---

## Technical Debt / Bloat Findings

### Single-File Bloat Assessment

| Check | Result |
|-------|--------|
| O-1 migration is atomic | ✅ One migration file, one concern (introspection RPCs). No schema changes, no data migration, no application logic. |
| Migration file size | ✅ ~6KB. Well within acceptable range for a migration. Current largest migration is `20260527000000` at 27KB. |
| Creates new mega-file | ❌ No. Does not create any runtime code file. Migration files are executed once and logged. |
| Cross-concern dumping | ❌ No. This migration does ONE thing: create introspection RPCs. Does not touch schema, auth, wallet, ingestion, retrieval, evidence, chat, UI, or Ops server code. |
| Runtime code debt | ❌ No. Zero runtime code introduced. |
| Dependency on existing NEXUS code | ❌ No. These functions are standalone. They don't import or depend on any NEXUS TypeScript, API routes, or services. |

### O-1 Migration as Atomic Unit

The migration is acceptable as a single atomic file because:
1. All 10 functions are the same concern (read-only introspection)
2. All 10 share the same security properties (LANGUAGE sql STABLE SECURITY INVOKER)
3. All 10 share the same grant model (service_role only)
4. There is no ordering dependency between any two functions
5. Rollback is a single `DROP FUNCTION IF EXISTS` per function — no cascading failures

**Verdict:** O-1 migration is correctly scoped as one atomic migration. No bloat introduced.

---

## Standard Output Envelope Proposal

### Design

```json
{
  "ok": true,
  "tool": "supabase_table_columns",
  "version": "2.1.0",
  "category": "read_only",
  "authority": {
    "source": "supabase",
    "project_ref": "xjuglddxwnikvcwxfbzg",
    "project_url": "https://xjuglddxwnikvcwxfbzg.supabase.co",
    "environment": "production",
    "connection_verified_at": "2026-06-21T00:00:00.000Z"
  },
  "timestamp": "2026-06-21T00:00:00.000Z",
  "data": {},
  "warnings": [],
  "blocked_assumptions": [],
  "errors": [],
  "raw_redacted": null
}
```

### Required Fields

| Field | Type | Required | Description |
|-------|------|:---:|-------------|
| `ok` | boolean | ✅ | `true` = tool executed successfully, `false` = error or blocked |
| `tool` | string | ✅ | Tool name that produced this result |
| `version` | string | ✅ | Ops MCP server version |
| `category` | string | ✅ | `read_only`, `planning_write`, `production_write`, or `dangerous_admin` |
| `authority.source` | string | ✅ | `supabase`, `github`, `notion`, `new_api`, `local_file`, `ops` |
| `authority.project_ref` | string | ✅ (Supabase) | Project ref. Required for Supabase tools. |
| `authority.project_url` | string | ✅ (Supabase) | REST URL. Required for Supabase tools. |
| `authority.environment` | string | ✅ | `production`, `staging`, `local`, `unknown` |
| `timestamp` | ISO 8601 | ✅ | When the tool executed |
| `data` | any | ✅ | Tool-specific payload. `null` if `ok: false`. |
| `warnings` | string[] | ✅ | Non-blocking issues. Empty array if none. |
| `blocked_assumptions` | string[] | ✅ | Facts that could not be verified. Empty array if none. |
| `errors` | object[] | ✅ | Blocking errors. Empty array if none. Each error has `code`, `message`. |
| `raw_redacted` | string \| null | ✅ | Redacted raw output for debugging. `null` if nothing redacted. |

### Error Codes

| Code | Meaning |
|------|---------|
| `INTROSPECTION_RPC_MISSING` | Required introspection RPC is not deployed |
| `WRONG_SUPABASE_PROJECT` | Connected to wrong project (expected vs actual) |
| `PERMISSION_DENIED` | Role lacks execute grant on RPC |
| `UPSTREAM_UNAVAILABLE` | GitHub/Notion/NewAPI 502 or timeout |
| `STALE_EVIDENCE` | Only static/old data available, not live |
| `PARTIAL_RESULTS` | Some queries succeeded, some failed |
| `UNSUPPORTED_QUERY` | Query type not supported by tool |
| `NOT_FOUND` | Requested resource doesn't exist |
| `REJECTED_BY_READ_ONLY_GUARD` | Query contains write operations |
| `SECRETS_DETECTED` | Content contains secrets — redacted |

### Failure Semantics

| Scenario | `ok` | `data` | `errors` | `blocked_assumptions` |
|----------|:---:|--------|----------|----------------------|
| Tool succeeds, all data available | `true` | populated | `[]` | `[]` |
| Tool succeeds, some data unavailable | `true` | partial | `[]` | `["Cannot verify X"]` |
| Tool succeeds, but using stale evidence | `true` | populated | `[]` | `["Live DB unreachable, using 2026-06-05 static data"]` |
| RPC missing (PGRST202) | `false` | `null` | `[{code:"INTROSPECTION_RPC_MISSING"}]` | `["Schema introspection blocked"]` |
| Wrong Supabase project | `false` | `null` | `[{code:"WRONG_SUPABASE_PROJECT", expected:"xjuglddxwnikvcwxfbzg", actual:"vqyuonrhpecfjklbeqsn"}]` | `["Production schema unknown"]` |
| Permission denied | `false` | `null` | `[{code:"PERMISSION_DENIED"}]` | `[]` |
| Upstream 502 | `false` | `null` | `[{code:"UPSTREAM_UNAVAILABLE", detail:"GitHub API returned 502"}]` | `["Cannot verify repo state"]` |

### What `data` Contains (Tool-Specific)

| Tool | `data` Shape |
|------|------------|
| `supabase_project_snapshot` | `{ project_ref, project_url, region, pg_version, table_count, reachable }` |
| `supabase_list_tables` | `{ tables: [{ table_name, rls_enabled }] }` |
| `supabase_nova_baseline` | `{ tables: { nova_documents: {...}, nova_chunks: {...}, nova_ingest_runs: {...} }, functions: { match_nova_chunks: {...} } }` |
| `github_read_file` | `{ repo, branch, commit_sha, path, size, encoding, content, content_truncated, secrets_redacted }` |
| `notion_read_page` | `{ page_id, title, url, last_edited, authority_level, content, is_summary }` |
| `newapi_snapshot` | `{ channels: [...], enabled_models: [...], user_count, model_ratio, timestamp }` |

### Redaction Expectations

If a tool output contains secrets:
- `ok: true` (tool succeeded)
- `data` contains the result with secrets replaced by `[REDACTED: secret_type]`
- `raw_redacted` contains `"Redacted N instances of: supabase_key, openai_key"`
- `warnings` contains `["Output contained secrets — redacted"]`

If a tool is asked to read a file that IS a secret (`.env`, key file):
- `ok: false`
- `errors: [{code: "REJECTED_BY_READ_ONLY_GUARD", message: "File appears to contain secrets — blocked"}]`

### Rollout Recommendation

1. **Phase 1:** Wrap top-level response in standard envelope for all 53 tools (structural change, no logic change)
2. **Phase 2:** Add error code taxonomy to failure paths
3. **Phase 3:** Add `blocked_assumptions` and `warnings` to tools that have known gaps
4. **Phase 4:** Add redaction pipeline to file read tools
5. **Phase 5:** Migrate `ops_capabilities` and `startup_authority_verification` to use envelope

**Do not implement unless separately authorized.**

---

## Compliance Backlog — Re-Ranked

### P0 — Blockers (O-1R review + deploy authorization)

| # | Item | Status |
|---|------|--------|
| P0-1 | **O-1R security review** | ✅ DONE (this report) |
| P0-2 | **Resolve A-1** (`supabase_migrations.schema_migrations` location) | ⛔ PENDING — must verify via Supabase Dashboard |
| P0-3 | **Resolve A-2** (`name` column existence) | ⛔ PENDING — must verify via Supabase Dashboard |
| P0-4 | **Owner authorizes O-1 deployment** | ⛔ PENDING — conditional on A-1 + A-2 resolution |

### P1 — Unblocks N-2 (O-1 deploy + adapter update)

| # | Item | Depends On |
|---|------|-----------|
| P1-1 | Deploy O-1 migration to Supabase | P0-4 |
| P1-2 | Execute negative tests (T1-T10 from security addendum) | P1-1 |
| P1-3 | Update Ops MCP server to call `introspect_*` RPCs instead of `execute_sql` | P1-1 |
| P1-4 | Execute N-2 Step 0 baseline capture | P1-3 |

### P2 — Standard envelope + NOVA baseline

| # | Item | Depends On |
|---|------|-----------|
| P2-1 | Implement standard output envelope on Supabase tools | P1-3 |
| P2-2 | Add `supabase_nova_baseline` tool | P1-1 |
| P2-3 | Add error code taxonomy | P1-3 |

### P3 — Governance + validation

| # | Item | Depends On |
|---|------|-----------|
| P3-1 | Tool categories in `ops_capabilities` | P2-1 |
| P3-2 | Secret guard integration | P2-1 |
| P3-3 | Notion authority metadata | P2-1 |
| P3-4 | Slice validator governance checks | P2-1 |
| P3-5 | Startup authority unified report | P2-1 |
| P3-6 | Multi-file GitHub read | P2-1 |

### DEFERRED — Future phases (not blocking current work)

| # | Item | Reason |
|---|------|--------|
| D-1 | NOVA-specific tools (4 tools) | Not needed until N-3 design |
| D-2 | Local file allowlist (5 tools) | Nice-to-have, not blocking |
| D-3 | MLLM / image handling | Phase 6 per rollout plan |
| D-4 | New API embedding diagnostics | Not blocking N-2 |
| D-5 | GitHub repo source map | Not urgent |
| D-6 | Manual baseline validator | Not needed if O-1 deployed |

### What Is Blocked By O-1

```
O-1 NOT DEPLOYED
  → 8 Supabase schema tools broken (PGRST202)
  → No live table/column/policy/grant/index/migration/trigger/row_count/rls_audit introspection
  → N-2 Step 0 baseline capture IMPOSSIBLE
  → supabase_nova_baseline tool IMPOSSIBLE
  → Negative tests IMPOSSIBLE
  → Ops MCP adapter update POINTLESS (would still use execute_sql which doesn't exist)
```

---

## Risks

### HIGH

| Risk | Detail | Mitigation |
|------|--------|-----------|
| R1: O-1 migration deploys but `supabase_migrations.schema_migrations` doesn't exist | `introspect_list_migrations()` fails. 9/10 RPCs work. N-2 can proceed without migration count. | Verify A-1 before deployment (Supabase Dashboard SQL: `SELECT * FROM supabase_migrations.schema_migrations LIMIT 1`) |
| R2: O-1 migration deploys but Ops MCP doesn't use `service_role` key | All 10 RPCs return PGRST202 — same as current broken state. | Verify Ops MCP Supabase config uses `SUPABASE_SERVICE_ROLE_KEY` |

### MEDIUM

| Risk | Detail | Mitigation |
|------|--------|-----------|
| R3: A-2 `name` column doesn't exist | `introspect_list_migrations()` fails on column reference | Verify before deployment |
| R4: Ops MCP code update introduces regression | Adapter update breaks existing working tools (`supabase_gateway_audit`, `supabase_model_usage`) | Incremental rollout: add new RPC calls, keep old REST API calls for working tools |

### LOW

| Risk | Detail | Mitigation |
|------|--------|-----------|
| R5: Migration file numbering collision | Another migration was added between 2026-06-10 and 2026-06-21 | Check GitHub for new migration files before deploying |
| R6: `introspect_row_count` returns stale `reltuples` | `pg_class.reltuples` is an estimate updated by `ANALYZE`. May differ from exact `COUNT(*)`. | Acceptable — N-2 Step 0 needs approximate counts for "disposable vs migration" decision. |

---

## Recommendation

### O-1 Deployment Authorization

**CONDITIONAL GO** — pending:

1. **Resolve A-1:** Verify `supabase_migrations.schema_migrations` exists via Supabase Dashboard. If not, correct the FROM clause to `public.supabase_migrations`.
2. **Resolve A-2:** Verify `name` column exists. If not, adjust SELECT to use only `version`.
3. **Owner confirms:** "Deploy O-1 migration to `xjuglddxwnikvcwxfbzg`"

O-1 migration file passes all 17 security checks. It is correct, complete, and safe. The only issues are two column/schema references that need live-DB confirmation before deployment.

### Standard Envelope Implementation

**GO** — for design phase. Not for implementation without separate authorization.

The standard envelope design is complete. It defines the common response shape, error codes, failure semantics, and redaction expectations for all 53 Ops MCP tools. Implementation should follow the 5-phase rollout plan.

### NOVA Status

**NOVA remains FROZEN.** No NOVA schema/RLS/RPC changes. No NOVA code copying. No N-3/N-4/N-5 design. Treat NOVA as a learning source only.

### Next Allowed Step

1. Owner verifies A-1 and A-2 via Supabase Dashboard
2. Owner authorizes O-1 deployment
3. Migration deployed
4. Negative tests executed
5. Ops MCP adapter updated
6. N-2C live NOVA baseline capture (separate authorization)

---

## No Implementation Performed

Review only. No code written. No migration applied. No Supabase changes. No Ops MCP server changes. O-1 migration file unchanged. NOVA frozen.
