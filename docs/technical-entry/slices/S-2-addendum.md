# S-2 Addendum: WalletBalance Derivation Rule & Deduction Linkage Clarification

**Date:** 2026-06-20
**Slice:** S-2 Addendum
**Appends to:** S-2 Execution Report (Wallet Vocabulary & Type Definitions)
**Status:** Clarification only. No code changes.

---

## Addendum A: WalletBalance is a Derived Read Model

### Correction

The S-2 Execution Report defined `WalletBalance` as an interface with `currentBalance: number`. This could be misread as a design for a directly-writable table. That is incorrect.

### Clarified Position

**`WalletBalance` is a derived read model — a computed snapshot, not a source-of-truth table.**

- **Source of truth:** `wallet_transactions` table. Every credit change is an immutable row.
- **Balance derivation:** `wallet_balance = SUM(wallet_transactions.amount) WHERE status = 'completed'`
- **No direct writes:** No code, no API, no admin tool may directly set `currentBalance` to an arbitrary value. Every balance change flows through a `wallet_transaction` row.
- **Caching is allowed:** A `wallet_balances` materialized view or cached column may exist for performance. But it MUST be recalculable from `wallet_transactions` at any time. If the cache and the SUM disagree, the SUM wins.

### Revised Interface Comment

```typescript
/**
 * Current wallet balance for a user.
 *
 * DERIVED READ MODEL — NOT a source-of-truth table.
 * Source of truth = SUM(WalletTransaction.amount) WHERE status = 'completed'.
 *
 * May be cached as a materialized column for performance.
 * If cached value disagrees with SUM recalculation, SUM is authoritative.
 * Never write to this directly — always create a WalletTransaction and
 * derive the balance from it.
 */
export interface WalletBalance {
  userId: string;
  currentBalance: number;          // DERIVED — computed, not written directly
  lastTransactionId: string;       // for cache invalidation
  recomputedAt: string;            // when this snapshot was last recalculated
}
```

### What This Means for Implementation (When Authorized)

- `wallet_transactions` is the ONLY table that can change the balance.
- Grant → INSERT wallet_transaction (amount = +X) → balance increases.
- Deduction → INSERT wallet_transaction (amount = -X) → balance decreases.
- Refund/Adjustment → INSERT wallet_transaction (amount = ±X) → balance changes.
- NEVER: `UPDATE wallet_balances SET current_balance = 5000` — forbidden.
- ALWAYS: Re-derivable from SUM. Audit reconciliation possible at any time.

---

## Addendum B: Deduction Linkage is Proposed Future — Column Name Deferred

### Correction

The S-2 Execution Report defined `DeductionInput.operationId` as linking to `model_usage_ledger.id`. This assumes `model_usage_ledger` has an `id` column in the expected format AND that the linkage contract is finalized. Neither is confirmed.

### Clarified Position

**Wallet deduction MUST link to model usage for audit. The exact column name and linkage mechanism is DEFERRED until Supabase schema re-validation (S-0 condition).**

### What We Know (from code inspection, not live Supabase)

From `usage-ledger.ts`, the `UsageLedgerRecord` has these identifying fields:

```typescript
export type UsageLedgerRecord = {
  id: string;              // ✅ exists in code — candidate for linkage
  userId: string;
  requestId: string;       // ✅ exists — candidate for linkage
  conversationId?: string | null;
  modelId: string;
  // ... other fields
};
```

From `ai-gateway-service.ts`, the ledger insert passes `requestId` from the API layer:

```typescript
await ledger.insert({
  requestId: input.requestId,   // ← available at call site
  // ...
});
```

### Linkage Options (Deferred Decision)

| Option | Column | Pros | Cons |
|--------|--------|------|------|
| A | `model_usage_ledger.id` | Direct FK, clean | Need to confirm `id` exists in live Supabase and is a stable UUID |
| B | `model_usage_ledger.request_id` | Already available at all call sites | Less direct; request_id may not be unique per operation |
| C | `model_usage_ledger` composite key (user_id + request_id + created_at) | Works without schema changes | Complex join, fragile |

### Revised S-5 Pre-condition

Before S-5 (Grant Transaction Flow Design) can finalize the deduction linkage contract, the following MUST be confirmed via read-only Supabase inspection:

1. `model_usage_ledger` has a stable `id` column (UUID, unique)
2. `model_usage_ledger` has `request_id` column and it's unique per operation
3. Row count and sample rows to verify structure matches code assumptions
4. Whether `id` is generated server-side (Supabase `gen_random_uuid()`) or client-side

### Temporary S-3 / S-5 Language

Until Supabase is re-validated, all references to the deduction linkage should use:

> "wallet deduction must link to model usage by `operationId` / `requestId` / `usageLedgerId`. Final column name deferred until Supabase live schema validation."

Not:

> ~~"linked to model_usage_ledger.operationId"~~ (assumes a column that may not exist)

---

## Impact on Slice Plan

| Slice | Impact |
|-------|--------|
| S-3 (Balance Gate) | No impact. Gate only does pre-call check, does not touch linkage. |
| S-4 (Pricing Metadata) | No impact. Pricing is model-level, not operation-level. |
| S-5 (Grant Flow) | **Deferred linkage column name.** Use placeholder `operationId` with explicit note that final column TBD after Supabase validation. |
| S-6 through S-12 | No impact. |

---

## No Implementation Performed

Clarification addendum only. No code written. No Git changes. No Supabase changes.
