/**
 * NEXUS Window OS — Global User Window App (orchestrator)
 *
 * Account overview orchestrator.
 * All panels are delegated to sub-components.
 * All data access goes through globalUserApi.
 *
 * Panels:
 *   AccountSummaryPanel     — user identity
 *   WalletSummaryPanel      — wallet balance
 *   ModelStatusPanel        — available models
 *   WorkspaceLauncherPanel  — workspace list + launch
 *   SettingsPlaceholderPanel — settings links
 *
 * @module features/global-user
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { globalUserApi } from "./global-user-api";
import type {
  WalletBalance,
  NexusModel,
  WorkspaceShortcut,
} from "./global-user-api";
import { AccountSummaryPanel } from "./AccountSummaryPanel";
import { WalletSummaryPanel } from "./WalletSummaryPanel";
import { ModelStatusPanel } from "./ModelStatusPanel";
import { WorkspaceLauncherPanel } from "./WorkspaceLauncherPanel";
import { SettingsPlaceholderPanel } from "./SettingsPlaceholderPanel";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";
import { useWindowStore } from "@/kernel/window/window-store";
import { getWindowApp } from "@/kernel/window/window-registry";

// ── Component ──────────────────────────────────────────────────────

export function GlobalUserWindow({ setTitle }: NexusWindowAppProps) {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [models, setModels] = useState<NexusModel[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceShortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openWindow = useWindowStore((s) => s.openWindow);

  useEffect(() => {
    setTitle("My Account");
  }, [setTitle]);

  // ── Data Fetch ──────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const [walletResult, modelsResult, workspacesResult] =
        await Promise.allSettled([
          globalUserApi.getWallet(),
          globalUserApi.listModels(),
          globalUserApi.listWorkspaces(),
        ]);

      if (!mounted) return;

      const newErrors: Record<string, string> = {};

      if (walletResult.status === "fulfilled") setWallet(walletResult.value);
      else newErrors.wallet = extractError(walletResult.reason);

      if (modelsResult.status === "fulfilled") setModels(modelsResult.value);
      else newErrors.models = extractError(modelsResult.reason);

      if (workspacesResult.status === "fulfilled") setWorkspaces(workspacesResult.value);
      else newErrors.workspaces = extractError(workspacesResult.reason);

      setErrors(newErrors);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // ── Workspace Launch ────────────────────────────────────

  const handleOpenWorkspace = useCallback(
    (ws: WorkspaceShortcut) => {
      const appDef = getWindowApp("workspace");
      if (!appDef) return;

      openWindow({
        kind: "workspace",
        title: ws.name,
        scope: "workspace",
        defaultSize: appDef.defaultSize,
        resourceId: ws.id,
        workspaceId: ws.id,
        state: { workspaceName: ws.name },
      });
    },
    [openWindow],
  );

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      <WalletSummaryPanel
        balance={wallet}
        loading={loading && !wallet}
        error={errors.wallet ?? null}
      />
      <ModelStatusPanel
        models={models}
        loading={loading && models.length === 0}
        error={errors.models ?? null}
      />
      <WorkspaceLauncherPanel
        workspaces={workspaces}
        loading={loading && workspaces.length === 0}
        error={errors.workspaces ?? null}
        onOpenWorkspace={handleOpenWorkspace}
      />
      <SettingsPlaceholderPanel />
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function extractError(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Failed to load";
}
