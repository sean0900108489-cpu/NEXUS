# N-2A: NOVA Live Supabase Pre-Migration Verification + Owner Decision Lock

**Date:** 2026-06-21
**Status:** Pre-migration verification. No SQL. No migration. No RLS changes. No grant changes.
**Authority:** N-2 (Hardening Plan), N-0 (Reality Check), Supabase Project Identity Lock
**Supabase Live Access:** UNREACHABLE (MCP ENOTFOUND `db.vqyuonrhpecfjklbeqsn.supabase.co` — not the production project)
**Evidence Sources for This Report:** NOVA V5 Schema Inventory (2026-06-05), NEXUS Scan Task Brief (2026-06-19), NEXUS Technical Entry Report (2026-06-20), NEXUS `database.types.ts` (SHA `338d4dc`), NOVA V6 RLS Hardening Plan, NOVA `server/index.ts`, NEXUS New API VPS deployment docs

---

## 1. Verified Live DB Facts (from Best Available Static Evidence)

### 1.1 Project Identity — CONFIRMED

| Property | Value | Source | Confidence |
|----------|-------|--------|-----------|
| Production project ref | `xjuglddxwnikvcwxfbzg` | Notion VPS docs, Vercel env | **HIGH** |
| REST URL | `https://xjuglddxwnikvcwxfbzg.supabase.co` | Vercel env `NEXT_PUBLIC_SUPABASE_URL` | **HIGH** |
| Region | `ap-southeast-2` | Scan Task Brief | **HIGH** |
| PG Version | 17.6.1.121 | Scan Task Brief | **HIGH** |
| Status | ACTIVE_HEALTHY | Scan Task Brief | **MEDIUM** (stale as of 2026-06-19) |
| MCP project ref | `vqyuonrhpecfjklbeqsn` | MCP error message | **CONFIRMED DIFFERENT PROJECT** |

### 1.2 NOVA Table Existence — CONFIRMED

| Table | In `database.types.ts`? | In Schema Inventory? | In Scan Task Brief? | Written by server/index.ts? |
|-------|:---:|:---:|:---:|:---:|
| `nova_documents` | ❌ No generated types | ✅ Yes | ✅ Yes | ✅ Lines 97-104 |
| `nova_chunks` | ❌ No generated types | ✅ Yes | ✅ Yes | ✅ Lines 135-137 |
| `nova_ingest_runs` | ❌ No generated types | ✅ Yes | ✅ Yes | ✅ Lines 84-86, 141-143, 149-153 |

**Confidence:** HIGH. Three independent sources confirm table existence. Code actively writes to them.

### 1.3 NOVA Row Counts — STALE

| Table | Schema Inventory (2026-06-05) | Current (2026-06-21) | Confidence |
|-------|:---:|:---:|:---:|
| `nova_documents` | 1 | **UNKNOWN** | **STALE — 16 days old** |
| `nova_chunks` | 1 | **UNKNOWN** | **STALE — 16 days old** |
| `nova_ingest_runs` | 1 | **UNKNOWN** | **STALE — 16 days old** |

**Risk:** Row counts from 2026-06-05. NOVA Express server may have ingested additional data since. If row count > 10-20, must design data migration for `workspace_id` column. If ≤ 10, prototype data is disposable.

### 1.4 RLS Policy State — CONFIRMED P0 GAP

| Source | Finding | Date |
|--------|---------|------|
| NOVA Schema Inventory (V5) | Broad `true` policies on all 3 NOVA tables | 2026-06-05 |
| NEXUS Scan Task Brief §3.C | "Nova RAG 表的 anon/authenticated always true policies — 最高優先級安全掃描點" | 2026-06-19 |
| Technical Entry Report §10.1 | "NOVA broad policies — P0 baseline blocker" | 2026-06-20 |
| V6 RLS Hardening Plan | "permissive `true` write policies and broad grants" | 2026-06-06 |

**Confidence:** HIGH. Four independent sources across 15 days confirm the same finding. No evidence of any patch applied.

### 1.5 RPC State — CONFIRMED

| Property | Value | Source | Confidence |
|----------|-------|--------|-----------|
| `match_nova_chunks` exists | ✅ | Schema Inventory + server/index.ts | **HIGH** |
| Arguments | `query_embedding, match_count(8), match_threshold(0.12), filter_kind(NULL)` | Schema Inventory | **HIGH** |
| Returns | `id, document_id, title, source_type, kind, content, asset_url, metadata, similarity, created_at` | Schema Inventory | **HIGH** |
| `security_definer` | `false` | Schema Inventory | **HIGH** |
| `workspace_id` parameter | ❌ **NOT PRESENT** | Schema Inventory | **HIGH** |
| Execute grants | Publicly executable | V6 Hardening Plan | **MEDIUM** (from advisor report) |
| Function body SQL | **UNKNOWN** | Not captured in any source | **GAP** |

### 1.6 Workspaces Table — CONFIRMED EXISTS

| Property | Value | Source | Confidence |
|----------|-------|--------|-----------|
| `workspaces` table exists | ✅ | `database.types.ts` — `Workspaces` interface | **HIGH** |
| Columns | `id, name, created_at, owner_user_id, created_by, updated_at` | `database.types.ts` | **HIGH** |
| Active workspace count | **UNKNOWN** | No live query possible | **GAP** |
| `workspace_memberships` exists | ✅ | `database.types.ts` | **HIGH** |

**Critical gap:** If zero workspaces exist, adding `workspace_id NOT NULL` with FK to `workspaces(id)` will FAIL. A default/placeholder workspace must exist, or the constraint must be deferred (add column as nullable first, backfill, then add NOT NULL).

### 1.7 Migration State — CONFIRMED

| Property | Value | Source | Confidence |
|----------|-------|--------|-----------|
| Total migrations | 34 | Scan Task Brief (2026-06-19) | **MEDIUM** (16 days stale) |
| NOVA-specific migrations | 2 (`20260605003734`, `20260605005812`) | Schema Inventory | **HIGH** |
| Migration numbering format | `YYYYMMDDHHMMSS_description` | Schema Inventory | **HIGH** |
| Next migration number | 35 | Derived (34 total → next = 35) | **MEDIUM** (if no migrations added since 06-19) |

---

## 2. Facts That CANNOT Be Verified Without Live DB Access

| # | Fact | N-2 Dependency | Impact if Wrong |
|---|------|:---:|-----------------|
| F1 | Current row count in nova_documents, nova_chunks, nova_ingest_runs | P2 | Wrong migration strategy (disposable vs data migration) |
| F2 | Exact RLS policy text (SQL definitions) | P3 | Cannot capture for rollback; cannot verify replacement is correct |
| F3 | Exact grant state per role per table | P4 | Wrong revocation may break existing access |
| F4 | `match_nova_chunks` function body (full SQL) | P5 | Modification may break retrieval if function logic is not understood |
| F5 | Active workspace count and sample workspace IDs | P6 | FK constraint may fail if no workspaces exist |
| F6 | Current SECURITY DEFINER function inventory | P9 | Unknown if NOVA functions are SECURITY DEFINER |
| F7 | HNSW index operational status | P8 | Adding workspace filter may affect HNSW query plan |
| F8 | Whether any other code writes to NOVA tables | B4 | Unknown writers may break after RLS hardening |
| F9 | Current migration count (may have changed since 06-19) | P10 | Wrong migration numbering |
| F10 | `nova_chunks.embedding` vector dimensions match 1536 | B9 | Dimension mismatch breaks embedding queries |

**All 10 facts require live Supabase access to resolve. None can be derived from static sources.**

---

## 3. Migration Ordering Constraints

### 3.1 Pre-Migration Sequence (Must Execute in This Order)

```
STEP 0: Capture baseline (before ANY changes)
  ├─ 0.1: Record row counts for all 3 NOVA tables
  ├─ 0.2: Capture current RLS policy SQL (pg_policies)
  ├─ 0.3: Capture current grants (information_schema.role_table_grants)
  ├─ 0.4: Capture current RPC grants (information_schema.routine_privileges)
  ├─ 0.5: Capture match_nova_chunks function body (pg_proc)
  ├─ 0.6: Record active workspaces (SELECT id, name FROM workspaces)
  ├─ 0.7: Record current indexes (pg_indexes WHERE tablename LIKE 'nova_%')
  └─ 0.8: Save all captures to a markdown file in docs/supabase/

STEP 1: Create placeholder workspace (IF zero workspaces exist)
  └─ INSERT INTO workspaces (id, name) VALUES (gen_random_uuid(), 'Default Workspace')
     ONLY if SELECT count(*) FROM workspaces = 0

STEP 2: Add workspace_id column (NULLABLE first)
  └─ ALTER TABLE nova_documents ADD COLUMN workspace_id uuid
  └─ ALTER TABLE nova_chunks ADD COLUMN workspace_id uuid
  └─ ALTER TABLE nova_ingest_runs ADD COLUMN workspace_id uuid

STEP 3: Backfill workspace_id (IF existing data exists)
  └─ UPDATE nova_documents SET workspace_id = (SELECT id FROM workspaces LIMIT 1)
  └─ UPDATE nova_chunks SET workspace_id = (SELECT id FROM workspaces LIMIT 1)
  └─ UPDATE nova_ingest_runs SET workspace_id = (SELECT id FROM workspaces LIMIT 1)

STEP 4: Add NOT NULL constraint
  └─ ALTER TABLE nova_documents ALTER COLUMN workspace_id SET NOT NULL
  └─ ALTER TABLE nova_chunks ALTER COLUMN workspace_id SET NOT NULL
  └─ ALTER TABLE nova_ingest_runs ALTER COLUMN workspace_id SET NOT NULL

STEP 5: Add FK constraints
  └─ ALTER TABLE nova_documents ADD CONSTRAINT fk_nova_documents_workspace
       FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  └─ [Same for nova_chunks, nova_ingest_runs]

STEP 6: Create indexes
  └─ CREATE INDEX idx_nova_documents_workspace ON nova_documents(workspace_id)
  └─ [Same for nova_chunks, nova_ingest_runs]

STEP 7: Revoke broad grants (BEFORE policy changes — grants are the gate)
  └─ REVOKE ALL ON nova_documents FROM anon, authenticated
  └─ [Same for nova_chunks, nova_ingest_runs]

STEP 8: Drop broad RLS policies
  └─ DROP POLICY [policy_name] ON nova_documents
  └─ [For each broad policy on each table]

STEP 9: Create workspace-scoped RLS policies
  └─ CREATE POLICY "workspace_member_select_documents" ...
  └─ [All policies from N-2 §3.3]

STEP 10: Grant minimal access
  └─ GRANT SELECT ON nova_documents TO authenticated
  └─ [All grants from N-2 §3.5]

STEP 11: Modify match_nova_chunks RPC
  └─ Add p_workspace_id parameter
  └─ Add workspace filter to function body
  └─ Restrict execute grants

STEP 12: Verify
  └─ Run N-2 §7 verification checks
```

### 3.2 Why This Order Matters

1. **Capture before modify (Step 0):** Rollback requires knowing the original state. Without capture, rollback is impossible.
2. **Nullable before NOT NULL (Steps 2-4):** Adding NOT NULL to a table with existing rows fails. Must add nullable, backfill, then add NOT NULL.
3. **Grants before RLS (Steps 7-9):** Grants are the outer gate. Revoke broad grants first, then replace RLS. If RLS is replaced before grants are revoked, there's a window where new RLS is in place but broad grants still allow bypass.
4. **Verify last (Step 12):** Only after all changes are applied can verification be meaningful.

### 3.3 Migration File Count

This would require a MINIMUM of 3 migration files:
1. **Migration 35:** Steps 0-6 (schema changes: workspace_id, FK, indexes) — structural, reversible
2. **Migration 36:** Steps 7-10 (grants + RLS) — security, reversible with capture
3. **Migration 37:** Step 11 (RPC modification) — functional, reversible with capture

Or consolidated into 1 migration if all changes are in a single transaction. However, separate migrations are recommended for rollback granularity.

---

## 4. Owner Decision Matrix

### 4.1 Decisions Required Before N-2 Implementation

| ID | Decision | Options | Recommendation | Impact |
|----|----------|---------|---------------|--------|
| **D1** | `ON DELETE CASCADE` for workspace_id FK | A: CASCADE — delete workspace deletes all NOVA data | **Recommend A** — aligns with FINAL-LOCK-3 (workspace-scoped). Data belongs to workspace. | Schema design |
| | | B: RESTRICT — block workspace deletion if NOVA data exists | | |
| | | C: SET NULL — disallowed (NOT NULL column) | | |
| **D2** | Disposition of existing prototype data | A: Delete all — fresh start with empty NOVA tables | **Recommend A** — 1 row observed, no production value | Migration strategy |
| | | B: Migrate — assign to placeholder/default workspace | | |
| | | C: Preserve as-is, add workspace_id later | | |
| **D3** | Chunk INSERT/UPDATE/DELETE policy | A: Server-only (service role) — no authenticated policies | **Recommend A** — chunks are internal; retrieval via API routes | RLS policy design |
| | | B: Editor+ with RLS — authenticated can write through RLS | | |
| **D4** | `match_nova_chunks` execute grant | A: service_role only — server-side API routes only | **Recommend A** — Phase 1. Browser never calls RPC directly. | RPC security |
| | | B: authenticated — direct client RPC allowed | | |
| **D5** | `created_by` audit column | A: Add now — include in migration 35 | **Recommend B** (defer) — reduces migration scope. Add when N-3 designs ingestion with auth context. | Schema scope |
| | | B: Defer — add later with N-3 | | |
| **D6** | Placeholder workspace (if zero exist) | A: Create 'Default Workspace' automatically | **Recommend A** — migration must not fail on FK constraint | Migration safety |
| | | B: Fail migration if no workspaces exist | | |
| | | C: Defer workspace_id until workspaces exist | | |

### 4.2 Decisions Already Locked (Not Reopenable)

| Lock | Source |
|------|--------|
| FINAL-LOCK-3: NOVA is workspace-scoped from Phase 1 | Owner Final Lock 2026-06-20 |
| `workspace_id NOT NULL` on all NOVA tables | N-2 design, derived from FINAL-LOCK-3 |
| Supabase project: `xjuglddxwnikvcwxfbzg` | Supabase Project Identity Lock |

---

## 5. Fail-Closed Rollback Posture

### 5.1 Principle

**If any step in the migration sequence fails, the system must revert to a state that is AT LEAST as secure as the pre-migration state.** Never leave the database in a partially-hardened state with mixed old/new policies.

### 5.2 Rollback Triggers

| Failure Point | Rollback Action |
|--------------|----------------|
| Step 2 fails (ALTER TABLE ADD COLUMN) | No changes applied yet — stop, investigate |
| Step 3 fails (backfill) | Already committed column addition. Column exists with NULLs. Safe to proceed or rollback by dropping column. |
| Step 4 fails (SET NOT NULL) | Column has NULLs that weren't backfilled. Fix backfill, retry. |
| Step 5 fails (FK constraint) | FK references invalid workspace_id. Fix data, retry. |
| Step 7 fails (REVOKE grants) | Broad grants still active. **CRITICAL — must not proceed to Step 8.** Old broad RLS policies are the only thing preventing writes through broad grants. If grants can't be revoked, abort and restore. |
| Step 8 fails (DROP policies) | Grants revoked, policies not replaced. **Table is inaccessible.** Must restore policies immediately. |
| Step 9 fails (CREATE policies) | Grants revoked, old policies dropped, new policies not created. **Table is inaccessible.** Rollback: restore captured policies from Step 0.2. |
| Step 11 fails (RPC modification) | RLS/grant hardening complete. RPC unchanged. Safe — RPC hardening can be deferred. |

### 5.3 Fail-Closed Rule

```
The ONLY safe failure points are:
  - Before Step 7: stop, no security change applied
  - After Step 12: all changes verified

Between Steps 7 and 12, ANY failure leaves the database in a
partially-hardened state that may be LESS secure than pre-migration
(grants revoked, policies missing = tables inaccessible or unprotected).

MANDATORY: Steps 7-10 must execute in a SINGLE TRANSACTION.
If any step in 7-10 fails, ROLLBACK the entire transaction.
This restores the pre-migration grant + policy state atomically.
```

### 5.4 Full Rollback Script (Post-Migration)

If the entire migration must be reversed after completion:

```
-- Reverse Step 11: Restore original match_nova_chunks
-- [Restore from Step 0.5 capture]

-- Reverse Steps 9-10: Drop new policies, restore old grants + policies
-- [Restore from Step 0.2 and 0.3 captures]

-- Reverse Step 6: Drop new indexes
DROP INDEX idx_nova_documents_workspace;
DROP INDEX idx_nova_chunks_workspace;
DROP INDEX idx_nova_ingest_runs_workspace;

-- Reverse Step 5: Drop FK constraints
ALTER TABLE nova_documents DROP CONSTRAINT fk_nova_documents_workspace;
ALTER TABLE nova_chunks DROP CONSTRAINT fk_nova_chunks_workspace;
ALTER TABLE nova_ingest_runs DROP CONSTRAINT fk_nova_ingest_runs_workspace;

-- Reverse Steps 2-4: Drop workspace_id columns
ALTER TABLE nova_documents DROP COLUMN workspace_id;
ALTER TABLE nova_chunks DROP COLUMN workspace_id;
ALTER TABLE nova_ingest_runs DROP COLUMN workspace_id;
```

---

## 6. Criteria for Allowing N-2 Implementation

### 6.1 GATE 1: Live Supabase Access Re-Established

**CRITICAL — implementation cannot proceed without this.**

Must be able to:
- [ ] Query production Supabase (`xjuglddxwnikvcwxfbzg`) with read-only access
- [ ] Run Steps 0.1 through 0.8 (capture baseline)
- [ ] Verify current state matches assumptions in §1

**How to resolve:** The MCP server must be reconfigured to point to `xjuglddxwnikvcwxfbzg` instead of `vqyuonrhpecfjklbeqsn`. Or direct `psql` access via connection string. Or use the Ops MCP server's `supabase_gateway_audit` tool.

### 6.2 GATE 2: Owner Decisions D1-D6 Answered

All 6 decisions in §4.1 must be explicitly answered by owner. Agent must not assume defaults.

### 6.3 GATE 3: Baseline Capture Complete

Steps 0.1-0.8 executed and saved to a committed markdown file. Without baseline, rollback is impossible — implementation must not proceed.

### 6.4 GATE 4: Migration Files Reviewed

Migration files (35, 36, 37) drafted and reviewed. SQL syntax verified. Rollback scripts included. Policy text matches N-2 design.

### 6.5 GATE 5: Test Workspace Exists

A test workspace with known members must exist in the Supabase project before RLS verification (Step 12) can be meaningful. Without a test workspace, RLS policies will block ALL access and verification is impossible.

### 6.6 GATE 6: NOVA Express Server Stopped or Updated

If the NOVA Express server is still running and writing to NOVA tables during migration, it will:
- Write rows without `workspace_id` (before Step 4) → NULL violation
- Write rows with `workspace_id` but without workspace membership context → all rows assigned to same workspace
- Fail entirely after Step 4 if it doesn't include `workspace_id` in INSERT

The Express server must either be stopped during migration, or updated to include `workspace_id` in writes (N-3 scope — not this slice).

---

## 7. What N-2A Resolves vs What Remains Open

### Resolved by This Report

| Item | Status |
|------|--------|
| Production project identity confirmed | ✅ `xjuglddxwnikvcwxfbzg` from 3 sources |
| Table existence confirmed | ✅ 3 sources cross-referenced |
| P0 gap confirmed | ✅ 4 sources across 15 days |
| RPC signature confirmed | ✅ From Schema Inventory |
| Workspaces table existence confirmed | ✅ From database.types.ts |
| Migration ordering constraints defined | ✅ 12-step sequence |
| Owner decision matrix defined | ✅ 6 decisions |
| Fail-closed rollback posture defined | ✅ Transaction boundaries + full rollback script |
| Implementation gates defined | ✅ 6 gates |

### Still Open (Requires Live DB)

| Item | Blocked By |
|------|-----------|
| Row counts | MCP unreachable |
| Policy SQL text | MCP unreachable |
| Grant state | MCP unreachable |
| RPC function body | MCP unreachable |
| Active workspace count | MCP unreachable |
| HNSW index status | MCP unreachable |
| Migration count (may be stale) | MCP unreachable |

---

## 8. Posture Statement

```
N-2 IMPLEMENTATION POSTURE: FAIL-CLOSED, GATED

N-2 implementation remains DESIGN-ONLY until:
  1. Live Supabase access is re-established (GATE 1)
  2. All 6 owner decisions are answered (GATE 2)
  3. Baseline capture is complete (GATE 3)
  4. Migration files are reviewed (GATE 4)
  5. A test workspace exists (GATE 5)
  6. NOVA Express server is stopped or updated (GATE 6)

If any gate is not met, N-2 MUST NOT proceed to implementation.

The current static evidence is sufficient for design but
insufficient for migration execution. 10 facts are unverified.
The oldest evidence is 16 days stale (row counts from 2026-06-05).

Until live DB access is restored, N-2 remains a DESIGN ARTIFACT.
No SQL has been executed. No migrations created. No RLS changed.
No grants modified. Supabase project xjuglddxwnikvcwxfbzg is unchanged.
```

---

## No Implementation Performed

Pre-migration verification only. No SQL executed. No migrations created. No RLS policies modified. No grants changed. No RPC modified. No code written. All Supabase facts from static sources (may be stale). Live DB re-validation is a hard prerequisite for implementation.
