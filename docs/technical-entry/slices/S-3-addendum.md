# S-3 Addendum: Gate Pre-Authorization Clarification & Concurrent Operation Risk

**Date:** 2026-06-20
**Slice:** S-3 Addendum
**Appends to:** S-3 Execution Report (Wallet Balance Gate Design)
**Status:** Clarification only. No code changes.

---

## Addendum A: Pre-Authorization Is Not Reservation

### Correction

The S-3 Execution Report's failure path describes gate check as "pre-authorization." This could be misread as a reservation/deduction pattern. It is not.

### Clarified Position

**The gate check is a balance read + comparison. It does NOT reserve credits, does NOT deduct credits, and does NOT lock the balance.**

- The gate reads `walletBalance.currentBalance` at time t₁.
- The gate compares `currentBalance >= estimatedCredits`.
- The gate returns success or throws 402.
- The gate does NOT modify any state.
- Credits are deducted ONLY after a successful model call, at time t₂.
- Between t₁ and t₂, concurrent operations may also pass the gate and deduct credits.
- The balance at t₂ may differ from the balance at t₁.

### Race Condition: Concurrent Operations

```
User balance: 100 credits
Operation A (chat, estimated 60 credits): gate passes at t₁ → balance is 100
Operation B (image, estimated 50 credits): gate passes at t₁+1ms → balance is 100
Operation A completes: deducts 60 → balance becomes 40
Operation B completes: deducts 50 → balance becomes -10 ❌

This is a real race condition that the simple gate check does NOT prevent.
```

### Mitigation for Phase 1

| Option | Complexity | Phase 1? |
|--------|-----------|----------|
| Accept the race | None | ✅ Phase 1 — low probability for single-user operations |
| Atomic balance row lock | Medium — `SELECT ... FOR UPDATE` on wallet_balances | Defer to Phase 2 |
| Reservation pattern (reserve → commit/release) | High — requires reservation table + expiry | Defer to Phase 3 |

**Phase 1 recommendation:** Accept the race. Single-user chat/image operations are serial in practice (user sends one message at a time). The probability of concurrent operations causing negative balance is low. A negative balance guard clause will prevent wallet_balances.currentBalance from going below 0 even if a race occurs.

### Negative Balance Guard

```typescript
// When deducting after successful API call:
const newBalance = currentBalance - actualCredits;
if (newBalance < 0) {
  // Log the anomaly but still record the deduction
  // The user got a free operation due to a race condition
  // This should be extremely rare in Phase 1
  await walletRepo.createTransaction({
    userId,
    type: 'deduction',
    source: operationSource,
    amount: -actualCredits,
    balanceAfter: 0,  // Clamped to 0 — don't let balance go negative
    metadata: { 
      modelId, requestId,
      anomaly: 'negative_balance_race',
      preDeductionBalance: currentBalance,
    },
  });
} else {
  await walletRepo.createTransaction({
    userId,
    type: 'deduction',
    source: operationSource,
    amount: -actualCredits,
    balanceAfter: newBalance,
    metadata: { modelId, requestId },
  });
}
```

---

## Addendum B: Actual Cost vs Estimated Cost Gap

### Clarification

The S-3 gate uses `estimatedCredits` for the pre-call check. After the model call, the actual token count may differ from the estimate. The deduction uses `actualCredits` based on real token counts.

### Gap Handling

```
Pre-call estimate:  estimateChatCredits(modelId, estimatedTokens)  → e.g., 150 credits
Post-call actual:   estimateChatCredits(modelId, actualTokens)     → e.g., 132 credits (model was efficient)

Gate check:         balance >= 150  ✅
Deduction:          deduct 132 (actual), not 150 (estimated)

The gate uses a conservative estimate (character count / 4, rounded up).
Actual token count is almost always ≤ estimate. The user is NOT overcharged.
If actual tokens > estimate (rare with conservative estimation):
  - Deduct actual cost
  - If this causes negative balance: negative balance guard applies
  - This indicates the estimation heuristic needs tuning
```

### What This Means for Gate Design

The gate is a **floor check**, not a **ceiling check**. It ensures the user can definitely afford at LEAST the estimated cost. In practice, they are charged less (actual tokens ≤ estimate). This is user-friendly and avoids the UX problem of "you were approved for 150 but charged 200."

---

## Impact on S-4, S-5

| Slice | Impact |
|-------|--------|
| S-4 (Pricing Metadata) | No impact — estimation functions unchanged |
| S-5 (Grant Flow) | No impact — deduction flow already uses actual cost in S-3 design |

---

## No Implementation Performed

Clarification addendum only. No code written. No Git changes. No Supabase changes.
