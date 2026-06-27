# Core Environment Risk Register

| Risk | Severity | Evidence | Core impact | Suggested packet |
|---|---:|---|---|---|
| Supabase generated types drift from migrations | High | `src/lib/supabase/database.types.ts:760` to `src/lib/supabase/database.types.ts:828` omits new global/wallet/token tables; migrations define them | Future core depends on typed Data Spine; `as never` keeps spreading | C-1 Data Spine Type Parity |
| Route/API contract styles are split | Medium | `apiHandler` v1 routes vs hand-rolled routes in global chat/wallet/workspaces/token/import | Core routes may produce mixed envelopes, error shapes, idempotency behavior | C-2 Route Contract Alignment |
| Import bridge returns provenance but not full persistence contract | Medium | `src/app/api/imports/route.ts:120` to `src/app/api/imports/route.ts:145` | Future core needs clear global-to-workspace transition | C-3 Import Bridge Contract |
| Workspace ownership line spans service role/request client/local fallback | Medium | `src/lib/backend/workspace/workspace-permission.ts:205` to `src/lib/backend/workspace/workspace-permission.ts:247` | Core creation needs stable workspace permission semantics | C-4 Workspace Ownership Contract |
| Wallet repo bypasses atomic spend RPC in main repository path | Medium | RPC migration exists; repo uses JS insert/upsert in `src/lib/backend/models/wallet-repository.ts:179` to `src/lib/backend/models/wallet-repository.ts:239` | Future model-heavy core needs reliable credit gate | C-5 Wallet Atomicity Alignment |
| Current state docs have stale route status | Low-Medium | `docs/living/NEXUS_CURRENT_STATE.md:30` to `docs/living/NEXUS_CURRENT_STATE.md:37` still marks `/chat/[id]` and `/sign-in` as future | Agent context can choose wrong packet | C-0 docs update / Notion update |
| Large workspace files remain responsibility-dense | Medium | `src/store/nexus-store.ts`, `src/components/nexus/nexus-ops.tsx`, `src/components/nexus/nexus-graph.tsx` over 2000 lines | Future core edits can accidentally land in mature workspace surface | C-6 Workspace Surface Boundary Map |

## Baseline Gate Note

No full lint/test/build run was needed for C-0 because this packet is documentation and mapping. If C-1 touches generated types or route code, it should run targeted tests plus `npm run typecheck`. Full `npm run check` can remain a later environment gate unless it becomes necessary for confidence.

