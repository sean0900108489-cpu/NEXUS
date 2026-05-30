# Production `.nexus-panel` Token Bridge Spike V1

Status: narrow production-facing visual spike
Scope: `.nexus-panel` CSS variable adoption only
Branch: `codex/v18-style-pack-contract-prep`

## 1. Purpose

This spike is the first production-facing token bridge cut. It does not connect
Skin Pack apply, persistence, workspace state, backend, Supabase, React Flow, or
agent behavior. It only makes the existing `.nexus-panel` visual primitive ready
to consume bridge-compatible CSS variables while preserving the cyberpunk
baseline fallback.

## 2. Surface Boundary

Allowed surface:

- `.nexus-panel` in `src/app/globals.css`

Known production consumers:

- collapsed sidebar rail
- Agent Bay shell
- Ops Matrix shell
- command palette shell

Forbidden for this spike:

- class name changes
- layout changes
- position, overflow, z-index, pointer-events, focus, drag, resize
- React Flow selectors or behavior
- agent/window/datapad behavior
- workspace store, sync, backend, Supabase, Vercel, GitHub, export, or
  persistence writes

## 3. Variable Mapping

| Panel visual slot | Primary bridge-ready variable | Existing fallback | Notes |
| --- | --- | --- | --- |
| Background/surface | `--nexus-panel-bg` | `--panel-bg` | Maps to V2 `--nexus-surface-panel` through the production bridge plan's legacy `--panel-bg` output. |
| Border color | `--nexus-panel-border` | `--border-subtle` | Color only; border width remains owned by existing theme controls. |
| Text color | `--nexus-panel-text` | `--text-main` | Adds explicit inherited panel foreground fallback without changing behavior. |
| Radius | `--nexus-panel-radius` | `--surface-radius` | Radius only; no geometry/layout authority. |
| Shadow | `--nexus-panel-shadow` | `--shadow-panel` | Allowed as panel shadow; must stay inside Render Plan budget diagnostics. |
| Blur | `--nexus-panel-blur` | `--glass-blur` | Allowed as backdrop blur value only; no scheduler or perf claim in this spike. |

The CSS should keep nested fallbacks so either future surface-specific bridge
variables or the current bridge plan's legacy variables can drive the panel:

```css
background: var(--nexus-panel-bg, var(--panel-bg));
border: var(--border-width) solid var(--nexus-panel-border, var(--border-subtle));
border-radius: var(--nexus-panel-radius, var(--surface-radius));
box-shadow: var(--nexus-panel-shadow, var(--shadow-panel));
color: var(--nexus-panel-text, var(--text-main));
backdrop-filter: blur(var(--nexus-panel-blur, var(--glass-blur)));
```

## 4. Shadow And Glow Policy

Allowed:

- `--nexus-panel-shadow`
- fallback to `--shadow-panel`

Not added in this spike:

- dedicated panel glow variable
- animation or pulse effects
- React Flow glow
- agent/window/datapad glow intensity

Reason: panel shadow is already part of the primitive. Glow-specific surfaces
need separate recipe/performance coverage.

## 5. Fallback Policy

If no bridge variables are present:

- `.nexus-panel` resolves to existing cyberpunk baseline variables in
  `:root, [data-theme="cyberpunk"]`
- existing theme presets continue to work through `--panel-bg`,
  `--border-subtle`, `--text-main`, `--surface-radius`, `--shadow-panel`, and
  `--glass-blur`

If a bridge preview is active only on an isolated Style Lab target:

- variables are scoped to that injected target
- `.nexus-panel` compatibility specimen changes inside that target
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
- `.nexus-panel` compatibility specimen changes under bridge preview
- revert restores baseline
- console errors are 0
