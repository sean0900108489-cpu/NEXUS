import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";

import type {
  WalletBalance,
  WalletRepository,
  WalletTransaction,
  WalletTransactionStatus,
  WalletTransactionType,
  WalletTransactionSource,
} from "./wallet-types";

// ── InMemoryWalletRepository (for tests) ───────────────────────────

export class InMemoryWalletRepository implements WalletRepository {
  private readonly transactions = new Map<string, WalletTransaction>();
  private readonly balances = new Map<string, WalletBalance>();

  async getBalance(userId: string): Promise<WalletBalance> {
    const cached = this.balances.get(userId);
    if (cached) return cached;

    return {
      currentBalance: this.computeBalance(userId),
      lastTransactionId: "",
      updatedAt: new Date().toISOString(),
      userId,
    };
  }

  async createTransaction(input: {
    userId: string;
    type: WalletTransactionType;
    source: WalletTransactionSource;
    amount: number;
    operationId?: string | null;
    requestId: string;
    metadata?: Record<string, unknown>;
  }): Promise<WalletTransaction> {
    const currentBalance = this.computeBalance(input.userId);
    const balanceAfter = currentBalance + input.amount;

    const transaction: WalletTransaction = {
      amount: input.amount,
      balanceAfter,
      createdAt: new Date().toISOString(),
      id: makeId(),
      metadata: input.metadata,
      operationId: input.operationId ?? null,
      requestId: input.requestId,
      source: input.source,
      status: "completed" as WalletTransactionStatus,
      type: input.type,
      userId: input.userId,
    };

    this.transactions.set(transaction.id, transaction);

    this.balances.set(input.userId, {
      currentBalance: balanceAfter,
      lastTransactionId: transaction.id,
      updatedAt: transaction.createdAt,
      userId: input.userId,
    });

    return transaction;
  }

  async getHistory(input: {
    userId: string;
    limit?: number;
    cursor?: string;
  }) {
    const limit = input.limit ?? 50;
    const all = [...this.transactions.values()]
      .filter((tx) => tx.userId === input.userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    let startIdx = 0;
    if (input.cursor) {
      const cursorIdx = all.findIndex((tx) => tx.id === input.cursor);
      if (cursorIdx >= 0) startIdx = cursorIdx + 1;
    }

    const page = all.slice(startIdx, startIdx + limit);

    return {
      hasMore: startIdx + limit < all.length,
      nextCursor: page.length > 0 && startIdx + limit < all.length
        ? page[page.length - 1].id
        : undefined,
      transactions: page,
    };
  }

  /** Expose all transactions for test assertions */
  all() {
    return [...this.transactions.values()];
  }

  /** Reset state between tests */
  clear() {
    this.transactions.clear();
    this.balances.clear();
  }

  private computeBalance(userId: string): number {
    return [...this.transactions.values()]
      .filter(
        (tx) =>
          tx.userId === userId &&
          tx.status === "completed",
      )
      .reduce((total, tx) => total + tx.amount, 0);
  }
}

// ── SupabaseWalletRepository (for production) ──────────────────────

export class SupabaseWalletRepository implements WalletRepository {
  async getBalance(userId: string): Promise<WalletBalance> {
    const client = getNexusSupabaseAdminClient();

    // Try cached balance first
    const { data: cached, error: cacheErr } = await client
      .from("wallet_balances")
      .select("user_id, current_balance, last_transaction_id, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (cacheErr) {
      throw new Error(cacheErr.message);
    }

    if (cached) {
      const row = cached as Record<string, unknown>;
      return {
        currentBalance: Number(row.current_balance ?? 0),
        lastTransactionId: String(row.last_transaction_id ?? ""),
        updatedAt: String(row.updated_at ?? new Date().toISOString()),
        userId: String(row.user_id ?? userId),
      };
    }

    // Fallback: compute from transactions (new user, no cache yet)
    const { data: rows, error: sumErr } = await client
      .from("wallet_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("status", "completed");

    if (sumErr) {
      throw new Error(sumErr.message);
    }

    const currentBalance = (Array.isArray(rows) ? rows : []).reduce(
      (total, row) => {
        const amount = Number(
          (row as { amount?: number | string | null }).amount ?? 0,
        );
        return total + (Number.isFinite(amount) ? amount : 0);
      },
      0,
    );

    return {
      currentBalance,
      lastTransactionId: "",
      updatedAt: new Date().toISOString(),
      userId,
    };
  }

  async createTransaction(input: {
    userId: string;
    type: WalletTransactionType;
    source: WalletTransactionSource;
    amount: number;
    operationId?: string | null;
    requestId: string;
    metadata?: Record<string, unknown>;
  }): Promise<WalletTransaction> {
    const client = getNexusSupabaseAdminClient();
    const txId = makeId();

    // 1. Get current balance (from cache or SUM)
    const current = await this.getBalance(input.userId);
    const balanceAfter = current.currentBalance + input.amount;

    // 2. Insert transaction
    const { error: txErr } = await client.from("wallet_transactions").insert({
      amount: input.amount,
      balance_after: balanceAfter,
      created_at: new Date().toISOString(),
      id: txId,
      metadata: input.metadata ?? null,
      operation_id: input.operationId ?? null,
      request_id: input.requestId,
      source: input.source,
      status: "completed",
      type: input.type,
      user_id: input.userId,
    } as never);

    if (txErr) {
      throw new Error(txErr.message);
    }

    // 3. Update balance cache (upsert)
    const { error: balErr } = await client.from("wallet_balances").upsert({
      current_balance: balanceAfter,
      last_transaction_id: txId,
      updated_at: new Date().toISOString(),
      user_id: input.userId,
    } as never, { onConflict: "user_id" });

    if (balErr) {
      throw new Error(balErr.message);
    }

    return {
      amount: input.amount,
      balanceAfter,
      createdAt: new Date().toISOString(),
      id: txId,
      metadata: input.metadata,
      operationId: input.operationId ?? null,
      requestId: input.requestId,
      source: input.source,
      status: "completed",
      type: input.type,
      userId: input.userId,
    };
  }

  async getHistory(input: {
    userId: string;
    limit?: number;
    cursor?: string;
  }) {
    const client = getNexusSupabaseAdminClient();
    const limit = input.limit ?? 50;

    let query = client
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (input.cursor) {
      query = query.lt("created_at", input.cursor);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const rows = (Array.isArray(data) ? data : []) as Array<
      Record<string, unknown>
    >;
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit) as Record<string, unknown>[];

    return {
      hasMore,
      nextCursor: hasMore && page.length > 0
        ? String(page[page.length - 1].created_at ?? "")
        : undefined,
      transactions: page.map((row) => ({
        amount: Number(row.amount ?? 0),
        balanceAfter: Number(row.balance_after ?? 0),
        createdAt: String(row.created_at ?? ""),
        id: String(row.id ?? ""),
        metadata: (row.metadata as Record<string, unknown>) ?? undefined,
        operationId: row.operation_id
          ? String(row.operation_id)
          : null,
        requestId: String(row.request_id ?? ""),
        source: String(row.source ?? "") as WalletTransactionSource,
        status: String(row.status ?? "completed") as WalletTransactionStatus,
        type: String(row.type ?? "") as WalletTransactionType,
        userId: String(row.user_id ?? ""),
      })),
    };
  }
}

// ── Factory ────────────────────────────────────────────────────────

const inMemoryWalletRepository = new InMemoryWalletRepository();

export function createWalletRepository(): WalletRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseWalletRepository()
    : inMemoryWalletRepository;
}

export function getInMemoryWalletRepository() {
  return inMemoryWalletRepository;
}

// ── Helpers ────────────────────────────────────────────────────────

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `wallet_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
