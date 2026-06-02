# V19 Production Skinning 40-to-60 ROI Loop 04 Checkpoint

Task: Window And Control Chrome Scan-And-Act

## Preflight

- Branch confirmed: `codex/v19-production-shell-style-upgrade`
- HEAD at start included `51188fc feat: add message bubble token aliases`
- Recent commits recorded:
  - `51188fc feat: add message bubble token aliases`
  - `d7671a8 feat: expand production skinning primitive coverage`
  - `ab61f6d feat: advance production skinning visual coverage`
  - `52e9b35 feat: add top bar token aliases`
  - `eb79927 docs: update v18 production shell style runbook`
  - `83acb87 docs: add v18 production shell style upgrade runbook`
  - `61d2847 docs: triage baseline console hydration`
  - `576e499 docs: confirm right dock alias on fresh dev server`
- Pre-existing untracked file preserved and not staged:
  - `docs/style-system/v19-production-shell-style-required-reading.md`

## Candidate Ranking

1. `AgentWindow` chrome primitive
   - Files: `src/components/nexus/nexus-ops.tsx`, `src/app/globals.css`
   - Visible surface: primary floating agent conversation/window shell.
   - Visual coverage gain: high. Agent windows wrap messages, composer, media,
     sandbox canvases, and most active work.
   - Behavior ownership risk: high in the component overall, because it owns
     Rnd drag/resize/focus/z-index, composer refs, scroll refs, and message
     rendering. Implementation-safe only as narrow visual alias adoption.
   - Safe path: Path A, route existing visual values through CSS aliases and
     dynamic default custom properties without moving handlers, refs, state,
     child order, props, Rnd, focus, or z-index.
   - Browser smoke clarity: local runtime CSS and selector-probe apply/revert
     can be verified; full local visual UI requires authenticated session.
   - Rollback: revert this commit or remove the AgentWindow style alias lines,
     focused test, map section, and this checkpoint.
2. Command palette / modal chrome
   - Files: `src/components/nexus/nexus-ops.tsx`,
     `src/components/nexus/AgentBranchModal.tsx`
   - Visible surface: high when open.
   - Risk: focus management, overlay close, dialog stack/z-index, command
     execution, submit/close behavior. Existing `.nexus-panel` bridge already
     covers part of the visual shell.
   - Decision: skipped; needs extraction-first plan later.
3. Control primitives: button, input, badge/status shell
   - Files: distributed across `nexus-ops.tsx`, `DatapadWindow.tsx`,
     `AgentBranchModal.tsx`, `PromptVaultManager.tsx`, and global CSS.
   - Visible surface: broad.
   - Risk: active/hover/focus/disabled/status behavior and semantic states are
     spread across many controls.
   - Decision: skipped; too broad for one reversible Loop 04 target.
4. No-Go extraction map
   - Reserved if all high-ROI targets were behavior-bearing. Not needed because
     AgentWindow had an implementation-safe CSS/inline-style alias path.

## Selected Path

- Path A: behavior-free alias implementation
- Selected target: `AgentWindow` chrome primitive
- Why highest ROI: it is the most visible repeated production window chrome
  around the user's actual work, and it can now inherit dedicated or panel-level
  skinning without touching behavior core.

## Changed Files

- `src/components/nexus/nexus-ops.tsx`
- `src/app/globals.css`
- `src/components/nexus/nexus-agent-window-chrome-primitive.test.ts`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v19-production-skinning-40-to-60-roi-loop-04/CHECKPOINT.md`

## Aliases Added

- `--nexus-agent-window-bg`
- `--nexus-agent-window-border`
- `--nexus-agent-window-shadow`
- `--nexus-agent-window-radius`
- `--nexus-agent-window-blur`
- `--nexus-agent-window-handle-bg`
- `--nexus-agent-window-handle-border`
- `--nexus-agent-window-handle-radius`

## Fallback Chain

- dedicated AgentWindow alias
- existing panel alias where appropriate
- element-scoped dynamic AgentWindow default custom property
- current surface-shell/window baseline

Dynamic defaults preserve the selected-agent accent border/glow and sandbox
window fallback while still letting dedicated or panel-level aliases take over.

## Explicitly Not Changed

- Rnd drag/resize behavior
- focus, z-index, maximize/minimize, or window lifecycle behavior
- child order or props passed to children
- scroll refs, composer refs, submit/key handlers
- message parsing, markdown, streaming, or tool execution
- store, sync, backend, Supabase, API, React Flow, persistence, deploy/config

## Verification

- `git diff --check`: passed
- `npm run test -- src/components/nexus/nexus-agent-window-chrome-primitive.test.ts`:
  passed, 1 file / 4 tests
- `npm run typecheck`: passed
- `npm run lint -- src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-agent-window-chrome-primitive.test.ts src/app/globals.css`:
  passed for TS/TSX; ESLint reported `src/app/globals.css` ignored because no
  matching CSS lint configuration was supplied
- `npm run build`: passed
  - Build note: Next reported the existing edge-runtime static-generation
    warning

## Browser Smoke

Result: partial local browser smoke, not a full authenticated local UI pass.

What passed locally on `http://127.0.0.1:3000/`:

- route-edge production page shell boundary exists:
  `BOUNDARY:true,true,true`
- `.nexus-shell` loaded
- local runtime CSS contains `.nexus-agent-window`
- local runtime CSS contains all AgentWindow aliases:
  `SMOKE:true,false,true,true,true,true,true,true,true`
  - shell present: true
  - local `.nexus-agent-window` in DOM: false
  - CSS selector present: true
  - bg/border/shadow/radius/blur/handle aliases present: true
- browser-only CSS variable probe on a temporary `.nexus-agent-window` element
  applied and reverted:
  `AGENTPROBE:true,true,true,true,true`
  - computed style changed after vars applied
  - computed baseline returned after vars removed
  - bg, border, and radius vars affected computed style

What could not be fully confirmed locally:

- authenticated NexusOps UI, right dock, TopBar, workspace, message bubbles, and
  actual AgentWindow visibility on the local dev server. The local route loaded
  the auth gate and no credentials were entered or read.

Additional browser observations:

- an existing authenticated remote deployment tab showed NexusOps, right dock,
  workspace, message bubbles, and agent windows, but that was not counted as
  local build evidence.
- local unauthenticated sync attempts emitted expected `401 Authentication is
  required` dev-server console output after loading/reloading the auth-gated
  local route.
- no Chrome Translate hydration mismatch was observed.
- `bg-surface-shell.webp` placeholder issue was not newly observed during this
  smoke; it remains a known baseline issue from prior runs.

Browser apply/revert classification:

- selector/runtime local pass via temporary probe
- actual selected-target visual pass absent because local AgentWindow was behind
  auth gate
- no workspace data was intentionally mutated; no message was sent, no controls
  were activated beyond loading/reloading and browser-only CSS/DOM probes

## Known Baseline Issues Vs Regressions

- Known baseline: `bg-surface-shell.webp` placeholder load failure if it appears.
- Known baseline/tooling: Chrome Translate hydration mismatch only if Translate
  is active; not observed here.
- Environment/auth limitation: local authenticated NexusOps UI was unavailable
  without entering credentials.
- New regressions found: none in source, focused test, typecheck, build, or
  local CSS runtime probe.

## Residual Failure Risk

Estimated residual risk: 4%.

Reasoning:

- Source/build evidence is strong and the implementation is visual-only.
- Dynamic defaults reduce baseline visual regression risk.
- Full local visual AgentWindow smoke was blocked by auth gate, leaving a small
  browser coverage gap.

## Progress Toward 60%

This materially moves readiness beyond the 38-40% mark toward roughly 45-47%:
AgentWindow chrome is a high-frequency, high-visibility production shell around
the user's active work, and it now accepts dedicated/window-level and panel-level
skinning without behavior movement.

## Rollback Path

Revert the local commit, or manually remove:

- the AgentWindow CSS alias/default custom property wiring in
  `src/components/nexus/nexus-ops.tsx`
- the `.nexus-agent-window` and `.nexus-drag-handle` alias updates in
  `src/app/globals.css`
- `src/components/nexus/nexus-agent-window-chrome-primitive.test.ts`
- section 16 in `docs/style-system/production-shell-extraction-map-v1.md`
- this checkpoint

## Next Recommended Target Seed

Command palette / modal chrome extraction-first:

- smallest next target: add a stable inert visual frame or selector for
  `CommandPalette` shell only, without moving focus management, overlay close,
  command execution, input state, or z-index/modal behavior
- fallback if unsafe: map `AgentBranchModal`/modal shell extraction anchors and
  stop rather than styling low-visibility wrappers
