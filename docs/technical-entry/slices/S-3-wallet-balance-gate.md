# S-3: Wallet Balance Gate Design

**Phase:** C (Wallet Technical Entry)
**Depends on:** S-2 (Wallet vocabulary & types defined)
**Owner Locks:** FINAL-LOCK-1, FINAL-LOCK-5
**Status:** Design only — no implementation authorized

## Objective
Design the wallet balance gate that replaces the monthly quota gate. Define the check-before-call pattern, the 402 error contract, and the integration points with existing `ai-gateway-service.ts` and `image-gen/route.ts`.

## Code Domains Touched (Design Reference Only)
- `src/lib/backend/models/quota-gate.ts` — current gate (to be redesigned)
- `src/lib/backend/models/ai-gateway-service.ts` — chat gateway (integration point)
- `src/app/api/image-gen/route.ts` — image gateway (integration point)
- `src/lib/backend/models/usage-ledger.ts` — usage recording (kept, linked to wallet)

## Data Domains Touched (Design Reference Only)
- Supabase `model_usage_ledger` — consumption records (persisted, not replaced)
- Future `wallet_balances` — credit balances (design only, no table creation)
- Future `wallet_transactions` — credit changes (design only, no table creation)

## What This Slice Designs

### 3.1 Balance Gate Function Contract (Pseudocode)

```
async function assertSufficientCredits(input: {
  estimatedCredits: number;       // from estimateModelCredits()
  userId: string;
  modelId: string;
  plan: ProductPlan;              // retained for capability check (not spending)
}): Promise<{
  currentBalance: number;
  remainingAfterEstimate: number;
  estimatedCredits: number;
}> | throws InsufficientCreditsError

Logic:
  1. walletBalance = await getWalletBalance(userId)
  2. IF walletBalance < estimatedCredits:
       cheaperModels = findCheaperAlternatives(modelId, plan, walletBalance)
       throw InsufficientCreditsError({
         requiredCredits: estimatedCredits,
         currentBalance: walletBalance,
         shortfall: estimatedCredits - walletBalance,
         modelId,
         cheaperAlternatives
       })
  3. Return { currentBalance, remainingAfterEstimate, estimatedCredits }
```

### 3.2 Integration Point: ai-gateway-service.ts

Current flow (line ~70 of ai-gateway-service.ts):
```
getUserPlan → assertModelAllowedForPlan → assertRequestedFeaturesAllowed 
→ assertMonthlyQuotaAvailable → getUserNewApiToken → callNewApiChatCompletion 
→ ledger.insert
```

Target flow (design only):
```
getUserPlan → assertModelAllowedForPlan → assertRequestedFeaturesAllowed 
→ assertSufficientCredits [NEW — replaces assertMonthlyQuotaAvailable]
→ getUserNewApiToken → callNewApiChatCompletion 
→ ledger.insert (model_usage_ledger) 
→ recordDeduction (wallet_transaction) [NEW]
```

### 3.3 Integration Point: image-gen/route.ts

Current flow (line ~150 of image-gen/route.ts):
```
assertImageGenerationProductGate → assertMonthlyQuotaAvailable 
→ getImageGenerationNewApiToken → adapter.execute → recordImageGenerationUsage
```

Target flow (design only):
```
assertImageGenerationProductGate 
→ assertSufficientCredits [NEW — replaces assertMonthlyQuotaAvailable]
→ getImageGenerationNewApiToken → adapter.execute 
→ recordImageGenerationUsage (model_usage_ledger)
→ recordDeduction (wallet_transaction) [NEW]
```

### 3.4 Cheaper Alternatives Logic (Design)

```
function findCheaperAlternatives(
  requestedModelId: string,
  plan: ProductPlan,
  walletBalance: number
): { modelId: string; estimatedCredits: number }[] {
  // Get all models user can access (plan capability check)
  // Estimate credits for each
  // Filter to models where walletBalance >= estimatedCredits
  // Sort by estimatedCredits ascending
  // Return top 3
}
```

### 3.5 402 Error Response Contract

```
HTTP 402 Payment Required
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Insufficient wallet credits for this operation.",
    "retryable": false,
    "details": {
      "requiredCredits": 150,
      "currentBalance": 42,
      "shortfall": 108,
      "modelId": "gpt-4o",
      "cheaperAlternatives": [
        { "modelId": "gpt-4o-mini", "estimatedCredits": 30 },
        { "modelId": "deepseek-chat", "estimatedCredits": 15 }
      ]
    }
  },
  "requestId": "req_..."
}
```

## Validation Method
- Balance gate function contract is unambiguous (inputs, outputs, error conditions)
- Integration points identified in both chat and image routes
- 402 error contract is complete (all required fields per FINAL-LOCK-5)
- Cheaper alternatives logic defined
- No conflict with existing `assertMonthlyQuotaAvailable` — new function, old preserved for transition

## Forbidden Areas
- Do not create wallet_balances table
- Do not create wallet_transactions table
- Do not modify quota-gate.ts, ai-gateway-service.ts, or image-gen/route.ts
- Do not add getWalletBalance() implementation — only the function contract
- Do not remove assertMonthlyQuotaAvailable

## Dependency Order
After S-2 (types defined). Before any slice that integrates wallet gate.

## Rollback / No-Op Validation
Only a design document produced. No code changed. No state changed.
