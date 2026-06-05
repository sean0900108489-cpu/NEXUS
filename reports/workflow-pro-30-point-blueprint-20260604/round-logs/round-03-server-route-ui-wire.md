# Round 03 - Server Route And Graph Brain UI Wire

## ROI Action

Connected the Graph Brain planner to the product surface.

## What Changed

- Added server route:
  - `src/app/api/workflow-pro/brain-draft/route.ts`
- Updated Graph UI:
  - `src/components/nexus/nexus-graph.tsx`

## Engineering Shape

- API keys remain server-side only.
- The route uses the deterministic compiler as a safe baseline.
- If `OPENAI_API_KEY` exists, the route can ask the OpenAI Responses endpoint for an Architect overlay, but the workflow JSON still comes from the deterministic contract compiler so invalid model output does not break append.
- The Brain panel now has a `Think` action, status cards, Brain messages, missing capability output, JSON view, and existing `Append` action.

## Verification

- `npm run typecheck`
- Result: passed.

## Current Score

- Brain understanding: 8/10
- Valid workflow JSON generation: 8/10
- Screen-test proof: 0/10
- Current construction score: 16/30

## Estimated Remaining Rounds

Approximately 4-7 high-ROI rounds remain. Next critical gate is browser operation: Think -> JSON -> Append -> new workflow group visible on Graph.
