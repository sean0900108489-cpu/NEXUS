/**
 * NEXUS Window OS — Global Chat Conversation List
 *
 * Conversation list sidebar with loading, empty, and error states.
 *
 * @module features/global-chat
 */

"use client";

import { Plus } from "lucide-react";
import { GlobalChatLoadingState } from "./GlobalChatStates";
import { GlobalChatErrorState } from "./GlobalChatStates";
import { GlobalChatEmptyState } from "./GlobalChatStates";
import type { ChatConversation } from "./global-chat-api";

export function GlobalChatConversationList({
  conversations,
  loading,
  error,
  activeConversationId,
  onSelect,
  onNew,
  onRetry,
}: {
  conversations: ChatConversation[];
  loading: boolean;
  error: string | null;
  activeConversationId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRetry?: () => void;
}) {
  if (loading) {
    return <GlobalChatLoadingState label="Loading conversations..." />;
  }

  if (error) {
    return <GlobalChatErrorState message={error} onRetry={onRetry} />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* New Conversation Button */}
      <div className="p-2">
        <button
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          onClick={onNew}
        >
          <Plus className="w-3.5 h-3.5" />
          New Conversation
        </button>
      </div>

      {conversations.length === 0 ? (
        <GlobalChatEmptyState />
      ) : (
        <div className="space-y-0.5 px-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors truncate ${
                activeConversationId === conv.id
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <span className="truncate block">{conv.title || "Untitled"}</span>
              {conv.updatedAt && (
                <span className="text-[10px] text-white/15 mt-0.5 block">
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
