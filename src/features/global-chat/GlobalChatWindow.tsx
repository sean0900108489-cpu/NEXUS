/**
 * NEXUS Window OS — Global Chat Window App (orchestrator)
 *
 * Orchestrates the global chat experience.
 * All UI is delegated to sub-components.
 * All data access goes through globalChatApi.
 *
 * Sub-components:
 *   GlobalChatConversationList  — conversation sidebar
 *   GlobalChatConversationView  — active conversation
 *   GlobalChatComposer          — message input + attachments
 *   GlobalChatStates            — shared loading/empty/error
 *
 * @module features/global-chat
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { globalChatApi } from "./global-chat-api";
import type { ChatConversation, ChatMessage } from "./global-chat-api";
import type { ComposerAttachment } from "@/features/attachments/attachment-api";
import { GlobalChatConversationList } from "./GlobalChatConversationList";
import { GlobalChatConversationView } from "./GlobalChatConversationView";
import { GlobalChatComposer } from "./GlobalChatComposer";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";

// ── Types ──────────────────────────────────────────────────────────

type ChatView =
  | { mode: "list" }
  | { mode: "conversation"; conversationId: string }
  | { mode: "new" };

type ConversationState = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
};

// ── Component ──────────────────────────────────────────────────────

export function GlobalChatWindow({ setTitle }: NexusWindowAppProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const [view, setView] = useState<ChatView>({ mode: "list" });
  const [convState, setConvState] = useState<ConversationState>({
    messages: [],
    loading: false,
    error: null,
  });
  const [sending, setSending] = useState(false);

  // ── Data: Conversations ─────────────────────────────────

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    setConversationsError(null);
    try {
      const list = await globalChatApi.listConversations();
      setConversations(list);
    } catch (err) {
      setConversationsError(
        err instanceof Error ? err.message : "Failed to load conversations",
      );
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Data: Messages ──────────────────────────────────────

  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      setConvState({ messages: [], loading: true, error: null });
      try {
        const result = await globalChatApi.getConversation(conversationId);
        setTitle(result.conversation.title || `Chat — ${conversationId.slice(0, 8)}`);
        setConvState({ messages: result.messages, loading: false, error: null });
      } catch (err) {
        setConvState({
          messages: [],
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load messages",
        });
      }
    },
    [setTitle],
  );

  // ── Actions ─────────────────────────────────────────────

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setView({ mode: "conversation", conversationId });
      loadConversationMessages(conversationId);
    },
    [loadConversationMessages],
  );

  const handleNewConversation = useCallback(() => {
    setView({ mode: "new" });
    setTitle("New Chat");
    setConvState({ messages: [], loading: false, error: null });
  }, [setTitle]);

  const handleBackToList = useCallback(() => {
    setView({ mode: "list" });
    setTitle("Global Chat");
    loadConversations();
  }, [loadConversations, setTitle]);

  const handleSend = useCallback(
    async (content: string, attachments: ComposerAttachment[]) => {
      setSending(true);

      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        conversationId: view.mode === "conversation" ? view.conversationId : "new",
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        // Show attachments on optimistic message
        attachments: attachments.map((a) => ({
          id: a.id,
          kind: a.kind,
          filename: a.filename,
          mimeType: a.mimeType,
          storageKey: a.storageKey,
        })),
      };

      setConvState((prev) => ({
        ...prev,
        messages: [...prev.messages, optimistic],
        error: null,
      }));

      try {
        const conversationId =
          view.mode === "conversation" ? view.conversationId : undefined;

        const result = await globalChatApi.sendMessage({
          conversationId,
          content,
          attachments: attachments.length > 0 ? attachments : undefined,
        });

        if (!conversationId) {
          setView({ mode: "conversation", conversationId: result.conversationId });
          setTitle(`Chat — ${content.slice(0, 30)}${content.length > 30 ? "..." : ""}`);
          loadConversations();
        }

        setConvState((prev) => {
          const withoutOptimistic = prev.messages.filter((m) => m.id !== optimistic.id);
          return {
            ...prev,
            messages: [
              ...withoutOptimistic,
              ...(result.userMessage ? [result.userMessage] : [optimistic]),
              ...(result.assistantMessage ? [result.assistantMessage] : []),
            ],
          };
        });
      } catch (err) {
        setConvState((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== optimistic.id),
          error: err instanceof Error ? err.message : "Send failed",
        }));
      } finally {
        setSending(false);
      }
    },
    [view, setTitle, loadConversations],
  );

  // ── Render ─────────────────────────────────────────────

  if (view.mode === "list") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
            Conversations
          </span>
          <button
            className="text-white/40 hover:text-white transition-colors"
            onClick={loadConversations}
            title="Refresh"
          >
            <Loader2 className={`w-3.5 h-3.5 ${conversationsLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <GlobalChatConversationList
          conversations={conversations}
          loading={conversationsLoading}
          error={conversationsError}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onRetry={loadConversations}
        />
      </div>
    );
  }

  const conversationTitle =
    view.mode === "new"
      ? "New Conversation"
      : conversations.find((c) => c.id === view.conversationId)?.title ?? "Chat";

  const activeConversationId =
    view.mode === "conversation" ? view.conversationId : undefined;

  return (
    <div className="flex flex-col h-full">
      <GlobalChatConversationView
        conversationId={activeConversationId}
        conversationTitle={conversationTitle}
        messages={convState.messages}
        loading={convState.loading}
        error={convState.error}
        onBack={handleBackToList}
      />
      <GlobalChatComposer
        onSend={handleSend}
        disabled={convState.loading}
        sending={sending}
      />
    </div>
  );
}
