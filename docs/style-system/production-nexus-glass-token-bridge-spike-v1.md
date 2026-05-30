# Production `.nexus-glass` Token Bridge Spike V1

Status: narrow production-facing visual spike
Scope: `.nexus-glass` CSS variable adoption only
Branch: `codex/v18-style-pack-contract-prep`

## 1. Purpose

This spike is the second production-facing token bridge cut. It follows the
`.nexus-panel` spike and keeps the same boundary: no Skin Pack apply,
persistence, workspace state, backend, Supabase, React Flow, drag/resize,
focus, z-index, or agent behavior.

The goal is only to make the existing `.nexus-glass` visual primitive ready to
consume bridge-compatible CSS variables while preserving the cyberpunk baseline
fallback.

## 2. Surface Boundary

Allowed surface:

- `.nexus-glass` in `src/app/globals.css`

Current usage:

- No direct production TSX class usage was found in this spike scan.
- `.nexus-glass` remains part of global shell transition/blur selectors.
- Style Lab gets an isolated compatibility specimen for bridge smoke.

Forbidden for this spike:

- class name changes
- layout changes
- position, overflow, z-index, pointer-events, focus, drag, resize
- React Flow selectors or behavior
- agent/window/datapad behavior
- workspace store, sync, backend, Supabase, Vercel, GitHub, export, or
  persistence writes

## 3. Variable Mapping

| Glass visual slot | Primary bridge-ready variable | Fallback chain | Notes |
| --- | --- | --- | --- |
| Background/surface | `--nexus-glass-bg` | `color-mix(in srgb, var(--nexus-panel-bg, var(--panel-bg)) 82%, transparent)` | Keeps existing translucent panel surface behavior. |
| Border color | `--nexus-glass-border` | `--nexus-panel-border`, then `--border-subtle` | Color only; border width remains owned by existing theme controls. |
| Text color | `--nexus-glass-text` | `--nexus-panel-text`, then `--text-main` | Visual foreground fallback only. |
| Radius | `--nexus-glass-radius` | `--nexus-panel-radius`, then `--surface-radius` | Radius only; no geometry/layout authority. |
| Blur/backdrop | `--nexus-glass-blur` | `--nexus-panel-blur`, then `--glass-blur` | Backdrop blur value only; no scheduler or performance claim in this spike. |

The CSS should keep nested fallbacks so either future surface-specific bridge
variables or the current bridge plan's scoped legacy variables can drive glass:

```css
background:
  var(--nexus-glass-bg, color-mix(in srgb, var(--nexus-panel-bg, var(--panel-bg)) 82%, transparent));
border:
  var(--border-width) solid var(--nexus-glass-border, var(--nexus-panel-border, var(--border-subtle)));
border-radius:
  var(--nexus-glass-radius, var(--nexus-panel-radius, var(--surface-radius)));
color:
  var(--nexus-glass-text, var(--nexus-panel-text, var(--text-main)));
backdrop-filter:
  blur(var(--nexus-glass-blur, var(--nexus-panel-blur, var(--glass-blur))));
```

## 4. Shadow And Glow Policy

Not added in this spike:

- `--nexus-glass-shadow`
- dedicated glass glow variable
- animation or pulse effects
- React Flow glow
- agent/window/datapad glow intensity

Reason: `.nexus-glass` currently has no shadow declaration. Adding a shadow or
glow would widen the visual effect surface beyond preserving the existing glass
primitive.

## 5. Fallback Policy

If no bridge variables are present:

- `.nexus-glass` resolves to the existing cyberpunk baseline through
  `--panel-bg`, `--border-subtle`, `--text-main`, `--surface-radius`, and
  `--glass-blur`
- existing theme presets remain compatible

If a bridge preview is active only on an isolated Style Lab target:

- variables are scoped to that injected target
- `.nexus-glass` compatibility specimen changes because its fallback chain can
  read the bridge plan's legacy `--panel-bg`, `--border-subtle`, `--text-main`,
  `--surface-radius`, and `--glass-blur`
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
- `.nexus-glass` compatibility specimen changes under bridge preview
- revert restores baseline
- console errors are 0
