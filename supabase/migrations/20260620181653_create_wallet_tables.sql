-- Migration: Create wallet_transactions + wallet_balances
-- S-2A Wallet Vocabulary & Type Definitions
-- Design: S-2 Execution Report + S-2 Addendum (WalletBalance Derivation Rule)
-- Grants: service_role for transaction creation; authenticated for balance read
-- Rollback: DROP TABLE wallet_balances, wallet_transactions
-- Zero data impact: new tables, no existing data to migrate

-- ============================================================================
-- 1. wallet_transactions — immutable credit ledger
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  source text NOT NULL,
  amount int NOT NULL,
  balance_after int NOT NULL,
  operation_id uuid REFERENCES public.model_usage_ledger(id) ON DELETE SET NULL,
  request_id text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT wallet_transactions_type_check
    CHECK (type IN ('grant', 'deduction', 'refund', 'adjustment')),

  CONSTRAINT wallet_transactions_amount_check
    CHECK (amount <> 0),

  CONSTRAINT wallet_transactions_status_check
    CHECK (status IN ('completed', 'reversed'))
);

COMMENT ON TABLE public.wallet_transactions
IS 'Immutable credit ledger. Every credit change is a row. Balance = SUM(amount) WHERE status = ''completed''. Never UPDATE or DELETE — use reversal transactions instead.';

COMMENT ON COLUMN public.wallet_transactions.amount
IS 'Credit amount. Positive = credits added (grant/refund). Negative = credits removed (deduction). Never zero.';

COMMENT ON COLUMN public.wallet_transactions.balance_after
IS 'Wallet balance AFTER this transaction was applied. Denormalized for audit reconciliation.';

COMMENT ON COLUMN public.wallet_transactions.operation_id
IS 'Link to model_usage_ledger.id for deduction transactions. NULL for grants, refunds, adjustments.';

-- ============================================================================
-- 2. wallet_balances — derived balance cache
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance int NOT NULL DEFAULT 0,
  last_transaction_id uuid REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.wallet_balances
IS 'Derived read model. Cache of SUM(wallet_transactions.amount) per user. Recalculated on every transaction. Never write directly — always create a wallet_transaction and derive from it.';

COMMENT ON COLUMN public.wallet_balances.current_balance
IS 'Current credit balance. DERIVED — computed from wallet_transactions, not written directly. If this value disagrees with SUM(wallet_transactions.amount), the SUM is authoritative.';

-- ============================================================================
-- 3. Indexes
-- ============================================================================

-- Primary balance computation query: SUM by user, completed only
CREATE INDEX idx_wallet_transactions_user_status
  ON public.wallet_transactions (user_id, status, created_at DESC);

-- Deduction → usage ledger audit linkage
CREATE INDEX idx_wallet_transactions_operation
  ON public.wallet_transactions (operation_id)
  WHERE operation_id IS NOT NULL;

-- API request traceability
CREATE INDEX idx_wallet_transactions_request
  ON public.wallet_transactions (request_id);

-- Transaction history timeline
CREATE INDEX idx_wallet_transactions_created
  ON public.wallet_transactions (created_at DESC);

-- ============================================================================
-- 4. RLS — row-level security
-- ============================================================================

-- wallet_transactions: users read own rows; service_role inserts
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallet_transactions_select_own
  ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- wallet_balances: users read own balance; service_role manages
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallet_balances_select_own
  ON public.wallet_balances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 5. Grants
-- ============================================================================

-- REVOKE all from anon/authenticated first
REVOKE ALL ON TABLE public.wallet_transactions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wallet_balances FROM PUBLIC, anon, authenticated;

-- GRANT minimal: authenticated can read own rows (enforced by RLS)
GRANT SELECT ON TABLE public.wallet_transactions TO authenticated;
GRANT SELECT ON TABLE public.wallet_balances TO authenticated;

-- service_role manages transactions and balances (server-side only)
GRANT SELECT, INSERT ON TABLE public.wallet_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.wallet_balances TO service_role;

-- ============================================================================
-- 6. Rollback
-- ============================================================================
-- DROP TABLE IF EXISTS public.wallet_balances CASCADE;
-- DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
