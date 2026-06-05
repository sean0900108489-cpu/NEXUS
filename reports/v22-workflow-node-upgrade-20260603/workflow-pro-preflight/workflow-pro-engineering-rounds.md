# Workflow Pro Engineering Rounds

Recommended engineering effort after approval: 8-12 high-ROI rounds.

## R1 - Type And Mode Foundation

Files:

- `src/lib/nexus-types.ts`
- `src/lib/workspace-kernel.ts`
- `src/store/nexus-store.ts`
- relevant tests

Goal:

- add `"workflow-pro"` view mode
- preserve existing persisted panels/graph workspaces

## R2 - Workspace Tab UI

Files:

- `src/components/nexus/nexus-ops.tsx`
- tests around workspace primitive / view mode

Goal:

- render `PANELS | GRAPH | WORKFLOW PRO`
- choose stable label spacing so it fits the existing top-left card

## R3 - Workflow Pro Surface Skeleton

Files:

- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`
- `src/components/nexus/workflow-pro/workflow-pro-view-toggle.tsx`
- `src/components/nexus/workflow-pro/workflow-pro-shell.tsx`

Goal:

- render professional shell
- no graph clone
- internal modes: design, brain, evidence, proposal diff, files, settings

## R4 - Workflow Pro Design Surface

Files:

- `workflow-pro-design-canvas.tsx`
- `workflow-pro-node-inspector.tsx`
- `workflow-pro-packet-inspector.tsx`

Goal:

- show contract-aware workflow design panels
- future bridge to `nexus.workflow.v1`

## R5 - Evidence / Proposal Toggle

Files:

- `workflow-pro-evidence-view.tsx`
- `workflow-pro-proposal-diff-view.tsx`
- `workflow-pro-analysis-toggle.tsx`

Goal:

- adopt UI concept 5 and 6 as switchable views
- do not show both at once

## R6 - File Attachment Node Contract

Files:

- `src/lib/workflow-pro/file-node/types.ts`
- `src/lib/workflow-pro/file-node/compiler-registry.ts`
- `src/lib/workflow-pro/file-node/context-packet-attachments.ts`

Goal:

- define `input.file`
- allow text packet + file attachments to travel together
- reserve conversion layer

## R7 - RuntimeLite Bridge Planning

Files:

- `src/lib/workflow-pro/runtime-lite-adapter.ts`
- `src/lib/workflow-runtime-lite/registry.ts`
- `src/lib/workflow-runtime-lite/executors.ts`

Goal:

- map file packet through runtime without forcing zip extraction yet

## R8 - Artifact / API Connection

Files:

- `src/app/api/v1/workflow-pro/files/route.ts`
- `src/lib/backend/workflow-pro/file-artifact-service.ts`
- existing artifact service integration

Goal:

- raw file artifact persistence
- compiler result artifact persistence

## R9 - Brain Context Pack

Files:

- `src/lib/workflow-pro/brain/context-pack.ts`
- `src/lib/workflow-pro/brain/boot-prompt.ts`
- `src/lib/workflow-pro/brain/proposal-schema.ts`

Goal:

- stable LLM handoff across different models and memory sessions

## R10 - Documentation And Blueprint Export

Files:

- `docs/workflow-pro/human-guide.md`
- `docs/workflow-pro/llm-guide.md`
- `docs/workflow-pro/file-map.json`

Goal:

- human readable map
- LLM readable map
- numbered files and reasons

## R11 - Verification

Goal:

- typecheck
- focused tests
- browser smoke
- artifact/file route smoke if backend touched

## R12 - Deployment

Goal:

- commit
- push
- Vercel preview
- final screenshots

