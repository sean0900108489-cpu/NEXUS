# NEXUS Primitive Specimens V1

Phase: V7 - Primitive Specimens
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented isolated Style Lab specimens. No reusable primitive component package or production component migration is implemented.

## Implementation Evidence

- `src/components/style-engine/nexus-style-lab.tsx` includes an isolated primitive specimen gallery for Panel, Button, Input, Badge, static Window, and static Modal visuals.
- Static Window and Modal specimens are visual shells only. They do not add drag handle class names, `draggable`, resize enablement, bounds, z-index control, focus/close handlers, `role="dialog"`, `aria-modal`, or sandbox locks.
- Production app shell, `src/components/nexus/**`, React Flow behavior, workspace store/sync, backend routes, Supabase/database, package/deploy files, and `exports/**` remain outside the primitive specimen implementation.

## 0. Purpose

Primitive specimens are the first controlled consumers of the Style Contract.
They are not a full app rewrite.

Specimens should prove that:

- semantic tokens can render real UI
- recipes can express common states
- focus/disabled/destructive states remain legible
- current NEXUS baseline can be represented
- preview can stay local-only

## 1. Implementation Boundary For Later

Future primitives may be implemented only after the manifest, validator,
compiler, bridge, and preview gates are satisfied.

Allowed first implementation target:

- isolated specimen gallery or style lab preview surface

Forbidden first target:

- direct rewrite of `nexus-ops.tsx`
- direct rewrite of `nexus-graph.tsx`
- store/sync/backend changes
- global class search-and-replace

## 2. Required Primitive Set

| Primitive | Purpose | Current visual anchors | Risk |
| --- | --- | --- | --- |
| `NexusPanel` | Framed surface with shadow/blur/border | `.nexus-panel`, `.nexus-glass` | Low |
| `NexusButton` | Interactive command button | repeated neutral/white/neutral button classes | Medium |
| `NexusInput` | Text input/select/textarea shell | auth, graph editors, side panels | Medium |
| `NexusBadge` | Status/metadata pill | stream/status/model badges | Low |
| `NexusWindow` | Window chrome specimen only | agent/datapad windows | High |
| `NexusModal` | Modal shell specimen only | prompt vault, branch modal, command palette | High |

Rule:

`NexusWindow` and `NexusModal` specimens are visual shells only until a later
behavior gate owns drag/resize/z-index/focus/close semantics.

## 3. Shared State Matrix

Each primitive should define visual states before implementation:

| State | Required for | Notes |
| --- | --- | --- |
| `default` | all primitives | Baseline appearance. |
| `hover` | button, input, badge where clickable | Visual only; no behavior semantics. |
| `focusVisible` | button, input, modal controls | Keyboard focus must be visible. |
| `active` | button, dock item | Pressed/active visual. |
| `selected` | badge, button, panel item | Distinct from hover. |
| `disabled` | button, input | Distinguishable and non-interactive by component logic, not recipe. |
| `loading` | button, panel area | Visual treatment only. |
| `danger` | button, badge, panel callout | Destructive visual. |
| `success` | badge, panel callout | Success visual. |
| `warning` | badge, panel callout | Warning visual. |

Recipes may style these states but must not create business logic.

## 4. Primitive Contracts

### NexusPanel

Visual slots:

- `surface`
- `border`
- `shadow`
- `radius`
- `blur`
- `paddingDensity`
- `headerText`
- `bodyText`

Forbidden:

- scroll ownership
- z-index
- modal/focus behavior

### NexusButton

Visual slots:

- `surface`
- `surfaceHover`
- `surfaceActive`
- `text`
- `border`
- `focusRing`
- `icon`
- `shadow`

Variants:

- `neutral`
- `primary`
- `secondary`
- `danger`
- `ghost`

Forbidden:

- event handlers
- disabled semantics
- async/loading logic
- generated Tailwind class strings

### NexusInput

Visual slots:

- `surface`
- `text`
- `placeholder`
- `border`
- `focusBorder`
- `invalidBorder`
- `labelText`
- `hintText`

Variants:

- `text`
- `textarea`
- `select`

Forbidden:

- value management
- validation logic
- auth/password behavior
- autocomplete mutation

### NexusBadge

Visual slots:

- `surface`
- `text`
- `border`
- `icon`

Variants:

- `neutral`
- `info`
- `success`
- `warning`
- `danger`
- `selected`

Forbidden:

- status calculation
- live data mutation

### NexusWindow Specimen

Visual slots:

- `surface`
- `chrome`
- `chromeText`
- `border`
- `shadow`
- `radius`
- `handleVisual`
- `bodySurface`

Protected behavior:

- drag handle class names
- resize enablement
- bounds
- z-index state
- sandbox interaction lock

Implementation note:

Use specimen-only static shell first. Do not wrap `react-rnd` in the first
primitive pass.

### NexusModal Specimen

Visual slots:

- `backdrop`
- `surface`
- `border`
- `shadow`
- `titleText`
- `bodyText`
- `footerSurface`
- `dangerCallout`

Protected behavior:

- `role="dialog"`
- `aria-modal`
- focus/close behavior
- z-index tier
- scroll containment

Implementation note:

Use static specimen shell first. Do not replace existing modals until visual and
behavior smoke gates exist.

## 5. Accessibility Gate

Every implemented primitive must prove:

- focus visible state exists
- disabled state is visibly distinct
- text contrast is acceptable
- danger/success/warning states remain distinguishable
- touch/click targets remain stable
- text does not overflow fixed controls
- icons remain legible after style changes

## 6. Browser Smoke For Future Implementation

When primitives are implemented:

- specimen gallery loads
- default/hover/focus/disabled states render
- keyboard Tab exposes focus rings
- narrow viewport does not overflow text
- existing theme presets still switch
- preview style can alter specimen variables
- revert restores baseline
- no console errors

No browser smoke is required for this documentation-only pass.

## 7. Migration Candidates After Specimens

Low-risk first:

- isolated style lab panel
- non-persistent status badge
- simple static panel shell

Medium-risk:

- right dock item visuals
- provider/model panel buttons
- auth screen visual shell

High-risk later:

- agent window chrome
- datapad window chrome
- prompt vault modal
- command palette
- React Flow nodes/edges

## 8. Acceptance Gate

V7 primitive specimen contract passes when:

- Required primitive set is listed.
- State matrix is defined.
- Window/modal behavior protections are explicit.
- Accessibility and browser smoke gates are defined.
- First implementation target is isolated.
- No runtime component, CSS, schema, package, deploy, or `exports/**` files are changed.
