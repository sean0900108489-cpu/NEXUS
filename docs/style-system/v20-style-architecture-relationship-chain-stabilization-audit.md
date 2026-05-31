# V20 Style Architecture Relationship Chain Stabilization Audit

Date: 2026-06-01

This audit records the current production style control relationship chain after the
Workspace Style Controls MVP and the follow-up neutral surface fix.

Scope:
- Production workspace route only.
- Read-only source scan plus current localhost visual inspection.
- No new source implementation.
- No backend, sync, API, React Flow behavior, or persistence changes.

## Current Baseline

Latest relevant commit:
- `f3b73c1 fix: neutralize workspace style preview surfaces`

Working tree baseline:
- Existing untracked file: `docs/style-system/v19-production-shell-style-required-reading.md`
- This file was pre-existing and was not staged by this run.

Browser visual baseline:
- Route: `http://localhost:3000/`
- Authenticated workspace visible.
- Preview target count: `1`
- Target: `main.nexus-shell.nexus-outer-shell-frame`
- Target inline `--nexus-*` preview vars: `49`
- `document.documentElement` inline preview vars: `0`
- `body` inline preview vars: `0`
- Theme panel open.
- Current user-selected accent in the live preview: `#724040`
- Visual state is no longer using the old hardcoded brown surface values fixed in `f3b73c1`, but the active custom accent can still create a red/brown cast by design.

Key target variables observed:
- `--nexus-outer-shell-bg`: neutral shell gradient with accent wash.
- `--nexus-body-frame-bg`: neutral body wash with accent tint.
- `--nexus-layout-panel-bg`: shared layout panel gradient.
- `--nexus-panel-bg`: shared panel surface.
- `--nexus-glass-bg`: shared glass/raised surface.
- `--nexus-workspace-bg`: graph/panels workspace background.
- `--nexus-right-dock-bg`: right dock rail surface.
- `--nexus-top-bar-bg`: top bar surface.
- `--nexus-accent-primary`: current accent.

## Relationship Chain

The active chain is:

1. User adjusts Workspace Style Controls in the production Theme panel.
2. `WorkspaceStyleControlsPanel` stores local control state in `src/components/nexus/nexus-ops.tsx`.
3. `createWorkspaceThemeStylePreviewVariablesV1` normalizes controls in `src/lib/style-engine/v2-workspace-style-payload.ts`.
4. The normalized controls map to an allowlisted set of `--nexus-*` CSS variables.
5. `createProductionPreviewApplyPlan` verifies target facts and safety flags in `src/lib/style-engine/v2-production-preview-transaction.ts`.
6. `nexus-ops.tsx` applies the variables only to `main.nexus-shell.nexus-outer-shell-frame`.
7. Global selectors in `src/app/globals.css` consume those scoped variables for production surfaces.
8. Export uses `createWorkspaceThemeStylePayloadForExport` in `nexus-ops.tsx` to include normalized controls in `stylePack.controls`.

Important safety property:
- The current live preview path does not write preview vars to `html`, `body`, or `documentElement`.

## Layer Model

### Layer 1: Token And Fallback Layer

Owner:
- `src/app/globals.css`
- `src/lib/style-engine/v2-workspace-style-payload.ts`
- `src/lib/style-engine/v2-production-token-bridge.ts`

Purpose:
- Define global fallback variables and production alias variables.
- Provide the neutral control-to-variable mapping.
- Keep unsafe raw CSS, raw selectors, raw JS, and remote URLs out of style controls.

Current status:
- Scoped preview mapping is active and fail-closed.
- Defaults are now neutral instead of amber/earth-tone.
- Some legacy source naming remains, especially `warm-glass-controls`.

Risk:
- Medium semantic risk, low immediate visual risk.
- Old source names and old fallback tokens can force future developers to infer intent.

### Layer 2: Workspace Shell And Stage Layer

Primary surfaces:
- `main.nexus-shell.nexus-outer-shell-frame`
- `.nexus-ops-body-frame`
- `.nexus-workspace`

Files:
- `src/components/nexus/nexus-ops-outer-shell-frame.tsx`
- `src/components/nexus/nexus-ops.tsx`
- `src/app/globals.css`

Purpose:
- The only current production preview target.
- Owns whole workspace stage material and graph/panels working area.

Current status:
- Target exists exactly once.
- Not document root, not body, not html.
- `--nexus-workspace-bg`, grid, wash, border, radius, and shadow now respond to controls.
- Graph and panels share the same workspace background parameter chain.

Risk:
- Low if target remains unique.
- High if a future change widens target to `main.nexus-shell`, `body`, `html`, or document root.

### Layer 3: Major Product Surface Layer

Primary surfaces:
- `.nexus-top-bar-frame`
- `.nexus-right-floating-dock-rail`
- Theme panel shell and `Workspace Style Controls`
- `.nexus-agent-window`
- `.nexus-command-palette-shell`
- `.nexus-agent-branch-modal-shell`
- `.nexus-datapad-shell`
- `.nexus-agent-node`
- `.nexus-message-bubble`

Files:
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-ops-top-bar-frame.tsx`
- `src/components/nexus/nexus-ops-right-floating-dock-frame.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/AgentBranchModal.tsx`
- `src/components/nexus/DatapadWindow.tsx`
- `src/app/globals.css`

Purpose:
- Cards, docks, panels, windows, modal shells, and message surfaces.

Current status:
- Most major surfaces consume scoped production variables through global CSS.
- Right dock, top bar, agent window, message bubble, and workspace visibly respond to preview vars.
- Theme panel currently uses local inline accent formulas for its own shell and control cards.

Risk:
- Medium.
- Theme panel material is still partially local and can visually diverge from the shared Layer 3 material contract.
- Several components retain hardcoded cyan/emerald/slate fallback classes even where global CSS currently overrides them.

### Layer 4: Control, Status, And Content Layer

Primary surfaces:
- Theme sliders and accent picker.
- Save, Revert, Reset controls.
- Top-left workspace menu controls.
- Right dock icon buttons.
- Graph handles and node status dots.
- Message content and status labels.

Files:
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/app/globals.css`

Purpose:
- Interaction controls and semantic status accents.

Current status:
- Theme panel controls work and are scoped to the production preview target.
- Save/export/import flow is connected through `stylePack.controls`.
- Many status/action elements intentionally use accent or role colors.

Risk:
- Medium-low.
- Status color should not be flattened too aggressively.
- Material color and semantic status color need to stay separate in future cleanup.

## Findings

### Fixed In Current Baseline

The old earth-tone surface bug has been addressed by `f3b73c1`:
- Default controls are neutral instead of amber.
- The preview variable mapper no longer uses the old brown RGB basis.
- Shadow now uses neutral black plus accent glow instead of `rgb(48 32 20 / ...)`.
- Tests block reintroduction of known brown values in high-saturation accent scenarios.

### Active Confusion Sources

1. Theme panel material is not fully governed by the shared Layer 3 variables.

Evidence:
- `WorkspaceStyleControlsPanel` uses inline values such as `${activeAccent}18`, `${activeAccent}0b`, and `${activeAccent}33`.

Impact:
- The Theme panel can look like it is using a separate material system even when the rest of the workspace follows `--nexus-layout-panel-bg`, `--nexus-panel-bg`, and `--nexus-glass-bg`.

Next safe unit:
- Move the Theme panel shell and its nested control cards to the shared Layer 3 variables while keeping accent only for borders, focus, sliders, and status.

2. Export source still says `warm-glass-controls`.

Evidence:
- `WorkspaceStylePayloadSource` includes `warm-glass-controls`.
- `createWorkspaceThemeStylePayloadForExport` writes `source: "warm-glass-controls"`.

Impact:
- This is not a current visual bug, but it carries old semantic intent into the new production Theme panel flow.

Next safe unit:
- Add a compatibility source rename plan before changing the schema or exported payload wording.

3. Component fallback classes still contain old color semantics.

Examples:
- Right dock rail keeps `border-cyan-300/25 bg-slate-950/90`.
- Agent branch modal keeps cyan shell fallback classes.
- Datapad shell keeps emerald shell fallback classes.
- Graph node controls keep cyan/fuchsia role chrome.

Impact:
- Most are currently overridden by scoped CSS variables, but they make debugging harder and can leak if a selector, cascade order, or variable is missing.

Next safe unit:
- Convert only material fallback classes to neutral/shared fallbacks after visual smoke.
- Preserve role/status colors where they communicate agent identity or state.

4. First-cut query controller remains a separate legacy preview path.

Evidence:
- `src/components/nexus/nexus-production-preview-controller.tsx`
- URL gate: `?nexusPreviewFirstCut=1`

Impact:
- Useful as a test harness, but it is no longer the primary user-facing Theme panel path.

Next safe unit:
- Hold until Theme panel controls are stable, then either document as diagnostics-only or retire behind a clearer dev gate.

## No-Go List

Do not do the following during stabilization:
- Do not broaden preview target beyond `main.nexus-shell.nexus-outer-shell-frame`.
- Do not write preview vars to `html`, `body`, or `documentElement`.
- Do not change React Flow behavior to solve material bugs.
- Do not touch backend, sync, API, Supabase, auth, or workspace persistence.
- Do not flatten all accent/status colors into one surface color.
- Do not perform broad class cleanup without a visual smoke pass.

## Recommended Next Smallest Units

1. Theme panel material contract cleanup.
   - Make Theme panel shell and nested control cards consume shared Layer 3 material variables.
   - Keep accent for sliders, borders, focus, and status only.

2. Source semantics cleanup plan.
   - Decide whether `warm-glass-controls` remains a backward-compatible accepted source or is migrated to a new name.

3. Production fallback class cleanup.
   - Right dock, modal, datapad, and selected graph material fallback classes.
   - Only clean material fallbacks, not status/agent identity chrome.

4. Relationship-chain guard tests.
   - Assert controls map to Layer 2 and Layer 3 variables.
   - Assert root/body/html remain untouched.
   - Assert Theme panel material does not use raw old preset colors.

## Verdict

The system does not need to roll back to pre-design.

Current risk is elevated but manageable:
- Visual bug source was real and has been fixed.
- The main chain is now identifiable and scoped.
- Remaining risk comes from mixed local material formulas, old source naming, and legacy fallback color classes.

Recommended posture:
- Continue with small stabilization cuts.
- Do not start a second production preview target.
- Do not do broad visual refactors.
