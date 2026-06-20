# S-2: Wallet Vocabulary & Type Definitions

**Phase:** C (Wallet Technical Entry)
**Depends on:** S-1 (Deduplication & Naming complete)
**Owner Locks:** FINAL-LOCK-1, FINAL-LOCK-4, FINAL-LOCK-6
**Status:** Design only — no implementation authorized

## Objective
Define the complete wallet type system and vocabulary. No tables created. No code written. Pure type design.

## Code Domains Touched (Design Reference Only)
- `src/lib/nexus-types.ts` — target location for new wallet types
- `src/lib/backend/models/plan-config.ts` — reference for plan-to-wallet rename map
- `src/lib/backend/models/usage-ledger.ts` — reference for transaction audit pattern

## Data Domains Touched (Design Reference Only)
- Supabase `model_usage_ledger` — reference for transaction record shape
- Supabase `user_new_api_tokens` — reference for per-user server-side record pattern

## What This Slice Designs

### 2.1 Wallet Core Types (TypeScript interface design only)

```typescript
// DESIGN ONLY — not to be written to code
WalletTransactionType = 'grant' | 'deduction' | 'refund' | 'adjustment';
WalletTransactionSource = 'system_initial_grant' | 'monthly_grant' | 'chat_completion' 
  | 'image_generation' | 'nova_retrieval' | 'tool_execution' 
  | 'workflow_run' | 'manual_adjustment' | 'promo_grant';
WalletTransactionStatus = 'completed' | 'reversed';

WalletTransaction = {
  id: string;
  userId: string;
  type: WalletTransactionType;
  source: WalletTransactionSource;
  amount: number;        // positive for grants, negative for deductions
  balanceAfter: number;  // wallet balance after this transaction
  operationId?: string;  // link to model_usage_ledger.id or other source
  metadata?: Record<string, unknown>;
  createdAt: string;
};

WalletBalance = {
  userId: string;
  currentBalance: number;  // derived from SUM(wallet_transactions.amount)
  lastTransactionId: string;
  updatedAt: string;
};
```

### 2.2 Credit Pricing Types (extension of existing chargedPoints)

```
CreditCost = {
  modelId: string;
  multiplier: number;        // 1x–8x, migrated from MODEL_POINT_MULTIPLIERS
  baseUnit: 'per_1k_tokens' | 'per_image' | 'per_retrieval' | 'per_tool_run';
  fixedCost?: number;        // for non-token operations (images: 1000/2500/5000)
};

CreditEstimate = {
  modelId: string;
  operationType: WalletTransactionSource;
  estimatedCredits: number;  // pre-call estimate
  breakdown: {
    baseUnits: number;       // e.g., token count / 1000
    multiplier: number;
    fixedCost: number;
  };
};
```

### 2.3 Wallet Balance Gate Types

```
InsufficientCreditsError = {
  code: 'INSUFFICIENT_CREDITS';
  statusCode: 402;
  requiredCredits: number;
  currentBalance: number;
  shortfall: number;         // requiredCredits - currentBalance
  modelId: string;
  cheaperAlternatives?: {    // models user CAN afford
    modelId: string;
    estimatedCredits: number;
  }[];
};
```

### 2.4 Rename Map (chargedPoints → credits)

| Old Name (in code) | New Name | Location |
|-------------------|----------|----------|
| `chargedPoints` | `credits` | usage-ledger.ts, plan-config.ts, quota-gate.ts, model-catalog.ts |
| `MODEL_POINT_MULTIPLIERS` | `MODEL_CREDIT_MULTIPLIERS` | plan-config.ts |
| `IMAGE_GENERATION_FIXED_POINTS` | `IMAGE_GENERATION_FIXED_CREDITS` | plan-config.ts |
| `estimateModelPoints()` | `estimateModelCredits()` | plan-config.ts |
| `estimateImageGenerationPoints()` | `estimateImageGenerationCredits()` | plan-config.ts |
| `monthlyPoints` | `monthlyCreditGrant` | plan-config.ts |
| `sumChargedPointsForUserSince()` | `getWalletBalance()` | usage-ledger.ts (new function) |
| `assertMonthlyQuotaAvailable()` | `assertSufficientCredits()` | quota-gate.ts |
| `QUOTA_EXCEEDED` | `INSUFFICIENT_CREDITS` | quota-gate.ts |

## Validation Method
- All 6 wallet types defined with complete field lists
- Rename map covers all 9 chargedPoints occurrences in code
- Types align with Owner Final Lock vocabulary (LOCK-1, LOCK-4, LOCK-6)
- No conflicts with existing nexus-types.ts (new types extend, don't replace)

## Forbidden Areas
- Do not create wallet_balances table (no DDL)
- Do not create wallet_transactions table (no DDL)
- Do not modify any source file
- Do not write TypeScript to any file — this is a type design document only
- Do not remove any existing type

## Dependency Order
After S-1 (naming boundaries defined). Before S-3, S-4, S-5 (wallet implementation slices).

## Rollback / No-Op Validation
Only a type design document was produced. No code changed. No state changed.
