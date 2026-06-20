# S-5 Addendum: No Authoritative Balance Clamp

**Date:** 2026-06-20
**Slice:** S-5 Addendum
**Appends to:** S-5 Execution Report (Grant Transaction Flow Design)
**Status:** Correction only. No code changes.

---

## Correction: The Negative Balance Guard Is Not Authoritative

### Issue

S-5 §5.2 Step 3 describes a negative balance guard that clamps `balance_after` to 0:

```
IF balanceAfter < 0:
    balanceAfter = 0
```

This implies the application layer can authoritatively prevent negative balance. It cannot.

### Clarified Position

**The negative balance guard in the deduction flow is a best-effort safety net. It operates at the application layer and has NO authority over the database.**

- The guard runs in application code (TypeScript/Node.js).
- Between the guard check and the `INSERT wallet_transaction`, the database state may change.
- Another concurrent deduction may have already pushed the balance below 0.
- The guard clamps the `balance_after` field IN THE ROW BEING INSERTED, but does NOT prevent the SUM from going negative if another row already did.
- The `wallet_balances` cache row may also be stale at the moment of UPSERT.

### What The Guard ACTUALLY Does

```
The guard ensures the STORED ROW is internally consistent:
  wallet_transaction.balance_after >= 0 for that specific row.

The guard does NOT ensure:
  SUM(wallet_transactions.amount) >= 0 across all rows.
  wallet_balances.current_balance >= 0 at all times.

If concurrent deductions outrace the guard:
  Row A: balance_after = 50  (guard passed)
  Row B: balance_after = 50  (guard passed — used stale balance)
  SUM = -30                  (actual balance went negative)
```

### What CAN Authoritatively Prevent Negative Balance

Only the following are authoritative (none exist in Phase 1 design):

| Mechanism | Phase | Status |
|-----------|-------|--------|
| Database CHECK constraint: `balance_after >= 0` | Phase 2 | Not designed |
| Row-level lock: `SELECT ... FOR UPDATE` on balance row | Phase 2 | Not designed |
| Reservation/commit/release pattern | Phase 3 | Not designed |
| Application-level mutex (single-threaded per user) | Phase 1 | Not designed, not reliable at scale |

### Correct Language for S-5

Replace:
> "A negative balance guard clause will prevent wallet_balances.currentBalance from going below 0 even if a race occurs."

With:
> "The deduction flow includes a best-effort guard that clamps `balance_after` to 0 for the row being inserted. This guard operates at the application layer and is NOT authoritative — it cannot prevent the overall balance from going negative under concurrent load. Authoritative negative balance prevention requires database-level constraints or row locking, which are deferred to Phase 2."

---

## Impact on S-5

- **§5.2 Step 3:** The guard description is updated to clarify it is best-effort, not authoritative.
- **§8 Blocked Assumptions:** Add A10: "Application-layer balance clamp is not authoritative. Database-level negative balance prevention is a Phase 2 requirement."
- **§9 Excluded Items:** Add "Database CHECK constraint for balance_after >= 0" to Phase 2 deferred items.

---

## No Implementation Performed

Correction addendum only. No code written. No Git changes. No Supabase changes.
