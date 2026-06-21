export type NexusWalletState = 'ready' | 'low' | 'empty';

export type WalletBalance = {
  credits: number;
  state: NexusWalletState;
  monthlyGrant?: number;
  nextGrantAt?: string | null;
};

export type NexusModel = {
  id: string;
  label: string;
  provider?: string;
  estimatedCredits?: string;
  enabled?: boolean;
  cheaperAlternativeIds?: string[];
};

export type GlobalConversation = {
  id: string;
  title: string;
  updatedAt?: string;
};

export type GlobalMessage = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
  creditCost?: number | null;
};

export type WorkspaceShortcut = {
  id: string;
  name: string;
  updatedAt?: string;
};

export type SendGlobalMessageInput = {
  conversationId?: string;
  content: string;
  modelId: string;
};

export type SendGlobalMessageResult = {
  conversationId: string;
  userMessage?: GlobalMessage;
  assistantMessage?: GlobalMessage;
};

export type ImportToWorkspaceInput = {
  workspaceId: string;
  sourceConversationId: string;
  sourceMessageId?: string;
  title?: string;
  importType: 'artifact' | 'note' | 'task' | 'context_bundle';
};

export type ImportToWorkspaceResult = {
  workspaceId: string;
  importedId: string;
  importedType: string;
  workspaceUrl?: string;
};

export type InsufficientCreditsPayload = {
  requiredCredits?: number;
  currentBalance?: number;
  shortfall?: number;
  cheaperAlternatives?: NexusModel[];
};

export class InsufficientCreditsError extends Error {
  status = 402;
  payload: InsufficientCreditsPayload;

  constructor(payload: InsufficientCreditsPayload) {
    super('Insufficient credits');
    this.name = 'InsufficientCreditsError';
    this.payload = payload;
  }
}
