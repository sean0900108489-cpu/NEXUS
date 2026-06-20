-- Migration: Create read-only introspection RPCs for Ops MCP server
-- Purpose: Replace non-existent execute_sql() with narrow, auditable, metadata-only RPCs
-- Grants: service_role only — no anon, no authenticated, no PUBLIC
-- Rollback: DROP FUNCTION all 10 RPCs — zero data impact
-- Design: O-1 + O-1 Security Addendum 2026-06-21

-- ============================================================================
-- 1. introspect_list_tables — list all public tables with RLS status
-- ============================================================================
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

COMMENT ON FUNCTION public.introspect_list_tables()
IS 'Read-only introspection: list all tables in public schema with RLS status. Metadata only — no user data. Ops MCP tool: supabase_list_tables.';

-- ============================================================================
-- 2. introspect_table_columns — column metadata for a table
-- ============================================================================
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

COMMENT ON FUNCTION public.introspect_table_columns(text)
IS 'Read-only introspection: column metadata for a public table. Metadata only — no user data. Ops MCP tool: supabase_table_columns.';

-- ============================================================================
-- 3. introspect_list_policies — RLS policies for a table
-- ============================================================================
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
    coalesce(p.qual::text, ''),
    coalesce(p.with_check::text, ''),
    p.roles::text[]
  FROM pg_catalog.pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename = p_table
  ORDER BY p.policyname;
$$;

COMMENT ON FUNCTION public.introspect_list_policies(text)
IS 'Read-only introspection: RLS policy definitions for a table. Metadata only — no user data. Ops MCP tool: supabase_list_policies.';

-- ============================================================================
-- 4. introspect_list_functions — all user-defined functions
-- ============================================================================
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
    (n.nspname = 'public')
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND p.proname NOT LIKE 'pg_%'
    AND p.prokind = 'f'
  ORDER BY p.proname;
$$;

COMMENT ON FUNCTION public.introspect_list_functions()
IS 'Read-only introspection: all user-defined functions with security properties. Metadata only — no user data. Ops MCP tool: supabase_list_functions.';

-- ============================================================================
-- 5. introspect_list_indexes — indexes for a table
-- ============================================================================
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

COMMENT ON FUNCTION public.introspect_list_indexes(text)
IS 'Read-only introspection: index definitions for a table. Metadata only — no user data. Ops MCP tool: supabase_list_indexes.';

-- ============================================================================
-- 6. introspect_list_migrations — Supabase migration history
-- ============================================================================
CREATE OR REPLACE FUNCTION public.introspect_list_migrations()
RETURNS TABLE(version text, description text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    m.version::text,
    COALESCE(m.name, m.version)::text
  FROM supabase_migrations.schema_migrations m
  ORDER BY version;
$$;

COMMENT ON FUNCTION public.introspect_list_migrations()
IS 'Read-only introspection: migration history. Returns version (timestamp prefix) and description. Metadata only — no user data. Ops MCP tool: supabase_list_migrations.';

-- ============================================================================
-- 7. introspect_list_triggers — triggers for a table
-- ============================================================================
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
      ELSE ''
    END,
    CASE WHEN tg.tgdeferrable THEN 'DEFERRABLE' ELSE 'IMMEDIATE' END,
    p.proname::text
  FROM pg_catalog.pg_trigger tg
  JOIN pg_catalog.pg_class c ON c.oid = tg.tgrelid
  JOIN pg_catalog.pg_proc p ON p.oid = tg.tgfoid
  WHERE c.relname = p_table
    AND c.relnamespace = 'public'::regnamespace
    AND NOT tg.tgisinternal
  ORDER BY tg.tgname;
$$;

COMMENT ON FUNCTION public.introspect_list_triggers(text)
IS 'Read-only introspection: trigger definitions for a table. Metadata only — no user data. Ops MCP tool: supabase_list_triggers.';

-- ============================================================================
-- 8. introspect_row_count — estimated row count for a table
-- ============================================================================
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

COMMENT ON FUNCTION public.introspect_row_count(text)
IS 'Read-only introspection: estimated row count from pg_class.reltuples. Fast estimate, not exact COUNT. Metadata only — no user data.';

-- ============================================================================
-- 9. introspect_table_grants — privilege grants for a table
-- ============================================================================
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

COMMENT ON FUNCTION public.introspect_table_grants(text)
IS 'Read-only introspection: privilege grants for a table. Metadata only — no user data.';

-- ============================================================================
-- 10. introspect_rls_audit — RLS status across all public tables
-- ============================================================================
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
    bool_or(coalesce(p.qual, '') = '' OR p.cmd IN ('INSERT','UPDATE','DELETE'))
  FROM pg_catalog.pg_tables t
  JOIN pg_catalog.pg_class c ON c.relname = t.tablename
    AND c.relnamespace = 'public'::regnamespace
  LEFT JOIN pg_catalog.pg_policies p ON p.tablename = t.tablename
    AND p.schemaname = 'public'
  WHERE t.schemaname = 'public'
  GROUP BY t.tablename, c.relrowsecurity
  ORDER BY t.tablename;
$$;

COMMENT ON FUNCTION public.introspect_rls_audit()
IS 'Read-only introspection: RLS audit across all public tables. Metadata only — no user data. Ops MCP tool: supabase_rls_audit.';

-- ============================================================================
-- GRANTS: service_role ONLY
-- ============================================================================
REVOKE ALL ON FUNCTION public.introspect_list_tables() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_table_columns(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_list_policies(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_list_functions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_list_indexes(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_list_migrations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_list_triggers(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_row_count(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_table_grants(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.introspect_rls_audit() FROM PUBLIC;

-- REVOKE from anon/authenticated explicitly
REVOKE ALL ON FUNCTION public.introspect_list_tables() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.introspect_table_columns(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.introspect_list_policies(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.introspect_list_functions() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.introspect_list_indexes(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.introspect_list_migrations() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.introspect_list_triggers(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.introspect_row_count(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.introspect_table_grants(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.introspect_rls_audit() FROM anon, authenticated;

-- GRANT to service_role only
GRANT EXECUTE ON FUNCTION public.introspect_list_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_table_columns(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_list_policies(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_list_functions() TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_list_indexes(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_list_migrations() TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_list_triggers(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_row_count(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_table_grants(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.introspect_rls_audit() TO service_role;
