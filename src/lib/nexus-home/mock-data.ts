import { GlobalConversation, NexusModel, WalletBalance, WorkspaceShortcut } from './types';

export const mockWallet: WalletBalance = {
  credits: 12450,
  state: 'ready',
  monthlyGrant: 5000,
};

export const mockModels: NexusModel[] = [
  { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', estimatedCredits: '8–14 credits', enabled: true },
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', estimatedCredits: '20–40 credits', enabled: true },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', estimatedCredits: '10–18 credits', enabled: true },
];

export const mockRecentChats: GlobalConversation[] = [
  { id: 'commercial-launch', title: 'Commercial launch checklist' },
  { id: 'wallet-gate', title: 'Wallet credit gate review' },
  { id: 's7-import', title: 'Workspace import contract' },
  { id: 'catalog-drift', title: 'Model catalog drift check' },
];

export const mockWorkspaces: WorkspaceShortcut[] = [
  { id: 'ops', name: 'NEXUS Ops' },
  { id: 'commercial', name: 'Commercial Build' },
  { id: 'research', name: 'Research Hub' },
];

export const intentChips = [
  'Draft strategy',
  'Analyze files',
  'Create artifact',
  'Plan workflow',
  'Import to workspace',
];
