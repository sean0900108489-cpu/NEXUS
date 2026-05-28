# NEXUS Iteration Upgrade Ranking

Generated: 2026-05-28
Scope: post-scan version candidates scored from 0-10 for zero-friction implementation, stability, architecture logic, frontend/backend/function coupling, performance, extensibility, customization, and Codex readability.
This file is documentation only. It does not change app behavior.

Post-V15 note: V15 landed as a conservative local persistence metadata pass. It preserves active messages and memory, bumps Zustand persist to version `14`, and records blocked durability reasons. V16 remains the next foundation item before destructive message trimming; V18 remains required before stricter memory lifecycle changes.

## 1. Scoring Model

Version numbers below are proposed next-iteration labels, not existing releases.

Final score uses this weighted goal:

| Dimension | Weight | Meaning |
| --- | ---: | --- |
| Zero-friction future changes | 20% | Future Codex/engineers can find the right type, registry, service, route, test, and boundary quickly. |
| Stability | 20% | Reduces data loss, stuck streams, hidden state growth, sync failure, permission drift, and secret leakage. |
| Architecture logic | 20% | Strengthens source-of-truth routing, bounded domains, no-duplicate rules, and clean interaction chains. |
| Frontend/backend/function coupling | 15% | Makes UI action -> store -> API/client -> service -> repository -> projection easier to trace. |
| Frontend speed / UI hygiene | 10% | Shrinks render pressure, persisted payloads, hydration cost, layout risk, and hot shell complexity. |
| Feature/extensibility value | 10% | Adds or unlocks new capabilities without bypassing existing sockets. |
| Codex execution readability | 5% | Makes future agent execution more predictable and less ambiguous. |

Risk adjustment is already folded into the final score. High-value items that require broad migrations or unclear ownership get reduced until their dependency path is clean.

## 2. Repeated Scoring Summary

Pass 1 ranked by raw value: state hygiene, sync completion, API contract consistency, history/memory lifecycle, frontend shell cleanup.

Pass 2 reduced scores for broad blast radius: Workflow Runtime expansion, Infinite Canvas, real DB query, and real video providers dropped because they depend on cleaner state/sync/tool boundaries first.

Pass 3 promoted Codex readability as a version upgrade: execution maps, scanners, and route/domain indexes directly improve future zero-friction implementation, so they stay in the top 10.

## 3. Candidate Version Scores

| Version | Candidate upgrade | Main area | ZF | ST | AL | CP | UI/Perf | EX | CR | Final |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| V15 | Active State Hygiene and Local Persistence Diet | frontend/state/performance | 9.8 | 9.7 | 9.6 | 9.1 | 9.5 | 7.6 | 9.2 | 9.5 |
| V16 | Sync Operation Applier Completion | backend/sync/system loop | 9.2 | 9.7 | 9.6 | 9.8 | 7.4 | 8.3 | 8.5 | 9.3 |
| V17 | API Route and Client Contract Canonicalization | backend/API/coupling | 9.6 | 9.3 | 9.4 | 9.7 | 7.7 | 8.1 | 9.0 | 9.2 |
| V18 | History and Memory Lifecycle Completion | history/memory/function | 9.0 | 9.4 | 9.2 | 9.0 | 8.6 | 8.5 | 8.3 | 9.0 |
| V19 | Frontend Shell Decomposition and Selector Optimization | frontend/speed | 9.0 | 8.8 | 8.7 | 8.6 | 9.6 | 7.6 | 8.2 | 8.7 |
| V20 | Artifact Lifecycle Completion | artifacts/function/backend | 8.6 | 8.9 | 8.8 | 8.7 | 7.8 | 8.9 | 8.0 | 8.6 |
| V21 | Codex Execution Map v2 and Auto-Scan Toolkit | Codex/readability | 9.7 | 8.0 | 9.1 | 8.6 | 7.0 | 7.8 | 10.0 | 8.6 |
| V22 | Observability Feedback Loop and Debug Console | system loop/backend comms | 8.5 | 8.8 | 8.7 | 8.9 | 7.9 | 8.0 | 8.6 | 8.5 |
| V23 | Registry Consistency and Extension Socket Tooling | extension layer | 9.0 | 8.7 | 9.1 | 8.4 | 7.1 | 8.9 | 8.8 | 8.5 |
| V24 | Runtime Streaming and Provider Adapter Robustness | runtime/backend/function | 8.5 | 8.8 | 8.4 | 8.8 | 8.0 | 8.4 | 7.7 | 8.3 |
| V25 | Theme and Appearance Customization Hardening | customization/frontend | 8.1 | 8.0 | 8.3 | 7.6 | 8.4 | 8.6 | 7.9 | 8.0 |
| V26 | Permission, RLS, and Multi-user Hardening | backend/security | 8.0 | 9.0 | 8.6 | 8.2 | 6.8 | 7.5 | 7.6 | 8.0 |
| V27 | Performance Budget, Bundle Hygiene, and Stress Bench | speed/frontend | 8.2 | 8.0 | 8.1 | 7.5 | 9.3 | 7.1 | 7.5 | 7.9 |
| V28 | Workflow Runtime Lite Expansion Pack | function/graph/extension | 7.8 | 7.8 | 8.3 | 8.0 | 7.8 | 9.0 | 7.6 | 7.9 |
| V29 | Feature Flag Rollout Discipline | deployment/system loop | 7.8 | 8.4 | 8.0 | 8.0 | 7.0 | 7.5 | 7.6 | 7.8 |
| V30 | Infinite Canvas / tldraw Workbench Plane | extra feature/frontend | 7.3 | 7.3 | 7.8 | 7.4 | 8.2 | 9.0 | 7.0 | 7.6 |
| V31 | Real DB Query / Data Analysis Tool | extra feature/tool/backend | 7.1 | 7.4 | 7.7 | 7.9 | 6.9 | 8.8 | 7.0 | 7.5 |
| V32 | Real Video Provider Execution | extra feature/provider | 6.8 | 7.0 | 7.2 | 7.5 | 7.1 | 8.7 | 6.8 | 7.2 |

## 4. Top 10 Upgrade Versions

| Rank | Version | Score | Why it ranks here | First files to read |
| ---: | --- | ---: | --- | --- |
| 1 | V15 Active State Hygiene and Local Persistence Diet | 9.5 | Resolves the biggest zero-friction and speed risk: active `agent.messages` and `agent.memory` still live inside persisted workspaces. This makes future frontend, history, sync, import/export, and performance work cleaner. | `src/store/nexus-store.ts`, `src/lib/nexus-types.ts`, `src/lib/workspace-kernel.ts`, `src/lib/backend/workspace/workspace-snapshot-serializer.ts` |
| 2 | V16 Sync Operation Applier Completion | 9.3 | Turns the local-first sync loop from mostly queued into more complete backend projection. It directly improves stability, backend communication, system loop reliability, and confidence after mutations. | `src/lib/state-sync.ts`, `src/lib/sync/local-sync-queue-adapter.ts`, `src/lib/backend/sync/*`, `src/app/api/v1/sync/**` |
| 3 | V17 API Route and Client Contract Canonicalization | 9.2 | Makes new backend work predictable: shared types, `apiHandler`, idempotency, permission, `nexusApiClient`, special-route exceptions, and route tests all become easier to follow. | `src/lib/backend/api/api-handler.ts`, `src/lib/api/nexus-api-client.ts`, `src/app/api/**/route.ts`, local Next route docs |
| 4 | V18 History and Memory Lifecycle Completion | 9.0 | Closes multiple `Needs verification` items: memory write path, active-window enforcement, cursor tie-breaks, and durable context boundaries. It also prevents hidden transcript growth. | `src/lib/backend/history/*`, `src/app/api/v1/agents/[agentId]/messages/**`, `src/app/api/v1/agents/[agentId]/memory/route.ts` |
| 5 | V19 Frontend Shell Decomposition and Selector Optimization | 8.7 | `nexus-ops.tsx` is the main orchestration surface. Splitting it by responsibility and narrowing selectors improves page speed, visual stability, and future UI implementation clarity. | `src/components/nexus/nexus-ops.tsx`, `src/components/nexus/nexus-graph.tsx`, `src/store/nexus-store.ts` |
| 6 | V20 Artifact Lifecycle Completion | 8.6 | Completes artifact history, archive/reference semantics, and materialization reliability. This makes tool output, notebooks, messages, and future media features safer to connect. | `src/lib/backend/artifacts/*`, `src/app/api/v1/artifacts/**`, `src/lib/backend/history/historical-data-fetcher.ts` |
| 7 | V21 Codex Execution Map v2 and Auto-Scan Toolkit | 8.6 | Directly improves Codex execution: demand classifier, source-of-truth lookup, scan commands, route/domain map, verification routing, and no-pollution checks become executable instead of just documented. | `NEXUS_CODEX_EXECUTION_MAP.md`, `NEXUS_TOTAL_ARCHITECTURE_SCAN.md`, `ARCHITECTURE.md`, `scripts/check-preflight.mjs` |
| 8 | V22 Observability Feedback Loop and Debug Console | 8.5 | Converts errors, traces, metrics, sync state, route failures, and deployment checks into a readable system loop, especially in `RightIntel`. This helps diagnose "function wrong / coupling unclear" quickly. | `src/lib/backend/observability/*`, `src/app/api/v1/observability/**`, `src/components/nexus/nexus-ops.tsx` |
| 9 | V23 Registry Consistency and Extension Socket Tooling | 8.5 | Prevents duplicate feature paths before they land. A registry checker/scaffold path makes new tools, providers, graph nodes, and capabilities plug into existing sockets. | `src/lib/nexus-registry.ts`, `src/lib/backend/deployment/registry-consistency-checker.ts`, `src/lib/tool-executors.ts` |
| 10 | V24 Runtime Streaming and Provider Adapter Robustness | 8.3 | Improves live agent reliability: task lifecycle, cancellation, fallback, provider settings, stream events, and model registry enforcement become easier to trust. | `src/lib/backend/runtime/*`, `src/lib/backend/api/agent-stream-service.ts`, `src/app/api/v1/agents/[agentId]/stream/route.ts` |

## 5. Recommended Execution Order

1. V15 first: shrink and clarify active frontend state before adding heavier workflows or canvas systems. Conservative metadata pass is complete; destructive trimming remains blocked by V16/V18 dependencies.
2. V16 next: complete the sync loop so frontend state changes have a reliable durable path.
3. V17 after V16: harden route/client contracts once backend domains are clearer.
4. V18 and V20 can run as parallel domain work after V15/V16 because both depend on cleaner persistence boundaries.
5. V19 can begin early, but large UI rewrites should avoid changing state semantics until V15 decisions are settled.
6. V21 should be updated after each major architecture upgrade so Codex execution stays current.
7. V25-V32 are valuable, but they should not outrank the foundation unless the user specifically wants visible feature expansion first.

## 6. Top 10 Coverage Check

| Requested upgrade area | Covered by |
| --- | --- |
| Extra feature development | V20, V23, V24; later V28-V32 |
| Frontend cleanup | V15, V19 |
| Web speed upgrade | V15, V19, V27 |
| Function layer upgrade | V18, V20, V24 |
| Extension layer upgrade | V23, V28 |
| Backend communication improvement | V16, V17, V22 |
| Backend upgrade | V16, V17, V18, V20, V26 |
| System loop upgrade | V16, V22, V29 |
| Appearance customization upgrade | V25 |
| Codex execution readability | V21 |

## 7. Final Ranking Rule

If a candidate feature cannot trace this chain, it should score below 8 until the missing link is resolved:

```text
UI action
  -> Zustand action
  -> shared type / registry slot
  -> nexusApiClient or state-sync port
  -> /api/v1 route
  -> apiHandler
  -> domain service
  -> repository / Supabase
  -> observability / sync / projection back to UI
```

The strongest near-term upgrades are not the flashiest features. They are the upgrades that make every later feature land with less guessing, less duplicated state, fewer hidden persistence leaks, and clearer rollback/debug paths.
