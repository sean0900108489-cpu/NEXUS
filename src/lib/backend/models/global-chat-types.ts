/**
 * Global Chat Types — S-6 Global Conversations Domain
 *
 * Account-level chat, separate from workspace messages.
 * Simple user↔LLM conversation model. No agents, no task tracking.
 */

// ── Message Types ─────────────────────────────────────────────────

export type GlobalMessageRole = "user" | "assistant" | "system";

export interface GlobalMessage {
  id: string;
  conversationId: string;
  role: GlobalMessageRole;
  content: string;
  modelId?: string | null;
  usage?: GlobalMessageUsage | null;
  sequence: number;
  createdAt: string;
}

export interface GlobalMessageUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  credits: number;
}

// ── Conversation Types ─────────────────────────────────────────────

export interface GlobalConversation {
  id: string;
  userId: string;
  title: string;
  modelId?: string | null;
  messageCount: number;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;

  // Import tracking (S-7)
  importedToWorkspaceId?: string | null;
  importedAt?: string | null;
}

/** Conversation with messages loaded (for single conversation view) */
export interface GlobalConversationWithMessages extends GlobalConversation {
  messages: GlobalMessage[];
}

// ── API Types ─────────────────────────────────────────────────────

export interface CreateGlobalChatBody {
  message?: string;
  modelId?: string;
  conversationId?: string; // null = new conversation
}

export interface RecentChatsResponse {
  chats: GlobalConversation[];
  nextCursor?: string | null;
  hasMore: boolean;
}

// ── Repository Interface ───────────────────────────────────────────

export interface GlobalChatRepository {
  /** Create a new conversation */
  createConversation(input: {
    userId: string;
    title?: string;
    modelId?: string;
  }): Promise<GlobalConversation>;

  /** Get recent conversations for a user */
  getRecentChats(input: {
    userId: string;
    limit?: number;
    cursor?: string;
  }): Promise<RecentChatsResponse>;

  /** Get a conversation with all messages */
  getConversation(conversationId: string): Promise<GlobalConversationWithMessages | null>;

  /** Add a message to a conversation. If sequence is not provided, auto-assigns next sequence. */
  addMessage(input: {
    conversationId: string;
    role: GlobalMessageRole;
    content: string;
    modelId?: string | null;
    usage?: GlobalMessageUsage | null;
    sequence?: number;
  }): Promise<GlobalMessage>;

  /** Update conversation metadata after a message is added */
  updateConversation(input: {
    conversationId: string;
    modelId?: string | null;
    messageCount: number;
    lastMessageAt: string;
    title?: string;
  }): Promise<GlobalConversation>;

  /** Delete a conversation and all its messages */
  deleteConversation(conversationId: string): Promise<void>;

  /** Get the next sequence number for a conversation */
  getNextSequence(conversationId: string): Promise<number>;
}
