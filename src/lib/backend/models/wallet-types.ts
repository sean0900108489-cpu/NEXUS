/**
 * NEXUS Wallet Type System — S-2A
 *
 * Canonical wallet types replacing plan-era quota/points concepts.
 * All vocabulary follows S-1 canonical terms: credits, deduction, grant, wallet.
 *
 * DESIGN ONLY — type definitions. No route wiring yet (S-3 will wire the gate).
 *
 * Key invariants:
 * - WalletTransaction is the ONLY source-of-truth for credit changes
 * - WalletBalance is a DERIVED read model: SUM(wallet_transactions.amount)
 * - Never write balance directly — always create a WalletTransaction
 * - Deduction only after successful AI operation (no deduction on failure)
 */

// ── Transaction Type Enum ──────────────────────────────────────────

export type WalletTransactionType =
  | "grant"       // + credits (initial, monthly, promo, admin)
  | "deduction"   // - credits (chat, image, retrieval, tool, workflow)
  | "refund"      // + credits (failed operation reversal)
  | "adjustment"; // ± credits (admin correction)

// ── Transaction Source Enum ────────────────────────────────────────

export type WalletTransactionSource =
  // GRANT SOURCES (+)
  | "system_initial_grant"
  | "monthly_grant"
  | "manual_adjustment"
  | "promo_grant"
  | "refund_operation"
  // CONSUMPTION SOURCES (-)
  | "chat_completion"
  | "image_generation"
  | "tool_execution"
  | "workflow_run";

// ── Transaction Status ─────────────────────────────────────────────

export type WalletTransactionStatus = "completed" | "reversed";

// ── Core Records ───────────────────────────────────────────────────

/**
 * Immutable record of a single credit change.
 *
 * Wallet balance = SUM(WalletTransaction.amount) WHERE status = 'completed'.
 * Positive amounts = credits added (grant, refund, adjustment+).
 * Negative amounts = credits removed (deduction, adjustment-).
 *
 * Linked to model_usage_ledger via operationId for audit trail.
 * Never UPDATE or DELETE — use reversal transactions instead.
 */
export interface WalletTransaction {
  /** UUID, unique per transaction (gen_random_uuid()) */
  id: string;

  /** The user whose wallet this transaction affects (FK auth.users) */
  userId: string;

  /** Direction: grant (+), deduction (-), refund (+), adjustment (±) */
  type: WalletTransactionType;

  /** Business source of this credit change */
  source: WalletTransactionSource;

  /**
   * Credit amount.
   * Positive = credits added (grant/refund).
   * Negative = credits removed (deduction).
   * Never zero. Minimum magnitude >= 1 credit.
   */
  amount: number;

  /** Wallet balance AFTER this transaction was applied (denormalized for audit) */
  balanceAfter: number;

  /**
   * Link to the consuming operation, if this is a deduction.
   * References model_usage_ledger.id for chat/image operations.
   * NULL for grants, refunds, adjustments.
   */
  operationId?: string | null;

  /** Request ID for traceability across API → usage → wallet chain */
  requestId: string;

  /** Transaction lifecycle status */
  status: WalletTransactionStatus;

  /**
   * Arbitrary metadata for audit and debugging.
   * Deductions: { modelId, operationType, estimatedCredits }
   * Grants: { plan, reason, grantMonth }
   */
  metadata?: Record<string, unknown>;

  /** ISO 8601 timestamp of transaction creation */
  createdAt: string;
}

/**
 * Current wallet balance for a user.
 *
 * DERIVED READ MODEL — NOT a source-of-truth table.
 * Source of truth = SUM(WalletTransaction.amount) WHERE status = 'completed'.
 *
 * May be cached for performance. If cached value disagrees with
 * SUM recalculation, SUM is authoritative.
 * Never write to this directly — always create a WalletTransaction.
 */
export interface WalletBalance {
  /** The user who owns this wallet (1:1 with auth.users) */
  userId: string;

  /** Current credit balance. Derived from wallet_transactions. Never negative. */
  currentBalance: number;

  /** ID of the most recent wallet_transaction that updated this balance */
  lastTransactionId: string;

  /** ISO 8601 timestamp of last balance update */
  updatedAt: string;
}

// ── Credit Pricing Types ───────────────────────────────────────────

/** How credits are counted for different operation types */
export type CreditBaseUnit = "per_1k_tokens" | "per_image";

/**
 * Pre-call credit consumption estimate.
 * Computed BEFORE the AI operation executes.
 * Used by the wallet balance gate to determine if the operation is affordable.
 */
export interface CreditEstimate {
  /** The model being called */
  modelId: string;

  /** What kind of operation this is */
  operationType: WalletTransactionSource;

  /** Estimated credit cost for this operation */
  estimatedCredits: number;

  /** Detailed breakdown for transparency */
  breakdown: {
    /** For chat: ceil(totalTokens / 1000). For image: 1. */
    baseUnits: number;
    /** Model multiplier from MODEL_CREDIT_MULTIPLIERS */
    multiplier: number;
    /** Fixed cost for image operations (0 for chat models) */
    fixedCost: number;
  };
}

// ── Wallet Gate Types ──────────────────────────────────────────────

/**
 * Input to the wallet balance gate.
 * Called before every billable AI operation.
 * Replaces assertMonthlyQuotaAvailable pattern.
 */
export interface WalletGateInput {
  /** Pre-call credit estimate */
  creditEstimate: CreditEstimate;

  /** User performing the operation */
  userId: string;

  /** User's plan (for capability checking, NOT spending checking) */
  plan: string;

  /** The model being requested (for cheaper alternatives lookup) */
  modelId: string;
}

/**
 * Successful gate check result. The operation may proceed.
 */
export interface WalletGateResult {
  /** Current wallet balance before deduction */
  currentBalance: number;

  /** Estimated balance after deduction */
  remainingAfterDeduction: number;

  /** The estimated credit cost (same as input) */
  estimatedCredits: number;
}

/**
 * Insufficient credits error details.
 * HTTP 402 Payment Required.
 * Hard block — no auto-downgrade, no silent fallback.
 */
export interface InsufficientCreditsDetails {
  /** How many credits this operation would cost */
  requiredCredits: number;

  /** User's current wallet balance */
  currentBalance: number;

  /** How many credits short the user is */
  shortfall: number;

  /** The model the user requested */
  modelId: string;

  /** Models the user CAN afford (same capability tier, lower credit cost) */
  cheaperAlternatives: Array<{
    modelId: string;
    estimatedCredits: number;
    label: string;
  }>;
}

// ── Grant / Deduction Input Types ──────────────────────────────────

/**
 * Input for creating a credit grant transaction.
 * Used by: account creation hook, monthly cron, admin panel, promo redemption.
 */
export interface GrantInput {
  /** User receiving the grant */
  userId: string;

  /** Grant source (determines transaction type = 'grant') */
  source: Extract<
    WalletTransactionSource,
    | "system_initial_grant"
    | "monthly_grant"
    | "manual_adjustment"
    | "promo_grant"
  >;

  /** Credit amount to grant (positive number) */
  amount: number;

  /** Contextual metadata */
  metadata?: {
    /** Plan that triggered this grant (for monthly_grant) */
    plan?: string;
    /** Month identifier (e.g. "2026-07") */
    grantMonth?: string;
    /** Human-readable reason (for manual_adjustment) */
    reason?: string;
    /** Promo code (for promo_grant) */
    promoCode?: string;
  };
}

/**
 * Input for creating a credit deduction transaction.
 * Called AFTER a successful AI operation.
 */
export interface DeductionInput {
  /** User whose wallet is being deducted */
  userId: string;

  /** The pre-call credit estimate that was approved by the gate */
  creditEstimate: CreditEstimate;

  /** Link to the model_usage_ledger record for this operation */
  operationId: string;

  /** The actual tokens consumed (may differ from estimate for chat) */
  actualUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  /** Request ID for traceability */
  requestId: string;
}

// ── Plan Entitlement (Repurposed from quota model) ─────────────────

/**
 * What a plan provides to the user.
 * Plan is now an ENTITLEMENT layer, not a SPENDING gate.
 * Spending is governed by wallet balance.
 */
export interface PlanEntitlement {
  /** Models this plan allows the user to access (capability rule) */
  allowedModelIds: string[];

  /** Monthly credit grant amount (was: monthlyPoints → monthlyCreditGrant) */
  monthlyCreditGrant: number;

  /** Discount multiplier on credit costs (1.0 = no discount) */
  creditDiscountMultiplier: number;

  /** Maximum concurrent operations */
  maxConcurrency?: number;

  /** Maximum workspace count */
  maxWorkspaces?: number;
}

// ── Repository Interface ───────────────────────────────────────────

/**
 * Repository for wallet operations.
 * Follows the same pattern as UsageLedgerRepository.
 * InMemory implementation for tests. Supabase implementation for production.
 */
export interface WalletRepository {
  /** Get current balance for a user (derived from wallet_transactions) */
  getBalance(userId: string): Promise<WalletBalance>;

  /**
   * Insert a transaction and update the balance atomically.
   * This is the ONLY way to change a wallet balance.
   */
  createTransaction(input: {
    userId: string;
    type: WalletTransactionType;
    source: WalletTransactionSource;
    amount: number;
    operationId?: string | null;
    requestId: string;
    metadata?: Record<string, unknown>;
  }): Promise<WalletTransaction>;

  /** Get transaction history for a user (paginated) */
  getHistory(input: {
    userId: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    transactions: WalletTransaction[];
    hasMore: boolean;
    nextCursor?: string;
  }>;
}
