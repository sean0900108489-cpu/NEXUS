'use client';

import { useEffect, useMemo, useState } from 'react';
import { nexusHomeApi } from './api';
import { mockModels, mockRecentChats, mockWallet, mockWorkspaces } from './mock-data';
import { GlobalConversation, NexusModel, WalletBalance, WorkspaceShortcut } from './types';

type NexusHomeData = {
  loading: boolean;
  wallet: WalletBalance;
  models: NexusModel[];
  selectedModelId: string;
  setSelectedModelId: (modelId: string) => void;
  recentChats: GlobalConversation[];
  workspaces: WorkspaceShortcut[];
  refreshRecentChats: () => Promise<void>;
};

export function useNexusHomeData(): NexusHomeData {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletBalance>(mockWallet);
  const [models, setModels] = useState<NexusModel[]>(mockModels);
  const [recentChats, setRecentChats] = useState<GlobalConversation[]>(mockRecentChats);
  const [workspaces, setWorkspaces] = useState<WorkspaceShortcut[]>(mockWorkspaces);
  const [selectedModelId, setSelectedModelId] = useState(mockModels[0]?.id ?? '');

  async function refreshRecentChats() {
    try {
      const conversations = await nexusHomeApi.listGlobalConversations();
      setRecentChats(conversations);
    } catch {
      // Keep mock/fallback data for visual continuity; code agent should wire real error reporting if desired.
    }
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const [walletResult, modelsResult, conversationsResult, workspacesResult] = await Promise.allSettled([
        nexusHomeApi.getWalletBalance(),
        nexusHomeApi.listModels(),
        nexusHomeApi.listGlobalConversations(),
        nexusHomeApi.listWorkspaces(),
      ]);

      if (!mounted) return;

      if (walletResult.status === 'fulfilled') setWallet(walletResult.value);
      if (modelsResult.status === 'fulfilled' && modelsResult.value.length) {
        setModels(modelsResult.value);
        setSelectedModelId((current) => current || modelsResult.value[0].id);
      }
      if (conversationsResult.status === 'fulfilled') setRecentChats(conversationsResult.value);
      if (workspacesResult.status === 'fulfilled') setWorkspaces(workspacesResult.value);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return useMemo(
    () => ({
      loading,
      wallet,
      models,
      selectedModelId,
      setSelectedModelId,
      recentChats,
      workspaces,
      refreshRecentChats,
    }),
    [loading, wallet, models, selectedModelId, recentChats, workspaces],
  );
}
