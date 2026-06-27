/**
 * NEXUS Feature API — Global Chat
 *
 * Feature-level API client for global chat conversations and messages.
 * Wraps the existing nexusHomeApi to provide a domain-appropriate interface.
 *
 * Window components should use this API — NOT call fetch() directly,
 * NOT access Supabase directly.
 *
 * @module features/global-chat/global-chat-api
 */

import { nexusHomeApi } from "@/lib/nexus-home/api";
import { buildAttachmentReferences } from "@/features/attachments/attachment-api";
import type {
  GlobalConversation,
  GlobalMessage,
  SendGlobalMessageResult,
} from "@/lib/nexus-home/types";
import type { ComposerAttachment, ComposerAttachmentReference } from "@/features/attachments/attachment-api";

// ── Types ──────────────────────────────────────────────────────────

export type ChatConversation = GlobalConversation;

export type ChatMessage = GlobalMessage;

export type ChatSendResult = SendGlobalMessageResult;

export type ChatListResult = {
  conversations: ChatConversation[];
};

export type ChatMessagesResult = {
  conversation: ChatConversation;
  messages: ChatMessage[];
};

// ── API ────────────────────────────────────────────────────────────

export const globalChatApi = {
  /**
   * List recent global conversations for the authenticated user.
   */
  async listConversations(): Promise<ChatConversation[]> {
    return nexusHomeApi.listGlobalConversations();
  },

  /**
   * Get a single conversation with all its messages.
   */
  async getConversation(
    conversationId: string,
  ): Promise<ChatMessagesResult> {
    const messages = await nexusHomeApi.listGlobalMessages(conversationId);
    const firstMessage = messages[0];
    return {
      conversation: {
        id: conversationId,
        title: firstMessage?.content?.slice(0, 60) ?? "Untitled",
      },
      messages,
    };
  },

  /**
   * Send a message with optional attachments.
   * Creates a new conversation if conversationId is omitted.
   */
  async sendMessage(params: {
    conversationId?: string;
    content: string;
    modelId?: string;
    attachments?: ComposerAttachment[];
  }): Promise<ChatSendResult> {
    const attachmentRefs: ComposerAttachmentReference[] | undefined =
      params.attachments?.length
        ? buildAttachmentReferences(params.attachments)
        : undefined;

    return nexusHomeApi.sendGlobalMessage({
      conversationId: params.conversationId,
      content: params.content,
      modelId: params.modelId ?? "gpt-4o-mini",
      attachments: attachmentRefs,
    });
  },

  /**
   * Create a new empty conversation.
   */
  async createConversation(title?: string): Promise<ChatConversation> {
    return nexusHomeApi.createGlobalConversation({ title });
  },
};
