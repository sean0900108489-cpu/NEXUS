# S-4: Credit Pricing Metadata Extension

**Phase:** C (Wallet Technical Entry)
**Depends on:** S-2 (Wallet vocabulary & types defined)
**Owner Locks:** FINAL-LOCK-6
**Status:** Design only — no implementation authorized

## Objective
Design the extension of SERVER_MODEL_CATALOG and PRODUCT_PLAN_CONFIG to carry wallet credit pricing metadata, using the existing chargedPoints infrastructure as the foundation.

## Code Domains Touched (Design Reference Only)
- `src/lib/backend/models/model-catalog.ts` — SERVER_MODEL_CATALOG + pricing metadata
- `src/lib/backend/models/plan-config.ts` — MODEL_POINT_MULTIPLIERS, estimate functions
- `src/lib/models/model-catalog-types.ts` — public catalog types (must NOT expose pricing)

## Data Domains Touched (Design Reference Only)
None. Pricing is server-side configuration only.

## What This Slice Designs

### 4.1 Extended ProductModelCatalogEntry (Design Only)

Current `ProductModelCatalogEntry` has no pricing field. Design extension:

```
// ADD to ProductModelCatalogEntry (design only):
{
  // ... existing fields (id, label, modality, provider_family, new_api_model, 
  //     description, best_for, min_plan, supports_*, default_max_tokens, 
  //     max_output_tokens, enabled)
  
  // NEW: wallet pricing metadata
  credit_multiplier: number;       // 1x–8x, migrated from MODEL_POINT_MULTIPLIERS
  credit_base_unit: 'per_1k_tokens' | 'per_image';
  credit_fixed_cost?: number;      // for image models (1000/2500/5000 per quality tier)
}
```

### 4.2 SERVER_MODEL_CATALOG Extension Map

For each of the 10 current models, map from old to new:

| Model ID | Old multiplier (MODEL_POINT_MULTIPLIERS) | New: credit_multiplier | New: credit_base_unit |
|----------|----------------------------------------|----------------------|---------------------|
| gpt-4o-mini | 1× | 1× | per_1k_tokens |
| deepseek-chat | 1× | 1× | per_1k_tokens |
| deepseek-v4-flash | 1× | 1× | per_1k_tokens |
| deepseek-v4-pro | 3× | 3× | per_1k_tokens |
| gpt-4o | 5× | 5× | per_1k_tokens |
| gemini-2.5-flash | 1× | 1× | per_1k_tokens |
| gemini-2.5-pro | 6× | 6× | per_1k_tokens |
| claude-sonnet-4 | 8× | 8× | per_1k_tokens |
| img2 | 1× | 1× | per_image |
| riverflow-v2.5-fast | 1× | 1× | per_image |

### 4.3 Image Quality Tier Credit Costs

| Quality | Old (IMAGE_GENERATION_FIXED_POINTS) | New: credit_fixed_cost |
|---------|-------------------------------------|----------------------|
| standard | 1000 | 1000 |
| high | 2500 | 2500 |
| ultra | 5000 | 5000 |

### 4.4 Estimation Function Rename Map

```
// Current → Target (design only):
estimateModelPoints(modelId, totalTokens) 
  → estimateModelCredits(modelId, totalTokens)
  // Same formula: ceil(totalTokens / 1000) * credit_multiplier

estimateImageGenerationPoints({ modelId, quality })
  → estimateImageGenerationCredits({ modelId, quality })
  // Same formula: credit_fixed_cost[quality] * credit_multiplier
```

### 4.5 Plan Config Repurposing (Design Only)

Current `PRODUCT_PLAN_CONFIG`:
```
{
  Free: { allowedModelIds: [...], monthlyPoints: 100_000 },
  Basic: { allowedModelIds: [...], monthlyPoints: 1_000_000 },
  ...
}
```

Target design:
```
{
  Free: { 
    allowedModelIds: [...],       // KEEP — capability rules
    monthlyCreditGrant: 100_000,  // RENAMED from monthlyPoints
    creditDiscountMultiplier: 1.0 // NEW — plan discount (Free = no discount)
  },
  Basic: { 
    allowedModelIds: [...], 
    monthlyCreditGrant: 1_000_000,
    creditDiscountMultiplier: 0.9  // 10% discount on credit costs
  },
  Pro: { 
    allowedModelIds: [...], 
    monthlyCreditGrant: 5_000_000,
    creditDiscountMultiplier: 0.8  // 20% discount
  },
  Team: { 
    allowedModelIds: [...], 
    monthlyCreditGrant: 20_000_000,
    creditDiscountMultiplier: 0.75 // 25% discount
  },
}
```

### 4.6 What Stays Public vs Private

| Data | Location | Public/Private |
|------|----------|---------------|
| Model ID, label, description | PublicModelCatalogEntry | Public |
| min_plan, supports_* | PublicModelCatalogEntry | Public |
| credit_multiplier | ProductModelCatalogEntry (server) | PRIVATE |
| credit_fixed_cost | ProductModelCatalogEntry (server) | PRIVATE |
| creditDiscountMultiplier | PRODUCT_PLAN_CONFIG (server) | PRIVATE |
| monthlyCreditGrant | PRODUCT_PLAN_CONFIG (server) | PRIVATE |

## Validation Method
- All 10 models have credit_multiplier and credit_base_unit mapped
- All 3 image quality tiers have credit_fixed_cost mapped
- Rename map covers all estimation functions
- Plan config repurposing preserves allowedModelIds (capability rules)
- No pricing data leaks to PublicModelCatalogEntry

## Forbidden Areas
- Do not modify SERVER_MODEL_CATALOG or PRODUCT_PLAN_CONFIG
- Do not add pricing fields to PublicModelCatalogEntry
- Do not create new pricing tables
- Do not change multiplier values (keep 1×–8×)
- Do not design a new pricing engine (tiered, dynamic, etc.)

## Dependency Order
After S-2 (vocabulary defined). Parallel with S-3 and S-5.

## Rollback / No-Op Validation
Only a design document produced. No code changed. No pricing data modified.
