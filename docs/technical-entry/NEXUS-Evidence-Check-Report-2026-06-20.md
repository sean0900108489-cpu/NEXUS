# NEXUS Evidence Check Report: Quota Gate & Pricing Readiness for Wallet

**Date:** 2026-06-20
**Based on:** Owner Decision Review D-13, D-14
**Scope:** Read-only inspection of 5 source files. No code changes. No Supabase changes. No migration.
**Sources inspected:**
- `src/app/api/chat/route.ts` — chat entry point
- `src/lib/backend/models/ai-gateway-service.ts` — AI gateway orchestrator
- `src/lib/backend/models/quota-gate.ts` — quota enforcement
- `src/lib/backend/models/plan-config.ts` — plan config + pricing
- `src/lib/backend/models/usage-ledger.ts` — usage recording
- `src/lib/backend/models/model-catalog.ts` — SERVER_MODEL_CATALOG
- `src/app/api/image-gen/route.ts` — image generation route
- `src/lib/models/model-catalog-types.ts` — public-facing catalog types

---

## Q1: Can the current quota gate be converted to a wallet balance gate?

### What the quota gate does today

The gate lives in `quota-gate.ts` and is called by `ai-gateway-service.ts` (line ~70):

```
estimatePoints → assertMonthlyQuotaAvailable → if (usedPoints + estimatedPoints > monthlyPoints) → throw QUOTA_EXCEEDED (402)
```

**Key characteristics:**
- **Monthly reset:** `getUtcMonthStart(now)` — usage resets on the 1st of each month UTC. This is a plan quota pattern, not a wallet pattern.
- **Hard block:** `throw new ApiError("QUOTA_EXCEEDED", ..., 402)` — no fallback, no downgrade, no prompt. Just a hard 402.
- **Per-user:** `userId` is the scope. Usage is summed per user from `model_usage_ledger`.
- **Pre-estimate:** Points are estimated BEFORE the model call (character-count heuristic `estimateMessageTokens` → `estimateModelPoints`). The gate checks "would this request exceed quota?" before spending anything.
- **Called from two places:** `ai-gateway-service.ts` (chat) and `image-gen/route.ts` (image). Both use the same `assertMonthlyQuotaAvailable` function.

### Conversion assessment: YES, structurally convertible

The gate's architecture is already wallet-shaped:

| Quota Gate Concept | Wallet Equivalent | Status |
|-------------------|-------------------|--------|
| `sumChargedPointsForUserSince(since, userId)` | `getWalletBalance(userId)` | One query change |
| `monthlyPoints` (from plan config) | `wallet_balance` (from wallet table) | One data source change |
| `usedPoints + estimatedPoints > monthlyPoints` | `wallet_balance - estimatedCost < 0` | Same arithmetic, different variable names |
| `QUOTA_EXCEEDED` 402 error | `INSUFFICIENT_CREDITS` 402 error | Rename only |
| Pre-estimate before spend | Pre-estimate before spend | Identical pattern |

**What needs to change (not implementation, just design):**

1. **Remove monthly reset** — wallet doesn't reset monthly. Remove `getUtcMonthStart()` logic. `sumChargedPointsForUserSince` becomes `sumChargedPointsForUser` (all-time, or since last top-up).
2. **Change data source** — `getPlanConfig(plan).monthlyPoints` → `getWalletBalance(userId)`. The wallet balance is derived from `wallet_transactions` sum, not from a static config constant.
3. **Keep the pre-estimate** — the pattern of "estimate cost before calling model" is correct for wallet. Keep it.
4. **Add deduction after success** — currently, points are only recorded in `model_usage_ledger` AFTER the call succeeds. For wallet, the deduction must be atomic with the call. Recommend: reserve → call → commit/release pattern. (The current code already records 0 points on failure — see `ai-gateway-service.ts` line ~130 — which is wallet-compatible.)

### Verdict: The gate is wallet-ready structurally. The monthly reset is the main thing to remove.

---

## Q2: Can `chargedPoints` serve as the v1 basis for wallet pricing?

### What chargedPoints is today

`chargedPoints` is calculated at two levels:

**A. Per-model point estimation** (`plan-config.ts`):

```
estimateModelPoints(modelId, totalTokens):
  tokenUnits = ceil(totalTokens / 1000)       // 1 point per 1000 tokens base
  multiplier = MODEL_POINT_MULTIPLIERS[modelId] ?? 1  // model-specific multiplier
  return tokenUnits * multiplier
```

`MODEL_POINT_MULTIPLIERS` (10 models):

| Model | Multiplier | Rough cost profile |
|-------|-----------|-------------------|
| gpt-4o-mini | 1× | Cheapest |
| deepseek-chat | 1× | Cheapest |
| deepseek-v4-flash | 1× | Cheap |
| riverflow-v2.5-fast | 1× | Cheap |
| img2 | 1× | Cheap (fixed points override) |
| deepseek-v4-pro | 3× | Mid |
| gpt-4o | 5× | Mid-high |
| gemini-2.5-flash | 1× | Cheap |
| gemini-2.5-pro | 6× | High |
| claude-sonnet-4 | 8× | Most expensive |

**B. Image generation fixed points** (`plan-config.ts`):

```
estimateImageGenerationPoints({ modelId, quality }):
  qualityPoints = IMAGE_GENERATION_FIXED_POINTS[quality]  // standard:1000, high:2500, ultra:5000
  multiplier = MODEL_POINT_MULTIPLIERS[modelId] ?? 1
  return qualityPoints * multiplier
```

**C. Recorded in `model_usage_ledger`** (`usage-ledger.ts`):

Each usage row stores `chargedPoints` as an integer. The `sumChargedPointsForUserSince` function sums these for quota checks.

### Assessment: YES, but needs renaming and conceptual cleanup

**What works as wallet pricing:**

- The multiplier system is sensible and proportional. Claude (8×) costs more than GPT-4o-mini (1×). This is good.
- The fixed-point system for images is sensible — images have no "tokens" so a fixed cost per quality tier is the right model.
- The pre-estimate-before-call pattern is correct for wallet.
- Both chat and image-gen routes already use the same pricing functions — unified pricing is already in place.

**What needs to change (design only):**

1. **Rename `chargedPoints` → `credits`:** Points are a plan artifact. Credits are a wallet artifact. Same math, different name.
2. **`MODEL_POINT_MULTIPLIERS` → `MODEL_CREDIT_MULTIPLIERS`:** Keep the values. Rename the concept.
3. **`IMAGE_GENERATION_FIXED_POINTS` → `IMAGE_GENERATION_FIXED_CREDITS`:** Same values. Rename.
4. **Base unit reconsideration:** Currently 1 credit per 1000 tokens at 1× multiplier. For wallet, consider whether the base unit feels right to end users. 1000 tokens = 1 credit is very granular. The owner may want a different scale (e.g., 1 credit = $0.01 worth of compute). This is a product decision, not a technical one.
5. **Add operation-type differentiation:** Currently, all operations use the same pricing function. Wallet should distinguish: `chat_completion`, `image_generation`, `nova_retrieval`, `tool_execution`, `workflow_run` — each with potentially different pricing models.

### Verdict: `chargedPoints` is a solid v1 basis. Rename to `credits`. Keep the multiplier system. Add operation-type dimension later.

---

## Q3: Where is it plan quota, and where is it already wallet-like?

### Plan quota patterns (must change for wallet)

| Pattern | Location | Description |
|---------|----------|-------------|
| Monthly reset | `quota-gate.ts:getUtcMonthStart()` | Usage resets on 1st of month. Wallet doesn't reset. |
| Static monthly cap | `plan-config.ts:PRODUCT_PLAN_CONFIG[plan].monthlyPoints` | 100K/1M/5M/20M — hardcoded per plan. Wallet is dynamic. |
| Plan-tier gating | `model-catalog.ts:canPlanUseModel(plan, model)` | Model access gated by `PLAN_RANK[plan] >= PLAN_RANK[model.min_plan]`. This is a capability rule — it CAN stay. |
| Plan-derived from env | `plan-config.ts:getUserPlan()` | Plan comes from `NEXUS_USER_PLAN_OVERRIDES` env var or `NEXUS_DEFAULT_PLAN`. Wallet balance comes from DB. |
| `min_plan` on every model | `model-catalog.ts:SERVER_MODEL_CATALOG[].min_plan` | Determines which plan tier can use a model. For wallet, this should become `min_plan` (capability gate) separate from credit cost. |

### Wallet-like patterns (already aligned)

| Pattern | Location | Description |
|---------|----------|-------------|
| Per-operation cost estimation | `plan-config.ts:estimateModelPoints()`, `estimateImageGenerationPoints()` | Already computes cost per operation. Wallet-ready. |
| Pre-call gate | `quota-gate.ts:assertMonthlyQuotaAvailable()` | Already checks "can user afford this?" before calling. Wallet-ready (just change data source). |
| Usage ledger with per-record cost | `usage-ledger.ts:UsageLedgerRecord.chargedPoints` | Every usage is individually recorded with its cost. Wallet-ready. |
| Success/failure dual recording | `ai-gateway-service.ts` lines ~100-130 | Failed calls record 0 points; succeeded calls record actual cost. Wallet-compatible. |
| Per-user scope | `quota-gate.ts`, `usage-ledger.ts` — all keyed by `userId` | Wallet is user-scoped. This aligns. |
| Multiple source types | `usage-ledger.ts` — `sourceType: "operator_chat"` and `"image_workflow"` | Already distinguishes consumption types. Can extend to `nova_retrieval`, `tool_execution`, etc. |
| Server-side pricing only | `plan-config.ts` — multipliers are server-only, not in public catalog | Wallet pricing is server-side. This is correct security posture. |
| Public catalog has no pricing | `model-catalog-types.ts:PublicModelCatalogEntry` — no `chargedPoints` or cost field exposed to client | Clients see model metadata, not pricing. Good for wallet too. |

### Key insight: The system is about 60% wallet-ready already.

The core architecture (pre-estimate → gate → execute → record) is the wallet pattern. The monthly reset and static plan config are the plan-quota residue that needs removal.

---

## Q4: What new concepts are needed? (No migration — design vocabulary only)

### Concepts that must be added to the codebase vocabulary

| New Concept | Description | Relationship to existing |
|-------------|-------------|------------------------|
| `wallet_balance` | User's current credit balance. Derived from sum of `wallet_transactions`. | Replaces `monthlyPoints` as the gate reference. |
| `wallet_transaction` | Immutable record of a credit change: grant, deduction, refund, adjustment. | New table. `model_usage_ledger` records *what was consumed*; `wallet_transaction` records *how credits changed*. Linked but not merged. |
| `credit_cost` | How many credits an operation costs. Rename of `chargedPoints`. | Replaces `chargedPoints` everywhere. Same math, different name. |
| `credit_grant` | Credits given to a user: initial grant, monthly grant, manual adjustment, promo. | New concept. Replaces the implicit "monthly reset" pattern. |
| `credit_deduction` | Credits removed from balance for an operation. | New concept. The "spend" side of the wallet. Already partially captured by `model_usage_ledger.chargedPoints`. |
| `wallet_balance_gate` | Check: does user have enough credits for this operation? | Replaces `assertMonthlyQuotaAvailable`. Same pattern, different data source. |
| `operation_type` | What kind of consumption: chat, image, retrieval, tool, workflow. | Extends `sourceType` which already exists (`"operator_chat"`, `"image_workflow"`). |
| `reserve/commit/release` | Atomic credit flow: reserve before call, commit on success, release on failure. | New pattern. Current code records 0 on failure — this is a compatible starting point. |
| `plan_entitlement` | What a plan provides: monthly credit grant, capability rules, discount multiplier, concurrency limits. | Repurposed from current plan config. `allowedModelIds` stays; `monthlyPoints` becomes `monthlyCreditGrant`. |
| `capability_rule` | Whether a plan allows access to a model/feature. | Already exists as `min_plan` + `PLAN_RANK`. Keep this. |

### Concepts that must NOT be added

- **Do NOT add** `wallet_tier` or `wallet_plan` — wallet is not a membership system.
- **Do NOT add** `wallet_monthly_reset` — wallet doesn't reset.
- **Do NOT add** `wallet_quota` — quota is a plan concept. Wallet has balance, not quota.
- **Do NOT merge** `wallet_transactions` into `model_usage_ledger` — they are different domains (financial truth vs usage audit).

---

## Summary Table

| Question | Answer | Confidence |
|----------|--------|------------|
| Can quota gate convert to wallet balance gate? | **Yes** — structurally identical. Remove monthly reset. Change data source from `planConfig.monthlyPoints` to `walletBalance`. | High |
| Can chargedPoints be v1 wallet pricing? | **Yes** — multiplier system is sensible. Rename to credits. Keep values. Add operation-type dimension later. | High |
| How much is already wallet-like? | **~60%** — pre-estimate, gate, record pattern is wallet-ready. Monthly reset and static config are plan residue. | High |
| New concepts needed | 10 new vocabulary items. 4 things explicitly NOT to add. All design-level, no migration. | High |

---

## Recommendation for D-13 (Insufficient Balance Behavior)

Based on code inspection: the current quota gate throws a hard `QUOTA_EXCEEDED` 402 error with no fallback. For wallet, the owner must decide:

- **Option A — Hard block (like current):** Return 402. User sees "Insufficient credits" and must top up. Simplest. Aligns with pay-as-you-go model.
- **Option B — Downgrade model:** If wallet can't afford gpt-4o (5× multiplier), auto-fallback to gpt-4o-mini (1× multiplier). Better UX but complex — the model must be in the user's capability set AND affordable.
- **Option C — Prompt top-up:** Return 402 with a top-up UI deeplink. User can add credits inline without leaving the chat.

**Pending owner decision.** The code is ready for any of these — the gate just needs to change its error response.

---

## Recommendation for D-14 (Pricing Model)

Based on code inspection: `MODEL_POINT_MULTIPLIERS` is a clean, proportional system. Recommendation:

- **Keep the multiplier approach** for v1 wallet. Values (1× to 8×) are sensible relative to actual model API costs.
- **Rename** but don't restructure: `chargedPoints` → `credits`, `MODEL_POINT_MULTIPLIERS` → `MODEL_CREDIT_MULTIPLIERS`.
- **Defer** operation-type pricing (different credit costs for chat vs image vs retrieval) until wallet v2.
- **Defer** the base unit decision (1 credit = how much real-world value?) to owner.

**Pending owner decision.** The technical foundation is ready.

---

## No Implementation Yet

This report is a read-only code inspection. No files modified. No migrations written. No Supabase queries executed against live data (Supabase MCP was unavailable — all evidence from GitHub source code). No deployments triggered.
