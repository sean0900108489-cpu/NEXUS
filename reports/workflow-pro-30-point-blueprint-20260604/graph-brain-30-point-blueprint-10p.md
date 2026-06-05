# Graph Brain 30-Point Completion Blueprint

## Page 1. Goal

The next 30 points are not about pasting known topology answers into Graph. The goal is to make Graph Brain understand a natural-language need, infer the appropriate workflow structure, generate a strict `nexus.workflow.v1` JSON contract, append that contract as a new independent workflow group, and report what is possible now versus what requires platform upgrades.

Target score: 30/30.

## Page 2. Hidden-Answer Test Principle

The Brain must not be given the answer topology. It should receive intent prompts such as: "I want to upload an image and have two model roles analyze it before producing a final answer." It must decide whether it needs input, file/compiler, LLM, image, output, fan-out, or capability-gap nodes.

Codex can keep a hidden rubric. The Brain sees the user problem; the evaluator compares the produced workflow to expected capability coverage.

## Page 3. Two-LLM Brain Chain

The recommended architecture uses two high-reasoning LLM passes:

1. Intent Architect: reads user need, canvas context, existing workflow groups, capability inventory, node registry, and platform limits. It produces a workflow design plan, missing capability notes, and clarification questions when needed.
2. JSON Contract Compiler: converts the approved plan into strict `nexus.workflow.v1`, preserving model settings, node order, rationale, limits, outputs, artifact policies, and compiler metadata.

Both default to `gpt-5.5`, `reasoningEffort=xhigh`, `verbosity=high`, and `reasoningDetail=high`.

## Page 4. Phase Plan And Round Count

Total estimate: 18 to 24 high-ROI commands.

Scanning: 2 rounds. Integration thinking: 3 rounds. Future-proof planning: 2 rounds. Implementation: 7 to 9 rounds. Professional docs: 2 rounds. Convergence: 1 to 2 rounds. Real screen testing: 3 to 5 rounds. If screen tests fail, reserve 3 additional repair rounds. After tests pass, landing/deploy readiness takes 2 rounds.

## Page 5. Phase 1 - Scan And Contract Readiness

Round 1 scans existing Graph Brain panel, Runtime Lite append group, workflow contract validator, bridge, model registry, API route patterns, auth gates, and error handling.

Round 2 maps which current pieces can be reused and which are missing: Brain API route, context pack endpoint, structured output validator, UI conversation state, and screen-operated hidden-answer fixtures.

Exit gate: no duplicate converter, no parallel schema, no bypass of `nexus.workflow.v1`.

## Page 6. Phase 2 - Brain API And Context Pack

Round 3 creates the backend route or service boundary for Graph Brain. It should use authenticated runtime access and never expose API keys.

Round 4 builds a Graph Brain context pack: current canvas groups, active nodes, available node types, missing capabilities, current run/artifact evidence, model registry options, compiler registry, and append semantics.

Round 5 creates the two-step LLM protocol: Intent Architect output and Contract Compiler output.

Exit gate: Brain can explain the current canvas and generate a plan without mutating it.

## Page 7. Phase 3 - JSON Generation And Validation

Round 6 defines the structured output contract for Brain responses.

Round 7 connects Contract Compiler output to `parseWorkflowProContractImportText`, `validateWorkflowProContractDraft`, and `createWorkflowProRuntimeBridge`.

Round 8 surfaces validation errors and missing capabilities in the Graph Brain panel.

Exit gate: malformed JSON never reaches append; valid JSON becomes a previewable runtime group.

## Page 8. Phase 4 - Graph UI Append Experience

Round 9 upgrades the current Brain panel from template draft to real chat transcript.

Round 10 adds draft review: plan summary, node count, edge count, missing capabilities, confidence, and "Append new group" action.

Round 11 preserves simple UX: Brain is a compact graph assistant, not a second Workflow Pro page.

Exit gate: the operator can ask naturally, read the Brain's plan, append a new independent group, and still keep older groups on canvas.

## Page 9. Phase 5 - Hidden-Answer Screen Tests

Round 12 tests image/file input with two LLM roles, without giving topology.

Round 13 tests audio-prompt-to-image-reverse-fanout, without giving topology.

Round 14 tests a simpler text planning workflow, without giving topology.

Round 15 checks failure behavior: if the Brain needs unavailable native audio transcription, native vision, parallel join, or zip extraction, it must say so and propose the next upgrade.

Exit gate: Computer Use screen operation proves the real UI, not only unit tests.

## Page 10. Scoring Rubric For 30/30

5 points: Brain understands natural intent without topology hints.

5 points: Brain can select appropriate node path, roles, order, and outputs.

5 points: Brain produces strict valid `nexus.workflow.v1`.

5 points: The system appends the generated workflow as a new independent group.

5 points: Brain identifies missing capabilities and honest upgrade direction.

5 points: Computer Use passes hidden-answer screen tests through the actual interface.

Full score requires both intelligence and reality: the Brain must think, the JSON must validate, the graph must append, and the screen test must prove it.
