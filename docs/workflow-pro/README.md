# Workflow Pro Documentation Pack

Status: planning and engineering handoff package.  
Source mutation policy: this folder documents the next implementation; it does not change runtime behavior.

## Purpose

Workflow Pro is the professional workflow design layer for NEXUS. It should sit beside the existing `panels` and `graph` views as a third workspace mode. The current Graph can execute Runtime Lite flows; Workflow Pro should make those flows understandable, editable, explainable, optimizable, and eventually importable from one canonical JSON contract.

## Reading Order

1. `human-guide.md` - human-readable explanation of what Workflow Pro is and why it exists.
2. `llm-guide.md` - LLM/Codex-readable operating guide.
3. `workflow-contract-v1.md` - canonical `nexus.workflow.v1` design contract.
4. `workflow-contract-v1.schema.json` - machine-checkable schema draft.
5. `brain-boot-prompt.md` - stable prompt package for the Workflow Brain.
6. `ui-architecture.md` - UI layout and visual boundary, including concepts 5/6 interpretation.
7. `backend-persistence-plan.md` - artifact, workspace state, Supabase, and Vercel boundaries.
8. `implementation-rounds.md` - staged execution plan and acceptance gates.
9. `foundation-benchmark-verification.md` - screen-verified 30-point foundation benchmark result and protected runtime rules.
10. `source-landing-map.md` - dirty-tree and commit-bucket landing map for source, docs, reports, tooling, and next verification.
11. `account-matrix-preview-verification.md` - owner/editor/viewer/new-account preview verification blueprint.
12. `account-matrix-preview-verification.manifest.json` - machine-readable account matrix and preview gate.
13. `file-map.json` - numbered file ownership map for Codex/LLM continuation.

## Related Existing Docs

- `docs/v21-composer-mode-layer.md`
- `docs/style-system/nexus-ops-style-map.md`
- `docs/style-system/react-flow-style-boundary.md`
- `docs/style-system/react-flow-adapter-v1.md`
- `reports/v22-workflow-node-upgrade-20260603/workflow-brain-contract.md`
- `reports/v22-workflow-node-upgrade-20260603/workflow-pro-preflight/*`
- `reports/v22-workflow-node-upgrade-20260603/workflow-pro-engineering-launch/*`

## Non-Goals

- Do not replace the existing workspace snapshot export.
- Do not replace Runtime Lite execution state.
- Do not introduce a new generated asset history store while artifact vault can represent the record.
- Do not copy colorful UI concept palettes into production.
- Do not mutate Supabase schema before a route/RLS/storage policy is explicit.
