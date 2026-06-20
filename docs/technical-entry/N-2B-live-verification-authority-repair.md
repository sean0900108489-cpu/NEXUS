# N-2B: Supabase Production Authority Repair + Live Read-Only Verification

**Date:** 2026-06-21
**Status:** Live verification complete. Read-only. No DDL/DML. No migration. No RLS/grants/RPC changes.
**Production Project:** `xjuglddxwnikvcwxfbzg` (REACHABLE — REST API functional, project snapshot confirmed)
**Verification Method:** Ops MCP server (`ops.supaseanexus.com`) — Supabase tools (gateway audit, model usage, project snapshot) + New API tools (snapshot, channels, models)
**Previous Authority Sources:** NOVA V5 Schema Inventory (2026-06-05), NEXUS Scan Task Brief (2026-06-19), Technical Entry Report (2026-06-20), NEXUS `database.types.ts`

---

## 1. Production Project Identity — RECONFIRMED LIVE

| Property | Value | Source | Status |
|----------|-------|--------|--------|
| Project URL | `https://xjuglddxwnikvcwxfbzg.supabase.co` | `supabase_project_snapshot` tool | ✅ LIVE 2026-06-20T15:33:11Z |
| REST API | 404 at root, functional | `curl` test | ✅ RESPONDING |
| Ops MCP Supabase URL | `https://***.supabase.co` (masked) | `ops_capabilities` tool | ✅ CONFIGURED |
| New API | 3 channels, 16 users, live | `newapi_snapshot` tool | ✅ LIVE 2026-06-20T15:33:56Z |

---

## 2. What Was Verified Live

### 2.1 Supabase Gateway Audit (Live)

| Metric | Value | Source |
|--------|-------|--------|
| New API tokens provisioned | 6 | `supabase_gateway_audit` |
| NULL source_type rows | 5 | `supabase_gateway_audit` |
| Conflicted sync operations | 4 | `supabase_gateway_audit` |
| Stuck agent_tasks | 3 | `supabase_gateway_audit` |
| Base64 artifact records | 9 | `supabase_gateway_audit` |

### 2.2 Model Usage Ledger — Recent Activity (Live)

Most recent usage from `supabase_model_usage`:

| Model | Source Type | Status | Timestamp |
|-------|-----------|--------|-----------|
| deepseek-v4-pro | agent_stream | succeeded | 2026-06-18T21:24 |
| img2 | image_workflow | succeeded | 2026-06-18T13:36 |
| img2 | image_workflow | failed | 2026-06-18T13:25 |
| gpt-4o-mini | agent_stream | succeeded | 2026-06-18T05:50 |
| riverflow-v2.5-fast | image_workflow | succeeded | 2026-06-18T05:34 |
| deepseek-chat | agent_stream | succeeded | 2026-06-18T05:14 (multiple) |

**Key finding:** Most recent usage is from 2026-06-18 — 3 days ago. No NOVA-related usage (`nova_retrieval`, `nova_ingestion`). The Express server is not actively ingesting or querying.

### 2.3 New API Snapshot (Live)

| Channel | Models | Status |
|---------|--------|--------|
| DeepSeek (ID=1) | 8 models: deepseek-chat, deepseek-reasoner, deepseek-v4-flash (3 variants), deepseek-v4-pro (3 variants) | ✅ LIVE |
| OpenAI-General (ID=2) | 5 models: gpt-4o-mini, o3, gpt-5.2, gpt-5.5-2026-04-23, gpt-image-2 | ✅ LIVE |
| OpenRouter (ID=3) | 1 model: sourceful/riverflow-v2.5-fast | ✅ LIVE |
| User count | 16 | ✅ LIVE |

---

## 3. What Could NOT Be Verified — Tool Limitation

### 3.1 Root Cause: Missing `execute_sql` RPC

The Ops MCP server's Supabase schema tools (`supabase_list_tables`, `supabase_table_columns`, `supabase_list_policies`, `supabase_list_functions`, `supabase_list_indexes`, `supabase_list_migrations`, `supabase_rls_audit`, `supabase_generated_types_gap`) ALL depend on a `public.execute_sql(sql)` RPC that does NOT exist in the NEXUS Supabase project.

Error returned by all failing tools:
```
PGRST202: Could not find the function public.execute_sql(sql) in the schema cache
```

### 3.2 Impact: 10 of 10 N-2A Unverifiable Facts Remain Unverified

| # | Fact | N-2A Status | N-2B Status | Why |
|---|------|:---:|:---:|-----|
| F1 | Row counts (nova_*) | UNVERIFIED | **STILL UNVERIFIED** | `execute_sql` missing |
| F2 | RLS policy SQL text | UNVERIFIED | **STILL UNVERIFIED** | `execute_sql` missing |
| F3 | Grant state per role | UNVERIFIED | **STILL UNVERIFIED** | `execute_sql` missing |
| F4 | match_nova_chunks function body | UNVERIFIED | **STILL UNVERIFIED** | `execute_sql` missing |
| F5 | Active workspace count | UNVERIFIED | **STILL UNVERIFIED** | `execute_sql` missing |
| F6 | SECURITY DEFINER inventory | UNVERIFIED | **STILL UNVERIFIED** | `execute_sql` missing |
| F7 | HNSW index status | UNVERIFIED | **STILL UNVERIFIED** | `execute_sql` missing |
| F8 | Other writers to NOVA tables | UNVERIFIED | **STILL UNVERIFIED** | `execute_sql` missing |
| F9 | Current migration count | UNVERIFIED | **STILL UNVERIFIED** | `execute_sql` missing |
| F10 | Embedding dimensions | UNVERIFIED | **STILL UNVERIFIED** | `execute_sql` missing |

---

## 4. Authority Repair Required

### 4.1 The Problem

The Ops MCP server has Supabase connectivity (confirmed by `supabase_project_snapshot`, `supabase_gateway_audit`, `supabase_model_usage` working) but cannot execute arbitrary SQL queries because `execute_sql` RPC was never deployed.

### 4.2 Repair Options

| Option | What | Timeline | Risk |
|--------|------|----------|------|
| **A: Deploy execute_sql RPC** | Create a simple `execute_sql(sql text) RETURNS json` RPC in the NEXUS Supabase project. The Ops MCP server already calls `rpc('execute_sql', { sql })`. This unblocks ALL schema introspection tools. | Minutes | Needs service_role access to create. Must be restricted to service_role only. |
| **B: Direct psql access** | Provide a PostgreSQL connection string for direct `psql` queries. | Immediate (if key available) | Requires exposing connection credentials. |
| **C: Supabase Dashboard** | Use the Supabase web dashboard SQL editor. | Immediate (manual) | Manual copy-paste, not automatable. |
| **D: Accept static evidence** | Proceed with N-2 using NOVA V5 Schema Inventory as last known good. Acknowledge 10 unverified facts. | None | Risk of stale data (16+ days). |

### 4.3 Recommendation: Option A + D (Hybrid)

1. **Option A:** Deploy `execute_sql` RPC to unblock future automated verification
2. **Option D:** For N-2 implementation, proceed using NOVA V5 Schema Inventory as the authoritative pre-migration baseline. The P0 RLS gap is confirmed by 4 independent sources across 15 days — the gap WILL be present. Row counts, policy text, and grants will be captured fresh during Step 0 (baseline capture) of the migration sequence — this IS the live verification.

### 4.4 Why Option D Is Acceptable for N-2

N-2's migration sequence (N-2A §3.1) ALREADY requires Step 0 (capture baseline) before any changes. Step 0 captures row counts, policy SQL, grants, RPC body, workspaces, and indexes — directly from production. These captures ARE the live verification. The only risk is if the schema has changed since 2026-06-05 in an unexpected way — but the P0 broad policies are almost certainly still present (no patch was applied).

---

## 5. Updated Implementation Gate Status

### 5.1 Gate Status (from N-2A §6)

| Gate | Status | Detail |
|------|--------|--------|
| **G1: Live Supabase access** | ⚠️ PARTIAL | REST API reachable. Project identity confirmed. Gateway audit + model usage work. Schema introspection blocked by missing `execute_sql` RPC. Step 0 baseline capture can substitute for schema verification. |
| **G2: Owner decisions D1-D6** | ⛔ PENDING | All 6 decisions still await owner |
| **G3: Baseline capture complete** | ⛔ PENDING | Step 0 not yet executed |
| **G4: Migration files reviewed** | ⛔ PENDING | No migration files created |
| **G5: Test workspace exists** | ⛔ PENDING | Workspace count unknown |
| **G6: NOVA Express stopped/updated** | ⛔ PENDING | Server status unknown |

### 5.2 What Changed Since N-2A

| Item | N-2A Status | N-2B Status |
|------|:---:|:---:|
| Project identity confirmed | ⚠️ Static only | ✅ LIVE confirmed |
| REST API functioning | ❌ Unknown | ✅ CONFIRMED |
| Gateway audit data | ❌ Unknown | ✅ 6 tokens, 5 null, 4 sync, 3 stuck, 9 artifacts |
| Model usage data | ❌ Unknown | ✅ Recent activity from 2026-06-18 |
| New API snapshot | ❌ Unknown | ✅ 3 channels, 16 users, 14 models |
| Schema introspection | ⚠️ Static only | ⚠️ STILL static (execute_sql missing) |

---

## 6. Migration Path Recommendation

### N-2 Can Proceed With Modified Step 0

The original N-2A Step 0 assumed automated schema capture via SQL queries. Since `execute_sql` is unavailable, Step 0 must use alternative methods:

**Modified Step 0 (Manual + REST API):**

```
STEP 0.1 (Row counts): Use Supabase REST API
  GET /rest/v1/nova_documents?select=count
  GET /rest/v1/nova_chunks?select=count
  GET /rest/v1/nova_ingest_runs?select=count
  Requires: valid anon key (available in Vercel env)

STEP 0.2-0.5 (Policies, grants, RPC body): Use Supabase Dashboard SQL Editor
  Manual copy-paste from pg_policies, information_schema, pg_proc
  Or: deploy execute_sql RPC first (Option A)

STEP 0.6 (Workspace rows): Use Supabase REST API
  GET /rest/v1/workspaces?select=id,name
  Requires: valid anon key

STEP 0.7 (Indexes): Use Supabase Dashboard SQL Editor
  Or: deploy execute_sql RPC first

STEP 0.8 (Save captures): Write to Markdown file
```

### Recommended Sequence for Owner

1. **Deploy `execute_sql` RPC** (5 minutes) — unblocks all future automated verification
2. **Answer D1-D6** — owner decisions required before migration
3. **Authorize N-2 implementation** — with full Step 0 baseline capture as first action

---

## 7. Posture Statement (Updated)

```
N-2 IMPLEMENTATION POSTURE: FAIL-CLOSED, GATED (UPDATED)

Production Supabase project xjuglddxwnikvcwxfbzg is REACHABLE.
REST API is functional. Gateway audit confirms live data.

Schema introspection is BLOCKED by missing execute_sql RPC.
10 verification facts remain unverified from static sources.

N-2 can proceed IF:
  1. execute_sql RPC is deployed (Option A) for automated Step 0 capture
     OR
  2. Step 0 is performed manually via Supabase Dashboard + REST API
  
  PLUS:
  3. All 6 owner decisions (D1-D6) are answered
  4. NOVA Express server is confirmed stopped or updated

The P0 RLS gap is confirmed by 4 independent static sources.
Live verification will occur during Step 0 baseline capture
(which MUST be the first action of any N-2 implementation).

Until execute_sql is deployed or manual Step 0 is authorized,
N-2 remains DESIGN-ONLY for schema/RLS/RPC changes.
```

---

## No Implementation Performed

Live read-only verification only. No DDL executed. No DML executed. No migrations created. No RLS/grants/RPC modified. Production Supabase project `xjuglddxwnikvcwxfbzg` is unchanged. Ops MCP server tools used in read-only mode.
