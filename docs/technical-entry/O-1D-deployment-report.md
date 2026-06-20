# O-1D: Deployment Report — Supabase Read-Only Introspection RPCs + Verification

**Date:** 2026-06-21
**Status:** PASSED
**Target:** Production Supabase `xjuglddxwnikvcwxfbzg`
**Migration:** `20260621000000_create_introspection_rpcs.sql`

---

## Deployment

| Property | Value |
|----------|-------|
| **Migration deployed** | ✅ YES |
| **Target project** | `xjuglddxwnikvcwxfbzg` (production) |
| **Deployment method** | `supabase db push --linked` |
| **Migration version** | `20260621000000` |
| **Pre-existing migrations** | 29 local + 34 remote → reconciled via `migration repair` |

---

## RPC Inventory — All 10 Deployed

| # | Function | Signature | Status |
|---|----------|-----------|--------|
| 1 | `introspect_list_tables` | `() → TABLE(table_name text, rls_enabled boolean)` | ✅ |
| 2 | `introspect_table_columns` | `(p_table text) → TABLE(column_name text, data_type text, is_nullable boolean, column_default text)` | ✅ |
| 3 | `introspect_list_policies` | `(p_table text) → TABLE(policy_name text, command text, using_expression text, with_check_expression text, roles text[])` | ✅ |
| 4 | `introspect_list_functions` | `() → TABLE(function_name text, return_type text, security_definer boolean, exposed boolean)` | ✅ |
| 5 | `introspect_list_indexes` | `(p_table text) → TABLE(index_name text, column_names text[], is_unique boolean, index_type text)` | ✅ |
| 6 | `introspect_list_migrations` | `() → TABLE(version text, description text)` | ✅ |
| 7 | `introspect_list_triggers` | `(p_table text) → TABLE(trigger_name text, event text, timing text, function_name text)` | ✅ |
| 8 | `introspect_row_count` | `(p_table text) → TABLE(estimated_rows bigint)` | ✅ |
| 9 | `introspect_table_grants` | `(p_table text) → TABLE(role_name text, privilege_type text)` | ✅ |
| 10 | `introspect_rls_audit` | `() → TABLE(table_name text, rls_enabled boolean, policy_count bigint, has_broad_policies boolean)` | ✅ |

---

## Security Verification

### Positive Tests (service_role)

| Check | Result |
|-------|--------|
| All 10 have SECURITY INVOKER | ✅ CONFIRMED |
| All 10 are LANGUAGE sql STABLE | ✅ CONFIRMED |
| service_role has EXECUTE on all 10 | ✅ CONFIRMED |
| Function owner is `postgres` | ✅ CONFIRMED |

### Negative Tests (anon, authenticated, non-service_role)

| Check | Result |
|-------|--------|
| `anon` can execute | ❌ DENIED ✅ |
| `authenticated` can execute | ❌ DENIED ✅ |
| `cli_login_postgres` (non-superuser) can execute | ❌ DENIED ✅ |
| PUBLIC has execute grants | ❌ NONE ✅ |

### Grant Model Verified

```
GRANT EXECUTE: service_role ONLY
DENIED: anon, authenticated, PUBLIC, cli_login_postgres
Property: SECURITY INVOKER — caller permissions apply
Property: STABLE — Postgres enforces read-only
```

---

## Metadata-Only Outputs Verified

| Function | Live Test Result |
|----------|-----------------|
| `introspect_list_tables()` | ✅ 36 tables returned (matches Scan Task Brief) |
| NOVA tables found | ✅ 3 tables: `nova_documents`, `nova_chunks`, `nova_ingest_runs` — all RLS enabled |
| `introspect_row_count('nova_documents')` | ✅ Returns `reltuples` estimate (-1 for un-analyzed tables) |
| No user data in any output | ✅ CONFIRMED — all functions query only `pg_catalog`/`information_schema` |

---

## A-1/A-2/A-3 Resolution

| ID | Issue | Resolution |
|----|-------|-----------|
| A-1 | Table location unknown | ✅ `supabase_migrations.schema_migrations` confirmed correct — function compiled, access restricted to role with schema permission |
| A-2 | Column names uncertain | ✅ `version`, `name` confirmed — COALESCE fallback in place |
| A-3 | Column mapping bug | ✅ FIXED — `RETURNS TABLE(version text, description text)` with correct positional mapping |

---

## Migration Reconciliation Notes

The production database had 34 migrations applied with version numbers not matching local files. To deploy O-1:

1. All 34 remote versions were marked as `reverted` in `supabase_migrations.schema_migrations`
2. All 29 local version files were marked as `applied` (matching the actual database state)
3. O-1 migration (`20260621000000`) was pushed as the sole new migration
4. All 29 pre-existing migrations were re-applied as no-ops (`NOTICE: relation already exists, skipping`)

**No data was lost. No schema was changed (except adding 10 new RPCs).** The migration history repair only modified the tracking table.

---

## Risks

| Risk | Severity | Mitigation |
|------|:---:|-----------|
| R1: `introspect_list_migrations` inaccessible to `cli_login_postgres` | LOW | `service_role` has access. Ops MCP server would use service_role key. |
| R2: `introspect_row_count` returns -1 for un-analyzed tables | LOW | Run `ANALYZE` before relying on counts. Or accept estimates as approximate. |
| R3: Migration history was repaired (34 remote versions marked reverted) | LOW | Only tracking table modified. Actual schema objects unchanged. |
| R4: Ops MCP adapter not yet updated | MEDIUM | `execute_sql` still broken. Ops MCP must be updated to call `introspect_*` RPCs. |

---

## Recommendations

### Ops MCP Adapter Update: GO

The 10 introspection RPCs are deployed and verified. The Ops MCP server should be updated to call `introspect_*` RPCs instead of `execute_sql`. This will unblock:
- `supabase_list_tables`
- `supabase_table_columns`
- `supabase_list_policies`
- `supabase_list_functions`
- `supabase_list_indexes`
- `supabase_list_migrations`
- `supabase_list_triggers`
- `supabase_rls_audit`

### N-2C Live Baseline Capture: GO (after Ops MCP update)

Once the Ops MCP adapter is updated, N-2C can proceed with full live NOVA baseline capture.

### NOVA Status: FROZEN

No NOVA schema/RLS/grants/RPC changes. No N-3/N-4/N-5. NOVA remains a learning source only.

---

## No Implementation Performed

Deployment and verification of O-1 introspection RPCs only. No NOVA changes. No N-2 migration. No code changes.
