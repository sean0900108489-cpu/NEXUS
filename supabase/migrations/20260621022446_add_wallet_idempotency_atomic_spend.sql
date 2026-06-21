-- Migration: Add wallet idempotency + atomic spend RPC
-- B5: request_id unique constraint for grant idempotency
-- B6: atomic spend RPC for concurrent deduction safety
-- Grants: service_role for RPC execution
-- Rollback: DROP FUNCTION spend_credits; DROP INDEX idx_wallet_tx_request_unique

-- ============================================================================
-- 1. Unique index on request_id (per user, per source type)
--    Prevents duplicate grants/deductions with same request_id.
--    Partial: only for completed transactions.
-- ============================================================================

-- Drop existing non-unique index first
DROP INDEX IF EXISTS public.idx_wallet_transactions_request;

-- Create unique partial index
CREATE UNIQUE INDEX idx_wallet_tx_request_unique
  ON public.wallet_transactions (user_id, request_id, source, type)
  WHERE status = 'completed';

COMMENT ON INDEX public.idx_wallet_tx_request_unique
IS 'Idempotency guard: prevents duplicate completed transactions for same user+request+source+type. Deductions and grants are protected.';

-- Re-create the non-unique lookup index (for query performance, separate from unique)
CREATE INDEX idx_wallet_transactions_request
  ON public.wallet_transactions (request_id);

-- ============================================================================
-- 2. Atomic spend RPC: check balance → insert deduction → update cache
--    Runs under SECURITY DEFINER (service_role) for atomicity.
--    Returns the deduction transaction or raises an error on insufficient balance.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.spend_credits(
  p_user_id uuid,
  p_amount int,
  p_source text,
  p_operation_id uuid DEFAULT NULL,
  p_request_id text DEFAULT '',
  p_metadata jsonb DEFAULT NULL
)
RETURNS SETOF public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_balance int;
  v_tx_id uuid;
  v_tx public.wallet_transactions;
BEGIN
  -- Lock the balance row to prevent concurrent deductions
  PERFORM user_id FROM public.wallet_balances
    WHERE user_id = p_user_id
    FOR UPDATE;

  -- Get current balance (from SUM, not cache — authoritative)
  SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM public.wallet_transactions
    WHERE user_id = p_user_id AND status = 'completed';

  -- Check sufficient credits
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS: balance=%, required=%', v_current_balance, p_amount;
  END IF;

  -- Insert deduction
  v_tx_id := gen_random_uuid();
  INSERT INTO public.wallet_transactions (
    id, user_id, type, source, amount, balance_after,
    operation_id, request_id, status, metadata, created_at
  ) VALUES (
    v_tx_id, p_user_id, 'deduction', p_source, -p_amount, v_current_balance - p_amount,
    p_operation_id, p_request_id, 'completed', p_metadata, now()
  )
  RETURNING * INTO v_tx;

  -- Update cached balance
  INSERT INTO public.wallet_balances (user_id, current_balance, last_transaction_id, updated_at)
    VALUES (p_user_id, v_current_balance - p_amount, v_tx_id, now())
    ON CONFLICT (user_id) DO UPDATE
    SET current_balance = EXCLUDED.current_balance,
        last_transaction_id = EXCLUDED.last_transaction_id,
        updated_at = EXCLUDED.updated_at;

  RETURN NEXT v_tx;
END;
$$;

COMMENT ON FUNCTION public.spend_credits
IS 'Atomic credit deduction: locks balance row, checks sufficient credits, inserts deduction transaction, updates cache. Prevents concurrent double-deduct. Raises INSUFFICIENT_CREDITS on failure.';

-- ============================================================================
-- 3. Grants
-- ============================================================================

REVOKE ALL ON FUNCTION public.spend_credits FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credits TO service_role;

-- ============================================================================
-- 4. Rollback
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.spend_credits;
-- DROP INDEX IF EXISTS public.idx_wallet_tx_request_unique;
-- CREATE INDEX idx_wallet_transactions_request ON public.wallet_transactions (request_id);
