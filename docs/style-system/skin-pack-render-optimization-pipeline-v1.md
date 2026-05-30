# NEXUS Skin Pack Render Optimization Pipeline V1

Status: technical design only
Scope: Skin Pack receive, validation, compile, render planning, diagnostics, and future apply preparation
Authorized files for this phase: `docs/style-system/**` only

## 0. Purpose

This document defines the first render optimization pipeline for NEXUS Skin
Packs. It is not another limiter. It describes how a pack should move from
input review to a future production-safe render plan without crossing the
current V2 boundaries.

Current baseline:

- V2 pure validators exist in `src/lib/style-engine/**`.
- Style Lab can review V2 Skin Pack JSON and show redacted summaries.
- Style Lab can preview only the validated token subset as scoped CSS
  variables.
- Asset, recipe, layout, save, persist, production apply, and backend work are
  still out of scope.

The pipeline target is:

```text
SkinPack candidate
-> Receive Envelope
-> Validation Report
-> CompiledSkin
-> RenderPlan
-> Runtime Apply Scheduler
-> Diagnostics
-> Future Apply Verdict
```

V2 should implement only the pure local parts of this pipeline. V3 may add
browser and asset runtime measurement after the relevant protocols authorize
those surfaces.

## 1. Non-Goals

This document does not authorize:

- asset preview
- recipe preview
- layout preview
- production app shell integration
- workspace theme writes
- save/apply/persist flows
- backend routes
- Supabase tables, storage, RLS, or generated types
- package, lockfile, deploy, or `exports/**` changes
- network fetching, image decoding, or browser frame-budget claims

The next implementation gate should be pure Render Plan IR types and tests, not
asset preview.

## 2. Validator Versus Optimizer

The Performance Budget Validator is a gate. The Optimizer is a planner.

| Concern | Validator | Optimizer |
| --- | --- | --- |
| Primary question | Is this input safe enough to continue? | Given safe input, what is the cheapest safe render plan? |
| Failure mode | Reject or warn with deterministic report codes. | Produce a degraded plan or no-op plan, never widen authority. |
| Input authority | Raw candidate, normalized pack, compiled metadata. | Accepted validation result and normalized compiled skin. |
| Output | Redacted report with totals and issues. | RenderPlan IR, degradation decisions, diagnostics counters. |
| Side effects | None. | None in V2; future scheduler may apply scoped output only. |
| Security posture | Fail closed. | Fail closed when an optimization would require missing authority. |

The validator must remain independent. Optimizer decisions must never convert a
validator error into a warning. They may only choose among already-valid render
paths or produce an explicit degraded render plan when policy allows it.

Example:

```text
Over CSS variable budget
-> validator rejects
-> optimizer does not run

Optional lazy asset unavailable
-> validator warns
-> optimizer omits optional asset and records degradation
```

## 3. Pipeline Overview

### Stage A: Receive Envelope

Input may arrive as pasted JSON, future uploaded package metadata, or a future
trusted built-in pack reference. The receive stage must normalize text and
metadata before validation.

Responsibilities:

- enforce max input characters before parse
- parse JSON with no side effects
- reject empty or invalid JSON
- strip display reports of raw rejected payloads
- compute stable source hashes from normalized inert data
- preserve only candidate-level provenance safe for UI

Current source alignment:

- `parseNexusSkinPackReviewImportTextV2` limits review text to 200,000
  characters.
- rejected review results expose redacted summaries and issue codes, not the
  accepted `skinPack` payload.
- `compileNexusSkinPackTokenPreviewTextV2` reparses and revalidates before
  token preview.

### Stage B: Validation

Validation remains the authoritative gate.

Required gates before optimization:

- Skin Pack V2 envelope validation
- V1 manifest validation
- CSS variable count budget
- static manifest bytes
- metadata bytes
- recipe group and adapter output counts
- asset descriptor count and byte metadata where asset binding exists
- forbidden protected behavior fields
- compatibility and fallback checks

Validation output must be deterministic and display-safe.

### Stage C: CompiledSkin

`CompiledSkin` is the normalized, accepted, side-effect-free form that the
optimizer may read. It is not a runtime state object.

Illustrative shape:

```ts
type NexusCompiledSkinV1 = {
  kind: "nexus-compiled-skin";
  skinPackId: string;
  manifestId: string;
  checksums: {
    skinPack: string;
    manifest: string;
    compiledTokens: string;
    assetMetadata?: string;
    recipeRegistry?: string;
    layoutPreset?: string;
  };
  tokens: {
    cssVariables: Record<`--nexus-${string}`, string>;
    variableCount: number;
    groups: string[];
  };
  assets: NexusCompiledAssetSummaryV1;
  recipes: NexusCompiledRecipeSummaryV1;
  layout: NexusCompiledLayoutSummaryV1;
  budgets: NexusCompiledBudgetSummaryV1;
  validationReportRef: string;
};
```

Rules:

- Contains normalized summaries and compiled token output.
- Does not contain raw rejected payloads.
- Does not contain binary asset data.
- Does not contain component imports, event handlers, selectors, or dynamic
  Tailwind.
- Does not grant asset, recipe, or layout preview authority.

### Stage D: RenderPlan IR

`RenderPlan` is the optimizer output. It is the bridge between compiled style
data and a future scheduler.

```ts
type NexusRenderPlanV1 = {
  kind: "nexus-render-plan";
  planVersion: 1;
  planId: string;
  skinPackId: string;
  manifestId: string;
  renderMode: "style-lab-preview" | "future-production-apply";
  eligibility: {
    canPreviewTokens: boolean;
    canPreviewAssets: false;
    canPreviewRecipes: false;
    canPreviewLayout: false;
    canApplyProduction: false;
    reasonCodes: string[];
  };
  stages: NexusRenderPlanStageV1[];
  diagnostics: NexusRenderPlanDiagnosticsV1;
  degradation: NexusRenderPlanDegradationV1;
  checksums: {
    compiledSkin: string;
    renderPlan: string;
  };
};
```

Initial stage types:

```ts
type NexusRenderPlanStageV1 =
  | {
      kind: "set-scoped-css-variables";
      stageId: "tokens";
      variables: Record<`--nexus-${string}`, string>;
      checksum: string;
    }
  | {
      kind: "review-only-assets";
      stageId: "assets";
      assetCount: number;
      criticalBytes: number;
      checksum?: string;
    }
  | {
      kind: "review-only-recipes";
      stageId: "recipes";
      groupCount: number;
      adapterOutputCount: number;
      checksum?: string;
    }
  | {
      kind: "review-only-layout";
      stageId: "layout";
      presetId?: string;
      checksum?: string;
    };
```

V2 RenderPlan rules:

- token stage may produce scoped CSS variables for Style Lab only
- asset, recipe, and layout stages are review-only
- no stage may contain raw URLs, binary payloads, component props, behavior
  fields, or workspace state
- all stage IDs and checksums must be deterministic
- plan identity must be based on normalized compiled input, not mutable React
  object identity

## 4. Receive-Side Optimization

Receive-side optimization prevents expensive or unsafe work before validation.

V2 allowed:

- max text size gate before parse
- single parse pass into unknown data
- normalized byte counting after parse
- stable checksum computation from normalized JSON
- redacted issue extraction
- candidate source label: `skin-pack-json`, `text`, or future `builtin`
- deduped token group lists
- early no-op result for unchanged checksum

V2 forbidden:

- remote fetch to inspect referenced assets
- local filesystem reads from pack content
- image decode
- SVG sanitization side effects
- persistence
- cache writes outside local in-memory test/runtime scope

Future optimization:

- in-memory per-session checksum memoization in Style Lab
- rejected-candidate cooldown by checksum
- normalized report reuse when text and validator versions are unchanged

## 5. Asset Optimization Boundary

Asset optimization starts as metadata normalization, not rendering.

### Asset Normalization

Normalize descriptors into stable summaries:

- stable asset ID order
- type, role, MIME, loading class
- byte size and dimensions
- SHA-256 hash metadata
- fallback asset ID
- generated-reference Protocol 96 marker

Reject or warn before any asset load:

- unknown MIME
- missing or malformed hash
- oversized descriptor bytes
- oversized dimensions
- direct URLs, signed URLs, local paths, base64, data/blob/file values
- generated durability claims without Protocol 96

### Variant Planning

Variants are future RenderPlan candidates, not V2 runtime outputs.

Possible future variant axes:

- density: compact, standard, high-density
- pixel ratio: 1x, 2x, 3x
- color mode: dark, light, adaptive
- effect level: full, reduced, minimal

V2 may document variant metadata and validate descriptor consistency. V2 must
not generate resized files or add dependencies.

### Hash Cache

Hash cache policy:

- key by `assetPackId`, `assetId`, `hash.algorithm`, and `hash.value`
- cache only normalized metadata in V2
- never cache raw binary payloads in Skin Pack validation
- never treat hash presence as proof of availability
- future durable cache requires Protocol 96 when generated or user-visible

### Critical, Lazy, Optional Split

The optimizer should classify asset stages:

| Loading class | RenderPlan treatment | Failure behavior |
| --- | --- | --- |
| `critical` | counted in critical bytes and first-stage diagnostics | reject pack or use fallback asset per contract |
| `lazy` | late-stage, never blocks base token render | omit until available and warn |
| `optional` | enhancement-only stage | omit with warning |

V2 Style Lab should display summaries only. No asset preview is authorized.

## 6. Recipe Optimization Boundary

Recipe optimization means registry-based grouping and output minimization. It
does not mean component behavior.

V2 design:

- dedupe recipe groups by registry group ID
- validate slot ownership through Recipe Registry V1
- count adapter outputs before rendering
- group recipe diagnostics by owner: primitive, window-modal, react-flow,
  style-lab specimen
- keep recipe stages review-only

Future RenderPlan may split recipe output:

```text
registry-approved recipes
-> primitive visual vars
-> window/modal visual adapter vars
-> React Flow visual adapter vars
-> Style Lab specimen-only vars
```

Forbidden:

- event handlers
- `className` or free-form `style`
- z-index, focus, drag, resize, keyboard, pointer, route, or store authority
- React Flow behavior props

## 7. Layout Preset Optimization Boundary

Layout optimization is limited to visual intent and specimen arrangement until
a separate UI gate authorizes consumption.

V2 allowed:

- normalize density intent
- normalize surface treatment intent
- validate slot ordering names
- validate sidebar/toolrail visibility hints as inert metadata
- report whether layout preset is compatible, unsupported, or rejected

V2 forbidden:

- production DOM reparenting
- width, height, min/max geometry
- position, overflow, pointer events, z-index
- modal focus, scroll lock, or ARIA behavior
- React Flow pan, zoom, drag, connect, delete, node/edge/handle identity
- store/sync/backend/persistence

Future RenderPlan should treat layout as:

```text
layout preset summary
-> visual-only specimen arrangement
-> production policy review
-> future product gate
```

## 8. Runtime Apply Scheduler

The scheduler is a future runtime concept. V2 may define its contract, but must
not wire it into production UI.

Scheduler responsibilities:

- apply RenderPlan stages in deterministic order
- stage token variables before expensive visual enhancements
- debounce repeated preview requests
- cancel stale in-flight plans by `planId`
- use `requestAnimationFrame` for visible style mutation
- use `requestIdleCallback` or a timeout fallback for non-critical diagnostics
- measure preview apply duration in Style Lab when authorized
- revert by session ID and checksum, not by reconstructing large objects

Illustrative future flow:

```text
user previews tokens
-> create RenderPlan
-> cancel prior plan for same surface
-> rAF: set scoped CSS variables
-> idle: update diagnostics
-> store active preview session id only
```

Cancellation rules:

- new plan cancels older pending stages for the same target
- revert cancels pending stages before removing variables
- failed token stage prevents later stages
- review-only stages never perform DOM mutation

Apply ordering:

1. validate plan checksums
2. set scoped token variables
3. schedule review-only diagnostics
4. future: schedule approved visual enhancements
5. future: finalize production-safe verdict

## 9. React Rerender Avoidance

Render optimization should avoid pushing large pack objects through React state.

Required strategy:

- use scoped CSS variables for visual preview instead of rerendering surfaces
- store preview session ID, render plan ID, and checksums only
- keep large Skin Pack payloads in local text/review state only where needed
- memoize compiled summaries by normalized checksum
- memoize RenderPlan output by compiled skin checksum and optimizer version
- use small diagnostics rows instead of storing large raw reports in component
  state
- keep rejected payloads out of runtime state after redacted report generation
- do not pass full Skin Pack objects into production component props

Current source alignment:

- token preview emits a `NexusStylePreviewPatchV1` containing CSS variables,
  `manifestId`, `manifestChecksum`, and `previewId`.
- Style Lab runtime uses a scoped provider target and an active preview session.
- V2 review summaries show metadata, asset, recipe, layout, and budget totals
  without applying asset, recipe, or layout data.

Future anti-patterns to reject:

- `useState<NexusSkinPackV2>` in production app shell
- context provider containing full skin pack payloads
- rerendering graph or window trees for pure token changes
- deriving React keys from skin pack JSON
- storing binary asset data or raw rejected payloads in React state

## 10. Degradation Plan

Degradation is an explicit RenderPlan decision. It must be visible in reports.

| Area | Degradation | V2 status | V3 status |
| --- | --- | --- | --- |
| Blur | cap blur/backdrop blur to budgeted px or remove full-viewport blur | static report only | browser verification may measure impact |
| Shadow | reduce layer count and spread | static report only | may measure frame cost |
| Glow | reduce glow layers or intensity | static report only | may measure repeated-surface cost |
| Assets | omit optional, defer lazy, fallback critical | metadata-only summary | loader/cache/decode policy after Protocol 96 |
| Animation | reduce duration, disable ambient/infinite effects | static report only | frame timing and reduced-motion checks |
| React Flow effects | remove halos, cap animated edges, reduce node glow | static adapter report only | graph surface measurement after adapter gate |

Rules:

- static errors reject before degradation
- warnings may produce degraded preview plans when policy allows
- degradation never adds behavior authority
- degraded output must include reason codes
- production apply must require stricter policy than Style Lab preview

Example degradation report codes:

- `stylePack.degraded.blurCapped`
- `stylePack.degraded.shadowLayerReduced`
- `stylePack.degraded.optionalAssetOmitted`
- `stylePack.degraded.lazyAssetDeferred`
- `stylePack.degraded.ambientAnimationDisabled`
- `stylePack.degraded.reactFlowGlowReduced`

## 11. Style Lab Diagnostics

Style Lab should become the first diagnostics surface for the RenderPlan IR. It
should report facts, not imply production apply readiness.

Required diagnostics:

```ts
type NexusRenderPlanDiagnosticsV1 = {
  cssVariableCount: number;
  tokenGroupCount: number;
  assetCount: number;
  criticalAssetCount: number;
  criticalBytes: number;
  lazyAssetCount: number;
  optionalAssetCount: number;
  recipeGroupCount: number;
  adapterOutputCount: number;
  layoutPresetReferenced: boolean;
  effectCount: {
    blur: number;
    shadow: number;
    glow: number;
    animation: number;
    reactFlow: number;
  };
  previewApplyDurationMs?: number;
  degraded: boolean;
  safeForProduction: false | "requires-protocol-review";
  reasonCodes: string[];
};
```

Style Lab display rows:

- critical bytes
- asset count
- critical/lazy/optional split
- CSS variable count
- recipe group count
- adapter output count
- effect count
- preview apply duration
- degraded status
- safe-for-production verdict

V2 verdict language:

| Verdict | Meaning |
| --- | --- |
| `token-preview-only` | May preview scoped token CSS variables in Style Lab. |
| `review-only` | Metadata is valid enough to display summaries only. |
| `blocked` | Validation failed or a required budget is exceeded. |
| `requires-protocol-review` | Needs Protocol 96, 98, or 95 before implementation. |

`safe-for-production` should remain false in V2 for imported Skin Packs.

## 12. Future Dependency Policy

Current decision: add no dependencies for this document or the next pure IR
implementation gate.

Dependency introduction must be tied to a specific authorized problem:

| Dependency | Worth introducing when | Not worth introducing when |
| --- | --- | --- |
| `sharp` | Server-side or build-time trusted asset normalization is authorized after Protocol 96 and package changes are allowed. | V2 only needs descriptor validation or Style Lab review summaries. |
| `image-size` | Descriptor dimensions must be verified from trusted local packaged files after asset loading is authorized. | Skin Pack references only provide metadata and no file access is allowed. |
| `svgo` | Sanitized SVG asset ingestion is approved with fixtures and security review. | SVG is only rejected or summarized by MIME metadata. |
| `blurhash` | Low-quality image placeholders are product-approved and generated asset durability is solved. | No actual image preview or placeholder generation is authorized. |
| `thumbhash` | Tiny placeholders are needed for a real asset loader with measured UX benefit. | Asset preview remains out of scope. |

Dependency gate:

1. prove the current static validator cannot solve the problem
2. document security and bundle cost
3. add fixtures proving rejection behavior
4. keep dependency use out of production app shell until authorized
5. run package/lockfile approval separately

## 13. V2, V3, And Protocol Boundaries

### V2 Can Do

- pure RenderPlan IR types
- pure RenderPlan builder from accepted V2 validation output
- token-only stage output
- review-only asset, recipe, and layout stages
- diagnostics totals from metadata and compiled output
- deterministic checksums
- safe/unsafe fixtures
- unit tests
- Style Lab diagnostics display after a separate UI authorization

### V2 Must Not Do

- asset preview or image loading
- recipe preview beyond existing V1 specimens
- layout preset preview
- production apply
- persistence
- backend routes
- Supabase work
- package/dependency changes
- deploy changes

### V3 Deferred

- browser image decode measurement
- real transfer/cache/CDN measurement
- frame timing and animation measurement
- React Flow heavy-effect browser measurement
- generated placeholder assets
- production shell render-cost checks
- apply scheduler production integration

### Protocol 96 Required

Run Protocol 96 before:

- generated style assets
- recoverable or durable user-visible assets
- asset storage, blob, artifact, or replay guarantees
- external asset URL policy
- asset decode/transfer performance claims
- adding asset-processing dependencies for real files

### Protocol 98 Required

Run Protocol 98 before:

- `/api/v1/style-packs`
- apply/save/persist routes
- auth-gated style pack reads/writes
- backend service/repository implementation
- persisted style audit events

### Protocol 95 Required

Run Protocol 95 before:

- `style_packs` or `workspace_style_preferences` tables
- Supabase storage bucket work
- generated database types
- RLS policies
- schema parity checks
- Supabase advisor review for style data

## 14. Next Implementation Gate

The next implementation unit should be:

```text
pure Render Plan IR types/tests
```

Allowed files for that future gate should be limited to:

- `src/lib/style-engine/**`
- focused style-engine tests
- `docs/style-system/execution-runs/**`

Required tests:

- accepted Skin Pack produces token-only RenderPlan
- rejected Skin Pack produces no RenderPlan
- asset stage is review-only
- recipe stage is review-only
- layout stage is review-only
- RenderPlan checksum is deterministic
- diagnostics totals match validated metadata
- no raw rejected payload is returned
- no store/sync/backend/Supabase/package/deploy imports

Explicitly not next:

- asset preview
- recipe preview
- layout preview
- production apply scheduler wiring
- package or dependency installation

## 15. Completion Criteria For This Design

This document is complete when it clearly answers:

- why the validator and optimizer are separate
- how Skin Packs are optimized at receive time
- how asset metadata is normalized without asset preview
- what `SkinPack -> CompiledSkin -> RenderPlan` means
- how a future scheduler should stage, cancel, debounce, and schedule work
- how React rerenders are avoided
- how degradation is reported
- what Style Lab diagnostics should show
- when future dependencies are justified
- what belongs to V2, V3, Protocol 96, Protocol 98, and Protocol 95
- why pure RenderPlan IR types/tests are the next implementation gate
