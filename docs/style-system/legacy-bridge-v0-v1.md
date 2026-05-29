# NEXUS Legacy Bridge V0 to V1

Phase: V6 - Legacy Bridge
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: documentation-only bridge map. No CSS or Tailwind config changed.

## 0. Purpose

The Legacy Bridge lets the current NEXUS visual system keep working while the
Style Engine contract, manifest, compiler, preview, and primitives mature.

The bridge protects:

- existing `data-theme` presets
- current CSS variables
- Tailwind v4 `@theme inline` compatibility
- `tailwind.config.ts` variable mappings
- `.nexus-*` global style hooks
- React Flow visual overrides

It does not authorize deleting or replacing legacy CSS.

## 1. Current Legacy Stack

| Layer | Anchor | Role |
| --- | --- | --- |
| Tailwind config pointer | `src/app/globals.css:1` | Uses `@config "../../tailwind.config.ts"`. |
| Tailwind import | `src/app/globals.css:2` | Imports Tailwind. |
| `cyberpunk` preset | `src/app/globals.css:5` | Default dark baseline. |
| `apple` preset | `src/app/globals.css:45` | Light preset. |
| `tesla` preset | `src/app/globals.css:85` | Dark red/neutral preset. |
| `terminal` preset | `src/app/globals.css:125` | Dark terminal preset. |
| Tailwind inline bridge | `src/app/globals.css:170` | Maps Tailwind color/font utilities to CSS variables. |
| Theme provider | `src/components/theme-provider.tsx:9` | Sets `attribute="data-theme"`. |
| Theme option duplicate | `src/components/nexus/nexus-ops.tsx:211` | Duplicates preset registry in UI. |
| Tailwind config | `tailwind.config.ts:1` | Extends theme with variable-backed colors/shadows/radius/blur. |

## 2. Bridge Principles

1. Preserve existing presets.
2. Preserve existing variable names until migration coverage is proven.
3. Introduce namespaced V1 variables as additive aliases only.
4. Map legacy variables to semantic tokens before changing components.
5. Keep Tailwind as layout/structure plus compatibility bridge.
6. Do not generate runtime Tailwind class strings.
7. Do not delete React Flow global styles before adapter coverage exists.

## 3. Legacy Variable To Contract Map

| Legacy variable | V1 semantic token | Notes |
| --- | --- | --- |
| `--bg-base` | `surface.app` | Root app background. |
| `--bg-elevated` | `surface.raised` | Elevated base surface. |
| `--bg-workspace` | `surface.workspace` | Canvas/workspace background. |
| `--shell-surface` | `surface.shell` | Multi-layer shell background. |
| `--panel-bg` | `surface.panel` | Primary panel surface. |
| `--panel-muted` | `surface.panelMuted` | Low-contrast panel fill. |
| `--text-main` | `text.primary` | Main text. |
| `--text-soft` | `text.secondary` | Secondary text. |
| `--text-muted` | `text.muted` | Muted metadata. |
| `--theme-primary` | `accent.primary` | Main accent. |
| `--theme-primary-strong` | `accent.primaryStrong` | Focus/strong accent. |
| `--theme-secondary` | `accent.secondary` | Secondary accent. |
| `--theme-success` | `status.success` | Success state. |
| `--theme-warning` | `status.warning` | Warning state. |
| `--theme-danger` | `status.danger` | Error/destructive state. |
| `--border-subtle` | `border.subtle` | Default border. |
| `--border-glow` | `border.glow` | Accent border/glow. |
| `--border-width` | `border.width` | Legacy micro-control; pinned to default in UI normalization. |
| `--shadow-panel` | `shadow.panel` | Panel elevation. |
| `--shadow-glow` | `shadow.glow` | Accent glow. |
| `--radius-base` | `radius.base` | Base radius. |
| `--surface-radius` | `radius.surface` | Applied radius. |
| `--backdrop-blur` | `blur.backdrop` | Backdrop blur. |
| `--glass-blur` | `blur.glass` | Applied glass blur. |
| `--workspace-grid-primary` | `workspace.gridPrimary` | Main workspace grid. |
| `--workspace-grid-secondary` | `workspace.gridSecondary` | Secondary workspace grid. |
| `--workspace-wash` | `workspace.wash` | Workspace atmospheric wash. |
| `--font-main` | `typography.interface` | Current interface font. |
| `--icon-weight` | `icon.strokeWidth` | Lucide visual weight. |
| `--chat-panel-opacity` | `opacity.chatPanel` | Agent window content opacity. |
| `--agent-glow-intensity` | `graph.node.agent.glowIntensity` | Current UI exposes it; sanitizer drift exists. |

## 4. Tailwind Bridge Map

Current `@theme inline` already maps common Tailwind utilities:

| Tailwind family | Current bridge | Contract direction |
| --- | --- | --- |
| `background/foreground` | `--color-background`, `--color-foreground` | `surface.app`, `text.primary` |
| `primary` | `--color-primary` | `accent.primary` |
| `panel` | `--color-panel`, `--color-panel-muted` | `surface.panel`, `surface.panelMuted` |
| `border/glow` | `--color-border`, `--color-glow` | `border.subtle`, `border.glow` |
| `slate-*` | mapped to text/surface variables | text hierarchy and elevated surfaces |
| `cyan-*` | mapped to primary accent | `accent.primary` |
| `fuchsia-*` | mapped to secondary accent | `accent.secondary` |
| `emerald-*` | mapped to success | `status.success` |
| `amber-*` | mapped to warning | `status.warning` |
| `rose-*` / `red-500` | mapped to danger | `status.danger` |
| Geist fonts | literal font names | Keep per Next/Tailwind v4 parse-time behavior. |

Rule:

Do not remove this bridge until components have migrated to semantic recipes and
visual smoke proves no collapse across all legacy presets.

## 5. Preset Compatibility Notes

### Cyberpunk

Role:

- Default baseline.
- Primary compatibility target.
- Should be representable as `legacy-cyberpunk` manifest.

Risk:

- Many components visually assume cyan/fuchsia glow.
- Graph and dock visuals are tuned to this baseline.

### Apple

Role:

- Light mode compatibility proof.

Risk:

- Some hardcoded `text-white`, `bg-black`, and deep shadows may fight the light preset.
- Future contract must prove text/surface tokens work without component-specific cyberpunk names.

### Tesla

Role:

- Sharp dark preset with low radius.

Risk:

- Radius and glow behavior may expose layout/edge assumptions.

### Terminal

Role:

- Monospace terminal baseline with additional selector overrides.

Risk:

- Terminal-specific `.nexus-agent-node` and `.nexus-message-bubble` overrides must not be deleted until equivalent recipe/adapter coverage exists.

## 6. Additive Migration Strategy

Future implementation order:

1. Add namespaced V1 variables that mirror current legacy variables.
2. Compile `legacy-cyberpunk` into both namespaced and legacy variables.
3. Keep `data-theme` preset values as fallback.
4. Apply preview variables in a scoped local-only preview root.
5. Migrate one primitive/specimen to namespaced variables.
6. Only after coverage, reduce direct utility reliance component by component.

Forbidden:

- Deleting `data-theme` presets.
- Deleting `@theme inline`.
- Rewriting `tailwind.config.ts` before compiler/bridge tests.
- Replacing all `text-slate-*` or `bg-black/*` by search.
- Deleting React Flow selectors before adapter coverage.

## 7. Verification Gate For Future Bridge Code

When bridge code is implemented later:

- `legacy-cyberpunk` preview matches current baseline closely.
- Apple/Tesla/Terminal presets still switch with `next-themes`.
- Tailwind utility classes still resolve.
- `nexus-panel`, `nexus-glass`, agent windows, datapads, modals, and React Flow remain styled.
- No preview-only values enter `workspace.themeConfig`.
- Browser smoke covers desktop and narrow viewport.
- Graph pan/zoom/drag/select still works.

## 8. Acceptance Gate

V6 bridge map passes when:

- Legacy variables are mapped to V1 semantic tokens.
- Tailwind bridge behavior is documented.
- All four existing presets are preserved.
- Additive migration order is explicit.
- Deletion/rewrite traps are blocked.
- No runtime CSS, config, code, schema, package, deploy, or `exports/**` files are changed.
