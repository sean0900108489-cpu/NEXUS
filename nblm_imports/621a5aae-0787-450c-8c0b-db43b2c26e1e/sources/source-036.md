# Source 036 - reports__component-inventory__large-component-risk.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: 3f4e4981-c49a-4e41-a686-856517d157c0
- title: reports__component-inventory__large-component-risk.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 462
- token_count: 1063
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/3f4e4981-c49a-4e41-a686-856517d157c0
- source_added_timestamp: 2026-06-05T05:51:05.617226Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/docs/agent-runs/nexus-current-system-intelligence-20260605-1347/reports/component-inventory/large-component-risk.md
- local_mirror_estimated_word_count: 724

## Local Mirror Content

```md
# Large Component Risk

| File | Lines | Risk | Responsibilities |
| --- | --- | --- | --- |
| [src/app/layout.tsx](/Users/sean/Documents/FreeChat/src/app/layout.tsx) | 39 | P3 standard review | Visual / UI Layer; agent/chat/composer orchestration; false; graph/canvas operations; provider/model configuration; style/runtime preview controls |
| [src/app/page.tsx](/Users/sean/Documents/FreeChat/src/app/page.tsx) | 32 | P3 standard review | Unknown; cloud sync/workspace/artifact persistence; false; provider/model configuration; style/runtime preview controls; workflow/runtime/Brain contract operations |
| [src/app/style-lab/page.tsx](/Users/sean/Documents/FreeChat/src/app/style-lab/page.tsx) | 11 | P3 standard review | Visual / UI Layer; false; provider/model configuration; style/runtime preview controls; workflow/runtime/Brain contract operations |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx) | 2346 | P2 large file requires inventory | Graph / Canvas; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; false; graph/canvas operations; provider/model configuration; style/runtime preview controls; workflow/runtime/Brain contract operations |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx) | 9654 | P1 oversized multi-responsibility file | Unknown; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; global state mutation/persistence; graph/canvas operations; provider/model configuration; style/runtime preview controls; workflow/runtime/Brain contract operations |
| [src/components/nexus/workflow-pro/workflow-pro-surface.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/workflow-pro/workflow-pro-surface.tsx) | 1722 | P2 large file requires inventory | Workflow Orchestration; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; false; graph/canvas operations; provider/model configuration; style/runtime preview controls; workflow/runtime/Brain contract operations |
| [src/components/style-engine/nexus-style-lab.tsx](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab.tsx) | 5966 | P1 oversized multi-responsibility file | Visual / UI Layer; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; global state mutation/persistence; graph/canvas operations; provider/model configuration; style/runtime preview controls; workflow/runtime/Brain contract operations |
| [src/lib/nexus-registry.ts](/Users/sean/Documents/FreeChat/src/lib/nexus-registry.ts) | 818 | P3 standard review | Extension / Plugin Layer; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; global state mutation/persistence; graph/canvas operations; provider/model configuration; style/runtime preview controls; workflow/runtime/Brain contract operations |
| [src/lib/nexus-types.ts](/Users/sean/Documents/FreeChat/src/lib/nexus-types.ts) | 1855 | P2 large file requires inventory | Unknown; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; global state mutation/persistence; graph/canvas operations; provider/model configuration; style/runtime preview controls; workflow/runtime/Brain contract operations |
| [src/lib/state-sync.ts](/Users/sean/Documents/FreeChat/src/lib/state-sync.ts) | 1355 | P2 large file requires inventory | Supabase Persistence; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; false; global state mutation/persistence; style/runtime preview controls; workflow/runtime/Brain contract operations |
| [src/lib/style-engine/v2-validators.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-validators.ts) | 1864 | P2 large file requires inventory | Visual / UI Layer; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; false; global state mutation/persistence; graph/canvas operations; style/runtime preview controls; workflow/runtime/Brain contract operations |
| [src/lib/workflow-pro/graph-brain-planner.ts](/Users/sean/Documents/FreeChat/src/lib/workflow-pro/graph-brain-planner.ts) | 1073 | P2 large file requires inventory | LLM Node; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; false; graph/canvas operations; provider/model configuration; workflow/runtime/Brain contract operations |
| [src/lib/workflow-runtime-lite/registry.ts](/Users/sean/Documents/FreeChat/src/lib/workflow-runtime-lite/registry.ts) | 146 | P3 standard review | Workflow Orchestration; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; false; graph/canvas operations; provider/model configuration; workflow/runtime/Brain contract operations |
| [src/lib/workflow-runtime-lite/runner.ts](/Users/sean/Documents/FreeChat/src/lib/workflow-runtime-lite/runner.ts) | 552 | P3 standard review | Workflow Orchestration; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; false; graph/canvas operations; style/runtime preview controls; workflow/runtime/Brain contract operations |
| [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts) | 4815 | P1 oversized multi-responsibility file | Unknown; agent/chat/composer orchestration; cloud sync/workspace/artifact persistence; global state mutation/persistence; graph/canvas operations; provider/model configuration; style/runtime preview controls; workflow/runtime/Brain contract operations |

Next action is not refactor. Next action is responsibility-level reading and symbol-level map.
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.
