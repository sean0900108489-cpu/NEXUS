# v27 UI Comfort and Expert-Surface Hiding Design

## Goal

Make the existing FreeChat / Nexus visual experience more comfortable and user-friendly without redesigning the main visual identity. The desktop experience remains the primary target. Mobile and narrow layouts may sacrifice secondary expert controls as long as the core workspace stays usable, readable, and navigable.

## Current Context

- Branch baseline: `codex/v27`, after commit `867ca97 chore: stabilize v27 graph brain quality gates`.
- Main visual direction is accepted and should be preserved.
- The next design pass should reduce professional/debug noise, not introduce a new brand system.
- The UI areas involved are the Nexus workspace shell, graph toolbar, Graph Brain panel, right dock/sidebar panels, top-left workspace menu, and Global Datapads.

## Design Principles

1. Preserve the Nexus look.
   - Keep the dark glass / terminal / operating-room feel.
   - Do not change the primary palette, icon language, or overall product mood.
   - Improve legibility, density, spacing, and disclosure instead of restyling from scratch.

2. Desktop first, mobile acceptable.
   - Desktop should feel powerful, calm, and fluent.
   - Tablet and mobile should not overflow, trap, or block the user.
   - Mobile may hide expert affordances, collapse panels, or show fewer controls.

3. Hide expert surfaces from normal users.
   - Workflow Pro and Trace are not deleted; they are removed from the primary user-facing navigation for now.
   - Future restoration should be possible through an expert/debug mode, feature flag, or internal route.
   - Record hidden surfaces in Obsidian so the product decision is not forgotten.

4. Prefer progressive disclosure.
   - Keep primary actions visible.
   - Move diagnostic details, internal scores, runtime evidence, long thread logs, and advanced JSON/debug details behind collapses or hover/focus reveal.
   - Avoid presenting implementation concepts unless the user is explicitly in an advanced/debug context.

## Scope

### In Scope

- Simplify the graph toolbar.
- Simplify Graph Brain default view.
- Hide Workflow Pro from the workspace menu.
- Hide Trace from the right dock and normal sidebar panel navigation.
- Improve Global Datapads as a note warehouse experience.
- Make the top-left workspace menu more readable and less transparent.
- Improve desktop comfort first, then ensure mobile does not break.
- Add an Obsidian product note documenting temporarily hidden expert surfaces.

### Out of Scope

- Rebranding, palette redesign, or replacing the Nexus visual system.
- Supabase schema, RLS, auth, database, or migration changes.
- New Workflow Pro functionality.
- New Trace functionality.
- Full mobile parity with desktop.
- Removing underlying expert/debug code unless it is unreachable dead UI shell and safe to leave untouched.

## UX Decisions

### 1. Responsive Comfort Priority

Recommended implementation order:

1. Responsive stability.
2. Spatial comfort.
3. Operational comfort.
4. Text and status comfort.

Desktop is the source of truth. Mobile should become a safe reduced interface, not a complete replica.

Acceptance:

- No horizontal page overflow at desktop, tablet, or mobile widths.
- Main workspace remains reachable when side panels open.
- Floating panels do not cover critical controls without a close path.
- Mobile can hide advanced controls, but core workspace view switching and panel closing must remain possible.

### 2. Graph Toolbar

Current issue:

- The top-left graph toolbar exposes too many controls at once: add input, add LLM, add file, add image, add output, run, assets, Brain, status.
- This creates visual pressure and steals attention from the graph.

Design:

- Default graph toolbar should show only the minimum operational surface:
  - Brain.
  - Run / Running.
  - Read-only state, when relevant.
  - A compact Tools affordance if needed.
- Secondary creation actions should reveal on hover, focus-within, or Tools activation:
  - Add Input.
  - Add LLM.
  - Add File.
  - Add Image.
  - Add Output.
  - Generated assets menu.
- Keyboard users must be able to reveal and operate the same controls with focus.

Acceptance:

- At rest, graph toolbar feels quiet.
- On hover/focus, all existing graph actions are still available.
- Read-only disabled states remain explicit.
- No action is removed from the graph unless separately documented.

### 3. Graph Brain Default View

Current issue:

- Graph Brain exposes internal implementation details that normal users do not need to understand.
- Runtime evidence, thread logs, scores, internal messages, and missing capabilities occupy too much screen space.

Design:

- Graph Brain should open in a user-facing mode.
- Visible by default:
  - Title: Graph Brain.
  - Model selector.
  - Request textarea.
  - Think.
  - Append.
  - Close.
  - Main generated output / JSON area.
  - Clear status or error message.
- Hidden behind Advanced / Diagnostics:
  - effort / verbosity / detail chips.
  - Runtime Evidence.
  - Brain Thread.
  - scoreTarget values.
  - internal planner messages.
  - missing capabilities.
- Advanced content can remain available for Sean / debugging, but it should not claim default screen space.

Acceptance:

- Opening Brain no longer fills the screen with diagnostic material before the user has asked for it.
- Primary request-to-result flow is obvious.
- Advanced/diagnostic material is recoverable but visually subordinate.
- The existing Brain Draft / New API behavior is not changed.

### 4. Workflow Pro Visibility

Current issue:

- Workflow Pro is too professional and implementation-heavy for the normal user-facing UI.

Design:

- Remove `workflow pro` from the top-left workspace menu's visible view-mode switch.
- If the app somehow loads with `viewMode === "workflow-pro"`, route the user back to `graph` or `panels` rather than presenting Workflow Pro as a primary mode.
- Do not delete `WorkflowProSurface` or workflow-pro libraries in this pass.
- Record the decision in Obsidian as temporarily hidden, not deprecated.

Acceptance:

- Normal users no longer see Workflow Pro as a navigation choice.
- Existing underlying code can remain for future expert mode.
- No responsive work depends on Workflow Pro being visible.

### 5. Trace Visibility

Current issue:

- Trace / Runtime trace and diagnostics is useful for debugging but not a normal user panel.

Design:

- Remove Trace from the right floating dock.
- Prevent Trace from being selected as a normal right sidebar panel.
- Leave underlying trace state and functions alone unless a small visibility guard is required.
- Record the decision in Obsidian as temporarily hidden for normal users.

Acceptance:

- Right dock no longer includes Trace.
- Normal sidebar navigation no longer exposes Trace.
- Existing trace code is not treated as deleted or obsolete.

### 6. Global Datapads Note Warehouse

Current issue:

- The fifth right-side panel currently reads more like an internal/debug utility than a warm note warehouse.

Design:

- Keep Global Datapads in the right panel system.
- Improve the visual experience:
  - Replace emoji-style labels with existing icon language where possible.
  - Make `New Datapad` feel like the clear primary action.
  - Make notebook cards more scannable, with stronger title, preview, and active/open state.
  - Improve empty state copy so it feels useful rather than diagnostic.
  - Keep the current Nexus material feel, but increase comfort through spacing and hierarchy.
- Suggested copy direction:
  - "Shared notes that stay available across workspaces."
  - "Create a datapad for prompts, decisions, fragments, or anything you want nearby."

Acceptance:

- Global Datapads feels like a note warehouse, not a debug panel.
- Empty state gives a clear reason to create the first note.
- Active/open notes are easy to distinguish.
- Desktop layout remains compact but less cramped.

### 7. Top-Left Workspace Menu

Current issue:

- The expanded menu is too transparent and can visually blend into the canvas or neighboring UI.

Design:

- Give the top-left menu its own readable material treatment while preserving the Nexus style:
  - More opaque background.
  - Clearer border.
  - Slightly stronger shadow/glow.
  - Less reliance on shared panel transparency variables if those create readability problems.
- Keep the current placement, motion, and general structure.
- Simplify the view-mode area once Workflow Pro is hidden.

Acceptance:

- Menu content remains readable over busy canvas states.
- It still feels like part of the same Nexus system.
- It does not visually wash out or become confused with the graph background.

## Implementation Boundaries

- Prefer small visibility and layout changes over large refactors.
- Do not combine this work with warning-debt cleanup except for tiny changes directly required by edited code.
- Do not reintroduce explicit `any`.
- Do not change Brain Draft request/response contract, New API routing, Supabase auth, or model catalog behavior.
- Do not remove hidden expert code unless a later cleanup plan explicitly targets it.
- If changing TSX files, run React best-practices review after implementation.

## Obsidian Record

Create or update:

`/Users/sean/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian/Codex/FreeChat/v27 UI 舒適度與專業功能隱藏紀錄.md`

The note must state:

- Workflow Pro is temporarily hidden from normal UI because it is too professional for current users.
- Trace is temporarily hidden from the right dock because it is diagnostic/debug material.
- Graph Brain defaults to user mode; advanced diagnostics should be recoverable but not primary.
- Global Datapads should become a warmer note warehouse.
- Desktop is primary; mobile may sacrifice secondary expert controls.

## Verification Plan

After implementation, verify with:

- `npm run typecheck`
- `npm run lint -- --format stylish`
- Targeted component/source tests that reference changed selectors or strings.
- Browser viewport checks:
  - Desktop: 1440 x 900 or wider.
  - Tablet: around 1024 x 768.
  - Mobile: around 390 x 844.
- Visual acceptance checks:
  - No horizontal overflow.
  - Graph toolbar quiet at rest and usable on hover/focus.
  - Graph Brain primary flow visible without diagnostics dominating.
  - Workflow Pro not visible in normal workspace menu.
  - Trace not visible in right dock.
  - Global Datapads reads as a usable note warehouse.
  - Top-left menu is legible over the canvas.

## Open Follow-Up

Future work can add an explicit Expert Mode or Debug Mode to restore Workflow Pro, Trace, and full Graph Brain diagnostics. That should be a separate design and implementation pass.
