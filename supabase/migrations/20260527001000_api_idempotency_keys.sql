-- V2: Unified API Contract v1 - server-side idempotency infrastructure.
--
-- This table is additive and server-only. RLS is enabled with no frontend
-- policies; route handlers must read/write it through IdempotencyRepository.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.api_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  idempotency_key text NOT NULL,
  workspace_id text NOT NULL DEFAULT '__global__',
  actor_user_id uuid,

  method text NOT NULL,
  path text NOT NULL,

  request_hash text NOT NULL,
  request_fingerprint text NOT NULL,

  response_payload jsonb,
  status_code int,

  status text NOT NULL DEFAULT 'pending',
  locked_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),

  CONSTRAINT api_idempotency_status_check
    CHECK (status IN ('pending', 'completed', 'failed')),

  CONSTRAINT api_idempotency_method_check
    CHECK (method IN ('POST', 'PUT', 'PATCH', 'DELETE')),

  CONSTRAINT api_idempotency_key_not_empty
    CHECK (length(trim(idempotency_key)) > 0),

  CONSTRAINT api_idempotency_workspace_key_unique
    UNIQUE (workspace_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_workspace_key
  ON public.api_idempotency_keys (workspace_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_expires
  ON public.api_idempotency_keys (expires_at);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_actor_created
  ON public.api_idempotency_keys (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_status_locked
  ON public.api_idempotency_keys (status, locked_at);

ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.api_idempotency_keys IS
  'Server-side /api/v1 idempotency records. Never store raw request bodies, Authorization headers, API keys, provider tokens, service-role keys, stack traces, or token-level streams.';
