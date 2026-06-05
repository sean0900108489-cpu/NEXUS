# Workflow Pro UI Architecture

## Visual Policy

Workflow Pro must use the existing NEXUS visual language:

- dark surface
- fine grid
- low saturation
- compact tool density
- hairline borders
- mono labels
- subtle glass panels
- no colorful concept palette
- no marketing hero composition inside the product surface

Concept 5 and concept 6 from the V23 report are information architecture references only.

## Top-Level Placement

The workspace top-left tab set becomes:

```text
Panels | Graph | Workflow Pro
```

Workflow Pro is a sibling of Graph, not a right-side panel.

## Internal View Switcher

Workflow Pro internal modes:

- Design
- Brain
- Evidence
- Proposal Diff
- Files
- Settings

Evidence and Proposal Diff should share one analysis bay with a switcher. They should not be shown side-by-side by default because the layout becomes too crowded.

Current source status:

- `WorkflowProSurface` owns a left-side mode rail with real active state.
- The center column starts with an `Active Cockpit Bay` that changes metrics and next-operator guidance for each internal mode.
- The active bay also exposes mode-specific detail cards: Brain shows the system brief and required output contract, Evidence shows the run ledger and node status counts, Files shows the raw artifact to compiler to ContextPacket path, and Settings shows capability flags.
- Design mode includes a three-step foundation gate: load contract, import review, and apply preview.
- Proposal Diff mode includes a review queue so structural differences can be audited before operator apply.
- The existing contract/import/apply panels remain visible underneath the active bay so the foundation benchmark path stays testable while the cockpit matures.
- Mode switching is UI-local. It does not mutate Graph, Runtime Lite, Supabase, or persisted workspace state.
- `workflow-pro-surface.test.tsx` renders every cockpit mode through an `initialMode` test seam so the active bay, foundation gate, proposal queue, file pipeline, and capability registry cannot disappear silently during later refactors.

## Layout

Recommended desktop structure:

```text
left: workflow outline and capability inventory
center: design canvas / selected internal view
right: inspector / brain / contract diagnostics
bottom: run evidence strip and artifact summary
```

Recommended mobile/tablet fallback:

```text
top tabs
single-column selected view
collapsible inspector
evidence drawer
```

## Key Components

- `WorkflowProSurface`
- `WorkflowProModeSwitcher`
- `WorkflowProDesignCanvas`
- `WorkflowProBrainPanel`
- `WorkflowProEvidenceTimeline`
- `WorkflowProProposalDiff`
- `WorkflowProFilesPanel`
- `WorkflowProNodeInspector`
- `WorkflowProContractPanel`

## Accessibility And Interaction

- Every icon-only action needs `aria-label` and title.
- Buttons should not resize when labels change.
- Long model names and node ids must truncate rather than overflow.
- Keyboard deletion and existing graph interactions must remain in Graph.
- Workflow Pro should not mutate graph behavior until an explicit apply action.
