# NEXUS Performance Budget Validator V1

Status: contract preparation only
Scope: static V2 gates, deferred V3 gates, degradation policy
Authorized files for this phase: `docs/style-system/**` only

## 0. Purpose

`NexusPerformanceBudgetValidatorV1` defines how style packs, asset packs,
recipes, layout presets, and compiled preview output should be rejected,
warned, or degraded when they exceed known safe limits.

The validator is a gate, not an optimizer. It must fail closed for clearly
unsafe inputs and produce deterministic, display-safe reports.

This document distinguishes:

- V2 static gates that can be implemented with pure metadata and compiler
  output.
- V3 render/asset gates that require Asset Pack implementation, Protocol 96,
  and browser/runtime measurement decisions.

## 1. Budget Shape

Illustrative TypeScript shape:

```ts
type NexusPerformanceBudgetV1 = {
  kind: "nexus-performance-budget";
  schemaVersion: 1;
  id: string;
  staticManifest: NexusStaticManifestBudgetV1;
  recipes: NexusRecipeBudgetV1;
  assets?: NexusAssetBudgetV1;
  visualEffects: NexusVisualEffectBudgetV1;
  animation: NexusAnimationBudgetV1;
  reactFlowEffects: NexusReactFlowEffectBudgetV1;
  degradation: NexusPerformanceDegradationPolicyV1;
};
```

Budgets are declarative constraints. They do not authorize runtime profiling,
asset loading, production UI changes, or deployment changes.

## 2. V2 Static Gates

V2 may implement pure, deterministic checks over the pack, manifest, registry,
and compiler output.

### Required V2 Gates

| Gate | Required in V2? | Input | Result |
| --- | --- | --- | --- |
| CSS variable count | Yes | compiler output | Reject when over limit. |
| Static manifest bytes | Yes | normalized manifest JSON | Reject or warn by threshold. |
| Pack metadata bytes | Yes | normalized pack metadata | Warn or reject oversized metadata. |
| Recipe group count | Yes | manifest recipes + registry | Reject unknown/excess groups. |
| Recipe slot count | Yes | registry-approved slots | Warn or reject excessive slots. |
| Adapter output count | Yes | compiler adapter output | Warn or reject excessive output. |
| Static asset metadata count | Yes, if assets referenced | asset descriptors only | Reject over count before loading. |
| Critical asset byte sum | Yes, if asset metadata exists | asset descriptors only | Reject over static byte budget. |
| Image dimensions metadata | Yes, if asset metadata exists | asset descriptors only | Reject over dimension budget. |
| Forbidden effect strings | Yes | tokens/recipes/layout | Reject unsafe blur/shadow/glow/animation strings. |
| Protected behavior pollution | Yes | all contract objects | Reject behavior/state/backend fields. |

These gates can be implemented before production UI, persistence, Supabase,
deploy, or runtime asset loading.

### V2 Static Manifest Budget

```ts
type NexusStaticManifestBudgetV1 = {
  maxCssVariableCount: number;
  maxNormalizedManifestBytes: number;
  maxPackMetadataBytes: number;
  maxCompatibilityReportBytes: number;
};
```

Suggested initial limits:

| Field | Suggested limit |
| --- | ---: |
| `maxCssVariableCount` | 240 |
| `maxNormalizedManifestBytes` | 64 KB |
| `maxPackMetadataBytes` | 16 KB |
| `maxCompatibilityReportBytes` | 24 KB |

Existing V1 compiler behavior already rejects compiled output when
`constraints.maxCssVariableCount` is exceeded. V2 should preserve that guard.

## 3. Asset Count And Bytes

```ts
type NexusAssetBudgetV1 = {
  maxTotalAssets: number;
  maxCriticalAssets: number;
  maxLazyAssets: number;
  maxOptionalAssets: number;
  maxCriticalBytes: number;
  maxTotalBytes: number;
  maxSingleAssetBytes: number;
};
```

Suggested initial metadata-only limits:

| Budget | Suggested limit |
| --- | ---: |
| Total assets | 64 |
| Critical assets | 8 |
| Lazy assets | 32 |
| Optional assets | 48 |
| Critical bytes | 512 KB |
| Total bytes | 4 MB |
| Single asset bytes | 1 MB |

V2 can validate these from descriptors only. V2 must not fetch or decode remote
assets.

V3 may validate:

- actual transfer bytes
- cache headers
- CDN/object retrieval behavior
- image decode cost
- font loading behavior
- generated asset recovery claims

## 4. Image Dimensions

```ts
type NexusImageDimensionBudgetV1 = {
  maxIconWidth: number;
  maxIconHeight: number;
  maxAvatarWidth: number;
  maxAvatarHeight: number;
  maxTextureWidth: number;
  maxTextureHeight: number;
  maxBackgroundWidth: number;
  maxBackgroundHeight: number;
};
```

Suggested initial limits:

| Type | Max dimensions |
| --- | --- |
| Icon | 256 x 256 |
| Avatar | 1024 x 1024 |
| Texture | 2048 x 2048 |
| Frame | 2048 x 2048 |
| Background | 2560 x 1440 |

Reject when descriptor dimensions exceed the limit. Warn when dimensions are
missing for image assets. Do not infer dimensions by loading files in V2.

## 5. Blur, Shadow, And Glow

```ts
type NexusVisualEffectBudgetV1 = {
  maxBlurPx: number;
  maxBackdropBlurPx: number;
  maxShadowLayers: number;
  maxGlowLayers: number;
  maxGlowSpreadPx: number;
  allowFullViewportHeavyBlur: false;
};
```

Suggested static limits:

| Effect | Suggested limit |
| --- | ---: |
| Blur radius | 24px |
| Backdrop blur radius | 20px |
| Shadow layers per slot | 3 |
| Glow layers per slot | 2 |
| Glow spread | 64px |

Reject:

- unparseable blur/shadow/glow strings
- CSS variables outside approved namespaces
- full-viewport heavy blur claims
- arbitrary CSS filter chains
- `box-shadow` strings that include suspicious CSS declarations or URLs

Warn:

- high blur on large surfaces
- multiple glow layers on frequently repeated recipes
- expressive effects in compact/dense mode

V3 may add runtime/browser checks for expensive effects after UI integration is
authorized.

## 6. Animation Budget

```ts
type NexusAnimationBudgetV1 = {
  maxAnimatedRecipeGroups: number;
  maxDurationMs: number;
  maxConcurrentAmbientAnimations: number;
  allowLayoutAnimation: false;
  allowInfiniteCriticalAnimation: false;
};
```

V2 allowed:

- static duration limits
- easing allowlists
- motion intent checks
- rejection of layout-affecting animation keys

V2 forbidden:

- style packs controlling production animation loops
- animation of width, height, top, left, z-index, scroll, or layout authority
- infinite critical animations
- arbitrary keyframes

V3 may add:

- browser frame budget checks
- reduced-motion verification
- animation count checks in real UI surfaces

## 7. React Flow Effect Budget

```ts
type NexusReactFlowEffectBudgetV1 = {
  maxNodeGlowLayers: number;
  maxEdgeHaloLayers: number;
  maxAnimatedEdges: number;
  allowBehaviorMutation: false;
  allowInteractionWidthMutation: false;
};
```

V2 allowed:

- static visual effect count for graph-node and graph-edge recipes
- rejection of behavior fields
- rejection of edge hit width or interaction width fields
- adapter output count checks

V2 forbidden:

- pan/zoom/drag/select/connect/delete changes
- node/edge/handle ID changes
- hit area changes
- minimap behavior changes
- controls behavior changes

V3 may add browser checks for heavy graph effects only after the React Flow
visual adapter is authorized for the target surface.

## 8. Preview And Apply Degradation

```ts
type NexusPerformanceDegradationPolicyV1 = {
  onStaticBudgetWarning: "allow-preview-with-warning";
  onStaticBudgetError: "reject-pack";
  onCriticalAssetOverBudget: "reject-pack" | "use-fallback-assets";
  onLazyAssetOverBudget: "omit-lazy-assets";
  onOptionalAssetOverBudget: "omit-optional-assets";
  onEffectOverBudget: "degrade-effects" | "reject-pack";
  onUnsupportedRuntimeMeasurement: "skip-runtime-check-with-warning";
};
```

Preview degradation rules:

- Static warnings may allow Style Lab preview with clear report codes.
- Static errors must reject pack preview.
- Missing lazy/optional assets may omit the asset and warn.
- Heavy effects may degrade to lower blur/shadow/glow defaults.
- Degradation must be visible in the report.

Apply degradation rules:

- No production apply is authorized in this phase.
- Future apply must require stricter gates than preview.
- `compatible_with_warnings` should not become applyable until product policy
  explicitly authorizes it.
- Fallback must not mutate workspace state automatically.

## 9. Report Shape

```ts
type NexusPerformanceBudgetReportV1 = {
  accepted: boolean;
  degraded: boolean;
  errors: Array<{
    code: string;
    path: string;
    message: string;
  }>;
  warnings: Array<{
    code: string;
    path: string;
    message: string;
  }>;
  info: Array<{
    code: string;
    path: string;
    message: string;
  }>;
  totals: {
    cssVariableCount?: number;
    normalizedManifestBytes?: number;
    totalAssets?: number;
    criticalAssets?: number;
    criticalBytes?: number;
    totalBytes?: number;
    recipeGroups?: number;
    adapterOutputs?: number;
  };
};
```

Reports must not echo:

- raw rejected payloads
- secret-like strings
- paths containing user/private data
- signed URLs
- large imported documents
- binary payloads

## 10. V2 Versus V3 Decision

Must be done in V2 before implementation:

- static budget contract
- CSS variable count gate
- manifest/metadata byte gates
- recipe group/slot gates
- adapter output count gate
- descriptor-only asset count/byte/dimension gates
- forbidden visual-effect string rejection
- behavior/persistence/backend pollution rejection
- deterministic report shape
- safe/unsafe fixtures

May be deferred to V3:

- runtime image decode measurement
- browser frame timing
- real network transfer budgets
- CDN/cache behavior
- generated asset recovery and retention guarantees
- real font loading performance
- production shell render cost
- React Flow heavy-effect browser measurement
- preview deployment performance checks

Protocol 96 is required before V3 claims durable generated/recoverable asset
performance. Protocol 98 and Protocol 95 are required before performance gates
cover persisted style preferences, backend routes, RLS, or database schema.

## 11. Implementation Gate

The first implementation pass after this document may only add:

- pure budget types
- static metadata validators
- compiler-output budget checks
- safe/unsafe fixtures
- deterministic reports
- tests

It may not add:

- runtime asset loading
- browser performance instrumentation
- production apply behavior
- persistence
- backend routes
- Supabase/database work
- package/deploy changes
- `exports/**` changes
