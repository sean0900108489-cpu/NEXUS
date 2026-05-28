-- V6: Agent Runtime Sessions & Task Lifecycle
--
-- Additive-only runtime control-plane migration. This version creates Agent
-- Runtime Sessions, Agent Tasks, and milestone Agent Runtime Events only.
-- It intentionally does not create V7 tool run / tool permission tables, V8 artifact
-- asset tables, V9 observability tables, or V10 historical paging tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.agent_runtime_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  agent_id text NOT NULL,
  user_id uuid NOT NULL,
  provider text,
  model text,
  status text NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT agent_runtime_sessions_status_check
    CHECK (status IN ('active', 'ended', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_workspace_agent
  ON public.agent_runtime_sessions (workspace_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_sessions_status
  ON public.agent_runtime_sessions (status);

CREATE INDEX IF NOT EXISTS idx_sessions_active_reuse
  ON public.agent_runtime_sessions (workspace_id, agent_id, user_id, provider, model)
  WHERE status = 'active' AND ended_at IS NULL;

CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.agent_runtime_sessions(id) ON DELETE SET NULL,
  workspace_id text NOT NULL,
  agent_id text NOT NULL,
  task_type text NOT NULL,
  status text NOT NULL,
  input_message_id text,
  output_message_id text,
  parent_task_id uuid REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  attempt_count int NOT NULL DEFAULT 0,
  error_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_tasks_task_type_check
    CHECK (task_type IN ('chat', 'memory_compress', 'tool_chain', 'handoff', 'branch')),
  CONSTRAINT agent_tasks_status_check
    CHECK (status IN (
      'created',
      'queued',
      'running',
      'streaming',
      'waiting_for_tool',
      'waiting_for_confirmation',
      'completed',
      'failed',
      'cancelled',
      'retrying'
    )),
  CONSTRAINT agent_tasks_attempt_count_check
    CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_workspace_agent_status
  ON public.agent_tasks (workspace_id, agent_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_session
  ON public.agent_tasks (session_id);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_parent
  ON public.agent_tasks (parent_task_id);

CREATE TABLE IF NOT EXISTS public.agent_runtime_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_runtime_events_type_check
    CHECK (event_type IN (
      'stream_started',
      'first_token',
      'fallback_used',
      'stream_completed',
      'stream_failed'
    ))
);

CREATE INDEX IF NOT EXISTS idx_runtime_events_task_created
  ON public.agent_runtime_events (task_id, created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_agent_tasks_updated_at'
  ) THEN
    CREATE TRIGGER set_agent_tasks_updated_at
    BEFORE UPDATE ON public.agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.agent_runtime_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runtime_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_runtime_sessions'
      AND policyname = 'agent_runtime_sessions_select_member'
  ) THEN
    CREATE POLICY agent_runtime_sessions_select_member
    ON public.agent_runtime_sessions
    FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_runtime_sessions'
      AND policyname = 'agent_runtime_sessions_insert_editor'
  ) THEN
    CREATE POLICY agent_runtime_sessions_insert_editor
    ON public.agent_runtime_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
      AND user_id = auth.uid()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_runtime_sessions'
      AND policyname = 'agent_runtime_sessions_update_editor'
  ) THEN
    CREATE POLICY agent_runtime_sessions_update_editor
    ON public.agent_runtime_sessions
    FOR UPDATE
    TO authenticated
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_tasks'
      AND policyname = 'agent_tasks_select_member'
  ) THEN
    CREATE POLICY agent_tasks_select_member
    ON public.agent_tasks
    FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_tasks'
      AND policyname = 'agent_tasks_insert_editor'
  ) THEN
    CREATE POLICY agent_tasks_insert_editor
    ON public.agent_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_tasks'
      AND policyname = 'agent_tasks_update_editor'
  ) THEN
    CREATE POLICY agent_tasks_update_editor
    ON public.agent_tasks
    FOR UPDATE
    TO authenticated
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_runtime_events'
      AND policyname = 'agent_runtime_events_select_member'
  ) THEN
    CREATE POLICY agent_runtime_events_select_member
    ON public.agent_runtime_events
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.agent_tasks AS task
        WHERE task.id = task_id
          AND public.is_workspace_member(task.workspace_id)
      )
    );
  END IF;
END $$;

COMMENT ON TABLE public.agent_runtime_sessions IS
  'V6 agent runtime sessions. Active sessions are reused per workspace, agent, user, provider, and model to prevent session explosion.';

COMMENT ON TABLE public.agent_tasks IS
  'V6 agent task lifecycle table. waiting_for_tool is a reserved V7 status only; this table must not create V7 tool execution control-plane records.';

COMMENT ON TABLE public.agent_runtime_events IS
  'V6 milestone runtime events only. Payloads must be sanitized and must never contain raw provider errors, API keys, Authorization headers, provider tokens, prompt fragments with secrets, or token-level stream deltas.';
