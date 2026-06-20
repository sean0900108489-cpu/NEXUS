# S-6 Execution Report: Global Conversations Domain Design

**Date:** 2026-06-20
**Slice:** S-6 — Global Conversations Domain Design
**Status:** COMPLETE (design only)
**Predecessors:** S-1 (Deduplication — DC-8 Main Chat vs Workspace Chat), Supabase Project Identity Lock
**Owner Locks:** FINAL-LOCK-2 (Copy mode for import)
**Supabase Authority:** `xjuglddxwnikvcwxfbzg` (LOCKED). MCP project `vqyuonrhpecfjklbeqsn` excluded.
**Method:** Read-only design. No code writes. No SQL. No table creation. No migration. No deploy.

---

## Purpose

Design the `global_conversations` and `global_messages` domain — the account-level conversation tables separate from workspace `messages`. Define the schema proposal, account-level ownership, recent chats API contract, the main chat vs workspace chat boundary, and the import-to-workspace dependency.

---

## 1. Domain Boundary: Main Chat vs Workspace Chat

### 1.1 Canonical Separation (from S-1 DC-8)

| Property | Main Chat (Global) | Workspace Chat |
|----------|-------------------|----------------|
| **Scope** | Account-level (`user_id`) | Workspace-level (`workspace_id`) |
| **Table** | `global_conversations` + `global_messages` | Existing `messages` table |
| **NOVA Indexable** | No (by default) | Yes (via workspace notebook) |
| **Importable to Workspace** | Yes (Copy mode — S-7) | N/A (already in workspace) |
| **Shown in Recent Chats** | Yes (Home sidebar) | No (shown inside workspace only) |
| **Search Scope** | Global search | Workspace search |
| **Permission Model** | User-only (private) | Workspace members |
| **Wallet Cost** | Deducted from user wallet | Deducted from user wallet |
| **API Path** | `POST /api/global-chat` | Existing `/api/chat` (workspace-scoped) |

### 1.2 Why They Cannot Share a Table

1. **Ownership column conflict:** Global chats have `user_id`. Workspace chats have `workspace_id`. A single table with both would require one to be nullable — breaking RLS semantics.
2. **RLS policy divergence:** Global: `user_id = auth.uid()`. Workspace: `workspace_id IN (SELECT ... FROM workspace_memberships)`. Cannot express both on one table cleanly.
3. **Import semantics:** When a global chat is copy-imported (S-7), the workspace copy must have `workspace_id` NOT NULL and `imported_from_global_chat_id`. The global original must retain `user_id` and gain `imported_to_workspace_id`. Separate tables make this unambiguous.
4. **Index strategy:** Global chats are queried by `user_id ORDER BY last_message_at`. Workspace chats are queried by `workspace_id`. Different compound indexes.
5. **Lifecycle:** Global chats deleted by user. Workspace chats deleted by workspace owner or on workspace deletion. Different cascade rules.

---

## 2. Schema Proposal (Design, Not DDL)

### 2.1 `global_conversations` Table

```
TABLE global_conversations (DESIGN ONLY — no DDL)
  Supabase project: xjuglddxwnikvcwxfbzg

COLUMNS:
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  title           text           NOT NULL  -- first user message or "New Chat"
  model_id        text           NULL      -- model used for last message
  message_count   integer        NOT NULL DEFAULT 0  -- denormalized for sidebar display
  last_message_at timestamptz    NULL      -- for sort ordering in recent chats
  created_at      timestamptz    NOT NULL DEFAULT now()
  updated_at      timestamptz    NOT NULL DEFAULT now()

  -- Import tracking (set when conversation is copy-imported to workspace)
  imported_to_workspace_id  uuid  NULL  -- REFERENCES workspaces(id) ON DELETE SET NULL
  imported_at               timestamptz NULL

INDEXES:
  idx_global_conv_user_updated  ON (user_id, last_message_at DESC NULLS LAST)
    -- Primary query: "get my recent chats sorted by most recent"

  idx_global_conv_imported      ON (imported_to_workspace_id) WHERE imported_to_workspace_id IS NOT NULL
    -- Sparse index for "which global chats were imported to this workspace"

RLS POLICY:
  SELECT: user_id = auth.uid()
  INSERT: user_id = auth.uid()
  UPDATE: user_id = auth.uid()
  DELETE: user_id = auth.uid()
  -- Fully private. No workspace visibility. No shared access.

CONSTRAINTS:
  -- imported_to_workspace_id must reference an existing workspace
  -- but SET NULL on workspace deletion (don't delete the global chat)
  -- message_count >= 0
  -- title length >= 1
```

### 2.2 `global_messages` Table

```
TABLE global_messages (DESIGN ONLY — no DDL)
  Supabase project: xjuglddxwnikvcwxfbzg

COLUMNS:
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid()
  conversation_id uuid           NOT NULL REFERENCES global_conversations(id) ON DELETE CASCADE
  role            text           NOT NULL CHECK (role IN ('user', 'assistant', 'system'))
  content         text           NOT NULL
  model_id        text           NULL      -- model that generated this message (assistant only)
  usage           jsonb          NULL      -- { input_tokens, output_tokens, total_tokens, credits }
  sequence        integer        NOT NULL  -- message order within conversation (1, 2, 3...)
  created_at      timestamptz    NOT NULL DEFAULT now()

INDEXES:
  idx_global_msg_conv_seq  ON (conversation_id, sequence)
    -- Primary query: "get all messages for conversation in order"

RLS POLICY:
  SELECT: conversation_id IN (SELECT id FROM global_conversations WHERE user_id = auth.uid())
  INSERT: conversation_id IN (SELECT id FROM global_conversations WHERE user_id = auth.uid())
  -- No UPDATE, no DELETE (messages are immutable once created)
  -- Indirectly: user can delete the conversation (CASCADE deletes messages)

CONSTRAINTS:
  -- sequence > 0
  -- role is one of valid roles
  -- content NOT empty
  -- sequence UNIQUE per conversation_id (enforced by index or constraint)
```

### 2.3 Comparison: `global_messages` vs Existing `messages` Table

| Column | `global_messages` (proposed) | `messages` (existing, from database.types.ts) |
|--------|------------------------------|----------------------------------------------|
| `id` | uuid PK | uuid PK |
| Scope column | `conversation_id → global_conversations` | `workspace_id` (direct) |
| `role` | text (user/assistant/system) | `role: AgentMessageRole` (nullable!) + `type: AgentMessageRole` |
| `content` | text NOT NULL | text (nullable in types) |
| `model_id` | text NULL | — (not present) |
| `usage` | jsonb NULL | — (not present) |
| `sequence` | integer NOT NULL | — (not present; order by created_at) |
| `created_at` | timestamptz | timestamptz |
| `agent_id` | — (not applicable) | uuid NULL |
| `task_id` | — (not applicable) | uuid NULL |
| `source_tool_run_id` | — (not applicable) | uuid NULL |
| `token_count` | — (in usage jsonb) | integer NULL |
| `content_hash` | — | text NULL |
| `metadata` | — | jsonb |
| `is_active_window` | — | boolean |
| `archived_at` | — | timestamptz NULL |
| `updated_at` | — | timestamptz NULL |
| `created_by` | — | text NULL |

**Design note:** `global_messages` is intentionally simpler than `messages`. Global chat is a straightforward user↔LLM conversation. No agents, no task tracking, no active window management, no archiving. These are workspace concepts. The simplicity is a feature — it enforces the boundary.

---

## 3. Account-Level Ownership Model

### 3.1 Ownership Chain

```
auth.users (Supabase Auth)
  │
  └─ 1:N ─ global_conversations
              │  user_id = auth.uid()
              │  RLS: full CRUD by owner only
              │
              └─ 1:N ─ global_messages
                         conversation_id → global_conversations.id
                         RLS: accessible only if user owns the parent conversation

Key: global_conversations.user_id is the SINGLE owner.
     No shared conversations. No workspace-level access.
     If user is deleted, conversations CASCADE (ON DELETE CASCADE).
```

### 3.2 What "Account-Level" Means

- The user who creates a global conversation OWNS it. Forever. No transfer.
- No other user can see, read, or access the conversation. Ever.
- The conversation exists independently of any workspace.
- If the user never creates a workspace, conversations still exist.
- Wallet credits for global chat are deducted from the user's wallet (same wallet as everything else).

### 3.3 Relationship to Workspace

```
User
  ├─ global_conversations (account-level, private)
  │   └─ IF imported → copy created in workspace (S-7)
  │
  └─ workspace_memberships → workspaces
                                └─ messages (workspace-level, shared with members)
                                    └─ NOVA indexed (S-9)
```

Global conversations are NOT in any workspace. They exist at the account level. They become workspace content ONLY through explicit import (S-7).

---

## 4. Recent Chats API Contract

### 4.1 List Recent Chats

```
GET /api/global-chats?limit=20&cursor={cursor}

AUTH: Supabase session (bearer token)
SCOPE: Returns only conversations owned by the authenticated user

REQUEST:
  limit:  integer (default 20, max 50)
  cursor: string (opaque, from previous response's nextCursor)

RESPONSE 200:
{
  "chats": [
    {
      "id": "uuid",
      "title": "Discussing project architecture",
      "modelId": "gpt-4o",
      "messageCount": 12,
      "lastMessageAt": "2026-06-20T10:30:00Z",
      "createdAt": "2026-06-20T09:00:00Z",
      "importedToWorkspaceId": "uuid | null",
      "importedToWorkspaceName": "NEXUS // AI OPS 2 | null"
    }
  ],
  "nextCursor": "opaque_string | null",
  "hasMore": true
}

SORT: last_message_at DESC NULLS LAST (most recent first)
       Conversations with no messages (just created) appear at end.

RESPONSE 401:
  { "error": { "code": "UNAUTHORIZED", "message": "Authentication required." } }
```

### 4.2 Get Single Conversation

```
GET /api/global-chats/{conversationId}

RESPONSE 200:
{
  "conversation": {
    "id": "uuid",
    "title": "Discussing project architecture",
    "modelId": "gpt-4o",
    "messageCount": 12,
    "createdAt": "...",
    "updatedAt": "...",
    "importedToWorkspaceId": "uuid | null",
    "importedToWorkspaceName": "string | null",
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "Let's discuss the new wallet system",
        "sequence": 1,
        "createdAt": "..."
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "The wallet system should...",
        "modelId": "gpt-4o",
        "usage": { "inputTokens": 150, "outputTokens": 300, "totalTokens": 450, "credits": 3 },
        "sequence": 2,
        "createdAt": "..."
      }
    ]
  }
}

MESSAGES SORT: sequence ASC (chronological order)
MAX MESSAGES: No hard limit on retrieval (global chats are private, not shared)
              Client can paginate if needed via query params.
```

### 4.3 Create / Continue Conversation (Main Chat)

```
POST /api/global-chat

AUTH: Supabase session
BODY:
{
  "conversationId": "uuid | undefined",   // undefined = create new conversation
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "modelId": "gpt-4o",
  "requestedFeatures": {                   // optional, same as existing AiGatewayChatBody
    "reasoning": true
  }
}

LOGIC:
  1. If conversationId provided:
     a. Validate user owns the conversation
     b. Load existing messages (for context, not returned)
  2. If conversationId NOT provided:
     a. Create new global_conversations row
     b. Title = first user message content (truncated to 100 chars)
  3. Insert user message into global_messages
  4. Run wallet gate (assertSufficientCredits — S-3)
  5. Call model via existing ai-gateway-service pattern
  6. Insert assistant message into global_messages
  7. Update global_conversations (message_count, last_message_at, model_id)
  8. Return assistant message + usage

RESPONSE 200:
{
  "conversationId": "uuid",
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Hello! How can I help?",
    "modelId": "gpt-4o",
    "usage": { "inputTokens": 10, "outputTokens": 20, "totalTokens": 30, "credits": 1 },
    "sequence": 2,
    "createdAt": "..."
  },
  "newConversation": false   // true if conversation was just created
}

RESPONSE 402:
  INSUFFICIENT_CREDITS error (S-3 contract)

NOTE: This endpoint uses the SAME ai-gateway-service pattern as /api/chat.
      The difference is WHERE messages are stored (global_messages vs workspace messages)
      and the OWNERSHIP scope (user_id vs workspace_id).
      The model call, wallet gate, and token resolution are IDENTICAL.
```

### 4.4 Delete Conversation

```
DELETE /api/global-chats/{conversationId}

AUTH: Supabase session, user must own the conversation

RESPONSE 200:
{ "deleted": true, "conversationId": "uuid" }

CASCADE: Deleting the conversation deletes all global_messages (ON DELETE CASCADE).
         The import link (imported_to_workspace_id) is lost.
         Workspace COPIES (from S-7) are NOT affected — they are independent copies.

RESPONSE 404:
{ "error": { "code": "NOT_FOUND" } }
```

---

## 5. Main Chat vs Workspace Chat API Comparison

### 5.1 Side-by-Side

| Aspect | Main Chat API | Workspace Chat API |
|--------|-------------|-------------------|
| **Endpoint** | `POST /api/global-chat` | `POST /api/chat` (existing) |
| **Authentication** | Supabase session | Supabase session + workspace membership |
| **Ownership check** | `user_id = auth.uid()` | `workspace_id IN workspace_memberships` |
| **Message storage** | `global_messages` | `messages` (existing) |
| **Conversation storage** | `global_conversations` | Workspace-scoped (via `messages.workspace_id`) |
| **Wallet gate** | ✅ `assertSufficientCredits` | ✅ `assertSufficientCredits` |
| **Model access** | ✅ `assertModelAllowedForPlan` | ✅ `assertModelAllowedForPlan` |
| **Token resolution** | ✅ `getUserNewApiToken` | ✅ `getUserNewApiToken` |
| **Usage recording** | ✅ `model_usage_ledger` | ✅ `model_usage_ledger` |
| **Wallet deduction** | ✅ `wallet_transaction` | ✅ `wallet_transaction` |
| **NOVA indexed** | ❌ No | ✅ Yes (workspace-scoped) |
| **Importable** | ✅ Can be imported to workspace (S-7) | N/A (already in workspace) |
| **Recent chats** | ✅ Appears in Home sidebar | ❌ No |

### 5.2 Shared Infrastructure

Both APIs share these components (no duplication):
- `ai-gateway-service.ts` — model call execution
- `plan-config.ts` — plan capability check
- `quota-gate.ts` — wallet balance gate (assertSufficientCredits, when implemented)
- `new-api-chat-service.ts` — New API token + chat completion
- `usage-ledger.ts` — model usage recording
- `walletRepo` (future) — credit deduction

The ONLY differences are:
- Which table messages are stored in
- How ownership is validated
- Whether NOVA can index the result

---

## 6. Import-to-Workspace Dependency

### 6.1 What S-6 Provides for S-7

S-6 defines the SOURCE tables for import:
- `global_conversations.id` — the conversation to import
- `global_messages` — the messages to copy
- `global_conversations.imported_to_workspace_id` — set AFTER import
- `global_conversations.imported_at` — set AFTER import

### 6.2 What S-7 Will Define (Not Designed Here)

S-7 will design:
- The COPY operation: `global_conversations` + `global_messages` → workspace `messages` table
- The provenance column: `workspace_conversations.imported_from_global_chat_id`
- The badge contract: "Imported from Main Chat" / "Imported to [workspace]"
- Whether the workspace `messages` table needs a `conversation_id` grouping field

### 6.3 Schema Dependency

S-6 does NOT require changes to the existing `messages` table. S-7 will need to determine how workspace conversations are grouped — currently `messages` has `workspace_id` + `agent_id` but no `conversation_id`. This is an S-7 design decision, not an S-6 concern.

---

## 7. Validation Plan

### 7.1 Design Validation (This Slice)

| Check | Method | Status |
|-------|--------|--------|
| `global_conversations` has all required columns | Schema review | ✅ |
| `global_messages` has all required columns | Schema review | ✅ |
| RLS policies defined for both tables | Policy review | ✅ |
| Account-level ownership chain is unambiguous | Ownership review | ✅ |
| Recent chats API contract is complete | API review | ✅ |
| Main chat API contract is complete | API review | ✅ |
| Delete cascade is defined | Lifecycle review | ✅ |
| Boundary with workspace `messages` is explicit | Boundary review | ✅ |
| Import columns ready for S-7 | Dependency review | ✅ |
| No conflict with existing `messages` schema | Compatibility check | ✅ |

### 7.2 Future Implementation Validation (Not This Slice)

| Check | How |
|-------|-----|
| RLS policy enforcement | Attempt cross-user read → must return empty |
| Conversation isolation | User A's chats never appear in User B's recent list |
| Wallet deduction per call | Each global chat call deducts credits |
| Import works after copy | S-7 validation |
| Delete cascades properly | Delete conversation → messages gone |

---

## 8. Blocked Assumptions

| # | Assumption | Severity | Resolution |
|---|-----------|----------|-----------|
| B1 | `auth.users(id)` is the correct FK target for `user_id` | LOW | Standard Supabase Auth pattern |
| B2 | `gen_random_uuid()` is available as default | LOW | Standard PostgreSQL. Can fall back to `uuid_generate_v4()` |
| B3 | `messages` table doesn't need modification for S-6 | CONFIRMED | S-6 doesn't touch `messages` |
| B4 | `ON DELETE CASCADE` from `auth.users` is the correct behavior | MEDIUM | Owner decision: should deleting a user delete their global chats? Current design says yes. |
| B5 | Existing `/api/chat` route is unchanged by S-6 | CONFIRMED | Main chat is a NEW endpoint (`/api/global-chat`), not a replacement |
| B6 | `global_messages` doesn't need `agent_id` or `task_id` | DESIGN CHOICE | Global chat has no agents. Simpler schema. |
| B7 | `sequence` is the correct ordering mechanism | DESIGN CHOICE | More robust than `created_at` for exact ordering. Client assigns sequence. |

---

## 9. Excluded from S-6 Scope

| Item | Reason |
|------|--------|
| SQL DDL for table creation | No migration in design phase |
| `/api/global-chat` route implementation | Implementation phase |
| `/api/global-chats` CRUD implementation | Implementation phase |
| Workspace `messages` table changes | S-7 concern |
| Import flow (copy/move/link) | S-7 concern |
| NOVA indexing of imported chats | S-9 concern |
| Home sidebar UI | S-8 concern |
| Wallet balance display in chat | S-8 concern |
| Streaming (SSE) for global chat | Implementation detail — same pattern as existing |

---

## 10. S-7 Readiness

| Prerequisite | Status |
|-------------|--------|
| `global_conversations` schema defined with `imported_to_workspace_id` | ✅ |
| `global_messages` schema defined | ✅ |
| Account-level ownership model explicit | ✅ |
| Recent chats API contract defined | ✅ |
| Main chat vs workspace chat boundary documented | ✅ |
| Import source tables identified | ✅ |
| No conflict with existing `messages` schema | ✅ |
| Supabase production identity locked | ✅ |

**S-6 is COMPLETE. S-7 (Import-to-Workspace Contract Design) is READY (not yet authorized).**

---

## No Implementation Performed

Design only. No SQL written. No tables created. No API routes implemented. No code written. No Supabase changes. No migration. No deploy. Supabase authority: `xjuglddxwnikvcwxfbzg` (LOCKED).
