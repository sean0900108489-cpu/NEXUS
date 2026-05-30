# Production `.nexus-panel` Token Bridge Spike Checkpoint

Date: 2026-05-30
Branch: `codex/v18-style-pack-contract-prep`
Starting HEAD: `20951ae docs: checkpoint production token bridge readiness`

## What Changed

- Added `docs/style-system/production-nexus-panel-token-bridge-spike-v1.md`.
- Updated `.nexus-panel` in `src/app/globals.css` to consume bridge-ready
  surface aliases with existing legacy fallbacks.
- Added an isolated `.nexus-panel` compatibility specimen inside the Style Lab
  Production Bridge Readiness target.
- Updated `docs/style-system/production-token-bridge-readiness-map-v1.md` with
  spike status.

## `.nexus-panel` Bridge Variables

`.nexus-panel` now resolves:

- background: `--nexus-panel-bg`, fallback `--panel-bg`
- border color: `--nexus-panel-border`, fallback `--border-subtle`
- text color: `--nexus-panel-text`, fallback `--text-main`
- radius: `--nexus-panel-radius`, fallback `--surface-radius`
- shadow: `--nexus-panel-shadow`, fallback `--shadow-panel`
- blur: `--nexus-panel-blur`, fallback `--glass-blur`

Border width remains owned by `--border-width`. No layout, position, overflow,
focus, z-index, drag, resize, React Flow, agent, store, sync, backend, or
Supabase behavior was changed.

## Fallback Behavior

If no bridge variables are present, `.nexus-panel` resolves to existing
cyberpunk baseline variables in `:root, [data-theme="cyberpunk"]`.

If bridge preview is active in Style Lab, the isolated target receives legacy
bridge variables such as `--panel-bg`, `--border-subtle`, `--text-main`,
`--surface-radius`, `--shadow-panel`, and `--glass-blur`. The compatibility
specimen changes because the `.nexus-panel` aliases fall back to those scoped
legacy variables.

Revert removes the scoped bridge variables and returns the specimen to baseline.

## Verification Results

- `git diff --check`: passed.
- `npm run test -- src/lib/style-engine`: passed, 23 files and 173 tests.
- `npm run typecheck`: passed.
- `npm run lint -- src/components/style-engine/nexus-style-lab.tsx src/lib/style-engine`: passed.
- `npm run build`: passed.
- Browser smoke `http://localhost:3000/style-lab`: passed.

Browser smoke confirmed:

- Minimal accepted.
- Pixel accepted.
- Invalid rejected.
- V2 token preview/revert still works.
- Production bridge panel preview/revert still works.
- `.nexus-panel` compatibility specimen changes under bridge preview.
- Revert restores baseline.
- Browser console errors: 0.

## Next Suggested Surface

After this spike, the next smallest production-facing surface should be
`.nexus-glass` or another panel-adjacent primitive, not shell assets, React
Flow, windows, recipes in production, layout presets, or persistence.
