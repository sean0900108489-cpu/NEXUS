# v27 UI Comfort Round 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first UI comfort pass by hiding normal-user expert surfaces and reducing graph/Brain visual pressure while preserving the existing Nexus visual identity.

**Architecture:** Keep changes local to the existing Nexus client components. Use source-level tests to guard visible labels/selectors, then make focused TSX/CSS-class edits without changing New API, Supabase auth, or workflow runtime contracts.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript, Tailwind utility classes, Vitest source tests.

---

### Task 1: Guard User-Facing Visibility

**Files:**
- Modify: `src/components/nexus/nexus-ui-comfort-round-1.test.ts`
- Modify: `src/components/nexus/nexus-panels.tsx`
- Modify: `src/components/nexus/nexus-ops.tsx`

- [x] Add tests asserting the visible workspace menu modes omit `workflow-pro`, the right dock omits `trace`, and `NexusOps` falls back when `viewMode === "workflow-pro"`.
- [x] Run `npm test -- src/components/nexus/nexus-ui-comfort-round-1.test.ts` and verify the new tests fail.
- [x] Update the top bar mode list and right dock panel list to hide Workflow Pro and Trace.
- [x] Add a small `NexusOps` effect that redirects `workflow-pro` view mode to `graph`.
- [x] Re-run the new test and verify it passes.

### Task 2: Quiet Graph Toolbar And Brain Defaults

**Files:**
- Modify: `src/components/nexus/nexus-ui-comfort-round-1.test.ts`
- Modify: `src/components/nexus/nexus-graph.tsx`

- [x] Add tests asserting the graph toolbar has a quiet shell with hover/focus reveal classes and Graph Brain diagnostics are inside an Advanced / Diagnostics disclosure.
- [x] Run the new test and verify the added assertions fail.
- [x] Wrap secondary graph actions in a hover/focus reveal group while keeping Brain, Run, read-only status, and graph status visible.
- [x] Move Graph Brain internal chips, runtime evidence, Brain Thread, scores/messages, and missing capabilities behind a collapsed diagnostics disclosure.
- [x] Include `brainModel` in the Brain request callback dependencies while editing this file.
- [x] Re-run the new test and verify it passes.

### Task 3: Improve Datapads And Menu Legibility

**Files:**
- Modify: `src/components/nexus/nexus-ui-comfort-round-1.test.ts`
- Modify: `src/components/nexus/nexus-agent-settings-sidebar.tsx`
- Modify: `src/components/nexus/nexus-panels.tsx`

- [x] Add tests asserting Global Datapads uses note-warehouse copy and the top-left menu uses a dedicated readable material class/token.
- [x] Run the new test and verify the added assertions fail.
- [x] Update Global Datapads copy, card hierarchy, empty state, and primary action styling without changing notebook behavior.
- [x] Add a dedicated top menu material class and inline fallback values that are more opaque/readable.
- [x] Re-run the new test and verify it passes.

### Task 4: Verify Round 1

**Files:**
- No new production files beyond the components above.

- [x] Run `npm test -- src/components/nexus/nexus-ui-comfort-round-1.test.ts`.
- [x] Run existing affected source tests if selectors changed.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint -- --format stylish`.
- [x] If a dev server is needed for visual verification, start it and inspect desktop/tablet/mobile viewports with Browser.
