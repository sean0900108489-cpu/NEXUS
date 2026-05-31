# V20 Production Style Layer Contract

Date: 2026-06-01

This contract defines the production style layers used by the workspace Theme
controls and scoped production preview. Its purpose is to keep future UI changes
stable even when the visual arrangement changes.

This is not a request to clean every old class. It is a boundary definition for
future feature work.

## Why This Exists

Recent V20 work connected production Theme controls to a scoped preview target:

```text
Workspace Style Controls
  -> normalized controls
  -> allowlisted CSS variables
  -> main.nexus-shell.nexus-outer-shell-frame
  -> production shell and panel surfaces
  -> workspace export/import stylePack.controls
```

The system is now usable, but it needs a stable vocabulary so future changes do
not rely on guessing whether a surface is workspace material, panel material,
control chrome, or status color.

## Layer Summary

| Layer | Name | Owns | Must Not Own |
| --- | --- | --- | --- |
| 1 | Style Source / Token Layer | controls schema, defaults, validation, controls-to-vars, checksums, export payload | DOM mutation, layout, backend/store writes |
| 2 | Workspace Stage Layer | outer shell, body frame, workspace background, grid, wash, preview target | individual card styling, status color, modal internals |
| 3 | Surface / Panel Layer | panel bg, glass, border, radius, blur, shadow, surface depth | workspace stage color, document root mutation, raw accent fill |
| 4 | Control / Status / Content Layer | buttons, sliders, status chips, role colors, graph handles, text states | large panel material, Layer 2/3 overrides |

## Layer 1: Style Source / Token Layer

Primary owner files:
- `src/lib/style-engine/v2-workspace-style-payload.ts`
- `src/lib/style-engine/v2-production-preview-transaction.ts`
- `src/lib/style-engine/v2-production-token-bridge.ts`

Responsibilities:
- Define the Workspace Theme Controls schema.
- Provide safe defaults.
- Normalize and validate imported/exported controls.
- Reject unsafe raw CSS, raw selectors, raw JS, remote URLs, and oversized style payloads.
- Convert controls into allowlisted `--nexus-*` variables.
- Produce deterministic checksums.
- Preserve normalized `stylePack.controls` for workspace export/import.

Allowed:
- Pure control normalization.
- Pure variable map generation.
- Fail-closed validation.
- Checksum calculation.
- Source compatibility handling.

Forbidden:
- DOM mutation.
- `document.documentElement` writes.
- `body` or `html` writes.
- Store/backend/API/Supabase writes.
- Arbitrary selector output.
- Raw CSS string passthrough from user input.
- Auto-applying imported style to production.

Important nuance:
- The imported workspace style review state currently uses session-scoped browser
  review state. That is review metadata only; it is not the same as the pure
  controls-to-vars mapper.

Layer 1 output categories:
- Layer 2 variables:
  - `--nexus-outer-shell-bg`
  - `--nexus-body-frame-bg`
  - `--nexus-workspace-bg`
  - `--nexus-workspace-wash`
  - `--nexus-workspace-grid-primary`
  - `--nexus-workspace-grid-secondary`
- Layer 3 variables:
  - `--nexus-layout-panel-bg`
  - `--nexus-layout-panel-muted-bg`
  - `--nexus-layout-panel-border`
  - `--nexus-layout-panel-shadow`
  - `--nexus-panel-bg`
  - `--nexus-glass-bg`
  - `--nexus-right-dock-bg`
  - `--nexus-top-bar-bg`
  - `--nexus-agent-window-bg`
  - `--nexus-datapad-shell-bg`
  - `--nexus-modal-shell-bg`
  - `--nexus-message-bubble-bg`
- Layer 4 variables:
  - `--nexus-accent-primary`
  - `--nexus-accent-primary-strong`
  - `--nexus-accent-secondary`

## Layer 2: Workspace Stage Layer

Primary owner files:
- `src/components/nexus/nexus-ops-outer-shell-frame.tsx`
- `src/components/nexus/nexus-ops-body-frame.tsx`
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/app/globals.css`

Responsibilities:
- Own the production preview target:
  - `main.nexus-shell.nexus-outer-shell-frame`
- Own the workspace stage material.
- Keep graph and panels mode on the same workspace background chain.
- Own workspace wash, grid, minimap mask, stage radius, and stage shadow.

Allowed:
- Workspace background and wash.
- Workspace grid color.
- Shell/body frame background.
- Stage-level radius and shadow.
- Scoped preview target selection.

Forbidden:
- Applying preview variables to `html`, `body`, or `documentElement`.
- Owning individual card identity colors.
- Owning modal/datapad internals.
- Owning status colors.
- Widening preview target to the whole document or a broad route.

Layer 2 rule:
- If a future UI rearrangement keeps the same workspace stage, it should still
  consume Layer 2 variables rather than invent a new background system.

## Layer 3: Surface / Panel Layer

Primary owner files:
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-ops-right-floating-dock-frame.tsx`
- `src/components/nexus/nexus-ops-top-bar-frame.tsx`
- `src/components/nexus/AgentBranchModal.tsx`
- `src/components/nexus/DatapadWindow.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/app/globals.css`

Surface examples:
- Top bar.
- Right dock rail.
- Theme panel.
- Theme panel control cards.
- Agent window.
- Graph agent node.
- Runtime node.
- Command palette.
- Agent branch modal shell.
- Datapad shell.
- Message bubble.

Responsibilities:
- Own reusable panel material.
- Own material depth: background, glass, border, radius, blur, shadow.
- Use shared `--nexus-layout-panel-*`, `--nexus-panel-*`, and surface-specific aliases.

Allowed:
- Neutral or shared variable fallback material.
- Surface-specific radius/blur/shadow aliases.
- Accent border or glow only when it acts as chrome, not as large fill.

Forbidden:
- Using accent as the whole panel background.
- Recreating workspace background inside a card.
- Writing to root/body/html.
- Changing store/backend behavior.
- Removing role/status color without classification.

Layer 3 rule:
- Panel/card/shell fill should come from shared material variables first.
- Accent may decorate edges or focus states, but it should not become the main
  large-area material unless a future design explicitly redefines the contract.

## Layer 4: Control / Status / Content Layer

Primary owner files:
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/AgentBranchModal.tsx`
- `src/components/nexus/DatapadWindow.tsx`

Surface examples:
- Theme sliders.
- Accent color picker.
- Save/Revert/Reset buttons.
- Top-left menu actions.
- Right dock icon buttons.
- Graph handles.
- Status chips.
- Agent role indicators.
- Message content states.

Responsibilities:
- Own interaction feedback.
- Own semantic role/status color.
- Own focus, hover, selected, disabled, and active affordances.
- Own text readability.

Allowed:
- Accent for sliders, borders, focus, status, and role indicators.
- Role colors for agent identity.
- Error/success/warning colors.
- Compact button chrome.

Forbidden:
- Taking over Layer 2 workspace background.
- Taking over Layer 3 panel fill.
- Encoding material identity as a one-off hardcoded color.
- Triggering backend/store/API writes from style-only controls.

Layer 4 rule:
- A control can be colorful without making the containing surface colorful.

## Export / Import Boundary

Workspace export/import may carry:
- normalized `stylePack.controls`
- source/version metadata
- optional skin pack/review metadata

Workspace export/import must not:
- auto-apply production style after import
- write style controls to backend persistence
- mutate workspace runtime state beyond the existing workspace import path
- accept raw CSS, JS, remote URLs, or arbitrary selectors

Current semantic debt:
- `warm-glass-controls` remains an accepted `source` value for compatibility.
- Future work may rename or alias this source, but the migration must preserve
  old workspace JSON imports.

## Future Feature Intake Checklist

Before adding a new UI or style feature, answer:

1. Which layer owns it?
2. Which variables may it consume?
3. Is the color material, status, or role identity?
4. Can accent affect it? If yes, is it chrome/status or large-area fill?
5. Does it need to be included in `stylePack.controls`?
6. Does it mutate only the scoped target?
7. Does it avoid `html`, `body`, and `documentElement`?
8. Does it avoid backend/store/API writes?
9. Is there a focused guard test for the boundary?

## High-ROI Next Work

Recommended next steps are not full cleanup. They are boundary-preserving feature
preparation:

1. Source semantics compatibility plan.
   - Decide how to handle `warm-glass-controls` without breaking old exports.

2. New feature design using the layer checklist.
   - New functionality should declare its layer before implementation.

3. Optional material fallback cleanup.
   - Only clean fallback classes when they obscure the contract.
   - Do not remove semantic role/status color by default.

4. Relationship-chain guard expansion.
   - Add tests only around high-risk boundaries, not every visual class.

## Verdict

This contract is sufficient to resume feature work without doing a full material
cleanup pass first.

The key constraint is that new features must declare their layer and respect the
material/status split.
