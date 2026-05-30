# Production `.nexus-workspace` Color-Only Token Bridge Spike Checkpoint

Date: 2026-05-30
Branch: `codex/v18-style-pack-contract-prep`
Starting HEAD: `23c2cd8 feat: add nexus glass token bridge spike`

## What Changed

- Added `docs/style-system/production-nexus-workspace-token-bridge-spike-v1.md`.
- Updated `.nexus-workspace` in `src/app/globals.css` to consume
  bridge-ready background, grid, and wash aliases with existing legacy
  fallbacks.
- Added an isolated `.nexus-workspace` compatibility specimen inside the Style
  Lab Production Bridge Readiness target.
- Updated `docs/style-system/production-token-bridge-readiness-map-v1.md` with
  workspace color-only spike status.

## `.nexus-workspace` Bridge Variables

`.nexus-workspace` now resolves:

- background color: `--nexus-workspace-bg`, fallback to `--bg-workspace`
- primary grid line: `--nexus-workspace-grid-primary`, fallback to
  `--workspace-grid-primary`
- secondary grid line: `--nexus-workspace-grid-secondary`, fallback to
  `--workspace-grid-secondary`
- visual wash: `--nexus-workspace-wash`, fallback to `--workspace-wash`

The wash source remains color-only in the Skin Pack. The bridge helper emits a
controlled solid gradient layer from that validated color so `.nexus-workspace`
can keep using `background-image` without accepting raw CSS, URLs, or assets.

No workspace glow, grid size, background-size, layout, sizing, scroll,
overflow, pointer, z-index, React Flow, canvas, store, sync, backend, or
Supabase behavior was changed.

## Fallback Behavior

If no bridge variables are present, `.nexus-workspace` resolves to existing
cyberpunk baseline variables in `:root, [data-theme="cyberpunk"]`.

If bridge preview is active in Style Lab, the isolated target receives legacy
bridge variables such as `--bg-workspace`, `--nexus-workspace-bg`,
`--workspace-grid-primary`, `--nexus-workspace-grid-primary`,
`--workspace-grid-secondary`, `--nexus-workspace-grid-secondary`,
`--workspace-wash`, and `--nexus-workspace-wash`. The compatibility specimen
changes because the `.nexus-workspace` aliases can read those scoped variables.

Revert removes the scoped bridge variables and returns the specimen to
baseline.

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
- `.nexus-panel` compatibility specimen still works.
- `.nexus-glass` compatibility specimen still works.
- `.nexus-workspace` compatibility specimen changes under bridge preview.
- `.nexus-workspace` background image remains valid and rendered as grid/wash
  gradient layers under bridge preview.
- Revert restores baseline.
- Browser console errors: 0.

## Next Suggested Surface

After this spike, the next round should move from color-only primitives toward
the Workspace Layout Slot / Page Shell Boundary. That should remain a separate
phase-gated task because layout, shell composition, and asset background
governance have broader rollback and verification needs.
