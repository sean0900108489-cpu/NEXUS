import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";

import type {
  GlobalChatRepository,
  GlobalConversation,
  GlobalConversationWithMessages,
  GlobalMessage,
  GlobalMessageRole,
  GlobalMessageUsage,
  RecentChatsResponse,
} from "./global-chat-types";

// ── InMemoryGlobalChatRepository (for tests) ───────────────────────

export class InMemoryGlobalChatRepository implements GlobalChatRepository {
  private readonly conversations = new Map<string, GlobalConversation>();
  private readonly messages = new Map<string, GlobalMessage[]>();

  async createConversation(input: {
    userId: string;
    title?: string;
    modelId?: string;
  }): Promise<GlobalConversation> {
    const id = makeId();
    const now = new Date().toISOString();
    const conv: GlobalConversation = {
      createdAt: now,
      id,
      importedAt: null,
      importedToWorkspaceId: null,
      lastMessageAt: null,
      messageCount: 0,
      modelId: input.modelId ?? null,
      title: input.title ?? "New Chat",
      updatedAt: now,
      userId: input.userId,
    };
    this.conversations.set(id, conv);
    this.messages.set(id, []);
    return { ...conv };
  }

  async getRecentChats(input: {
    userId: string;
    limit?: number;
    cursor?: string;
  }): Promise<RecentChatsResponse> {
    const limit = input.limit ?? 20;
    const all = [...this.conversations.values()]
      .filter((c) => c.userId === input.userId)
      .sort((a, b) => {
        const aTime = a.lastMessageAt ?? a.createdAt;
        const bTime = b.lastMessageAt ?? b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

    let startIdx = 0;
    if (input.cursor) {
      const cursorIdx = all.findIndex((c) => c.id === input.cursor);
      if (cursorIdx >= 0) startIdx = cursorIdx + 1;
    }

    const page = all.slice(startIdx, startIdx + limit);
    return {
      chats: page,
      hasMore: startIdx + limit < all.length,
      nextCursor: page.length > 0 && startIdx + limit < all.length
        ? page[page.length - 1].id
        : null,
    };
  }

  async getConversation(
    conversationId: string,
  ): Promise<GlobalConversationWithMessages | null> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return null;

    const msgs = this.messages.get(conversationId) ?? [];
    return {
      ...conv,
      messages: [...msgs].sort((a, b) => a.sequence - b.sequence),
    };
  }

  async addMessage(input: {
    conversationId: string;
    role: GlobalMessageRole;
    content: string;
    modelId?: string | null;
    usage?: GlobalMessageUsage | null;
    sequence: number;
  }): Promise<GlobalMessage> {
    const msg: GlobalMessage = {
      content: input.content,
      conversationId: input.conversationId,
      createdAt: new Date().toISOString(),
      id: makeId(),
      modelId: input.modelId ?? null,
      role: input.role,
      sequence: input.sequence,
      usage: input.usage ?? null,
    };

    const existing = this.messages.get(input.conversationId) ?? [];
    existing.push(msg);
    this.messages.set(input.conversationId, existing);

    return { ...msg };
  }

  async updateConversation(input: {
    conversationId: string;
    modelId?: string | null;
    messageCount: number;
    lastMessageAt: string;
    title?: string;
  }): Promise<GlobalConversation> {
    const conv = this.conversations.get(input.conversationId);
    if (!conv) throw new Error("Conversation not found");

    conv.lastMessageAt = input.lastMessageAt;
    conv.messageCount = input.messageCount;
    if (input.modelId !== undefined) conv.modelId = input.modelId;
    if (input.title !== undefined) conv.title = input.title;
    conv.updatedAt = new Date().toISOString();

    this.conversations.set(input.conversationId, conv);
    return { ...conv };
  }

  async deleteConversation(conversationId: string): Promise<void> {
    this.conversations.delete(conversationId);
    this.messages.delete(conversationId);
  }

  async getNextSequence(conversationId: string): Promise<number> {
    const msgs = this.messages.get(conversationId) ?? [];
    return msgs.length + 1;
  }

  all() { return [...this.conversations.values()]; }
  allMessages(conversationId: string) { return this.messages.get(conversationId) ?? []; }
  clear() { this.conversations.clear(); this.messages.clear(); }
}

// ── SupabaseGlobalChatRepository (for production) ─────────────────

export class SupabaseGlobalChatRepository implements GlobalChatRepository {
  async createConversation(input: {
    userId: string;
    title?: string;
    modelId?: string;
  }): Promise<GlobalConversation> {
    const client = getNexusSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await client
      .from("global_conversations")
      .insert({
        created_at: now,
        model_id: input.modelId ?? null,
        title: input.title ?? "New Chat",
        updated_at: now,
        user_id: input.userId,
      } as never)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const row = data as Record<string, unknown>;
    return mapConversation(row);
  }

  async getRecentChats(input: {
    userId: string;
    limit?: number;
    cursor?: string;
  }): Promise<RecentChatsResponse> {
    const client = getNexusSupabaseAdminClient();
    const limit = (input.limit ?? 20) + 1;

    let query = client
      .from("global_conversations")
      .select("*")
      .eq("user_id", input.userId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (input.cursor) {
      query = query.lt("id", input.cursor);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
    const hasMore = rows.length > (input.limit ?? 20);
    const page = rows.slice(0, input.limit ?? 20);

    return {
      chats: page.map(mapConversation),
      hasMore,
      nextCursor: hasMore && page.length > 0
        ? String(page[page.length - 1].id)
        : null,
    };
  }

  async getConversation(
    conversationId: string,
  ): Promise<GlobalConversationWithMessages | null> {
    const client = getNexusSupabaseAdminClient();

    const { data: conv, error: convErr } = await client
      .from("global_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (convErr) return null;

    const { data: msgs, error: msgErr } = await client
      .from("global_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("sequence", { ascending: true });

    if (msgErr) throw new Error(msgErr.message);

    const conversation = mapConversation(conv as Record<string, unknown>);
    const messages = (Array.isArray(msgs) ? msgs : []).map((m) =>
      mapMessage(m as Record<string, unknown>),
    );

    return { ...conversation, messages };
  }

  async addMessage(input: {
    conversationId: string;
    role: GlobalMessageRole;
    content: string;
    modelId?: string | null;
    usage?: GlobalMessageUsage | null;
    sequence: number;
  }): Promise<GlobalMessage> {
    const client = getNexusSupabaseAdminClient();

    const { data, error } = await client
      .from("global_messages")
      .insert({
        content: input.content,
        conversation_id: input.conversationId,
        created_at: new Date().toISOString(),
        model_id: input.modelId ?? null,
        role: input.role,
        sequence: input.sequence,
        usage: input.usage ?? null,
      } as never)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return mapMessage(data as Record<string, unknown>);
  }

  async updateConversation(input: {
    conversationId: string;
    modelId?: string | null;
    messageCount: number;
    lastMessageAt: string;
    title?: string;
  }): Promise<GlobalConversation> {
    const client = getNexusSupabaseAdminClient();

    const updates: Record<string, unknown> = {
      last_message_at: input.lastMessageAt,
      message_count: input.messageCount,
      updated_at: new Date().toISOString(),
    };
    if (input.modelId !== undefined) updates.model_id = input.modelId;
    if (input.title !== undefined) updates.title = input.title;

    const { data, error } = await client
      .from("global_conversations")
      .update(updates as never)
      .eq("id", input.conversationId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return mapConversation(data as Record<string, unknown>);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const client = getNexusSupabaseAdminClient();
    const { error } = await client
      .from("global_conversations")
      .delete()
      .eq("id", conversationId);
    if (error) throw new Error(error.message);
  }

  async getNextSequence(conversationId: string): Promise<number> {
    const client = getNexusSupabaseAdminClient();
    const { data, error } = await client
      .from("global_messages")
      .select("sequence")
      .eq("conversation_id", conversationId)
      .order("sequence", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) return 1;
    return Number((rows[0] as Record<string, unknown>).sequence ?? 0) + 1;
  }
}

// ── Factory ────────────────────────────────────────────────────────

const inMemoryGlobalChatRepository = new InMemoryGlobalChatRepository();

export function createGlobalChatRepository(): GlobalChatRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseGlobalChatRepository()
    : inMemoryGlobalChatRepository;
}

export function getInMemoryGlobalChatRepository() {
  return inMemoryGlobalChatRepository;
}

// ── Mappers ────────────────────────────────────────────────────────

function mapConversation(row: Record<string, unknown>): GlobalConversation {
  return {
    createdAt: String(row.created_at ?? ""),
    id: String(row.id ?? ""),
    importedAt: row.imported_at ? String(row.imported_at) : null,
    importedToWorkspaceId: row.imported_to_workspace_id
      ? String(row.imported_to_workspace_id)
      : null,
    lastMessageAt: row.last_message_at ? String(row.last_message_at) : null,
    messageCount: Number(row.message_count ?? 0),
    modelId: row.model_id ? String(row.model_id) : null,
    title: String(row.title ?? "New Chat"),
    updatedAt: String(row.updated_at ?? ""),
    userId: String(row.user_id ?? ""),
  };
}

function mapMessage(row: Record<string, unknown>): GlobalMessage {
  return {
    content: String(row.content ?? ""),
    conversationId: String(row.conversation_id ?? ""),
    createdAt: String(row.created_at ?? ""),
    id: String(row.id ?? ""),
    modelId: row.model_id ? String(row.model_id) : null,
    role: String(row.role ?? "user") as GlobalMessageRole,
    sequence: Number(row.sequence ?? 0),
    usage: row.usage
      ? (row.usage as GlobalMessageUsage)
      : null,
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `gchat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
