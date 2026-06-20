# S-5 Execution Report: Grant Transaction Flow Design

**Date:** 2026-06-20
**Slice:** S-5 — Grant Transaction Flow Design
**Status:** COMPLETE (design only)
**Predecessors:** S-2 (Wallet Types), S-2 Addendum (balance derivation, linkage clarification), S-3 (Balance Gate), S-3/S-4 Review Addendum (preflight rejection, race risk), S-4 (Pricing Metadata), Supabase Authority Re-validation
**Owner Locks:** FINAL-LOCK-4 (Initial credits via grant transaction)
**Constraint:** Supabase production authority UNRESOLVED. `request_id` is provisional linkage candidate. No schema finalization. No migration. No code writes.

---

## Purpose

Design the three credit transaction flows — initial grant, monthly grant, and deduction — and the balance derivation rule. All designs use `request_id` as the provisional linkage between `wallet_transaction` and `model_usage_ledger`. No SQL. No migration. No schema finalization.

---

## 1. Provisional Authority Statement

### 1.1 What Is Unresolved

The following must be confirmed via live Supabase query before any implementation:

| Item | Current Assumption | Risk if Wrong |
|------|-------------------|---------------|
| `model_usage_ledger.request_id` is unique per operation | Assumed unique based on code insert pattern | Duplicate request_ids would break linkage |
| `model_usage_ledger.id` exists as UUID | Assumed from code, not type-proven | Cannot use as fallback if absent |
| `model_usage_ledger.charged_points` is the current column name | Confirmed in `usage-ledger.ts:88` | LOW risk — code actively writes to it |
| `model_usage_ledger` row count | Unknown — cannot verify live | N/A for design |
| Supabase project ref is `xjuglddxwnikvcwxfbzg` | From Notion VPS docs | MCP connects to different project (`vqyuonrhpecfjklbeqsn`) |

### 1.2 Design Rule

> All linkage references in this design use `request_id` as the provisional candidate. The column name `operationId` in `WalletTransaction` design is a logical field — its mapping to `model_usage_ledger.request_id` is provisional until Supabase production authority is confirmed.

---

## 2. Balance Derivation Rule

### 2.1 Single Source of Truth

```
RULE 0 (immutable):
  wallet_balance = SUM(wallet_transactions.amount)
                   WHERE wallet_transactions.user_id = :userId
                   AND wallet_transactions.status = 'completed'

RULE 1 (no direct writes):
  No code, API, admin tool, or migration may directly set wallet_balances.current_balance.
  Every balance change MUST flow through a wallet_transaction row.

RULE 2 (cache is derivative):
  A wallet_balances materialized row MAY exist for read performance.
  It is a CACHE, not a source of truth.
  If cache.current_balance ≠ SUM(wallet_transactions.amount), SUM wins.
  Cache reconciliation is possible at any time via full SUM recalculation.

RULE 3 (atomicity):
  INSERT wallet_transaction + UPDATE wallet_balances cache MUST occur
  in the same database transaction (or be derivable without the cache).
  If the cache update fails, the transaction is still valid —
  the cache can be recalculated from SUM.
```

### 2.2 Derivation Pseudocode

```
function deriveBalance(userId: string): number {
  // AUTHORITATIVE — reads from wallet_transactions only
  const result = SUM(wallet_transactions.amount)
    WHERE user_id = userId AND status = 'completed';
  
  // If no transactions exist, balance is 0
  return result ?? 0;
}

function getBalance(userId: string): { balance: number, source: 'cache' | 'derived' } {
  // Try cache first
  const cached = readWalletBalancesCache(userId);
  if (cached) {
    return { balance: cached.current_balance, source: 'cache' };
  }
  
  // Fall back to derivation
  const derived = deriveBalance(userId);
  return { balance: derived, source: 'derived' };
}

function reconcileBalance(userId: string): { cached: number, derived: number, drift: number } {
  // Audit function — compare cache to SUM
  const cached = readWalletBalancesCache(userId)?.current_balance ?? 0;
  const derived = deriveBalance(userId);
  return { cached, derived, drift: cached - derived };
}
```

---

## 3. Initial Grant Flow

### 3.1 Trigger

Account creation. The exact trigger mechanism (Supabase Auth hook, database trigger, API call) is an implementation detail — not designed here.

### 3.2 Flow

```
ON account creation for user :userId:

Step 1: Determine grant amount
  plan = getUserPlan({ userId })
  grantAmount = INITIAL_CREDIT_GRANT  // configurable, TBD by owner
                                       // Suggested reference: 100,000 (matching current Free monthlyPoints)
                                       // Owner must set final value

Step 2: Compute balance after grant
  currentBalance = deriveBalance(userId)  // will be 0 for new account
  balanceAfter = currentBalance + grantAmount

Step 3: Insert wallet_transaction
  INSERT {
    user_id: userId,
    type: 'grant',
    source: 'system_initial_grant',
    amount: +grantAmount,              // positive = credit added
    balance_after: balanceAfter,
    operation_id: NULL,                // no linked operation
    status: 'completed',
    metadata: {
      plan: plan,
      reason: 'account_creation',
      grant_version: 1
    }
  }

Step 4: Update balance cache
  UPSERT wallet_balances {
    user_id: userId,
    current_balance: balanceAfter,
    last_transaction_id: <transaction.id>,
    recomputed_at: now()
  }

CONSTRAINT: Initial grant MUST be recorded as a wallet_transaction row.
            No magic balance. No hardcoded starting balance bypassing the ledger.
            Grant amount is NOT zero — free accounts receive starter credits per FINAL-LOCK-4.
```

### 3.3 Idempotency Requirement

```
PROBLEM: Account creation hook may fire more than once (retry, race, replay).
SOLUTION: Idempotency key = "initial_grant:{userId}"

Before inserting:
  CHECK EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE user_id = :userId
    AND source = 'system_initial_grant'
    AND status = 'completed'
  )
  If exists → SKIP (already granted)
  If not exists → PROCEED with insert

This prevents duplicate initial grants without requiring a unique constraint
on a column that would block legitimate re-grants (e.g., admin reset).
```

---

## 4. Monthly Grant Flow

### 4.1 Trigger

Scheduled job (cron-like) running on the 1st of each month UTC. Implementation mechanism (Vercel Cron, Supabase Cron, external scheduler) is not designed here.

### 4.2 Flow

```
FOR EACH active user :userId:

Step 1: Determine grant amount
  plan = getUserPlan({ userId })
  grantAmount = PRODUCT_PLAN_CONFIG[plan].monthlyCreditGrant  // renamed from monthlyPoints
  // Free: 100,000 | Basic: 1,000,000 | Pro: 5,000,000 | Team: 20,000,000

Step 2: Idempotency check
  grantMonth = toYYYYMM(now())  // e.g., "2026-07"
  CHECK EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE user_id = :userId
    AND source = 'monthly_grant'
    AND metadata->>'grant_month' = :grantMonth
    AND status = 'completed'
  )
  If exists → SKIP (already granted for this month)

Step 3: Apply plan discount multiplier (if any)
  // Plan discount does NOT affect grant amount — it affects credit COST at deduction time.
  // The grant is the full amount. Discounts are applied during credit estimation (S-4).
  // This step is a NO-OP for grants. Documented here to prevent confusion.

Step 4: Compute balance after grant
  currentBalance = deriveBalance(userId)
  balanceAfter = currentBalance + grantAmount

Step 5: Insert wallet_transaction
  INSERT {
    user_id: userId,
    type: 'grant',
    source: 'monthly_grant',
    amount: +grantAmount,
    balance_after: balanceAfter,
    operation_id: NULL,
    status: 'completed',
    metadata: {
      plan: plan,
      grant_month: grantMonth,
      reason: 'monthly_grant'
    }
  }

Step 6: Update balance cache
  UPSERT wallet_balances SET
    current_balance = balanceAfter,
    last_transaction_id = <transaction.id>,
    recomputed_at = now()

KEY DIFFERENCE FROM OLD SYSTEM:
  Monthly grant ADDS to balance. It does NOT reset balance to a fixed amount.
  Old system: balance = monthlyPoints on 1st of month (reset).
  New system: balance += monthlyCreditGrant on 1st of month (accumulation).
  Unused credits carry over indefinitely. No monthly reset.
```

### 4.3 Staggering Requirement

```
PROBLEM: Running monthly grant for ALL users at exactly 00:00 UTC on the 1st
         creates a load spike and a timing edge case.

SOLUTION: Stagger grants across the first 24 hours of the month.
  grantMinute = hash(userId) % 1440  // 1440 minutes in a day
  Grant fires at grantMinute after 00:00 UTC on the 1st.
  
  This spreads load and avoids the "user at 23:59 on last day of month
  hasn't received grant yet" edge case.
```

---

## 5. Deduction Flow

### 5.1 Trigger

Successful AI operation (chat completion, image generation). The deduction occurs AFTER the model call succeeds, per S-3 gate design.

### 5.2 Flow

```
AFTER successful AI operation:

Preconditions (from S-3 gate):
  assertSufficientCredits PASSED at time t1 (balance ≥ estimatedCredits)
  Model call completed successfully
  model_usage_ledger row INSERTED with status = 'succeeded'

Step 1: Compute actual credit cost
  actualCredits = estimateModelCredits(modelId, actualTokens)
  // Uses actual token count from provider response, not the pre-call estimate
  // Per S-3 Addendum B: actual is usually ≤ estimate

Step 2: Get current balance
  // Balance may have changed since gate check (t1) due to concurrent operations
  // Per S-3/S-4 Review Addendum: race risk accepted for Phase 1
  currentBalance = deriveBalance(userId)
  balanceAfter = currentBalance - actualCredits

Step 3: Negative balance guard (Phase 1 safety net)
  IF balanceAfter < 0:
    // Race condition occurred — another operation deducted credits between gate check and now
    // Log the anomaly
    anomaly = {
      type: 'negative_balance_race',
      pre_deduction_balance: currentBalance,
      deduction_amount: actualCredits,
      would_result_in: balanceAfter
    }
    // Clamp to 0 — don't allow negative balance
    balanceAfter = 0
    
    // NOTE: This guard is a safety net, NOT a proof that negative balance is impossible.
    // Per S-3/S-4 Review Addendum §3: do not claim negative balance is impossible
    // until atomic deduction guard is implemented.
  END IF

Step 4: Insert wallet_transaction
  INSERT {
    user_id: userId,
    type: 'deduction',
    source: operationSource,          // 'chat_completion' | 'image_generation' | etc.
    amount: -actualCredits,           // negative = credit removed
    balance_after: balanceAfter,
    operation_id: :requestId,         // ← PROVISIONAL: maps to model_usage_ledger.request_id
    status: 'completed',
    metadata: {
      model_id: modelId,
      operation_type: operationSource,
      estimated_credits: :estimatedCredits,  // pre-call estimate (for audit)
      actual_credits: actualCredits,         // post-call actual
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      request_id: :requestId,
      anomaly: anomaly || null
    }
  }

Step 5: Update balance cache
  UPSERT wallet_balances SET
    current_balance = balanceAfter,
    last_transaction_id = <transaction.id>,
    recomputed_at = now()
```

### 5.3 Ledger Linkage — Provisional Design

```
wallet_transaction.operation_id → model_usage_ledger.request_id

PROVISIONAL: This linkage uses request_id as the connecting column.
             request_id is confirmed in usage-ledger.ts code.
             model_usage_ledger.id is assumed but not type-proven.

Linkage options (final decision deferred to Supabase production authority confirmation):

Option A (CURRENT DESIGN): request_id
  wallet_transaction.operation_id = model_usage_ledger.request_id
  Pros: Available at all call sites. Already stored in both tables.
  Cons: May not be unique per operation if multiple ledger rows share a request_id.

Option B (FALLBACK): composite (request_id + user_id + created_at)
  wallet_transaction.operation_id = composite key
  Pros: No schema changes needed.
  Cons: Complex join. No single-column FK.

Option C (FUTURE): model_usage_ledger.id
  wallet_transaction.operation_id = model_usage_ledger.id
  Pros: Clean FK. Unique per row.
  Cons: id column not type-proven. Requires live Supabase confirmation.

DESIGN RULE:
  This document uses Option A (request_id) as the provisional design.
  Before implementation, confirm via live Supabase query:
    1. model_usage_ledger.request_id is NOT NULL for all rows
    2. request_id is unique per operation
    3. model_usage_ledger.id exists as UUID and can be captured at insert time
  Final linkage column selection is an implementation decision, not a design decision.
```

### 5.4 Failure Path (No Deduction)

```
AFTER failed AI operation:

  model_usage_ledger row INSERTED with status = 'failed', credits = 0
    // Existing pattern in ai-gateway-service.ts catch block
    // BUT: per S-3/S-4 Review Addendum §2, must skip this for preflight errors
    // INSUFFICIENT_CREDITS, PERMISSION_DENIED, VALIDATION_FAILED → NO ledger row

  wallet_transaction: NOT INSERTED
    // Credits are NOT consumed for failed operations
    // Balance is UNCHANGED

  This is consistent with the existing pattern:
    - Old: chargedPoints = 0 on failure, no quota impact
    - New: no wallet deduction on failure, balance unchanged
```

---

## 6. Transaction Immutability Rule

### 6.1 Insert-Only Design

```
wallet_transactions is INSERT-ONLY.

  ✅ INSERT new rows (grant, deduction)
  ❌ UPDATE existing rows
  ❌ DELETE existing rows

Reversal is via a NEW transaction:
  To reverse a grant:  INSERT { type: 'adjustment', source: 'manual_adjustment', amount: -X }
  To refund a deduction: INSERT { type: 'refund', source: 'refund_operation', amount: +X }

The original transaction row is NEVER modified.
Its status changes from 'completed' to 'reversed' only by a separate reversal transaction.
Balance is always derivable from SUM of all rows.
```

### 6.2 Audit Trail

```
Every balance-affecting event is a row in wallet_transactions:
  - Account creation → grant row
  - Monthly cron → grant row
  - Chat completion → deduction row
  - Image generation → deduction row
  - Admin adjustment → adjustment row
  - Refund → refund row

Full balance history: SELECT * FROM wallet_transactions WHERE user_id = :id ORDER BY created_at
Balance at any point in time: SUM(amount) WHERE created_at <= :timestamp

This is the single source of truth. No external balance record is authoritative.
```

---

## 7. Idempotency Requirements

### 7.1 Grant Idempotency

| Grant Type | Idempotency Key | Scope | Dedup Window |
|-----------|----------------|-------|-------------|
| `system_initial_grant` | `initial_grant:{userId}` | Per user, forever | Check before insert |
| `monthly_grant` | `monthly_grant:{userId}:{YYYY-MM}` | Per user, per month | Check before insert |
| `manual_adjustment` | `adjustment:{userId}:{idempotency_key}` | Caller-provided | Caller responsibility |
| `promo_grant` | `promo:{userId}:{promo_code}` | Per user, per promo code | Check before insert |

### 7.2 Deduction Idempotency

| Deduction Type | Idempotency Key | Scope |
|---------------|----------------|-------|
| `chat_completion` | `deduction:{userId}:{request_id}` | Per request |
| `image_generation` | `deduction:{userId}:{request_id}` | Per request |

```
Deduction idempotency:
  Before inserting deduction:
    CHECK EXISTS (
      SELECT 1 FROM wallet_transactions
      WHERE user_id = :userId
      AND type = 'deduction'
      AND metadata->>'request_id' = :requestId
      AND status = 'completed'
    )
    If exists → SKIP (already deducted for this request)
    
  This prevents double-deduction if the deduction step is retried.
  The model_usage_ledger row is already idempotent via api_idempotency_keys.
```

---

## 8. Blocked Assumptions

The following are ASSUMED in this design but NOT CONFIRMED. Each is a blocker for implementation.

| # | Assumption | Blocker Severity | Verification Method |
|---|-----------|-----------------|---------------------|
| A1 | `model_usage_ledger.request_id` is unique per operation | **HIGH** — wrong column breaks linkage | Live Supabase: `SELECT request_id, COUNT(*) FROM model_usage_ledger GROUP BY request_id HAVING COUNT(*) > 1` |
| A2 | `model_usage_ledger.id` exists as UUID | MEDIUM — only needed if Option C chosen | Live Supabase: `SELECT id FROM model_usage_ledger LIMIT 1` |
| A3 | `model_usage_ledger.charged_points` is the correct column name | LOW — confirmed in code | Already verified via `usage-ledger.ts:88` |
| A4 | Supabase project ref is `xjuglddxwnikvcwxfbzg` | **HIGH** — wrong project = wrong data | Live Supabase: confirm project identity |
| A5 | `PRODUCT_PLAN_CONFIG` values are current | LOW — design uses existing values | Code inspection: plan-config.ts confirmed |
| A6 | User plan resolution is correct for new accounts | MEDIUM — wrong plan = wrong grant | Verify `getUserPlan` behavior for unprovisioned users |
| A7 | Account creation hook exists or can be added | MEDIUM — no hook = no initial grant | Verify Supabase Auth hook availability |
| A8 | Monthly cron infrastructure exists | LOW — multiple implementation options | Design-level, not blocking design |
| A9 | `INITIAL_CREDIT_GRANT` value is set by owner | LOW — configurable | Owner decision, not technical blocker |

---

## 9. What This Design Does NOT Include

The following are explicitly excluded from S-5 scope:

| Excluded Item | Reason |
|--------------|--------|
| SQL migration scripts | No DDL in design phase |
| Table creation DDL | Schema not finalized |
| wallet_balances table definition | Derived cache only — schema deferred |
| wallet_transactions table definition | Exact column types deferred to Supabase type generation |
| Account creation hook implementation | Implementation detail |
| Monthly cron implementation | Implementation detail |
| Reserve/commit/release pattern | Phase 3 — not Phase 1 |
| Atomic deduction guard (`SELECT ... FOR UPDATE`) | Phase 2 — not Phase 1 |
| Balance cache invalidation strategy | Implementation detail |
| Reconciliation job design | Implementation detail |
| Admin panel for manual adjustments | Future feature |

---

## 10. Flow Summary Diagram

```
ACCOUNT CREATION
  │
  ├─ getUserPlan(userId) → plan
  ├─ grantAmount = INITIAL_CREDIT_GRANT
  ├─ idempotency: "initial_grant:{userId}"
  ├─ INSERT wallet_transaction (type=grant, source=system_initial_grant, amount=+grantAmount)
  └─ UPSERT wallet_balances (cache)

MONTHLY CRON (1st of month, staggered)
  │
  ├─ FOR EACH active user:
  ├─   getUserPlan(userId) → plan
  ├─   grantAmount = PRODUCT_PLAN_CONFIG[plan].monthlyCreditGrant
  ├─   idempotency: "monthly_grant:{userId}:{YYYY-MM}"
  ├─   INSERT wallet_transaction (type=grant, source=monthly_grant, amount=+grantAmount)
  └─   UPSERT wallet_balances (cache)

AI OPERATION (chat / image)
  │
  ├─ Pre-call: assertSufficientCredits PASSES (S-3 gate)
  ├─ Model call EXECUTES
  ├─ On SUCCESS:
  │   ├─ INSERT model_usage_ledger (status=succeeded, credits=actual)
  │   ├─ actualCredits = estimateModelCredits(modelId, actualTokens)
  │   ├─ negative balance guard (clamp to 0 if race)
  │   ├─ INSERT wallet_transaction (type=deduction, amount=-actualCredits,
  │   │     operation_id = request_id ← PROVISIONAL)
  │   └─ UPSERT wallet_balances (cache)
  │
  └─ On FAILURE:
      ├─ INSERT model_usage_ledger (status=failed, credits=0)
      └─ NO wallet_transaction (balance unchanged)

BALANCE DERIVATION (any time)
  │
  └─ wallet_balance = SUM(wallet_transactions.amount)
     WHERE status = 'completed'
     ← SINGLE SOURCE OF TRUTH
```

---

## 11. S-6 Readiness

| Prerequisite | Status |
|-------------|--------|
| Balance derivation rule defined | ✅ |
| Initial grant flow designed (with idempotency) | ✅ |
| Monthly grant flow designed (with staggering) | ✅ |
| Deduction flow designed (with negative balance guard) | ✅ |
| Ledger linkage options documented (provisional: request_id) | ✅ |
| Transaction immutability rule defined | ✅ |
| Idempotency requirements for all flow types | ✅ |
| 9 blocked assumptions cataloged | ✅ |
| 10 excluded items explicitly listed | ✅ |
| Flow summary diagram complete | ✅ |
| Supabase authority unresolved flag present | ✅ |
| No SQL, no migration, no schema finalization | ✅ |

**S-5 is COMPLETE. S-6 (Global Conversations Domain Design) is NOT YET AUTHORIZED — requires Supabase Project Identity Lock first.**

---

## No Implementation Performed

Design only. No code written. No SQL produced. No migrations designed. No Supabase changes. No schema finalized. `request_id` is provisional linkage candidate. Supabase production authority remains unresolved.
