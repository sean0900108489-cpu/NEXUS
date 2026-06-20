# S-1 Execution Report: Deduplication & Naming Boundary Map

**Date:** 2026-06-20  
**Slice:** S-1 — Deduplication & Naming Boundary Map  
**Status:** COMPLETE  
**Method:** Read-only code inspection across 7 source files. No Git changes. No Supabase changes. No code writes.

---

## 1. Duplicate Concept Catalog (10 Pairs, Verified in Code)

Each pair identifies two names/concepts that collide in the current codebase. For each: canonical name, deprecated name, where they appear, and the resolution boundary.

---

### DC-1: Plan vs Wallet

| Field | Value |
|-------|-------|
| **Duplicate pair** | `plan` (spending gate) vs `wallet` (future spending truth) |
| **Canonical name** | `wallet` (per FINAL-LOCK-1) |
| **Deprecated concept** | Plan as spending gate |
| **Surviving concept** | Plan as entitlement layer (capability rules, grant amounts, discounts) |
| **Where plan-as-spending appears** | `plan-config.ts:10-48` — `PRODUCT_PLAN_CONFIG[plan].monthlyPoints` |
| | `quota-gate.ts:16-39` — `assertMonthlyQuotaAvailable()` uses `monthlyPoints` as the hard cap |
| | `ai-gateway-service.ts:70` — calls `assertMonthlyQuotaAvailable` before model call |
| **Where plan-as-entitlement survives** | `model-catalog.ts:271-282` — `canPlanUseModel()` uses `PLAN_RANK` for capability gating (this is correct, NOT part of the duplicate) |
| | `model-catalog.ts:310-328` — `assertModelAllowedForPlan()` checks `min_plan` (correct capability check) |
| **Resolution** | `PRODUCT_PLAN_CONFIG.monthlyPoints` → `monthlyCreditGrant`. `assertMonthlyQuotaAvailable` → `assertSufficientCredits`. Plan keeps `allowedModelIds` and `PLAN_RANK`. |

---

### DC-2: monthlyPoints vs wallet_balance vs monthlyCreditGrant

| Field | Value |
|-------|-------|
| **Duplicate pair** | `monthlyPoints` (hard monthly cap) vs `wallet_balance` (dynamic balance) |
| **Canonical name** | `wallet_balance` (runtime truth), `monthlyCreditGrant` (plan entitlement) |
| **Deprecated concept** | `monthlyPoints` as a hard quota |
| **Where it appears** | `plan-config.ts:36` — `monthlyPoints: 100_000` (Free) |
| | `plan-config.ts:39` — `monthlyPoints: 1_000_000` (Basic) |
| | `plan-config.ts:42` — `monthlyPoints: 5_000_000` (Pro) |
| | `plan-config.ts:45` — `monthlyPoints: 20_000_000` (Team) |
| | `quota-gate.ts:24` — `const monthlyPoints = getPlanConfig(input.plan).monthlyPoints` |
| | `quota-gate.ts:26` — `if (usedPoints + estimatedPoints > monthlyPoints)` |
| | `ai-gateway-service.ts:31` — `usage.chargedPoints: number` (return type still uses "points") |
| **Resolution** | Replace `monthlyPoints` with two concepts: `monthlyCreditGrant` (in plan config, how many credits granted monthly) and `wallet_balance` (runtime, how many credits remaining). Remove hard cap comparison. |

---

### DC-3: quota gate vs wallet balance gate

| Field | Value |
|-------|-------|
| **Duplicate pair** | `assertMonthlyQuotaAvailable` (quota gate) vs `assertSufficientCredits` (wallet gate) |
| **Canonical name** | `assertSufficientCredits` (per FINAL-LOCK-5) |
| **Deprecated concept** | Monthly quota with reset |
| **Where it appears** | `quota-gate.ts:16-39` — entire `assertMonthlyQuotaAvailable` function |
| | `quota-gate.ts:10-14` — `getCurrentMonthUsagePoints` (monthly aggregation) |
| | `quota-gate.ts:47-49` — `getUtcMonthStart` (monthly reset boundary) |
| | `ai-gateway-service.ts:70` — `await assertMonthlyQuotaAvailable(...)` |
| | `image-gen/route.ts:179` — `await assertMonthlyQuotaAvailable(...)` |
| **Resolution** | Rename function to `assertSufficientCredits`. Replace `getCurrentMonthUsagePoints` with `getWalletBalance`. Remove `getUtcMonthStart`. Change error code from `QUOTA_EXCEEDED` to `INSUFFICIENT_CREDITS`. Two integration points: `ai-gateway-service.ts` and `image-gen/route.ts`. |

---

### DC-4: chargedPoints vs credits vs credit_cost

| Field | Value |
|-------|-------|
| **Duplicate pair** | `chargedPoints` (plan-era pricing) vs `credits` (wallet-era pricing) |
| **Canonical name** | `credits` (per FINAL-LOCK-6) |
| **Deprecated concept** | `chargedPoints` as a plan quota unit |
| **Where `chargedPoints` appears** (9 occurrences across 5 files) | |
| | `usage-ledger.ts:14` — `chargedPoints: number` (in UsageLedgerRecord) |
| | `usage-ledger.ts:68` — `record.chargedPoints` (InMemory repo) |
| | `usage-ledger.ts:88` — `charged_points: record.chargedPoints` (Supabase repo) |
| | `usage-ledger.ts:104` — `select("charged_points")` (Supabase query) |
| | `usage-ledger.ts:122` — `export function estimateChargedPoints(totalTokens)` |
| | `plan-config.ts:68-75` — `estimateModelPoints()` uses `MODEL_POINT_MULTIPLIERS` |
| | `ai-gateway-service.ts:26` — `usage: { chargedPoints: number }` (result type) |
| | `ai-gateway-service.ts:90` — `const chargedPoints = estimateModelPoints(...)` |
| | `ai-gateway-service.ts:94` — `chargedPoints` passed to ledger insert |
| | `image-gen/route.ts` — `chargedPoints` in recordImageGenerationUsage |
| **`estimateChargedPoints` vs `estimateModelPoints`** | `usage-ledger.ts:122` has a bare `estimateChargedPoints(totalTokens)` that just divides by 1000. `plan-config.ts:65` has `estimateModelPoints(modelId, totalTokens)` that applies the multiplier. Two estimation functions with overlapping responsibilities. |
| **Resolution** | Rename ALL 9 occurrences of `chargedPoints` → `credits`. Rename `MODEL_POINT_MULTIPLIERS` → `MODEL_CREDIT_MULTIPLIERS`. Rename `estimateModelPoints` → `estimateModelCredits`. Deprecate bare `estimateChargedPoints` in favor of model-aware `estimateModelCredits`. |

---

### DC-5: MODEL_POINT_MULTIPLIERS vs MODEL_CREDIT_MULTIPLIERS

| Field | Value |
|-------|-------|
| **Duplicate pair** | `MODEL_POINT_MULTIPLIERS` (plan-era name) vs `MODEL_CREDIT_MULTIPLIERS` (wallet-era name) |
| **Canonical name** | `MODEL_CREDIT_MULTIPLIERS` |
| **Deprecated concept** | Points as a unit |
| **Where it appears** | `plan-config.ts:49-60` — full multiplier map (10 models, 1×–8×) |
| | `plan-config.ts:69` — `const multiplier = MODEL_POINT_MULTIPLIERS[modelId] ?? 1` |
| | `plan-config.ts:79` — `const multiplier = MODEL_POINT_MULTIPLIERS[input.modelId] ?? 1` |
| **Resolution** | Rename to `MODEL_CREDIT_MULTIPLIERS`. Keep all values unchanged (1×–8×). Keep the map structure. |

---

### DC-6: IMAGE_GENERATION_FIXED_POINTS vs IMAGE_GENERATION_FIXED_CREDITS

| Field | Value |
|-------|-------|
| **Duplicate pair** | `IMAGE_GENERATION_FIXED_POINTS` vs `IMAGE_GENERATION_FIXED_CREDITS` |
| **Canonical name** | `IMAGE_GENERATION_FIXED_CREDITS` |
| **Where it appears** | `plan-config.ts:62-66` — `{ high: 2500, standard: 1000, ultra: 5000 }` |
| | `plan-config.ts:75` — `IMAGE_GENERATION_FIXED_POINTS[input.quality]` |
| **Resolution** | Rename. Keep all values (1000/2500/5000). |

---

### DC-7: QUOTA_EXCEEDED vs INSUFFICIENT_CREDITS

| Field | Value |
|-------|-------|
| **Duplicate pair** | `QUOTA_EXCEEDED` error code vs `INSUFFICIENT_CREDITS` error code |
| **Canonical name** | `INSUFFICIENT_CREDITS` (per FINAL-LOCK-5) |
| **Where it appears** | `quota-gate.ts:28` — `throw new ApiError("QUOTA_EXCEEDED", ...)` |
| **Resolution** | Change error code string. Change message from "Monthly AI usage quota has been reached" to "Insufficient wallet credits." Keep HTTP 402 status. Add `requiredCredits`, `currentBalance`, `shortfall`, `cheaperAlternatives` to error details. |

---

### DC-8: Main Chat vs Workspace Chat

| Field | Value |
|-------|-------|
| **Duplicate pair** | Global/account-level conversation vs workspace-scoped conversation |
| **Canonical names** | `global_conversation` (account-level) vs `workspace_conversation` (workspace-level) |
| **Current ambiguous terms** | `conversationId` appears in `ai-gateway-service.ts` and `usage-ledger.ts` with no account vs workspace distinction |
| **Where ambiguity appears** | `ai-gateway-service.ts:16` — `conversationId?: string` (generic, no scope) |
| | `usage-ledger.ts:8` — `conversationId?: string | null` (generic) |
| | `nexus-types.ts` — no `global_conversations` type exists; all conversation types are workspace-scoped or generic |
| **Resolution** | Create separate types: `GlobalConversation` + `GlobalMessage` for account level. Existing `messages` table and types remain workspace-scoped. Add `conversation_type` discriminator or separate tables. |

---

### DC-9: Usage Record (model_usage_ledger) vs Wallet Record (wallet_transactions)

| Field | Value |
|-------|-------|
| **Duplicate pair** | `UsageLedgerRecord` (model consumption audit) vs `WalletTransaction` (credit change) |
| **Canonical names** | `UsageLedgerRecord` (kept, for model usage audit) + `WalletTransaction` (new, for credit changes) |
| **Deprecated thinking** | Merging both into one table |
| **Where ambiguity exists** | `usage-ledger.ts:6-17` — `UsageLedgerRecord` includes `chargedPoints` (pricing) alongside `inputTokens`/`outputTokens` (usage). This blurs the line between audit and financial record. |
| | `ai-gateway-service.ts:90-108` — ledger insert happens after model call, mixing usage recording with "spend" semantics |
| **Resolution** | Keep `UsageLedgerRecord` for model usage audit (tokens, model, status). Add `WalletTransaction` for credit changes (balance, type, source). Link via `operationId`. Do NOT merge. `chargedPoints` in usage ledger becomes `credits` but remains in the usage table as a cached value for audit convenience — the financial truth lives in `wallet_transactions`. |

---

### DC-10: SERVER_MODEL_CATALOG (backend) vs NEXUS_MODEL_CATALOG (registry) vs New API channels

| Field | Value |
|-------|-------|
| **Duplicate pair** | Three model catalogs with overlapping but different model lists |
| **Where they appear** | `model-catalog.ts:35-52` — `SERVER_MODEL_CATALOG` (10 models, server-side, has `min_plan` + `new_api_model`) |
| | `nexus-registry.ts:232-302` — `NEXUS_MODEL_CATALOG` (20 models, client-side registry, has `capability` + `capabilityProfile`) |
| | New API VPS — 14 enabled models on 3 channels (actual runtime truth) |
| **Drift status** | `SERVER_MODEL_CATALOG` has 10 models. `NEXUS_MODEL_CATALOG` has 20 models (includes gpt-5.5, gpt-5, o4-mini, dall-e-3, imagen-4, sora, runway-gen-3, veo-3, html-css-js — these are NOT in SERVER_MODEL_CATALOG). New API has 14 models (includes deepseek-reasoner, o3, gpt-5.2, gpt-5.5 — these are NOT in SERVER_MODEL_CATALOG). |
| **Resolution** | `SERVER_MODEL_CATALOG` is the authoritative list for pricing + plan gating. `NEXUS_MODEL_CATALOG` is the client-facing registry for model selection UI. New API is the runtime gate. Align `SERVER_MODEL_CATALOG` with New API first (add missing models), then sync `NEXUS_MODEL_CATALOG`. |

---

## 2. Stale Concept Markers (6 Items, Verified in Code/Notion)

### SC-1: V29 cross-reference doc
- **Status:** Already marked stale (commit `ad68497`, V33 R7)
- **Location:** Notion docs (no code reference)
- **Action:** None — already handled

### SC-2: "NOVA as second product" framing
- **Status:** Stale — replaced by "NOVA as NEXUS Knowledge Service" (FINAL-LOCK-3)
- **Location in Notion:** `NEXUS NOVA Integration Research Report 2026-06-19` (originally described NOVA as potential second product)
- **Location in code:** None — NOVA has no independent product code. Four tables in NEXUS Supabase project.
- **Action:** Mark Integration Research Report's "second product" language as superseded by FINAL-LOCK-3.

### SC-3: "Membership upgrade" pricing model
- **Status:** Stale — replaced by wallet credits (FINAL-LOCK-1, FINAL-LOCK-6)
- **Location in code:** `plan-config.ts` — `ProductPlan = "Free" | "Basic" | "Pro" | "Team"` (correct for entitlement, NOT for spending)
- **Location in code:** `model-catalog.ts:16` — `min_plan: UserPlan` on every model (correct for capability gating, still valid)
- **Action:** The membership TIERS survive (Free/Basic/Pro/Team). It's the "membership = spending limit" concept that's stale. Plan tiers become capability + grant tiers only.

### SC-4: Shared NEW_API_KEY pattern
- **Status:** Stale — replaced by per-user token mapping (V33)
- **Location in code:** `image-gen/route.ts:152` — `getServerImageApiKey()` includes fallback `process.env.NEW_API_KEY` — this is the old shared key pattern still present as fallback
- **Location in code:** `image-gen/route.ts` — `resolveImageGenerationApiKey()` returns server key when no per-user token available — stale fallback for non-production path
- **Action:** Mark `getServerImageApiKey()` as deprecated fallback. The production path uses `getUserNewApiToken()` per user. Shared key fallback should be removed when all users are provisioned.

### SC-5: Old agent reports without evidence
- **Status:** Stale — static scans, not live truth
- **Location in Notion:** Handoff Pack sub-pages 03 (Parallel Agent Report Correction), Scan Task Brief child pages
- **Action:** Already noted in Technical Entry Report. No code impact.

### SC-6: V32/V33 mixed references in handoff docs
- **Status:** Stale — current version is V33 with 5 new MCP commits on top
- **Location in Notion:** Handoff Pack references "V33 release hardening" but does not account for the 5 new MCP commits merged today
- **Action:** Update handoff to note V33p3 (MCP tools) as current baseline.

---

## 3. Canonical Vocabulary Reference

This is the binding vocabulary for all future slices (S-2 through S-12). No slice may use deprecated names.

| Domain | Canonical Term | Deprecated Term(s) | Usage Rule |
|--------|---------------|-------------------|------------|
| **Spending truth** | `wallet_balance` | monthlyPoints, quota, plan limit | Wallet is the gate |
| **Spending check** | `assertSufficientCredits` | assertMonthlyQuotaAvailable | Check wallet, not plan |
| **Spending error** | `INSUFFICIENT_CREDITS` | QUOTA_EXCEEDED | 402 with balance details |
| **Spending unit** | `credits` | chargedPoints, points | Wallet pricing unit |
| **Model pricing** | `credit_multiplier` | point multiplier | Per-model credit cost |
| **Image pricing** | `credit_fixed_cost` | image generation fixed points | Per-quality-tier credit cost |
| **Cost estimation** | `estimateModelCredits` | estimateModelPoints | Pre-call credit estimate |
| **Entitlement layer** | `plan` (capability + grant) | plan (spending limit) | Plan = grants + rules |
| **Monthly grant** | `monthlyCreditGrant` | monthlyPoints | Amount granted, not cap |
| **Capability gate** | `canPlanUseModel` | (keep, correct) | Model access by plan tier |
| **Usage audit** | `model_usage_ledger` | (keep, correct) | Records model consumption |
| **Credit changes** | `wallet_transaction` | (new) | Records credit changes |
| **Account chat** | `global_conversation` | (new) | Account-level chat |
| **Workspace chat** | `workspace_conversation` | messages (workspace-scoped) | Workspace-level chat |
| **Chat import** | `imported_from_global_chat_id` | (new) | Copy provenance |
| **NOVA ownership** | `workspace_id` | user_id (for NOVA) | Per FINAL-LOCK-3 |

---

## 4. Rename Map (Code-Level, Read-Only)

Exact token-for-token rename pairs for when implementation is authorized. NOT to be applied now.

| File | Current Token | Replacement Token | Line(s) |
|------|--------------|-------------------|---------|
| `plan-config.ts` | `MODEL_POINT_MULTIPLIERS` | `MODEL_CREDIT_MULTIPLIERS` | 49, 69, 79 |
| `plan-config.ts` | `IMAGE_GENERATION_FIXED_POINTS` | `IMAGE_GENERATION_FIXED_CREDITS` | 62, 75 |
| `plan-config.ts` | `monthlyPoints` (in config) | `monthlyCreditGrant` | 36, 39, 42, 45 |
| `plan-config.ts` | `estimateModelPoints` | `estimateModelCredits` | 65 |
| `plan-config.ts` | `estimateImageGenerationPoints` | `estimateImageGenerationCredits` | 72 |
| `quota-gate.ts` | `getCurrentMonthUsagePoints` | `getWalletBalance` (new semantics) | 10 |
| `quota-gate.ts` | `assertMonthlyQuotaAvailable` | `assertSufficientCredits` | 16 |
| `quota-gate.ts` | `"QUOTA_EXCEEDED"` | `"INSUFFICIENT_CREDITS"` | 28 |
| `quota-gate.ts` | `monthlyPoints` (local var) | (derived from wallet_balance) | 24-26 |
| `quota-gate.ts` | `getUtcMonthStart` | (remove — no monthly reset) | 47-49 |
| `quota-gate.ts` | `estimatedPoints` (param) | `estimatedCredits` | 17 |
| `quota-gate.ts` | `usedPoints` (local var) | `currentBalance` | 21 |
| `usage-ledger.ts` | `chargedPoints` (field) | `credits` | 14, 68, 88 |
| `usage-ledger.ts` | `charged_points` (Supabase col) | `credits` | 88, 104 |
| `usage-ledger.ts` | `sumChargedPointsForUserSince` | `sumCreditsForUserSince` | 24, 64, 100 |
| `usage-ledger.ts` | `estimateChargedPoints` | (deprecate, use `estimateModelCredits`) | 122 |
| `ai-gateway-service.ts` | `chargedPoints` (in result type) | `credits` | 26 |
| `ai-gateway-service.ts` | `chargedPoints` (local var) | `credits` | 90, 94 |
| `ai-gateway-service.ts` | `assertMonthlyQuotaAvailable` | `assertSufficientCredits` | 70 |
| `model-catalog.ts` | `min_plan` (on model entry) | (keep — capability rule, correct) | 16, 40-52 |
| `image-gen/route.ts` | `chargedPoints` | `credits` | multiple |
| `image-gen/route.ts` | `assertMonthlyQuotaAvailable` | `assertSufficientCredits` | 179 |

---

## 5. Canonical Model Catalog Alignment Status

Which models exist where, and which catalog is authoritative for pricing:

| Model ID | SERVER_MODEL_CATALOG (pricing) | NEXUS_MODEL_CATALOG (UI) | New API (runtime) |
|----------|:---:|:---:|:---:|
| gpt-4o-mini | ✅ Free, 1× | ✅ | ✅ |
| deepseek-chat | ✅ Free, 1× | ✅ | ✅ |
| deepseek-v4-flash | ✅ Basic, 1× | ✅ | ✅ |
| deepseek-v4-pro | ✅ Pro, 3× | ✅ | ✅ |
| gpt-4o | ✅ Basic, 5× | ✅ | ✅ |
| gemini-2.5-flash | ✅ Basic, 1× | — | — |
| gemini-2.5-pro | ✅ Pro, 6× | ✅ | — |
| claude-sonnet-4 | ✅ Pro, 8× | ✅ | — |
| img2/gpt-image-2 | ✅ Basic, 1× | ✅ (as gpt-image-1) | ✅ |
| riverflow-v2.5-fast | ✅ Free, 1× | — | ✅ |
| gpt-5.5 | — | ✅ | ✅ (New API) |
| gpt-5 | — | ✅ | — |
| gpt-4.1 | — | ✅ | — |
| o4-mini | — | ✅ | — |
| o3 | — | — | ✅ (New API) |
| deepseek-reasoner | — | — | ✅ (New API) |
| gpt-5.2 | — | — | ✅ (New API) |
| dall-e-3 | — | ✅ | — |
| imagen-4 | — | ✅ | — |
| sora | — | ✅ | — |

**Key finding:** `SERVER_MODEL_CATALOG` is the pricing authority (has multipliers + plan tiers). `NEXUS_MODEL_CATALOG` is the UI registry (has capability profiles + display labels). New API is runtime truth. Three catalogs are NOT synchronized — this is the DC-10 drift.

---

## 6. Forbidden Resolution Actions

The following are documented for future implementation but MUST NOT be done now:

- ❌ Do not rename any variable in any source file
- ❌ Do not change any error code string
- ❌ Do not add `@deprecated` annotations to code
- ❌ Do not create new files for canonical types
- ❌ Do not modify `SERVER_MODEL_CATALOG`, `NEXUS_MODEL_CATALOG`, or any registry
- ❌ Do not delete `getUtcMonthStart`, `getCurrentMonthUsagePoints`, or any function
- ❌ Do not create `global_conversations` or `wallet_transactions` types in code

---

## 7. S-2 Readiness Checklist

| Prerequisite | Status |
|-------------|--------|
| 10 duplicate pairs cataloged with code locations | ✅ |
| 6 stale concepts identified | ✅ |
| Canonical vocabulary table complete | ✅ |
| Rename map with exact file:line references | ✅ |
| Model catalog alignment status charted | ✅ |
| All 7 source files inspected | ✅ |
| No code modified | ✅ |

**S-1 is COMPLETE. S-2 (Wallet Vocabulary & Type Definitions) is READY.**

---

## No Implementation Performed

This report catalogs duplicate concepts and canonical vocabulary. No code has been renamed, deleted, or modified. No migrations. No deploys. No Supabase changes.
