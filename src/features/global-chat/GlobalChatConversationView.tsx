/**
 * NEXUS Window OS — Global Chat Conversation View
 *
 * Active conversation display: header, messages (with attachments), error banner.
 *
 * @module features/global-chat
 */

"use client";

import { useEffect, useRef } from "react";
import { Loader2, ChevronLeft, Paperclip, Image } from "lucide-react";
import { GlobalChatEmptyMessagesState } from "./GlobalChatStates";
import type { ChatConversation, ChatMessage } from "./global-chat-api";
import { formatAttachmentSize, isImageAttachment } from "@/features/attachments/attachment-api";
import { MessageActions } from "./MessageActions";

// ── Message Attachment Display ───────────────────────────────────

function MessageAttachmentList({
  attachments,
}: {
  attachments: NonNullable<ChatMessage["attachments"]>;
}) {
  if (!attachments.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {attachments.map((att) => {
        const isImage = att.kind === "image" || att.mimeType?.startsWith("image/");
        return (
          <div
            key={att.id}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] text-white/50 max-w-[200px]"
          >
            {isImage ? (
              <Image className="w-3 h-3 shrink-0" />
            ) : (
              <Paperclip className="w-3 h-3 shrink-0" />
            )}
            <span className="truncate">{att.filename}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────

export function GlobalChatConversationView({
  conversationId,
  conversationTitle,
  messages,
  loading,
  error,
  onBack,
}: {
  conversationId?: string;
  conversationTitle: string;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onBack: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 shrink-0">
        <button
          className="text-white/40 hover:text-white transition-colors p-0.5"
          onClick={onBack}
          title="Back to conversations"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-medium text-white/50 truncate flex-1">
          {conversationTitle}
        </span>
      </div>

      {/* Messages */}
      {loading ? (
        <div className="flex items-center justify-center flex-1 text-white/20">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <GlobalChatEmptyMessagesState />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex group ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600/30 text-blue-100"
                    : msg.role === "system"
                      ? "bg-red-500/20 text-red-200"
                      : "bg-white/5 text-white/80"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <MessageAttachmentList attachments={msg.attachments} />
                )}

                {msg.creditCost != null && (
                  <div className="text-[10px] text-white/20 mt-1">
                    {msg.creditCost} credits
                  </div>
                )}
                <MessageActions message={msg} />
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 border-t border-red-500/20 shrink-0">
          {error}
        </div>
      )}
    </div>
  );
}
