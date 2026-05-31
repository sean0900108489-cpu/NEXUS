# V20 Style Architecture Relationship Chain Stabilization Audit Checkpoint

Date: 2026-06-01

## Run Type

Relationship-chain stabilization mode.

This run was intentionally audit-first:
- Visual inspection was performed against the authenticated production workspace.
- Source chain was traced from controls to scoped variables to target surfaces.
- No source implementation was changed.
- No production apply target was widened.

## Current Git Context

Branch:
- `codex/v19-production-shell-style-upgrade`

Latest relevant commit before this checkpoint:
- `f3b73c1 fix: neutralize workspace style preview surfaces`

Pre-existing untracked file:
- `docs/style-system/v19-production-shell-style-required-reading.md`

The pre-existing untracked file was not staged.

## Visual Baseline

Route:
- `http://localhost:3000/`

Observed:
- Authenticated workspace visible.
- Theme panel visible.
- Target selector exists exactly once:
  - `main.nexus-shell.nexus-outer-shell-frame`
- Target inline preview variables: `49`
- Document root inline preview variables: `0`
- Body inline preview variables: `0`
- Current user-selected accent: `#724040`

Interpretation:
- The previous earth-tone bug is no longer coming from old default warm surface constants.
- Current red/brown appearance is produced by the active custom accent plus local Theme panel material formulas.

## Relationship Chain Recorded

Controls chain:
- `WorkspaceStyleControlsPanel`
- `createWorkspaceThemeStylePreviewVariablesV1`
- `createProductionPreviewApplyPlan`
- target inline `--nexus-*` variables
- global CSS variable consumers
- export via `stylePack.controls`

Target scope:
- `main.nexus-shell.nexus-outer-shell-frame`

Safety:
- No root/body/html preview mutation observed.
- No backend/store/API path touched in this run.

## Layer Map

Layer 1:
- Tokens, fallbacks, validators, and control-to-variable mapping.

Layer 2:
- Outer shell, body frame, workspace stage.

Layer 3:
- Top bar, right dock, Theme panel, agent window, graph nodes, command palette, modal, datapad, message bubbles.

Layer 4:
- Sliders, buttons, status labels, handles, chips, content.

## Findings

Fixed:
- Brown/earth-tone preview constants were neutralized in `f3b73c1`.

Still confusing:
- Theme panel card material still uses local accent alpha formulas instead of shared Layer 3 material variables.
- Export source still says `warm-glass-controls`.
- Several production surfaces retain cyan/emerald/slate fallback classes, even though global variable rules override most visual output.
- First-cut query-gated controller remains separate from the primary Theme panel path.

## Risk Verdict

Risk status:
- Elevated but manageable.

Rollback needed:
- No.

Stabilization needed:
- Yes, but in small cuts.

Do not proceed with:
- Second production preview target.
- Broad shell-wide styling.
- Root/body/html mutation.
- React Flow behavior changes.

## Recommended Next Smallest Unit

Recommended first:
- Theme panel material contract cleanup.

Goal:
- Make Theme panel shell and nested control cards consume shared Layer 3 variables.
- Keep accent only for slider/focus/border/status, not panel fill.

Follow-up candidates:
- Source semantics compatibility plan for `warm-glass-controls`.
- Neutral material fallback class cleanup.
- Relationship-chain guard tests.

## Verification

Commands:
- `git diff --check`
- Diff allowed docs only.

No tests/build were required because this run changed docs only.

## Forbidden Boundaries Held

Held:
- No source implementation changes.
- No backend/API/Supabase/database changes.
- No sync protocol changes.
- No React Flow behavior changes.
- No document root/body/html mutation.
- No production persistence.
- No deployment.
- No push.

## Rollback Path

Revert this docs commit only.

No runtime state cleanup is required.
