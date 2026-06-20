# NEXUS Wallet Home Workspace NOVA — Owner Decision Review

**Date:** 2026-06-20
**Based on:** Technical Entry Report 2026-06-20
**Status:** Decision restructuring only. No implementation. No code changes.

---

## Purpose

This document takes the 14 owner decisions identified in the Technical Entry Report and restructures them into four categories:

1. **Must Decide Now** — blocks the next phase from starting
2. **Can Defer** — needed before a specific later phase, but not blocking the current phase
3. **Needs More Evidence** — requires additional Git/Supabase inspection before a recommendation can be given
4. **Recommended Default** — agent's advised answer with rationale, subject to owner override

---

## Category 1: Must Decide Now

These decisions block Phase A (Technical Truth Map → Deduplication) from progressing to Phase C/D. Without answers, no agent can safely start wallet design or home shell work.

### D-1: Wallet vs Plan Relationship

| ID | D-1 |
|----|-----|
| **Question** | Does wallet fully replace plan, or does plan become a monthly grant/discount layer? |
| **Why now** | This determines whether Phase C builds a *new* wallet system alongside plan, or *replaces* plan logic entirely. The entire data model for wallet hinges on this. |
| **Current reality** | Plan config exists and works: Free/Basic/Pro/Team tiers with monthlyPoints, chargedPoints, quota gate. 15 users already provisioned via this system. |
| **Risk of delay** | Agent will design wallet in a vacuum that either duplicates plan or conflicts with it. |

**Options:**

| Option | Description | Impact |
|--------|-------------|--------|
| A | Wallet fully replaces plan as the spending truth. Plan becomes metadata only (grant amount, capability rules, discount multiplier). | Clean separation. Higher initial migration cost. |
| B | Wallet supplements plan. Plan remains the primary gate; wallet is an additional top-up/credit layer. | Lower migration risk. Two parallel spending models = ongoing confusion. |

### D-2: Import-to-Workspace Mode

| ID | D-2 |
|----|-----|
| **Question** | Copy, Move, or Link for Phase 1 main-chat-to-workspace import? |
| **Why now** | This determines the data contract between `global_conversations` and `messages` tables. Cannot design either table without knowing whether they share rows, copy rows, or reference each other. |
| **Current reality** | No import exists. `messages` table is workspace-scoped. No `global_conversations` table exists yet. |
| **Risk of delay** | Both table schemas and the import UI flow will be designed against an unknown contract. |

**Options (full analysis in Technical Entry Report §7):**

| Option | One-line | Recommendation |
|--------|----------|----------------|
| Copy | Duplicate conversation into workspace, keep original in recent chats | **Recommended for Phase 1** |
| Move | Transfer ownership from account to workspace, remove from recent chats | Wait for workspace permission maturity |
| Link | Single conversation referenced by both account and workspace | Wait for permission/deletion semantics defined |

### D-3: NOVA Tenancy Model

| ID | D-3 |
|----|-----|
| **Question** | User-scoped or workspace-scoped for Phase 1 NOVA? |
| **Why now** | Determines whether NOVA tables get `user_id`, `workspace_id`, or both. This is a schema-level decision that affects RLS policies, ingestion paths, and retrieval scoping. Cannot fix the P0 broad policies without knowing the target column. |
| **Current reality** | NOVA tables have NO ownership column. Personal-tool residue. P0 security gap. |
| **Risk of delay** | P0 security fix (RLS policies) will be applied to wrong column, requiring re-migration later. |

**Options:**

| Option | Description | Recommendation |
|--------|-------------|----------------|
| User-scoped | `nova_documents.user_id` — all user's docs in one bucket | **Phase 1 MVP** |
| Workspace-scoped | `nova_documents.workspace_id` — per-workspace isolation | Long-term target |
| Hybrid | Both columns, nullable workspace_id | Most complex, defer |

### D-4: Free Account Initial Credits

| ID | D-4 |
|----|-----|
| **Question** | Do free accounts receive initial wallet credits? |
| **Why now** | Determines the wallet bootstrap model. If free = zero, the first action for any user is "add credits." If free = grant, the platform starts with a trial wallet. Affects the entire wallet balance initialization logic. |
| **Current reality** | Free plan gives 100,000 monthlyPoints. These are not wallet credits — they're a monthly hard cap reset. |
| **Risk of delay** | Wallet balance initialization can't be designed without knowing the zero-balance behavior. |

---

## Category 2: Can Defer

These decisions are needed before specific later phases, but are not blocking Phase C/D start. They can be answered after the "Must Decide Now" set.

### D-5: NexusOps Relocation Strategy

| ID | D-5 |
|----|-----|
| **Question** | Move NexusOps to workspace route (e.g., `/workspace/[id]`), or wrap inside Home Shell as a sub-view? |
| **Blocks phase** | Phase D (Home Shell Entry) |
| **Can defer because** | Phase C (Wallet) can proceed without touching the UI entry point. Home shell design can start with mocked workspace list. |
| **Recommendation** | Move to `/workspace/[id]` route. Home Shell should be a clean platform surface, not a wrapper around the existing workspace OS. NexusOps becomes a child route, not a conditional render inside Home. |

### D-6: Home Layout Specifics

| ID | D-6 |
|----|-----|
| **Question** | Which elements in sidebar vs top bar vs center? |
| **Blocks phase** | Phase D (Home Shell Entry) |
| **Can defer because** | The concept is clear: sidebar = navigation, center = main chat. Exact element placement is a UX iteration detail, not an architecture decision. |
| **Recommendation** | Sidebar: New Chat, Search, Workspace List, Recent Chats, Account/Settings. Top bar: Wallet balance indicator, user avatar. Center: Chat input + conversation area. |

### D-7: Imported Chats in Recent Chats

| ID | D-7 |
|----|-----|
| **Question** | Do imported (copied/moved) chats remain in global recent chats? |
| **Blocks phase** | Phase F (Import to Workspace) |
| **Can defer because** | Depends on D-2 (Copy/Move/Link) decision. If Copy: yes, original stays. If Move: no, it transfers. If Link: yes, it's shared. |
| **Recommendation** | If Copy (recommended): yes, original stays in recent chats with an "Imported to [workspace]" badge. |

### D-8: NOVA Document Sharing Across Workspaces

| ID | D-8 |
|----|-----|
| **Question** | Can NOVA documents be shared across workspaces? |
| **Blocks phase** | Phase G (NOVA Workspace Notebook) |
| **Can defer because** | Phase 1 is user-scoped. Cross-workspace sharing requires workspace-scoped tenancy, which is deferred. |
| **Recommendation** | No for Phase 1. Revisit when workspace-scoped NOVA is implemented. |

### D-9: NOVA Evidence Visibility in UI

| ID | D-9 |
|----|-----|
| **Question** | Should NOVA evidence/sources be visible in UI? |
| **Blocks phase** | Phase G (NOVA Workspace Notebook) |
| **Can defer because** | Evidence retrieval and display are post-ingestion features. Phase 1 NOVA can index first, display later. |
| **Recommendation** | Show source citations inline (like Perplexity/Gemini). Evidence panel can be a later enhancement. |

### D-10: NOVA File Upload Scope

| ID | D-10 |
|----|-----|
| **Question** | Owner/dev only, or any user? |
| **Blocks phase** | Phase G (NOVA Workspace Notebook) |
| **Can defer because** | Ingestion pipeline design is independent of who triggers it. RLS will enforce scope regardless. |
| **Recommendation** | Any authenticated user for Phase 1. Rate-limit by plan tier if needed. Owner-only is too restrictive for a workspace knowledge service. |

### D-11: CLI Scope

| ID | D-11 |
|----|-----|
| **Question** | Owner/dev-only initially, or open to members? |
| **Blocks phase** | Phase I (CLI / MCP / Tool Output) |
| **Can defer because** | CLI/MCP is Phase I — the last phase in the sequence. Several months of implementation precede this decision. |
| **Recommendation** | Owner/dev-only for first CLI release. Requires tool_runs and permission audit to be proven first. |

### D-12: MCP First Version Scope

| ID | D-12 |
|----|-----|
| **Question** | Read-only resources only, or include tools? |
| **Blocks phase** | Phase I (CLI / MCP / Tool Output) |
| **Can defer because** | Same as D-11 — Phase I is the last phase. MCP design can wait. |
| **Recommendation** | Read-only resources only for first MCP release. Write tools must go through ToolExecutionService, permission gate, and tool_runs — which are not yet proven (tool_runs = 0). |

---

## Category 3: Needs More Evidence

These decisions cannot be responsibly recommended without additional Git/Supabase inspection. The current evidence is insufficient.

### D-13: Insufficient Balance Behavior

| ID | D-13 |
|----|-----|
| **Question** | When wallet balance is insufficient: block operation, downgrade model, or prompt top-up? |
| **Evidence needed** | 
| — | Inspect `src/lib/backend/` for current quota gate implementation — is there already a fallback mechanism, or is it a hard block? |
| — | Query `model_usage_ledger` for patterns: how often do users hit the quota gate today? What's the typical remaining balance at exhaustion? |
| — | Check if `nexus-registry.ts` has model fallback chains defined (e.g., if Pro model unavailable, fall back to Basic model). |
| **Why not just recommend** | The user experience of hitting a zero wallet is fundamentally different from hitting a monthly quota reset. A hard block may be appropriate for wallet (pay-as-you-go) even if a soft downgrade was acceptable for plan (monthly reset). Need to see what's already wired. |

### D-14: Pricing Model

| ID | D-14 |
|----|-----|
| **Question** | Extend from existing `chargedPoints` multiplier, or redesign pricing from scratch? |
| **Evidence needed** |
| — | Inspect `src/lib/models/` — how is `chargedPoints` currently calculated? Is it a simple multiplier or a complex formula? |
| — | Query `model_usage_ledger` for actual cost distribution across models. Which models consume the most? Is the current pricing proportional to actual model API costs? |
| — | Check `SERVER_MODEL_CATALOG` in code — does each model already have a `chargedPoints` field? Is it consistent? |
| **Why not just recommend** | If `chargedPoints` is already well-structured and roughly proportional to API costs, extending it is low-risk. If it's ad-hoc or disconnected from actual costs, a redesign is better. Need to see the data. |

---

## Category 4: Recommended Default Answers

For decisions where sufficient evidence exists and a clear recommendation can be made. These are agent-advised defaults — owner has final authority.

---

### D-1: Wallet vs Plan

**Recommendation: Option A — Wallet replaces plan as spending truth.**

**Rationale:**
- The Notion Command Center repeatedly states: "Wallet 才是商業消耗真相" (Wallet is the commercial consumption truth) and "Plan 不再是核心限制邏輯" (Plan is no longer the core limiting logic).
- The existing plan system (Free/Basic/Pro/Team) can be preserved as an *entitlement/benefit layer* — monthly credit grants, capability rules, discount multipliers. This is a smaller refactor than building a parallel wallet that conflicts with plan.
- Dual systems (plan gate + wallet gate) would create ongoing confusion about which gate actually controls access.

**Default:** Plan → entitlement layer (monthly grant, capability rules, discount multiplier). Wallet → spending truth (balance, transactions, per-operation cost).

---

### D-2: Import-to-Workspace Mode

**Recommendation: Option A — Copy only for Phase 1.**

**Rationale:**
- Copy is the safest contract: original conversation is preserved, workspace gets an independent copy with clear provenance.
- Move has irreversible UX risk (user loses their global chat) and needs rollback infrastructure that doesn't exist yet.
- Link creates complex permission semantics (what happens when workspace is shared? when source is deleted?) that shouldn't block Phase 1.
- Move and Link can be added as later enhancements when workspace permissions, sharing, and deletion are mature.

**Default:** Copy only. Source provenance recorded as `imported_from_global_chat_id`. NOVA indexes the workspace copy. Original stays in recent chats with an "Imported" badge.

---

### D-3: NOVA Tenancy Model

**Recommendation: User-scoped for Phase 1 MVP.**

**Rationale:**
- NOVA currently has NO ownership column. Adding `user_id` is the minimal schema change that closes the P0 broad-policy security gap.
- User-scoped is sufficient for the first MVP: a single user's documents, indexed per user, retrieved per user.
- Workspace-scoped requires workspace membership, sharing, and permission infrastructure that isn't proven yet.
- The migration path from user-scoped to workspace-scoped is straightforward: add `workspace_id` as nullable, then migrate.

**Default:** `nova_documents.user_id` (NOT NULL). `nova_chunks.user_id` (NOT NULL). RLS policies scoped to `auth.uid() = user_id`. Add `workspace_id` (nullable) in a later phase.

---

### D-4: Free Account Initial Credits

**Recommendation: Yes — grant initial credits to free accounts.**

**Rationale:**
- If free = zero balance, the first user action is "add payment method" before even trying the product. This is a high-friction onboarding.
- The existing Free plan already grants 100,000 monthlyPoints. The wallet equivalent should be a one-time or monthly grant of starter credits.
- The grant amount can be modest — enough for ~10-20 chat interactions. If users want more, they top up.
- Zero-balance behavior should still be defined (block vs prompt), but free users shouldn't start at zero.

**Default:** Free accounts receive an initial credit grant (amount TBD by owner). Monthly recurring grant via plan entitlement layer. Zero-balance behavior defined separately (D-13).

---

### D-5: NexusOps Relocation

**Recommendation: Move to `/workspace/[id]` route.**

**Rationale:**
- The Command Center is explicit: "NexusOps 不刪除，改成 workspace route 或 workspace surface."
- Wrapping NexusOps inside Home Shell as a conditional render creates a blurry boundary between platform shell and workspace OS.
- A separate route makes the architectural boundary clear: `/` = platform, `/workspace/[id]` = workspace OS.
- This also enables direct linking to workspaces and future workspace sharing.

**Default:** `src/app/page.tsx` → Home Shell. `src/app/workspace/[id]/page.tsx` → NexusOps. NexusOps is NOT deleted, NOT wrapped — it's rerouted.

---

### D-6: Home Layout

**Recommendation: Sidebar-heavy layout (Gemini/ChatGPT pattern).**

**Rationale:**
- The Command Center explicitly calls for a "Gemini / ChatGPT / Grok" style main chat platform.
- Workspace list must be prominent in sidebar — this is the bridge between platform layer and workspace layer.
- Wallet balance should be visible at all times (top-right or sidebar bottom) to reinforce the credit model.

**Default:** Left sidebar with New Chat, Search, Workspace List, Recent Chats, Account/Settings. Center: Main chat area. Top bar: Wallet balance + user avatar.

---

### D-7: Imported Chats in Recent Chats

**Recommendation: Yes — with badge (under Copy mode).**

**Rationale:**
- Under Copy mode, the original conversation is unchanged. Removing it from recent chats would confuse the user.
- An "Imported to [workspace name]" badge provides clarity without hiding the conversation.
- Under Move mode (future), the conversation would be removed from recent chats with a redirect marker.

**Default:** Imported chats remain in recent chats with a badge: "📋 Imported to [Workspace Name]".

---

### D-8: NOVA Document Sharing Across Workspaces

**Recommendation: No for Phase 1.**

**Rationale:**
- Phase 1 NOVA is user-scoped. Cross-workspace sharing requires workspace-scoped tenancy.
- Sharing introduces permission complexity (read-only? editable? transferable?) that shouldn't block the first NOVA MVP.
- Users can manually re-upload the same document to multiple workspaces as a workaround.

**Default:** No cross-workspace sharing in Phase 1. Revisit when workspace-scoped NOVA is implemented.

---

### D-9: NOVA Evidence Visibility

**Recommendation: Show source citations inline.**

**Rationale:**
- The NOVA Integration Research Report explicitly asks: "Evidence 是否要在 UI 中可見？"
- Inline citations (like Perplexity, Gemini, or ChatGPT with search) are the current UX standard for AI knowledge retrieval.
- A separate evidence panel is a heavier UX investment that can wait.
- Even if files are uploaded, showing which document/chunk informed the answer builds trust.

**Default:** Inline source citations showing document name + chunk reference. Full evidence panel deferred.

---

### D-10: NOVA File Upload Scope

**Recommendation: Any authenticated user.**

**Rationale:**
- NOVA is a workspace knowledge service. Restricting uploads to owner/dev defeats the purpose.
- RLS policies (once fixed) will scope documents to the uploading user. The security boundary is at the row level, not the upload gate.
- Rate limiting by plan tier (Free: 5 docs, Basic: 50, Pro: unlimited) can control abuse without blocking legitimate use.

**Default:** Any authenticated user can upload. Rate-limited by plan tier. RLS enforces ownership.

---

### D-11: CLI Scope

**Recommendation: Owner/dev-only for first release.**

**Rationale:**
- Tool runtime is not yet proven (tool_runs = 0). CLI is effectively a tool executor — it must go through the same permission gate, confirmation boundary, and audit path.
- Opening CLI to members before tool_runs and permission_audit_logs are proven creates a security gap.
- The Command Center explicitly orders: "CLI 第一版是給 developer/admin 用，還是未來給一般會員用？" — this is phrased as a question, but the safe default is owner/dev.

**Default:** Owner/dev-only for CLI v1. Member access gated behind tool_runs > 0 and permission audit path proven.

---

### D-12: MCP First Version Scope

**Recommendation: Read-only resources only.**

**Rationale:**
- The Command Center and NOVA Integration Research Report both state: "MCP 第一版只暴露 read-only resources."
- Write tools must go through ToolExecutionService, permission gate, confirmation boundary, and tool_runs — none of which are proven.
- Read-only resources (document://, chunk://, workspace://, artifact://) provide immediate value without security risk.
- This aligns with the Resource Model first approach: "Resource Model → Resource Reader → CLI read-only → MCP resources read-only → MCP tools."

**Default:** MCP v1: read-only resources only. Write tools deferred until tool_runs and permission audit are proven.

---

## Summary Table

| ID | Decision | Category | Recommended Default | Blocks Phase |
|----|----------|----------|---------------------|--------------|
| D-1 | Wallet vs Plan | **Must Decide** | Wallet replaces plan as spending truth; plan = entitlement | C |
| D-2 | Import Mode | **Must Decide** | Copy only for Phase 1 | E, F |
| D-3 | NOVA Tenancy | **Must Decide** | User-scoped for MVP | G |
| D-4 | Free Credits | **Must Decide** | Yes, grant initial credits | C |
| D-5 | NexusOps Relocation | Can Defer | Move to `/workspace/[id]` | D |
| D-6 | Home Layout | Can Defer | Sidebar-heavy (Gemini pattern) | D |
| D-7 | Imported in Recent | Can Defer | Yes, with badge (Copy mode) | F |
| D-8 | NOVA Doc Sharing | Can Defer | No for Phase 1 | G (later) |
| D-9 | Evidence Visibility | Can Defer | Inline source citations | G (later) |
| D-10 | File Upload Scope | Can Defer | Any authenticated user | G |
| D-11 | CLI Scope | Can Defer | Owner/dev-only | I |
| D-12 | MCP Scope | Can Defer | Read-only resources only | I |
| D-13 | Insufficient Balance | **Needs Evidence** | Inspect quota gate code + usage ledger first | C |
| D-14 | Pricing Model | **Needs Evidence** | Inspect chargedPoints logic + catalog consistency first | C |

---

## Required Next Inspection (for D-13, D-14)

Before D-13 and D-14 can be recommended, the following read-only inspections are needed:

1. **Quota gate implementation** — `src/lib/backend/` — how does the current gate behave on exhaustion? Hard block? Soft downgrade? Configurable?
2. **ChargedPoints calculation** — `src/lib/models/` — what's the formula? Is it per-model or uniform?
3. **SERVER_MODEL_CATALOG** — `src/lib/nexus-registry.ts` or `src/lib/nexus-defaults.ts` — does every model have a `chargedPoints` field? Are values proportional to actual API costs?
4. **model_usage_ledger query** — What's the distribution of usage across models? Do users regularly hit the quota gate?

These are all read-only inspections. No code changes, no migrations, no Supabase writes.

---

## No Implementation Yet

This document restructures owner decisions only. No code has been modified. No migrations have been applied. No deployments have been triggered. The 4 "Must Decide Now" decisions require owner input before any agent proceeds to Phase C design work.
