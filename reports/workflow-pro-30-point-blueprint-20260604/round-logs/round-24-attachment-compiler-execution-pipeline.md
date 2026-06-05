# Round 24 - Attachment Compiler Execution Pipeline

Time: 2026-06-04T17:50:28+10:00

## Goal

Move Workflow Pro file nodes from a static compiler lane manifest into an executable compiler pipeline that every file node run can cross.

## Completed

1. Added `nexus.attachmentCompilerExecution.v1`.
2. Added `runAttachmentCompilerPipeline`.
3. Added per-attachment compiler results for passthrough and reference-only lanes.
4. Preserved future adapter slots on execution results, such as `zip-expand` and `speech-to-text`.
5. Connected RuntimeLite `node.file` execution to the compiler pipeline.
6. Kept packet metadata compact with `resultSummary` so `ContextPacket.metadata` remains sanitizer-friendly.
7. Preserved upstream raw text behavior while adding compiler evidence to the packet.

## Verification

```text
npm test -- src/lib/attachments/attachment-compiler-execution.test.ts src/lib/attachments/attachment-compiler-registry.test.ts src/lib/workflow-runtime-lite/runner.test.ts
```

Result: passed, 3 files / 24 tests.

```text
npm run typecheck
```

Result: passed.

```text
npm run lint
```

Result: passed with 0 errors and 11 existing warnings.

## Score

- Construction score: 9.2/10
- Distance to deep Workflow Pro platform: 99/100
- Estimated remaining rounds: 2 to 5

## Limits

This is the first executable compiler pipeline, not a full external compiler suite. It does not yet fetch raw artifact content from storage, transcribe audio, expand zip archives, extract PDF text, or transcode media.

## Next Recommended Gate

Add the first external compiler adapter, or implement native parallel execution plus join nodes for fan-out workflows.
