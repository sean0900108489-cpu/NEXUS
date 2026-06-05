# C3 Workflow Pro Component Extraction Playbook

## Purpose

Provide a practical staged playbook for extracting Workflow Pro UI panels,
toolbars, node cards, hooks, and domain bridges without destabilizing runtime
state or generated-output evidence.

Score target: 87 / 100.

## Extraction Waves

Wave 1 pure UI:

- Graph Brain panel
- Generated History panel
- Workflow toolbar
- Node cards
- Runtime evidence display

Wave 2 hooks:

- `useGraphBrainDraft`
- `useWorkflowRunStatus`
- `useGeneratedHistory`
- `useArtifactDownload`
- `useWorkflowPermissionTrace`

Wave 3 domain services:

- workflow contract service
- runtime bridge service
- artifact storage service
- permission trace service
- generated history service

## Execution Phases

1. Inventory current component boundaries.
2. Identify props needed by each proposed extraction.
3. Mark read-only props versus callbacks.
4. Define state owner and allowed writers.
5. Define tests and browser smoke for each extraction.
6. Produce extraction backlog with risk scores.

## Extraction Record

| Candidate | Source File | Target File | State Owner | Props | Callbacks | Tests | Risk | Wave |
|---|---|---|---|---|---|---|---|---|

## Required Scans

```bash
rg -n "Graph Brain|Generated History|Workflow toolbar|Runtime Evidence|NodeCard|use[A-Z].*Workflow|artifact|permission trace" src/components/nexus src/lib/workflow-pro
wc -l src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-graph.tsx src/components/nexus/workflow-pro/workflow-pro-surface.tsx
```

## Tool Guidance

- Browser/Chrome: required after any extraction.
- GitHub: use diff review for moved code.
- Supabase/Vercel: only needed when extraction changes backend calls.

## API Key Policy

Provider tests are optional for extraction unless runtime behavior is modified.
Do not copy secrets into extraction docs.

## Evidence Weighting

Extraction readiness:

- W1 source/target line proof
- W2 tests
- W4 browser smoke

## Contradiction Pass

Check:

- Did target component require hidden global state?
- Did callback ownership become ambiguous?
- Did extraction increase prop drilling beyond acceptable limits?
- Did tests cover both display and mutation paths?

## Output Format

```md
# Workflow Pro Component Extraction Report
## Scope
## Extraction Inventory
## Wave Plan
## State Owner Notes
## Test Gates
## Browser Smoke Gates
## Risk Register
## Next Extraction Recommendation
```

## Completion Gate

Complete only when each extraction candidate has target file, owner, tests, risk,
and rollback signal.

## Execution Prompt

```txt
Read docs/workflow-pro/v23-debug-protocols/C3-workflow-pro-component-extraction-playbook.md first.
Create a Workflow Pro component extraction playbook. Do not edit code unless
asked. Produce wave plan, risk scores, and test gates.
```

