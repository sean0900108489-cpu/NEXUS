/**
 * NEXUS Window OS — Account Summary Panel
 *
 * @module features/global-user
 */

"use client";

import { User } from "lucide-react";

type AccountSummaryPanelProps = {
  email?: string;
  userId?: string;
};

export function AccountSummaryPanel({ email, userId }: AccountSummaryPanelProps) {
  if (!email && !userId) {
    return null;
  }

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3 text-white/60 text-xs font-medium uppercase tracking-wider">
        <User className="w-3.5 h-3.5" />
        Account
      </div>
      <div className="space-y-1">
        {email && (
          <p className="text-sm text-white/70 truncate">{email}</p>
        )}
        {userId && (
          <p className="text-[10px] text-white/20 font-mono">
            ID: {userId.slice(0, 16)}...
          </p>
        )}
      </div>
    </div>
  );
}
