# NEXUS Owner Lock Draft 2026-06-20

**Date:** 2026-06-20
**Based on:** Technical Entry Report 2026-06-20 + Owner Decision Review 2026-06-20
**Status:** Owner Lock — 4 decisions locked by owner directive. 8 deferred with defaults. 2 pending evidence.

---

## Locked Decisions (Owner Directive)

These 4 decisions are now LOCKED. No agent may reopen, reinterpret, or implement against a different model.

---

### LOCK-1: Wallet 為主，Plan 退居 Entitlement Layer

| Field | Value |
|-------|-------|
| **Locked answer** | Wallet is the spending truth. Plan becomes an entitlement/benefit layer only. |
| **What this means** | Every AI operation (chat, image, NOVA retrieval, tool run, workflow run) deducts from wallet balance. Plan no longer controls whether an operation is allowed — wallet balance does. Plan only controls: (a) monthly credit grant amount, (b) capability rules (which models are accessible), (c) discount multiplier on wallet pricing, (d) concurrency/rate limits. |
| **What must NOT happen** | Wallet must NOT be another "plan tier." Wallet is a ledger/balance/transaction system, not a membership level. |
| **Plan preservation** | The existing `PRODUCT_PLAN_CONFIG` (Free/Basic/Pro/Team) is preserved but repurposed. `monthlyPoints` → monthly credit grant. `allowedModelIds` → capability rules. The `PLAN_RANK` gating remains for model access control. |
| **Evidence basis** | Notion Command Center explicit directive. Plan config already has separate concerns (allowedModelIds vs monthlyPoints) that align with this split. |

---

### LOCK-2: Import to Workspace Phase 1 採 Copy

| Field | Value |
|-------|-------|
| **Locked answer** | Copy only for Phase 1. Main chat retains original. Workspace gets independent copy. |
| **What this means** | When a user imports a global conversation into a workspace, the system creates a new workspace-scoped conversation copy with `imported_from_global_chat_id` provenance. The original global conversation remains in recent chats with an "Imported to [workspace]" badge. NOVA indexes the workspace copy only. |
| **What must NOT happen** | No Move (removing from recent chats). No Link (shared reference). No auto-import (user must explicitly trigger). |
| **Data contract** | `global_conversations.id` → `workspace_conversations.imported_from_global_chat_id`. Copy includes all messages at time of import. Subsequent edits to original do NOT sync to copy. |
| **Future** | Move and Link can be added as later phases when workspace permissions and deletion semantics mature. |
| **Evidence basis** | Owner directive. Technical Entry Report §7 Option A analysis. |

---

### LOCK-3: NOVA 第一版強制 Workspace-Scoped

| Field | Value |
|-------|-------|
| **Locked answer** | NOVA is workspace-scoped from Phase 1. Not user-scoped. Not hybrid. |
| **What this means** | Every NOVA record (documents, chunks, ingest runs) carries a `workspace_id` column (NOT NULL). Retrieval is scoped to the active workspace. RLS policies use `workspace_id` as the security boundary. A user can only access NOVA data for workspaces they are a member of. |
| **What must NOT happen** | NOVA must NOT be user-scoped with a later migration plan. It must be workspace-scoped from the start. No account-wide "all my documents" bucket. |
| **Implication for P0 fix** | The broad public policies on nova_documents, nova_chunks, nova_ingest_runs must be replaced with workspace-scoped RLS policies. `match_nova_chunks` must be scoped to workspace. |
| **Implication for home chat** | Global conversations CANNOT be indexed by NOVA unless imported into a workspace first (per LOCK-2 Copy contract). |
| **Evidence basis** | Owner directive. Overrides the Technical Entry Report's recommendation of user-scoped for MVP. |

---

### LOCK-4: 新帳號給初始 Wallet Credits，以 Grant Transaction 記錄

| Field | Value |
|-------|-------|
| **Locked answer** | New accounts receive an initial wallet credit grant. This grant MUST be recorded as a grant transaction (not a null-source balance). |
| **What this means** | On account creation, the system creates a `wallet_transaction` record with `transaction_type = 'grant'`, `source = 'system_initial_grant'`, and the grant amount. The `wallet_balance` is derived from the sum of all transactions. No "magic" balance that appears without a transaction. |
| **What must NOT happen** | No hardcoded initial balance without a transaction record. No grant amount that bypasses the wallet ledger. |
| **Grant amount** | Amount TBD by owner. The existing Free plan grants 100,000 monthlyPoints — this can serve as a reference but wallet credits are a different unit system. |
| **Monthly recurring** | Monthly credit grants (from plan entitlement) also flow through `wallet_transaction` with `transaction_type = 'monthly_grant'`. |
| **Evidence basis** | Owner directive. The existing `model_usage_ledger` already records every consumption event with `sourceType` and `status` — the wallet should extend this pattern to credits. |

---

## Deferred Decisions (Defaults Confirmed)

These 8 decisions are deferred to their respective phases. Default answers below are recommended but can be changed by owner before the relevant phase begins.

| ID | Decision | Default | Blocks Phase |
|----|----------|---------|--------------|
| D-5 | NexusOps relocation | Move to `/workspace/[id]` route | D |
| D-6 | Home layout | Sidebar-heavy (Gemini/ChatGPT pattern) | D |
| D-7 | Imported chats in recent | Yes, with "Imported to [workspace]" badge | F |
| D-8 | NOVA doc sharing across workspaces | No for Phase 1 (workspace-scoped already prevents this) | G |
| D-9 | NOVA evidence visibility | Inline source citations | G |
| D-10 | NOVA file upload scope | Any authenticated workspace member | G |
| D-11 | CLI scope | Owner/dev-only first release | I |
| D-12 | MCP first version | Read-only resources only | I |

---

## Pending Evidence (D-13, D-14)

D-13 (insufficient balance behavior) and D-14 (pricing model) remain pending.

A separate **Evidence Check Report** has been produced concurrently that answers the four inspection questions. Owner should review that report before deciding D-13 and D-14.

---

## What This Lock Enables

With LOCK-1 through LOCK-4 settled, the following design work can begin (no implementation):

1. **Wallet data model:** `wallet_balances` table, `wallet_transactions` table, credit deduction middleware placement in `ai-gateway-service.ts`
2. **Global conversations schema:** `global_conversations` table with `user_id`, separate from `messages` (workspace-scoped)
3. **Import contract:** Copy semantics, `imported_from_global_chat_id` column, badge UI spec
4. **NOVA workspace-scoped RLS:** Replace broad public policies with `workspace_id`-based policies
5. **Initial grant flow:** Account creation hook → `wallet_transaction` insert → balance derivation

---

## Authority

These 4 locked decisions override any conflicting recommendations in the Technical Entry Report or Owner Decision Review. No agent may implement against a different model.

No implementation yet.
