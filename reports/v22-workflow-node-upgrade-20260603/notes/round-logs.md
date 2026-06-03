# V22 Round Logs

## R1 - Branch Baseline

- Created and switched to `v22`.
- Confirmed existing untracked `X/` folder is not part of this upgrade.

## R2 - Connection Scan

- Verified existing Workflow Runtime Lite spine.
- Confirmed existing image generation, artifact vault, and generated asset download boundaries.
- Confirmed `.env.local` contains an OpenAI image API key and `OPENAI_IMAGE_MODEL=gpt-image-2` without exposing secrets.

## R3 - Store / Runtime Base

- Added explicit canvas position support to `addWorkflowRuntimeNode`.
- Added `startNodeId` support to `runWorkflowRuntimeLiteFlow`.
- Added store tests for explicit position and input-specific starts.

## R4 - Graph UI / Pause Chain

- Renamed graph runner command to `Start All`.
- Added input node `Start`, `Pause`, and `Copy`.
- Added drag-to-create support for workflow node toolbar actions.
- Routed pause through AbortController-backed workflow execution.

## R5 - Reasoning / Generated History

- Added LLM node reasoning effort/detail selectors from the model registry.
- Added graph toolbar generated asset history dropdown with downloads.
- Removed `local-owner` fallback from Workflow Runtime Lite LLM identity headers.

## R6 - Report Pack / Machine Manifest

- Created the standalone `reports/v22-workflow-node-upgrade-20260603/` package.
- Added human, engineering, and machine-readable report surfaces.
- Kept older untracked `X/` content out of the V22 report package.

## R7 - GPT Image 2 Visual Asset

- Loaded image credentials from project-level env priority without printing secrets.
- Generated `assets/v22-workflow-system-map.png` using `gpt-image-2`.
- Saved request and output metadata in `assets/v22-workflow-system-map.metadata.json`.
- Embedded the generated system map in the HTML and Markdown reports.

## R8 - Quality Gate / Browser Verification

- Passed focused tests, typecheck, full lint, production build, JSON smoke, and
  HTML smoke.
- Verified the HTML report over localhost and saved a browser screenshot.
- Confirmed the local graph route is reachable but auth-gated by Supabase Auth.
- Confirmed Chrome is running and native host is configured, while the Codex
  Chrome Extension is missing or disabled in the detected profile.

## R9 - Completion / Remote Handoff

- Added the 3-round architecture self-review Q&A.
- Prepared the report pack for commit, push, and Vercel deployment handoff.
