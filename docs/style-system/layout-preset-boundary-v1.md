# NEXUS Layout Preset Boundary V1

Status: contract preparation only
Scope: visual layout intent and protected behavior boundaries
Authorized files for this phase: `docs/style-system/**` only

## 0. Purpose

`NexusLayoutPresetV1` defines the narrow set of layout-adjacent visual choices a
Skin Pack may describe without taking ownership of app behavior.

Layout presets are dangerous because visual layout language can easily become
drag, resize, focus, z-index, scroll, React Flow, store, sync, or backend
authority. This document keeps the shared NEXUS skeleton stable while allowing
skin-level visual freedom.

Layout Preset V1 is not:

- a DOM positioning system
- a window manager
- React Flow configuration
- a route/store/backend contract
- a production UI migration authorization
- a persistence model

## 1. Contract Shape

Illustrative TypeScript shape:

```ts
type NexusLayoutPresetV1 = {
  kind: "nexus-layout-preset";
  schemaVersion: 1;
  id: string;
  name: string;
  density: NexusLayoutDensityV1;
  slotOrdering: NexusLayoutSlotOrderingV1;
  surfaceTreatment: NexusLayoutSurfaceTreatmentV1;
  visibility: NexusLayoutVisibilityV1;
  workspaceDecoration: NexusWorkspaceDecorationV1;
  compatibility: NexusLayoutPresetCompatibilityV1;
  fallback: NexusLayoutPresetFallbackV1;
};
```

All fields are declarative hints. They must be interpreted through approved
Style Engine validators, recipe slots, and Style Lab specimens before any
runtime consumption is considered.

## 2. Allowed Controls

### Density

```ts
type NexusLayoutDensityV1 = {
  mode: "compact" | "comfortable" | "spacious";
  controlScale?: "small" | "standard" | "large";
  surfacePadding?: "tight" | "standard" | "roomy";
  listDensity?: "dense" | "standard" | "relaxed";
};
```

Allowed:

- semantic spacing intent
- token-backed control rhythm
- recipe-backed padding density
- Style Lab specimen density variants

Forbidden:

- absolute sizes
- min/max geometry authority
- viewport breakpoints that override production layout
- scroll container ownership

### Slot Ordering

```ts
type NexusLayoutSlotOrderingV1 = {
  shell?: string[];
  panel?: string[];
  toolbar?: string[];
  agentCard?: string[];
};
```

Allowed:

- ordering hints for visual slots within approved recipe/specimen surfaces
- Style Lab arrangement examples
- stable named slots such as `header`, `body`, `footer`, `actions`, `status`

Forbidden:

- reparenting production DOM
- changing React component ownership
- moving controls across permission or behavior boundaries
- changing form submit, command routing, or keyboard behavior

### Surface Treatment

```ts
type NexusLayoutSurfaceTreatmentV1 = {
  panel: "flat" | "outlined" | "raised" | "glass";
  window: "flat" | "outlined" | "raised" | "glass";
  modal: "flat" | "outlined" | "raised" | "glass";
  graph: "flat" | "grid" | "subtle-texture";
};
```

Allowed:

- visual material intent
- recipe slot defaults
- semantic token selection
- asset ID references only after Asset Pack validation

Forbidden:

- CSS selector injection
- pointer-event changes
- z-index changes
- overflow changes
- drag handle changes
- focus trap changes

### Sidebar And Toolrail Visibility

```ts
type NexusLayoutVisibilityV1 = {
  sidebar?: "default" | "compact" | "hidden";
  toolrail?: "default" | "compact" | "hidden";
  dock?: "default" | "compact";
  commandSurface?: "default" | "compact";
};
```

Allowed:

- visual visibility hints for approved local specimens
- future product-policy inputs after separate UI implementation gate
- compact variants that preserve underlying behavior ownership

Forbidden:

- hiding required auth, error, safety, permission, or destructive-action UI
- changing responsive breakpoint logic in production
- changing keyboard reachability
- changing ARIA visibility semantics
- changing routing or store state

### Workspace Decoration

```ts
type NexusWorkspaceDecorationV1 = {
  grid?: "none" | "subtle" | "standard" | "expressive";
  ambient?: "none" | "subtle" | "standard";
  backgroundAssetId?: string;
  textureAssetId?: string;
};
```

Allowed:

- grid intensity intent
- ambient visual intensity
- approved semantic workspace tokens
- validated asset IDs from Asset Pack V1

Forbidden:

- remote backgrounds
- unbounded image URLs
- body scroll changes
- React Flow pane behavior changes
- production performance claims without budget validation

## 3. Forbidden Controls

Layout Preset V1 must not control:

- `position`, `top`, `right`, `bottom`, `left`, or `inset`
- `fixed`, `absolute`, `relative`, or sticky positioning authority
- z-index ladder or stacking order authority
- width, height, min-width, min-height, max-width, or max-height authority
- overflow and scroll ownership
- pointer events
- cursor behavior
- drag handles
- resize handles
- `react-rnd` bounds, handles, callbacks, or constraints
- modal focus trap, close, escape-key, or scroll-lock behavior
- ARIA roles, `tabIndex`, `aria-*`, `data-*`, or disabled state semantics
- store paths
- sync queues
- backend routes
- API payloads
- Supabase schema, RLS, storage, or generated types
- deployment config

## 4. React Flow Protected Boundary

Layout Preset V1 must not control:

- pan behavior
- zoom behavior
- node drag behavior
- node selection behavior
- edge selection behavior
- connection behavior
- delete behavior
- pane click behavior
- minimap behavior
- controls behavior
- node IDs
- edge IDs
- handle IDs
- handle hit areas
- edge hit width or interaction width
- `nodrag`, `nopan`, or `nowheel`

Graph-related layout presets may only provide visual intent:

- graph background treatment
- grid intensity
- node visual recipe selection
- edge visual recipe selection
- handle color recipe slots

Any production graph integration requires the React Flow adapter boundary and a
separate implementation gate.

## 5. Unified Skeleton Rule

NEXUS keeps one functional skeleton:

- app shell owns routing, auth, command surfaces, sidebars, dock, and workspace
  behavior
- window components own drag, resize, bounds, focus, z-index, and lifecycle
- modals own focus, close, scroll, ARIA, and blocking semantics
- React Flow owns graph interactions through component code and adapter-owned
  visual output
- store/sync/backend own durable state

Skin packs may alter the visual language of this skeleton, not replace the
skeleton itself.

Allowed freedom:

- compact, comfortable, or spacious rhythm
- flat, glass, outlined, or raised surfaces
- visual ordering hints for approved slots
- optional decoration intensity
- recipe defaults for shell-like specimens
- Style Lab preview variants

Protected consistency:

- functional command placement
- keyboard/focus behavior
- graph interactions
- window stacking
- persistence boundaries
- auth and permission semantics
- workspace sync semantics

## 6. Compatibility

```ts
type NexusLayoutPresetCompatibilityV1 = {
  contractVersion: 1;
  skinPackId?: string;
  recipeRegistryVersion: "recipe-registry-v1";
  assetPackContract?: "asset-pack-v1";
  result:
    | "compatible"
    | "compatible_with_warnings"
    | "unsupported"
    | "incompatible";
  warnings?: string[];
};
```

Compatibility must check:

- all referenced slots exist in the recipe registry
- all asset IDs are validated if asset references are present
- no protected behavior fields appear anywhere in the preset
- density values map to approved token/recipe slots
- visibility hints do not claim production behavior authority
- graph decoration does not include React Flow behavior fields

## 7. Fallback

```ts
type NexusLayoutPresetFallbackV1 = {
  fallbackPresetId: string;
  onUnsupportedDensity: "use-default-density";
  onUnsupportedSlotOrdering: "ignore-slot-ordering";
  onUnsupportedSurfaceTreatment: "use-default-surface";
  onUnsupportedVisibility: "use-default-visibility";
  onProtectedField: "reject-preset";
};
```

Fallback order:

```text
requested layout preset
-> fallback layout preset
-> manifest density intent
-> V1 recipe defaults
-> legacy app skeleton defaults
```

Fallback must not write to workspace state, mutate production layout, or fetch
external assets.

## 8. Validator Fixture Plan

Required future fixtures:

- accepts a minimal compact preset
- accepts surface treatment variants
- accepts sidebar/toolrail visibility hints
- accepts workspace decoration without assets
- accepts workspace decoration with validated asset IDs
- rejects `position`, `inset`, `zIndex`, `overflow`, and `pointerEvents`
- rejects width/height/min/max geometry fields
- rejects drag/resize/focus/keyboard fields
- rejects ARIA role and `tabIndex` fields
- rejects React Flow pan/zoom/connect/delete fields
- rejects node/edge/handle ID fields
- rejects store/sync/backend/Supabase/deploy fields
- warns on unknown optional visual slot ordering
- fails closed for unsupported future layout preset versions

## 9. Implementation Gate

The first implementation pass after this document may only add:

- pure layout preset types
- static validators
- safe/unsafe fixtures
- compatibility reports
- Style Lab-only specimen planning
- tests

It may not add:

- production layout migration
- window manager changes
- React Flow behavior changes
- store/sync/backend changes
- persistence
- Supabase/database work
- package/deploy changes
- `exports/**` changes
