# Workflow Pro Construction Completion Report - R01-R08

## Status

This construction block completed the Graph Brain planning and append foundation, then started the next deep-development layer by making RuntimeLite execution constraints machine-readable.

## What Changed

### Graph Brain Planner

- Added a deterministic Graph Brain planner.
- Natural language workflow requests can be converted into strict `nexus.workflow.v1` JSON.
- Final workflow JSON is compiler-owned and validator-gated.
- Brain-generated workflows append as new graph groups instead of replacing the canvas.

### Server Route

- Added `/api/workflow-pro/brain-draft`.
- Keeps API key usage server-side.
- Optionally asks OpenAI Responses API for an Architect overlay.
- Falls back to deterministic planning when model calls fail, timeout, or are unavailable.
- Accepts sanitized recent Brain Thread messages as `conversation` context.

### Graph UI

- Added Graph Brain panel controls:
  - request input
  - template selector
  - local draft
  - Think
  - Append
  - score cards
  - missing capabilities
  - editable JSON
- Added Brain Thread UI:
  - Operator Request
  - Intent Architect
  - JSON Contract Compiler
  - Screen Apply Gate

### Runtime Capability Report

- Added `createWorkflowProRuntimeCapabilityReport`.
- RuntimeLite can now tell Graph Brain:
  - execution mode is `topological-sequential`
  - workflow timeout policy is `none`
  - pause control is `abort-signal`
  - native parallel execution is not available yet
  - join node is not available yet
  - fan-out/fan-in/disconnected nodes are detected
  - topology validation status is included

## Screen Proof

Verified through Computer Use in Chrome at `http://localhost:3000/`.

### Scenario 1

Request:

```text
我把圖填在 input 傳上之後，連接兩個不同且已經設定好提示詞的 LLM，最後給我答案。
```

Result:

- Selected template: `image-file-two-llm-answer`
- Generated: `5 nodes / 4 edges`
- Appended to canvas through the visible APPEND button.

### Scenario 2

Request:

```text
我想傳一個語音提示詞之後生成圖像，在那個圖像反推出 LLM 自己生成的提示詞，再讓另外三個 LLM 更改提示詞風格或內容後經過圖片模型生成最終答案。
```

Result:

- Selected template: `audio-prompt-image-reverse-fanout`
- Generated: `14 nodes / 13 edges`
- Appended to canvas through the visible APPEND button.
- Missing capabilities were surfaced instead of hidden.

### Scenario 3

Brain Thread:

- Visible during Thinking.
- Retains Operator Request, Intent Architect, JSON Contract Compiler, and Screen Apply Gate after response.

## Verification Commands

```bash
npm test -- src/lib/workflow-pro/graph-brain-planner.test.ts src/lib/workflow-pro/brain-draft-templates.test.ts src/lib/workflow-runtime-lite/group-append.test.ts src/store/nexus-store.test.ts
npm test -- src/lib/workflow-pro/capability-inventory.test.ts src/lib/workflow-pro/graph-brain-planner.test.ts src/lib/workflow-runtime-lite/runner.test.ts
npm run typecheck
npm run lint
jq empty docs/workflow-pro/graph-brain-30-point-screen-run.manifest.json
```

Results:

- Graph Brain / append tests: 4 files / 34 tests passed.
- Runtime capability tests: 3 files / 23 tests passed.
- Typecheck passed.
- Lint passed with 0 errors and 11 existing warnings.
- JSON manifest validation passed.

## Score

Current Graph Brain 30-point target:

- Brain planning: 10/10
- Appendable JSON: 10/10
- Screen append proof: 10/10

Total: 30/30.

This score only covers planning, JSON generation, and real UI append proof. It does not claim native audio transcription, vision reverse prompting, or native parallel runtime execution are complete.

## Remaining Deep-Development Distance

Estimated remaining rounds: 15-19.

Recommended next high-ROI order:

1. Runtime trace and run history visibility for Workflow Pro groups.
2. Machine evidence for each workflow run.
3. Audio compiler boundary for `node.file`.
4. Vision reverse capability boundary.
5. Native parallel execution and explicit join node.
6. Brain proposal review/apply workflow.
7. Persisted Brain Thread and workflow design sessions.

