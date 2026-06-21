-- Migration: Create global_conversations + global_messages tables
-- S-6 Global Conversations Domain
-- Design: S-6 Execution Report 2026-06-20
-- Scope: Account-level global chat, separate from workspace messages
-- Grants: authenticated CRUD on own conversations; messages immutable
-- Rollback: DROP TABLE global_messages, global_conversations

-- ============================================================================
-- 1. global_conversations — account-level chat sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.global_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Chat',
  model_id text,
  message_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Import tracking: set when conversation is copy-imported to a workspace (S-7)
  imported_to_workspace_id uuid,
  imported_at timestamptz,

  CONSTRAINT global_conversations_message_count_check CHECK (message_count >= 0),
  CONSTRAINT global_conversations_title_check CHECK (length(title) >= 1)
);

COMMENT ON TABLE public.global_conversations
IS 'Account-level chat sessions. Owned by a single user (private). Not workspace-scoped. Imported conversations are copied, not moved.';

COMMENT ON COLUMN public.global_conversations.imported_to_workspace_id
IS 'If this conversation was copy-imported to a workspace, tracks which workspace. SET NULL if workspace is deleted.';

-- ============================================================================
-- 2. global_messages — messages within a global conversation
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.global_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.global_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  model_id text,
  usage jsonb,
  sequence integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT global_messages_role_check CHECK (role IN ('user', 'assistant', 'system')),
  CONSTRAINT global_messages_sequence_check CHECK (sequence > 0),
  CONSTRAINT global_messages_content_check CHECK (length(content) > 0),
  CONSTRAINT global_messages_unique_sequence UNIQUE (conversation_id, sequence)
);

COMMENT ON TABLE public.global_messages
IS 'Messages within account-level global conversations. Simpler than workspace messages — no agents, no task tracking, no archiving. Immutable once created.';

COMMENT ON COLUMN public.global_messages.usage
IS 'Token usage for assistant messages: { input_tokens, output_tokens, total_tokens, credits }. NULL for user/system messages.';

-- ============================================================================
-- 3. Indexes
-- ============================================================================

-- Primary query: user's recent chats, sorted by most recent message
CREATE INDEX idx_global_conv_user_updated
  ON public.global_conversations (user_id, last_message_at DESC NULLS LAST);

-- Messages within a conversation, in chronological order
CREATE INDEX idx_global_msg_conv_seq
  ON public.global_messages (conversation_id, sequence);

-- Import tracking (sparse — only when imported_to_workspace_id IS NOT NULL)
CREATE INDEX idx_global_conv_imported
  ON public.global_conversations (imported_to_workspace_id)
  WHERE imported_to_workspace_id IS NOT NULL;

-- ============================================================================
-- 4. RLS — row-level security
-- ============================================================================

-- global_conversations: user owns their conversations
ALTER TABLE public.global_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY global_conversations_select_own
  ON public.global_conversations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY global_conversations_insert_own
  ON public.global_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY global_conversations_update_own
  ON public.global_conversations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY global_conversations_delete_own
  ON public.global_conversations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- global_messages: accessible via parent conversation ownership
ALTER TABLE public.global_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY global_messages_select_via_conversation
  ON public.global_messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.global_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY global_messages_insert_via_conversation
  ON public.global_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.global_conversations WHERE user_id = auth.uid()
    )
  );

-- No UPDATE, no DELETE on messages (immutable once created)
-- Deletion happens via CASCADE when conversation is deleted.

-- ============================================================================
-- 5. Grants
-- ============================================================================

REVOKE ALL ON TABLE public.global_conversations FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.global_messages FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.global_conversations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.global_messages TO authenticated;

-- service_role gets full access for server-side operations
GRANT ALL ON TABLE public.global_conversations TO service_role;
GRANT ALL ON TABLE public.global_messages TO service_role;

-- ============================================================================
-- 6. Rollback
-- ============================================================================
-- DROP TABLE IF EXISTS public.global_messages CASCADE;
-- DROP TABLE IF EXISTS public.global_conversations CASCADE;
