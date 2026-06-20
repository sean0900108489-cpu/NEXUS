# S-4 Execution Report: Credit Pricing Metadata Extension

**Date:** 2026-06-20
**Slice:** S-4 — Credit Pricing Metadata Extension
**Status:** COMPLETE
**Predecessors:** S-1 (Deduplication — DC-10 model catalog drift), S-2 (Wallet Types — CreditCost), S-3 (Balance Gate — estimation integration)
**Owner Locks:** FINAL-LOCK-6 (chargedPoints as credit foundation)
**Method:** Read-only design. No code writes. No Git changes. No Supabase changes.

---

## Purpose

Design the extension of `SERVER_MODEL_CATALOG` to carry wallet credit pricing metadata. Address the triple-catalog drift (SERVER_MODEL_CATALOG vs NEXUS_MODEL_CATALOG vs New API). Define the public/private pricing boundary. Produce the complete `chargedPoints → credits` rename plan with exact token-for-token mappings.

---

## 1. Triple-Catalog Drift Analysis

### 1.1 The Three Catalogs

| Catalog | Location | Models | Purpose | Authority |
|---------|----------|--------|---------|-----------|
| **SERVER_MODEL_CATALOG** | `model-catalog.ts:35-52` | 10 | Server-side pricing + plan gating | **Pricing authority** |
| **NEXUS_MODEL_CATALOG** | `nexus-registry.ts:232-302` | 20 | Client-side model selector UI + capability profiles | Display registry |
| **New API** | VPS `170.64.201.54` / SQLite | 14 | Runtime model routing | **Runtime truth** |

### 1.2 Full Drift Matrix

| Model ID | SERVER_MODEL_CATALOG | NEXUS_MODEL_CATALOG | New API | Drift Type |
|----------|:---:|:---:|:---:|------------|
| gpt-4o-mini | ✅ Free, 1× | ✅ | ✅ | **ALIGNED** |
| deepseek-chat | ✅ Free, 1× | ✅ | ✅ | **ALIGNED** |
| deepseek-v4-flash | ✅ Basic, 1× | ✅ | ✅ | **ALIGNED** |
| deepseek-v4-pro | ✅ Pro, 3× | ✅ | ✅ | **ALIGNED** |
| gpt-4o | ✅ Basic, 5× | ✅ | ✅ | **ALIGNED** |
| gemini-2.5-flash | ✅ Basic, 1× | — | — | NEXUS catalog missing |
| gemini-2.5-pro | ✅ Pro, 6× | ✅ | — | New API missing |
| claude-sonnet-4 | ✅ Pro, 8× | ✅ | — | New API missing |
| img2 (gpt-image-2) | ✅ Basic, 1× | ✅ (as gpt-image-1) | ✅ | Name mismatch |
| riverflow-v2.5-fast | ✅ Free, 1× | — | ✅ | NEXUS catalog missing |
| gpt-5.5 | — | ✅ | ✅ (New API) | SERVER catalog missing |
| gpt-5 | — | ✅ | — | NEXUS-only (unavailable) |
| gpt-4.1 | — | ✅ | — | NEXUS-only (unavailable) |
| o4-mini | — | ✅ | — | NEXUS-only (unavailable) |
| o3 | — | — | ✅ (New API) | New API only |
| deepseek-reasoner | — | — | ✅ (New API) | New API only |
| gpt-5.2 | — | — | ✅ (New API) | New API only |
| dall-e-3 | — | ✅ | — | NEXUS-only (unavailable) |
| imagen-4 | — | ✅ | — | NEXUS-only (unavailable) |
| sora | — | ✅ | — | NEXUS-only (video, N/A) |
| runway-gen-3 | — | ✅ | — | NEXUS-only (video, N/A) |
| veo-3 | — | ✅ | — | NEXUS-only (video, N/A) |
| html-css-js | — | ✅ | — | NEXUS-only (sandbox, local) |

### 1.3 Drift Summary

| Drift Category | Count | Models |
|---------------|-------|--------|
| **Fully aligned** (all 3 catalogs) | 5 | gpt-4o-mini, deepseek-chat, deepseek-v4-flash, deepseek-v4-pro, gpt-4o |
| **SERVER has, New API missing** | 3 | gemini-2.5-flash, gemini-2.5-pro, claude-sonnet-4 |
| **New API has, SERVER missing** | 4 | gpt-5.5, o3, deepseek-reasoner, gpt-5.2 |
| **Name mismatch** (same model, different ID) | 1 | img2 ↔ gpt-image-2, gpt-image-1 (NEXUS catalog) |
| **NEXUS-only, not in SERVER or New API** | 6 | gpt-5, gpt-4.1, o4-mini, dall-e-3, imagen-4, sora |
| **SERVER has, NEXUS missing** | 2 | gemini-2.5-flash, riverflow-v2.5-fast |
| **New API has, NEXUS + SERVER missing** | 3 | o3, deepseek-reasoner, gpt-5.2 |

### 1.4 Alignment Strategy (Design, Not Implementation)

**Phase 1 alignment principle:** `SERVER_MODEL_CATALOG` is the pricing authority. Only models in this catalog have defined `credit_multiplier`, `min_plan`, and can be called through the NEXUS API gateway. Models in other catalogs but not in SERVER_MODEL_CATALOG are either unavailable (not in New API) or un-priced (in New API but no multiplier).

**Alignment order (when implementation authorized):**

1. **Add New API-available models to SERVER_MODEL_CATALOG** — gpt-5.5, o3, deepseek-reasoner, gpt-5.2. Assign `min_plan` and `credit_multiplier` values. This makes them callable through the wallet gate.
2. **Remove New API-absent models from SERVER_MODEL_CATALOG** — gemini-2.5-flash, gemini-2.5-pro, claude-sonnet-4 (or keep as disabled, pending New API channel addition). If kept, `enabled: false` so they don't appear in selectors.
3. **Sync NEXUS_MODEL_CATALOG** — add missing SERVER models. Mark unavailable models with appropriate status. Remove video/sandbox models from chat context.
4. **Fix name mismatch** — unify `img2` / `gpt-image-2` / `gpt-image-1` to a single canonical ID.

---

## 2. Extended SERVER_MODEL_CATALOG Design

### 2.1 New Fields on ProductModelCatalogEntry

```typescript
// DESIGN ONLY — extension of model-catalog.ts ProductModelCatalogEntry
// Current type at model-catalog.ts:24-41

export interface ProductModelCatalogEntry {
  // --- EXISTING FIELDS (unchanged) ---
  id: string;
  label: string;
  modality: ModelModality;             // "chat" | "image"
  provider_family: ModelProviderFamily;
  new_api_model: string;
  description: string;
  best_for: string[];
  min_plan: UserPlan;                  // CAPABILITY rule (kept — not a pricing field)
  supports_reasoning: boolean;
  supports_vision: boolean;
  supports_tools: boolean;
  supports_long_context?: boolean;
  default_max_tokens: number;
  max_output_tokens: number;
  enabled: boolean;

  // --- NEW: wallet pricing metadata (3 fields) ---
  
  /** How credits are counted for this model.
   *  "per_1k_tokens" — credits = ceil(tokens / 1000) * credit_multiplier
   *  "per_image"     — credits = credit_fixed_cost * credit_multiplier
   */
  credit_base_unit: CreditBaseUnit;      // REQUIRED

  /** Per-model credit cost multiplier. 
   *  Values: 1–8. Preserved from MODEL_POINT_MULTIPLIERS.
   *  Applied after base unit calculation.
   */
  credit_multiplier: number;             // REQUIRED

  /** Fixed credit cost for image models. 
   *  NULL for chat models (cost is per-token, not fixed).
   *  Values preserved from IMAGE_GENERATION_FIXED_POINTS.
   */
  credit_fixed_cost?: number | null;     // NULL for chat, number for image
}
```

### 2.2 Complete SERVER_MODEL_CATALOG with Pricing (18 Models — Aligned)

```
DESIGN ONLY — not to be written to code

SERVER_MODEL_CATALOG (aligned):
[
  // === CHAT MODELS (credit_base_unit: "per_1k_tokens") ===
  
  {
    id: "gpt-4o-mini",               label: "GPT-4o Mini",
    modality: "chat",                provider_family: "OpenAI",
    new_api_model: "gpt-4o-mini",    min_plan: "Free",
    credit_base_unit: "per_1k_tokens", credit_multiplier: 1,
    enabled: true,
  },
  {
    id: "deepseek-chat",             label: "DeepSeek Chat",
    modality: "chat",                provider_family: "DeepSeek",
    new_api_model: "deepseek-chat",  min_plan: "Free",
    credit_base_unit: "per_1k_tokens", credit_multiplier: 1,
    enabled: true,
  },
  {
    id: "deepseek-v4-flash",         label: "DeepSeek V4 Flash",
    modality: "chat",                provider_family: "DeepSeek",
    new_api_model: "deepseek-v4-flash", min_plan: "Basic",
    credit_base_unit: "per_1k_tokens", credit_multiplier: 1,
    enabled: true,
  },
  {
    id: "deepseek-v4-pro",           label: "DeepSeek V4 Pro",
    modality: "chat",                provider_family: "DeepSeek",
    new_api_model: "deepseek-v4-pro", min_plan: "Pro",
    credit_base_unit: "per_1k_tokens", credit_multiplier: 3,
    enabled: true,
  },
  {
    id: "gpt-4o",                    label: "GPT-4o",
    modality: "chat",                provider_family: "OpenAI",
    new_api_model: "gpt-4o",         min_plan: "Basic",
    credit_base_unit: "per_1k_tokens", credit_multiplier: 5,
    enabled: true,
  },
  
  // --- Models in SERVER but NOT in New API (marked disabled) ---
  
  {
    id: "gemini-2.5-flash",          label: "Gemini 2.5 Flash",
    modality: "chat",                provider_family: "Gemini",
    new_api_model: "gemini-2.5-flash", min_plan: "Basic",
    credit_base_unit: "per_1k_tokens", credit_multiplier: 1,
    enabled: false,                  // ← DISABLED: not available in New API
    // REASON: New API has no Gemini channel. Enable when channel added.
  },
  {
    id: "gemini-2.5-pro",            label: "Gemini 2.5 Pro",
    modality: "chat",                provider_family: "Gemini",
    new_api_model: "gemini-2.5-pro", min_plan: "Pro",
    credit_base_unit: "per_1k_tokens", credit_multiplier: 6,
    enabled: false,                  // ← DISABLED: not available in New API
  },
  {
    id: "claude-sonnet-4-20250514",  label: "Claude Sonnet 4",
    modality: "chat",                provider_family: "Claude",
    new_api_model: "claude-sonnet-4-20250514", min_plan: "Pro",
    credit_base_unit: "per_1k_tokens", credit_multiplier: 8,
    enabled: false,                  // ← DISABLED: not available in New API
  },
  
  // --- Models in New API but NOT in SERVER (NEW — to be added) ---
  
  {
    id: "gpt-5.5",                   label: "GPT-5.5",
    modality: "chat",                provider_family: "OpenAI",
    new_api_model: "gpt-5.5",        min_plan: "Pro",       // TBD by owner
    credit_base_unit: "per_1k_tokens", credit_multiplier: 10, // TBD by owner
    enabled: true,                   // Available in New API
  },
  {
    id: "o3",                        label: "o3",
    modality: "chat",                provider_family: "OpenAI",
    new_api_model: "o3",             min_plan: "Pro",       // TBD by owner
    credit_base_unit: "per_1k_tokens", credit_multiplier: 12, // TBD by owner
    enabled: true,                   // Available in New API
  },
  {
    id: "deepseek-reasoner",         label: "DeepSeek Reasoner",
    modality: "chat",                provider_family: "DeepSeek",
    new_api_model: "deepseek-reasoner", min_plan: "Pro",   // TBD by owner
    credit_base_unit: "per_1k_tokens", credit_multiplier: 3, // TBD by owner
    enabled: true,                   // Available in New API
  },
  {
    id: "gpt-5.2",                   label: "GPT-5.2",
    modality: "chat",                provider_family: "OpenAI",
    new_api_model: "gpt-5.2",        min_plan: "Pro",       // TBD by owner
    credit_base_unit: "per_1k_tokens", credit_multiplier: 8, // TBD by owner
    enabled: true,                   // Available in New API
  },
  
  // === IMAGE MODELS (credit_base_unit: "per_image") ===
  
  {
    id: "img2",                      label: "GPT Image 2",
    modality: "image",               provider_family: "OpenAI",
    new_api_model: "gpt-image-2",    min_plan: "Basic",
    credit_base_unit: "per_image",    credit_multiplier: 1,
    credit_fixed_cost: 1000,         // standard quality (high: 2500, ultra: 5000)
    enabled: true,
  },
  {
    id: "riverflow-v2.5-fast",       label: "Riverflow v2.5 Fast",
    modality: "image",               provider_family: "Gemini",
    new_api_model: "sourceful/riverflow-v2.5-fast", min_plan: "Free",
    credit_base_unit: "per_image",    credit_multiplier: 1,
    credit_fixed_cost: 1000,
    enabled: true,
  },
]
```

### 2.3 Models with Pending Owner Decisions

These 4 models are in New API but NOT in SERVER_MODEL_CATALOG. Their pricing (`min_plan`, `credit_multiplier`) requires owner decision:

| Model | New API Channel | Suggested min_plan | Suggested multiplier | Rationale |
|-------|----------------|-------------------|---------------------|-----------|
| gpt-5.5 | OpenAI-General | Pro | 10× | Premium model, above gpt-4o (5×) |
| o3 | OpenAI-General | Pro | 12× | Reasoning model, highest cost |
| deepseek-reasoner | DeepSeek | Pro | 3× | Same as deepseek-v4-pro |
| gpt-5.2 | OpenAI-General | Pro | 8× | Comparable to claude-sonnet-4 (8×) |

**Status:** PENDING OWNER. Until decided, these models are designed as `enabled: true` with placeholder `min_plan` and `credit_multiplier`. The owner must confirm or override before implementation.

---

## 3. Public / Private Catalog Boundary

### 3.1 What Goes Where

| Data | SERVER_MODEL_CATALOG (private) | PublicModelCatalogEntry (public) | Rationale |
|------|:---:|:---:|-----------|
| id, label, description | ✅ | ✅ | Display metadata — safe to expose |
| modality, provider_family | ✅ | ✅ | Selection metadata — safe |
| min_plan | ✅ | ✅ | Already exposed — capability tier |
| supports_* (reasoning, vision, tools, long_context) | ✅ | ✅ | Already exposed — feature flags |
| default_max_tokens, max_output_tokens | ✅ | ✅ | Already exposed — limits |
| enabled | ✅ | ✅ | Already exposed — availability |
| best_for | ✅ | ✅ | Already exposed — descriptions |
| new_api_model | ✅ | ❌ | **Internal** — maps to provider model ID |
| credit_base_unit | ✅ | ❌ | **Pricing** — server-side only |
| credit_multiplier | ✅ | ❌ | **Pricing** — must not leak to client |
| credit_fixed_cost | ✅ | ❌ | **Pricing** — must not leak to client |

### 3.2 Current `toPublicModelCatalogEntry` Function

```typescript
// model-catalog.ts — CURRENT, unchanged by this design
export function toPublicModelCatalogEntry(
  model: ProductModelCatalogEntry
): PublicModelCatalogEntry {
  return {
    best_for: model.best_for,
    default_max_tokens: model.default_max_tokens,
    description: model.description,
    enabled: model.enabled,
    id: model.id,
    label: model.label,
    max_output_tokens: model.max_output_tokens,
    min_plan: model.min_plan,
    modality: model.modality,
    provider_family: model.provider_family,
    supports_long_context: model.supports_long_context,
    supports_reasoning: model.supports_reasoning,
    supports_tools: model.supports_tools,
    supports_vision: model.supports_vision,
  };
}
```

**This function already correctly strips pricing fields.** The extended `ProductModelCatalogEntry` with `credit_base_unit`, `credit_multiplier`, and `credit_fixed_cost` would NOT be leaked by this function — it only copies the fields defined in `PublicModelCatalogEntry`. No change needed.

### 3.3 PublicModelCatalogEntry (Unchanged)

```typescript
// model-catalog-types.ts — UNCHANGED by this design
export type PublicModelCatalogEntry = {
  id: string;
  label: string;
  modality: PublicModelModality;
  provider_family: PublicModelProviderFamily;
  description: string;
  best_for: string[];
  min_plan: PublicUserPlan;
  supports_reasoning: boolean;
  supports_vision: boolean;
  supports_tools: boolean;
  supports_long_context?: boolean;
  default_max_tokens: number;
  max_output_tokens: number;
  enabled: boolean;
};

// NOTE: No pricing fields. This is CORRECT and must NOT change.
// Credit pricing is server-side only. The client never sees credit_multiplier.
```

---

## 4. Estimation Function Rename Plan

### 4.1 Complete Rename Map

| File | Current Function/Constant | New Name | Action |
|------|--------------------------|----------|--------|
| `plan-config.ts:49` | `MODEL_POINT_MULTIPLIERS` | `MODEL_CREDIT_MULTIPLIERS` | Rename constant, keep values |
| `plan-config.ts:62` | `IMAGE_GENERATION_FIXED_POINTS` | `IMAGE_GENERATION_FIXED_CREDITS` | Rename constant, keep values |
| `plan-config.ts:65` | `estimateModelPoints(modelId, totalTokens)` | `estimateModelCredits(modelId, totalTokens)` | Rename function, keep formula |
| `plan-config.ts:72` | `estimateImageGenerationPoints({modelId, quality})` | `estimateImageGenerationCredits({modelId, quality})` | Rename function, keep formula |
| `usage-ledger.ts:122` | `estimateChargedPoints(totalTokens)` | **DEPRECATE** — use `estimateModelCredits` instead | Remove bare function |
| `plan-config.ts:7` | `monthlyPoints: number` | `monthlyCreditGrant: number` | Rename field in ProductPlanConfig |
| `plan-config.ts:36,39,42,45` | `monthlyPoints: 100_000` (etc.) | `monthlyCreditGrant: 100_000` (etc.) | Rename values |

### 4.2 Formula Preservation

The estimation formulas do NOT change — only the names change:

```
CURRENT:
  estimateModelPoints(modelId, totalTokens):
    tokenUnits = ceil(totalTokens / 1000)
    multiplier = MODEL_POINT_MULTIPLIERS[modelId] ?? 1
    return tokenUnits * multiplier

TARGET:
  estimateModelCredits(modelId, totalTokens):
    tokenUnits = ceil(totalTokens / 1000)
    multiplier = MODEL_CREDIT_MULTIPLIERS[modelId] ?? 1    // ← renamed
    return tokenUnits * multiplier                          // same formula

CURRENT:
  estimateImageGenerationPoints({ modelId, quality }):
    qualityPoints = IMAGE_GENERATION_FIXED_POINTS[quality] ?? standard
    multiplier = MODEL_POINT_MULTIPLIERS[modelId] ?? 1
    return qualityPoints * multiplier

TARGET:
  estimateImageGenerationCredits({ modelId, quality }):
    qualityCredits = IMAGE_GENERATION_FIXED_CREDITS[quality] ?? standard  // ← renamed
    multiplier = MODEL_CREDIT_MULTIPLIERS[modelId] ?? 1                    // ← renamed
    return qualityCredits * multiplier                                      // same formula
```

### 4.3 `estimateChargedPoints` Deprecation

```typescript
// usage-ledger.ts:122 — CURRENT
export function estimateChargedPoints(totalTokens: number) {
  return Math.max(1, Math.ceil(totalTokens / 1000));
}

// This function is a bare token→credits converter WITHOUT model multiplier.
// It is superseded by estimateModelCredits(modelId, totalTokens) which includes the multiplier.
// It should be deprecated and all callers should use estimateModelCredits instead.

// Callers of estimateChargedPoints (to be verified when implementation authorized):
// - Check if any code calls this instead of estimateModelPoints
// - If none: safe to remove
// - If yes: migrate callers to estimateModelCredits
```

---

## 5. ChargedPoints → Credits: Complete Rename Plan

### 5.1 File-by-File Rename Map (20 Token Replacements)

#### `plan-config.ts` (8 replacements)

| Line | Current Token | Replacement |
|------|--------------|-------------|
| 7 | `monthlyPoints: number` | `monthlyCreditGrant: number` |
| 36 | `monthlyPoints: 100_000` | `monthlyCreditGrant: 100_000` |
| 39 | `monthlyPoints: 1_000_000` | `monthlyCreditGrant: 1_000_000` |
| 42 | `monthlyPoints: 5_000_000` | `monthlyCreditGrant: 5_000_000` |
| 45 | `monthlyPoints: 20_000_000` | `monthlyCreditGrant: 20_000_000` |
| 49 | `MODEL_POINT_MULTIPLIERS` | `MODEL_CREDIT_MULTIPLIERS` |
| 62 | `IMAGE_GENERATION_FIXED_POINTS` | `IMAGE_GENERATION_FIXED_CREDITS` |
| 65 | `estimateModelPoints` | `estimateModelCredits` |
| 69 | `MODEL_POINT_MULTIPLIERS[modelId]` | `MODEL_CREDIT_MULTIPLIERS[modelId]` |
| 72 | `estimateImageGenerationPoints` | `estimateImageGenerationCredits` |
| 75 | `IMAGE_GENERATION_FIXED_POINTS[` | `IMAGE_GENERATION_FIXED_CREDITS[` |
| 79 | `MODEL_POINT_MULTIPLIERS[input.modelId]` | `MODEL_CREDIT_MULTIPLIERS[input.modelId]` |

#### `usage-ledger.ts` (5 replacements)

| Line | Current Token | Replacement |
|------|--------------|-------------|
| 14 | `chargedPoints: number` | `credits: number` |
| 68 | `record.chargedPoints` | `record.credits` |
| 88 | `charged_points: record.chargedPoints` | `credits: record.credits` |
| 104 | `select("charged_points")` | `select("credits")` |
| 122 | `estimateChargedPoints` | **DEPRECATE** (remove function) |

#### `quota-gate.ts` (6 replacements)

| Line | Current Token | Replacement |
|------|--------------|-------------|
| 10 | `getCurrentMonthUsagePoints` | `getCurrentPeriodCredits` (or remove if wallet-based) |
| 16 | `assertMonthlyQuotaAvailable` | `assertSufficientCredits` |
| 17 | `estimatedPoints` | `estimatedCredits` |
| 21 | `usedPoints` | `currentUsage` (if kept) or remove |
| 24 | `monthlyPoints` | (derived from wallet_balance) |
| 28 | `"QUOTA_EXCEEDED"` | `"INSUFFICIENT_CREDITS"` |

#### `ai-gateway-service.ts` (3 replacements)

| Line | Current Token | Replacement |
|------|--------------|-------------|
| 26 | `chargedPoints: number` (in AiGatewayChatResult) | `credits: number` |
| 70 | `assertMonthlyQuotaAvailable` | `assertSufficientCredits` |
| 90 | `const chargedPoints =` | `const credits =` |
| 94 | `chargedPoints,` | `credits,` |

#### `image-gen/route.ts` (4 replacements)

| Current Token | Replacement |
|--------------|-------------|
| `estimatedPoints` | `estimatedCredits` |
| `chargedPoints` | `credits` |
| `assertMonthlyQuotaAvailable` | `assertSufficientCredits` |
| `estimateImageGenerationPoints` | `estimateImageGenerationCredits` |

### 5.2 Supabase Column Renames (Separate Migration — NOT This Slice)

These are noted for future DDL but NOT included in this design slice:

| Table | Current Column | New Column |
|-------|---------------|------------|
| `model_usage_ledger` | `charged_points` | `credits` |

**This is a migration, not a code rename. Deferred to implementation phase.**

---

## 6. Model Catalog Synchronization Rules

### 6.1 Authoritative Source Rule

```
SERVER_MODEL_CATALOG is the PRICING authority.
New API is the RUNTIME authority.
NEXUS_MODEL_CATALOG is the DISPLAY authority (derived from SERVER).

Rule:
  1. If a model is in SERVER_MODEL_CATALOG AND enabled AND New API: callable, priced
  2. If in SERVER_MODEL_CATALOG AND enabled AND NOT in New API: callable but will fail at runtime
  3. If in SERVER_MODEL_CATALOG AND disabled: not callable (channel missing or deprecated)
  4. If NOT in SERVER_MODEL_CATALOG: not callable through NEXUS API gateway
  5. NEXUS_MODEL_CATALOG may show models not in SERVER (for future/planned), 
     but they are not selectable for API calls
```

### 6.2 Maintenance Rule

When a new model becomes available in New API:
1. Add to SERVER_MODEL_CATALOG with `min_plan` and `credit_multiplier` (owner decision)
2. Add to NEXUS_MODEL_CATALOG for UI display
3. Set `enabled: true`

When a model is removed from New API:
1. Set `enabled: false` in SERVER_MODEL_CATALOG
2. Mark as unavailable in NEXUS_MODEL_CATALOG
3. Keep the record (don't delete — historical pricing reference)

---

## 7. S-5 Readiness

| Prerequisite | Status |
|-------------|--------|
| Triple-catalog drift analyzed (22 models, 3 catalogs) | ✅ |
| Alignment strategy defined (4-step) | ✅ |
| Extended ProductModelCatalogEntry with 3 pricing fields | ✅ |
| Complete 18-model SERVER_MODEL_CATALOG with pricing | ✅ |
| 4 models pending owner pricing decision identified | ✅ |
| Public/private catalog boundary explicit (3 fields private) | ✅ |
| Estimation function rename plan (7 functions/constants) | ✅ |
| Complete rename map (20 token replacements across 5 files) | ✅ |
| Supabase column rename noted (deferred) | ✅ |
| Catalog synchronization rules defined | ✅ |

**S-4 is COMPLETE. S-5 (Grant Transaction Flow Design) is READY.**

---

## No Implementation Performed

Design only. No code written. No Git changes. No Supabase changes. No migrations. No deploys. Pricing values unchanged. Catalogs not modified.
