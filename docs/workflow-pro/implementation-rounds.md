# Workflow Pro Implementation Rounds

## Cadence Update

Do not generate a full report and full audio briefing after every single round. Accumulate at least 7-8 high-ROI rounds, then generate one total report and one total audio briefing.

Lightweight LINE Keep progress notes are allowed, but the expensive total report/audio should be batched.

## Round Budget

Primary: 23 rounds.  
Contingency: 5 rounds.  
Ceiling: 28 rounds.

## R1-R2 Completed In Current Planning

- R1: source, docs, Vercel/Supabase/Next boundary scan.
- R2: 14-page engineering launch report and machine manifest.

## R3-R8 Documentation And Contract Foundation

- R3: consolidate docs into `docs/workflow-pro`.
- R4: write `nexus.workflow.v1` contract and schema draft.
- R5: write Workflow Brain boot prompt.
- R6: write UI architecture and concept 5/6 boundary.
- R7: write backend/artifact/Supabase/Vercel persistence plan.
- R8: verify docs/JSON/links and produce first total report/audio batch.

## R9-R16 First Source Implementation Batch

- R9: add `workflow-pro` view mode type.
- R10: update workspace sanitizer/import/export survival.
- R11: update store view mode handling.
- R12: add top-left tab label.
- R13: add `WorkflowProSurface` skeleton.
- R14: route body rendering without changing Graph.
- R15: add focused tests.
- R16: browser smoke Panels/Graph/Workflow Pro.

## R17-R23 Contract And Runtime Bridge Batch

- R17: add contract types.
- R18: add schema validator.
- R19: add capability inventory.
- R20: add from-runtimeLite bridge.
- R21: add to-runtimeLite bridge.
- R22: add brain context pack.
- R23: add file node contract and no-op compiler bridge.

## R24-R28 Landing Batch

- R24: full focused tests.
- R25: typecheck/lint/build.
- R26: browser and preview verification.
- R27: commit/push.
- R28: final report/audio/LINE/iCloud.

## Foundation Benchmark Gate

Current status: passed 30 / 30 by Chrome and Computer Use screen operation.

- A: `Input -> LLM -> LLM -> Output`, passed by screen.
- B: `Input -> LLM -> Image Model -> Output`, passed by screen with real `img2`
  image output.
- C: `Input -> LLM -> Image Model -> Reverse LLM -> 3x Style LLM fan-out -> 3x
  Image Model -> 3x Output`, passed by screen with all 13 nodes at `SUCCESS`.
- Generated history expanded as `HISTORY 5 ASSETS`.
- Browser download completed for a generated workflow PNG.

See `foundation-benchmark-verification.md` for the traceable acceptance record.

## Landing Discipline

Before staging or pushing this branch, read `source-landing-map.md` and land by
bucket:

- Product/runtime source.
- Workflow Pro contract and surface.
- Auth/workspace boundary.
- Documentation.
- Reports/generated assets.
- Optional Codex tooling.

This avoids turning the current broad dirty tree into a single hard-to-review
commit.
