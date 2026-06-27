"use client";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

export function ProfileLoadingState() {
  return (
    <div className="flex h-full items-center justify-center text-white/20">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

export function ProfileErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <AlertCircle className="h-8 w-8 text-red-400/60" />
      <p className="max-w-xs text-center text-xs text-red-300/80">{message}</p>
      <button
        className="flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-500/20"
        onClick={onRetry}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}
