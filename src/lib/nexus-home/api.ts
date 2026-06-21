import {
  GlobalConversation,
  GlobalMessage,
  ImportToWorkspaceInput,
  ImportToWorkspaceResult,
  InsufficientCreditsError,
  NexusModel,
  SendGlobalMessageInput,
  SendGlobalMessageResult,
  WalletBalance,
  WorkspaceShortcut,
} from './types';

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || `Request failed: ${response.status}` };
  }

  if (response.status === 402) {
    throw new InsufficientCreditsError(data ?? {});
  }

  if (!response.ok) {
    throw new Error(data?.error ?? data?.message ?? `Request failed: ${response.status}`);
  }

  return data as T;
}

/**
 * NEXUS Home API adapter — maps visual components to actual backend routes.
 *
 * Route mapping:
 *   adapter default          → actual backend route
 *   /api/global-conversations → GET /api/global-chats
 *   /api/imports              → POST /api/imports (S-7 exact match)
 *   /api/models               → GET /api/models (S-9A real)
 *   /api/workspaces           → GET /api/workspaces (S-9A real)
 *   /api/wallet/balance       → GET /api/wallet/balance (S-9A real)
 */
export const nexusHomeApi = {
  async listGlobalConversations(): Promise<GlobalConversation[]> {
    const data = await requestJson<{ chats?: GlobalConversation[] }>('/api/global-chats');
    return (data as any).chats ?? (Array.isArray(data) ? data : []);
  },

  createGlobalConversation(input?: { title?: string }): Promise<GlobalConversation> {
    return requestJson<GlobalConversation>('/api/global-chat', {
      method: 'POST',
      body: JSON.stringify({ message: '', ...(input ?? {}) }),
    }).then((data: any) => data.conversation ?? data);
  },

  async listGlobalMessages(conversationId: string): Promise<GlobalMessage[]> {
    const data = await requestJson<{ conversation?: { messages?: GlobalMessage[] } }>(
      `/api/global-chats/${conversationId}`,
    );
    return (data as any).conversation?.messages ?? (Array.isArray(data) ? data : []);
  },

  async sendGlobalMessage(input: SendGlobalMessageInput): Promise<SendGlobalMessageResult> {
    const data = await requestJson<any>('/api/global-chat', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: input.conversationId,
        message: input.content,
        modelId: input.modelId,
      }),
    });
    const conv = data.conversation ?? data;
    const msgs = conv.messages ?? [];
    const assistantMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
    const userMsg = msgs.length > 1 ? msgs[msgs.length - 2] : undefined;

    return {
      conversationId: conv.id ?? input.conversationId ?? 'new',
      userMessage: userMsg ? { ...userMsg, conversationId: conv.id } : undefined,
      assistantMessage: assistantMsg ? { ...assistantMsg, conversationId: conv.id } : undefined,
    };
  },

  getWalletBalance(): Promise<WalletBalance> {
    return requestJson<WalletBalance>('/api/wallet/balance');
  },

  listModels(): Promise<NexusModel[]> {
    return requestJson<NexusModel[]>('/api/models');
  },

  listWorkspaces(): Promise<WorkspaceShortcut[]> {
    return requestJson<WorkspaceShortcut[]>('/api/workspaces');
  },

  importToWorkspace(input: ImportToWorkspaceInput): Promise<ImportToWorkspaceResult> {
    return requestJson<ImportToWorkspaceResult>('/api/imports', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: input.workspaceId,
        sourceConversationId: input.sourceConversationId,
        messageIds: input.sourceMessageId ? [input.sourceMessageId] : undefined,
        title: input.title,
        importType: input.importType,
      }),
    });
  },
};
