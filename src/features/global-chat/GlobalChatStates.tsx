/**
 * NEXUS Window OS — Global Chat States
 *
 * Shared loading, empty, and error state components for Global Chat.
 *
 * @module features/global-chat
 */

"use client";

import { Loader2, AlertCircle, MessageCircle } from "lucide-react";

// ── Loading State ──────────────────────────────────────────────────

export function GlobalChatLoadingState({ label = "Loading conversations..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-full text-white/20">
      <div className="flex items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

// ── Error State ────────────────────────────────────────────────────

export function GlobalChatErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-red-400/60 p-4">
      <AlertCircle className="w-6 h-6" />
      <p className="text-xs text-center max-w-[240px]">{message}</p>
      {onRetry && (
        <button
          className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-300 hover:bg-red-500/20 transition-colors"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────

export function GlobalChatEmptyState({
  title = "No conversations yet",
  subtitle = "Start a new one above",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-white/15">
      <MessageCircle className="w-8 h-8" />
      <p className="text-xs">{title}</p>
      <p className="text-[10px]">{subtitle}</p>
    </div>
  );
}

export function GlobalChatEmptyMessagesState() {
  return (
    <div className="flex items-center justify-center h-full text-white/15 text-xs">
      Send a message to start
    </div>
  );
}
