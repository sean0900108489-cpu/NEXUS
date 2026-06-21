'use client';

import { useEffect, useMemo, useState } from 'react';
import { nexusHomeApi } from './api';
import { emptyModels, emptyRecentChats, emptyWallet, emptyWorkspaces } from './mock-data';
import { GlobalConversation, NexusModel, WalletBalance, WorkspaceShortcut } from './types';

type NexusHomeData = {
  loading: boolean;
  authenticated: boolean;
  wallet: WalletBalance;
  models: NexusModel[];
  selectedModelId: string;
  setSelectedModelId: (modelId: string) => void;
  recentChats: GlobalConversation[];
  workspaces: WorkspaceShortcut[];
  refreshRecentChats: () => Promise<void>;
};

/**
 * Home data hook with auth gate.
 *
 * Unauthenticated: empty state — no mock data, no fake conversations.
 * Authenticated: fetches real user data from backend API routes.
 * API 401 → treats as unauthenticated (empty state, not error crash).
 */
export function useNexusHomeData(): NexusHomeData {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [wallet, setWallet] = useState<WalletBalance>(emptyWallet);
  const [models, setModels] = useState<NexusModel[]>(emptyModels);
  const [recentChats, setRecentChats] = useState<GlobalConversation[]>(emptyRecentChats);
  const [workspaces, setWorkspaces] = useState<WorkspaceShortcut[]>(emptyWorkspaces);
  const [selectedModelId, setSelectedModelId] = useState('');

  async function refreshRecentChats() {
    if (!authenticated) return;
    try {
      const conversations = await nexusHomeApi.listGlobalConversations();
      setRecentChats(conversations);
    } catch {
      // Keep empty — no fake data fallback
    }
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const [walletResult, modelsResult, conversationsResult, workspacesResult] =
        await Promise.allSettled([
          nexusHomeApi.getWalletBalance(),
          nexusHomeApi.listModels(),
          nexusHomeApi.listGlobalConversations(),
          nexusHomeApi.listWorkspaces(),
        ]);

      if (!mounted) return;

      // Determine auth state: all 401 → unauthenticated
      const all401 = [walletResult, modelsResult, conversationsResult, workspacesResult].every(
        (r) => r.status === 'rejected' && r.reason?.status === 401,
      );

      if (all401) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);

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
      authenticated,
      wallet,
      models,
      selectedModelId,
      setSelectedModelId,
      recentChats,
      workspaces,
      refreshRecentChats,
    }),
    [loading, authenticated, wallet, models, selectedModelId, recentChats, workspaces],
  );
}
