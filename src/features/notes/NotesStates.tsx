/**
 * NEXUS Window OS — Notes States
 *
 * Shared loading, empty, and error states for notes.
 *
 * @module features/notes
 */

"use client";

import { Loader2, AlertCircle, StickyNote, RefreshCw } from "lucide-react";

export function NotesLoadingState() {
  return (
    <div className="flex items-center justify-center h-full text-white/20">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );
}

export function NotesEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-white/15 p-6">
      <StickyNote className="w-12 h-12" />
      <p className="text-sm">No notes yet</p>
      <button
        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
        onClick={onCreate}
      >
        Create your first note
      </button>
    </div>
  );
}

export function NotesErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
      <AlertCircle className="w-8 h-8 text-red-400/60" />
      <p className="text-xs text-center text-red-300/80 max-w-xs">{message}</p>
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-300 hover:bg-red-500/20 transition-colors"
        onClick={onRetry}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    </div>
  );
}
