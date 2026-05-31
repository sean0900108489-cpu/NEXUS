# V20 Non-Persistent Production Preview Preflight Contract

Date: 2026-05-31
Branch: `codex/v19-production-shell-style-upgrade`
Base commit: `9bf090e feat: add style runtime preflight gate`

## Goal

Add a pure contract helper that decides whether a future non-persistent production preview may proceed to planning based on budget, diagnostics, preflight gate, checksum/session, target scope, rollback, and safety flags.

This round did not add UI, production apply, production runtime preview, persistence, DOM mutation, or production shell behavior.

## Helper Added

File:
- `src/lib/style-engine/v2-production-preview-preflight.ts`

API:
- `createProductionPreviewPreflight(input)`

Exported types:
- `ProductionPreviewPreflightVerdict`
- `ProductionPreviewPreflightSummary`
- `ProductionPreviewTargetScope`
- `ProductionPreviewRequiredEvidence`
- `ProductionPreviewBlocker`
- related input / safety / diagnostics types

## Verdict Logic

The helper returns:
- `eligible`
- `hold`
- `blocked`

`eligible` requires:
- budget verdict is `safe`
- Style Lab preflight verdict is `PASS`
- diagnostics status is `reverted` or `completed`
- residue check is `pass`
- variable count is greater than `0`
- budget checksum and diagnostics checksum exist and match
- target scope is valid
- persistence is `none`
- rollback plan exists
- no store/backend/storage writes
- no root-level mutation
- no production behavior touch
- if the scope requires authenticated smoke, authenticated smoke evidence exists

`hold` covers:
- budget warning
- Style Lab gate still `HOLD`
- diagnostics incomplete
- residue evidence missing
- checksum missing
- authenticated smoke required but missing
- rollback plan missing
- non-critical warning count greater than `0`

`blocked` covers:
- missing input
- unknown mode
- invalid target scope
- persistence other than `none`
- budget verdict `block`
- Style Lab gate `BLOCK`
- diagnostics failed
- residue check failed
- variable count `0`
- checksum mismatch
- critical unsupported gap
- store/backend/storage writes
- root-level mutation
- production behavior touch

## Target Scope Rules

Accepted scope types:
- `style-lab`
- `authenticated-production-route`
- `isolated-production-container`

Accepted persistence:
- `none`

Accepted mutation target metadata:
- `local-container`
- `isolated-container`
- `production-route-container`
- `root-document`

`root-document` is blocked for authenticated production route preview, and the safety flag `mutatesDocumentRoot` blocks any candidate.

Authenticated production route scopes require authenticated smoke evidence before the verdict can become `eligible`.

## Examples

Eligible:
- Style Lab-like completed diagnostics
- authenticated production route with authenticated smoke evidence and rollback plan

Hold:
- authenticated production route without authenticated smoke evidence
- missing rollback plan
- diagnostics not yet completed
- checksum missing

Blocked:
- checksum mismatch
- residue failure
- store/backend/storage write flags
- root-level mutation in production route
- unknown mode or invalid target scope
- missing input

## Verification

Passed:
- `git diff --check`
- `npm run test -- src/lib/style-engine/v2-production-preview-preflight.test.ts`
- `npm run test -- src/lib/style-engine/v2-style-runtime-budget.test.ts src/lib/style-engine/v2-production-preview-preflight.test.ts`
- `npm run typecheck`
- `npm run lint -- src/lib/style-engine`
- `npm run build`

Build note:
- Existing Next warning observed: edge runtime disables static generation for that page. This was not introduced by this round.

## Tests

Added:
- `src/lib/style-engine/v2-production-preview-preflight.test.ts`

Covered:
- eligible Style Lab-like completed diagnostics
- authenticated production route hold without auth smoke
- authenticated production route eligible with auth smoke and rollback
- checksum mismatch blocked
- residue fail blocked
- store/backend/storage writes blocked
- root-level mutation in production route blocked
- rollback missing hold
- missing/invalid input blocked
- unknown mode/scope blocked
- no raw CSS, selectors, payloads, or executable instructions emitted

## Remaining Before Real Production Preview

- Define the first non-persistent production preview target scope candidate.
- Decide where authenticated smoke evidence will be captured and recorded.
- Design the production preview apply/revert path separately and keep it behind this contract.
- Keep persistence, backend writes, store writes, and production behavior changes blocked.
- Add integration only after the pure contract is reviewed.

## Residual Risk

Estimated residual failure risk: below 5%.

Main residual risks:
- This is a pure contract and does not validate a real production route yet.
- Target scope metadata still needs a future integration plan.
- Authenticated production smoke evidence remains external to this helper.

## Rollback Path

Revert this commit to remove:
- `v2-production-preview-preflight.ts`
- `v2-production-preview-preflight.test.ts`
- this checkpoint

No persisted state, backend cleanup, storage cleanup, or production token cleanup is required.

## Next Recommended Target Seed

Task name:
- `V20 Production Preview Target Scope Candidate Map`

Goal:
- Map the smallest safe target scope candidates for a future non-persistent production preview, including authenticated route requirements, rollback expectations, and exact no-go boundaries.

Allowed direction:
- docs or pure metadata helper first
- no production apply
- no persistence
- no backend/store/API
- no production runtime mutation
