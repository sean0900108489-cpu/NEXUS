# N-2: NOVA Schema, RLS, and RPC Hardening Plan

**Date:** 2026-06-21
**Status:** Design-only hardening plan. No SQL. No migration. No RLS changes. No code changes.
**Authorities:** N-0 (NOVA Reality Check), N-1 (Reconstruction Plan), NOVA Prototype Full Scan, NOVA Schema Inventory (V5), NOVA V6 RLS/Grants Hardening Plan, Technical Entry Report §10 (P0 Risk Map)
**Owner Lock:** FINAL-LOCK-3 (NOVA workspace-scoped from Phase 1)
**Supabase Project:** `xjuglddxwnikvcwxfbzg` (LOCKED)

---

## 1. Current-State Facts (Verified from Multiple Sources)

### 1.1 Table Inventory (3 Tables, All in NEXUS Supabase)

| Table | RLS | Observed Rows | Source |
|-------|:---:|:---:|--------|
| `public.nova_documents` | ✅ Enabled | 1 | NOVA Schema Inventory (V5) |
| `public.nova_chunks` | ✅ Enabled | 1 | NOVA Schema Inventory (V5) |
| `public.nova_ingest_runs` | ✅ Enabled | 1 | NOVA Schema Inventory (V5) |

### 1.2 Column Inventory (from NOVA Schema Inventory + NOVA server/index.ts writes)

**`public.nova_documents`:**
| Column | Type | In Schema Inventory | Written by server/index.ts |
|--------|------|:---:|:---:|
| `id` | uuid PK | ✅ | Auto-generated |
| `title` | text | ✅ | Line 98: value from `file.originalname` |
| `source_type` | text | ✅ | Line 93: `'image'` / `'pdf'` / `'text'` |
| `mime_type` | text | ✅ | Line 100: value from `file.mimetype` |
| `file_name` | text | ✅ | Line 101: value from `file.originalname` |
| `storage_path` | text | ✅ | Not written by current code |
| `metadata` | jsonb | ✅ | Line 102: `{ size: file.size }` |
| `created_at` | timestamptz | ✅ | Auto |
| `updated_at` | timestamptz | ✅ | Auto (via trigger) |
| **`workspace_id`** | — | ❌ **MISSING** | Not written |
| **`user_id`** | — | ❌ **MISSING** | Not written |

**`public.nova_chunks`:**
| Column | Type | In Schema Inventory | Written by server/index.ts |
|--------|------|:---:|:---:|
| `id` | uuid PK | ✅ | Auto |
| `document_id` | uuid FK → nova_documents | ✅ | Line 116 |
| `chunk_index` | integer | ✅ | Line 117 |
| `kind` | text | ✅ | Line 118: `'image'` / `'pdf_page'` / `'text'` |
| `content` | text | ✅ | Line 119 |
| `embedding` | vector(1536) | ✅ | Line 120: `toVectorLiteral(embedding)` |
| `asset_url` | text | ✅ | Not written by current code |
| `metadata` | jsonb | ✅ | Lines 121-131: embedding metadata |
| `created_at` | timestamptz | ✅ | Auto |
| **`workspace_id`** | — | ❌ **MISSING** | Not written |

**`public.nova_ingest_runs`:**
| Column | Type | In Schema Inventory | Written by server/index.ts |
|--------|------|:---:|:---:|
| `id` | uuid PK | ✅ | Auto |
| `source_label` | text | ✅ | Line 85: `file.originalname` |
| `status` | text | ✅ | Line 85: `'running'` → `'completed'` / `'failed'` |
| `item_count` | integer | ✅ | Line 142 (on complete) |
| `message` | text | ✅ | Line 151 (on failure) |
| `metadata` | jsonb | ✅ | Line 85: `{ mime: file.mimetype }` |
| `created_at` | timestamptz | ✅ | Auto |
| `completed_at` | timestamptz | ✅ | Line 142 (on complete) / Line 152 (on failure) |
| **`workspace_id`** | — | ❌ **MISSING** | Not written |

### 1.3 RPC Inventory

**`public.match_nova_chunks`:**
| Property | Value | Source |
|----------|-------|--------|
| Arguments | `query_embedding vector, match_count integer DEFAULT 8, match_threshold double precision DEFAULT 0.12, filter_kind text DEFAULT NULL` | Schema Inventory |
| Returns | `id, document_id, title, source_type, kind, content, asset_url, metadata, similarity, created_at` | Schema Inventory |
| `security_definer` | `false` | Schema Inventory |
| Volatility | `stable` | Schema Inventory |
| Called by | `server/index.ts` lines 174-180 (chat), 286-292 (visual-search) | Code inspection |
| **`workspace_id` parameter** | ❌ **NOT PRESENT** | Schema Inventory |

**`public.set_nova_updated_at`:**
- Trigger function. `security_definer: false`.

### 1.4 Index Inventory

| Table | Index | Type |
|-------|-------|------|
| `nova_chunks` | `nova_chunks_embedding_hnsw_idx` | HNSW vector cosine search |
| `nova_chunks` | `nova_chunks_document_idx` | B-tree on document_id |
| `nova_chunks` | `nova_chunks_document_id_chunk_index_kind_key` | UNIQUE composite |
| `nova_chunks` | `nova_chunks_kind_idx` | B-tree on kind |
| `nova_chunks` | `nova_chunks_metadata_gin_idx` | GIN on metadata |
| `nova_documents` | `nova_documents_created_at_idx` | B-tree on created_at |

### 1.5 Current RLS State (P0 Security Gap — Confirmed)

From NOVA Schema Inventory + NEXUS Scan Task Brief + V6 Hardening Plan:

| Table | Current RLS Policies | Roles Affected | Severity |
|-------|---------------------|---------------|----------|
| `nova_documents` | INSERT/UPDATE/DELETE use `true` (allow all) | `anon`, `authenticated` | **CRITICAL P0** |
| `nova_chunks` | INSERT/UPDATE/DELETE use `true` (allow all) | `anon`, `authenticated` | **CRITICAL P0** |
| `nova_ingest_runs` | INSERT/UPDATE/DELETE use `true` (allow all) | `anon`, `authenticated` | **CRITICAL P0** |
| `match_nova_chunks` | Publicly executable via Data API | Any role with execute grant | **HIGH** |

**This means:** Anyone who can reach the Supabase Data API (with the publishable anon key) can insert, update, or delete any row in all three NOVA tables. They can also execute unrestricted vector search against all embedded chunks.

### 1.6 Grants State (from Security Advisor)

| Role | `nova_documents` | `nova_chunks` | `nova_ingest_runs` |
|------|:---:|:---:|:---:|
| `anon` | INSERT, UPDATE, DELETE, TRUNCATE | INSERT, UPDATE, DELETE, TRUNCATE | INSERT, UPDATE, DELETE, TRUNCATE |
| `authenticated` | INSERT, UPDATE, DELETE, TRUNCATE | INSERT, UPDATE, DELETE, TRUNCATE | INSERT, UPDATE, DELETE, TRUNCATE |
| `service_role` | Full access (bypasses RLS) | Full access | Full access |

### 1.7 Migration History

Two NOVA-specific migrations in `xjuglddxwnikvcwxfbzg`:
- `20260605003734 create_nova_rag_schema_1536` — initial table creation
- `20260605005812 harden_nova_function_search_path` — search path hardening

Total project migrations: 34 (per Scan Task Brief).

---

## 2. Blocked Assumptions

| # | Assumption | Status | Verification |
|---|-----------|--------|-------------|
| B1 | `nova_documents` has a stable `id` column (UUID) | ⚠️ UNCONFIRMED | Schema Inventory says PK is `id`. Must verify via live DB. |
| B2 | `nova_chunks.document_id` has a FK constraint to `nova_documents.id` | ⚠️ UNCONFIRMED | Schema Inventory reports FK. Must verify. |
| B3 | NOVA tables contain only disposable prototype data (row count = 1) | ⚠️ STALE | Schema Inventory from 2026-06-05. Row count may have changed. |
| B4 | NOVA Express server is the ONLY writer to these tables | ⚠️ UNCONFIRMED | No other known writers, but broad RLS means anything could write. |
| B5 | `workspaces` table exists and has `id` column (for FK) | ✅ CONFIRMED | database.types.ts includes Workspaces interface with `id: string` |
| B6 | `workspace_memberships` table exists and has `workspace_id` + `user_id` | ✅ CONFIRMED | database.types.ts includes Workspace_Memberships |
| B7 | Adding `workspace_id NOT NULL` will not break existing prototype data | ⚠️ UNCONFIRMED | If 1 disposable row exists, safe to drop. If real data exists, migration needed. |
| B8 | `match_nova_chunks` can be modified to accept `workspace_id` parameter | ⚠️ UNCONFIRMED | RPC is editable. Must verify function body before modification. |
| B9 | HNSW index will still function after `workspace_id` filter is added | ⚠️ UNCONFIRMED | HNSW index searches all vectors. Post-filter by workspace_id is acceptable for Phase 1. |
| B10 | Current `nova_chunks_embedding_hnsw_idx` is operational | ⚠️ UNCONFIRMED | Listed as "unused" by performance advisor, but row count is 1. |

---

## 3. Proposed Hardening Design

### 3.1 Design Principle

**Minimum viable hardening:** Add workspace scoping without breaking existing ingestion/storage/retrieval patterns. Do NOT rebuild the ingestion pipeline. Do NOT add auth middleware to NOVA's Express server (that's N-3/N-4/N-5). This slice ONLY hardens the database layer.

### 3.2 Schema Changes (Design, Not DDL)

#### 3.2.1 Add `workspace_id` to All Three Tables

```
ALTER TABLE public.nova_documents
  ADD COLUMN workspace_id uuid NOT NULL
  REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.nova_chunks
  ADD COLUMN workspace_id uuid NOT NULL
  REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.nova_ingest_runs
  ADD COLUMN workspace_id uuid NOT NULL
  REFERENCES public.workspaces(id) ON DELETE CASCADE;
```

**Constraint decisions:**
- `NOT NULL` per FINAL-LOCK-3: every document/chunk/ingest-run belongs to exactly one workspace
- `ON DELETE CASCADE`: deleting a workspace deletes ALL its NOVA data. Owner must confirm this is desired behavior.
- No default value: existing prototype rows (if any) must be handled by migration script or deleted.

**Index needs:**
```
CREATE INDEX idx_nova_documents_workspace ON nova_documents(workspace_id);
CREATE INDEX idx_nova_chunks_workspace ON nova_chunks(workspace_id);
CREATE INDEX idx_nova_ingest_runs_workspace ON nova_ingest_runs(workspace_id);
```

These indexes support RLS policy enforcement (every query filtered by workspace_id) and JOIN performance with `workspaces` + `workspace_memberships`.

#### 3.2.2 Add `user_id` as Audit Column (Optional)

Per N-0 §3.3 (tenancy model), user-scoping was ruled out in favor of workspace-scoping. However, `user_id` may be added as an AUDIT column (who uploaded this document?), not as a security boundary:

```
ALTER TABLE public.nova_documents
  ADD COLUMN created_by uuid REFERENCES auth.users(id);

ALTER TABLE public.nova_ingest_runs
  ADD COLUMN created_by uuid REFERENCES auth.users(id);
```

**This is optional for Phase 1.** RLS policies use `workspace_id` only. `created_by` is metadata for future audit/attribution.

### 3.3 RLS Policy Redesign

#### 3.3.1 Policy Strategy

| Operation | Policy |
|-----------|--------|
| **SELECT** | User must be a member of the workspace: `workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = auth.uid())` |
| **INSERT** | User must be a member of the workspace with editor+ role: `workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor'))` |
| **UPDATE** | Same as INSERT (editor+) |
| **DELETE** | Same as INSERT (editor+) |

#### 3.3.2 Per-Table Policies

**`public.nova_documents`:**

```sql
-- DROP all existing broad policies first

-- SELECT: workspace member can read documents in their workspace
CREATE POLICY "workspace_member_select_documents" ON public.nova_documents
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: workspace editor+ can create documents
CREATE POLICY "workspace_editor_insert_documents" ON public.nova_documents
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );

-- UPDATE: workspace editor+ can update documents
CREATE POLICY "workspace_editor_update_documents" ON public.nova_documents
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );

-- DELETE: workspace editor+ can delete documents
CREATE POLICY "workspace_editor_delete_documents" ON public.nova_documents
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );
```

**`public.nova_chunks`:**

```sql
-- SELECT: workspace member can read chunks in their workspace
-- Chunks inherit access from parent document via workspace_id
CREATE POLICY "workspace_member_select_chunks" ON public.nova_chunks
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: server-side only (no direct client insert of chunks)
-- Service role bypasses RLS. No authenticated-user insert policy.
-- Chunks are created by the ingestion service, not directly by users.

-- UPDATE/DELETE: same — server-side only via service role.
-- No direct authenticated-user policies for chunk mutation.
```

**`public.nova_ingest_runs`:**

```sql
-- SELECT: workspace member can see ingest run history
CREATE POLICY "workspace_member_select_ingest_runs" ON public.nova_ingest_runs
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: workspace editor+ (ingestion is triggered by user action, but executed server-side)
CREATE POLICY "workspace_editor_insert_ingest_runs" ON public.nova_ingest_runs
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );
```

#### 3.3.3 Why Chunks Have Limited Policies

`nova_chunks` contains raw chunk content and embedding vectors. Direct client access to chunks is unnecessary — retrieval goes through `match_nova_chunks` RPC (server-side) or future API routes (N-4/N-5). Chunks are SELECT-able by workspace members (for library/document views) but INSERT/UPDATE/DELETE are server-side only via service role.

### 3.4 RPC Hardening: `match_nova_chunks`

#### 3.4.1 Add `workspace_id` Parameter

Current signature:
```sql
match_nova_chunks(
  query_embedding vector,
  match_count integer DEFAULT 8,
  match_threshold double precision DEFAULT 0.12,
  filter_kind text DEFAULT NULL
)
```

Target signature:
```sql
match_nova_chunks(
  query_embedding vector,
  match_count integer DEFAULT 8,
  match_threshold double precision DEFAULT 0.12,
  filter_kind text DEFAULT NULL,
  p_workspace_id uuid DEFAULT NULL   -- NEW: workspace filter
)
```

#### 3.4.2 Add Workspace Filter to Function Body

```sql
-- Inside match_nova_chunks function body, add WHERE clause:
SELECT ...
FROM nova_chunks
WHERE ...
  AND (p_workspace_id IS NULL OR nova_chunks.workspace_id = p_workspace_id)
```

**Backward compatibility:** `p_workspace_id DEFAULT NULL` means existing callers that don't pass the parameter still work (return all chunks). New callers (NEXUS API routes) pass `p_workspace_id` to scope retrieval.

**Security:** The function should also check `auth.uid()` membership if called directly. However, since the target architecture (N-4) routes all retrieval through server-side API routes (which validate workspace membership before calling the RPC), the RPC itself can remain `security_invoker` with the workspace filter applied at the call site.

#### 3.4.3 Execute Grant Restriction

```
Current: match_nova_chunks executable by any role with Data API access
Target:  REVOKE EXECUTE ON FUNCTION match_nova_chunks FROM PUBLIC, anon, authenticated;
         GRANT EXECUTE ON FUNCTION match_nova_chunks TO service_role;
         -- If authenticated access is needed: explicit GRANT to authenticated
         -- with workspace_id parameter required (not optional)
```

For Phase 1: restrict to `service_role` only. Server-side API routes use service role. Retrieval never goes directly from browser to RPC.

### 3.5 Grants Revocation

```
-- REVOKE broad grants on NOVA tables
REVOKE ALL ON public.nova_documents FROM anon, authenticated;
REVOKE ALL ON public.nova_chunks FROM anon, authenticated;
REVOKE ALL ON public.nova_ingest_runs FROM anon, authenticated;

-- GRANT minimal access through RLS
GRANT SELECT ON public.nova_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nova_documents TO authenticated;
-- (RLS policies enforce workspace membership — grants are the gate, RLS is the filter)

GRANT SELECT ON public.nova_chunks TO authenticated;
-- (No INSERT/UPDATE/DELETE grants for authenticated on chunks — server-side only)

GRANT SELECT, INSERT ON public.nova_ingest_runs TO authenticated;
-- (RLS policies enforce workspace membership)

-- Service role retains full access (bypasses RLS)
```

**Grants vs RLS:** Grants control WHICH ROLES can reach a table at all. RLS controls WHICH ROWS those roles can see/modify. Both must be correct. The current state is broken on both: grants are too broad (anon can write) AND RLS policies are too broad (`true`).

### 3.6 SECURITY DEFINER Audit

From Technical Entry Report §10: `record_permission_audit_log` and `nexus_ensure_workspace_session` are SECURITY DEFINER and callable by `authenticated`. These are NEXUS functions, not NOVA functions — they are outside N-2 scope but must be noted for cross-contamination risk.

NOVA-specific: `set_nova_updated_at` is `security_definer: false` — no change needed.

---

## 4. Rollback Considerations

### 4.1 Migration Rollback

```
-- Rollback: drop workspace_id column (requires CASCADE to drop dependent policies/indexes)
ALTER TABLE public.nova_documents DROP COLUMN workspace_id CASCADE;
ALTER TABLE public.nova_chunks DROP COLUMN workspace_id CASCADE;
ALTER TABLE public.nova_ingest_runs DROP COLUMN workspace_id CASCADE;

-- Rollback: restore broad policies (restore prototype state)
-- [Original policies must be captured before migration]

-- Rollback: restore grants
GRANT ALL ON public.nova_documents TO anon, authenticated;
GRANT ALL ON public.nova_chunks TO anon, authenticated;
GRANT ALL ON public.nova_ingest_runs TO anon, authenticated;

-- Rollback: restore RPC execute grants
GRANT EXECUTE ON FUNCTION match_nova_chunks TO PUBLIC, anon, authenticated;
```

### 4.2 Rollback Risks

1. **Data loss on CASCADE:** Dropping `workspace_id` with CASCADE drops dependent policies and indexes. The column itself is also dropped — any data written to it during hardening is lost.
2. **Prototype data:** If NOVA Express server ingested data during the hardening window, that data would have `workspace_id` values. Rollback drops those values.
3. **Policy capture:** Original broad policies must be captured BEFORE migration to enable full rollback.
4. **Existing indexes:** Indexes created for `workspace_id` would be dropped on rollback.

### 4.3 No-Op Validation (Pre-Migration Check)

Before applying any migration:
1. Capture current RLS policies: `SELECT * FROM pg_policies WHERE tablename LIKE 'nova_%'`
2. Capture current grants: `SELECT * FROM information_schema.role_table_grants WHERE table_name LIKE 'nova_%'`
3. Capture current RPC grants: `SELECT * FROM information_schema.routine_privileges WHERE routine_name = 'match_nova_chunks'`
4. Record row counts: `SELECT count(*) FROM nova_documents`, `nova_chunks`, `nova_ingest_runs`
5. Record current indexes: `SELECT indexname FROM pg_indexes WHERE tablename LIKE 'nova_%'`
6. Snapshot all of above to a markdown file for rollback reference

---

## 5. Implementation Prerequisites

Before N-2 can move from design to implementation, ALL of the following must be confirmed:

### 5.1 Must-Confirm (Blockers)

| # | Prerequisite | Why Blocking |
|---|-------------|-------------|
| P1 | **Live Supabase access re-established** | Cannot verify current table state, row counts, policy text, or grant state without live DB access. MCP remains unreachable. |
| P2 | **Current row count in nova_documents, nova_chunks, nova_ingest_runs** | Determines whether prototype data is disposable or needs migration. If row count > 10, must design data migration script. |
| P3 | **Current RLS policy text** | Must capture exact policy definitions before replacement to enable rollback. |
| P4 | **Current grant state** | Must verify which roles have which privileges before revocation. |
| P5 | **match_nova_chunks function body** | Must read current function SQL before modification to preserve retrieval logic. |
| P6 | **workspaces table has active rows** | Adding `workspace_id NOT NULL` with FK to `workspaces(id)` requires at least one workspace to exist, or a default/placeholder workspace. |
| P7 | **Owner confirms ON DELETE CASCADE behavior** | Deleting a workspace deletes ALL its NOVA data. Must be explicit owner decision. |

### 5.2 Should-Confirm (Reduces Risk)

| # | Prerequisite | Why Important |
|---|-------------|--------------|
| P8 | **Current HNSW index status** | Verify `nova_chunks_embedding_hnsw_idx` is operational before adding workspace filter. |
| P9 | **Current SECURITY DEFINER function inventory** | Confirm no NOVA functions are SECURITY DEFINER in exposed schemas. |
| P10 | **migration numbering convention** | Next migration number (currently 34 total). Follow existing convention. |
| P11 | **Supabase CLI access** | `supabase migration new` command availability for generating migration files. |

### 5.3 Owner Decisions Required

| # | Decision | Options |
|---|----------|---------|
| D1 | ON DELETE CASCADE for workspace_id FK | CASCADE (auto-delete NOVA data) vs RESTRICT (block workspace deletion if NOVA data exists) |
| D2 | Disposition of existing prototype data | Delete all (fresh start) vs migrate (assign to placeholder workspace) |
| D3 | chunk INSERT/UPDATE/DELETE: server-only or editor+ | Server-only (current design) vs editor+ (allows direct client writes) |
| D4 | match_nova_chunks execute grant: service_role only or authenticated | service_role only (current design) vs authenticated (allows direct client RPC calls) |
| D5 | user_id audit column: include or defer | Include (add created_by now) vs defer (add later) |

---

## 6. What N-2 Does NOT Cover

| Excluded Item | Covered By |
|--------------|-----------|
| Ingestion pipeline modification (adding workspace_id to server/index.ts writes) | N-3 |
| Retrieval logic changes (calling match_nova_chunks with workspace_id) | N-4 |
| New API routes for NOVA services | N-5 |
| NOVA Express server auth middleware | N-3/N-4/N-5 (routes move to Next.js) |
| Workspace membership verification logic | Already exists in NEXUS `workspace_memberships` + `has_workspace_role` RPC |
| Data migration for existing rows | Separate migration script — not designed here |
| Performance optimization (index tuning, HNSW parameter tuning) | Phase 2 |
| Persistent evidence ledger | Future (NOT_NOW per V6 Hardening Plan) |

---

## 7. Verification Plan (Post-Implementation, Not This Slice)

When N-2 implementation is authorized and executed, verify:

| Check | Method |
|-------|--------|
| `workspace_id` column exists on all 3 tables | `SELECT column_name FROM information_schema.columns WHERE table_name LIKE 'nova_%' AND column_name = 'workspace_id'` |
| Broad RLS policies removed | `SELECT * FROM pg_policies WHERE tablename LIKE 'nova_%'` — no `true` policies remain |
| Workspace-scoped policies active | Same query — workspace membership policies present |
| `anon` cannot insert/update/delete | Attempt insert with anon key → rejected |
| `authenticated` non-member cannot SELECT | Attempt select as non-member user → empty result |
| `authenticated` member can SELECT | Attempt select as workspace member → returns rows |
| `match_nova_chunks` accepts workspace_id | Call RPC with and without parameter → both work |
| `match_nova_chunks` scoped to workspace | Call with workspace_id A → only chunks from workspace A returned |
| Service role bypasses RLS | Service role can still read/write all tables (server-side ingestion path preserved) |
| Existing indexes intact | HNSW index, document index, kind index still operational |
| Grants restricted | `anon` and `authenticated` no longer have ALL privileges |

---

## No Implementation Performed

Design-only hardening plan. No SQL executed. No migrations created. No RLS policies modified. No grants revoked. No code changes. Supabase project `xjuglddxwnikvcwxfbzg` unchanged. All Supabase facts from NOVA V5 Schema Inventory (2026-06-05) — may be stale. Live DB re-validation required before implementation.
