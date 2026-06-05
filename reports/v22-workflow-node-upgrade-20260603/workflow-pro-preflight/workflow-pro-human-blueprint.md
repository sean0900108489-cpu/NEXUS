# Workflow Pro Human Blueprint

## Goal

Add a third workspace tab next to `PANELS` and `GRAPH`:

`PANELS | GRAPH | WORKFLOW PRO`

`Workflow Pro` is not a clone of Graph. It is a professional workflow design
surface built from the ground up for:

- designing workflows
- reading workflow logic
- seeing the Workflow Brain's summary and analysis
- asking the brain questions
- reviewing run evidence
- reviewing proposal diffs
- attaching files to workflow packets
- reserving conversion layers for future file types such as zip

## Current Project Truth

Current `WorkspaceViewMode` is:

```ts
type WorkspaceViewMode = "panels" | "graph";
```

Adding Workflow Pro therefore requires more than UI text:

- type widening
- store persistence update
- workspace snapshot sanitizer compatibility
- view switch UI update
- body render branching
- focused tests
- future import/export compatibility

## Product Shape

Workflow Pro should use a three-zone layout:

1. **Design Surface**
   - professional workflow builder
   - not a graph clone
   - node canvas with workflow-contract semantics

2. **Intelligence Surface**
   - Workflow Brain summary
   - logic graph explanation
   - risks
   - missing capabilities
   - suggested Codex tasks

3. **Evidence / Diff Toggle**
   - switch between Evidence Timeline Cockpit and Proposal Diff War Room
   - this follows Sean's preference for UI concepts 5 and 6
   - they should not be shown together because the information density becomes too high

## File Attachment Node

Add a future node type:

`input.file`

Its job:

- carry files with the text packet
- persist raw file as artifact
- attach metadata to the packet
- run through a compiler layer
- pass compiled text/reference forward

The compiler layer can start as noop:

`compiler.none`

Future compilers:

- `compiler.zip.extract`
- `compiler.pdf.ocr`
- `compiler.image.vision`
- `compiler.video.frames`
- `compiler.audio.transcript`
- `compiler.table.normalize`

## UI Modes Inside Workflow Pro

Workflow Pro should contain internal mode toggles:

- Design
- Brain
- Evidence
- Proposal Diff
- Files
- Settings

Top-level workspace mode remains:

- Panels
- Graph
- Workflow Pro

## Why This Should Be Separate From Graph

Graph today is a practical node/run surface. Workflow Pro should be the design
and intelligence cockpit.

Graph can keep fast visual runtime operations.

Workflow Pro should add:

- canonical workflow contract awareness
- node inspector
- packet inspector
- file node semantics
- brain boot prompt preview
- evidence/proposal toggle
- LLM-readable status export
- developer blueprint exports

