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

