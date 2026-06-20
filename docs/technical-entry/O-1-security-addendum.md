# O-1 Addendum: Security Hardening

**Date:** 2026-06-21
**Status:** Security addendum. Binding on O-1 implementation.
**Authority:** O-1 design + owner security directive

---

## 1. Grant Correction: `service_role` Only

### Issue

O-1 §4.2 proposed granting EXECUTE to `authenticated`. The owner directive requires `service_role` only.

### Correction

```sql
-- REVOKE ALL from all roles first
REVOKE ALL ON FUNCTION public.introspect_list_tables() FROM PUBLIC, anon, authenticated;
-- ... (all 11 functions)

-- GRANT EXECUTE to service_role ONLY
GRANT EXECUTE ON FUNCTION public.introspect_list_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_table_columns(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_list_policies(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_list_functions() TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_list_indexes(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_list_migrations() TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_list_triggers(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_row_count(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_table_grants(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_rpc_body(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_rls_audit() TO service_role;

-- NO grants to: PUBLIC, anon, authenticated
-- service_role bypasses RLS — these functions are server-side only
```

### What This Means

- The Ops MCP server must use `SUPABASE_SERVICE_ROLE_KEY` to call these RPCs
- Browser clients (anon/authenticated) receive `PGRST202` — "function not found"
- No user, even authenticated, can introspect the schema
- This is the correct posture for an ops/infra tool

---

## 2. Remove `introspect_rpc_body`

### Issue

`introspect_rpc_body(p_function text)` exposes function source code. While function source is queryable via `pg_proc`, having a dedicated RPC for it creates an unnecessary surface.

### Correction

**Remove `introspect_rpc_body` from the RPC set.** RPC body inspection can be done directly via Supabase Dashboard when needed. It is not required for automated N-2 baseline capture.

### Reduced RPC Inventory (10 Functions)

| # | RPC Name | Ops MCP Tool |
|---|----------|-------------|
| 1 | `introspect_list_tables()` | `supabase_list_tables` |
| 2 | `introspect_table_columns(p_table)` | `supabase_table_columns` |
| 3 | `introspect_list_policies(p_table)` | `supabase_list_policies` |
| 4 | `introspect_list_functions()` | `supabase_list_functions` |
| 5 | `introspect_list_indexes(p_table)` | `supabase_list_indexes` |
| 6 | `introspect_list_migrations()` | `supabase_list_migrations` |
| 7 | `introspect_list_triggers(p_table)` | `supabase_list_triggers` |
| 8 | `introspect_row_count(p_table)` | Row count queries |
| 9 | `introspect_table_grants(p_table)` | Grant queries |
| 10 | `introspect_rls_audit()` | `supabase_rls_audit` |

---

## 3. No Dynamic SQL — Metadata-Only Catalog Queries

### Issue

O-1 already specified `LANGUAGE sql STABLE` and `SET search_path = ''`. Owner requires explicit confirmation that no dynamic SQL exists and all queries are metadata-only.

### Confirmation

Every function body is a single static `SELECT` statement against `pg_catalog` and `information_schema`. No function constructs SQL strings. No `EXECUTE` statements. No `format()` or string concatenation in queries. Verification:

| Function | Tables Queried | User Data? |
|----------|---------------|:---:|
| `introspect_list_tables` | `pg_catalog.pg_tables`, `pg_catalog.pg_class` | ❌ |
| `introspect_table_columns` | `information_schema.columns` | ❌ |
| `introspect_list_policies` | `pg_catalog.pg_policies` | ❌ |
| `introspect_list_functions` | `pg_catalog.pg_proc`, `pg_catalog.pg_namespace` | ❌ |
| `introspect_list_indexes` | `pg_catalog.pg_class`, `pg_catalog.pg_index`, `pg_catalog.pg_am`, `pg_catalog.pg_attribute` | ❌ |
| `introspect_list_migrations` | `public.supabase_migrations` | ❌ (migration metadata, not user content) |
| `introspect_list_triggers` | `pg_catalog.pg_trigger`, `pg_catalog.pg_proc`, `pg_catalog.pg_class` | ❌ |
| `introspect_row_count` | `pg_catalog.pg_class` (reads `reltuples` — row count estimate, not row data) | ❌ |
| `introspect_table_grants` | `information_schema.role_table_grants` | ❌ |
| `introspect_rls_audit` | `pg_catalog.pg_tables`, `pg_catalog.pg_class`, `pg_catalog.pg_policies` | ❌ |

**Zero user data tables accessed.** No `messages`, `workspaces`, `nova_documents`, `nova_chunks`, `nova_ingest_runs`, `user_new_api_tokens`, `model_usage_ledger`, or any other application table.

---

## 4. Supabase Migration `supabase_migrations` Read Access

### Issue

`introspect_list_migrations()` queries `public.supabase_migrations`. This table is created by Supabase CLI and typically readable by authenticated. With `service_role`-only grants, this is non-issue. But worth noting.

### Confirmation

`supabase_migrations` contains migration filenames and timestamps only. No secrets, no user data. It's system metadata. Reading it via `service_role` is safe.

---

## 5. Negative Test Contract

### 5.1 Tests That MUST Pass Before O-1 Is Complete

| # | Test | Expected Result |
|---|------|----------------|
| T1 | Call `introspect_list_tables()` with anon key | `PGRST202` — function not found (or permission denied) |
| T2 | Call `introspect_list_tables()` with authenticated key (no service_role) | `PGRST202` — function not found (or permission denied) |
| T3 | Call `introspect_list_tables()` with service_role key | ✅ Returns table list |
| T4 | Call `introspect_list_policies('nova_documents')` with service_role | ✅ Returns policy definitions |
| T5 | Call `introspect_list_policies('nova_documents')` with anon key | `PGRST202` |
| T6 | Call `introspect_rls_audit()` with service_role | ✅ Returns RLS audit for all tables |
| T7 | Call `introspect_rls_audit()` with authenticated key | `PGRST202` |
| T8 | Call `introspect_row_count('messages')` with anon key | `PGRST202` |
| T9 | Verify no introspection RPC appears in Data API docs (anon view) | Not listed |
| T10 | Verify Ops MCP `supabase_list_tables` tool works after update | ✅ Returns table list |

### 5.2 Test Execution

These tests must be run via `curl` against the Supabase REST API after deployment:

```bash
# Test T1 (anon — must fail)
curl -s "https://xjuglddxwnikvcwxfbzg.supabase.co/rest/v1/rpc/introspect_list_tables" \
  -H "apikey: $SUPABASE_ANON_KEY"
# Expected: {"code":"PGRST202","message":"Could not find the function..."}

# Test T3 (service_role — must succeed)
curl -s "https://xjuglddxwnikvcwxfbzg.supabase.co/rest/v1/rpc/introspect_list_tables" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
# Expected: [{"table_name":"nova_documents","rls_enabled":true}, ...]
```

---

## 6. Updated Rollback Script

```sql
DROP FUNCTION IF EXISTS public.introspect_list_tables();
DROP FUNCTION IF EXISTS public.introspect_table_columns(text);
DROP FUNCTION IF EXISTS public.introspect_list_policies(text);
DROP FUNCTION IF EXISTS public.introspect_list_functions();
DROP FUNCTION IF EXISTS public.introspect_list_indexes(text);
DROP FUNCTION IF EXISTS public.introspect_list_migrations();
DROP FUNCTION IF EXISTS public.introspect_list_triggers(text);
DROP FUNCTION IF EXISTS public.introspect_row_count(text);
DROP FUNCTION IF EXISTS public.introspect_table_grants(text);
DROP FUNCTION IF EXISTS public.introspect_rls_audit();
```

---

## 7. Updated Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| 10 RPCs created (not 11 — `introspect_rpc_body` removed) | Required |
| All grants: `service_role` only | Required |
| No grants to `PUBLIC`, `anon`, `authenticated` | Required |
| All queries: `pg_catalog`/`information_schema` only, no user data | Required |
| No dynamic SQL in any function body | Required |
| All 10 negative tests passing | Required |
| Ops MCP `supabase_list_tables` returns data | Required |
| Ops MCP `supabase_list_policies` returns policy SQL | Required |
| Ops MCP `supabase_rls_audit` returns RLS audit | Required |
| Migration file reviewed | Required |
| Rollback script reviewed | Required |

---

## Amendment to O-1

O-1 §4.2 (Grant Design) is amended: `authenticated` → `service_role`.
O-1 §3.10 (`introspect_rpc_body`) is removed from the RPC set.
O-1 §2.2 (RPC Inventory) is amended: 11 functions → 10 functions.

---

## No Implementation Performed

Security addendum only. No RPCs created. No grants modified. O-1 design amended, not implemented.
