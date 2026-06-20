# S-5: Grant Transaction Flow Design

**Phase:** C (Wallet Technical Entry)
**Depends on:** S-2 (Wallet vocabulary & types defined)
**Owner Locks:** FINAL-LOCK-4
**Status:** Design only — no implementation authorized

## Objective
Design the grant transaction flow: initial account grant and monthly recurring grant. Define the `wallet_transaction` record contract, the balance derivation rule, and the integration point with account creation.

## Code Domains Touched (Design Reference Only)
- Supabase Auth hooks (account creation trigger point) — reference only
- `src/lib/backend/models/usage-ledger.ts` — reference for transaction record pattern

## Data Domains Touched (Design Reference Only)
- Future `wallet_transactions` table (design only, no DDL)
- Future `wallet_balances` table (design only, no DDL)

## What This Slice Designs

### 5.1 Grant Types

| Grant Type | transaction_type | source | Trigger | Amount Source |
|-----------|-----------------|--------|---------|---------------|
| Initial grant | `grant` | `system_initial_grant` | Account creation | Config: `INITIAL_CREDIT_GRANT` |
| Monthly grant | `grant` | `monthly_grant` | Cron/trigger (1st of month) | `PRODUCT_PLAN_CONFIG[plan].monthlyCreditGrant` |
| Manual grant | `grant` | `manual_adjustment` | Admin action | Manual input |
| Promo grant | `grant` | `promo_grant` | Promo code redemption | Promo config |

### 5.2 Initial Grant Flow (Pseudocode)

```
ON account creation:
  1. Determine plan = getUserPlan({ userId })
  2. grantAmount = INITIAL_CREDIT_GRANT  // TBD by owner, configurable
  3. INSERT wallet_transaction:
       {
         userId,
         type: 'grant',
         source: 'system_initial_grant',
         amount: +grantAmount,
         balanceAfter: grantAmount,  // first transaction = grantAmount
         metadata: { plan, reason: 'account_creation' }
       }
  4. UPSERT wallet_balances:
       {
         userId,
         currentBalance: grantAmount,
         lastTransactionId: <transaction.id>,
         updatedAt: now()
       }

Constraint: Initial grant MUST be recorded as a transaction.
No magic balance. No hardcoded balance bypassing the ledger.
```

### 5.3 Monthly Grant Flow (Pseudocode)

```
ON monthly cron (UTC 1st of month, staggered per user):
  1. For each active user:
     a. plan = getUserPlan({ userId })
     b. grantAmount = PRODUCT_PLAN_CONFIG[plan].monthlyCreditGrant
     c. IF grantAmount > 0:
        INSERT wallet_transaction:
          {
            userId,
            type: 'grant',
            source: 'monthly_grant',
            amount: +grantAmount,
            balanceAfter: <currentBalance + grantAmount>,
            metadata: { plan, month: '2026-07', reason: 'monthly_grant' }
          }
        UPDATE wallet_balances:
          {
            currentBalance: currentBalance + grantAmount,
            lastTransactionId: <transaction.id>,
            updatedAt: now()
          }

Note: Monthly grant does NOT reset the balance. It adds to it.
This is fundamentally different from the old monthlyPoints reset.
```

### 5.4 Balance Derivation Rule

```
Rule: wallet_balance.currentBalance = SUM(wallet_transactions.amount) 
       WHERE wallet_transactions.userId = user.id 
       AND wallet_transactions.status = 'completed'

Optimization: wallet_balances.currentBalance is a cached derived value.
              Recalculated on each transaction (atomic).
              Full SUM recalculation available for audit reconciliation.

Constraint: Never derive balance from any source other than wallet_transactions.
            Never hardcode balance.
            Never let balance go negative (gate blocks before deduction).
```

### 5.5 Deduction Flow Design (Linked to S-3)

```
ON successful AI operation:
  1. estimatedCredits = credit cost of operation
  2. walletBalance = getCurrentBalance(userId)
  3. newBalance = walletBalance - estimatedCredits
  4. INSERT wallet_transaction:
       {
         userId,
         type: 'deduction',
         source: operationSource,  // 'chat_completion', 'image_generation', etc.
         amount: -estimatedCredits,
         balanceAfter: newBalance,
         operationId: <model_usage_ledger.id>,  // link to usage record
         metadata: { modelId, operationType, requestId }
       }
  5. UPDATE wallet_balances:
       { currentBalance: newBalance, lastTransactionId: <transaction.id> }

ON failed AI operation:
  // Reservation already done by balance gate (S-3).
  // If the operation fails after the gate:
  // - model_usage_ledger records 0 chargedPoints (existing pattern)
  // - NO wallet deduction (no credits consumed for failed operations)
  // - NO reversal needed (gate doesn't deduct; gate only checks)

Constraint: wallet_transaction and model_usage_ledger are separate records.
            wallet_transaction records CREDIT changes.
            model_usage_ledger records MODEL USAGE.
            They are linked by operationId, not merged.
```

### 5.6 Table Relationships (Design)

```
wallet_balances (1) ←→ (1) user (Supabase Auth)
wallet_transactions (N) → (1) wallet_balances (via userId)
wallet_transactions (N) → (0..1) model_usage_ledger (via operationId)
model_usage_ledger (N) → (1) user (via userId)
```

## Validation Method
- All 4 grant types defined with complete field contracts
- Initial grant flow is unambiguous
- Monthly grant flow is unambiguous (adds, doesn't reset)
- Balance derivation rule is explicit
- Deduction flow links to model_usage_ledger without merging
- No negative balance path exists (gate blocks before deduction)

## Forbidden Areas
- Do not create any tables (no DDL)
- Do not write any trigger/cron code
- Do not set INITIAL_CREDIT_GRANT value (TBD by owner)
- Do not design a billing/invoicing system — wallet is credits, not fiat
- Do not merge wallet_transactions into model_usage_ledger

## Dependency Order
After S-2 (types defined). Parallel with S-3 and S-4.

## Rollback / No-Op Validation
Only a design document produced. No code changed. No tables created. No state changed.
