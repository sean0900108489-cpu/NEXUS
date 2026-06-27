/**
 * NEXUS Window OS — Feed Window States
 *
 * @module features/feed
 */

"use client";

import { RefreshCw, Rss } from "lucide-react";

export function FeedLoadingState() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-white/30">
      Loading feed...
    </div>
  );
}

export function FeedEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="max-w-xs">
        <Rss className="mx-auto h-7 w-7 text-white/15" />
        <p className="mt-3 text-sm font-medium text-white/55">No feed items yet</p>
        <button
          className="mt-3 rounded-md bg-white/10 px-3 py-1.5 text-xs text-white/75 transition-colors hover:bg-white/15"
          onClick={onCreate}
        >
          Create Item
        </button>
      </div>
    </div>
  );
}

export function FeedErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="max-w-xs">
        <p className="text-sm font-medium text-red-300/80">{message}</p>
        <button
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/15"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    </div>
  );
}
