# O-1: Supabase Read-Only Introspection Authority Repair

**Date:** 2026-06-21
**Status:** Design-only. Do not deploy. Do not create migrations. Do not modify Supabase.
**Authority:** N-2B (Live Verification — `execute_sql` missing, schema introspection blocked)
**Supabase Project:** `xjuglddxwnikvcwxfbzg` (LOCKED)

---

## 1. Problem Statement

### 1.1 Current State

The Ops MCP server (`ops.supaseanexus.com`, v2.0.0, 53 tools) provides Supabase schema introspection tools (`supabase_list_tables`, `supabase_table_columns`, `supabase_list_policies`, `supabase_list_functions`, `supabase_list_indexes`, `supabase_list_migrations`, `supabase_rls_audit`, `supabase_generated_types_gap`). ALL of these tools are broken because they depend on `rpc('execute_sql', { sql })` — an RPC that does not exist in the NEXUS Supabase project.

Every tool call returns:
```
PGRST202: Could not find the function public.execute_sql(sql) in the schema cache
```

### 1.2 Impact

- N-2 cannot capture pre-migration baseline (Step 0) automatically
- N-2A's 10 unverifiable facts remain unverified
- All future schema/RPC/RLS/grant verification requires manual Supabase Dashboard access
- No automated CI/CD validation of schema state
- The Ops MCP server is effectively blind to Supabase internals

### 1.3 Why Not `execute_sql`

A generic `execute_sql(sql text)` RPC is dangerous:

| Risk | Detail |
|------|--------|
| **SQL injection surface** | An RPC that accepts arbitrary SQL and returns results is effectively a passthrough to the database. Any caller with execute permission can run any query. |
| **Accidental writes** | Even with `READ ONLY` transaction mode, the RPC signature doesn't prevent someone from calling it with DDL/DML. The guard is at the application layer (Ops MCP), not the database layer. |
| **Audit blindness** | Generic SQL execution produces no structured audit trail of what was queried. `SELECT * FROM user_new_api_tokens` would succeed silently. |
| **Permission explosion** | Granting `EXECUTE` on `execute_sql` grants the caller the union of all table permissions the function owner has. If owned by `service_role`, it's full database access. |
| **Tool fragility** | Every schema tool formats different SQL strings. Debugging a broken query requires inspecting the generated SQL. |

---

## 2. Design: Dedicated Read-Only Introspection RPCs

### 2.1 Principle

**Replace one generic `execute_sql` RPC with a set of narrow, purpose-built, read-only RPCs.** Each RPC does exactly one thing, returns a well-typed result, and is auditable.

### 2.2 RPC Inventory (11 Functions)

| # | RPC Name | Replaces | Returns | Security |
|---|----------|----------|---------|----------|
| 1 | `introspect_list_tables()` | `supabase_list_tables` | `TABLE(table_name text, rls_enabled boolean)` | Read-only, invoker |
| 2 | `introspect_table_columns(p_table text)` | `supabase_table_columns` | `TABLE(column_name text, data_type text, is_nullable boolean, column_default text)` | Read-only, invoker |
| 3 | `introspect_list_policies(p_table text)` | `supabase_list_policies` | `TABLE(policy_name text, command text, using_expression text, with_check_expression text, roles text[])` | Read-only, invoker |
| 4 | `introspect_list_functions()` | `supabase_list_functions` | `TABLE(function_name text, return_type text, security_definer boolean, exposed boolean)` | Read-only, invoker |
| 5 | `introspect_list_indexes(p_table text)` | `supabase_list_indexes` | `TABLE(index_name text, column_names text[], is_unique boolean, index_type text)` | Read-only, invoker |
| 6 | `introspect_list_migrations()` | `supabase_list_migrations` | `TABLE(name text, executed_at timestamptz)` | Read-only, invoker |
| 7 | `introspect_list_triggers(p_table text)` | `supabase_list_triggers` | `TABLE(trigger_name text, event text, timing text, function_name text)` | Read-only, invoker |
| 8 | `introspect_row_count(p_table text)` | Row count queries | `TABLE(estimated_rows bigint)` | Read-only, invoker |
| 9 | `introspect_table_grants(p_table text)` | Grant queries | `TABLE(role_name text, privilege_type text)` | Read-only, invoker |
| 10 | `introspect_rpc_body(p_function text)` | RPC source queries | `TEXT` (function source code) | Read-only, invoker |
| 11 | `introspect_rls_audit()` | `supabase_rls_audit` | `TABLE(table_name text, rls_enabled boolean, policy_count bigint, has_broad_policies boolean)` | Read-only, invoker |

### 2.3 Function Pattern (All 11 Follow This)

```sql
-- Template for all introspection functions
CREATE OR REPLACE FUNCTION public.introspect_list_tables()
RETURNS TABLE(table_name text, rls_enabled boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    t.tablename::text,
    t.relrowsecurity
  FROM pg_catalog.pg_tables t
  JOIN pg_catalog.pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
$$;

COMMENT ON FUNCTION public.introspect_list_tables()
IS 'Read-only introspection: list all tables in public schema with RLS status. Used by Ops MCP server.';
```

**Key properties shared by all 11 functions:**

1. **`LANGUAGE sql`** — declarative, no procedural logic. The function body IS the audit trail.
2. **`STABLE`** — promises no side effects. Postgres enforces this: no writes allowed.
3. **`SECURITY INVOKER`** — runs with the caller's privileges, not the function owner's. If `anon` calls it, they see only what `anon` can see.
4. **`SET search_path = ''`** — prevents search path injection attacks. All catalog references are schema-qualified (`pg_catalog.pg_tables`).
5. **Read-only by construction** — every function body is a single SELECT. No INSERT/UPDATE/DELETE/DROP/ALTER is possible in `LANGUAGE sql STABLE` functions.
6. **Well-typed returns** — each function returns a structured `TABLE(...)` or scalar, not generic JSON. The Ops MCP server gets typed results.

---

## 3. Function Implementations

### 3.1 `introspect_list_tables()`

```sql
CREATE OR REPLACE FUNCTION public.introspect_list_tables()
RETURNS TABLE(table_name text, rls_enabled boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    t.tablename::text,
    c.relrowsecurity
  FROM pg_catalog.pg_tables t
  JOIN pg_catalog.pg_class c ON c.relname = t.tablename
    AND c.relnamespace = 'public'::regnamespace
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
$$;
```

### 3.2 `introspect_table_columns(p_table text)`

```sql
CREATE OR REPLACE FUNCTION public.introspect_table_columns(p_table text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable boolean,
  column_default text
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES'),
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table
  ORDER BY c.ordinal_position;
$$;
```

### 3.3 `introspect_list_policies(p_table text)`

```sql
CREATE OR REPLACE FUNCTION public.introspect_list_policies(p_table text)
RETURNS TABLE(
  policy_name text,
  command text,
  using_expression text,
  with_check_expression text,
  roles text[]
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    p.policyname::text,
    p.cmd::text,
    p.qual::text,
    p.with_check::text,
    p.roles::text[]
  FROM pg_catalog.pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename = p_table
  ORDER BY p.policyname;
$$;
```

### 3.4 `introspect_list_functions()`

```sql
CREATE OR REPLACE FUNCTION public.introspect_list_functions()
RETURNS TABLE(
  function_name text,
  return_type text,
  security_definer boolean,
  exposed boolean
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    p.proname::text,
    pg_catalog.format_type(p.prorettype, NULL)::text,
    p.prosecdef,
    -- exposed = has SECURITY DEFINER with public execute OR is in public schema
    (p.prosecdef AND has_function_privilege('public', p.oid, 'execute'))
      OR (n.nspname = 'public')
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND p.proname NOT LIKE 'pg_%'
  ORDER BY p.proname;
$$;
```

### 3.5 `introspect_list_indexes(p_table text)`

```sql
CREATE OR REPLACE FUNCTION public.introspect_list_indexes(p_table text)
RETURNS TABLE(
  index_name text,
  column_names text[],
  is_unique boolean,
  index_type text
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    i.relname::text,
    array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum))::text[],
    ix.indisunique,
    am.amname::text
  FROM pg_catalog.pg_class t
  JOIN pg_catalog.pg_index ix ON t.oid = ix.indrelid
  JOIN pg_catalog.pg_class i ON i.oid = ix.indexrelid
  JOIN pg_catalog.pg_am am ON am.oid = i.relam
  JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid
    AND a.attnum = ANY(ix.indkey)
  WHERE t.relname = p_table
    AND t.relnamespace = 'public'::regnamespace
  GROUP BY i.relname, ix.indisunique, am.amname
  ORDER BY i.relname;
$$;
```

### 3.6 `introspect_list_migrations()`

```sql
CREATE OR REPLACE FUNCTION public.introspect_list_migrations()
RETURNS TABLE(name text, executed_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    m.name::text,
    m.executed_at
  FROM public.supabase_migrations m
  ORDER BY m.executed_at;
$$;

-- NOTE: This depends on supabase_migrations table being readable.
-- If this table is not in public, adjust schema.
-- Fallback: use pg_catalog if supabase_migrations is not accessible.
```

### 3.7 `introspect_list_triggers(p_table text)`

```sql
CREATE OR REPLACE FUNCTION public.introspect_list_triggers(p_table text)
RETURNS TABLE(
  trigger_name text,
  event text,
  timing text,
  function_name text
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    tg.tgname::text,
    CASE
      WHEN (tg.tgtype::int & 2) != 0 THEN 'BEFORE'
      WHEN (tg.tgtype::int & 64) != 0 THEN 'INSTEAD OF'
      ELSE 'AFTER'
    END
    || ' ' ||
    CASE
      WHEN (tg.tgtype::int & 4) != 0 THEN 'INSERT'
      WHEN (tg.tgtype::int & 8) != 0 THEN 'DELETE'
      WHEN (tg.tgtype::int & 16) != 0 THEN 'UPDATE'
      WHEN (tg.tgtype::int & 32) != 0 THEN 'TRUNCATE'
    END,
    CASE
      WHEN tg.tgdeferrable THEN 'DEFERRABLE'
      ELSE 'IMMEDIATE'
    END,
    p.proname::text
  FROM pg_catalog.pg_trigger tg
  JOIN pg_catalog.pg_class c ON c.oid = tg.tgrelid
  JOIN pg_catalog.pg_proc p ON p.oid = tg.tgfoid
  WHERE c.relname = p_table
    AND c.relnamespace = 'public'::regnamespace
    AND NOT tg.tgisinternal
  ORDER BY tg.tgname;
$$;
```

### 3.8 `introspect_row_count(p_table text)`

```sql
CREATE OR REPLACE FUNCTION public.introspect_row_count(p_table text)
RETURNS TABLE(estimated_rows bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    COALESCE(c.reltuples, 0)::bigint
  FROM pg_catalog.pg_class c
  WHERE c.relname = p_table
    AND c.relnamespace = 'public'::regnamespace;
$$;
```

### 3.9 `introspect_table_grants(p_table text)`

```sql
CREATE OR REPLACE FUNCTION public.introspect_table_grants(p_table text)
RETURNS TABLE(role_name text, privilege_type text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    grantee::text,
    privilege_type::text
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = p_table
  ORDER BY grantee, privilege_type;
$$;
```

### 3.10 `introspect_rpc_body(p_function text)`

```sql
CREATE OR REPLACE FUNCTION public.introspect_rpc_body(p_function text)
RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT pg_catalog.pg_get_functiondef(p.oid)
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = p_function
    AND n.nspname = 'public'
  LIMIT 1;
$$;
```

### 3.11 `introspect_rls_audit()`

```sql
CREATE OR REPLACE FUNCTION public.introspect_rls_audit()
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policy_count bigint,
  has_broad_policies boolean
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    t.tablename::text,
    c.relrowsecurity,
    COUNT(p.policyname)::bigint,
    bool_or(p.qual = '' OR p.qual IS NULL)  -- broad policy = empty USING clause
  FROM pg_catalog.pg_tables t
  JOIN pg_catalog.pg_class c ON c.relname = t.tablename
    AND c.relnamespace = 'public'::regnamespace
  LEFT JOIN pg_catalog.pg_policies p ON p.tablename = t.tablename
    AND p.schemaname = 'public'
  WHERE t.schemaname = 'public'
  GROUP BY t.tablename, c.relrowsecurity
  ORDER BY t.tablename;
$$;
```

---

## 4. Grants and Security Model

### 4.1 Principle

**Introspection is read-only metadata access. It should be available to `authenticated` users but NOT to `anon` users.** The Ops MCP server calls these functions as `authenticated` (via its Supabase key). No `service_role` needed for introspection.

### 4.2 Grant Design

```sql
-- REVOKE all from public first (safety)
REVOKE ALL ON FUNCTION public.introspect_list_tables() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_table_columns(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_list_policies(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_list_functions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_list_indexes(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_list_migrations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_list_triggers(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_row_count(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_table_grants(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_rpc_body(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_rls_audit() FROM PUBLIC;

-- GRANT execute to authenticated (Ops MCP uses authenticated key)
GRANT EXECUTE ON FUNCTION public.introspect_list_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.introspect_table_columns(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.introspect_list_policies(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.introspect_list_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.introspect_list_indexes(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.introspect_list_migrations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.introspect_list_triggers(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.introspect_row_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.introspect_table_grants(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.introspect_rpc_body(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.introspect_rls_audit() TO authenticated;

-- DO NOT grant to anon
-- DO NOT grant to service_role (service_role inherits all, no need to explicitly grant)
-- DO NOT grant to PUBLIC
```

### 4.3 Security Properties

| Property | How Achieved |
|----------|-------------|
| **No data exposure** | Functions query `pg_catalog` and `information_schema` — metadata only. No user data tables are queried. |
| **No write capability** | All functions are `LANGUAGE sql STABLE`. Postgres enforces: no INSERT/UPDATE/DELETE/TRUNCATE/ALTER/DROP inside STABLE functions. |
| **No privilege escalation** | `SECURITY INVOKER` — caller sees only what their role can see. If called as `anon`, they see only public metadata. |
| **No search path injection** | `SET search_path = ''` — all catalog references are schema-qualified. Prevents function hijacking. |
| **No secret leakage** | Functions return metadata (table names, column names, policy text, index definitions). They do NOT return row data, user content, tokens, or encrypted values. |
| **Auditable** | Each function has a COMMENT describing its purpose. The Ops MCP server logs every tool call. |

### 4.4 What These Functions CANNOT Do

- Cannot read user data from any table (no `SELECT * FROM messages`)
- Cannot read encrypted tokens (`user_new_api_tokens` not queried)
- Cannot execute DDL/DML (STABLE constraint)
- Cannot bypass RLS (SECURITY INVOKER — invoker's permissions apply)
- Cannot call other functions that do writes
- Cannot access tables outside `public` schema or `pg_catalog`/`information_schema`

---

## 5. Audit Trail

### 5.1 What Is Auditable

| Audit Point | Mechanism |
|-------------|-----------|
| **Which function was called** | Ops MCP server tool log (`ops_audit_log_recent`) |
| **What parameters were passed** | Ops MCP server tool log |
| **When it was called** | Ops MCP server tool log + Postgres query log |
| **Who called it** | Postgres `current_user` + Ops MCP server auth context |
| **What was returned** | Not captured (metadata only, no risk). Could be added to Ops MCP if needed. |

### 5.2 RPC Naming Convention for Audit

All functions are prefixed `introspect_` — easy to grep in Postgres logs:
```sql
-- Find all introspection calls in Postgres logs
SELECT * FROM postgres_log WHERE message LIKE '%introspect_%'
```

---

## 6. Ops MCP Server Integration

### 6.1 Tool Mapping Update

Each Ops MCP tool currently calls `rpc('execute_sql', { sql: '...' })`. After deployment, each tool calls the specific introspection RPC:

| Ops MCP Tool | Current Call | New Call |
|-------------|-------------|----------|
| `supabase_list_tables` | `rpc('execute_sql', { sql: 'SELECT ...' })` | `rpc('introspect_list_tables')` |
| `supabase_table_columns` | `rpc('execute_sql', { sql: 'SELECT ...' })` | `rpc('introspect_table_columns', { p_table })` |
| `supabase_list_policies` | `rpc('execute_sql', { sql: 'SELECT ...' })` | `rpc('introspect_list_policies', { p_table })` |
| `supabase_list_functions` | `rpc('execute_sql', { sql: 'SELECT ...' })` | `rpc('introspect_list_functions')` |
| `supabase_list_indexes` | `rpc('execute_sql', { sql: 'SELECT ...' })` | `rpc('introspect_list_indexes', { p_table })` |
| `supabase_list_migrations` | `rpc('execute_sql', { sql: 'SELECT ...' })` | `rpc('introspect_list_migrations')` |
| `supabase_rls_audit` | `rpc('execute_sql', { sql: 'SELECT ...' })` | `rpc('introspect_rls_audit')` |
| `supabase_generated_types_gap` | Combines list_tables + table_columns | Calls both new RPCs |

### 6.2 Migration Strategy for Ops MCP

1. Deploy introspection RPCs to Supabase (this design)
2. Update Ops MCP server code to call new RPCs (separate repo change)
3. Test each tool against production
4. Deprecate `execute_sql`-dependent code paths
5. Remove `execute_sql` expectation from Ops MCP

---

## 7. Temporary / Rollback Plan

### 7.1 Migration File

Single migration: `YYYYMMDDHHMMSS_create_introspection_rpcs.sql`

Contains:
- 11 `CREATE OR REPLACE FUNCTION` statements
- 11 `REVOKE ALL ... FROM PUBLIC` statements
- 11 `GRANT EXECUTE ... TO authenticated` statements
- COMMENTS on all functions

### 7.2 Rollback Migration

```sql
-- Drop all introspection RPCs (reverse of creation)
DROP FUNCTION IF EXISTS public.introspect_list_tables();
DROP FUNCTION IF EXISTS public.introspect_table_columns(text);
DROP FUNCTION IF EXISTS public.introspect_list_policies(text);
DROP FUNCTION IF EXISTS public.introspect_list_functions();
DROP FUNCTION IF EXISTS public.introspect_list_indexes(text);
DROP FUNCTION IF EXISTS public.introspect_list_migrations();
DROP FUNCTION IF EXISTS public.introspect_list_triggers(text);
DROP FUNCTION IF EXISTS public.introspect_row_count(text);
DROP FUNCTION IF EXISTS public.introspect_table_grants(text);
DROP FUNCTION IF EXISTS public.introspect_rpc_body(text);
DROP FUNCTION IF EXISTS public.introspect_rls_audit();
```

### 7.3 Rollback Safety

- All 11 functions are completely independent — no dependencies on other objects
- No tables, views, triggers, or indexes affected
- Dropping them has zero impact on application code
- No data loss possible (functions store no data)
- Ops MCP server would return to current broken state (`PGRST202`) — no worse than today

### 7.4 Temporary Nature

These functions can be temporary — a bridge until a different introspection mechanism is available (Supabase Management API, direct `psql` in CI, etc.). They add no ongoing maintenance burden. If Supabase later provides native introspection endpoints, these RPCs can be dropped.

---

## 8. Owner Approval Requirements

### 8.1 Decisions Required

| ID | Decision | Recommendation |
|----|----------|---------------|
| **O-1.1** | Deploy introspection RPCs to production? | **Yes** — unblocks N-2 verification, low risk |
| **O-1.2** | Grant EXECUTE to `authenticated` only, or also `anon`? | **`authenticated` only** — no anonymous introspection |
| **O-1.3** | Should `introspect_rpc_body` expose function source code? | **Yes** — function source is already queryable via `pg_proc`. This just wraps it. |
| **O-1.4** | Should `introspect_row_count` use `reltuples` (estimate) or `COUNT(*)` (exact)? | **`reltuples` (estimate)** — fast, good enough for pre-migration checks. Exact count requires seq scan. |
| **O-1.5** | Deploy as separate migration, or bundle with N-2 migration? | **Separate migration** — unblocks verification independently of N-2 hardening |
| **O-1.6** | Ops MCP server update: same PR or separate? | **Separate PR** — introspection RPCs first, verify, then update Ops MCP |

### 8.2 What Owner Should Review

1. **Function bodies** — verify no data-accessing queries exist (all are pg_catalog/information_schema only)
2. **Grant design** — verify no `anon` grants, no `PUBLIC` grants
3. **Rollback script** — verify `DROP FUNCTION` statements work
4. **Migration numbering** — verify it follows existing convention (currently migration 35 would be next)

### 8.3 Acceptance Criteria

After deployment, the following must succeed via Ops MCP or direct `curl`:

```
✅ supabase_list_tables    → returns list of public tables
✅ supabase_table_columns  → returns columns for nova_documents
✅ supabase_list_policies  → returns RLS policies for nova_documents
✅ supabase_list_functions → returns all user-defined functions
✅ supabase_list_indexes   → returns indexes for nova_chunks
✅ supabase_list_migrations → returns migration history
✅ supabase_rls_audit      → returns RLS status for all tables
```

---

## 9. Implementation Sequence

| Step | Action | Owner | Duration |
|------|--------|-------|----------|
| 1 | Owner reviews O-1 design | Owner | Review time |
| 2 | Owner approves O-1.1–O-1.6 | Owner | Decision time |
| 3 | Create migration file (migration 35) | Agent | 5 min |
| 4 | Review migration SQL | Owner + Agent | Review time |
| 5 | Deploy migration to production | Agent (when authorized) | 1 min |
| 6 | Verify all 11 RPCs exist | Agent | 2 min |
| 7 | Test Ops MCP schema tools | Agent | 5 min |
| 8 | Execute N-2 Step 0 baseline capture | Agent | 10 min |
| 9 | Produce N-2 live verification report | Agent | — |

---

## 10. Posture Statement

```
O-1 INTROSPECTION RPC POSTURE: READ-ONLY, NARROW, TEMPORARY, AUDITABLE

11 dedicated introspection RPCs replace one generic execute_sql.
All functions are:
  - LANGUAGE sql STABLE (read-only by Postgres enforcement)
  - SECURITY INVOKER (no privilege escalation)
  - SET search_path = '' (no injection surface)
  - Well-typed returns (not generic JSON)
  - Auditable (prefixed introspect_, logged by Ops MCP)

Grants: authenticated only. No anon. No PUBLIC.
Rollback: single DROP FUNCTION migration. No data impact.
Temporary: can be dropped when Supabase provides native introspection.

This design unblocks N-2 pre-migration verification
and all future automated schema validation.
```

---

## No Implementation Performed

Design only. No RPCs created. No migrations generated. No grants modified. Supabase project `xjuglddxwnikvcwxfbzg` unchanged.
