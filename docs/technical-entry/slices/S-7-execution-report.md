# S-7 Execution Report: Import-to-Workspace Contract Design

**Date:** 2026-06-20
**Slice:** S-7 — Import-to-Workspace Contract Design
**Status:** COMPLETE (design only)
**Predecessors:** S-6 (Global Conversations Domain), S-6 Addendum (import column clarification)
**Owner Locks:** FINAL-LOCK-2 (Copy mode for Phase 1)
**Supabase Authority:** `xjuglddxwnikvcwxfbzg` (LOCKED)
**Method:** Read-only design. No code writes. No SQL. No table creation. No migration. No deploy.

---

## Purpose

Design the copy-based import contract: how a global conversation becomes a workspace conversation. Define the import flow, source/destination validation, message copy mapping, provenance model, NOVA indexing boundary, edge cases, and rollback/no-op validation.

---

## 1. Import Mode: Copy Only (FINAL-LOCK-2)

### 1.1 What Copy Means

| Aspect | Behavior |
|--------|----------|
| **Global original** | Unchanged. Remains in recent chats. Gets `imported_to_workspace_id` badge metadata. |
| **Workspace copy** | Independent copy created in workspace. Has `imported_from_global_chat_id` provenance metadata. |
| **Post-import edits** | Diverge independently. No sync between original and copy. |
| **Global delete** | Does NOT affect workspace copy (S-6 Addendum §2). |
| **Workspace delete** | Deletes the copy (normal workspace lifecycle). Global original unaffected. |
| **NOVA indexing** | Workspace copy IS indexed. Global original is NOT. |
| **Re-import** | Same conversation can be imported to multiple workspaces. Each gets independent copy. |

### 1.2 What Copy Is NOT

- **NOT Move:** Global original stays. Not transferred.
- **NOT Link:** Two independent copies. No shared reference.
- **NOT Sync:** No bidirectional sync. Edits diverge.
- **NOT Auto:** User must explicitly trigger import. No automatic import on navigation.

---

## 2. Source Validation: Global Conversation

### 2.1 Pre-Import Checks

```
BEFORE import:
  ✅ User is authenticated (Supabase session)
  ✅ global_conversation exists (404 if not)
  ✅ global_conversation.user_id = auth.uid() (403 if not)
  ✅ global_conversation has at least 1 message (400 if empty)
  ✅ global_conversation.message_count <= 500 (400 if too large — Phase 1 limit)
  ❌ No check on imported_to_workspace_id (re-import is allowed)
```

### 2.2 Source Data to Copy

```
FROM global_conversations:
  title
  model_id (of last message)

FROM global_messages (ordered by sequence ASC):
  role, content, model_id (assistant messages), sequence
  usage (jsonb — token/credit metadata)

NOT copied:
  id (new IDs generated for copy)
  conversation_id (replaced with new workspace conversation grouping)
  created_at (new timestamps)
```

---

## 3. Destination Validation: Workspace

### 3.1 Pre-Import Checks

```
BEFORE import:
  ✅ workspace exists (404 if not)
  ✅ user is workspace member (workspace_memberships check — 403 if not)
  ✅ user has write permission (role = owner | admin | editor — 403 if viewer)
  ❌ No duplicate check (re-import to same workspace is allowed)
```

### 3.2 Destination Tables

The workspace copy is stored in the EXISTING `messages` table (from `database.types.ts`):

```typescript
// Existing Messages interface (from database.types.ts)
export interface Messages {
  id: string;
  workspace_id: string;
  agent_id: string | null;
  content: string;
  type: AgentMessageRole;
  created_at: DatabaseTimestamp;
  created_by: string | null;
  role: AgentMessageRole | null;
  task_id: string | null;
  source_tool_run_id: string | null;
  token_count: number | null;
  content_hash: string | null;
  metadata: Record<string, unknown>;
  is_active_window: boolean;
  archived_at: DatabaseTimestamp | null;
  updated_at: DatabaseTimestamp | null;
}
```

### 3.3 Workspace Chat Grouping

The existing `messages` table uses `workspace_id` + `agent_id` for grouping. Imported conversations have no agent. Two options for grouping imported messages:

| Option | How | Pros | Cons |
|--------|-----|------|------|
| A | Use `agent_id = NULL` + group by import batch via `metadata.import_batch_id` | No schema change. | Querying "all messages in this imported conversation" requires metadata filter — not indexed. |
| B | Add `conversation_id` column to `messages` | Clean grouping. Indexable. | Schema change required. S-7 cannot do this (no DDL). |

**S-7 design uses Option A (no schema change).** Imported messages share `workspace_id`, have `agent_id = NULL`, and are grouped by `metadata.import_batch_id` (a UUID generated at import time). This is a Phase 1 constraint — Option B can be implemented when DDL is authorized.

### 3.4 Panel Creation Contract

An imported conversation becomes a workspace chat panel. The panel metadata:

```
WORKSPACE CHAT PANEL (for imported conversation):
  panel_type: "imported_chat"
  title: global_conversations.title + " (Imported)"
  workspace_id: target workspace
  imported_from_global_chat_id: source global conversation ID
  imported_at: timestamp
  message_count: number of messages copied
  model_id: global_conversations.model_id
```

Panel creation is an S-8/S-10 concern (Home Shell / Workspace OS). S-7 defines the data contract; S-8/S-10 implement the UI.

---

## 4. Copy Flow (Step by Step)

### 4.1 API Endpoint

```
POST /api/workspaces/{workspaceId}/import-chat

AUTH: Supabase session + workspace membership (editor+)
BODY:
{
  "globalConversationId": "uuid"
}

RESPONSE 200:
{
  "importBatchId": "uuid",
  "workspaceId": "uuid",
  "importedMessageCount": 12,
  "importedAt": "2026-06-20T12:00:00Z",
  "source": {
    "globalConversationId": "uuid",
    "title": "Discussing project architecture"
  }
}

RESPONSE 400:
  { "error": { "code": "EMPTY_CONVERSATION", "message": "Conversation has no messages to import." } }
  { "error": { "code": "CONVERSATION_TOO_LARGE", "message": "Conversation exceeds 500 message limit for import." } }

RESPONSE 403:
  { "error": { "code": "FORBIDDEN", "message": "You do not own this conversation." } }
  { "error": { "code": "FORBIDDEN", "message": "You do not have write permission in this workspace." } }

RESPONSE 404:
  { "error": { "code": "NOT_FOUND" } }
```

### 4.2 Step-by-Step Pseudocode

```
FUNCTION importGlobalChatToWorkspace(workspaceId, globalConversationId, userId):

  // --- STEP 1: Validate source ---
  globalConv = SELECT * FROM global_conversations WHERE id = globalConversationId
  IF NOT FOUND → throw 404
  IF globalConv.user_id != userId → throw 403 "You do not own this conversation"

  // --- STEP 2: Validate destination ---
  membership = SELECT * FROM workspace_memberships
    WHERE workspace_id = workspaceId AND user_id = userId
  IF NOT FOUND → throw 403 "Not a workspace member"
  IF membership.role = 'viewer' → throw 403 "Viewers cannot import"

  // --- STEP 3: Load source messages ---
  messages = SELECT * FROM global_messages
    WHERE conversation_id = globalConversationId
    ORDER BY sequence ASC
  IF messages.length == 0 → throw 400 "Conversation has no messages"
  IF messages.length > 500 → throw 400 "Conversation exceeds 500 message limit"

  // --- STEP 4: Generate import batch ID ---
  importBatchId = gen_random_uuid()
  importedAt = now()

  // --- STEP 5: Copy messages to workspace ---
  FOR EACH message IN messages:
    INSERT INTO messages (
      id: gen_random_uuid(),          // NEW id — not the global_messages id
      workspace_id: workspaceId,
      agent_id: NULL,                  // imported chat has no agent
      content: message.content,
      type: message.role,
      role: message.role,
      created_by: userId,
      created_at: now(),              // NEW timestamp
      token_count: message.usage->>'total_tokens' (if present),
      metadata: {
        imported: true,
        source: 'global_chat',
        import_batch_id: importBatchId,
        source_message_id: message.id,  // for traceability
        source_conversation_id: globalConversationId,
        source_sequence: message.sequence,
        imported_at: importedAt,
        model_id: message.model_id,
        usage: message.usage
      },
      is_active_window: false,        // imported messages are not in active window
      archived_at: NULL
    )

  // --- STEP 6: Update global conversation badge ---
  UPDATE global_conversations SET
    imported_to_workspace_id = workspaceId,
    imported_at = importedAt
  WHERE id = globalConversationId
  // NOTE: Overwrites previous import badge. Most recent import wins.
  // Per S-6 Addendum §1: badge metadata, not full provenance.

  // --- STEP 7: Return result ---
  RETURN {
    importBatchId,
    workspaceId,
    importedMessageCount: messages.length,
    importedAt,
    source: {
      globalConversationId,
      title: globalConv.title
    }
  }
```

---

## 5. Message Copy Mapping

### 5.1 Field Mapping: `global_messages` → `messages`

| `global_messages` Field | → | `messages` Field | Transformation |
|--------------------------|---|------------------|----------------|
| `id` | → | `id` | **NEW UUID** — original ID stored in `metadata.source_message_id` |
| (none) | → | `workspace_id` | Set to target workspace |
| (none) | → | `agent_id` | **NULL** — imported chat has no agent |
| `role` | → | `type` + `role` | Both set to message.role |
| `content` | → | `content` | Direct copy |
| `model_id` | → | `metadata.model_id` | Stored in metadata (no dedicated column) |
| `usage` | → | `metadata.usage` + `token_count` | Usage jsonb → metadata; total_tokens → token_count |
| `sequence` | → | `metadata.source_sequence` | Original order preserved in metadata |
| `created_at` | → | `created_at` | **NEW timestamp** (import time, not original time) |
| (none) | → | `created_by` | Set to importing user |
| (none) | → | `metadata.imported` | `true` |
| (none) | → | `metadata.source` | `"global_chat"` |
| (none) | → | `metadata.import_batch_id` | Batch UUID for grouping |
| (none) | → | `metadata.source_message_id` | Original `global_messages.id` |
| (none) | → | `metadata.source_conversation_id` | Original `global_conversations.id` |
| (none) | → | `metadata.imported_at` | Import timestamp |
| (none) | → | `is_active_window` | `false` |

### 5.2 What Is NOT Copied

| Not Copied | Reason |
|-----------|--------|
| Original message `id` | Avoids ID collision with workspace messages |
| Original `created_at` | Workspace timeline uses import time. Original time in metadata. |
| Original `conversation_id` | Replaced by `import_batch_id` grouping |
| `global_conversations.id` as FK | Not a workspace table |

---

## 6. Provenance Model

### 6.1 What Gets Recorded Where

| Location | Column | Value | Purpose |
|----------|--------|-------|---------|
| `global_conversations` | `imported_to_workspace_id` | Target workspace UUID | **Badge** — "📋 Imported to [workspace]" in Home sidebar |
| `global_conversations` | `imported_at` | Timestamp | When last imported |
| `messages` (workspace) | `metadata.imported` | `true` | Identifies this message as imported |
| `messages` (workspace) | `metadata.source` | `"global_chat"` | Identifies source type |
| `messages` (workspace) | `metadata.import_batch_id` | UUID | Groups messages from same import |
| `messages` (workspace) | `metadata.source_conversation_id` | Global conversation UUID | Full traceability |
| `messages` (workspace) | `metadata.source_message_id` | Global message UUID | Per-message traceability |
| `messages` (workspace) | `metadata.imported_at` | Timestamp | When imported |

### 6.2 Provenance Is Metadata, Not Live FK

Per S-6 Addendum §1-2:
- `imported_to_workspace_id` on `global_conversations` is badge metadata — overwritten on re-import, set to NULL on workspace delete.
- `metadata.source_conversation_id` on workspace `messages` is trace metadata — not an FK, does not enforce existence.
- Deleting the global original does NOT affect workspace copies. The metadata becomes a dangling reference (acceptable).
- The workspace copy is self-contained. It never depends on the global original after import.

---

## 7. NOVA Indexing Boundary

### 7.1 What NOVA Can Index

```
After import:
  ✅ Workspace copy IS indexable by NOVA
     - messages.workspace_id = target workspace (matches NOVA workspace scope — S-9)
     - messages.metadata.imported = true (identifiable as imported content)
  
  ❌ Global original is NOT indexable by NOVA
     - global_messages has no workspace_id
     - NOVA is workspace-scoped (FINAL-LOCK-3)
     - Global chats are account-level, not workspace-level
```

### 7.2 Import Enables NOVA Access

Import is the GATE for NOVA to access global chat content. A global conversation exists outside NOVA's scope. Only after explicit import does NOVA gain visibility.

---

## 8. Edge Cases

| # | Scenario | Behavior |
|---|----------|----------|
| E1 | **Import to same workspace twice** | Allowed. Each import creates a NEW import batch with NEW messages. No deduplication. Two independent copies in the same workspace. |
| E2 | **Import to different workspaces** | Allowed. Each workspace gets independent copy. `imported_to_workspace_id` shows most recent. |
| E3 | **Import empty conversation** | Rejected (400). No messages to copy. |
| E4 | **Import very large conversation (>500 messages)** | Rejected (400). Phase 1 limit. Future: paginated import or higher limit. |
| E5 | **Delete global original after import** | Workspace copy unaffected. `metadata.source_conversation_id` becomes dangling reference. `imported_to_workspace_id` on deleted conversation is gone (CASCADE). |
| E6 | **Delete workspace after import** | Messages deleted (CASCADE on workspace). Global original unaffected. `imported_to_workspace_id` set to NULL (ON DELETE SET NULL). |
| E7 | **Import while global conversation is being edited** | No lock. Import copies current state at read time. Post-import edits to original not reflected in copy. |
| E8 | **Import by non-owner of global conversation** | Rejected (403). User must own the global conversation. |
| E9 | **Import by workspace viewer** | Rejected (403). Viewer role cannot write to workspace. |
| E10 | **Import with media/artifacts in messages** | Phase 1: text content only. Media URLs are copied as text but media assets are not re-uploaded. Future: artifact import. |
| E11 | **Concurrent imports of same conversation to same workspace** | No lock. Both succeed. Two independent copies. Race is harmless. |
| E12 | **Import then re-import after adding messages to original** | Second import copies ALL messages including new ones. Workspace gets two copies of old messages + one copy of new messages. No dedup. |

---

## 9. Badge Contract

### 9.1 Home Sidebar (Global Conversation)

```
IF global_conversation.imported_to_workspace_id IS NOT NULL:
  Display: "📋 Imported to {workspace_name}"
  Chat remains in recent chats list
  Chat remains fully functional (can continue in main chat)

IF global_conversation.imported_to_workspace_id IS NULL (never imported or workspace deleted):
  No badge
```

### 9.2 Workspace Chat Panel (Imported Conversation)

```
IF message.metadata.imported == true:
  Panel header: "📋 Imported from Main Chat on {imported_at}"
  
  IF global_conversation still exists (metadata.source_conversation_id resolves):
    Panel header: "📋 Imported from '{conversation_title}' on {imported_at}"
  
  IF global_conversation deleted (dangling reference):
    Panel header: "📋 Imported from Main Chat on {imported_at} (original deleted)"
```

---

## 10. Rollback / No-Op Validation

### 10.1 What "No Implementation" Means for S-7

| Check | Status |
|-------|--------|
| No `messages` table modified | ✅ |
| No `global_conversations` column added | ✅ |
| No API route implemented | ✅ |
| No import executed against live data | ✅ |
| No workspace panel created | ✅ |

### 10.2 Future Implementation Validation (Not This Slice)

| Test | Expected Result |
|------|----------------|
| Import 12-message conversation | 12 messages in workspace `messages` with `metadata.imported = true` |
| Import same conversation twice | 24 messages (12 + 12), different `import_batch_id` |
| Delete global original after import | Workspace copy intact. Badge on original gone. |
| Query NOVA after import | Workspace copy returned in results. Global original not returned. |
| Import by non-owner | 403 |
| Import to workspace where user is viewer | 403 |
| Import 600-message conversation | 400 "exceeds 500 message limit" |
| Check global conversation badge | Shows most recent import workspace only |

---

## 11. Blocked Assumptions

| # | Assumption | Severity | Resolution |
|---|-----------|----------|-----------|
| C1 | `messages` table can store imported messages without `agent_id` | LOW | `agent_id` is nullable in database.types.ts |
| C2 | `messages.metadata` can hold import provenance as jsonb | LOW | `metadata: Record<string, unknown>` in types |
| C3 | `import_batch_id` grouping via metadata is sufficient for Phase 1 | MEDIUM | Acceptable without indexed `conversation_id`. Add column in Phase 2 if needed. |
| C4 | 500 message limit is reasonable for Phase 1 | LOW | Configurable. Owner can adjust. |
| C5 | No media/artifact import needed in Phase 1 | DESIGN CHOICE | Text-only import. Media import deferred. |
| C6 | No deduplication needed for re-imports | DESIGN CHOICE | Simple copy. User can manually clean up duplicates. |

---

## 12. Excluded from S-7 Scope

| Item | Reason |
|------|--------|
| Move or Link import modes | FINAL-LOCK-2: Copy only |
| `conversation_id` column on `messages` | No DDL in design phase |
| Workspace panel UI creation | S-8/S-10 concern |
| NOVA ingestion trigger on import | S-9 concern |
| Media/artifact import | Phase 2+ |
| Import history/log table | Phase 2+ |
| Bulk import (multiple conversations at once) | Phase 2+ |
| Import from other sources (Notion, Google Docs, etc.) | Future |

---

## 13. S-8 Readiness

| Prerequisite | Status |
|-------------|--------|
| Copy-based import flow designed (7 steps) | ✅ |
| Source validation rules defined | ✅ |
| Destination validation rules defined | ✅ |
| Message copy mapping table complete (18 fields) | ✅ |
| Provenance model defined (8 metadata fields) | ✅ |
| NOVA indexing boundary explicit | ✅ |
| 12 edge cases documented | ✅ |
| Badge contract for Home sidebar + Workspace panel | ✅ |
| Rollback/no-op validation defined | ✅ |
| 6 blocked assumptions cataloged | ✅ |
| S-6 Addendum rules applied | ✅ |

**S-7 is COMPLETE. S-8 (Home Shell Entry Route Design) is READY (not yet authorized).**

---

## No Implementation Performed

Design only. No code written. No SQL produced. No tables created. No API routes implemented. No Supabase changes. No migration. No deploy. Supabase authority: `xjuglddxwnikvcwxfbzg` (LOCKED).
