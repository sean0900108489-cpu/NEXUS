# Round 21 - Attachment Compiler Lane Manifest

Time: 2026-06-04T17:27:51+10:00

## Goal

Turn the file attachment compiler idea into a real shared contract. The system already had a no-op compiler reference, but it did not yet expose independent lanes for text, image, audio, video, archive, document, and generic binary inputs.

## Completed

1. Added `nexus.attachmentCompilerManifest.v1`.
2. Defined compiler lanes for `text`, `image`, `audio`, `video`, `archive`, `document`, and `binary-reference`.
3. Kept the current compiler as `nexus-attachment-noop-compiler-v1`.
4. Recorded future adapter slots such as `speech-to-text`, `zip-expand`, `video-transcode`, `pdf-text-extractor`, and `image-to-prompt`.
5. Added MIME-based lane resolution for workspace composer uploads.
6. Added lane identity to artifact metadata through `attachmentCompilerLane`.
7. Added the compiler manifest to the Workflow Pro file node contract so Graph Brain can read it.
8. Added compact lane summaries to RuntimeLite `node.file` packet metadata.
9. Added tests for registry lanes, MIME routing, metadata, file node contract, runtime packet evidence, and composer source integration.

## Verification

```text
npm test -- src/lib/attachments/attachment-compiler-registry.test.ts src/lib/workflow-pro/file-node-contract.test.ts src/lib/workflow-runtime-lite/runner.test.ts src/components/nexus/nexus-workspace-chat-composer-shell.test.ts
```

Result: passed, 4 files / 32 tests.

```text
npm run typecheck
```

Result: passed.

```text
npm run lint
```

Result: passed with 0 errors and 11 existing warnings.

Screen verification:

```text
Chrome / localhost:3000 remained loaded.
Existing file nodes still show the no-op compiler boundary on screen.
```

## Score

- Construction score: 9.2/10
- Distance to deep Workflow Pro platform: 97/100
- Estimated remaining rounds: 4 to 8

## Limits

This round establishes the contract and metadata boundary. It does not yet implement real audio transcription, zip expansion, PDF extraction, image reverse prompting, or video transcoding.

## Next Recommended Gate

Implement the first real compiler adapter behind this manifest, or add durable Workflow Pro group records so full workflow groups can be stored and queried independently from local workspace snapshots.
