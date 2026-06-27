/**
 * NEXUS Window OS — Wallet Summary Panel
 *
 * Displays wallet balance with loading/error/empty states.
 *
 * @module features/global-user
 */

"use client";

import { Wallet, Loader2 } from "lucide-react";
import type { WalletBalance } from "./global-user-api";

type WalletSummaryPanelProps = {
  balance: WalletBalance | null;
  loading: boolean;
  error: string | null;
};

export function WalletSummaryPanel({ balance, loading, error }: WalletSummaryPanelProps) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3 text-white/60 text-xs font-medium uppercase tracking-wider">
        <Wallet className="w-3.5 h-3.5" />
        Wallet
      </div>

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-white/30" />
      ) : error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : !balance ? (
        <p className="text-xs text-white/30">Sign in to view wallet</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white">
              {balance.credits.toLocaleString()}
            </span>
            <span
              className={`text-xs font-medium ${
                balance.state === "ready"
                  ? "text-green-400"
                  : balance.state === "low"
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {balance.state.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-white/30 mt-1">credits remaining</p>
        </>
      )}
    </div>
  );
}
