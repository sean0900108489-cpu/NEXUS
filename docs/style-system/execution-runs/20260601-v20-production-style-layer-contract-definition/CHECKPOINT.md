# V20 Production Style Layer Contract Definition Checkpoint

Date: 2026-06-01

## Goal

Define the style layer contract so future production UI work can proceed without
requiring full cleanup of every legacy class.

This run intentionally focused on classification and guardrails.

## Files Changed

Created:
- `docs/style-system/v20-production-style-layer-contract.md`
- `docs/style-system/execution-runs/20260601-v20-production-style-layer-contract-definition/CHECKPOINT.md`
- `src/components/nexus/nexus-production-style-layer-contract.test.ts`

## Contract Summary

Layer 1:
- Style source, controls, validators, checksums, export payload.

Layer 2:
- Workspace stage, shell, body frame, graph/panels background, preview target.

Layer 3:
- Product surfaces and panel material.

Layer 4:
- Controls, status, role color, content state.

## Guard Tests Added

The focused test locks the highest-risk boundaries:
- Layer 1 controls-to-vars mapper stays pure and does not touch DOM/storage/API.
- Production preview target remains `main.nexus-shell.nexus-outer-shell-frame`.
- Theme panel material uses shared Layer 3 variables.
- Accent is allowed for controls/chrome but not large panel fill.
- Export/save path preserves normalized controls and avoids backend/store calls.

## What This Does Not Do

This run does not:
- clean every old class
- introduce new production style controls
- add a second production preview target
- change runtime preview behavior
- change backend/store/API/sync behavior
- change React Flow behavior

## Verification

Required verification:
- `git diff --check`
- focused layer contract test
- related Theme panel/material tests
- `npm run typecheck`
- targeted lint
- `npm run build`

Browser smoke:
- Not required because this run is docs + source-guard tests only.

## Risk

Residual risk:
- Low.

The contract is declarative and enforced only on the highest-risk relationships.
It does not over-constrain every visual class, so feature work can continue.

## Next Recommended Unit

Resume feature work using the layer intake checklist.

If another style stabilization unit is needed, do the source semantics
compatibility plan for `warm-glass-controls`; do not start broad fallback cleanup.

## Forbidden Boundaries Held

Held:
- No production runtime behavior changes.
- No backend/API/Supabase/database changes.
- No sync protocol changes.
- No React Flow behavior changes.
- No package/config/deploy changes.
- No document root/body/html mutation.
- No push/deploy.
