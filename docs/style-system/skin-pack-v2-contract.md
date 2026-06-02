# NEXUS Skin Pack V2 Contract

Status: contract preparation only
Scope: Style Engine metadata, compatibility, fallback, and validation planning
Authorized files for this phase: `docs/style-system/**` only

## 0. Purpose

`NexusSkinPackV2` is a declarative package envelope for governed visual style
data. It is not a runtime UI implementation, persistence model, marketplace
format, database schema, or production apply flow.

The V2 skin pack must attach at the pure Style Engine contract layer:

```text
skin pack candidate
-> pack metadata and compatibility review
-> NexusStyleManifestV1 payload
-> V1 validator
-> V1 compiler
-> preview patch / scoped runtime preview
-> Style Lab specimen review
```

It must not attach directly to:

- `workspace.themeConfig`
- workspace snapshots or sync queues
- backend routes
- Supabase tables, storage, or generated types
- production `NexusOps` behavior
- React Flow behavior props or handlers
- deployment configuration

## 1. Contract Shape

Illustrative TypeScript shape:

```ts
type NexusSkinPackV2 = {
  kind: "nexus-skin-pack";
  schemaVersion: 2;
  id: string;
  slug: string;
  packVersion: string;
  metadata: NexusSkinPackMetadataV2;
  manifest: NexusSkinPackManifestBindingV2;
  tokens: NexusSkinPackTokenBindingV2;
  recipes: NexusSkinPackRecipeBindingV2;
  assets?: NexusSkinPackAssetBindingV2;
  layoutPreset?: NexusSkinPackLayoutPresetBindingV2;
  performanceBudget: NexusSkinPackPerformanceBudgetV2;
  compatibility: NexusSkinPackCompatibilityV2;
  fallback: NexusSkinPackFallbackV2;
};
```

Required top-level fields:

- `kind`
- `schemaVersion`
- `id`
- `slug`
- `packVersion`
- `metadata`
- `manifest`
- `tokens`
- `recipes`
- `performanceBudget`
- `compatibility`
- `fallback`

Optional top-level fields:

- `assets`
- `layoutPreset`

Optional fields do not grant runtime authority. They only reference separate
contracts and must fail closed when the referenced contract is unavailable.

## 2. Metadata

```ts
type NexusSkinPackMetadataV2 = {
  displayName: string;
  description?: string;
  author?: string;
  source:
    | "built-in"
    | "human-authored"
    | "imported"
    | "ai-draft"
    | "legacy-bridge";
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  lifecycle:
    | "draft"
    | "validated"
    | "warning"
    | "deprecated"
    | "retired"
    | "quarantined"
    | "rejected";
};
```

Metadata is display and governance data. It may contain human-readable names,
tags, lifecycle state, and inert source labels.

Metadata must not contain:

- user secrets
- auth/session identifiers
- workspace IDs or membership data
- environment variable names or values
- raw imported prompt bodies
- raw rejected payloads
- external executable URLs
- service/provider keys

## 3. Manifest Binding

V2 does not replace `NexusStyleManifestV1`. A skin pack wraps one validator-ready
V1 manifest payload and may include derived checksums.

```ts
type NexusSkinPackManifestBindingV2 = {
  manifestVersion: 1;
  manifestId: string;
  payload: NexusStyleManifestV1;
  checksums?: {
    source?: string;
    manifest?: string;
    normalizedManifest?: string;
    compiledOutput?: string;
  };
};
```

Rules:

- `payload.schemaVersion` must be `1`.
- The payload must pass the V1 manifest validator before compile or preview.
- The payload remains the source of truth for tokens, recipes, adapters, and
  constraints.
- V2 pack metadata may not override manifest safety constraints.
- V2 pack metadata may not weaken V1 validator errors into warnings.

## 4. Token Binding

```ts
type NexusSkinPackTokenBindingV2 = {
  source: "manifest";
  manifestTokenGroups: Array<
    | "surface"
    | "text"
    | "accent"
    | "status"
    | "border"
    | "shadow"
    | "radius"
    | "blur"
    | "workspace"
    | "typography"
    | "density"
    | "motion"
  >;
  derivedOnly?: boolean;
};
```

Allowed:

- references to V1 manifest token groups
- validator-approved semantic token references
- static compatibility notes about required token groups

Forbidden:

- raw CSS declarations
- selectors
- dynamic Tailwind classes
- `url(...)`, `data:`, `blob:`, `file:`, or direct remote URLs
- unapproved CSS variable namespaces
- workspace/sync/backend/database field names
- secrets or environment variable references

The token binding is an index over the manifest payload, not a second mutable
token source.

## 5. Recipe Binding

```ts
type NexusSkinPackRecipeBindingV2 = {
  source: "manifest";
  registryVersion: "recipe-registry-v1";
  groups: string[];
  adapterCoverage: {
    windowModal?: "complete" | "partial" | "unsupported";
    reactFlow?: "complete" | "partial" | "unsupported";
    primitives?: "complete" | "partial" | "unsupported";
  };
};
```

Allowed recipe authority:

- mapping manifest recipes to visual slots owned by the recipe registry
- declaring adapter coverage
- declaring fallback/default slot usage
- reporting compatibility warnings

Forbidden recipe authority:

- event handlers
- component imports
- `className` or free-form `style`
- layout behavior such as `position`, `overflow`, `zIndex`, or `pointerEvents`
- drag/resize/focus/keyboard semantics
- React Flow pan/zoom/connect/delete semantics
- persistence or backend instructions

## 6. Asset Binding

Assets are optional in this contract and must be referenced through
`asset-pack-v1-contract.md`.

```ts
type NexusSkinPackAssetBindingV2 = {
  assetPackContract: "asset-pack-v1";
  assetPackId: string;
  requiredAssetIds: string[];
  lazyAssetIds?: string[];
  optionalAssetIds?: string[];
  fallbackAssetPackId?: string;
};
```

Rules:

- Skin Pack V2 may reference asset IDs only.
- Skin Pack V2 must not embed remote URLs, data URLs, blobs, base64 payloads, or
  local file paths.
- Missing required assets must degrade through `fallback`, not by network fetch.
- Generated, recoverable, or user-visible asset durability requires Protocol 96
  before implementation.

## 7. Layout Preset Binding

Layout presets are optional and must follow
`layout-preset-boundary-v1.md`.

```ts
type NexusSkinPackLayoutPresetBindingV2 = {
  contract: "layout-preset-boundary-v1";
  presetId: string;
  density?: "compact" | "comfortable" | "spacious";
  surfaceTreatment?: "flat" | "glass" | "raised" | "outlined";
  slotOrdering?: string[];
  visibilityHints?: {
    sidebar?: "default" | "compact" | "hidden";
    toolrail?: "default" | "compact" | "hidden";
  };
};
```

Allowed:

- density intent
- visual slot ordering hints
- surface treatment hints
- sidebar/toolrail visibility hints
- Style Lab specimen arrangement

Forbidden:

- drag, resize, focus, z-index, scroll, or pointer-event authority
- width/height/min/max geometry authority
- React Flow pan/zoom/connect/delete behavior
- store, sync, route, backend, Supabase, or deploy mutation

## 8. Performance Budget

```ts
type NexusSkinPackPerformanceBudgetV2 = {
  contract: "performance-budget-validator-v1";
  maxCssVariableCount: number;
  maxStaticManifestBytes: number;
  maxRecipeGroups: number;
  maxAdapterOutputs: number;
  assetBudgetRef?: string;
  renderBudgetRef?: string;
};
```

V2 may enforce static local budgets:

- CSS variable count
- static manifest byte size
- recipe group count
- adapter output count
- metadata byte size

Full asset byte, decode, animation, and browser timing budgets require the Asset
Pack contract and are deferred unless a later gate explicitly authorizes them.

## 9. Compatibility

```ts
type NexusSkinPackCompatibilityV2 = {
  appStyleEngineVersion: string;
  manifestVersion: 1;
  validatorVersion: string;
  compilerVersion: string;
  recipeRegistryVersion: "recipe-registry-v1";
  assetPackContract?: "asset-pack-v1";
  layoutPresetContract?: "layout-preset-boundary-v1";
  result:
    | "compatible"
    | "compatible_with_warnings"
    | "requires_upgrade"
    | "requires_downgrade"
    | "incompatible";
  warnings?: string[];
};
```

Compatibility must be derived from validation, compiler smoke, registry coverage,
asset contract review, layout preset review, and budget review. Human-readable
claims are not enough.

## 10. Fallback

```ts
type NexusSkinPackFallbackV2 = {
  fallbackPackId: string;
  fallbackManifestId: string;
  fallbackLegacyPreset: "surface-shell" | "apple" | "tesla" | "terminal";
  onAssetFailure: "use-fallback-asset" | "omit-asset" | "reject-pack";
  onLayoutFailure: "use-default-layout" | "reject-pack";
  onBudgetFailure: "preview-degraded" | "reject-pack";
};
```

Required fallback chain:

```text
current skin pack
-> fallback skin pack
-> fallback V1 manifest
-> built-in legacy preset
-> default baseline surface-shell variables
```

Fallback must not:

- auto-write workspace snapshots
- mutate `workspace.themeConfig`
- hide rejected/quarantined states
- fetch external assets opportunistically
- downgrade safety errors to warnings

## 11. Allowed And Forbidden Summary

Allowed in Skin Pack V2:

- package identity and lifecycle metadata
- one V1 manifest payload
- V1 token and recipe group indexing
- recipe registry references
- asset pack ID references
- layout preset ID references
- static performance budget declarations
- compatibility and fallback declarations
- redacted checksums and safety report summaries

Forbidden in Skin Pack V2:

- production UI component implementation
- raw CSS, selectors, scripts, executable strings, or dynamic Tailwind
- embedded remote assets or unbounded URLs
- workspace, sync, backend, route, Supabase, database, or deploy instructions
- React Flow interaction behavior
- window/modal drag, resize, focus, z-index, or scroll behavior
- direct persistence or apply/save semantics

## 12. Relationship To V1 Manifest

`NexusStyleManifestV1` remains the only style payload accepted by the current
validator/compiler pipeline.

Skin Pack V2 adds:

- packaging metadata
- lifecycle and governance status
- compatibility axes
- registry references
- fallback declarations
- static budget declarations

Skin Pack V2 does not add:

- a new token value language
- a raw asset URL channel
- runtime component props
- persistence authority
- behavior authority

Implementation gate:

The first implementation pass after this document may only add pure types,
fixtures, validators, and tests for this contract. It may not modify runtime UI,
production component behavior, persistence, database, deploy, package files, or
`exports/**`.
