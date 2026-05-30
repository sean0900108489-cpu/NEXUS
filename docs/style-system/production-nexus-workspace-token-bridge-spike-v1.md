# Production `.nexus-workspace` Color-Only Token Bridge Spike V1

Status: narrow production-facing visual spike
Scope: `.nexus-workspace` background, grid, and wash color adoption only
Branch: `codex/v18-style-pack-contract-prep`

## 1. Purpose

This spike is the third production-facing token bridge cut. It follows the
`.nexus-panel` and `.nexus-glass` spikes, but keeps an even narrower authority:
workspace background color, grid line colors, and visual wash only.

The goal is not to skin the workspace canvas, React Flow, or shell behavior. It
is only to make the existing `.nexus-workspace` visual primitive ready to
consume bridge-compatible CSS variables while preserving the cyberpunk baseline
fallback.

## 2. Surface Boundary

Allowed surface:

- `.nexus-workspace` in `src/app/globals.css`
- isolated `.nexus-workspace` compatibility specimen in Style Lab

Known production consumer:

- workspace wrapper in `src/components/nexus/nexus-ops.tsx`

Forbidden for this spike:

- class name changes
- layout, sizing, positioning, overflow, scroll, pointer-events, z-index, focus
- grid size or background-size changes
- React Flow classes, props, canvas behavior, pan, zoom, node, or edge behavior
- workspace store, sync, backend, Supabase, Vercel, GitHub, export, or
  persistence writes
- raw CSS, raw JS, DOM selector, behavior class, or backend mutation

## 3. Variable Mapping

| Workspace visual slot | Primary bridge-ready variable | Fallback chain | Notes |
| --- | --- | --- | --- |
| Background color | `--nexus-workspace-bg` | `--bg-workspace` | Color only; still used inside the existing translucent `color-mix`. |
| Primary grid line | `--nexus-workspace-grid-primary` | `--workspace-grid-primary` | Line color only; grid size remains fixed by existing CSS. |
| Secondary grid line | `--nexus-workspace-grid-secondary` | `--workspace-grid-secondary` | Line color only; grid size remains fixed by existing CSS. |
| Workspace wash | `--nexus-workspace-wash` | `--workspace-wash` | Color-only source is converted into a controlled solid gradient layer; no URL or asset authority. |

The CSS should keep nested fallbacks so either future surface-specific bridge
variables or the current bridge plan's scoped legacy variables can drive the
workspace visual primitive:

```css
background-color:
  color-mix(in srgb, var(--nexus-workspace-bg, var(--bg-workspace)) 82%, transparent);
background-image:
  linear-gradient(var(--nexus-workspace-grid-primary, var(--workspace-grid-primary)) 1px, transparent 1px),
  linear-gradient(90deg, var(--nexus-workspace-grid-secondary, var(--workspace-grid-secondary)) 1px, transparent 1px),
  var(--nexus-workspace-wash, var(--workspace-wash));
background-size:
  44px 44px, 44px 44px, 100% 100%;
```

## 4. Glow And Geometry Policy

Not added in this spike:

- workspace glow variables
- grid size variables
- canvas scale variables
- scroll/overflow variables
- React Flow background variables
- asset or texture variables
- animation variables

Reason: those either affect geometry, performance, canvas behavior, or the
future asset/texture pipeline. This spike is color-only.

## 5. Fallback Policy

If no bridge variables are present:

- `.nexus-workspace` resolves to the existing cyberpunk baseline through
  `--bg-workspace`, `--workspace-grid-primary`,
  `--workspace-grid-secondary`, and `--workspace-wash`
- existing theme presets remain compatible
- production workspace layout and behavior are unchanged

If a bridge preview is active only on an isolated Style Lab target:

- variables are scoped to that injected target
- `.nexus-workspace` compatibility specimen changes because its fallback chain
  can read the bridge plan's surface aliases and legacy workspace variables
- the wash token remains color-only at the Skin Pack level; the bridge helper
  emits a controlled solid gradient layer so it is valid in `background-image`
- revert removes scoped variables and returns to baseline

## 6. Verification

Required checks:

- `git diff --check`
- `npm run test -- src/lib/style-engine`
- `npm run typecheck`
- `npm run lint -- src/components/style-engine/nexus-style-lab.tsx src/lib/style-engine`
- `npm run build`
- Browser smoke `/style-lab`

Browser smoke must verify:

- Minimal accepted
- Pixel accepted
- invalid rejected
- token preview/revert still works
- bridge preview/revert still works
- `.nexus-panel` compatibility specimen still changes and restores
- `.nexus-glass` compatibility specimen still changes and restores
- `.nexus-workspace` compatibility specimen changes under bridge preview
- revert restores baseline
- console errors are 0
