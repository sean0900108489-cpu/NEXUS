# Workflow Pro LLM Guide

This file is for Codex or another LLM that needs to continue Workflow Pro work.

## Operating Rule

Do not start by editing `src/components/nexus/nexus-graph.tsx`. The current graph owns working React Flow behavior. Workflow Pro should be introduced through a new surface and a contract layer.

## Current Architecture Facts

- `WorkspaceViewMode` currently supports `panels | graph`; it needs `workflow-pro`.
- `NexusGraph` already has React Flow nodes, edges, custom delete edge, node delete, toolbar actions, generated history, LLM reasoning controls, image quality/ratio controls.
- Runtime Lite lives in `src/lib/workflow-runtime-lite/*`.
- Generated image output already records artifacts through the artifact service.
- Attachment no-op compiler metadata already exists in `src/lib/attachments/*`.
- Supabase migrations already include workspace state, sync, artifacts, observability, and RLS hardening.

## First Source Files To Touch Later

1. `src/lib/nexus-types.ts`
2. `src/lib/workspace-kernel.ts`
3. `src/store/nexus-store.ts`
4. `src/components/nexus/nexus-ops.tsx`
5. new `src/components/nexus/workflow-pro/*`
6. new `src/lib/workflow-pro/*`

## Protected Behavior

Do not change these without a dedicated test gate:

- Graph pan/zoom/drag/connect/delete behavior.
- Existing artifact vault generated history.
- Provider vault and secret handling.
- Workspace export/import recovery semantics.
- Runtime Lite run execution order.
- Supabase service role boundary.

## First Implementation Goal

Implement Stage 2/R3-R5:

```text
Add workflow-pro view mode
-> add skeleton WorkflowProSurface
-> route from NexusOps body
-> preserve Graph behavior
-> add view mode and sanitizer tests
```

## LLM Output Expectations

When proposing code, include:

- exact files
- reason each file exists
- tests to run
- rollback path
- whether source or docs were touched
- whether any backend/Supabase/Vercel behavior changed

