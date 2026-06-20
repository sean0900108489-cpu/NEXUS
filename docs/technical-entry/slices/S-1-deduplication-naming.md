# S-1: Deduplication & Naming Boundary Map

**Phase:** A→B
**Depends on:** S-0 (Authority Baseline confirmed)
**Status:** Design only — no implementation authorized

## Objective
Mark all duplicate concepts and define clear naming boundaries between Wallet/Plan, Main Chat/Workspace Chat, Usage/Wallet, Resource/Knowledge. No code deletion — only marking.

## Code Domains Touched (Read-only)
- `src/lib/backend/models/plan-config.ts` — plan quota vocabulary
- `src/lib/backend/models/quota-gate.ts` — gate naming
- `src/lib/backend/models/usage-ledger.ts` — usage recording vocabulary
- `src/lib/backend/models/model-catalog.ts` — model pricing metadata
- `src/lib/nexus-types.ts` — cross-cutting type definitions
- `src/lib/nexus-registry.ts` — plugin/tool/model registry
- `src/store/nexus-store.ts` — state slice naming

## Data Domains Touched (Read-only)
- Supabase `model_usage_ledger` — column naming audit
- Supabase NOVA tables — ownership column audit
- Supabase `messages` — workspace scoping audit

## What This Slice Designs
1. **Duplicate pair catalog** — 10 identified pairs (from Technical Entry Report §9.1):
   - Plan vs Wallet → Plan = entitlement, Wallet = truth
   - monthlyPoints vs wallet_balance → monthlyPoints → monthlyCreditGrant
   - quota gate vs wallet balance gate → unify to wallet balance gate
   - chargedPoints vs credit_cost → rename to credit_cost
   - model_usage_ledger vs wallet_transactions → link, don't merge
   - Main Chat vs Workspace Chat → separate domains
   - Usage Record vs Wallet Record → separate audit vs financial truth
   - Workspace Resource vs Knowledge Source → NOVA indexes, doesn't replace
   - NEXUS catalog models vs New API models → single source of truth
   - SERVER_MODEL_CATALOG vs New API channels → one truth source

2. **Naming boundary document** — for each duplicate pair:
   - Current name(s) in code
   - Which name becomes canonical
   - Which name is deprecated/marked stale
   - Where each name appears in code (file:line references)

3. **Stale concept marker list** — which docs/comments/code carry old names that must be marked (not deleted)

## Validation Method
- Every duplicate pair has a canonical name chosen
- Every stale reference has a code location identified (file + approximate line)
- No code is changed — only a map is produced
- Map aligns with Owner Final Lock vocabulary

## Forbidden Areas
- Do not delete or rename any code
- Do not add `@deprecated` annotations to code (only to the map document)
- Do not change any Supabase schema column names
- Do not change any API route names

## Dependency Order
After S-0. Before all other slices (S-2 through S-11 depend on canonical naming).

## Rollback / No-Op Validation
No code changed. Map document is the only artifact. If map is incorrect, update the map — no code to roll back.
