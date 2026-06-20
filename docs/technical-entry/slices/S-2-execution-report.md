# S-2 Execution Report: Wallet Vocabulary & Type Definitions

**Date:** 2026-06-20
**Slice:** S-2 — Wallet Vocabulary & Type Definitions
**Status:** COMPLETE
**Predecessor:** S-1 (Deduplication & Naming Boundary Map)
**Owner Locks:** FINAL-LOCK-1 (Wallet replaces Plan), FINAL-LOCK-4 (Grant transactions), FINAL-LOCK-6 (chargedPoints as credit foundation)
**Method:** TypeScript interface design. No code writes. No Git changes. No Supabase changes.

---

## Purpose

Define the complete wallet type system as TypeScript interface proposals. Every type has a single canonical name (from S-1 vocabulary), a definition, field list with types, and relationship to existing code. These interfaces are DESIGN ONLY — not to be written to any source file.

---

## 1. Core Wallet Types

### 1.1 `WalletTransactionType`

```typescript
// DESIGN ONLY — proposal for src/lib/nexus-types.ts wallet section
// Canonical name: WalletTransactionType (S-1)
// Deprecates: nothing (new concept)

/**
 * The direction of a wallet credit change.
 * Positive types add credits. Negative types remove credits.
 * The sign is carried in WalletTransaction.amount.
 */
export type WalletTransactionType =
  | 'grant'        // Credits added: initial grant, monthly grant, promo, admin adjustment (+)
  | 'deduction'    // Credits removed: chat, image, retrieval, tool, workflow (-)
  | 'refund'       // Credits returned: failed operation reversal, dispute resolution (+)
  | 'adjustment';  // Credits modified: admin correction, migration fixup (+ or -)
```

### 1.2 `WalletTransactionSource`

```typescript
// DESIGN ONLY
// Canonical name: WalletTransactionSource (S-1)
// Extends: existing sourceType concept in usage-ledger.ts ("operator_chat", "image_workflow")

/**
 * Identifies the business event that caused this wallet transaction.
 * Grant sources credit the user. Consumption sources debit the user.
 */
export type WalletTransactionSource =
  // GRANT SOURCES (+)
  | 'system_initial_grant'    // Account creation grant (FINAL-LOCK-4)
  | 'monthly_grant'           // Monthly recurring grant from plan entitlement
  | 'manual_adjustment'       // Admin-initiated credit change
  | 'promo_grant'             // Promotional code redemption
  | 'refund_operation'        // Refund for a failed/cancelled operation

  // CONSUMPTION SOURCES (-)
  | 'chat_completion'         // Main chat or workspace chat LLM call
  | 'image_generation'        // Image creation via img2 or riverflow
  | 'nova_retrieval'          // NOVA knowledge retrieval query
  | 'nova_ingestion'          // NOVA document ingestion cost
  | 'tool_execution'          // Tool run (future: when tool_runs > 0)
  | 'workflow_run'            // Workflow execution (future)
  | 'cli_connector'           // CLI tool usage (future, Phase I)
  | 'mcp_connector';          // MCP tool usage (future, Phase I)
```

### 1.3 `WalletTransactionStatus`

```typescript
// DESIGN ONLY

export type WalletTransactionStatus =
  | 'completed'   // Transaction is final, included in balance calculation
  | 'reversed';   // Transaction has been reversed by a subsequent adjustment
```

### 1.4 `WalletTransaction`

```typescript
// DESIGN ONLY
// Canonical name: WalletTransaction (S-1)
// Related to: UsageLedgerRecord (linked via operationId, NOT merged)
// New table concept: wallet_transactions (future)

/**
 * Immutable record of a single credit change.
 * Wallet balance = SUM(WalletTransaction.amount) WHERE status = 'completed'.
 * Negative amounts represent deductions.
 * Linked to model_usage_ledger via operationId for audit trail.
 */
export interface WalletTransaction {
  /** UUID, unique per transaction */
  id: string;

  /** The user whose wallet this transaction affects */
  userId: string;

  /** Direction: grant (+ credits), deduction (- credits), refund (+), adjustment (+/-) */
  type: WalletTransactionType;

  /** Business source of this credit change */
  source: WalletTransactionSource;

  /**
   * Credit amount. Positive = credits added (grant/refund).
   * Negative = credits removed (deduction).
   * Never zero. Minimum magnitude >= 1 credit.
   */
  amount: number;

  /** Wallet balance AFTER this transaction was applied (denormalized for audit) */
  balanceAfter: number;

  /**
   * Link to the consuming operation, if this is a deduction.
   * Points to model_usage_ledger.id for chat/image operations.
   * Points to future tool_runs.id for tool executions.
   * NULL for grants, refunds, adjustments.
   */
  operationId?: string | null;

  /** Transaction lifecycle status */
  status: WalletTransactionStatus;

  /**
   * Arbitrary metadata for audit and debugging.
   * Deductions: { modelId, operationType, requestId, estimatedCredits }
   * Grants: { plan, reason, grantMonth }
   */
  metadata?: Record<string, unknown>;

  /** ISO 8601 timestamp of transaction creation */
  createdAt: string;
}
```

### 1.5 `WalletBalance`

```typescript
// DESIGN ONLY
// Canonical name: WalletBalance (S-1, "wallet_balance")
// New table concept: wallet_balances (future)

/**
 * Current wallet balance for a user.
 * Derived value: SUM(WalletTransaction.amount) WHERE status = 'completed'.
 * Cached for performance. Recalculated on every transaction.
 * One row per user (1:1 with Supabase auth.users).
 */
export interface WalletBalance {
  /** The user who owns this wallet */
  userId: string;

  /** Current credit balance. Computed from wallet_transactions. Never negative. */
  currentBalance: number;

  /** ID of the most recent wallet_transaction that updated this balance */
  lastTransactionId: string;

  /** ISO 8601 timestamp of last balance update */
  updatedAt: string;
}
```

---

## 2. Credit Pricing Types

### 2.1 `CreditBaseUnit`

```typescript
// DESIGN ONLY
// Canonical name: CreditBaseUnit (S-1, from DC-5/DC-6 resolution)

/**
 * How credits are counted for different operation types.
 * Token-based operations: credits = (tokens / 1000) * multiplier.
 * Fixed-cost operations: credits = fixedCost * multiplier.
 */
export type CreditBaseUnit =
  | 'per_1k_tokens'   // Chat models: credits per 1000 input+output tokens
  | 'per_image';      // Image models: credits per generated image
```

### 2.2 `CreditMultiplier`

```typescript
// DESIGN ONLY
// Canonical name: MODEL_CREDIT_MULTIPLIERS (S-1, from DC-5)
// Current name in code: MODEL_POINT_MULTIPLIERS (plan-config.ts:49-60)
// Values preserved from existing — 1x to 8x

/**
 * Per-model credit cost multiplier.
 * Applied after base unit calculation.
 * Values are proportional to actual model API costs.
 * Updated when model pricing changes at the provider level.
 */
export type CreditMultiplierMap = Record<string, number>;

// Current values (from plan-config.ts, preserved):
// {
//   "gpt-4o-mini": 1,
//   "deepseek-chat": 1,
//   "deepseek-v4-flash": 1,
//   "deepseek-v4-pro": 3,
//   "gpt-4o": 5,
//   "gemini-2.5-flash": 1,
//   "gemini-2.5-pro": 6,
//   "claude-sonnet-4-20250514": 8,
//   "img2": 1,
//   "riverflow-v2.5-fast": 1,
// }
```

### 2.3 `CreditFixedCost`

```typescript
// DESIGN ONLY
// Canonical name: IMAGE_GENERATION_FIXED_CREDITS (S-1, from DC-6)
// Current name in code: IMAGE_GENERATION_FIXED_POINTS (plan-config.ts:62-66)
// Values preserved from existing

/**
 * Fixed credit cost per image quality tier.
 * Applied BEFORE the model multiplier.
 * Only used for image generation operations (credit_base_unit = 'per_image').
 */
export type CreditFixedCostMap = Record<string, number>;

// Current values (from plan-config.ts, preserved):
// {
//   "standard": 1000,
//   "high": 2500,
//   "ultra": 5000,
// }
```

### 2.4 `CreditCost`

```typescript
// DESIGN ONLY
// Canonical name: CreditCost (S-1, replaces chargedPoints)

/**
 * The credit cost configuration for a model or operation type.
 * Used by the pricing engine to estimate credit consumption before execution.
 * Lives on SERVER_MODEL_CATALOG entries (NOT on PublicModelCatalogEntry).
 */
export interface CreditCost {
  /** Model identifier (matches SERVER_MODEL_CATALOG[].id) */
  modelId: string;

  /** How credits are counted for this model */
  baseUnit: CreditBaseUnit;

  /** Per-model cost multiplier (1x-8x, preserved from MODEL_POINT_MULTIPLIERS) */
  multiplier: number;

  /** Fixed cost for non-token operations (image models only) */
  fixedCost?: number;
}
```

### 2.5 `CreditEstimate`

```typescript
// DESIGN ONLY

/**
 * Pre-call credit consumption estimate.
 * Computed BEFORE the AI operation executes.
 * Used by the wallet balance gate to determine if the operation is affordable.
 * Replaces: estimateModelPoints() return value pattern.
 */
export interface CreditEstimate {
  /** The model being called */
  modelId: string;

  /** What kind of operation this is */
  operationType: WalletTransactionSource;

  /** Estimated credit cost for this operation */
  estimatedCredits: number;

  /** Detailed breakdown for transparency */
  breakdown: {
    /** For chat: ceil(totalTokens / 1000). For image: 1. */
    baseUnits: number;
    /** Model multiplier from CreditCost.multiplier */
    multiplier: number;
    /** Fixed cost from CreditCost.fixedCost (0 for chat models) */
    fixedCost: number;
  };
}

/**
 * Estimation functions (replace estimateModelPoints, estimateImageGenerationPoints):
 *
 * function estimateChatCredits(modelId: string, estimatedTokens: number): CreditEstimate
 *   → baseUnits = ceil(estimatedTokens / 1000)
 *   → multiplier = MODEL_CREDIT_MULTIPLIERS[modelId] ?? 1
 *   → estimatedCredits = baseUnits * multiplier
 *
 * function estimateImageCredits(modelId: string, quality: string): CreditEstimate
 *   → baseUnits = 1
 *   → fixedCost = IMAGE_GENERATION_FIXED_CREDITS[quality] ?? 1000
 *   → multiplier = MODEL_CREDIT_MULTIPLIERS[modelId] ?? 1
 *   → estimatedCredits = fixedCost * multiplier
 */
```

---

## 3. Wallet Balance Gate Types

### 3.1 `WalletGateInput`

```typescript
// DESIGN ONLY
// Canonical name: replaces assertMonthlyQuotaAvailable params (S-1, DC-3)

/**
 * Input to the wallet balance gate.
 * Called before every billable AI operation.
 */
export interface WalletGateInput {
  /** Pre-call credit estimate */
  creditEstimate: CreditEstimate;

  /** User performing the operation */
  userId: string;

  /** User's plan (for capability checking, NOT spending checking) */
  plan: UserPlan;

  /** The model being requested (for cheaper alternatives lookup) */
  modelId: string;
}
```

### 3.2 `WalletGateResult`

```typescript
// DESIGN ONLY

/**
 * Successful gate check result.
 * The operation may proceed.
 */
export interface WalletGateResult {
  /** Current wallet balance before deduction */
  currentBalance: number;

  /** Estimated balance after deduction */
  remainingAfterDeduction: number;

  /** The estimated credit cost (same as input) */
  estimatedCredits: number;
}
```

### 3.3 `InsufficientCreditsError`

```typescript
// DESIGN ONLY
// Canonical name: INSUFFICIENT_CREDITS (S-1, DC-7)
// Replaces: QUOTA_EXCEEDED
// Per FINAL-LOCK-5: Hard block, no auto-downgrade, no silent fallback

/**
 * Thrown when wallet balance is insufficient for the requested operation.
 * HTTP 402 Payment Required.
 * Includes cheaper alternatives the user CAN afford.
 */
export interface InsufficientCreditsError {
  /** Error code for API response */
  code: 'INSUFFICIENT_CREDITS';

  /** Human-readable message */
  message: string;

  /** HTTP status code */
  statusCode: 402;

  /** Whether the request can be retried without changes */
  retryable: false;

  /** Detailed breakdown for the user and UI */
  details: {
    /** How many credits this operation would cost */
    requiredCredits: number;

    /** User's current wallet balance */
    currentBalance: number;

    /** How many credits short the user is */
    shortfall: number;

    /** The model the user requested */
    modelId: string;

    /** Models the user CAN afford (same capability tier, lower credit cost) */
    cheaperAlternatives: Array<{
      modelId: string;
      estimatedCredits: number;
      label: string;
    }>;
  };
}
```

### 3.4 `WalletGateErrorResponse`

```typescript
// DESIGN ONLY
// The JSON body returned to the client on insufficient credits

/**
 * HTTP 402 response body.
 * Matches existing NEXUS API error envelope pattern (requestId, error object).
 */
export interface WalletGateErrorResponse {
  error: {
    code: 'INSUFFICIENT_CREDITS';
    message: string;
    retryable: false;
    details: InsufficientCreditsError['details'];
  };
  requestId: string;
}
```

---

## 4. Grant & Deduction Types

### 4.1 `GrantInput`

```typescript
// DESIGN ONLY
// Canonical name: from FINAL-LOCK-4

/**
 * Input for creating a credit grant transaction.
 * Used by: account creation hook, monthly cron, admin panel, promo redemption.
 */
export interface GrantInput {
  /** User receiving the grant */
  userId: string;

  /** Grant source (determines transaction_type = 'grant') */
  source: Extract<WalletTransactionSource,
    | 'system_initial_grant'
    | 'monthly_grant'
    | 'manual_adjustment'
    | 'promo_grant'
  >;

  /** Credit amount to grant (positive number) */
  amount: number;

  /** Contextual metadata */
  metadata?: {
    /** Plan that triggered this grant (for monthly_grant) */
    plan?: UserPlan;
    /** Month identifier for monthly grants (e.g., "2026-07") */
    grantMonth?: string;
    /** Human-readable reason (for manual_adjustment) */
    reason?: string;
    /** Promo code (for promo_grant) */
    promoCode?: string;
  };
}
```

### 4.2 `DeductionInput`

```typescript
// DESIGN ONLY

/**
 * Input for creating a credit deduction transaction.
 * Called AFTER a successful AI operation.
 */
export interface DeductionInput {
  /** User whose wallet is being deducted */
  userId: string;

  /** The pre-call credit estimate that was approved by the gate */
  creditEstimate: CreditEstimate;

  /** Link to the model_usage_ledger record for this operation */
  operationId: string;

  /** The actual tokens consumed (may differ from estimate for chat) */
  actualUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  /** Request ID for traceability */
  requestId: string;
}

/**
 * Deduction flow (pseudocode):
 *
 * 1. Gate check (assertSufficientCredits) passes before API call
 * 2. API call executes
 * 3. On success:
 *    a. Insert model_usage_ledger row (existing pattern)
 *    b. Compute actualCredits = estimateChatCredits(modelId, actualTokens)
 *    c. Insert wallet_transaction with type='deduction', amount=-actualCredits
 *    d. Update wallet_balances.currentBalance -= actualCredits
 * 4. On failure:
 *    a. Insert model_usage_ledger row with status='failed', credits=0 (existing pattern)
 *    b. NO wallet deduction (credits not consumed for failed operations)
 */
```

---

## 5. Plan Entitlement Types (Repurposed)

### 5.1 `PlanEntitlement`

```typescript
// DESIGN ONLY
// Canonical name: replaces ProductPlanConfig (S-1, DC-1/DC-2)
// Current name in code: ProductPlanConfig (plan-config.ts:4-7)
// Deprecates: monthlyPoints as hard cap

/**
 * What a plan provides to the user.
 * Plan is now an ENTITLEMENT layer, not a SPENDING gate.
 * Spending is governed by wallet balance.
 */
export interface PlanEntitlement {
  /** Models this plan allows the user to access (capability rule — KEPT) */
  allowedModelIds: string[];

  /** Monthly credit grant amount (was: monthlyPoints) */
  monthlyCreditGrant: number;

  /** Discount multiplier on credit costs (1.0 = no discount, 0.8 = 20% off) */
  creditDiscountMultiplier: number;

  /** Maximum concurrent operations (rate limit) */
  maxConcurrency?: number;

  /** Maximum workspace count */
  maxWorkspaces?: number;
}

// Current PRODUCT_PLAN_CONFIG repurposed:
// {
//   Free: {
//     allowedModelIds: ["gpt-4o-mini", "deepseek-chat", "riverflow-v2.5-fast"],
//     monthlyCreditGrant: 100_000,    // was: monthlyPoints
//     creditDiscountMultiplier: 1.0,  // no discount
//     maxConcurrency: 1,
//     maxWorkspaces: 3,
//   },
//   Basic: {
//     allowedModelIds: [...],
//     monthlyCreditGrant: 1_000_000,
//     creditDiscountMultiplier: 0.9,  // 10% off
//     maxConcurrency: 3,
//     maxWorkspaces: 10,
//   },
//   Pro: {
//     allowedModelIds: [...],
//     monthlyCreditGrant: 5_000_000,
//     creditDiscountMultiplier: 0.8,  // 20% off
//     maxConcurrency: 10,
//     maxWorkspaces: 50,
//   },
//   Team: {
//     allowedModelIds: [...],
//     monthlyCreditGrant: 20_000_000,
//     creditDiscountMultiplier: 0.75, // 25% off
//     maxConcurrency: 50,
//     maxWorkspaces: 200,
//   },
// }
```

### 5.2 `CapabilityRule`

```typescript
// DESIGN ONLY
// Canonical name: preserves existing canPlanUseModel logic (S-1, DC-1)
// Current name in code: PLAN_RANK + canPlanUseModel (model-catalog.ts)

/**
 * Whether a plan grants access to a model or feature.
 * Based on plan tier ranking, not wallet balance.
 * This is a CAPABILITY check, not a SPENDING check.
 */
export interface CapabilityRule {
  /** The minimum plan required to use this model/feature */
  minPlan: UserPlan;  // "Free" | "Basic" | "Pro" | "Team"

  /** Whether the feature is currently enabled server-side */
  enabled: boolean;
}

// Existing PLAN_RANK comparison preserved:
// function canPlanUseModel(plan: UserPlan, model: ProductModelCatalogEntry): boolean {
//   return model.enabled && PLAN_RANK[plan] >= PLAN_RANK[model.min_plan];
// }
// This function is CORRECT and should NOT change.
// It controls CAPABILITY access, not SPENDING access.
```

---

## 6. Extended Model Catalog Type

### 6.1 `ProductModelCatalogEntry` (Extended)

```typescript
// DESIGN ONLY
// Canonical name: extends existing ProductModelCatalogEntry (model-catalog.ts:24-41)
// Adds: credit pricing metadata (server-side only)

/**
 * Server-side model catalog entry with wallet pricing metadata.
 * Extends the existing ProductModelCatalogEntry type.
 * Pricing fields are NEVER exposed to clients (not in PublicModelCatalogEntry).
 */
export interface ProductModelCatalogEntry {
  // --- EXISTING FIELDS (unchanged) ---
  id: string;
  label: string;
  modality: ModelModality;             // "chat" | "image"
  provider_family: ModelProviderFamily; // "OpenAI" | "Claude" | "Gemini" | "DeepSeek" | "Grok"
  new_api_model: string;               // Model ID used in New API calls
  description: string;
  best_for: string[];
  min_plan: UserPlan;                  // Capability rule (KEPT)
  supports_reasoning: boolean;
  supports_vision: boolean;
  supports_tools: boolean;
  supports_long_context?: boolean;
  default_max_tokens: number;
  max_output_tokens: number;
  enabled: boolean;

  // --- NEW: wallet pricing metadata (server-side only) ---
  /** How credits are counted for this model */
  credit_base_unit: CreditBaseUnit;

  /** Per-model credit cost multiplier (1x-8x) */
  credit_multiplier: number;

  /** Fixed credit cost for image models (NULL for chat models) */
  credit_fixed_cost?: number | null;
}
```

---

## 7. Wallet Repository Interface

### 7.1 `WalletRepository`

```typescript
// DESIGN ONLY
// Canonical name: new repository pattern, mirrors UsageLedgerRepository
// Current pattern reference: UsageLedgerRepository (usage-ledger.ts:25-29)

/**
 * Repository for wallet operations.
 * Follows the same pattern as UsageLedgerRepository.
 * InMemory implementation for tests. Supabase implementation for production.
 */
export interface WalletRepository {
  /** Get current balance for a user */
  getBalance(userId: string): Promise<WalletBalance>;

  /** Insert a transaction and update the balance atomically */
  createTransaction(input: {
    userId: string;
    type: WalletTransactionType;
    source: WalletTransactionSource;
    amount: number;
    operationId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<WalletTransaction>;

  /** Sum all transactions for a user (audit reconciliation) */
  getTransactionHistory(input: {
    userId: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ transactions: WalletTransaction[]; hasMore: boolean; nextCursor?: string }>;
}
```

---

## 8. Naming Boundary Rules

These rules are binding for ALL future slices (S-3 through S-12). No type, variable, function, or comment may violate these boundaries.

### 8.1 Credit Vocabulary Boundary

| ✅ USE | ❌ NEVER USE | Reason |
|--------|-------------|--------|
| `credits` | `points`, `chargedPoints` | Wallet unit (FINAL-LOCK-6) |
| `credit_multiplier` | `point_multiplier`, `MODEL_POINT_MULTIPLIERS` | Clean naming |
| `credit_fixed_cost` | `fixed_points`, `IMAGE_GENERATION_FIXED_POINTS` | Clean naming |
| `monthlyCreditGrant` | `monthlyPoints` | Plan entitlement, not quota |
| `wallet_balance` | `monthlyPoints`, `quota_remaining` | Wallet truth |
| `assertSufficientCredits` | `assertMonthlyQuotaAvailable` | Wallet gate |
| `INSUFFICIENT_CREDITS` | `QUOTA_EXCEEDED` | Error code |

### 8.2 Entity Boundary Rules

| Rule | Rationale |
|------|-----------|
| `WalletTransaction` ≠ `UsageLedgerRecord` | Financial truth ≠ usage audit. Linked, not merged. |
| `wallet_transactions` table ≠ `model_usage_ledger` table | Separate tables. Linked by `operationId`. |
| `CreditCost` lives on SERVER_MODEL_CATALOG only | Never exposed to clients (not in PublicModelCatalogEntry) |
| `PlanEntitlement` controls capability, NOT spending | `allowedModelIds` is a capability rule. `wallet_balance` is the spending gate. |
| `UserPlan` survives as capability tier | Free/Basic/Pro/Team remain valid for model access gating |
| `WalletBalance` is 1:1 with user | One wallet per user. Not per workspace. Not per plan. |

### 8.3 Deprecation Boundary

| Concept | Status | Replacement |
|---------|--------|------------|
| Plan as spending gate | **DEPRECATED** | Wallet balance gate |
| Monthly hard cap reset | **DEPRECATED** | Continuous balance with monthly grants |
| Shared API key fallback | **DEPRECATED** (still in code) | Per-user token (already primary path) |
| Points as unit of measure | **DEPRECATED** | Credits |
| Quota-exceeded error | **DEPRECATED** | Insufficient credits error |

---

## 9. Type Relationship Diagram

```
User (Supabase Auth)
  │
  ├─ 1:1 ─ WalletBalance
  │          │
  │          └─ 1:N ─ WalletTransaction (type: grant | deduction | refund | adjustment)
  │                     │
  │                     └─ 0..1 ── model_usage_ledger (via operationId)
  │
  ├─ 1:1 ─ PlanEntitlement (UserPlan: Free | Basic | Pro | Team)
  │          │
  │          ├─ monthlyCreditGrant (→ WalletTransaction type=grant, monthly)
  │          ├─ creditDiscountMultiplier (applied to CreditEstimate)
  │          └─ allowedModelIds (→ CapabilityRule check)
  │
  └─ 1:N ─ model_usage_ledger (existing, unchanged)
               │
               └─ records actual model consumption (tokens, model, status)
                  linked FROM WalletTransaction.operationId
                  NOT merged INTO WalletTransaction

SERVER_MODEL_CATALOG (server-side)
  │
  └─ ProductModelCatalogEntry
       ├─ min_plan ──→ CapabilityRule check (unchanged)
       ├─ credit_multiplier ──→ CreditEstimate calculation
       ├─ credit_base_unit ──→ CreditEstimate calculation
       └─ credit_fixed_cost ──→ CreditEstimate calculation (image only)

CreditEstimate (pre-call)
  │
  ├─ calculated from: CreditCost (model metadata)
  ├─ used by: assertSufficientCredits (wallet gate)
  └─ recorded in: WalletTransaction.metadata (post-call)
```

---

## 10. S-3 Readiness Checklist

| Prerequisite | Status |
|-------------|--------|
| WalletTransaction type defined | ✅ |
| WalletBalance type defined | ✅ |
| CreditCost type defined | ✅ |
| CreditEstimate type defined | ✅ |
| WalletGate types (Input, Result, Error) defined | ✅ |
| Grant/Deduction flows designed | ✅ |
| PlanEntitlement repurposed | ✅ |
| CapabilityRule boundary preserved | ✅ |
| ProductModelCatalogEntry extension designed | ✅ |
| WalletRepository interface defined | ✅ |
| Naming boundary rules explicit | ✅ |
| Type relationship diagram complete | ✅ |
| All types align with S-1 canonical vocabulary | ✅ |
| All types align with Owner Final Lock (1, 4, 5, 6) | ✅ |

**S-2 is COMPLETE. S-3 (Wallet Balance Gate Design) is READY.**

---

## No Implementation Performed

This report defines TypeScript interface proposals and naming boundaries. No code has been written to any source file. No Git changes. No Supabase changes. No migrations. No deploys. No file modifications.
