# NEXUS Wallet Home Workspace NOVA Technical Entry Report

**Date:** 2026-06-20
**Status:** Read-only diagnostic — No implementation yet
**Sources:** GitHub (sean0900108489-cpu/NEXUS, main branch), Notion Command Center (3 primary pages + 6 sub-pages), New API VPS production state

---

## 1. Code Domain Map

### 1.1 Entry Point (Confirmed)

`src/app/page.tsx` currently mounts `NexusOps` directly as the application root. This is **workspace-first** — the user lands on a full workspace OS surface immediately after authentication.

```
/ (page.tsx)
  └─ NexusStyleRuntimeProvider
     └─ NexusProductionPageShellBoundary [shellId="workspace"]
        ├─ NexusProductionPreviewController
        └─ NexusOps  ← workspace-first entry
```

**Evidence:** GitHub `src/app/page.tsx` — renders `<NexusOps />` with no intermediate home/lobby screen.

### 1.2 Frontend Component Architecture (Confirmed)

```
src/components/
  ├─ nexus/
  │   ├─ nexus-ops.tsx              — workspace shell orchestrator
  │   ├─ nexus-production-preview-controller.tsx
  │   ├─ nexus-production-page-shell-boundary.tsx
  │   ├─ nexus-main-visual.tsx, nexus-welcome.tsx, nexus-landing.tsx
  │   ├─ nexus-chat-panel.tsx       — workspace-level chat
  │   ├─ nexus-graph-panel.tsx      — graph/flow mode
  │   ├─ nexus-command-palette.tsx  — Cmd+K command system
  │   ├─ nexus-context-menu-registry.tsx
  │   └─ ... (agent, tool, workflow, artifact panels)
  ├─ style-engine/
  │   ├─ nexus-style-runtime-provider.tsx
  │   └─ nexus-style-engine.tsx
  └─ theme-provider.tsx
```

**Evidence:** GitHub `src/components/nexus/` directory listing.

### 1.3 Library / Business Logic Layers (Confirmed)

```
src/lib/
  ├─ nexus-types.ts          (41.6KB) — cross-cutting type definitions
  ├─ nexus-registry.ts       (26.2KB) — plugin/tool/model/provider registry
  ├─ nexus-defaults.ts       (14.8KB) — default configurations
  ├─ state-sync.ts           (35.6KB) — local↔cloud workspace sync engine
  ├─ workspace-kernel.ts     (17.7KB) — workspace lifecycle kernel
  ├─ tool-executors.ts       (6.2KB)  — tool execution dispatch
  ├─ workflow-engine.ts      (7.8KB)  — workflow orchestration
  ├─ stream-retry.ts         (3.3KB)  — SSE stream recovery
  ├─ embed-url.ts            (4.5KB)  — URL/resource embedding
  ├─ predictive-intel.ts     (1.3KB)  — predictive intelligence stub
  ├─ adapters/               — model adapters (DALL-E, Gemini, etc.)
  ├─ api/                    — API client library (nexusApiClient)
  ├─ attachments/            — file attachment handling
  ├─ backend/                — server-side services
  ├─ composer/               — composer/input pipeline
  ├─ media/                  — media/image processing
  ├─ models/                 — model catalog & pricing
  ├─ style-engine/           — theming/style runtime
  ├─ supabase/               — Supabase client, database.types.ts
  ├─ sync/                   — sync protocol implementation
  ├─ tools/                  — tool slot/executor registries
  ├─ workflow-pro/           — workflow-pro engine
  └─ workflow-runtime-lite/  — lightweight workflow executor
```

**Evidence:** GitHub `src/lib/` directory listing.

### 1.4 State Management (Confirmed)

```
src/store/
  ├─ nexus-store.ts    (144KB) — Zustand mega-store
  └─ nexus-store.test.ts (58KB)
```

**Evidence:** GitHub `src/store/` — single store file pattern.

### 1.5 API Route Map (Confirmed)

```
src/app/api/
  ├─ chat/              ✅ /api/chat — main LLM chat endpoint
  ├─ v1/
  │   ├─ agents/        ✅ /api/v1/agents/[agentId]/stream — agent SSE
  │   └─ artifacts/     ✅ /api/v1/artifacts — artifact CRUD
  ├─ image-gen/         ✅ /api/image-gen — image generation
  ├─ model-gateway/     ✅ /api/model-gateway/provision — New API token provisioning
  ├─ models/            ✅ /api/models — model catalog
  ├─ workflow-pro/      ✅ /api/workflow-pro/brain-draft — workflow drafts
  ├─ agent-stream/      ⚠️ whitelisted
  ├─ system-status/     ✅ operational
  ├─ admin/             ✅ admin routes
  ├─ memory-compress/   ❌ blocked
  ├─ tools/             ❌ blocked (fs-scanner, web-surfer)
  └─ predictive-intel/  ❌ blocked
```

**Evidence:** Notion `NEXUS New API VPS 部署狀況` Section 8 + GitHub `src/app/api/` listing.

---

## 2. Data Domain Map

### 2.1 Supabase Live Schema Overview (Confirmed)

36 public tables, all RLS-enabled, 34 migrations. PostgreSQL 17.6.1.121 on `ap-southeast-2`.

| Domain | Tables | Status |
|--------|--------|--------|
| **Workspace / State / Sync** | workspaces, workspace_memberships, workspace_snapshots, workspace_state_entities, sync_operations | Live |
| **Chat / Runtime / Memory** | messages, agent_runtime_sessions, agent_tasks, agent_runtime_events, agent_memory_records | Live |
| **Artifact / Prompt / Notebook / Tools** | artifacts, artifact_references, prompts, prompt_revisions, notebooks, tool_runs, tool_permissions | Live (tool_runs = 0 rows) |
| **Observability / Deployment / Flags** | system_events, usage_metrics, api_idempotency_keys, permission_audit_logs, feature_flags, deployment_checks | Live |
| **Nova RAG / LINE System / New API** | nova_documents, nova_chunks, nova_ingest_runs, line_system_*, model_usage_ledger, user_new_api_tokens | Live |
| **Auth/User** | (managed by Supabase Auth, not in public schema) | External |

**Evidence:** Notion `NEXUS Scan Task Brief 2026-06-19` Section 2 + Notion `NEXUS New API VPS 部署狀況` Section 4.8.

### 2.2 Data Boundary Map (Current vs. Future)

```
CURRENT (workspace-first):
  messages ────────► workspace-scoped via workspace_id
  agent_tasks ─────► workspace-scoped
  artifacts ───────► workspace-scoped
  NOVA tables ─────► no ownership column (personal-tool residue)

FUTURE (platform-first):
  ┌──────────────────────────────────────────┐
  │ ACCOUNT LEVEL                             │
  │  global_conversations (NEW)               │
  │  wallet_ledger (NEW)                      │
  │  wallet_transactions (NEW)                │
  │  user_credits (NEW or extend plan)       │
  ├──────────────────────────────────────────┤
  │ WORKSPACE LEVEL                           │
  │  messages (existing, workspace-scoped)    │
  │  workspace_chats (existing)               │
  │  artifacts (existing)                     │
  │  agent_tasks (existing)                   │
  │  NOVA tables + workspace_id (migrated)    │
  ├──────────────────────────────────────────┤
  │ PLATFORM (shared)                         │
  │  model_usage_ledger (existing)            │
  │  user_new_api_tokens (existing)           │
  │  model catalog (existing)                 │
  └──────────────────────────────────────────┘
```

**Key gap:** No `global_conversations` table exists. No `wallet_ledger` table exists. No `workspace_id` on NOVA tables.

---

## 3. New API / Wallet Gap Map

### 3.1 Current State (Confirmed)

New API is live on VPS (`codex-vps-01`, Ubuntu 24.04.3, Docker Compose):
- 3 channels: DeepSeek (ID=1), OpenAI-General (ID=2), OpenRouter (ID=3)
- 15 user accounts provisioned
- Per-user encrypted token mapping via `user_new_api_tokens` table
- Full chain: Auth → Plan Check → Token Decrypt → New API Gateway → Usage Ledger

**Evidence:** Notion `NEXUS New API VPS 部署狀況` Sections 1-4.

### 3.2 Model Catalog Drift (Confirmed)

| NEXUS Catalog (10 models) | New API Available (14 models) | Gap |
|---------------------------|-------------------------------|-----|
| gemini-2.5-flash | — | NEXUS has, New API lacks |
| gemini-2.5-pro | — | NEXUS has, New API lacks |
| claude-sonnet-4 | — | NEXUS has, New API lacks |
| img2 (GPT Image 2) | gpt-image-2 | Name mismatch |
| — | deepseek-reasoner | New API has, NEXUS lacks |
| — | o3 | New API has, NEXUS lacks |
| — | gpt-5.2 | New API has, NEXUS lacks |
| — | gpt-5.5 | New API has, NEXUS lacks |
| — | GPT Image 2 | New API has, NEXUS lacks |

**Evidence:** Notion `NEXUS 技術開口順序與SOP閉環` Section 1, New API Section.

### 3.3 Plan Config → Wallet Gap

| Current Concept | Current Implementation | Wallet Target |
|----------------|----------------------|---------------|
| `min_plan` | Model access gate per plan tier | Capability rule / price metadata |
| `monthlyPoints` | Hard cap per plan tier | Monthly allowance grant |
| `quota gate` | Blocks on monthly exhaustion | Wallet balance gate |
| `chargedPoints` | Point cost multiplier per model | Credit cost per operation |
| `model_usage_ledger` | Token usage audit | Retain, link to wallet transactions |
| `plan config` | Free/Basic/Pro/Team | Plan = entitlement layer, Wallet = truth |

**What exists:** Plan config, monthly points, quota gate, charged points, usage ledger.
**What's missing:** Wallet balance table, wallet transaction table, credit deduction middleware at the API gateway layer, balance check replacing quota gate.

**Evidence:** Notion `NEXUS 大規模迭代地圖` Wallet section + `NEXUS 技術開口順序與SOP閉環` Section 3.

---

## 4. Plan-to-Wallet Migration Map

### 4.1 Transition Strategy (Advised, Not Final)

```
Phase C-1: Read-only wallet balance concept
  → Define wallet_balances table
  → Define wallet_transactions table
  → Keep existing plan config unchanged

Phase C-2: Wallet check at AI gateway
  → Insert balance check BEFORE model call (alongside quota gate)
  → Write wallet_transaction alongside model_usage_ledger entry
  → Dual-write for transitional audit

Phase C-3: Plan becomes entitlement layer
  → plan = "monthly credit grant + capability rules + discount multiplier"
  → wallet = "actual balance truth"
  → Remove quota gate hard block, replace with wallet balance gate

Phase C-4: Remove legacy plan quota
  → monthlyPoints → monthly_credit_grant
  → quota gate → wallet_balance_gate
  → min_plan → capability_rule / price_metadata
```

### 4.2 Data Migration Decision Points

1. Existing `monthlyPoints` → migrate to initial wallet balance, or discard?
2. Existing `model_usage_ledger` rows → backfill wallet_transactions, or start fresh?
3. `chargedPoints` multiplier → become `credit_cost` per model, or per operation type?
4. Free users → get initial wallet credits, or zero-balance + pay-as-you-go?

**Status:** All four are owner decisions. No implementation until resolved.

---

## 5. Home Shell Technical Entry Map

### 5.1 Current Entry (Confirmed)

```
/ → NexusOps (workspace-first, no intermediate surface)
```

### 5.2 Target Entry (Advised)

```
/ → NEXUS Home Shell (platform-first)
  ├─ Left sidebar
  │   ├─ New Chat button
  │   ├─ Search
  │   ├─ Workspace List (with indicators)
  │   ├─ Recent Global Chats
  │   └─ Account / Settings
  ├─ Center: Chat input (main chat platform)
  └─ Top right: Wallet balance indicator
```

### 5.3 Code Impact Map

| File/Layer | Change |
|-----------|--------|
| `src/app/page.tsx` | Replace `NexusOps` with `NexusHome` shell component |
| `src/components/nexus/nexus-ops.tsx` | **Do not delete** — re-route to workspace surface |
| `src/app/workspace/[id]/page.tsx` (NEW) | Workspace OS route |
| `src/components/nexus/nexus-home-shell.tsx` (NEW) | New home shell component |
| `src/components/nexus/nexus-global-chat.tsx` (NEW) | Account-level main chat |
| `src/components/nexus/nexus-sidebar.tsx` (NEW) | New sidebar with workspace list |
| `src/store/nexus-store.ts` | Add global chat slice, workspace list slice |
| `src/lib/nexus-types.ts` | Add global conversation types |

### 5.4 Shell Boundary Rules

- Home shell owns: main chat, sidebar, recent chats, workspace list, wallet display
- Workspace OS owns: panels, graph, workflow, artifacts, workspace chat
- Home shell must NOT own: workspace internals, NOVA notebook, tool runtime
- Workspace OS must NOT own: global navigation, account settings, wallet management

---

## 6. Main Chat vs Workspace Chat Boundary

### 6.1 Definition (Advised)

| Property | Main Chat (Global) | Workspace Chat Panel |
|----------|-------------------|---------------------|
| **Scope** | Account-level | Workspace-level |
| **Persistence** | `global_conversations` table | `messages` table (existing) |
| **NOVA Indexable** | No (by default) | Yes (via workspace notebook) |
| **Importable to Workspace** | Yes (copy/move/link — owner decision) | N/A (already in workspace) |
| **Shown in Recent Chats** | Yes | No (shown inside workspace only) |
| **Search Scope** | Global search | Workspace search |
| **Permission Model** | User-only | Workspace members |
| **Wallet Cost** | Deducted from user wallet | Deducted from user wallet |

### 6.2 Why They Cannot Be the Same Concept

1. **Data boundary:** Global chats belong to user account; workspace chats belong to workspace container. Mixing them creates ambiguous ownership on delete, share, and export.
2. **Index boundary:** NOVA workspace notebook should only index workspace-scoped content. If global chats leak into workspace index, evidence becomes unreliable.
3. **Permission boundary:** Workspace chats may be visible to other workspace members. Global chats are private to the account.
4. **UI architecture:** Global chats appear in home sidebar. Workspace chats appear inside workspace panels. Different navigation scopes.

**Evidence:** Notion `NEXUS 大規模迭代地圖` Sections "Main Chat / Workspace Chat 的邊界" and `NEXUS 技術開口順序與SOP閉環` Section 5.

---

## 7. Import-to-Workspace Contract (Draft, Pending Owner)

### 7.1 Three Options

#### Option A — Copy (Recommended for Phase 1)
- Main chat retains original in recent chats
- A workspace-scoped copy is created in workspace chat panel
- NOVA can index the workspace copy
- **Pros:** Safe, reversible, clear provenance
- **Risks:** Content divergence, needs "Imported from" metadata

#### Option B — Move
- Main chat removed from recent chats
- Conversation ownership transfers to workspace
- NOVA can index the moved conversation
- **Pros:** Clean data ownership
- **Risks:** User confusion on disappearance, needs rollback/audit

#### Option C — Link
- Main chat retained; workspace holds reference to same conversation
- NOVA indexability depends on permission contract
- **Pros:** No data duplication
- **Risks:** Complex permission/deletion semantics, especially for shared workspaces

### 7.2 Contract Requirements (Regardless of Choice)

1. Import action must be explicit (not drag-and-drop, not auto)
2. Source provenance must be recorded (`imported_from_global_chat_id`)
3. NOVA index eligibility must be explicit per import
4. Workspace copy must inherit workspace permissions (not account permissions)
5. Delete of source must have defined cascade (delete copy? orphan? block?)

**Status:** Owner must decide A/B/C + first-version scope.

---

## 8. NOVA Workspace Notebook Source Map

### 8.1 Current NOVA State (Confirmed)

NOVA tables exist in NEXUS Supabase project:
- `nova_documents` — ingested documents
- `nova_chunks` — chunked/embedded text
- `nova_ingest_runs` — ingestion job history
- `match_nova_chunks` — RPC for vector similarity search

**Critical issues:**
- Broad public policies: insert/update/delete on nova_documents, nova_chunks, nova_ingest_runs use `true` (allow all), roles include `anon`/`authenticated` — **P0 security gap**
- No `user_id` or `workspace_id` column — personal-tool residue
- `match_nova_chunks` exposed as public RPC — unrestricted vector search

**Evidence:** Notion `NEXUS Scan Task Brief` Section 3.C + `NEXUS NOVA Integration Research Report` Section 3.

### 8.2 Future NOVA Source Map (Advised)

NOVA should index the following workspace-level sources:

| Source Type | Table/Origin | First Version | Later |
|------------|-------------|---------------|-------|
| Workspace metadata | workspaces | ✅ | |
| Panel chat summaries | messages (workspace-scoped) | ✅ | |
| Graph node prompts | agent_tasks | — | ✅ |
| Graph node outputs | agent_runtime_events | — | ✅ |
| Workflow results | workflow-pro artifacts | — | ✅ |
| Artifact metadata | artifacts | ✅ | |
| Uploaded documents | nova_documents | ✅ | |
| Imported main chats | global_conversations (copied) | ✅ | |
| Tool outputs | tool_runs | — | ✅ |
| CLI/MCP outputs | future | — | ✅ |

### 8.3 NOVA Tenancy Model (Pending Owner)

| Model | Description | Recommendation |
|-------|-------------|----------------|
| User-scoped | `nova_documents.user_id` — all user's docs in one bucket | Phase 1 MVP |
| Workspace-scoped | `nova_documents.workspace_id` — per-workspace isolation | Long-term target |
| Hybrid | `user_id` + optional `workspace_id` | Most complex |

**Advised path:** Start user-scoped for MVP, migrate to workspace-scoped when workspace permissions mature.

### 8.4 NOVA Must NOT

- Be an independent product with separate auth/billing
- Expose its own MCP server
- Allow direct external Supabase access
- Read account-level global chats without explicit import
- Have broad/anonymous RLS policies — **fix before any new feature**

---

## 9. Duplicate / Stale Concept List

### 9.1 Duplicate Concepts (Mark for Resolution)

| Duplicate Pair | Current State | Resolution |
|---------------|---------------|------------|
| Plan vs Wallet | Both govern model access & spending | Plan → entitlement, Wallet → truth |
| monthlyPoints vs wallet_balance | Both represent spending limits | monthlyPoints → monthly credit grant |
| quota gate vs wallet balance gate | Both block usage on exhaustion | Unify to wallet balance gate |
| chargedPoints vs credit_cost | Both represent per-operation cost | Rename to credit_cost |
| model_usage_ledger vs wallet_transactions | Both record consumption events | Link, don't merge |
| Main Chat vs Workspace Chat | Currently not distinct in code | Separate domains |
| Usage Record vs Wallet Record | Currently fused in model_usage_ledger | Separate audit vs financial truth |
| Workspace Resource vs Knowledge Source | Currently conflated | NOVA indexes resources, doesn't replace them |
| NEXUS catalog models vs New API models | Drift of 4-5 models | Model catalog alignment (Phase A) |
| SERVER_MODEL_CATALOG vs New API channels | Two model truth sources | One source of truth |

### 9.2 Stale Concepts / Docs (Mark as Non-Current)

| Item | Why Stale | Status |
|------|-----------|--------|
| V29 cross-reference doc | Marked deprecated in V33 R7 | ✅ Marked (commit ad68497) |
| "NOVA as second product" framing | Replaced by Knowledge Service model | Mark stale |
| "Membership upgrade" pricing model | Replaced by wallet credits | Mark stale |
| Shared NEW_API_KEY pattern | Replaced by per-user token mapping | Mark stale |
| Old agent reports without evidence | Static scan, not live truth | Mark as "static scan only" |
| V32/V33 mixed references | Version drift in handoff docs | Clean up in next handoff |

---

## 10. Risk Map

### 10.1 P0 — Baseline Blockers (Misdiagnosis Risks)

| Risk | Detail | Evidence |
|------|--------|----------|
| NOVA broad policies | `anon`/`authenticated` can insert/update/delete nova_documents, nova_chunks, nova_ingest_runs | Supabase RLS audit |
| match_nova_chunks public exposure | Unrestricted vector search via public RPC | Supabase RPC audit |
| user_new_api_tokens read exposure | Must be server-only; verify grants revoked | RLS Enabled No Policy warning |
| Docs version drift | V32/V33 mixed, stale reports vs live metadata | Handoff Pack self-report |
| NOVA personal-tool residue | No user_id/workspace_id on NOVA tables | Schema inspection |

### 10.2 P1 — Commercial Blockers

| Risk | Detail | Evidence |
|------|--------|----------|
| NOVA user/workspace boundary | Undefined ownership model blocks commercial use | No workspace_id column |
| tool_runs = 0 rows | Tool execution audit path not exercised | Live Supabase count |
| Model catalog drift | NEXUS catalog vs New API mismatch → pricing/display errors | Catalog comparison |
| SECURITY DEFINER exposure | `record_permission_audit_log`, `nexus_ensure_workspace_session` callable by authenticated | Supabase function audit |
| Chat golden path unverified | Stream → save → reload not proven end-to-end | Self-reported gap |

### 10.3 P2 — Product Proof Gaps

| Risk | Detail |
|------|--------|
| Chat reload recovery | Not proven with live data |
| Image artifact lifecycle | Storage path verified, but end-to-end not tested |
| Workflow graph | Manual blueprint, not automated |
| CLI/MCP Resource Model | Defined in docs, not implemented |

### 10.4 P3 — Later Cleanup

| Risk | Detail |
|------|--------|
| Unused indexes | Low row count, safe to defer |
| Large file refactors | nexus-store.ts (144KB), nexus-types.ts (41KB) — not blocking |
| Style lab refactor | Non-blocking |
| Composer reasoning mode UX | Root cause located, UX not fixed |

---

## 11. Phase Sequencing (Advised, Not Commanded)

```
Phase A: Technical Truth Map          ← WE ARE HERE
  └─ Produce this report. No code changes.

Phase B: Deduplication & Naming
  └─ Mark stale concepts. Separate main chat vs workspace chat.

Phase C: New API / Wallet Technical Entry
  └─ Wallet balance concept, catalog alignment. No migration yet.

Phase D: NEXUS Home Shell Entry
  └─ / → Home (not NexusOps). NexusOps → workspace route.

Phase E: Global Chat Persistence
  └─ global_conversations domain. Recent chats.

Phase F: Import to Workspace
  └─ Copy/Move/Link. Owner decides mode.

Phase G: NOVA Workspace Notebook
  └─ Per-workspace indexing. Fix P0 policies first.

Phase H: Workspace OS Navigation Simplification
  └─ Home sidebar replaces workspace-level navigation.

Phase I: CLI / MCP / Tool Output
  └─ Resource Model first → CLI read-only → MCP resources → tools.

```

---

## 12. Owner Decisions Required

The following 14 questions must be answered before any implementation phase begins. Agents must not assume answers.

### Wallet & Commerce
1. **Wallet vs Plan:** Does wallet fully replace plan, or does plan become a monthly grant/discount layer?
2. **Initial credits:** Do free accounts receive initial wallet credits?
3. **Insufficient balance:** Block operation, downgrade model, or prompt top-up?
4. **Pricing model:** Extend from existing `chargedPoints` multiplier, or redesign?

### Home & Navigation
5. **NexusOps relocation:** Move to workspace route, or wrap inside Home Shell?
6. **Home layout:** Which elements in sidebar vs top bar vs center?

### Main Chat & Workspace
7. **Import mode:** Copy, Move, or Link for Phase 1? (Recommend: Copy only)
8. **Recent chats:** Do imported chats remain in global recent chats?

### NOVA
9. **Tenancy model:** User-scoped or workspace-scoped for Phase 1? (Recommend: user-scoped for MVP)
10. **Document sharing:** Can NOVA documents be shared across workspaces?
11. **Evidence visibility:** Should NOVA evidence/sources be visible in UI?
12. **File upload scope:** Owner/dev only, or any user?

### Integration Layer
13. **CLI scope:** Owner/dev-only initially, or open to members?
14. **MCP first version:** Read-only resources only, or include tools?

---

## 13. No Implementation Yet

This report is a read-only diagnostic artifact. No code has been modified. No migrations have been applied. No Supabase data has been altered. No deployments have been triggered.

The purpose of this report is exclusively to establish:

1. **Current technical truth** — what code, data, and infrastructure actually exist
2. **Gap analysis** — what the Wallet, Home, Workspace, and NOVA domains need that doesn't exist yet
3. **Boundary definitions** — what must NOT be mixed together
4. **Risk prioritization** — what blocks commercial readiness vs what can wait
5. **Decision inventory** — what the owner must decide before any agent writes code

The next agent or implementation phase should begin by reading this report, the Notion Command Center, live Supabase metadata, and GitHub current code — in that authority order — before any implementation task is decomposed.

---

## Appendices

### A. Source Evidence Index

| Source | Type | Status |
|--------|------|--------|
| Notion: NEXUS NOVA Handoff Pack — 2026-06-19 | Command Center | Current |
| Notion: NEXUS 大規模迭代地圖 — Wallet Home Workspace NOVA 2026-06-20 | Iteration Map | Current |
| Notion: NEXUS 技術開口順序與SOP閉環 2026-06-20 | Technical SOP | Current |
| Notion: NEXUS New API VPS 部署狀況 | Infrastructure State | Current |
| Notion: NEXUS NOVA Integration Research Report 2026-06-19 | Research Report | Current (evidence-backed) |
| Notion: NEXUS Scan Task Brief 2026-06-19 | Scan Brief | Current (3-agent scan) |
| Notion: 01 — Truth Map | Architecture Map | Current |
| Notion: 04 — Tech Debt Settlement | Debt Classification | Current |
| Notion: 09 — What Not To Do Yet | Constraint List | Current |
| GitHub: src/app/page.tsx | Entry Point | Current (main) |
| GitHub: src/app/api/ | API Routes | Current (main) |
| GitHub: src/lib/ | Business Logic | Current (main) |
| GitHub: src/store/ | State Management | Current (main) |
| GitHub: src/components/ | UI Components | Current (main) |

### B. Authority Order (Per Command Center)

1. Live Supabase metadata
2. Current GitHub code on selected branch
3. Current Notion / Google Doc command center
4. Agent reports with concrete evidence
5. Older architecture docs
6. Chat history / brainstorming notes
