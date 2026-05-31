# V19 Production Chrome Isolated Visual Smoke Harness Checkpoint

Task: `V19 Production Chrome Isolated Visual Smoke Harness`

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Starting HEAD: `e3447a7 feat: add production chrome token aliases`

## Why This Harness Was Needed

Loop 04 added AgentWindow chrome aliases, but local browser smoke on `/` could
only be partial because production auth correctly rendered the login gate before
real `AgentWindow` instances. That was not a styling regression; it was the
production auth boundary doing its job.

This round adds an isolated, non-production `/style-lab` smoke surface so
production chrome selectors and aliases can be visually apply/revert tested
without auth bypass, fake login, credentials, store, sync, backend, Supabase,
API routes, Rnd, React Flow, or production window behavior.

## Selected Placement

- `src/components/style-engine/nexus-style-lab.tsx`
- Added a `Production Chrome Smoke` panel inside the existing V2 specimen /
  production bridge area.
- The panel is static display-only and mounted only on `/style-lab`.

## Selectors And Classes Represented

- `.nexus-agent-window`
- `.nexus-drag-handle`
- `.nexus-top-bar-frame`
- `.nexus-right-floating-dock-rail`
- `.nexus-workspace`
- `.nexus-message-bubble`
- `.nexus-message-bubble-user`
- `.nexus-message-bubble-assistant`
- `.nexus-message-bubble-tool`

## Smoke Variables Used

- `--nexus-agent-window-bg`
- `--nexus-agent-window-border`
- `--nexus-agent-window-shadow`
- `--nexus-agent-window-radius`
- `--nexus-agent-window-handle-bg`
- `--nexus-agent-window-handle-border`
- `--nexus-top-bar-bg`
- `--nexus-top-bar-border`
- `--nexus-right-dock-bg`
- `--nexus-right-dock-border`
- `--nexus-workspace-bg`
- `--nexus-workspace-border`
- `--nexus-message-user-bg`
- `--nexus-message-assistant-bg`
- `--nexus-message-tool-bg`

## Implementation Notes

- Smoke variables apply only to `productionChromeSmokeTargetRef.current`.
- Apply uses `target.style.setProperty`.
- Revert uses `target.style.removeProperty`.
- No `document.documentElement`, `document.body`, localStorage, IndexedDB, store,
  sync, backend, Supabase, API, runtime persistence, auth, fake auth, Rnd,
  React Flow, or production component import was introduced.
- No production files or behavior-bearing Nexus components were edited.

## Changed Files

- `src/components/style-engine/nexus-style-lab.tsx`
- `src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v19-production-chrome-isolated-visual-smoke-harness/CHECKPOINT.md`

## Verification Results

- `git diff --check`: passed
- `npm run test -- src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts`:
  passed, 1 file / 3 tests
- `npm run typecheck`: passed
- `npm run lint -- src/components/style-engine/nexus-style-lab.tsx src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts src/app/globals.css`:
  passed for TS/TSX; `src/app/globals.css` was ignored by ESLint because the
  repo has no matching CSS lint config
- `npm run build`: passed
  - existing build warning: using edge runtime on a page disables static
    generation for that page

## Browser Smoke Result

Route: `http://127.0.0.1:3000/style-lab`

Result: passed.

Observed:

- Style Lab loaded without auth gate.
- `Production Chrome Smoke` panel rendered.
- Static AgentWindow chrome specimen was visible.
- TopBar, right dock, workspace, and user/assistant/tool message bubble
  specimens were visible.
- Target summary showed `9/9`.
- Clicking `Apply Smoke Vars` changed the static chrome visibly:
  - AgentWindow shifted to vivid purple/fuchsia chrome.
  - TopBar and right dock changed color.
  - message bubbles changed role surfaces.
- Clicking `Revert Smoke Vars` returned the panel to baseline.
- Dev server output showed `GET /style-lab 200`; no new panel console/server
  errors were observed.
- No `/` production route visit was needed for this smoke.
- No login, credentials, persistence, workspace mutation, store action, backend
  call, Supabase call, or API call was performed by this harness.

## AgentWindow Auth-Gated Gap

Resolved in isolated form:

- AgentWindow chrome aliases can now be visually apply/revert tested on
  `/style-lab` without rendering authenticated production `AgentWindow`
  instances.

Still partial for true production `/`:

- Real authenticated `AgentWindow` instances, live TopBar sync status, right dock
  active panels, workspace state, message history, and any interaction smoke
  still require a legitimate authenticated `/` session.

## Forbidden Boundaries Held

- no push
- no deploy
- no `.env` or secrets
- no package/config/deploy files
- no `exports/**`
- no Supabase/database/migrations
- no store/sync/backend/Supabase/API edits
- no React Flow / graph edits
- no drag/resize/focus/z-index/window/modal behavior edits
- no agent/business logic edits
- no workspace persistence edits
- no runtime token persistence
- no production auth changes
- no login, credentials, fake auth, or auth bypass

## Rollback Path

Revert this commit, or manually remove:

- `Production Chrome Smoke` constants, ref, state, handlers, and JSX from
  `src/components/style-engine/nexus-style-lab.tsx`
- `src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts`
- section 17 of `docs/style-system/production-shell-extraction-map-v1.md`
- this checkpoint

## Residual Risk

Estimated residual risk: 3%.

Reasoning:

- Scope is isolated to Style Lab and local React state.
- Source guard blocks forbidden imports and document-root mutation.
- Browser smoke verified visible apply/revert.
- Remaining risk is limited to Style Lab layout density or future selector drift.

## Next Recommended Target Seed

Command palette shell extraction-first remains the next high-ROI target:

- add a stable inert visual frame/selector only if it can avoid focus, overlay
  close, command execution, input state, z-index, and modal behavior
- after a safe selector/frame exists, add it to the `Production Chrome Smoke`
  harness for future visual apply/revert coverage
