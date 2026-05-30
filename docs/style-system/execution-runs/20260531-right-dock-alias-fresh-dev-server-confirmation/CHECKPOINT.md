# Right Dock Alias Fresh Dev Server Confirmation

## Scope

Runtime confirmation only. No source, package/config/deploy, Supabase/database, or export files were modified.

## Preflight

- Branch confirmed: `codex/v18-style-pack-contract-prep`.
- Working tree started clean.
- HEAD included both prerequisite commits:
  - `7fd4575`
  - `a475b71`

## Dev Server Handling

- Browser hard reload / cache-busting navigation was not enough.
  - The authenticated NexusOps UI was visible.
  - `.nexus-right-floating-dock-rail` existed in the DOM.
  - The loaded CSS bundle was still stale and did not expose `.nexus-right-floating-dock-rail` or `--nexus-right-dock-bg`.
- Restart was required.
- Restart safety was confirmed before stopping anything:
  - The port 3000 listener was a Next dev server for `/Users/sean/Documents/FreeChat`.
  - The parent command was `node /Users/sean/Documents/FreeChat/node_modules/.bin/next dev`.
  - The process cwd was `/Users/sean/Documents/FreeChat`.
  - Only that repo-local dev server process pair was terminated.
- A single fresh dev server was started with `npm run dev`.

## Runtime CSS Confirmation

Fresh runtime loaded CSS confirmed:

- `.nexus-right-floating-dock-rail`: present in loaded stylesheet rules.
- `--nexus-right-dock-bg`: present in loaded stylesheet rules.
- The right dock rail DOM selector matched.
- Baseline computed rail styles after revert:
  - background: `rgba(2, 6, 23, 0.9)`
  - border color: `rgba(103, 232, 249, 0.25)`
  - shadow: `rgba(0, 0, 0, 0.45) 0px 18px 60px 0px, rgba(34, 211, 238, 0.14) 0px 0px 32px 0px`
  - radius: `0px`
  - backdrop filter: `blur(8px)`

## Visual Apply / Revert

- Temporary CSS variables were applied only in the browser DevTools console on `document.documentElement`:
  - `--nexus-right-dock-bg: rgb(255 0 128 / 0.9)`
  - `--nexus-right-dock-border: rgb(0 255 255 / 0.95)`
  - `--nexus-right-dock-shadow: 0 0 24px rgb(255 0 128 / 0.8)`
  - `--nexus-right-dock-radius: 18px`
- The right floating dock rail visibly changed to the magenta/cyan probe styling.
- The temporary CSS variables were removed from `document.documentElement`.
- The right dock rail returned to the cyberpunk baseline.
- Final root inline style check showed no right-dock probe variables remaining.
- No preview state was persisted and no workspace data was intentionally mutated.

## Console / Runtime Notes

- Console error count was not zero during this browser pass.
- DevTools showed existing runtime errors/warnings unrelated to the right dock alias probe, including:
  - repeated `https://cdn.example.com/nexus/bg-cyberpunk.webp` load failures,
  - a React client script-tag warning from `theme-provider.tsx`,
  - a hydration mismatch between `NEXUS // AI OPS` and `NEXUS // AI 作戰`.
- Because the strict `console errors = 0` gate was not satisfied, this pass confirms alias CSS loading and visual apply/revert, but does not certify the page as console-clean.

## Result

- Hard reload was not enough.
- Fresh dev server restart was required and safely scoped to this repo.
- Runtime CSS alias loading: confirmed.
- Right dock visual apply/revert: confirmed.
- Console-clean gate: not passed due to pre-existing runtime errors/warnings observed in DevTools.

## Recommendation

Do not proceed to the next production token alias solely from this pass unless the existing console/hydration baseline is accepted or separately triaged. The right dock alias mechanism itself is confirmed on a fresh dev server.
