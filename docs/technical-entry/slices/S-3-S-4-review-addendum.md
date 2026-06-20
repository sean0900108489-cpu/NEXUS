# S-3/S-4 Review Addendum 2026-06-20

**Date:** 2026-06-20
**Appends to:** S-3 Execution Report (Wallet Balance Gate Design), S-4 Execution Report (Credit Pricing Metadata)
**Status:** Owner review corrections. No code changes.
**Precedes:** Supabase Authority Re-validation → S-5 (Grant Transaction Flow)

---

## 1. S-3: Integration Surface Is Incomplete

### Issue

S-3 documented two integration points for `assertSufficientCredits`:
1. `ai-gateway-service.ts:70` — chat route
2. `image-gen/route.ts:179` — image route

These are the **primary** billable entry points, but they are not the **complete** integration surface. The wallet gate must also be considered at every code path that triggers an AI model call with credit consumption.

### Complete Integration Surface (Design Audit)

| Route / Service | File | Currently Gated? | Wallet Gate Needed? |
|----------------|------|:---:|:---:|
| `/api/chat` | `ai-gateway-service.ts` | ✅ `assertMonthlyQuotaAvailable` | ✅ Replace with `assertSufficientCredits` |
| `/api/image-gen` | `image-gen/route.ts` | ✅ `assertMonthlyQuotaAvailable` | ✅ Replace with `assertSufficientCredits` |
| `/api/v1/agents/[agentId]/stream` | `agent-stream` route | ⚠️ Whitelisted (not blocked per VPS report) | ✅ Must add gate — agent streaming consumes model calls |
| `/api/agent-stream` | `agent-stream` (legacy) | ⚠️ Whitelisted | ✅ Must add gate |
| `/api/workflow-pro/brain-draft` | `workflow-pro` route | ❓ Unknown | ⚠️ Likely — workflow drafts may trigger model calls |
| `/api/memory-compress` | `memory-compress` route | ❌ Blocked (per VPS report) | N/A — blocked, no gate needed currently |
| `/api/tools/fs-scanner` | `tools` route | ❌ Blocked | N/A — blocked |
| `/api/tools/web-surfer` | `tools` route | ❌ Blocked | N/A — blocked |
| `/api/predictive-intel` | `predictive-intel` route | ❌ Blocked | N/A — blocked |
| `/api/v1/providers/verify` | provider verify | ❌ Blocked | N/A — blocked |

### Correction

The S-3 design scope is correct for **Phase 1 wallet**: chat + image are the only active billable paths. Agent streaming is whitelisted but should be audited for wallet integration before going live.

**What S-3 should say:** "The two primary integration points (chat + image) cover all currently active billable routes. Agent streaming routes are whitelisted and MUST be audited for wallet gate integration before production. Blocked routes (memory-compress, tools, predictive-intel) require no gate until unblocked."

---

## 2. S-3: Gate Failure Is Preflight Rejection — Cannot Be Recorded as Failed Usage

### Issue

The current `ai-gateway-service.ts` catch block (lines ~115-140) records a failed `model_usage_ledger` row for ANY error, including permission denials and validation failures:

```typescript
} catch (error) {
    const apiError = toApiError(error);
    if (userId && operatorId && modelId) {
      const model = getCatalogModel(modelId);
      await ledger.insert({
        chargedPoints: 0,
        conversationId,
        errorCode: apiError.code,
        // ... records failed usage
      }).catch(() => undefined);
    }
    throw apiError;
}
```

This catch-all would record a failed usage row for `INSUFFICIENT_CREDITS` — a gate rejection where NO model call was made, NO tokens were consumed, and NO provider was contacted. This is incorrect.

### Correction

**`INSUFFICIENT_CREDITS` gate failure is preflight rejection.** It occurs before any API call. It must NOT result in a `model_usage_ledger` row, even with `status: "failed"` and `credits: 0`.

The implementation (when authorized) must distinguish between:

| Failure Type | model_usage_ledger? | wallet_transaction? | Description |
|-------------|:---:|:---:|-------------|
| Gate rejection (INSUFFICIENT_CREDITS) | ❌ Never | ❌ Never | Preflight — no model call attempted |
| Capability denial (PERMISSION_DENIED) | ❌ Never | ❌ Never | Preflight — wrong plan tier |
| Validation failure (VALIDATION_FAILED) | ❌ Never | ❌ Never | Preflight — bad input |
| Provider failure (PROVIDER_TIMEOUT) | ✅ status=failed, credits=0 | ❌ Never | Model call attempted but failed |
| Provider success | ✅ status=succeeded | ✅ deduction | Model call succeeded |

**Implementation hazard:** The current catch-all in `ai-gateway-service.ts` does NOT distinguish these. When `assertSufficientCredits` is integrated, the catch block must check error code and skip ledger insert for preflight errors. Otherwise, every 402 will pollute the usage ledger with phantom failed rows.

**S-3 documentation should state:** "Gate failure is preflight rejection. No model_usage_ledger row. No wallet_transaction. The catch block in ai-gateway-service.ts must skip ledger insert for INSUFFICIENT_CREDITS, PERMISSION_DENIED, and VALIDATION_FAILED error codes."

---

## 3. S-3: Negative Balance Is Not Proven Impossible

### Issue

The S-3 Addendum stated: "A negative balance guard clause will prevent wallet_balances.currentBalance from going below 0 even if a race occurs."

This statement implies negative balance is impossible. It is not — at least not without transaction-level atomicity that does not exist in the current design.

### Correction

**Phase 1 accepts the race risk.** The wallet gate does NOT reserve credits. It does NOT lock the balance row. Two concurrent operations can both pass the gate, both complete, and together deduct more than the balance. The negative balance guard is a **safety net**, not a **proof of impossibility**.

**Correct language:**

> "Concurrent race is accepted as a known Phase 1 limitation. The gate performs a non-locking balance read. Two concurrent operations from the same user may both pass the gate and together deduct more than the balance. A negative balance guard (clamping to 0 on deduction) is a safety net, not a transactional guarantee. Do not claim negative balance is impossible until the deduction path is transactionally enforced (e.g., `SELECT ... FOR UPDATE` on the balance row, or a reservation/commit/release pattern)."

**Future phases:** When wallet is live with real users and concurrent API access:
- Phase 2: Add `SELECT ... FOR UPDATE` row lock on `wallet_balances` during deduction
- Phase 3: Add reservation pattern (reserve estimated credits → commit actual or release)

---

## 4. S-4: `gpt-image-2` Is an `img2` Mapping Resolution, Not a Separate New Model

### Issue

S-4 listed `gpt-image-2` alongside `gpt-5.5`, `o3`, `deepseek-reasoner`, and `gpt-5.2` as "4 new models from New API to be added to SERVER_MODEL_CATALOG." This conflates a name mapping mismatch with genuinely new models.

### Correction

**`gpt-image-2` is the `new_api_model` value already assigned to `img2` in `SERVER_MODEL_CATALOG`:**

```typescript
// model-catalog.ts — CURRENT
{
  id: "img2",
  label: "GPT Image 2",
  new_api_model: "gpt-image-2",   // ← already mapped
  // ...
}
```

The `img2` entry in SERVER_MODEL_CATALOG already has `new_api_model: "gpt-image-2"`. This is a **working mapping** — the NEXUS model ID is `img2`, the New API channel routes it as `gpt-image-2`. The additional complication is `NEXUS_MODEL_CATALOG` which lists it as `gpt-image-1` — three names for the same model.

**Correct classification:**

| Model | Classification | Action |
|-------|---------------|--------|
| `gpt-image-2` | **Name mapping resolution** — same model as `img2`, different IDs across catalogs | Unify IDs: pick one canonical `id` for SERVER_MODEL_CATALOG, keep `new_api_model` mapping, fix NEXUS_MODEL_CATALOG label |
| `gpt-5.5-2026-04-23` | **New model** — in New API, not in SERVER_MODEL_CATALOG | Add to SERVER_MODEL_CATALOG with owner-approved pricing |
| `o3` | **New model** — in New API, not in SERVER_MODEL_CATALOG | Add with owner-approved pricing |
| `deepseek-reasoner` | **New model** — in New API, not in SERVER_MODEL_CATALOG | Add with owner-approved pricing |
| `gpt-5.2` | **New model** — in New API, not in SERVER_MODEL_CATALOG | Add with owner-approved pricing |

**S-4 should state:** "`gpt-image-2` is NOT a separate new model. It is the `new_api_model` value for the existing `img2` entry. The name discrepancy (`img2` vs `gpt-image-2` vs `gpt-image-1`) across the three catalogs is a naming cleanup issue, not a pricing gap."

---

## 5. S-4: New Model Pricing Must Be Pending Owner — Not Defaulted

### Issue

S-4 assigned suggested `credit_multiplier` values (10×, 12×, 3×, 8×) and `min_plan: "Pro"` to the 4 genuinely new models. While marked as "placeholder," the language could be read as a recommendation for implementation.

### Correction

**All pricing for models not currently in `SERVER_MODEL_CATALOG` is STRICTLY pending owner approval.** Specifically:

- `gpt-5.5-2026-04-23`: Must not default to Free or Basic tier. Multiplier must be owner-assigned. The 10× suggestion is a placeholder only.
- `o3`: Highest-cost reasoning model. Must not be accessible to Free/Basic without explicit owner authorization. The 12× suggestion is a placeholder only.
- `deepseek-reasoner`: The 3× suggestion (matching deepseek-v4-pro) is a placeholder only.
- `gpt-5.2`: The 8× suggestion (matching claude-sonnet-4) is a placeholder only.

**No new model should be `enabled: true` in SERVER_MODEL_CATALOG until owner confirms pricing and tier.** The safe default for unimplemented models is `enabled: false`.

---

## 6. Updated Slice Status

| Slice | Status | Notes |
|-------|--------|-------|
| S-0 | ✅ PASSED | Supabase re-validation needed |
| S-1 | ✅ PASSED | |
| S-2 | ✅ PASSED | + Addendum (balance derivation, linkage clarification) |
| S-3 | ✅ PASSED with addendum | + Addendum A (pre-auth not reservation). + This addendum (integration surface, preflight rejection, race risk) |
| S-4 | ✅ PASSED with notes | + This addendum (gpt-image-2 classification, new model pricing pending owner) |
| S-5 | ⛔ NOT YET AUTHORIZED | Requires Supabase authority re-validation first |

---

## No Implementation Performed

Review corrections only. No code written. No Git changes. No Supabase changes.
