# NEXUS Owner Final Lock 2026-06-20

**Date:** 2026-06-20
**Status:** FINAL LOCK — All 14 owner decisions resolved. No implementation.
**Predecessors:** Technical Entry Report → Owner Decision Review → Owner Lock Draft + Evidence Check Report
**Next document:** Implementation Slice Plan (not yet authorized)

---

## 1. Six Final Owner Locks

---

### FINAL-LOCK-1: Wallet 為主，Plan 退居 Entitlement Layer

| Field | Value |
|-------|-------|
| **Source** | D-1, Owner Lock Draft LOCK-1 |
| **Decision** | Wallet is the single source of spending truth. Plan is an entitlement/benefit layer only. |

**What this means:**

Every AI operation (chat completion, image generation, NOVA retrieval, tool execution, workflow run) deducts credits from the user's wallet balance. The wallet balance is the gate — if balance is insufficient, the operation is blocked (per FINAL-LOCK-5).

Plan no longer controls whether an operation is allowed. Plan only provides:
- Monthly credit grant amount (deposited via wallet transaction)
- Capability rules (which models/features the user can access)
- Discount multiplier on wallet credit costs
- Concurrency and rate limits

**What must NOT happen:**
- Wallet must NOT be another plan tier or membership level
- Plan must NOT remain as a parallel spending gate
- `monthlyPoints` must NOT be preserved as a hard quota — it must become `monthlyCreditGrant`

**Why:**

The Notion Command Center is explicit: "Wallet 才是商業消耗真相，Plan 比較像帳號權益層." The existing code (`plan-config.ts`, `quota-gate.ts`) already separates model access control (`allowedModelIds`, `PLAN_RANK`) from spending limits (`monthlyPoints`, `chargedPoints`) — this split aligns with the lock. The CODE_VERDICT from the Evidence Check Report confirms the architecture is ~60% wallet-ready already.

**Unlocks:** Wallet data model design (`wallet_balances`, `wallet_transactions`). Credit deduction middleware placement in `ai-gateway-service.ts`. Plan config repurposing (not deletion).

---

### FINAL-LOCK-2: Import to Workspace Phase 1 採 Copy

| Field | Value |
|-------|-------|
| **Source** | D-2, Owner Lock Draft LOCK-2 |
| **Decision** | Copy only. Main chat retains original. Workspace receives independent copy with provenance. |

**What this means:**

When a user imports a global conversation into a workspace:
1. The original global conversation remains in the home sidebar recent chats
2. A workspace-scoped copy is created with `imported_from_global_chat_id` provenance metadata
3. The original conversation displays an "Imported to [workspace name]" badge
4. NOVA workspace notebook indexes the workspace copy only — never the global original
5. The import action is explicit (user-triggered), not automatic

**What must NOT happen:**
- No Move (removing original from recent chats)
- No Link (shared reference between account and workspace)
- No auto-import triggered by navigation or drag-and-drop
- No NOVA indexing of global conversations without explicit import

**Why:**

Copy is the safest contract for Phase 1: original preserved, workspace gets independent data, provenance is clear. Move has irreversible UX risk (user loses their chat). Link creates complex permission/deletion semantics that shouldn't block the first workspace release. Move and Link can be added as future enhancements when workspace permissions mature.

**Unlocks:** `global_conversations` table design. Workspace copy contract. Import UI flow spec. NOVA indexing boundary for imported content.

---

### FINAL-LOCK-3: NOVA 第一版強制 Workspace-Scoped

| Field | Value |
|-------|-------|
| **Source** | D-3, Owner Lock Draft LOCK-3 |
| **Decision** | NOVA is workspace-scoped from Phase 1. Not user-scoped. Not hybrid. |

**What this means:**

Every NOVA record carries a `workspace_id` column (NOT NULL):
- `nova_documents.workspace_id`
- `nova_chunks.workspace_id`
- `nova_ingest_runs.workspace_id`

Retrieval (`match_nova_chunks`) is scoped to the active workspace. RLS policies use `workspace_id` as the security boundary. A user can only access NOVA data for workspaces where they hold membership. No account-wide "all my documents" bucket exists.

**What must NOT happen:**
- No `user_id` as primary ownership column (it can exist as audit column, but not as the security boundary)
- No user-scoped MVP with "migrate to workspace later" plan
- No `match_nova_chunks` without workspace filter
- No broad public RLS policies (`true` for anon/authenticated) — these P0 gaps must be fixed with workspace-scoped policies

**Why:**

The NOVA broad public policies are a documented P0 security gap. Adding `workspace_id` and scoping RLS to workspace membership is the correct fix. Owner directive overrides the previous Technical Entry Report recommendation of user-scoped for MVP. Workspace-scoped from day one avoids a re-migration that would be required later.

**Unlocks:** NOVA P0 RLS fix design. `workspace_id` column addition spec. Retrieval scoping contract. Workspace membership integration.

---

### FINAL-LOCK-4: 新帳號給初始 Wallet Credits，以 Grant Transaction 記錄

| Field | Value |
|-------|-------|
| **Source** | D-4, Owner Lock Draft LOCK-4 |
| **Decision** | New accounts receive an initial wallet credit grant. Recorded as a grant transaction. |

**What this means:**

On account creation, the system:
1. Creates a `wallet_transaction` record with `transaction_type = 'grant'` and `source = 'system_initial_grant'`
2. The grant amount is configurable (TBD by owner)
3. `wallet_balance` is derived from the sum of all transactions — never hardcoded
4. Monthly recurring grants (from plan entitlement) also flow through `wallet_transaction` with `transaction_type = 'monthly_grant'`

**What must NOT happen:**
- No hardcoded initial balance that bypasses the transaction ledger
- No "magic" balance that appears without an audit trail
- No initial grant that skips `wallet_transaction`

**Why:**

Every credit must be traceable to a transaction. This is the foundation of wallet integrity. If grants appear without transactions, the wallet becomes unauditable. The existing `model_usage_ledger` already records every consumption event with `sourceType` and `status` — the wallet must extend this discipline to the credit side.

**Unlocks:** `wallet_transactions` schema. Initial grant flow spec. Monthly grant cron/trigger design. Balance derivation logic.

---

### FINAL-LOCK-5: Insufficient Balance → Hard Block + Top-up Prompt

| Field | Value |
|-------|-------|
| **Source** | D-13, Owner Final Lock |
| **Decision** | Phase 1: Hard block on insufficient credits. No auto-downgrade. No silent fallback. |

**What this means:**

When wallet balance is insufficient for a requested operation:
1. The system returns a 402 `INSUFFICIENT_CREDITS` error
2. The response includes: `required_credits`, `current_balance`, `shortfall`, `model_id`
3. The user sees a top-up prompt with the credit gap and options to:
   - Add credits (充值入口)
   - Select a lower-cost model that their balance can afford
   - Cancel the request
4. The request is never silently downgraded, never auto-fallbacked, never allowed to proceed with negative balance

**What must NOT happen:**
- No automatic model downgrade (e.g., gpt-4o → gpt-4o-mini) without explicit user choice
- No silent fallback to a cheaper model
- No continuation of the request into negative balance
- No reuse of the old `QUOTA_EXCEEDED` error code — must be `INSUFFICIENT_CREDITS`

**Why:**

Automatic downgrade is a UX feature, not a Phase 1 requirement. It introduces ambiguity: did the user get what they asked for? Did they know the model changed? Hard block with clear feedback is the safest wallet behavior. The current `quota-gate.ts` already throws a hard 402 — this lock preserves that pattern but replaces the error semantics from "monthly quota exhausted" to "insufficient credits."

Auto-downgrade can be added as a future enhancement with explicit user opt-in.

**Unlocks:** Wallet balance gate implementation (extends existing `assertMonthlyQuotaAvailable` pattern). 402 error response contract. Top-up UI entry point spec. Low-cost model suggestion logic.

---

### FINAL-LOCK-6: Pricing Model → chargedPoints as Credit Foundation

| Field | Value |
|-------|-------|
| **Source** | D-14, Owner Final Lock |
| **Decision** | Phase 1 uses the existing `chargedPoints` system as the wallet credit pricing foundation. |

**What this means:**

The existing pricing infrastructure is preserved and semantically upgraded:

| Old Name | New Semantic | Action |
|----------|-------------|--------|
| `chargedPoints` | `credits` — wallet credit cost per operation | Rename |
| `MODEL_POINT_MULTIPLIERS` | `MODEL_CREDIT_MULTIPLIERS` — per-model credit cost multiplier | Rename, keep values (1×–8×) |
| `IMAGE_GENERATION_FIXED_POINTS` | `IMAGE_GENERATION_FIXED_CREDITS` — fixed credit cost per quality tier | Rename, keep values (1000/2500/5000) |
| `estimateModelPoints()` | `estimateModelCredits()` — pre-call credit estimation | Rename, keep formula |
| `estimateImageGenerationPoints()` | `estimateImageGenerationCredits()` — image credit estimation | Rename, keep formula |
| `sumChargedPointsForUserSince()` | `getWalletBalance()` — current wallet balance | New function, new data source |
| `monthlyPoints` on plan config | `monthlyCreditGrant` — monthly grant amount | Rename, repurpose |

**What must NOT happen:**
- No complex pricing engine (tiered pricing, dynamic pricing, surge pricing) — Phase 1 is the existing multiplier system only
- No direct fiat-to-credit conversion (credits are abstract units, not currency)
- No merging of `wallet_transactions` and `model_usage_ledger` — they remain separate tables
- `model_usage_ledger` continues to record actual model usage (tokens, model, status)
- `wallet_transactions` records credit changes (grants, deductions, refunds, adjustments)
- No removal of `SERVER_MODEL_CATALOG` or `PRODUCT_PLAN_CONFIG` — they are extended, not replaced

**Why:**

The Evidence Check Report inspected 7 source files and confirmed:
- The multiplier system (1× to 8×) is proportional to actual model API costs
- The pre-estimate → gate → execute → record pattern is wallet-ready
- Both chat and image routes use the same pricing functions
- Pricing metadata is server-only (not exposed to clients) — correct security posture

Building a new pricing engine for Phase 1 would be over-engineering. The existing chargedPoints system is the correct foundation. The CODE_VERDICT from the Evidence Check Report is explicit: "`chargedPoints` is a solid v1 basis. Rename to `credits`. Keep the multiplier system."

**Unlocks:** Credit cost calculation design. Model catalog pricing metadata extension. Wallet balance gate integration with existing estimation functions. Without needing a new pricing engine.

---

## 2. What Each Lock Unlocks

| Lock | Unlocks This Technical Slice | Phase |
|------|------------------------------|-------|
| FINAL-LOCK-1 | Wallet data model (`wallet_balances`, `wallet_transactions`). Plan repurposing. Credit deduction middleware. | C |
| FINAL-LOCK-2 | `global_conversations` table. Import contract. NOVA indexing boundary. | E, F |
| FINAL-LOCK-3 | NOVA P0 RLS fix. `workspace_id` column. Retrieval scoping. | G |
| FINAL-LOCK-4 | `wallet_transactions` schema. Initial grant flow. Monthly grant design. | C |
| FINAL-LOCK-5 | Wallet balance gate. 402 error contract. Top-up UI entry point. | C |
| FINAL-LOCK-6 | Credit cost calculation. Catalog pricing extension. Balance gate integration. | C |

**Phase C (Wallet Technical Entry) is now fully unblocked.** All 4 wallet-related locks (1, 4, 5, 6) are resolved. The wallet data model, balance gate, pricing, and grant flow can be designed.

**Phases D–I remain unblocked per the deferred decision defaults** (D-5 through D-12, confirmed in Owner Lock Draft).

---

## 3. Still Forbidden

The following remain forbidden until an Implementation Slice Plan is produced and authorized:

- ❌ No Git changes (no commits, no branches, no PRs)
- ❌ No Supabase changes (no DDL, no DML, no migration files, no RLS policy changes)
- ❌ No migrations (no schema changes applied to any environment)
- ❌ No deployments (no Vercel, no VPS, no edge functions)
- ❌ No code writes (no new files, no edits to existing files)
- ❌ No Supabase queries against live data (read-only metadata inspection only)
- ❌ No removal of existing code or configuration
- ❌ No token/secret exposure

**Allowed (read-only only):**
- ✅ Reading GitHub source code for design reference
- ✅ Reading Notion Command Center for context
- ✅ Reading Supabase metadata (schema, policies, row counts — not user content)
- ✅ Producing design documents (data models, API contracts, UI specs)

---

## 4. Next Document: Implementation Slice Plan

The next document should be:

**NEXUS Implementation Slice Plan 2026-06-20**

This document should:
1. Decompose the 6 locked decisions into concrete implementation slices
2. Order slices by dependency (Phase C first, then D/E/F/G/H/I)
3. Define each slice's scope: which files, which tables, which routes
4. Define verification criteria for each slice
5. Explicitly state what is NOT included in each slice
6. Include the SOP closed loop from `NEXUS 技術開口順序與SOP閉環`: read authority sources → produce diff → classify change → find duplicates → decide → single slice → verify → update handoff

**This document is NOT an implementation authorization.** It is a planning artifact. No code is written until the owner reviews and authorizes the Implementation Slice Plan.

---

## 5. Decision Traceability

| Decision ID | Original Question | Resolution | Lock ID |
|-------------|------------------|------------|---------|
| D-1 | Wallet vs Plan | Wallet replaces plan as spending truth | FINAL-LOCK-1 |
| D-2 | Import mode | Copy only for Phase 1 | FINAL-LOCK-2 |
| D-3 | NOVA tenancy | Workspace-scoped from Phase 1 | FINAL-LOCK-3 |
| D-4 | Free credits | Yes, via grant transaction | FINAL-LOCK-4 |
| D-5 | NexusOps relocation | Deferred — `/workspace/[id]` (default) | Deferred |
| D-6 | Home layout | Deferred — sidebar-heavy (default) | Deferred |
| D-7 | Imported in recent | Deferred — yes with badge (default) | Deferred |
| D-8 | NOVA doc sharing | Deferred — no (default) | Deferred |
| D-9 | Evidence visibility | Deferred — inline citations (default) | Deferred |
| D-10 | File upload scope | Deferred — any authenticated (default) | Deferred |
| D-11 | CLI scope | Deferred — owner/dev-only (default) | Deferred |
| D-12 | MCP scope | Deferred — read-only resources (default) | Deferred |
| D-13 | Insufficient balance | Hard block + top-up prompt | FINAL-LOCK-5 |
| D-14 | Pricing model | chargedPoints as credit foundation | FINAL-LOCK-6 |

**All 14 decisions resolved.** 6 final locks. 8 deferred with confirmed defaults.

---

## No Implementation Yet

This document is a decision artifact. No code has been modified. No migrations have been applied. No Supabase data has been altered. No deployments have been triggered.

The purpose of this document is exclusively to:
1. Consolidate all 14 owner decisions into their final form
2. Establish the binding technical constraints for each lock
3. Identify which phases are now unblocked for design work
4. Maintain the prohibition on implementation until an authorized plan exists

All 6 locks are binding on any future agent or implementation phase. No agent may implement against a different model.
