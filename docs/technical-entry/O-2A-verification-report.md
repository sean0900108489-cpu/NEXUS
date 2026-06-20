# O-2A: A-1/A-2 Verification — Migration Table Column Confirmation

**Date:** 2026-06-21
**Status:** Verification attempted. Live DB unreachable. O-1 migration adjustment required.
**Method:** Direct REST API (blocked — no anon key), Ops MCP `supabase_query` (blocked — O-1 not deployed), GitHub code search (blocked — auth), static source analysis (complete)
**Production Project:** `xjuglddxwnikvcwxfbzg` — confirmed reachable, REST API responding, no query access without API key

---

## 1. Verification Attempts

| Method | Result | Detail |
|--------|--------|--------|
| Ops MCP `supabase_query` | ❌ BLOCKED | `PGRST202: execute_sql` not deployed — O-1 not yet applied |
| Supabase REST API direct | ❌ BLOCKED | `"No API key found in request"` — anon key not available |
| GitHub code search | ❌ BLOCKED | `Authentication Failed` — token scope issue |
| Static source analysis | ✅ COMPLETE | Best available evidence compiled below |

## 2. Static Evidence

### 2.1 Supabase Migration Tracking Table — Standard Schema

Based on Supabase CLI documentation and standard deployment patterns, the migration tracking table has two possible locations:

**Option 1: `supabase_migrations.schema_migrations` (Supabase CLI standard)**
```sql
-- Created by supabase migration new / supabase db push
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  name text,
  statements text,
  executed_at timestamptz DEFAULT now()
);
```

**Option 2: `public.supabase_migrations` (legacy/alternative)**
```sql
CREATE TABLE public.supabase_migrations (
  version text PRIMARY KEY,
  name text,
  statements text,
  executed_at timestamptz DEFAULT now()
);
```

### 2.2 What the O-1 Migration Expects

Current O-1 `introspect_list_migrations()`:
```sql
SELECT
  version::text,
  name::text
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

This returns `TABLE(name text, executed_at timestamptz)` but maps `version` to the `name` column and `name` to the `executed_at` column. **This is a column mapping error regardless of table location.**

### 2.3 Analysis: The Function Has a Column Mapping Bug

The function signature says:
```sql
RETURNS TABLE(name text, executed_at timestamptz)
```

But the SELECT does:
```sql
SELECT version::text, name::text   -- version mapped to "name", name mapped to "executed_at"
```

The `RETURNS TABLE` uses positional mapping: first column → `name`, second column → `executed_at`. So `version::text` goes into the `name` output column, and `name::text` goes into `executed_at`. This is wrong — `version` is the migration filename (e.g., `20260621000000`), and `executed_at` should be a timestamp, not a text string from the `name` column.

### 2.4 Known Working Example from NOVA Schema Inventory

The NOVA V5 Schema Inventory reported migration filenames as:
```
20260605003734 create_nova_rag_schema_1536
20260605005812 harden_nova_function_search_path
```

These follow the pattern `YYYYMMDDHHMMSS description`. This matches the standard Supabase migration naming:

| Column | Example Value | Type |
|--------|--------------|------|
| `version` | `20260605003734` | text (timestamp prefix only) |
| `name` | `create_nova_rag_schema_1536` | text (description) |
| `statements` | (SQL body) | text |
| `executed_at` | `2026-06-05T00:37:34Z` | timestamptz |

---

## 3. Findings

### Finding A-1: Table Location — CANNOT VERIFY Without Live DB

| Possibility | Likelihood | Evidence |
|------------|:---:|----------|
| `supabase_migrations.schema_migrations` | **HIGH** | Supabase CLI default for managed projects |
| `public.supabase_migrations` | LOW | Alternative for self-managed or older setups |
| Does not exist at all | LOW | 28+ migrations applied — tracking table must exist somewhere |

**Without live DB access, I cannot confirm the exact schema name.**

### Finding A-2: Column Names — PARTIALLY VERIFIABLE from Static Evidence

| Column | Exists? | Evidence |
|--------|:---:|----------|
| `version` | ✅ YES | Standard Supabase column. Confirmed by migration naming convention. |
| `name` | ✅ LIKELY | Standard Supabase column for migration description. Present in migration filenames (`_create_nova_rag_schema_1536`). |
| `statements` | ✅ LIKELY | Standard Supabase column. Not needed by O-1. |
| `executed_at` | ✅ LIKELY | Standard Supabase column. Not needed by O-1's current query. |

### Finding A-3: Column Mapping Bug in `introspect_list_migrations`

**Severity: HIGH — would produce incorrect output if deployed as-is.**

Current O-1 code:
```sql
RETURNS TABLE(name text, executed_at timestamptz)
AS $$
  SELECT
    version::text,    -- → goes into "name" output column (WRONG: version is "20260621000000", not migration name)
    name::text        -- → goes into "executed_at" output column (WRONG: name is description text, not timestamp)
  FROM supabase_migrations.schema_migrations
  ORDER BY version;
$$;
```

This would return:
- `name` column = `"20260621000000"` (the version prefix, NOT the migration description)
- `executed_at` column = `"create_introspection_rpcs"` (a text string, NOT a timestamp)

**This is wrong.** The correct mapping should be:

```sql
RETURNS TABLE(version text, description text)
AS $$
  SELECT
    version::text,
    COALESCE(name, '')::text
  FROM supabase_migrations.schema_migrations
  ORDER BY version;
$$;
```

Or if keeping the current column names:
```sql
RETURNS TABLE(name text, executed_at timestamptz)
AS $$
  SELECT
    COALESCE(name, version)::text,
    executed_at
  FROM supabase_migrations.schema_migrations
  ORDER BY version;
$$;
```

---

## 4. Required O-1 Migration Correction

### 4.1 Correction for `introspect_list_migrations`

Replace lines 144-153 of `20260621000000_create_introspection_rpcs.sql`:

**Current (INCORRECT):**
```sql
CREATE OR REPLACE FUNCTION public.introspect_list_migrations()
RETURNS TABLE(name text, executed_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    version::text,
    name::text
  FROM supabase_migrations.schema_migrations
  ORDER BY version;
$$;
```

**Corrected:**
```sql
CREATE OR REPLACE FUNCTION public.introspect_list_migrations()
RETURNS TABLE(version text, description text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    m.version::text,
    COALESCE(m.name, m.version)::text
  FROM supabase_migrations.schema_migrations m
  ORDER BY m.version;
$$;
```

**Changes:**
1. `RETURNS TABLE(name text, executed_at timestamptz)` → `RETURNS TABLE(version text, description text)` — correct column semantics
2. `SELECT version::text, name::text` → `SELECT m.version::text, COALESCE(m.name, m.version)::text` — correct column mapping with fallback
3. Added table alias `m` for clarity

### 4.2 Additional Robustness: Schema Discovery Fallback

To handle the case where the table might be in `public` instead of `supabase_migrations`, the function could be made more robust:

```sql
CREATE OR REPLACE FUNCTION public.introspect_list_migrations()
RETURNS TABLE(version text, description text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  -- Try supabase_migrations.schema_migrations first, fall back to public.supabase_migrations
  SELECT
    COALESCE(sm.version, pm.version)::text,
    COALESCE(sm.name, pm.name, COALESCE(sm.version, pm.version))::text
  FROM (SELECT 1 AS dummy) d
  LEFT JOIN supabase_migrations.schema_migrations sm ON true
  LEFT JOIN public.supabase_migrations pm ON true
  WHERE sm.version IS NOT NULL OR pm.version IS NOT NULL
  ORDER BY COALESCE(sm.version, pm.version);
$$;
```

However, this is more complex than needed. **Recommendation: keep the simple version and verify table location before deployment.** If `supabase_migrations.schema_migrations` doesn't exist, the function will fail with a clear error — then correct the FROM clause.

---

## 5. Recommended O-1 Pre-Deployment Checklist

Before deploying O-1, owner must verify via Supabase Dashboard SQL Editor:

```sql
-- Check 1: Does the migration table exist?
SELECT * FROM supabase_migrations.schema_migrations LIMIT 1;

-- If Check 1 fails, try:
SELECT * FROM public.supabase_migrations LIMIT 1;

-- Check 2: What columns does it have?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schema_migrations' 
   OR table_name = 'supabase_migrations'
ORDER BY ordinal_position;

-- Check 3: Sample a few rows to confirm version/name format
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 3;
```

Based on the results:
1. Update the FROM clause in `introspect_list_migrations()` to match the actual table location
2. Apply the column mapping correction documented in §4.1 above
3. Verify the corrected function compiles against the live schema

---

## 6. Impact on O-1 Deployment

| Finding | Severity | Blocks Deployment? | Resolution |
|---------|:---:|:---:|------------|
| A-1: Table location unknown | MEDIUM | **YES** | Must verify table exists before deploy, or use schema-discovery approach |
| A-2: `name` column uncertain | LOW | **YES** | Must verify column exists; use COALESCE fallback if uncertain |
| A-3: Column mapping bug | **HIGH** | **YES** | **Must fix before deployment** — current code maps version→name and name→executed_at, which is wrong |

### Updated A-3: This Finding Escalated to HIGH

The column mapping bug (A-3) was not identified in the original O-1R review (O-2). It was discovered during O-2A static analysis. **The function would compile successfully but return semantically wrong data** — migration version numbers in the `name` column, and description text in the `executed_at` column, making the output confusing rather than useful.

---

## 7. Recommendation

### O-1 Migration MUST Be Corrected Before Deployment

The `introspect_list_migrations()` function has a confirmed column mapping bug (A-3). The O-1 migration file at `supabase/migrations/20260621000000_create_introspection_rpcs.sql` must be updated with the correction documented in §4.1 above.

**Do NOT deploy O-1 with the current `introspect_list_migrations()` — it would return semantically incorrect data.**

### Corrected Function

```sql
CREATE OR REPLACE FUNCTION public.introspect_list_migrations()
RETURNS TABLE(version text, description text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    m.version::text,
    COALESCE(m.name, m.version)::text
  FROM supabase_migrations.schema_migrations m
  ORDER BY m.version;
$$;

COMMENT ON FUNCTION public.introspect_list_migrations()
IS 'Read-only introspection: migration history. Returns version (timestamp prefix) and description. Metadata only — no user data. Ops MCP tool: supabase_list_migrations.';
```

---

## No Implementation Performed

Verification attempted. Live DB unreachable. Static analysis found column mapping bug. O-1 migration NOT corrected (no file edits). O-1 NOT deployed. Supabase unchanged. NOVA frozen.
