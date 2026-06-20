# Supabase Project Identity Lock Report 2026-06-20

**Date:** 2026-06-20
**Status:** Project identity LOCKED for all future slices
**Predecessors:** Supabase Authority Re-validation, S-5 Execution Report
**Method:** Read-only cross-reference: MCP config, GitHub code, Notion docs
**Result:** Two distinct Supabase projects identified. Production identity confirmed. Types coverage gap documented.

---

## 1. Executive Summary

**Two Supabase projects exist, using different project refs. Only one is NEXUS production. The Slice Plan must lock to the production project identity before any data-touching slice proceeds.**

---

## 2. Project Identity Matrix

### 2.1 Production Supabase (NEXUS)

| Property | Value | Source |
|----------|-------|--------|
| **Project ref** | `xjuglddxwnikvcwxfbzg` | Notion `NEXUS New API VPS 部署狀況` §4.8, §10 |
| **REST URL** | `https://xjuglddxwnikvcwxfbzg.supabase.co` | Notion VPS docs |
| **Region** | `ap-southeast-2` (Sydney) | Notion `NEXUS Scan Task Brief` §2 |
| **Postgres version** | 17.6.1.121 | Notion `NEXUS Scan Task Brief` §2 |
| **Status** | ACTIVE_HEALTHY | Notion `NEXUS Scan Task Brief` §2 |
| **Tables** | 36 public tables, all RLS enabled | Notion `NEXUS Scan Task Brief` §2 |
| **Migrations** | 34 | Notion `NEXUS Scan Task Brief` §2 |
| **Edge Functions** | 0 | Notion `NEXUS Scan Task Brief` §2 |
| **Anon key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (env var, not hardcoded) | GitHub `client.ts` |
| **Service role** | `SUPABASE_SERVICE_ROLE_KEY` (env var, server-side only) | GitHub `admin.ts` |
| **Client resolution** | `NEXT_PUBLIC_SUPABASE_URL` → runtime env → build-time env → `/api/v1/public-config` fallback | GitHub `client.ts:8-42, 80-108` |

### 2.2 MCP Supabase (OPS / Possibly Different Project)

| Property | Value | Source |
|----------|-------|--------|
| **MCP hostname** | `db.vqyuonrhpecfjklbeqsn.supabase.co` | MCP error message |
| **Project ref** | `vqyuonrhpecfjklbeqsn` | Extracted from hostname |
| **Connection status** | ENOTFOUND — DNS resolution failure | MCP error (persistent across all attempts) |
| **MCP server** | `postgres` | MCP configuration |

### 2.3 Comparison

| Property | Production (xjuglddxwnikvcwxfbzg) | MCP (vqyuonrhpecfjklbeqsn) |
|----------|:---:|:---:|
| **Project ref matches** | N/A | N/A — different projects |
| **Referenced in code** | ✅ `NEXT_PUBLIC_SUPABASE_URL` | ❌ Not referenced |
| **Referenced in Notion** | ✅ VPS docs, Scan Task Brief | ❌ Not referenced |
| **Referenced in Vercel env** | ✅ `NEXT_PUBLIC_SUPABASE_URL` | ❌ Not referenced |
| **MCP accessible** | ❌ Not configured | ❌ ENOTFOUND |
| **Is NEXUS production?** | ✅ YES | ❌ NO |

---

## 3. Identity Lock Declaration

### LOCKED IDENTITY

```
NEXUS PRODUCTION SUPABASE:
  Project ref:  xjuglddxwnikvcwxfbzg
  REST URL:     https://xjuglddxwnikvcwxfbzg.supabase.co
  Region:       ap-southeast-2 (Sydney)
  PG Version:   17.6.1.121
  Tables:       36 (all RLS enabled)
  Migrations:   34
```

**All future slices (S-6 through S-12) that reference Supabase data, schema, or tables MUST use this project identity.** The MCP project (`vqyuonrhpecfjklbeqsn`) is NOT the NEXUS production database and must not be treated as such.

### What This Means

| For Design Slices | Impact |
|-------------------|--------|
| S-6 (Global Conversations) | Any `global_conversations` table design targets `xjuglddxwnikvcwxfbzg` |
| S-7 (Import Contract) | Workspace copy design targets production `messages` table |
| S-9 (NOVA P0 Fix) | RLS policy fixes target production NOVA tables |
| S-10, S-11, S-12 | No direct Supabase dependency |

| For Future Implementation | Impact |
|---------------------------|--------|
| Table creation | DDL targets `xjuglddxwnikvcwxfbzg` |
| Migration application | Migrations apply to `xjuglddxwnikvcwxfbzg` |
| RLS policy changes | Policies modified on `xjuglddxwnikvcwxfbzg` |
| Data queries | Read/write to `xjuglddxwnikvcwxfbzg` |

---

## 4. Generated Types Coverage

### 4.1 What database.types.ts Covers

**27 tables** with full TypeScript type definitions in `src/lib/supabase/database.types.ts` (SHA `338d4dc`, 21,998 bytes):

`workspaces`, `workspace_memberships`, `permission_audit_logs`, `agent_memory_records`, `api_idempotency_keys`, `workspace_snapshots`, `workspace_state_entities`, `sync_operations`, `feature_flags`, `deployment_checks`, `agent_runtime_sessions`, `agent_tasks`, `agent_runtime_events`, `tool_runs`, `tool_permissions`, `agent_profiles`, `workspace_agents`, `messages`, `artifacts`, `artifact_references`, `system_events`, `usage_metrics`, `prompts`, `prompt_revisions`, `notebooks`, `workflow_templates`

**24 enums** with full TypeScript definitions.

**2 functions:** `has_workspace_role`, `is_workspace_member`

**0 views, 0 composite types.**

### 4.2 What database.types.ts Does NOT Cover

These tables exist in production (per Scan Task Brief) but have NO generated types:

| Missing Table | Importance for Slice Plan | How Code Accesses It |
|--------------|--------------------------|---------------------|
| `model_usage_ledger` | **CRITICAL** — S-3, S-5, wallet linkage | Manual type in `usage-ledger.ts` + `as never` casts |
| `nova_documents` | **CRITICAL** — S-9 P0 fix | Not accessed in inspected code |
| `nova_chunks` | **CRITICAL** — S-9 P0 fix | Not accessed in inspected code |
| `nova_ingest_runs` | **CRITICAL** — S-9 P0 fix | Not accessed in inspected code |
| `user_new_api_tokens` | HIGH — S-3 token resolution | Manual service in `new-api-token/` directory |
| `line_system_*` | LOW — future LINE integration | Not accessed in inspected code |

### 4.3 Types Coverage Gap for Wallet Slices

| Wallet Table (Proposed) | In database.types.ts? | Generated Types Needed? |
|------------------------|:---:|:---:|
| `wallet_transactions` | ❌ (doesn't exist yet) | ✅ Yes — before implementation |
| `wallet_balances` | ❌ (doesn't exist yet) | ✅ Yes — before implementation |
| `global_conversations` | ❌ (doesn't exist yet) | ✅ Yes — before implementation |
| `global_messages` | ❌ (doesn't exist yet) | ✅ Yes — before implementation |
| `model_usage_ledger` | ❌ (exists, no types) | ✅ Yes — must be added to types |
| `nova_documents` | ❌ (exists, no types) | ✅ Yes — must be added to types |
| `nova_chunks` | ❌ (exists, no types) | ✅ Yes — must be added to types |
| `nova_ingest_runs` | ❌ (exists, no types) | ✅ Yes — must be added to types |

---

## 5. Runtime Env Resolution Chain

### 5.1 Client-Side (anon key)

```
1. NEXT_PUBLIC_SUPABASE_URL (build-time env, Next.js public)
2. /api/v1/public-config (runtime fetch, for client-side after build)
3. If neither available: throw "Supabase client is not configured"
```

Code path: `client.ts:16-42` → `getSupabaseEnv()` → `normalizeSupabaseConfig()` → `fetchRuntimeConfig()` fallback

### 5.2 Server-Side (service role)

```
1. NEXT_PUBLIC_SUPABASE_URL (for host)
2. SUPABASE_SERVICE_ROLE_KEY (for auth)
3. If either missing: throw "Supabase admin client is not configured"
```

Code path: `admin.ts:11-35` → `hasSupabaseServiceRoleConfig()` → `createNexusSupabaseAdminClient()`

### 5.3 Vercel Production Env (from Notion)

```
NEXT_PUBLIC_SUPABASE_URL = https://xjuglddxwnikvcwxfbzg.supabase.co  ← CONFIRMED
SUPABASE_SERVICE_ROLE_KEY = [present, not inspected]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [present, not inspected]
```

The Vercel `NEXT_PUBLIC_SUPABASE_URL` points to `xjuglddxwnikvcwxfbzg` — this is the authoritative production URL.

---

## 6. Migration History (from Notion)

| Property | Value |
|----------|-------|
| **Migration count** | 34 (as of 2026-06-19 Scan Task Brief) |
| **Migration location** | `supabase/migrations/` (standard Supabase directory, not inspected) |
| **Edge Functions** | 0 — all backend logic in Next.js API routes |
| **Postgres version** | 17.6.1.121 |

Migration files were not inspected in this report (outside S-0 scope). They are relevant for:
- S-9 (NOVA P0 fix) — need to see existing NOVA table DDL
- Wallet table creation — need to follow migration numbering convention

---

## 7. Single-Source Determination

### The MCP project (vqyuonrhpecfjklbeqsn) is NOT NEXUS production.

Evidence:
1. DNS resolution fails (`ENOTFOUND`) — the hostname `db.vqyuonrhpecfjklbeqsn.supabase.co` does not resolve.
2. No reference in Notion documentation.
3. No reference in GitHub code.
4. No reference in Vercel production env.
5. The production project (`xjuglddxwnikvcwxfbzg`) is confirmed in Vercel env, Notion VPS docs, and Notion Scan Task Brief.

### Possible explanations for MCP project:

| Possibility | Likelihood |
|------------|-----------|
| MCP configured for a different/staging Supabase project | HIGH |
| MCP hostname is a typo/configuration error | MEDIUM |
| Project was deleted or renamed | LOW — would return auth error, not ENOTFOUND |
| MCP Supabase project never existed | LOW — DNS-resolvable hostnames are generated by Supabase |

### Action Required

To resolve the MCP gap, the MCP server configuration must be updated to point to the production Supabase project (`xjuglddxwnikvcwxfbzg`) with proper connection credentials. This is an infrastructure task, not a slice design task.

---

## 8. Impact on Slice Plan

### Locked Identity Enables

| Slice | What's Now Possible |
|-------|-------------------|
| S-6 (Global Conversations) | Can reference `messages` table schema from types; can design `global_conversations` targeting production |
| S-7 (Import Contract) | Can reference workspace `messages` columns; can design copy flow against production schema |
| S-9 (NOVA P0 Fix) | Can reference NOVA table names; RLS design targets production project |
| S-10, S-11, S-12 | No direct Supabase dependency — unaffected |

### Still Blocked (Types Gap)

| Block | Impact | Resolution |
|-------|--------|-----------|
| `model_usage_ledger` has no generated types | S-5 linkage design uses `request_id` (from code, not types) | Accept `request_id` as provisional. Regenerate types after table added to Supabase CLI types generation. |
| NOVA tables have no generated types | S-9 must design RLS without type-level column confirmation | Regenerate types or manually add NOVA table types to `database.types.ts` |
| `wallet_transactions` doesn't exist | No types to generate | Design first (S-5), generate types after DDL |

---

## 9. Lock Declaration

```
SUPABASE PROJECT IDENTITY LOCK — 2026-06-20

The NEXUS production Supabase project is:
  Project ref:  xjuglddxwnikvcwxfbzg
  REST URL:     https://xjuglddxwnikvcwxfbzg.supabase.co
  Region:       ap-southeast-2
  PG Version:   17.6.1.121

This identity is LOCKED for all future slices.
No slice may reference, design against, or implement against
any other Supabase project.

The MCP project (vqyuonrhpecfjklbeqsn) is NOT production.
It must not be used as an authority source for any slice.

Types coverage gap: 6 production tables lack generated TypeScript types.
model_usage_ledger linkage uses request_id (provisional) until types regenerated.

Lock effective immediately. Binding on S-6 through S-12.
```

---

## 10. S-6 Readiness

| Prerequisite | Status |
|-------------|--------|
| Supabase production project identity LOCKED | ✅ |
| Production REST URL confirmed | ✅ |
| `messages` table schema available in database.types.ts | ✅ |
| `workspaces` table schema available | ✅ |
| `workspace_memberships` table schema available | ✅ |
| `model_usage_ledger` linkage provisional (request_id) | ✅ (accepted constraint) |
| Types coverage gap documented | ✅ |
| MCP project excluded from authority | ✅ |

**S-6 (Global Conversations Domain Design) is NOW AUTHORIZED.**

---

## No Implementation Performed

Read-only identity lock. No code written. No migrations applied. No SQL executed. No Supabase changes. No MCP configuration modified.
