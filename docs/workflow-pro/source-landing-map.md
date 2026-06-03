# Workflow Pro Source Landing Map

Status: commit and continuation map.  
Date: 2026-06-03.  
Branch: `v22`.

## Purpose

The current branch contains real Workflow Pro engineering, generated reports,
runtime fixes, and developer tooling. This map prevents those categories from
being committed or reviewed as one undifferentiated dirty tree.

Use this file before staging, committing, deploying, or starting the next
Workflow Pro engineering batch.

## Landing Principle

Land by operational boundary, not by time order.

Recommended order:

1. Foundation source and tests.
2. Workflow Pro docs and verification records.
3. Generated reports and visual artifacts.
4. Developer tooling such as Codex hooks.
5. Future production/account-matrix verification.

Do not mix generated report assets with the core Workflow Pro source commit
unless the commit is explicitly a documentation/report commit.

## Bucket A: Core Runtime And Product Source

Commit intent: make the local product behavior real.

Files:

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/nexus-workspace-primitive.test.ts`
- `src/lib/nexus-types.ts`
- `src/lib/workspace-kernel.ts`
- `src/lib/workspace-kernel.test.ts`
- `src/store/nexus-store.ts`
- `src/store/nexus-store.test.ts`
- `src/lib/tool-executors.ts`

Why this bucket exists:

- Adds or preserves the Workflow Pro view mode path.
- Keeps workspace import/export and local persistence compatible with new
  workflow state.
- Connects generated media history and runtime state to the product surface.

Acceptance before commit:

```bash
npm test -- src/components/nexus/nexus-workspace-primitive.test.ts src/lib/workspace-kernel.test.ts src/store/nexus-store.test.ts
npm run typecheck -- --pretty false
```

## Bucket B: Workflow Pro Contract And UI Surface

Commit intent: define the brain-readable workflow layer and product surface.

Files:

- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`
- `src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx`
- `src/lib/workflow-pro/workflow-contract.ts`
- `src/lib/workflow-pro/workflow-contract.test.ts`
- `src/lib/workflow-pro/workflow-contract-validator.ts`
- `src/lib/workflow-pro/workflow-contract-validator.test.ts`
- `src/lib/workflow-pro/workflow-contract-import.ts`
- `src/lib/workflow-pro/workflow-contract-import.test.ts`
- `src/lib/workflow-pro/workflow-contract-apply-plan.ts`
- `src/lib/workflow-pro/workflow-contract-apply-plan.test.ts`
- `src/lib/workflow-pro/foundation-benchmark-fixtures.ts`
- `src/lib/workflow-pro/foundation-benchmark-fixtures.test.ts`
- `src/lib/workflow-pro/capability-inventory.ts`
- `src/lib/workflow-pro/capability-inventory.test.ts`
- `src/lib/workflow-pro/brain-context.ts`
- `src/lib/workflow-pro/brain-context.test.ts`
- `src/lib/workflow-pro/file-node-contract.ts`
- `src/lib/workflow-pro/file-node-contract.test.ts`
- `src/lib/workflow-pro/proposal-diff.ts`
- `src/lib/workflow-pro/proposal-diff.test.ts`

Why this bucket exists:

- Defines `nexus.workflow.v1`.
- Creates import/review/apply behavior for workflow contracts.
- Gives the Workflow Brain a consistent capability and context package.
- Adds foundation benchmark fixtures A/B/C.

Acceptance before commit:

```bash
npm test -- src/lib/workflow-pro src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx
npm run typecheck -- --pretty false
```

## Bucket C: Runtime Lite, File Node, And Image Generation Foundation

Commit intent: make text, file, image, and long-running model execution safe.

Files:

- `src/lib/workflow-runtime-lite/executors.ts`
- `src/lib/workflow-runtime-lite/runner.test.ts`
- `src/lib/workflow-runtime-lite/registry.ts`
- `src/lib/workflow-runtime-lite/state.ts`
- `src/lib/workflow-runtime-lite/image-client.ts`
- `src/app/api/image-gen/route.ts`
- `src/app/api/image-gen/route.test.ts`
- `src/app/api/image-gen/assets/[assetId]/route.ts`
- `src/lib/backend/image-generation/generated-image-asset-cache.ts`

Why this bucket exists:

- Adds file-node pass-through with no-op compiler metadata.
- Removes the hidden image-node default timeout.
- Materializes generated image assets into addressable download URLs.
- Preserves generated image history without persisting unsafe inline data URLs.

Protected behavior:

- Long workflows must not fail because of a hidden fixed runtime duration.
- API keys stay server-side.
- Generated image history must remain downloadable.

Acceptance before commit:

```bash
npm test -- src/lib/workflow-runtime-lite/runner.test.ts src/app/api/image-gen/route.test.ts src/store/nexus-store.test.ts
npm run typecheck -- --pretty false
```

## Bucket D: Auth, Permission, And Workspace Session Boundary

Commit intent: prevent owner-only success and new-account permission failures.

Files:

- `src/lib/backend/api/api-contract.test.ts`
- `src/lib/backend/workspace/workspace-session-service.ts`
- `src/lib/backend/workspace/workspace-session-service.test.ts`
- `scripts/live-auth-boundary-probe.mjs`

Why this bucket exists:

- Local development can create a traceable workspace session when service-role
  configuration is absent.
- Production fails closed when service-role configuration is absent.
- Live auth probe can distinguish local development warnings from production
  legacy-route failures.

Acceptance before commit:

```bash
npm run check:auth-boundary
npm run build
npm run start -- -p 4300
AUTH_BOUNDARY_LIVE_BASE_URL=http://127.0.0.1:4300 npm run check:auth-boundary:live
```

Stop the local production server after the probe.

## Bucket E: Workflow Pro Documentation

Commit intent: make the architecture understandable to humans and LLMs.

Files:

- `docs/workflow-pro/README.md`
- `docs/workflow-pro/human-guide.md`
- `docs/workflow-pro/llm-guide.md`
- `docs/workflow-pro/workflow-contract-v1.md`
- `docs/workflow-pro/workflow-contract-v1.schema.json`
- `docs/workflow-pro/brain-boot-prompt.md`
- `docs/workflow-pro/ui-architecture.md`
- `docs/workflow-pro/backend-persistence-plan.md`
- `docs/workflow-pro/implementation-rounds.md`
- `docs/workflow-pro/file-map.json`
- `docs/workflow-pro/foundation-benchmark-verification.md`
- `docs/workflow-pro/source-landing-map.md`

Why this bucket exists:

- Gives Sean a human-readable map.
- Gives Codex/LLMs an exact continuation map.
- Records the screen-verified 30-point foundation benchmark.
- Defines the current source landing order.

Acceptance before commit:

```bash
node -e "JSON.parse(require('fs').readFileSync('docs/workflow-pro/file-map.json','utf8')); console.log('docs json ok')"
```

## Bucket F: Reports And Generated Visual Assets

Commit intent: preserve iteration evidence only when desired.

Paths:

- `reports/v22-workflow-node-upgrade-20260603/*`
- `reports/workflow-pro-source-phase-20260603/*`
- `reports/v22-workflow-node-upgrade-20260603.zip`

Policy:

- Do not bundle these into a core source commit.
- Commit as a separate report artifact commit only if the project wants report
  history in git.
- Large generated assets may be better kept outside source control or moved to
  an artifact store.

## Bucket G: Developer Audio Hook And Local Tooling

Commit intent: optional developer productivity support.

Paths:

- `.codex/*`
- `requirements.txt`

Policy:

- Keep separate from Workflow Pro product commits.
- Review privacy rules before committing audio report output paths.
- Confirm `.codex/audio-reports/` remains ignored.

## Next Engineering Slice

Recommended next slice after this map:

```text
Account-matrix and Vercel preview verification plan
-> define owner/editor/viewer/new-account expected behavior
-> add a small script or checklist that can run against preview URL
-> keep source changes minimal until preview auth evidence is clean
```

Reason:

- The foundation benchmark is passed.
- Local production-mode auth boundary is passed.
- The biggest remaining platform risk is not another UI control; it is whether
  the same workflow works for a real non-owner account and preview deployment.

See `account-matrix-preview-verification.md` for the actor matrix and evidence
requirements.

## Current Scores

- Foundation benchmark: 30 / 30.
- Local production-mode auth boundary: 9 / 10.
- Dirty tree clarity after this map: target 8 / 10.
- Production readiness: not scored until preview/account matrix is executed.
