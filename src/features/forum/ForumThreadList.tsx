/**
 * NEXUS Window OS — Forum Thread List
 *
 * @module features/forum
 */

"use client";

import { Plus, MessageSquare } from "lucide-react";
import type { ForumThread } from "./forum-api";

export function ForumThreadList({
  threads,
  selectedThreadId,
  onSelect,
  onCreate,
}: {
  threads: ForumThread[];
  selectedThreadId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div>
      {/* New Thread */}
      <div className="p-2 border-b border-white/5">
        <button
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          onClick={onCreate}
        >
          <Plus className="w-3.5 h-3.5" />
          New Thread
        </button>
      </div>

      {/* Threads */}
      <div className="space-y-0.5 p-1">
        {threads.map((thread) => (
          <button
            key={thread.id}
            className={`w-full text-left px-3 py-2.5 rounded-md text-xs transition-colors ${
              selectedThreadId === thread.id
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
            }`}
            onClick={() => onSelect(thread.id)}
          >
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 shrink-0" />
              <span className="truncate font-medium">{thread.title}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-white/15">
              <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
              <span>{thread.replyCount} repl{thread.replyCount === 1 ? "y" : "ies"}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
