# NEXUS Implementation Slice Plan 2026-06-20

**Date:** 2026-06-20
**Status:** Slice planning only. No implementation authorized.
**Based on:** NEXUS Owner Final Lock 2026-06-20 (6 final locks)
**This document:** Master index for 12 slice files in `slices/` directory

---

## Principle

Every slice is:
1. Self-contained — designable, reviewable, and (when authorized) implementable independently
2. Verifiable — clear pass/fail criteria
3. Non-destructive — adds or clarifies, never removes
4. Rollback-aware — defines no-op validation
5. Dependency-ordered — no slice starts before dependencies locked

---

## Slice Map

| Slice | Phase | Objective | File |
|-------|-------|-----------|------|
| S-0 | Pre-flight | Authority source validation | [S-0-preflight.md](slices/S-0-preflight.md) |
| S-1 | A→B | Deduplication & naming boundary map | [S-1-deduplication-naming.md](slices/S-1-deduplication-naming.md) |
| S-2 | C | Wallet vocabulary & type definitions | [S-2-wallet-vocabulary-types.md](slices/S-2-wallet-vocabulary-types.md) |
| S-3 | C | Wallet balance gate design | [S-3-wallet-balance-gate.md](slices/S-3-wallet-balance-gate.md) |
| S-4 | C | Credit pricing metadata extension | [S-4-credit-pricing-metadata.md](slices/S-4-credit-pricing-metadata.md) |
| S-5 | C | Grant transaction flow design | [S-5-grant-transaction-flow.md](slices/S-5-grant-transaction-flow.md) |
| S-6 | E | Global conversations domain design | [S-6-global-conversations.md](slices/S-6-global-conversations.md) |
| S-7 | F | Import-to-workspace contract design | [S-7-import-workspace-contract.md](slices/S-7-import-workspace-contract.md) |
| S-8 | D | Home shell entry route design | [S-8-home-shell-entry.md](slices/S-8-home-shell-entry.md) |
| S-9 | G | NOVA workspace-scoped P0 fix | [S-9-nova-workspace-p0-fix.md](slices/S-9-nova-workspace-p0-fix.md) |
| S-10 | H | Workspace OS navigation simplification | [S-10-workspace-navigation-simplification.md](slices/S-10-workspace-navigation-simplification.md) |
| S-11 | I | CLI/MCP Resource Model design | [S-11-cli-mcp-resource-model.md](slices/S-11-cli-mcp-resource-model.md) |
| S-12 | Closure | Handoff update & stale doc marking | [S-12-handoff-update.md](slices/S-12-handoff-update.md) |

---

## Dependency Graph

```
S-0 (Pre-flight)
  └─ S-1 (Deduplication & Naming)
       ├─ S-2 (Wallet Vocabulary) ──┬── S-3 (Balance Gate)
       │                            ├── S-4 (Credit Pricing)
       │                            └── S-5 (Grant Flow)
       ├─ S-6 (Global Conversations)
       │    └─ S-7 (Import Contract)
       │         └─ (references S-2)
       └─ S-8 (Home Shell) ── S-10 (Workspace Nav)
            └─ (references S-6)

S-9 (NOVA P0 Fix) ── (independent after S-1)
S-11 (CLI/MCP) ── (depends on S-9 + S-10)
S-12 (Handoff) ── (depends on all)
```

---

## Wallet Phase C Detail (S-2 through S-5)

These 4 slices are fully unblocked by Owner Final Lock (LOCK-1, LOCK-4, LOCK-5, LOCK-6). They can be designed in parallel after S-2.

| Slice | What it designs | Owner Lock |
|-------|----------------|------------|
| S-2 | TypeScript interfaces for WalletBalance, WalletTransaction, CreditCost, InsufficientCreditsError. Rename map (chargedPoints → credits, 9 renames). | LOCK-1, LOCK-4, LOCK-6 |
| S-3 | assertSufficientCredits() contract replacing assertMonthlyQuotaAvailable(). Integration points in ai-gateway-service.ts and image-gen/route.ts. 402 error response contract with cheaperAlternatives. | LOCK-1, LOCK-5 |
| S-4 | credit_multiplier and credit_fixed_cost on SERVER_MODEL_CATALOG. Plan config repurposing (monthlyPoints → monthlyCreditGrant). Public vs private pricing boundary. | LOCK-6 |
| S-5 | Initial grant flow (on account creation). Monthly grant flow (cron). Deduction flow (on AI operation). Balance derivation rule. wallet_transaction ←→ model_usage_ledger link. | LOCK-4 |

---

## Forbidden Across All Slices

- Git changes (no commits, branches, PRs)
- Supabase changes (no DDL, DML, RLS modifications, migrations)
- Deployments (no Vercel, VPS, edge functions)
- Code writes (no new files, no edits)
- Wallet table creation (wallet_balances, wallet_transactions)
- NOVA ingestion expansion beyond Phase 1 source map
- UI rewrite (component files, CSS, layout changes)
- Token/secret exposure

---

## When Owner Authorizes Implementation

1. Owner selects a slice for implementation
2. Agent reads the slice design document
3. Agent re-validates authority sources (S-0 pattern)
4. Agent confirms no drift from assumptions
5. Agent implements the single slice
6. Agent verifies against slice's validation method
7. Agent updates Notion with evidence
8. Owner confirms before next slice

**No implementation until owner authorization.**

---

## Produced Files

All 12 slice files in:
`/Users/sean/Documents/FreeChat/docs/technical-entry/slices/`
