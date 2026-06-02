# NEXUS Style Contract V1

Phase: V2 - Style Contract And Semantic Token Registry
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented pure contract types and compiler mapping. Provider integration, DB, package, deploy, persistence, and production component consumption are not implemented.

## Implementation Evidence

- `src/lib/style-engine/manifest.ts` defines the V1 token group names, required semantic tokens, recipe group names, and manifest token shape.
- `src/lib/style-engine/presets.ts` maps the baseline Surface Shell baseline and High Contrast Carbon preset through the same semantic token groups.
- `src/lib/style-engine/compiler.ts` emits deterministic `--nexus-*` semantic variables, preserves the legacy variable bridge, resolves recipe token references into CSS variable references, and emits visual-only adapter outputs.
- `src/lib/style-engine/compiler.test.ts` covers semantic variable output, legacy bridge output, recipe reference compilation, fail-closed invalid manifests, and adapter metadata.
- The contract remains local-only and pure. Components do not import raw manifests or AI drafts, runtime Tailwind generation remains forbidden, and workspace/sync/backend/Supabase/deploy/`exports/**` boundaries remain closed.

## 0. Purpose

This contract defines the semantic style language that future manifests,
validators, compilers, primitives, and adapters must use.

It does not implement:

- Runtime preview.
- Component migration.
- Persistence or sync.

## 1. Source-Of-Truth Hierarchy

Future Style Engine work must preserve this order:

```text
Style Contract
-> NexusStyleManifestV1
-> Safety Validator
-> Pure Compiler
-> CSS Variables / Recipe Variables / Adapter Config
-> Runtime Preview / Apply Boundary
-> Components / Primitives / React Flow Adapter
```

Components may consume:

- CSS variables.
- Primitive props.
- Recipe variables.
- Controlled adapter config.

Components may not consume:

- Raw style documents.
- AI draft output.
- Raw manifests.
- Raw arbitrary CSS.
- Dynamic Tailwind classes generated from a manifest.
- Workspace/sync/backend persistence models.

## 2. Naming Rules

Semantic names use dot paths in docs and future manifest data:

```text
surface.app
text.primary
accent.primary
graph.node.agent.surface
```

Runtime CSS variable names should use a future namespaced form:

```text
--nexus-surface-app
--nexus-text-primary
--nexus-accent-primary
--nexus-graph-node-agent-surface
```

Legacy CSS variables remain supported during the bridge period:

```text
--bg-base
--panel-bg
--text-main
--theme-primary
```

Rule:

New contract names must not be preset-specific. Avoid names like
`surface-shellCyan`, `appleGlass`, or `terminalGreen`.

## 3. Foundation Token Groups

### Surface

| Semantic token | Legacy source | Meaning |
| --- | --- | --- |
| `surface.app` | `--bg-base` | Root app background. |
| `surface.raised` | `--bg-elevated` | Elevated low-level surface. |
| `surface.workspace` | `--bg-workspace` | Workspace canvas base. |
| `surface.shell` | `--shell-surface` | App shell background stack. |
| `surface.panel` | `--panel-bg` | Primary panel surface. |
| `surface.panelMuted` | `--panel-muted` | Low-contrast panel fill. |
| `surface.overlay` | future recipe variable | Modal/sidebar overlay fill. |
| `surface.input` | future recipe variable | Input and textarea fill. |

### Text

| Semantic token | Legacy source | Meaning |
| --- | --- | --- |
| `text.primary` | `--text-main` | Primary readable copy. |
| `text.secondary` | `--text-soft` | Secondary labels and support text. |
| `text.muted` | `--text-muted` | Muted metadata. |
| `text.inverse` | future derived token | Text on strong accent surfaces. |
| `text.danger` | `--theme-danger` | Error/destructive text. |
| `text.success` | `--theme-success` | Success text. |
| `text.warning` | `--theme-warning` | Warning text. |

### Accent And Status

| Semantic token | Legacy source | Meaning |
| --- | --- | --- |
| `accent.primary` | `--theme-primary` | Main interactive accent. |
| `accent.primaryStrong` | `--theme-primary-strong` | Strong accent, focus, graph edge. |
| `accent.secondary` | `--theme-secondary` | Secondary accent. |
| `status.success` | `--theme-success` | Success state. |
| `status.warning` | `--theme-warning` | Warning state. |
| `status.danger` | `--theme-danger` | Error/destructive state. |
| `status.info` | `--theme-primary` | Informational state. |

### Border, Shadow, Radius, Blur

| Semantic token | Legacy source | Meaning |
| --- | --- | --- |
| `border.subtle` | `--border-subtle` | Default low-contrast border. |
| `border.glow` | `--border-glow` | Accent border/glow source. |
| `border.focus` | future derived token | Keyboard/focus boundary. |
| `border.width` | `--border-width` | Legacy micro-control width. |
| `shadow.panel` | `--shadow-panel` | Panel elevation. |
| `shadow.glow` | `--shadow-glow` | Accent glow. |
| `shadow.modal` | future recipe variable | Modal elevation. |
| `shadow.window` | future recipe variable | Window elevation. |
| `radius.base` | `--radius-base` | Base shape. |
| `radius.surface` | `--surface-radius` | Applied surface radius. |
| `blur.glass` | `--glass-blur` | Glass/material blur. |
| `blur.backdrop` | `--backdrop-blur` | Backdrop blur source. |

### Workspace And Motion

| Semantic token | Legacy source | Meaning |
| --- | --- | --- |
| `workspace.gridPrimary` | `--workspace-grid-primary` | Primary workspace grid line. |
| `workspace.gridSecondary` | `--workspace-grid-secondary` | Secondary workspace grid line. |
| `workspace.wash` | `--workspace-wash` | Workspace atmospheric wash. |
| `motion.duration.fast` | future token | Small hover/focus motion. |
| `motion.duration.normal` | future token | Standard panel/modal motion. |
| `motion.easing.standard` | future token | Default easing. |
| `density.control.sm` | future token | Small control height/padding. |
| `density.control.md` | future token | Standard control height/padding. |
| `density.panel.compact` | future token | Compact panel density. |

## 4. Component Recipe Groups

Recipes translate semantic tokens into component-level variables. Recipes may
contain visual state, but not behavior props.

### `recipe.panel`

Required slots:

- `surface`
- `surfaceMuted`
- `border`
- `shadow`
- `radius`
- `blur`
- `text`

Early candidate: `.nexus-panel`.

### `recipe.button`

Required states:

- `default`
- `hover`
- `focus`
- `active`
- `selected`
- `disabled`
- `destructive`

Allowed values:

- surface color
- border color
- text color
- focus ring color
- shadow/glow

Forbidden values:

- click handlers
- disabled logic
- `aria-*`
- layout dimensions outside a density recipe

### `recipe.input`

Required states:

- `default`
- `hover`
- `focus`
- `disabled`
- `invalid`

Allowed values:

- surface
- border
- text
- placeholder
- focus border/ring

Forbidden values:

- `value`
- validation logic
- password handling
- browser autocomplete behavior

### `recipe.badge`

Required variants:

- `neutral`
- `info`
- `success`
- `warning`
- `danger`
- `selected`

### `recipe.window`

Required slots:

- `surface`
- `chrome`
- `chromeText`
- `border`
- `shadow`
- `radius`
- `handleVisual`

Forbidden:

- drag handle class names
- bounds
- z-index state
- resize enablement
- pointer-events

### `recipe.modal`

Required slots:

- `backdrop`
- `surface`
- `border`
- `shadow`
- `titleText`
- `bodyText`
- `dangerSurface`

Forbidden:

- focus trap behavior
- close behavior
- `role`
- `aria-modal`
- z-index tier changes

### `recipe.dock`

Required slots:

- `surface`
- `itemDefault`
- `itemHover`
- `itemActive`
- `itemText`
- `itemIcon`

Forbidden:

- panel open/close state
- hit area changes before a density gate

## 5. React Flow Adapter Tokens

React Flow uses adapter tokens, not general component recipes.

Required groups:

- `graph.background`
- `graph.node.agent`
- `graph.node.runtime`
- `graph.handle.source`
- `graph.handle.target`
- `graph.edge.default`
- `graph.edge.selected`
- `graph.edge.deleteButton`
- `graph.minimap`
- `graph.controls`

Forbidden:

- pan/zoom config
- node drag config
- selection behavior
- edge connection logic
- handle ids
- hit path width
- arbitrary selectors
- `pointer-events`

See `docs/style-system/react-flow-style-boundary.md`.

## 6. Tailwind Bridge Rule

Tailwind remains for:

- layout
- stable responsive scaffolding
- spacing until density recipes own a component
- variable-backed utility compatibility

Tailwind must not become:

- a runtime compiler target
- a manifest interpreter
- a dynamic string generator from style data

Existing `@theme inline` and `tailwind.config.ts` mappings should stay as a
legacy bridge until component coverage is proven.

## 7. Preview / Apply / Save / Persist Rule

This contract does not authorize persistence.

Definitions:

- Preview: local visual experiment only.
- Apply: explicit runtime style choice.
- Save: named style asset, future contract.
- Persist: backend durable model, V13+ only.

Contract rule:

`NexusStyleManifestV1` and compiled outputs must not be stored in
`workspace.themeConfig`, `NexusWorkspace`, `ActiveUiStateSnapshot`, Supabase
snapshots, or `workspace_state_entities` during V1-V12.

## 8. Accessibility Minimums

Every future manifest/recipe must preserve:

- readable text contrast for primary/secondary/muted text
- visible keyboard focus
- disabled state distinction
- destructive action distinction
- reduced-motion compatibility path
- non-color-only status distinction where practical

Validator work in V3 should define measurable thresholds.

## 9. Contract Acceptance Gate

V2 passes when:

- Current surface-shell baseline can be mapped without component-specific color names.
- At least one non-surface-shell preset can be mapped through the same semantic groups.
- Components are forbidden from importing raw manifest or AI drafts.
- Runtime Tailwind class generation is explicitly forbidden.
- Preview/apply/save/persist boundaries remain intact.
- React Flow uses adapter-specific tokens.
- Pure contract/schema/compiler code remains side-effect-free.
- No component migration, persistence schema, package, deploy, or `exports/**` files are changed.

## 10. Next Phase Inputs

V3 manifest and validator docs should consume:

- This contract.
- `docs/style-system/style-surface-audit.md`
- `docs/style-system/hardcoded-visual-token-inventory.md`
- `docs/style-system/react-flow-style-boundary.md`
- `docs/style-system/style-engine-preview-apply-persist-boundary.md`
- `docs/style-system/style-engine-protected-behavior-ledger.md`
