# Current System Context Pack

## Context For Next Agent

You are continuing NEXUS Phase 6 - Core Foundry Preparation. The user has corrected the mission: this is not about completing user-facing feature pages. The work is about creating a reliable technical environment for a future NEXUS core.

## Read First

1. `docs/agent-runs/core-foundry-preparation-2026-06-27/maps/00-executive-summary.md`
2. `docs/agent-runs/core-foundry-preparation-2026-06-27/maps/10-feature-capability-map.md`
3. `docs/agent-runs/core-foundry-preparation-2026-06-27/maps/11-current-system-logic-map.md`
4. `docs/agent-runs/core-foundry-preparation-2026-06-27/maps/20-risk-register.md`
5. `AGENTS.md`

## Current Git Facts

- Branch at scan time: `codex/v40`
- HEAD at scan time: `73d8e35 v40 E-2: Chat detail page`
- v40 commits:
  - `0ac6ee6` E-5: New API Token Readiness
  - `94c76c6` E-1: Sign-in page real Supabase Auth flow
  - `73d8e35` E-2: Chat detail page

## Do-Not-Read-Whole-First Files

These are large and should be read by symbols/sections first:

- `src/store/nexus-store.ts`
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`

## Safe-To-Touch-First Areas For C-1

For the next packet, prefer docs/type-contract work before route logic:

- `docs/agent-runs/core-foundry-preparation-2026-06-27/**`
- `docs/living/NEXUS_CURRENT_STATE.md` if updating stale status only
- `src/lib/supabase/database.types.ts` only if C-1 explicitly chooses type parity work and reads relevant Next/Supabase instructions first

## Requires Symbol-Level Read

- `src/lib/backend/models/global-chat-repository.ts`
- `src/lib/backend/models/wallet-repository.ts`
- `src/lib/backend/new-api-token/user-new-api-token-service.ts`
- `src/app/api/global-chat/route.ts`
- `src/app/api/user/token-status/route.ts`
- `src/app/api/imports/route.ts`
- `src/lib/backend/api/api-handler.ts`

## Known Uncertainties

- Live Supabase schema was not queried in C-0; evidence is from local migrations/types/source docs.
- Notion parent/00/06 pages were read; the Phase 5 Execution Packet Selection page named by prior context was not found under the fetched parent tree.
- `database.types.ts` appears stale relative to migrations; C-1 should confirm whether this is intentional, generated-type lag, or local-only branch state.
- E-1 final browser verification was not performed in C-0; C-0 intentionally stayed on core line mapping.

