/**
 * NEXUS Window OS — Workspace Window App
 *
 * Workspace launcher window:
 * - Shows workspace name and details
 * - Provides "Open in Full View" button (opens /workspace/[id] in new tab)
 * - Shows workspace list with open actions
 *
 * This is a thin launcher — it does NOT embed NexusOps.
 * The full workspace experience lives at /workspace/[id].
 *
 * Strategy: Link-out wrapper (safest approach for Phase 2).
 * Phase 3+ can evolve this into a true embedded workspace window.
 *
 * @module features/workspace
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid,
  ExternalLink,
  Loader2,
  FolderOpen,
  ArrowUpRight,
} from "lucide-react";
import { workspaceApi } from "./workspace-api";
import type { WorkspaceShortcut } from "./workspace-api";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";

// ── Window App Component ──────────────────────────────────────────

export function WorkspaceWindow({
  window: win,
  setTitle,
  close,
}: NexusWindowAppProps) {
  const router = useRouter();
  const workspaceId = win.resourceId ?? win.workspaceId;
  const workspaceName =
    (win.state?.workspaceName as string) ?? workspaceId ?? "Workspace";

  const [workspaces, setWorkspaces] = useState<WorkspaceShortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(workspaceName);
  }, [workspaceName, setTitle]);

  useEffect(() => {
    let mounted = true;
    workspaceApi
      .listWorkspaces()
      .then((list) => {
        if (mounted) setWorkspaces(list);
      })
      .catch((err) => {
        if (mounted)
          setError(err instanceof Error ? err.message : "Failed to load workspaces");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // ── If we have a specific workspace ID, show its detail ─────

  if (workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <LayoutGrid className="w-10 h-10 text-white/10" />
        <div>
          <p className="text-sm font-medium text-white/70">{workspaceName}</p>
          <p className="text-xs text-white/30 mt-1">
            Workspace ID: {workspaceId.slice(0, 12)}...
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-md transition-colors"
            onClick={() => {
              window.open(
                workspaceApi.getWorkspaceUrl(workspaceId),
                "_blank",
              );
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Open in Full View
          </button>
          <button
            className="px-4 py-2 text-white/30 hover:text-white/50 text-sm transition-colors"
            onClick={close}
          >
            Close
          </button>
        </div>
        <p className="text-[10px] text-white/10 max-w-xs">
          Workspace opens in a dedicated page. Full desktop-integrated workspace
          is planned for Phase 3.
        </p>
      </div>
    );
  }

  // ── Workspace list view ───────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/20">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-red-400/60 p-4">
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Workspaces
        </span>
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-white/15">
          <FolderOpen className="w-8 h-8" />
          <p className="text-xs">No workspaces yet</p>
          <button
            className="mt-2 text-xs text-blue-400/60 hover:text-blue-400 transition-colors"
            onClick={() => router.push("/workspaces")}
          >
            Create a workspace →
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-md text-xs text-white/50 hover:text-white hover:bg-white/5 transition-colors group"
              onClick={() => {
                window.open(
                  workspaceApi.getWorkspaceUrl(ws.id),
                  "_blank",
                );
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-white/20" />
                <span className="truncate">{ws.name}</span>
              </div>
              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-2 border-t border-white/5 text-[10px] text-white/15 text-center">
        Click a workspace to open in full view
      </div>
    </div>
  );
}
