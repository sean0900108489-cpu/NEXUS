# S-6: Global Conversations Domain Design

**Phase:** E (Global Chat Persistence)
**Depends on:** S-1 (Deduplication & Naming complete)
**Owner Locks:** FINAL-LOCK-2 (Copy mode for import)
**Status:** Design only — no implementation authorized

## Objective
Design the `global_conversations` domain — the account-level conversation table separate from workspace `messages`. Define schema, relationship to existing `messages`, and the home sidebar recent chats contract.

## Code Domains Touched (Design Reference Only)
- Supabase `messages` table — reference for workspace chat schema pattern
- `src/store/nexus-store.ts` — reference for chat state management pattern
- `src/lib/nexus-types.ts` — target for new global conversation types

## Data Domains Touched (Design Reference Only)
- Future `global_conversations` table (design only, no DDL)
- Existing `messages` table (reference, not modified)

## What This Slice Designs

### 6.1 Global Conversations Schema (Design)

```
TABLE global_conversations {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id: uuid NOT NULL REFERENCES auth.users(id)
  title: text                        // first user message or auto-generated
  model_id: text                     // model used for last message
  message_count: integer DEFAULT 0   // denormalized count
  last_message_at: timestamptz
  created_at: timestamptz DEFAULT now()
  updated_at: timestamptz DEFAULT now()
  
  -- Import tracking (when conversation is imported to workspace)
  imported_to_workspace_id: uuid     // set when copy-imported
  imported_at: timestamptz           // set when copy-imported
  
  INDEX idx_global_conversations_user_updated (user_id, updated_at DESC)
  RLS: user_id = auth.uid()
}
```

### 6.2 Global Messages Schema (Design)

```
TABLE global_messages {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
  conversation_id: uuid NOT NULL REFERENCES global_conversations(id) ON DELETE CASCADE
  role: text NOT NULL                // 'user' | 'assistant' | 'system'
  content: text NOT NULL
  model_id: text                     // model that generated this message (assistant only)
  usage: jsonb                       // { inputTokens, outputTokens, totalTokens, credits }
  sequence: integer NOT NULL         // message order within conversation
  created_at: timestamptz DEFAULT now()
  
  INDEX idx_global_messages_conversation (conversation_id, sequence)
  RLS: conversation_id → global_conversations.user_id = auth.uid()
}
```

### 6.3 Relationship to Workspace messages

```
global_conversations ←→ global_messages    (account-level, private to user)
workspace conversations → messages          (workspace-level, shared with members)
                                            (existing — NOT modified by this slice)

Import (S-7):
  global_conversations.id → workspace_conversation.imported_from_global_chat_id
  global_messages → copied to messages table (workspace-scoped)
```

### 6.4 Home Sidebar Recent Chats Contract

```
GET /api/global-chats?limit=20&offset=0
Response:
{
  chats: [
    {
      id: string,
      title: string,
      lastMessageAt: string,
      modelId: string,
      importedToWorkspaceId?: string,   // if imported
      importedToWorkspaceName?: string  // if imported
    }
  ]
}

Rules:
- Sorted by last_message_at DESC
- Max 50 in sidebar (paginated)
- Imported chats stay in list with "Imported to [workspace]" badge
- No workspace-scoped messages appear here
```

### 6.5 Main Chat API Contract

```
POST /api/global-chat
Body: { conversationId?: string, messages: [...], modelId: string }
Response: { content, modelId, requestId, usage: { credits, ... } }

Rules:
- Same AI gateway path as workspace chat (ai-gateway-service.ts)
- Wallet deduction applies (same as any AI operation)
- Messages stored in global_messages, not workspace messages
- No workspace_id required (account-level)
- If conversationId not provided, auto-creates global_conversations row
```

## Validation Method
- Schema design is complete (all columns, types, constraints, indexes, RLS)
- Recent chats API contract is unambiguous
- Main chat API contract is unambiguous
- Clear separation from workspace messages (no shared table)
- Import link column (`imported_to_workspace_id`) exists for S-7 integration

## Forbidden Areas
- Do not create global_conversations table (no DDL)
- Do not create global_messages table (no DDL)
- Do not modify messages table
- Do not write /api/global-chat route
- Do not modify nexus-store.ts

## Dependency Order
After S-1. Before S-7 (import-to-workspace depends on this schema).

## Rollback / No-Op Validation
Only a design document produced. No tables created. No routes written. No state changed.
