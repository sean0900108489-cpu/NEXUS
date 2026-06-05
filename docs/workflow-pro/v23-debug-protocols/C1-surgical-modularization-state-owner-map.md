# C1 Surgical Modularization Boundary And State Owner Map

## Purpose

Guide safe modularization of oversized frontend/store files without breaking
state ownership, sync triggers, runtime semantics, or UI capability closure.

Score target: 91 / 100.

## Extraction Rule

Extract in this order:

1. Pure render components.
2. Read-only selector hooks.
3. Local UI behavior hooks.
4. Store action wrappers.
5. Domain services.

Never move state ownership before the owner is documented.

## Execution Phases

1. Measure large files and component boundaries.
2. Build state owner map for workflow, graph, generated history, artifacts,
   provider vault, auth, and sync state.
3. Identify render-only extraction candidates.
4. Identify hook extraction candidates.
5. Identify domain-service extraction candidates.
6. Define tests and browser smoke for each extraction wave.
7. Produce a staged extraction plan.

## State Owner Matrix

| State | Owner | Readers | Writers | Sync Trigger | Recovery Path | Extraction Rule |
|---|---|---|---|---|---|---|

## Required Scans

```bash
wc -l src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-graph.tsx src/components/nexus/workflow-pro/workflow-pro-surface.tsx src/store/nexus-store.ts
rg -n "useNexusStore|set\\(|get\\(|queue.*Sync|runWorkflow|artifact|history|brain|workflow" src/components/nexus src/store src/lib
```

## Tool Guidance

- Browser/Chrome: verify visual behavior after extraction.
- GitHub: use diff and CI checks when reviewing extraction PRs.
- Supabase/Vercel: usually not required unless extraction changes backend flows.

## API Key Policy

No provider key is needed for pure modularization unless runtime smoke requires
real provider behavior. Never include secrets in extraction reports.

## Evidence Weighting

- W1 owner map and line references.
- W2 component/store tests.
- W4 browser smoke after extraction.

## Contradiction Pass

Check:

- Did an extracted hook become a second state owner?
- Did render-only extraction start writing to store?
- Did sync trigger move away from the domain mutation?
- Did UI behavior change without a test?

## Output Format

```md
# Surgical Modularization State Owner Report
## Scope
## Large File Pressure
## State Owner Matrix
## Extraction Wave 1 Pure UI
## Extraction Wave 2 Hooks
## Extraction Wave 3 Domain Services
## Test Plan
## Browser Smoke Plan
## Risks
```

## Completion Gate

Complete only when each proposed extraction names the current owner, target
owner, test gate, and rollback signal.

## Execution Prompt

```txt
Read docs/workflow-pro/v23-debug-protocols/C1-surgical-modularization-state-owner-map.md first.
Create a surgical modularization and state-owner map. Do not edit code unless
explicitly asked. Produce staged extraction plan and test gates.
```

