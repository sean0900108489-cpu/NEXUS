# V22 Workflow Node Upgrade Report Pack

This folder is the standalone delivery package for the V22 workflow node upgrade.
It is intentionally separate from source runtime folders and from older report
folders such as `X/`.

## Contents

- `report.md` - human-readable and engineering-readable technical report.
- `machine-manifest.json` - LLM-readable workflow schema and handoff manifest.
- `index.html` - browser-readable professional report surface.
- `completion-report.md` - final rollout and verification notes.
- `verification-summary.json` - machine-readable verification outcome.
- `notes/round-logs.md` - high-ROI loop record.
- `notes/self-review-qna.md` - 3-round architecture self-review for future work.
- `assets/` - generated visual assets and metadata.

## Generated Assets

- `assets/v22-workflow-system-map.png`
- `assets/v22-workflow-system-map.metadata.json`
- `assets/v22-html-report-browser-smoke.png`
- `assets/v22-local-graph-post-login.png`

## Source Touchpoints

- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/nexus-ops.tsx`
- `src/store/nexus-store.ts`
- `src/lib/workflow-runtime-lite/*`
- `src/lib/adapters/image-adapter.ts`
