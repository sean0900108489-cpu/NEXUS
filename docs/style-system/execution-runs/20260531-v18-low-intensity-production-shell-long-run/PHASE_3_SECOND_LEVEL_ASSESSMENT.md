# Phase 3 - Second-Level Static Frame Assessment

Date: 2026-05-31

## Scope

This phase was assessment-only. It did not change production runtime code.

Allowed files:

- `docs/style-system/production-shell-extraction-map-v1.md`
- run folder docs
- optional source-level characterization test updates if markers changed

Forbidden files held:

- `src/components/nexus/nexus-ops.tsx`
- React Flow, window, modal, drag, resize, focus, z-index, store, sync, backend,
  Supabase, API, package/config/deploy, and `exports/**`

## Candidates Assessed

### Right Floating Dock Outer Frame

Source anchor:

- `src/components/nexus/nexus-ops.tsx:2445`

Assessment:

- Candidate for one small Phase 4 extraction.
- The outer `nav` and its inner rail `div` are static visual wrappers.
- The active panel state, button map, button classes, labels, and `onClick`
  handlers can remain in `RightFloatingDock`.
- Pointer-event and z-index classes must be preserved exactly because they are
  part of the existing hit-test surface.

Decision:

- Safe enough for a single optional extraction if implementation preserves the
  current wrapper classes and child order exactly.

Required smoke:

- page renders
- route-edge wrapper exists
- `main.nexus-shell` still exists
- right floating dock remains visible
- right dock panel toggle still works
- no console/hydration errors
- no obvious layout shift or pointer regression

### Collapsed Sidebar Rail

Source anchor:

- `src/components/nexus/nexus-ops.tsx:2352`

Assessment:

- Not a children-only static frame candidate in this run.
- The root is a `motion.div` with animation props.
- It also derives visual class state from `side`.

Decision:

- Skip. A future extraction would need an animation-boundary decision first.

### Command Palette Panel

Source anchor:

- `src/components/nexus/nexus-ops.tsx:6392`

Assessment:

- No-Go for this run.
- The component owns `query` state, `inputRef`, focus timing, overlay close, and
  command execution.
- The visual panel is nested inside an overlay with mouse event behavior.

Decision:

- Skip. Do not extract command palette chrome until there is a dedicated modal
  and focus smoke.

### Agent Settings Sidebar Chrome

Source anchor:

- `src/components/nexus/nexus-ops.tsx:3240`

Assessment:

- No-Go for this run.
- The component owns many settings, provider, macro, artifact, memory, theme,
  trace, auth, and close/update paths.
- The root is a motion overlay with fixed positioning and z-index behavior.

Decision:

- Skip. Needs a dedicated sidebar behavior test and overlay-boundary plan.

### Top Menu / Sync Badge Micro Frames

Source anchors:

- `src/components/nexus/nexus-ops.tsx:2811`
- `src/components/nexus/nexus-ops.tsx:2846`

Assessment:

- No-Go for this run.
- Both are interactive controls with event handlers and conditional classes.

Decision:

- Skip. They are control components, not inert shell frames.

## Phase 4 Recommendation

Proceed with at most one optional second-level extraction:

- `NexusOpsRightFloatingDockFrame`

Do not extract:

- Left dock
- Workspace
- Collapsed sidebar rail
- Command palette
- Settings sidebar
- Sync/menu action controls

## Verification

- `git diff --check` required after doc updates.
- No source runtime changed in this phase.
- No build or browser smoke required for assessment-only docs.
