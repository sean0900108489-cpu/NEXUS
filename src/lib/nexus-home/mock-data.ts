/**
 * NEXUS Home fallback data — intentionally empty/non-populated.
 *
 * These defaults are used ONLY when the user is not authenticated
 * or when backend APIs are unreachable. Never show owner/private data.
 */
import { GlobalConversation, NexusModel, WalletBalance, WorkspaceShortcut } from './types';

export const emptyWallet: WalletBalance = {
  credits: 0,
  state: 'empty',
};

export const emptyModels: NexusModel[] = [];

export const emptyRecentChats: GlobalConversation[] = [];

export const emptyWorkspaces: WorkspaceShortcut[] = [];

export const intentChips = [
  'Draft strategy',
  'Analyze files',
  'Create artifact',
  'Plan workflow',
  'Import to workspace',
];
