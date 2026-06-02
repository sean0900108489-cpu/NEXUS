# V19 Production Skinning 40-to-60 ROI Loop 09 Checkpoint

Task:

- V19 Production Skinning 40-to-60 ROI Loop 09 - Datapad Inspector Shell
  Selector First

Starting point:

- Previous commit: `24f039a feat: add modal shell token aliases`
- Branch: `codex/v19-production-shell-style-upgrade`
- Pre-existing untracked file left untouched:
  `docs/style-system/v19-production-shell-style-required-reading.md`

Selected path:

- Path A: selector-only prep

Selected target:

- `DatapadWindow` inner visual shell

Why this target:

- Datapad/inspector chrome is a high ROI production information surface for the
  40-to-60 readiness stage.
- It is visible, window-like chrome that will need skin-pack control before
  readiness can move cleanly past the current band.
- The existing inner `section` is the safest selector target because it is below
  the Rnd drag/resize/z-index owner and above the title/content/footer chrome.

Ownership scan:

- Component: `src/components/nexus/DatapadWindow.tsx`.
- Mount owner: `src/components/nexus/nexus-ops.tsx`.
- `NexusOps` owns the open notebook id list, creates/toggles global datapads,
  and remains the production workspace coordinator.
- `DatapadWindow` owns notebook lookup, draft recovery, title/content draft
  state, save status, save/delete/close actions, focus-on-mount, bring-to-front,
  Rnd drag/resize wrapper, z-index style, title input, content textarea, and
  footer actions.
- The outer `Rnd` owns parent bounds, default frame, min dimensions, drag handle
  class, drag start, mouse/touch focus, resize behavior, and z-index.
- The inner `section` is the visible Datapad shell. It can receive a stable
  selector without changing children, handlers, refs, effects, state, Rnd props,
  z-index, focus, scroll, save, delete, close, upload/download, artifact, or
  persistence behavior.

Candidate ranking:

1. `DatapadWindow` inner visual shell
   - Highest ROI safe implementation target.
   - Adds a stable shell selector without touching Rnd/window ownership.
   - Browser/style-lab smoke clarity is good through a static specimen.
2. Right dock artifact/vault inspector panel in `nexus-ops.tsx`
   - High visibility, but behavior-bearing: active panel state, artifact fetch,
     refresh, copy actions, scroll area, and right-dock close behavior.
   - Deferred because it would require editing `nexus-ops.tsx` and touching
     action/persistence-adjacent surfaces.
3. Generic Datapad shell frame extraction
   - Useful future option, but extracting around `Rnd` would risk moving
     drag/resize/z-index/focus ownership.
   - Deferred in favor of selector-only prep.
4. Token aliases for Datapad shell
   - High ROI next step, but intentionally deferred because this loop is
     selector-first and should not combine selector prep with alias adoption.

Changed files:

- `src/components/nexus/DatapadWindow.tsx`
- `src/components/nexus/nexus-datapad-shell-selector.test.ts`
- `src/components/style-engine/nexus-style-lab.tsx`
- `src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v19-production-skinning-40-to-60-roi-loop-09/CHECKPOINT.md`

Selector result:

- Added `.nexus-datapad-shell` to the existing inner Datapad visual shell:
  `nexus-datapad-shell nexus-datapad-window flex h-full min-h-0 flex-col ...`.
- Added a static display-only `/style-lab` `Production Chrome Smoke` Datapad
  specimen using `.nexus-datapad-shell`, `.nexus-datapad-window`, and the
  existing `.datapad-drag-handle`.
- No Datapad/inspector token aliases were added.
- No Datapad/inspector frame was extracted.

Source boundaries held:

- No file upload/download logic changed.
- No artifact persistence changed.
- No notebook draft persistence changed.
- No save/delete/close action changed.
- No title/content input behavior changed.
- No scroll/focus behavior changed.
- No drag/resize/z-index/window behavior changed.
- No store, sync, backend, Supabase, API, React Flow, graph, workspace
  persistence, runtime token apply, token persistence, package/config/deploy,
  exports, or auth files were touched.

Verification:

- `git diff --check`: pass.
- Focused tests: pass.
  - `npm run test -- src/components/nexus/nexus-datapad-shell-selector.test.ts src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts`
  - 2 test files, 7 tests passed.
- `npm run typecheck`: pass.
- Targeted lint: pass.
  - `npm run lint -- src/components/nexus/DatapadWindow.tsx src/components/nexus/nexus-datapad-shell-selector.test.ts src/components/style-engine/nexus-style-lab.tsx src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts`
- `npm run build`: pass.
  - Existing Next.js edge-runtime static-generation warning observed; not a new
    styling regression.

Browser/style-lab smoke:

- Temporary dev server: `http://127.0.0.1:3000`.
- Route: `/style-lab`.
- Result: pass.
- `Production Chrome Smoke` panel rendered without auth gate.
- Static Datapad specimen rendered and was visible.
- Selector counts included:
  - `.nexus-datapad-shell`: 1
  - `.nexus-datapad-window`: 1
  - `.datapad-drag-handle`: 1
  - `.nexus-agent-window`: 1
  - `.nexus-command-palette-shell`: 1
  - `.nexus-agent-branch-modal-shell`: 1
  - `.nexus-top-bar-frame`: 1
  - `.nexus-right-floating-dock-rail`: 1
  - `.nexus-workspace`: 3
  - `.nexus-message-bubble`: 3
- Apply/Revert smoke vars still worked for existing aliased specimens:
  - AgentWindow background changed on apply and returned on revert.
  - CommandPalette background changed on apply and returned on revert.
  - Modal shell background changed on apply and returned on revert.
  - `document.documentElement` remained unmutated for smoke vars.
- Datapad itself is selector-only this loop, so no Datapad color apply/revert
  was expected or claimed.
- Browser console error logs for the smoke tab: none.
- Production `/` was not visited and no login was attempted.

Known baseline vs regressions:

- `bg-surface-shell.webp` placeholder failure is a known production `/` baseline
  and was not part of this `/style-lab` smoke.
- Chrome Translate hydration mismatch was avoided with an untranslated local
  style-lab session.
- No new regressions observed.

Rollback path:

- Revert the local commit for this loop, or manually remove:
  - `.nexus-datapad-shell` from `DatapadWindow.tsx`
  - the static Datapad specimen and selector entry from `nexus-style-lab.tsx`
  - the focused Datapad selector test
  - the Style Lab smoke test expectation additions
  - section 22 from `production-shell-extraction-map-v1.md`
  - this checkpoint

Residual failure risk:

- Estimated below 3%.
- Risk is limited to selector drift or static Style Lab layout density because
  the production change is a single class added to an existing visual shell.

Progress estimate toward 60%:

- Material prep progress, modest readiness movement:
  approximately 55-57% to 56-58%.
- The next alias loop should create the visible Datapad/inspector chrome
  coverage gain.

Next recommended target seed:

- Add Datapad shell token aliases for `.nexus-datapad-shell`:
  `--nexus-datapad-shell-bg`, `--nexus-datapad-shell-border`,
  `--nexus-datapad-shell-shadow`, `--nexus-datapad-shell-radius`, and optional
  blur.
- Keep title/content fields, save/delete/close buttons, drag/resize/z-index,
  scroll/focus behavior, upload/download, artifact persistence, notebook
  persistence, store, sync, backend, and API out of scope.
