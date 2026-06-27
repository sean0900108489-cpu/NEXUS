/**
 * NEXUS Feature API — Global User
 *
 * Feature-level API client for account-level data:
 * wallet balance, available models, workspace shortcuts.
 *
 * Window components should use this API — NOT call fetch() directly,
 * NOT access Supabase directly.
 *
 * @module features/global-user/global-user-api
 */

import { nexusHomeApi } from "@/lib/nexus-home/api";
import type {
  NexusModel,
  WalletBalance,
  WorkspaceShortcut,
} from "@/lib/nexus-home/types";

// ── Types ──────────────────────────────────────────────────────────

export type { NexusModel, WalletBalance, WorkspaceShortcut };

export type AccountSummary = {
  wallet: WalletBalance | null;
  models: NexusModel[];
  workspaces: WorkspaceShortcut[];
  authenticated: boolean;
};

// ── API ────────────────────────────────────────────────────────────

export const globalUserApi = {
  /**
   * Fetch the user's wallet balance.
   */
  async getWallet(): Promise<WalletBalance> {
    return nexusHomeApi.getWalletBalance();
  },

  /**
   * List available AI models.
   */
  async listModels(): Promise<NexusModel[]> {
    return nexusHomeApi.listModels();
  },

  /**
   * List user's workspace shortcuts.
   */
  async listWorkspaces(): Promise<WorkspaceShortcut[]> {
    return nexusHomeApi.listWorkspaces();
  },

  /**
   * Fetch all account data in parallel.
   * Returns null wallet/models/workspaces if unauthenticated.
   */
  async getAccountSummary(): Promise<AccountSummary> {
    const [walletResult, modelsResult, workspacesResult] =
      await Promise.allSettled([
        nexusHomeApi.getWalletBalance(),
        nexusHomeApi.listModels(),
        nexusHomeApi.listWorkspaces(),
      ]);

    const all401 = [walletResult, modelsResult, workspacesResult].every(
      (r) => r.status === "rejected" && (r.reason as { status?: number })?.status === 401,
    );

    if (all401) {
      return {
        wallet: null,
        models: [],
        workspaces: [],
        authenticated: false,
      };
    }

    return {
      wallet: walletResult.status === "fulfilled" ? walletResult.value : null,
      models: modelsResult.status === "fulfilled" ? modelsResult.value : [],
      workspaces:
        workspacesResult.status === "fulfilled" ? workspacesResult.value : [],
      authenticated: true,
    };
  },
};
