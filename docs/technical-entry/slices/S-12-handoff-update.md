# S-12: Handoff Update & Stale Doc Marking

**Phase:** Closure
**Depends on:** S-0 through S-11 (all design slices complete)
**Status:** Design only — no implementation authorized

## Objective
Update the Notion Command Center with all produced documents, mark stale documents, and prepare the handoff for the next agent or implementation phase.

## Code Domains Touched
None (documentation only)

## Data Domains Touched
None (documentation only)

## What This Slice Designs

### 12.1 Document Inventory (All Produced in This Cycle)

| # | Document | Location | Status |
|---|----------|----------|--------|
| 1 | Technical Entry Report | `docs/technical-entry/NEXUS-Wallet-Home-Workspace-NOVA-Technical-Entry-Report.md` | ✅ Complete |
| 2 | Owner Decision Review | `docs/technical-entry/NEXUS-Owner-Decision-Review-2026-06-20.md` | ✅ Complete |
| 3 | Owner Lock Draft | `docs/technical-entry/NEXUS-Owner-Lock-Draft-2026-06-20.md` | ✅ Complete |
| 4 | Evidence Check Report | `docs/technical-entry/NEXUS-Evidence-Check-Report-2026-06-20.md` | ✅ Complete |
| 5 | Owner Final Lock | `docs/technical-entry/NEXUS-Owner-Final-Lock-2026-06-20.md` | ✅ Complete |
| 6 | Implementation Slice Plan | `docs/technical-entry/slices/` (13 files) | ✅ Complete |

### 12.2 Notion Index Update Plan

```
Add to NEXUS NOVA Handoff Pack — 2026-06-19 sub-pages:
  - NEXUS Wallet Home Workspace NOVA Technical Entry Report 2026-06-20 ✅
  - NEXUS Owner Decision Review 2026-06-20 ✅
  - NEXUS Owner Lock Draft 2026-06-20 ✅
  - NEXUS Evidence Check Report 2026-06-20 ✅
  - NEXUS Owner Final Lock 2026-06-20 ✅
  - NEXUS Implementation Slice Plan 2026-06-20 (PENDING — this document)

Update Read First section:
  - Add Implementation Slice Plan to required reading order
  - Update Current Core Truth to reflect 6 final locks
```

### 12.3 Stale Doc Marking

| Document | Stale Reason | Action |
|----------|-------------|--------|
| V29 cross-reference doc | Already marked stale (commit ad68497) | ✅ Confirmed |
| "NOVA as second product" framing | Replaced by Knowledge Service model in FINAL-LOCK-3 | Mark: "Superseded by Owner Final Lock 2026-06-20" |
| "Membership upgrade" pricing model | Replaced by wallet credits in FINAL-LOCK-1, FINAL-LOCK-6 | Mark: "Superseded by wallet credit model" |
| Old agent reports without evidence | Static scans, not live truth | Mark: "Static scan only. See Technical Entry Report for live state." |
| V32/V33 mixed references | Version drift | Mark: "Current version: V33 release hardening (10 rounds complete)" |
| User-scoped NOVA recommendations | Overridden by FINAL-LOCK-3 (workspace-scoped) | Mark: "Superseded — NOVA is workspace-scoped from Phase 1" |

### 12.4 Next Agent Startup Instructions

```
For the next agent or implementation phase:

1. READ these in order:
   a. NEXUS Owner Final Lock 2026-06-20 (6 binding decisions)
   b. NEXUS Implementation Slice Plan 2026-06-20 (this document)
   c. NEXUS Technical Entry Report 2026-06-20 (current state)

2. DO NOT start implementation until:
   a. Owner reviews and authorizes the Slice Plan
   b. A specific slice is selected for implementation
   c. The SOP closed loop is followed for that slice

3. SOP for each implementation slice:
   a. Re-read authority sources (live Supabase, current GitHub, Notion)
   b. Confirm no drift from Slice Plan assumptions
   c. Implement single slice only
   d. Verify against slice's validation method
   e. Update Notion with evidence
   f. Mark slice as complete
   g. Do NOT proceed to next slice without owner confirmation

4. Still forbidden (until owner authorizes implementation):
   - Git changes, Supabase changes, migrations, deploys
   - Wallet table creation
   - NOVA ingestion expansion beyond Phase 1 source map
   - CLI/MCP implementation before tool_runs > 0
```

## Validation Method
- All 6 produced documents listed with paths
- All Notion index pages created and linked
- All 6 stale items marked with superseding reference
- Next agent startup instructions are complete

## Forbidden Areas
- Do not modify any source document
- Do not delete any stale document
- Do not implement anything

## Dependency Order
After S-11. Final slice in the plan.

## Rollback / No-Op Validation
Only documentation updated. No code changed. No state changed.
