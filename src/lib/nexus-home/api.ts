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

type GlobalChatConversationPayload = {
  id?: string;
  messages?: GlobalMessage[];
};

type GlobalChatSendResponse =
  | GlobalChatConversationPayload
  | {
      conversation: GlobalChatConversationPayload | null;
    };

type CreateGlobalConversationResponse =
  | GlobalConversation
  | {
      conversation: GlobalConversation | null;
    };

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('content-type', headers.get('content-type') ?? 'application/json');

  if (!headers.has('Authorization')) {
    const accessToken = await resolveBrowserAccessToken();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || `Request failed: ${response.status}` };
  }

  // 401 → throw as unauthorized (caught by callers as unauthenticated)
  if (response.status === 401) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  if (response.status === 402) {
    throw new InsufficientCreditsError(
      isRecord(data) ? data : {},
    );
  }

  if (!response.ok) {
    const message = readResponseErrorMessage(data, response.status);
    throw Object.assign(new Error(message), { status: response.status });
  }

  return data as T;
}

function readResponseErrorMessage(data: unknown, status: number) {
  if (!isRecord(data)) {
    return `Request failed: ${status}`;
  }

  const error = data.error;

  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof data.message === 'string') {
    return data.message;
  }

  return `Request failed: ${status}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function unwrapCreatedConversation(data: CreateGlobalConversationResponse): GlobalConversation {
  if ('conversation' in data) {
    if (data.conversation) {
      return data.conversation;
    }

    throw new Error('Conversation was not returned.');
  }

  return data;
}

function unwrapGlobalChatConversation(data: GlobalChatSendResponse): GlobalChatConversationPayload {
  if ('conversation' in data) {
    return data.conversation ?? {};
  }

  return data;
}

async function resolveBrowserAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const { ensureNexusSupabaseClientConfigured, getNexusSupabaseClient } =
      await import('@/lib/supabase/client');

    await ensureNexusSupabaseClientConfigured();
    const { data } = await getNexusSupabaseClient().auth.getSession();

    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * NEXUS Home API adapter — maps visual components to actual backend routes.
 *
 * Route mapping:
 *   /api/global-conversations → GET /api/global-chats
 *   /api/imports              → POST /api/imports (S-7 exact match)
 *   /api/models               → GET /api/models (S-9A real)
 *   /api/workspaces           → GET /api/workspaces (S-9A real)
 *   /api/wallet/balance       → GET /api/wallet/balance (S-9A real)
 */
export const nexusHomeApi = {
  async listGlobalConversations(): Promise<GlobalConversation[]> {
    const data = await requestJson<{ chats?: GlobalConversation[] } | GlobalConversation[]>(
      '/api/global-chats',
    );
    return Array.isArray(data) ? data : data.chats ?? [];
  },

  createGlobalConversation(input?: { title?: string }): Promise<GlobalConversation> {
    return requestJson<CreateGlobalConversationResponse>('/api/global-chat', {
      method: 'POST',
      body: JSON.stringify({ message: '', ...(input ?? {}) }),
    }).then(unwrapCreatedConversation);
  },

  async listGlobalMessages(conversationId: string): Promise<GlobalMessage[]> {
    const data = await requestJson<
      { conversation?: { messages?: GlobalMessage[] } } | GlobalMessage[]
    >(
      `/api/global-chats/${conversationId}`,
    );
    return Array.isArray(data) ? data : data.conversation?.messages ?? [];
  },

  async sendGlobalMessage(input: SendGlobalMessageInput): Promise<SendGlobalMessageResult> {
    const data = await requestJson<GlobalChatSendResponse>('/api/global-chat', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: input.conversationId,
        message: input.content,
        modelId: input.modelId,
        attachments: input.attachments,
      }),
    });
    const conv = unwrapGlobalChatConversation(data);
    const conversationId = conv.id ?? input.conversationId ?? 'new';
    const msgs = conv.messages ?? [];
    const assistantMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
    const userMsg = msgs.length > 1 ? msgs[msgs.length - 2] : undefined;

    return {
      conversationId,
      userMessage: userMsg ? { ...userMsg, conversationId } : undefined,
      assistantMessage: assistantMsg ? { ...assistantMsg, conversationId } : undefined,
    };
  },

  getWalletBalance(): Promise<WalletBalance> {
    return requestJson<{ credits: number; state: string; lastTransactionId: string; updatedAt: string }>('/api/wallet/balance').then(d => ({ credits: d.credits, state: d.state as 'ready' | 'low' | 'empty' }));
  },

  listModels(): Promise<NexusModel[]> {
    return requestJson<{ models: NexusModel[] }>('/api/models').then(d => d.models);
  },

  listWorkspaces(): Promise<WorkspaceShortcut[]> {
    return requestJson<{ workspaces: WorkspaceShortcut[] }>('/api/workspaces').then(d => d.workspaces);
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
