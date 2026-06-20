# Supabase Authority Re-validation 2026-06-20

**Date:** 2026-06-20
**Scope:** Read-only authority re-validation before S-5 (Grant Transaction Flow)
**Method:** GitHub `database.types.ts` inspection + Notion Scan Task Brief cross-reference
**Supabase MCP:** STILL UNREACHABLE (`ENOTFOUND db.vqyuonrhpecfjklbeqsn.supabase.co`)

---

## 1. Verification Method

Since Supabase MCP remains unreachable, validation was performed via:
1. **GitHub `database.types.ts`** (21,998 bytes, SHA `338d4dc`) — generated Supabase types in the codebase
2. **Notion `NEXUS Scan Task Brief 2026-06-19`** — documented live schema from 2026-06-19
3. **Code `usage-ledger.ts`** — manual type definition for `model_usage_ledger` (bypasses database.types.ts)
4. **Notion `NEXUS New API VPS 部署狀況`** — table mapping documentation

---

## 2. Critical Finding: Type-Schema Drift

### 2.1 Tables in database.types.ts (27 tables)

The generated types file covers these 27 tables:
`workspaces`, `workspace_memberships`, `permission_audit_logs`, `agent_memory_records`, `api_idempotency_keys`, `workspace_snapshots`, `workspace_state_entities`, `sync_operations`, `feature_flags`, `deployment_checks`, `agent_runtime_sessions`, `agent_tasks`, `agent_runtime_events`, `tool_runs`, `tool_permissions`, `agent_profiles`, `workspace_agents`, `messages`, `artifacts`, `artifact_references`, `system_events`, `usage_metrics`, `prompts`, `prompt_revisions`, `notebooks`, `workflow_templates`

### 2.2 Tables in live Supabase but NOT in database.types.ts (6+ tables)

From the Scan Task Brief and VPS documentation:

| Table | In database.types.ts? | How Code Accesses It |
|-------|:---:|---------------------|
| `model_usage_ledger` | ❌ NOT IN TYPES | Manual type in `usage-ledger.ts:6-17` + `as never` cast at line 88 |
| `nova_documents` | ❌ NOT IN TYPES | Referenced in Notion docs only |
| `nova_chunks` | ❌ NOT IN TYPES | Referenced in Notion docs only |
| `nova_ingest_runs` | ❌ NOT IN TYPES | Referenced in Notion docs only |
| `user_new_api_tokens` | ❌ NOT IN TYPES | Manual service in `new-api-token/` directory |
| `line_system_*` | ❌ NOT IN TYPES | Referenced in Notion docs only |

### 2.3 Impact on Slice Design

**This is significant for S-5 and beyond.** The `model_usage_ledger` table — which is the primary linkage target for wallet deductions — has NO generated TypeScript types. The code accesses it via:

```typescript
// usage-ledger.ts:88
const { error } = await client.from("model_usage_ledger" as never).insert({...} as never);
```

The `as never` casts bypass type checking entirely. This means:
1. We cannot confirm the exact column names from generated types
2. The `id` column existence is assumed but not type-proven
3. The `charged_points` column name comes from the manual `UsageLedgerRecord` type, not from Supabase

**For S-5 deduction linkage:** The code-level `UsageLedgerRecord` (in `usage-ledger.ts`) defines these identifying fields:
- `id: string` — candidate for operation linkage
- `requestId: string` — candidate for operation linkage
- `userId: string` — scoping
- `chargedPoints: number` — credit amount

The Supabase column name is `charged_points` (snake_case, from line 88). The code maps `chargedPoints` → `charged_points` in the insert. This confirms the column naming convention.

---

## 3. model_usage_ledger Column Structure (from code, not live DB)

From `usage-ledger.ts:88-103` (Supabase insert mapping):

| Code Field (camelCase) | Supabase Column (snake_case) | Type | Confirmed? |
|------------------------|------------------------------|------|-----------|
| `id` | `id` | string/UUID | ⚠️ Code assumes, not type-proven |
| `userId` | `user_id` | string | ✅ In manual type |
| `operatorId` | `operator_id` | string | ✅ In manual type |
| `conversationId` | `conversation_id` | string? | ✅ In manual type |
| `requestId` | `request_id` | string | ✅ In manual type |
| `modelId` | `model_id` | string | ✅ In manual type |
| `newApiModel` | `new_api_model` | string | ✅ In manual type |
| `providerFamily` | `provider_family` | string | ✅ In manual type |
| `inputTokens` | `input_tokens` | number | ✅ In manual type |
| `outputTokens` | `output_tokens` | number | ✅ In manual type |
| `totalTokens` | `total_tokens` | number | ✅ In manual type |
| `chargedPoints` | `charged_points` | number | ✅ In manual type |
| `sourceType` | `source_type` | string | ✅ In manual type |
| `status` | `status` | string | ✅ In manual type |
| `errorCode` | `error_code` | string? | ✅ In manual type |
| `createdAt` | `created_at` | string | ✅ In manual type |

### 3.1 Linkage Column Candidates

For wallet deduction linkage (`wallet_transaction.operationId → model_usage_ledger`):

| Candidate | Pros | Cons |
|-----------|------|------|
| `id` (UUID) | Direct FK, unique per row | Not type-proven; may not exist in live DB as UUID |
| `request_id` | Available at all call sites; already present in `ai-gateway-service.ts` | May not be unique (same request may generate multiple ledger rows?) |
| Composite (`user_id + request_id + created_at`) | Works without schema changes | Complex join; fragile |

**Recommendation for S-5:** Use `request_id` as the primary linkage column. It is:
- Already available at every call site (`input.requestId` in `ai-gateway-service.ts`)
- Already stored in `model_usage_ledger`
- Does not require schema changes to `model_usage_ledger`

Backup: `id` column if confirmed unique via live Supabase query.

---

## 4. NOVA Tables — Still Unvalidated

The 3 NOVA tables (`nova_documents`, `nova_chunks`, `nova_ingest_runs`) and the `match_nova_chunks` RPC have NO type definitions in `database.types.ts` and NO code-level access patterns visible in the inspected files. They exist only in Notion documentation.

**For S-9 (NOVA workspace-scoped P0 fix):** Must re-validate before implementation. Cannot confirm current RLS policies, column existence, or whether `workspace_id` column has already been added.

---

## 5. Supabase Project Identity

From `client.ts` and `admin.ts`:
- **Project URL:** `process.env.NEXT_PUBLIC_SUPABASE_URL` (runtime, not hardcoded)
- **Anon key:** `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` (runtime)
- **Service role:** `process.env.SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- **Expected URL (per Notion):** `https://xjuglddxwnikvcwxfbzg.supabase.co`
- **MCP hostname:** `db.vqyuonrhpecfjklbeqsn.supabase.co` ← DIFFERENT FROM NOTION

These are two different Supabase project refs:
- `xjuglddxwnikvcwxfbzg` — from Notion VPS deployment docs
- `vqyuonrhpecfjklbeqsn` — from MCP configuration

**Possibility:** The MCP server is configured for a different Supabase project. The production NEXUS project (`xjuglddxwnikvcwxfbzg`) may not be the one the MCP connects to. This would explain the persistent ENOTFOUND.

---

## 6. Status: What We Know vs What We Don't

### CONFIRMED (from code + Notion, not live DB)

| Fact | Source | Confidence |
|------|--------|-----------|
| 36 public tables exist in production Supabase | Scan Task Brief (2026-06-19) | Medium (not re-validated) |
| model_usage_ledger has charged_points column | usage-ledger.ts code | High (code writes to it) |
| model_usage_ledger has id, request_id columns | usage-ledger.ts code | Medium (assumed, not type-proven) |
| NOVA tables have broad RLS policies | Scan Task Brief | Medium (not re-validated) |
| Supabase project ref is xjuglddxwnikvcwxfbzg | Notion VPS docs | High |
| database.types.ts missing 6+ tables | Code inspection | Confirmed |
| 27 of ~36 tables have generated types | Code inspection | Confirmed |

### UNCONFIRMED (needs live Supabase access)

| Question | Blocking Slice |
|----------|---------------|
| Does model_usage_ledger.id exist as UUID? | S-5 |
| Is model_usage_ledger.request_id unique per operation? | S-5 |
| What is current tool_runs row count? | S-3, S-11 |
| Are NOVA broad policies still present? | S-9 |
| Does match_nova_chunks still have no workspace filter? | S-9 |
| Are SECURITY DEFINER functions still exposed? | S-9 |
| What is current model_usage_ledger row count? | S-5 |
| What is current user count? | S-5 |

---

## 7. Go / No-Go for S-5

### Recommendation: CONDITIONAL GO

S-5 (Grant Transaction Flow Design) can proceed as a DESIGN-ONLY slice with the following constraint:

> **The deduction linkage column in S-5 design must use `request_id` as the primary candidate, with `id` as the fallback. Neither is confirmed until live Supabase is queried. All wallet_transaction ←→ model_usage_ledger linkage is design-level only; implementation requires Supabase column verification.**

S-5 does not create tables, does not write code, and does not apply migrations. Its risk is limited to designing against an unconfirmed column. Using `request_id` (which is confirmed in code) as the linkage candidate minimizes this risk.

### Conditions for S-5:

1. Use `request_id` as the linkage column in all deduction flow designs
2. Mark `model_usage_ledger.id` as "unconfirmed — verify before implementation"
3. Note that `database.types.ts` does not include `model_usage_ledger` — manual types only
4. Defer final linkage column name until live Supabase query confirms column existence and uniqueness

---

## No Implementation Performed

Read-only metadata inspection via GitHub code. No Supabase queries executed against live data. No code written. No Git changes.
