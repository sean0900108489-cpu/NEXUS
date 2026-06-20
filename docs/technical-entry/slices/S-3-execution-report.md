# S-3 Execution Report: Wallet Balance Gate Design

**Date:** 2026-06-20
**Slice:** S-3 — Wallet Balance Gate Design
**Status:** COMPLETE
**Predecessors:** S-1 (Deduplication), S-2 (Wallet Types), S-2 Addendum (Balance derivation + linkage clarification)
**Owner Locks:** FINAL-LOCK-1 (Wallet replaces Plan), FINAL-LOCK-5 (Hard block + top-up prompt)
**Method:** Read-only design. No code writes. No Git changes. No Supabase changes.

---

## Purpose

Design `assertSufficientCredits` — the wallet balance gate that replaces `assertMonthlyQuotaAvailable`. Define: pre-estimate flow, balance check logic, 402 insufficient credits contract, integration points in chat and image routes, failure path, and the boundary between usage ledger recording and wallet transaction deduction.

---

## 1. Current Gate: What Gets Replaced

### 1.1 Current Function: `assertMonthlyQuotaAvailable`

**Location:** `src/lib/backend/models/quota-gate.ts:16-39`

```
Input:
  estimatedPoints: number       (pre-call estimate from estimateModelPoints)
  ledger: UsageLedgerRepository
  plan: ProductPlan
  userId: string

Logic:
  1. usedPoints = sum of chargedPoints since month start
  2. monthlyPoints = PRODUCT_PLAN_CONFIG[plan].monthlyPoints
  3. IF usedPoints + estimatedPoints > monthlyPoints → throw QUOTA_EXCEEDED (402)
  4. Return { estimatedPoints, monthlyPoints, remainingAfterEstimate, usedPoints }

Monthly reset: getUtcMonthStart(now) — resets on 1st of each month
Error: "QUOTA_EXCEEDED" with message about plan limit
```

### 1.2 Current Integration Points

**Chat route:** `ai-gateway-service.ts:70`
```
await assertMonthlyQuotaAvailable({
  estimatedPoints: estimateModelPoints(model.id, estimateMessageTokens(messages)),
  ledger,
  plan,
  userId,
});
```
Called AFTER model capability check (`assertModelAllowedForPlan`), BEFORE New API token fetch and model call.

**Image route:** `src/app/api/image-gen/route.ts:179`
```
await assertMonthlyQuotaAvailable({
  estimatedPoints,
  ledger: createUsageLedgerRepository(),
  plan,
  userId,
});
```
Called AFTER model validation, BEFORE token fetch and adapter execution.

---

## 2. Target Gate: `assertSufficientCredits`

### 2.1 Function Contract

```
Function: assertSufficientCredits
Replaces: assertMonthlyQuotaAvailable (quota-gate.ts)
File location (future): src/lib/backend/models/quota-gate.ts (same file, new function)

Input:
  estimatedCredits: number        (from estimateModelCredits / estimateImageCredits)
  userId: string
  modelId: string
  plan: UserPlan                  (for cheaper alternatives lookup only — NOT for spending check)
  walletRepo: WalletRepository    (new — replaces UsageLedgerRepository reference)

Output (success):
  {
    currentBalance: number,           // wallet balance before deduction
    remainingAfterDeduction: number,  // balance - estimatedCredits
    estimatedCredits: number          // same as input, for transparency
  }

Output (failure):
  throws ApiError("INSUFFICIENT_CREDITS", 402) with {
    requiredCredits,
    currentBalance,
    shortfall,
    modelId,
    cheaperAlternatives: [{ modelId, estimatedCredits, label }]
  }
```

### 2.2 Gate Logic (Pseudocode)

```
async function assertSufficientCredits(input: {
  estimatedCredits: number;
  userId: string;
  modelId: string;
  plan: UserPlan;
  walletRepo: WalletRepository;
}): Promise<{ currentBalance: number; remainingAfterDeduction: number; estimatedCredits: number }> {

  // Step 1: Get current wallet balance
  // Source of truth: SUM(wallet_transactions.amount) WHERE status = 'completed'
  // Per S-2 Addendum A: derived read model, NOT directly writable
  const walletBalance = await walletRepo.getBalance(input.userId);
  const currentBalance = walletBalance.currentBalance;

  // Step 2: Ensure estimate is positive
  const estimatedCredits = Math.max(1, Math.ceil(input.estimatedCredits));

  // Step 3: Check affordability
  if (currentBalance < estimatedCredits) {
    // Step 3a: Find cheaper alternatives the user CAN afford
    const cheaperAlternatives = await findCheaperAlternatives({
      currentModelId: input.modelId,
      plan: input.plan,
      walletBalance: currentBalance,
    });

    // Step 3b: Throw 402 with full context
    throw new ApiError(
      "INSUFFICIENT_CREDITS",
      "Insufficient wallet credits for this operation. Top up or select a lower-cost model.",
      402,
      {
        requiredCredits: estimatedCredits,
        currentBalance,
        shortfall: estimatedCredits - currentBalance,
        modelId: input.modelId,
        cheaperAlternatives,
      }
    );
  }

  // Step 4: Operation is affordable
  return {
    currentBalance,
    remainingAfterDeduction: currentBalance - estimatedCredits,
    estimatedCredits,
  };
}
```

### 2.3 Cheaper Alternatives Logic

```
async function findCheaperAlternatives(input: {
  currentModelId: string;
  plan: UserPlan;
  walletBalance: number;
}): Promise<Array<{ modelId: string; estimatedCredits: number; label: string }>> {

  // Step 1: Get all models the user can access (capability check — uses plan, not wallet)
  const allowedModels = getAllowedModelCatalogForPlan(input.plan);
  
  // Step 2: For each model, estimate credit cost for the same operation
  // Use a standardized token estimate (e.g., 1000 tokens) for comparison
  const candidates = allowedModels
    .filter(m => m.id !== input.currentModelId)  // exclude the requested model
    .filter(m => m.enabled)
    .map(m => ({
      modelId: m.id,
      label: m.label,
      estimatedCredits: estimateModelCredits(m.id, 1000),  // standardized estimate
    }))
    .filter(c => c.estimatedCredits <= input.walletBalance);  // user CAN afford

  // Step 3: Sort by cheapest first, return top 3
  return candidates
    .sort((a, b) => a.estimatedCredits - b.estimatedCredits)
    .slice(0, 3);
}
```

---

## 3. Integration Points

### 3.1 Chat Route Integration (`ai-gateway-service.ts`)

**Current code (line 62-76):**
```
const plan = getUserPlan({ request: input.request, userId });
const model = assertModelAllowedForPlan(modelId, plan);
// ... capability checks ...
await assertMonthlyQuotaAvailable({          // ← REPLACE THIS CALL
  estimatedPoints: estimateModelPoints(model.id, estimateMessageTokens(messages)),
  ledger,
  plan,
  userId,
});
const userNewApiToken = await getUserNewApiToken({ userId });
const result = await callNewApiChatCompletion(...);
const chargedPoints = estimateModelPoints(model.id, result.totalTokens);
await ledger.insert({ chargedPoints, ... });  // usage ledger record
```

**Target code (design only):**
```
const plan = getUserPlan({ request: input.request, userId });
const model = assertModelAllowedForPlan(modelId, plan);
// ... capability checks (unchanged) ...

// NEW: Wallet balance gate replaces monthly quota gate
const creditEstimate = estimateChatCredits({
  modelId: model.id,
  estimatedTokens: estimateMessageTokens(messages),
});
const gateResult = await assertSufficientCredits({   // ← REPLACES assertMonthlyQuotaAvailable
  estimatedCredits: creditEstimate.estimatedCredits,
  userId,
  modelId: model.id,
  plan,
  walletRepo: createWalletRepository(),              // ← NEW repository
});

const userNewApiToken = await getUserNewApiToken({ userId });
const result = await callNewApiChatCompletion(...);

// USAGE LEDGER: records model consumption (existing pattern, unchanged conceptually)
// Renamed: chargedPoints → credits
const actualCredits = estimateModelCredits(model.id, result.totalTokens);
await ledger.insert({
  credits: actualCredits,                            // ← renamed from chargedPoints
  conversationId,
  errorCode: null,
  inputTokens: result.inputTokens,
  modelId: model.id,
  newApiModel: model.new_api_model,
  operatorId,
  outputTokens: result.outputTokens,
  providerFamily: model.provider_family,
  requestId: input.requestId,
  sourceType: "operator_chat",
  status: "succeeded",
  totalTokens: result.totalTokens,
  userId,
});

// WALLET DEDUCTION: records credit consumption
// Linked to usage ledger row via operationId/requestId/usageLedgerId
// EXACT COLUMN NAME DEFERRED per S-2 Addendum B
await walletRepo.createTransaction({
  userId,
  type: "deduction",
  source: "chat_completion",
  amount: -actualCredits,
  operationId: /* TBD after Supabase validation */,
  metadata: { modelId: model.id, requestId: input.requestId },
});

// Return result with credit usage
return {
  content: result.content,
  modelId: model.id,
  requestId: input.requestId,
  usage: {
    credits: actualCredits,                          // ← renamed from chargedPoints
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    totalTokens: result.totalTokens,
  },
};
```

### 3.2 Image Route Integration (`image-gen/route.ts`)

**Current code (lines 172-188, `assertImageGenerationProductGate`):**
```
const estimatedPoints = estimateImageGenerationPoints({
  modelId: model.id,
  quality: imageSettings.quality,
});
await assertMonthlyQuotaAvailable({          // ← REPLACE THIS CALL
  estimatedPoints,
  ledger: createUsageLedgerRepository(),
  plan,
  userId,
});
```

**Target code (design only):**
```
const creditEstimate = estimateImageCredits({
  modelId: model.id,
  quality: imageSettings.quality,
});
const gateResult = await assertSufficientCredits({   // ← REPLACES assertMonthlyQuotaAvailable
  estimatedCredits: creditEstimate.estimatedCredits,
  userId,
  modelId: model.id,
  plan,
  walletRepo: createWalletRepository(),              // ← NEW repository
});

// After successful image generation:
// 1. recordImageGenerationUsage → model_usage_ledger (existing pattern, rename chargedPoints→credits)
// 2. walletRepo.createTransaction → wallet_transactions (new, deduction)
//    Linkage column deferred per S-2 Addendum B
```

---

## 4. Failure Path

### 4.1 Gate Failure (Insufficient Credits)

```
Request arrives → auth → plan capability check → credit estimation → assertSufficientCredits

IF gate throws INSUFFICIENT_CREDITS:
  1. ✗ NO model call made (credits not consumed)
  2. ✗ NO usage ledger record (no operation occurred)
  3. ✗ NO wallet deduction (no credits spent)
  4. ✓ 402 response returned to client with:
     - requiredCredits, currentBalance, shortfall
     - modelId the user requested
     - cheaperAlternatives the user CAN afford
  5. ✓ Client renders top-up prompt OR model selector with cheaper options

IF gate succeeds but model call fails:
  1. model_usage_ledger records status="failed", credits=0 (existing pattern)
  2. NO wallet deduction (credits not consumed for failed operations)
  3. Error returned to client
```

### 4.2 Boundary: When Credits Are Actually Deducted

```
Timeline:
  t0: pre-estimate credit cost
  t1: assertSufficientCredits (gate check) — PASSES, balance >= estimatedCredits
  t2: call model API
  t3: on SUCCESS → insert model_usage_ledger (credits=actualCredits)
                 → insert wallet_transaction (amount=-actualCredits, type=deduction)
                 → balance decreases
  t4: on FAILURE → insert model_usage_ledger (credits=0, status=failed)
                 → NO wallet_transaction inserted
                 → balance unchanged

Key: Credits are deducted ONLY after a successful model call.
     The gate check is a pre-authorization, not a deduction.
     Balance may decrease between gate check and deduction (concurrent operations).
     This is acceptable for Phase 1 — the estimated cost is close to actual cost.
     Future: reserve/commit/release pattern for precise deduction.
```

---

## 5. Usage Ledger vs Wallet Transaction Boundary

### 5.1 Two Separate Records, One Operation

| Aspect | `model_usage_ledger` | `wallet_transactions` |
|--------|---------------------|----------------------|
| **Purpose** | Audit: what model was called, how many tokens | Financial: how many credits were deducted |
| **Inserted on** | Every operation (success + failure) | Success only |
| **Key fields** | modelId, inputTokens, outputTokens, totalTokens, credits, status | type, source, amount, balanceAfter |
| **Status values** | succeeded, failed | completed, reversed |
| **Credit field** | `credits` (cached for convenience) | `amount` (negative for deduction, authoritative) |
| **Linkage** | Has `id`, `requestId` | Has `operationId` (→ model_usage_ledger.id or requestId) |
| **Deletable** | No (audit trail) | No (immutable, only reversible via new transaction) |

### 5.2 Why They Are Separate

1. **Audit vs financial truth:** Usage ledger answers "what happened?" Wallet transaction answers "what did it cost and how did the balance change?"
2. **Failure handling:** Usage ledger records failed operations (for debugging). Wallet never deducts for failures.
3. **Future operations:** Tool runs, workflow runs, CLI/MCP will also record to both tables. A merged table would conflate different operation types.
4. **Reconciliation:** Wallet balance = SUM(wallet_transactions.amount). This MUST be independently verifiable without parsing usage ledger rows.

### 5.3 What They Share

Both tables:
- Are per-user (scoped to `userId`)
- Are immutable (insert-only, except for reversal via new transaction)
- Have a `createdAt` timestamp
- Link to each other via `operationId` / `requestId`

---

## 6. 402 Error Response Contract

### 6.1 HTTP Response

```
HTTP 402 Payment Required
Content-Type: application/json

{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Insufficient wallet credits for this operation. Top up or select a lower-cost model.",
    "retryable": false,
    "details": {
      "requiredCredits": 150,
      "currentBalance": 42,
      "shortfall": 108,
      "modelId": "gpt-4o",
      "cheaperAlternatives": [
        {
          "modelId": "gpt-4o-mini",
          "estimatedCredits": 30,
          "label": "GPT-4o Mini"
        },
        {
          "modelId": "deepseek-chat",
          "estimatedCredits": 15,
          "label": "DeepSeek Chat"
        }
      ]
    }
  },
  "requestId": "req_abc123"
}
```

### 6.2 Field Specifications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `error.code` | `"INSUFFICIENT_CREDITS"` | Yes | Immutable error code |
| `error.message` | string | Yes | Human-readable, no secrets |
| `error.retryable` | `false` | Yes | Never retryable without credit change |
| `details.requiredCredits` | number | Yes | Credits needed for this operation |
| `details.currentBalance` | number | Yes | User's current wallet balance |
| `details.shortfall` | number | Yes | `requiredCredits - currentBalance` |
| `details.modelId` | string | Yes | The model the user requested |
| `details.cheaperAlternatives` | array | Yes | 0-3 models user CAN afford |
| `details.cheaperAlternatives[].modelId` | string | Yes | Model ID for selection |
| `details.cheaperAlternatives[].estimatedCredits` | number | Yes | Estimated cost for this model |
| `details.cheaperAlternatives[].label` | string | Yes | Display name |

---

## 7. Migration Path from Old Gate to New Gate

### 7.1 Transition Strategy

```
Phase 1 (design — THIS SLICE):
  assertSufficientCredits designed alongside assertMonthlyQuotaAvailable
  Both functions coexist in quota-gate.ts
  No code changes — design only

Phase 2 (implementation — future, when authorized):
  assertSufficientCredits implemented with WalletRepository
  assertMonthlyQuotaAvailable marked @deprecated
  Both callable — feature flag controls which gate is active
  Dual-running for validation period

Phase 3 (cutover — future):
  assertMonthlyQuotaAvailable removed
  assertSufficientCredits is the only gate
  Plan config repurposed to PlanEntitlement (monthlyPoints → monthlyCreditGrant)
```

### 7.2 Coexistence Contract

During the transition, both functions exist. The active gate is determined by:

```
const useWalletGate = featureFlag("wallet_balance_gate") ?? false;

if (useWalletGate) {
  await assertSufficientCredits({ ... });
} else {
  await assertMonthlyQuotaAvailable({ ... });
}
```

---

## 8. Forbidden Actions (This Slice and Future)

| Action | Status | Reason |
|--------|--------|--------|
| Modify `quota-gate.ts` | ❌ | No code writes |
| Modify `ai-gateway-service.ts` | ❌ | No code writes |
| Modify `image-gen/route.ts` | ❌ | No code writes |
| Create `WalletRepository` implementation | ❌ | No code writes — interface only |
| Create `wallet_balances` table | ❌ | No DDL |
| Create `wallet_transactions` table | ❌ | No DDL |
| Add `getBalance` implementation | ❌ | No code writes |
| Add `findCheaperAlternatives` implementation | ❌ | No code writes |
| Remove `assertMonthlyQuotaAvailable` | ❌ | Coexist during transition |
| Change error code in live code | ❌ | `QUOTA_EXCEEDED` stays until cutover |

---

## 9. S-4 / S-5 Readiness

| Prerequisite | Status |
|-------------|--------|
| Gate function contract defined (input/output/error) | ✅ |
| Gate logic pseudocode complete | ✅ |
| Cheaper alternatives logic defined | ✅ |
| Chat route integration point designed | ✅ |
| Image route integration point designed | ✅ |
| Failure path defined (gate failure + API failure) | ✅ |
| Usage ledger vs wallet transaction boundary explicit | ✅ |
| 402 error contract complete with field specifications | ✅ |
| Migration path (coexistence → cutover) defined | ✅ |
| S-2 Addendum rules applied (balance derivation, deferred linkage) | ✅ |

**S-3 is COMPLETE. S-4 (Credit Pricing Metadata) and S-5 (Grant Transaction Flow) are READY.**

---

## No Implementation Performed

Design only. No code written. No Git changes. No Supabase changes. No migrations. No deploys. No wallet tables created. Quota gate not modified.
