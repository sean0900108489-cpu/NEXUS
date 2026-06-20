# S-7: Import-to-Workspace Contract Design

**Phase:** F (Import to Workspace)
**Depends on:** S-2 (Wallet vocabulary), S-6 (Global conversations schema defined)
**Owner Locks:** FINAL-LOCK-2 (Copy mode)
**Status:** Design only — no implementation authorized

## Objective
Design the copy-based import contract: how a global conversation becomes a workspace conversation. Define the copy semantics, provenance tracking, NOVA indexing eligibility, and the "imported" badge contract.

## Code Domains Touched (Design Reference Only)
- `src/lib/nexus-types.ts` — target for import contract types
- Existing workspace conversation creation path — reference for workspace chat creation pattern

## Data Domains Touched (Design Reference Only)
- Future `global_conversations` (from S-6) — source of import
- Existing `messages` table — target of copy
- Existing `workspaces` table — target workspace

## What This Slice Designs

### 7.1 Import API Contract

```
POST /api/workspaces/{workspaceId}/import-chat
Body: {
  globalConversationId: string
}
Response: {
  workspaceConversationId: string,
  importedMessageCount: number,
  importedAt: string
}
```

### 7.2 Copy Semantics (Step by Step)

```
1. VALIDATE: User owns global_conversation (user_id = auth.uid())
2. VALIDATE: User is member of target workspace
3. VALIDATE: Conversation not already imported to this workspace
4. CREATE workspace conversation record (in existing messages/conversation tables):
     - Copy conversation metadata (title, model_id)
     - Set imported_from_global_chat_id = source conversation id
     - Set workspace_id = target workspace
5. COPY all global_messages → workspace messages:
     - For each message in global_messages (ordered by sequence):
       - Insert into messages table with workspace_id
       - Preserve role, content, model_id, sequence order
       - Add metadata: { imported: true, source: 'global_chat', imported_at }
6. UPDATE global_conversations:
     - SET imported_to_workspace_id = target workspace id
     - SET imported_at = now()
7. RETURN workspace conversation metadata
```

### 7.3 Provenance Tracking

```
On workspace conversation:
  imported_from_global_chat_id: uuid   // NULL for native workspace chats
  imported_at: timestamptz             // NULL for native workspace chats

On global conversation:
  imported_to_workspace_id: uuid       // NULL if never imported
  imported_at: timestamptz             // NULL if never imported
```

### 7.4 NOVA Indexing Boundary

```
After import:
  ✅ Workspace copy IS indexable by NOVA (it's workspace-scoped)
  ❌ Global original is NOT indexable by NOVA (it's account-scoped, not workspace-scoped)
  
Rule: NOVA only indexes content where workspace_id IS NOT NULL.
      Global conversations have no workspace_id → excluded from NOVA.
      Import creates workspace-scoped copy → included in NOVA.
```

### 7.5 Import Badge Contract

```
Home sidebar recent chats:
  If global_conversation.imported_to_workspace_id IS NOT NULL:
    Display badge: "📋 Imported to {workspace.name}"
    Chat remains in recent chats list
    Chat remains fully functional (can continue conversation)

Workspace chat panel:
  If workspace_conversation.imported_from_global_chat_id IS NOT NULL:
    Display badge: "📋 Imported from Main Chat on {imported_at}"
    Chat is fully functional within workspace
```

### 7.6 Edge Cases

| Scenario | Behavior |
|----------|----------|
| Import same chat twice to same workspace | Reject: "Already imported to this workspace" |
| Import same chat to different workspace | Allow: each workspace gets independent copy |
| Delete global original after import | Workspace copy unaffected (independent copy) |
| Delete workspace copy after import | Global original unaffected |
| Imported chat messages edited in workspace | Only workspace copy changes (no sync back) |
| Global chat continues after import | Both copies diverge independently |
| Import very large conversation | Limit: max 500 messages per import (Phase 1) |

## Validation Method
- Copy step sequence is unambiguous (7 steps)
- Provenance columns defined for both source and target
- NOVA indexing boundary is explicit
- Badge contract defined for both home sidebar and workspace panel
- All 7 edge cases have defined behavior

## Forbidden Areas
- Do not implement Move or Link semantics (COPY ONLY per LOCK-2)
- Do not create automatic import triggers (import is user-initiated)
- Do not sync content between original and copy after import
- Do not allow NOVA to index global originals

## Dependency Order
After S-6 (global conversations schema defined). Before S-9 (NOVA workspace-scoped design references import contract).

## Rollback / No-Op Validation
Only a design document produced. No code changed. No imports executed.
