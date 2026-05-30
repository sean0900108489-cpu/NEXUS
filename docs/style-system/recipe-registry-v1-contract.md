# NEXUS Recipe Registry V1 Contract

Status: contract preparation only
Scope: visual recipe slot registry, compatibility, and validator planning
Authorized files for this phase: `docs/style-system/**` only

## 0. Purpose

`NexusRecipeRegistryV1` centralizes visual recipe ownership for NEXUS surfaces.
It defines which slots exist, which value kinds are allowed, which adapter owns
each slot, and how fallbacks work.

The registry prevents recipe logic from spreading across validators, compilers,
components, Style Lab specimens, and adapters as one-off `if/else` checks.

Recipe Registry V1 is not:

- component behavior
- DOM event configuration
- layout authority
- persistence state
- React Flow interaction configuration
- a replacement for the V1 manifest validator

## 1. Registry Shape

Illustrative TypeScript shape:

```ts
type NexusRecipeRegistryV1 = {
  kind: "nexus-recipe-registry";
  schemaVersion: 1;
  id: string;
  version: string;
  groups: Record<NexusRecipeGroupIdV1, NexusRecipeGroupDefinitionV1>;
  compatibility: NexusRecipeRegistryCompatibilityV1;
};

type NexusRecipeGroupDefinitionV1 = {
  groupId: NexusRecipeGroupIdV1;
  owner: NexusRecipeOwnerV1;
  slots: NexusRecipeSlotDefinitionV1[];
  requiredSlots: string[];
  optionalSlots: string[];
  fallbackGroupId?: NexusRecipeGroupIdV1;
  adapterOwner?: NexusRecipeAdapterOwnerV1;
  specimenOwner?: NexusRecipeSpecimenOwnerV1;
};
```

Supported initial groups:

```ts
type NexusRecipeGroupIdV1 =
  | "panel"
  | "button"
  | "input"
  | "window"
  | "modal"
  | "toolbar"
  | "agent-card"
  | "graph-node"
  | "graph-edge";
```

## 2. Slot Shape

```ts
type NexusRecipeSlotDefinitionV1 = {
  slotId: string;
  label: string;
  valueKind:
    | "semantic-token"
    | "recipe-token"
    | "asset-id"
    | "enum"
    | "number"
    | "boolean";
  allowedTokenGroups?: string[];
  allowedEnums?: string[];
  defaultValue: string | number | boolean;
  fallbackValue: string | number | boolean;
  visualOnly: true;
  forbiddenKeys: string[];
};
```

Every slot must be visual-only. If a slot requires behavior authority to be
meaningful, it does not belong in this registry.

## 3. Owners

```ts
type NexusRecipeOwnerV1 =
  | "primitive"
  | "window-modal-adapter"
  | "react-flow-adapter"
  | "style-lab-specimen";

type NexusRecipeAdapterOwnerV1 =
  | "compiler"
  | "window-modal-recipe-adapter"
  | "react-flow-style-adapter"
  | "none";

type NexusRecipeSpecimenOwnerV1 =
  | "style-lab"
  | "primitive-specimens"
  | "graph-specimens";
```

Owners are review boundaries. They identify which pure adapter or specimen must
prove compatibility for a recipe group.

## 4. Group Definitions

### Panel

Purpose: base visual treatment for framed surfaces.

Allowed visual slots:

- `surface`
- `surfaceMuted`
- `text`
- `border`
- `shadow`
- `radius`
- `blur`
- `textureAssetId`

Forbidden:

- `position`
- `overflow`
- `zIndex`
- `pointerEvents`
- `onClick`
- `className`
- `style`

### Button

Purpose: visual states for clickable controls without changing click behavior.

Allowed visual slots:

- `surface`
- `surfaceHover`
- `surfaceActive`
- `surfaceDisabled`
- `text`
- `textDisabled`
- `border`
- `borderHover`
- `focusRing`
- `iconTone`
- `radius`
- `shadow`

Forbidden:

- `onClick`
- `onMouseDown`
- `type`
- `disabled`
- `aria-*`
- `role`
- `tabIndex`
- command routing or keyboard shortcut fields

### Input

Purpose: visual states for text fields and search-like controls.

Allowed visual slots:

- `surface`
- `surfaceFocus`
- `surfaceDisabled`
- `text`
- `placeholder`
- `selection`
- `border`
- `borderFocus`
- `focusRing`
- `radius`
- `shadow`

Forbidden:

- `value`
- `defaultValue`
- `onChange`
- `onKeyDown`
- validation behavior
- autofill behavior
- ARIA role or label ownership

### Window

Purpose: visual shell treatment for window surfaces.

Allowed visual slots:

- `chromeSurface`
- `bodySurface`
- `titleText`
- `mutedText`
- `border`
- `activeBorder`
- `shadow`
- `radius`
- `backdropBlur`
- `frameAssetId`

Forbidden:

- drag handle configuration
- resize handle configuration
- `bounds`
- `zIndex`
- focus stack behavior
- min/max width or height
- close/minimize behavior

### Modal

Purpose: visual treatment for blocking or focused overlay surfaces.

Allowed visual slots:

- `overlaySurface`
- `surface`
- `headerSurface`
- `text`
- `mutedText`
- `border`
- `shadow`
- `radius`
- `backdropBlur`

Forbidden:

- focus trap behavior
- `aria-modal`
- role assignment
- escape key handling
- z-index ladder
- scroll locking
- close behavior

### Toolbar

Purpose: visual grouping for repeated action controls.

Allowed visual slots:

- `surface`
- `separator`
- `text`
- `iconTone`
- `activeSurface`
- `activeText`
- `border`
- `radius`
- `shadow`

Forbidden:

- button command mapping
- shortcut mapping
- toolbar visibility state
- roving tabindex
- popover/menu behavior

### Agent Card

Purpose: visual treatment for agent summaries, cards, or agent previews.

Allowed visual slots:

- `surface`
- `headerSurface`
- `avatarAssetId`
- `titleText`
- `bodyText`
- `statusText`
- `statusAccent`
- `border`
- `shadow`
- `radius`

Forbidden:

- agent identity source
- online/offline behavior
- chat routing
- workspace permissions
- persistence or sync fields

### Graph Node

Purpose: visual treatment for React Flow node shells.

Allowed visual slots:

- `surface`
- `selectedSurface`
- `titleText`
- `bodyText`
- `statusAccent`
- `border`
- `selectedBorder`
- `shadow`
- `radius`
- `handleFill`
- `handleStroke`

Forbidden:

- node ID
- handle ID
- node type
- drag behavior
- selection behavior
- connection behavior
- position, width, height, or measured geometry
- `nodrag`, `nopan`, `nowheel`

### Graph Edge

Purpose: visual treatment for React Flow edge paths and labels.

Allowed visual slots:

- `stroke`
- `strokeSelected`
- `strokeMuted`
- `labelText`
- `labelSurface`
- `markerFill`
- `halo`
- `deleteAffordanceTone`

Forbidden:

- edge ID
- source/target IDs
- hit width
- interaction width
- delete key behavior
- connect behavior
- edge routing semantics
- event handlers

## 5. Allowed Value Kinds

Allowed:

- semantic token references such as `surface.panel`
- compiler-owned recipe token references
- asset IDs validated by Asset Pack V1
- finite numeric values for explicitly visual intensity slots
- enums from slot-specific allowlists
- booleans only for visual variants such as `showDivider`

Forbidden:

- raw CSS declarations
- arbitrary selectors
- `className`
- `style`
- event handlers
- route names
- store paths
- backend/Supabase/database names
- React Flow behavior props
- window/modal behavior props
- unvalidated asset URLs

## 6. Registry Flow

The registry should become the single source for recipe group metadata:

```text
manifest recipes
-> recipe registry lookup
-> slot/value validation
-> compiler recipe variable output
-> adapter-owned visual output
-> Style Lab specimen coverage
```

Validator responsibilities:

- reject unknown recipe groups unless explicitly allowed by compatibility mode
- reject unknown required slots
- warn on missing optional visual slots
- reject forbidden keys
- verify semantic token references
- verify asset ID references against Asset Pack contract when assets are enabled
- emit deterministic, display-safe reports

Compiler responsibilities:

- compile only registry-approved slots
- emit namespaced variables or adapter payloads
- report adapter coverage
- fail closed when required group compatibility is missing

Components must not parse manifests directly. Production UI may only consume
future compiled output after a separate implementation gate.

## 7. Avoiding Scattered Conditions

Without a registry, V2 recipe expansion would likely create one-off checks in:

- manifest validator
- compiler
- window/modal adapter
- React Flow adapter
- Style Lab specimen rendering
- future import/export review

Registry V1 avoids that by making slot metadata declarative:

- one group table owns allowed slots
- one forbidden-key list is reused by validators
- one adapter owner is declared per group
- one fallback path is declared per group
- one compatibility result is produced per group

Implementation rule:

When a new recipe group or slot is added, update the registry first, then add
validator fixtures, compiler fixtures, adapter coverage, and specimen coverage.
Do not add hidden group-specific logic directly inside production components.

## 8. Compatibility Tests

Required fixture classes for a future implementation:

- accepts a minimal valid registry
- accepts all initial group IDs
- rejects unknown group IDs by default
- rejects duplicate slot IDs within a group
- rejects required slots missing defaults
- rejects slots with `visualOnly !== true`
- rejects forbidden keys such as `onClick`, `className`, `style`, `zIndex`, and
  `pointerEvents`
- rejects React Flow behavior fields in `graph-node` and `graph-edge`
- rejects window/modal drag, resize, focus, z-index, and scroll fields
- rejects asset IDs when no Asset Pack contract is bound
- warns when optional visual slots are missing
- reports adapter coverage per group
- preserves V1 manifest compatibility for existing `panel`, `button`, `input`,
  `window`, and `modal` recipes
- fails closed for unsupported future registry versions

Compatibility result shape:

```ts
type NexusRecipeRegistryCompatibilityV1 = {
  registryVersion: 1;
  manifestVersion: 1;
  groups: Record<
    NexusRecipeGroupIdV1,
    "compatible" | "compatible_with_warnings" | "unsupported"
  >;
  requiredFixtureSet: string[];
};
```

## 9. Fallback

Fallback order:

```text
manifest recipe slot
-> registry default value
-> fallback group slot
-> V1 built-in preset recipe
-> legacy visual variable
```

Fallback must not:

- create behavior props
- generate dynamic Tailwind classes
- write workspace state
- fetch remote assets
- hide validation errors in governance reports

## 10. Implementation Gate

The first implementation pass after this document may only add:

- pure registry types
- registry constants
- validator helpers
- fixtures
- tests
- documentation index updates

It may not add:

- production component consumption
- broad recipe expansion in runtime UI
- drag/resize/z-index/focus behavior changes
- React Flow behavior changes
- persistence
- package/deploy changes
- Supabase/database work
- `exports/**` changes
