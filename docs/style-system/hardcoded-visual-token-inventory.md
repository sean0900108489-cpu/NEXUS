# NEXUS Hardcoded Visual Token Inventory

Phase: V1 - Style Surface Audit
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: documentation-only inventory.

## 0. Purpose

This inventory identifies hardcoded visual values that can become future semantic
tokens, recipe variables, or adapter values. It intentionally does not recommend
global search-and-replace.

## 1. Scan Summary

Read-only scan patterns included:

```text
bg-*, text-*, border-*, shadow-[...], backdrop-blur, font-mono,
tracking-[...], hex colors, rgba(), rgb()
```

Approximate match counts from the focused scan:

| File | Visual matches |
| --- | ---: |
| `src/components/nexus/nexus-ops.tsx` | 410 |
| `src/app/globals.css` | 64 |
| `src/components/nexus/nexus-graph.tsx` | 57 |
| `src/components/nexus/AgentBranchModal.tsx` | 55 |
| `src/components/nexus/PromptVaultManager.tsx` | 33 |
| `src/components/nexus/auth-screen.tsx` | 13 |
| `src/components/nexus/DatapadWindow.tsx` | 10 |
| `tailwind.config.ts` | 1 |

Behavior/layout-sensitive match counts from the focused scan:

| File | Protected-style matches |
| --- | ---: |
| `src/components/nexus/nexus-ops.tsx` | 104 |
| `src/app/globals.css` | 28 |
| `src/components/nexus/nexus-graph.tsx` | 21 |
| `src/components/nexus/AgentBranchModal.tsx` | 12 |
| `src/components/nexus/DatapadWindow.tsx` | 7 |
| `src/components/nexus/PromptVaultManager.tsx` | 6 |
| `src/components/nexus/auth-screen.tsx` | 3 |
| `src/app/layout.tsx` | 1 |

Interpretation:

- `nexus-ops.tsx` is the dominant visual mass and must be mapped before migration.
- `nexus-graph.tsx` has fewer matches but much higher behavioral coupling.
- `globals.css` already absorbs many old Tailwind colors through CSS variables.

## 2. Current Legacy Variable Layer

Primary variables already present in `src/app/globals.css`:

| Group | Variables | Future slot direction |
| --- | --- | --- |
| App surfaces | `--bg-base`, `--bg-elevated`, `--bg-workspace`, `--shell-surface` | `surface.app`, `surface.raised`, `surface.workspace`, `surface.shell` |
| Panels | `--panel-bg`, `--panel-muted` | `surface.panel`, `surface.panelMuted` |
| Text | `--text-main`, `--text-soft`, `--text-muted` | `text.primary`, `text.secondary`, `text.muted` |
| Accent | `--theme-primary`, `--theme-primary-strong`, `--theme-secondary` | `accent.primary`, `accent.primaryStrong`, `accent.secondary` |
| Status | `--theme-success`, `--theme-warning`, `--theme-danger` | `status.success`, `status.warning`, `status.danger` |
| Borders | `--border-subtle`, `--border-glow`, `--border-width` | `border.subtle`, `border.glow`, `border.width` |
| Material | `--shadow-panel`, `--shadow-glow`, `--backdrop-blur`, `--glass-blur` | `shadow.panel`, `shadow.glow`, `blur.glass` |
| Shape | `--radius-base`, `--surface-radius` | `radius.base`, `radius.surface` |
| Typography | `--font-main`, Geist font variables | `typography.interface`, `typography.mono` |
| Workspace | `--workspace-grid-primary`, `--workspace-grid-secondary`, `--workspace-wash` | `workspace.gridPrimary`, `workspace.gridSecondary`, `workspace.wash` |

Important rule:

The existing variables are a Legacy Bridge V0. They should be bridged, not deleted.

## 3. Hardcoded Token Families

### Color Utilities

Common families:

- `bg-slate-950/*`, `bg-black/*`, `bg-white/[...]`
- `bg-cyan-300/*`, `bg-fuchsia-300/*`, `bg-emerald-300/*`, `bg-amber-300/*`, `bg-rose-300/*`
- `text-slate-*`, `text-cyan-*`, `text-fuchsia-*`, `text-emerald-*`, `text-amber-*`, `text-rose-*`, `text-white`
- `border-white/*`, `border-cyan-300/*`, `border-fuchsia-300/*`, `border-emerald-300/*`, `border-amber-300/*`, `border-rose-300/*`

Future mapping:

- `text-slate-*` should become text hierarchy slots.
- Cyan/fuchsia/emerald/amber/rose should become accent/status/intent slots, not preset-specific names.
- `bg-black/*` and `bg-white/*` need surface hierarchy mapping because opacity often encodes depth.

### Hardcoded Graph Colors

Anchors:

- Runtime handles use `#f0abfc` and `#22d3ee`: `src/components/nexus/nexus-graph.tsx:293`.
- Edge defaults use `#22d3ee`: `src/components/nexus/nexus-graph.tsx:858`.
- Graph background uses `rgba(34, 211, 238, 0.22)`: `src/components/nexus/nexus-graph.tsx:923`.
- Minimap mask uses `rgba(2, 6, 23, 0.76)`: `src/components/nexus/nexus-graph.tsx:925`.
- Minimap node fallback uses `#22d3ee`: `src/components/nexus/nexus-graph.tsx:926`.

Future mapping:

- `graph.edge.default`
- `graph.edge.selected`
- `graph.handle.source`
- `graph.handle.target`
- `graph.background.grid`
- `graph.minimap.mask`
- `graph.minimap.nodeFallback`

### Shadow Values

Common patterns:

- Deep black elevation shadows.
- Cyan/fuchsia/emerald/rose glows.
- `shadow-[...]` with explicit `rgba()`.

Future mapping:

- `shadow.panel`
- `shadow.window`
- `shadow.modal`
- `shadow.focus`
- `shadow.accentGlow`
- `shadow.statusDanger`

Guard:

Do not migrate shadows on drag windows or modals before z-index/overlay behavior smoke exists.

### Blur / Glass

Current anchors:

- Global variables: `--backdrop-blur`, `--glass-blur`.
- Many components use `backdrop-blur-xl`, `backdrop-blur-md`, `backdrop-blur-sm`.
- `globals.css` already overrides blur classes under `.nexus-shell`.

Future mapping:

- `material.glass.blur`
- `material.panel.opacity`
- `material.overlay.opacity`

Guard:

Blur affects readability, stacking perception, and performance. Treat as recipe-level, not global raw replacement.

### Typography / Density

Common patterns:

- `font-mono`
- `uppercase`
- `tracking-[0.12em]` through `tracking-[0.28em]`
- `text-[9px]`, `text-[10px]`, `text-[11px]`

Future mapping:

- `typography.label.font`
- `typography.label.size`
- `typography.label.transform`
- `typography.label.tracking`
- `density.control.sm`
- `density.panel.compact`

Guard:

Label typography is visual, but size/tracking/line-height can affect layout and overflow. Migrate through component recipes.

## 4. First Low-Risk Token Candidates

Good candidates for V2 contract:

| Candidate | Reason |
| --- | --- |
| `surface.panel` | Already backed by `.nexus-panel` and `--panel-bg`. |
| `surface.glass` | Already backed by `.nexus-glass` and blur variables. |
| `text.primary/secondary/muted` | Already exists as CSS variables and Tailwind bridge. |
| `accent.primary/secondary` | Already exists as `--theme-primary` and `--theme-secondary`. |
| `status.success/warning/danger` | Already exists as theme variables and repeated utility families. |
| `border.subtle/glow` | Already exists globally. |
| `shadow.panel/glow` | Already exists globally. |
| `radius.surface` | Already exists globally and controlled by LEGO micro-controls. |

Do not start with:

- `window.chrome` full migration.
- `modal.overlay` full migration.
- `graph.node` full migration.
- Any store/sync/persistence token.

## 5. No-Touch Auto-Migration List

These are blocked from automated replacement:

- `fixed`, `absolute`, `relative`, `inset-*`, `z-*`, `overflow-*`.
- `pointer-events-*`, `cursor-*`, `select-none`, `resize-none`.
- `nodrag`, `nopan`, `nowheel`.
- React Flow classes and selectors.
- `role`, `aria-*`, `data-*`, `tabIndex`.
- `workspace.themeConfig`, `updateThemeConfig`, sync queue paths.

## 6. V2 Inputs

The V2 Style Contract should define:

- Foundation variables.
- Semantic surface/text/accent/status/border/shadow/radius/blur groups.
- Component recipe groups for panel, button, input, badge, window, modal, dock.
- Adapter token groups for React Flow.
- Explicit forbidden dynamic Tailwind class generation.
- Explicit ban on component direct manifest imports.
