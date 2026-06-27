/**
 * NEXUS Window OS — Workspace Launcher Panel
 *
 * Lists workspaces with inline open actions.
 * Clicking a workspace opens it as a window via the kernel store.
 *
 * @module features/global-user
 */

"use client";

import { useRouter } from "next/navigation";
import { FolderOpen, Loader2, ExternalLink, LayoutGrid } from "lucide-react";
import type { WorkspaceShortcut } from "./global-user-api";

type WorkspaceLauncherPanelProps = {
  workspaces: WorkspaceShortcut[];
  loading: boolean;
  error: string | null;
  onOpenWorkspace: (workspace: WorkspaceShortcut) => void;
};

export function WorkspaceLauncherPanel({
  workspaces,
  loading,
  error,
  onOpenWorkspace,
}: WorkspaceLauncherPanelProps) {
  const router = useRouter();

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3 text-white/60 text-xs font-medium uppercase tracking-wider">
        <FolderOpen className="w-3.5 h-3.5" />
        Workspaces
      </div>

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-white/30" />
      ) : error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : workspaces.length === 0 ? (
        <>
          <p className="text-xs text-white/20">No workspaces yet</p>
          <button
            className="mt-2 text-xs text-blue-400/60 hover:text-blue-400 transition-colors"
            onClick={() => router.push("/workspaces")}
          >
            Create your first workspace →
          </button>
        </>
      ) : (
        <>
          <div className="space-y-1">
            {workspaces.slice(0, 8).map((ws) => (
              <div key={ws.id} className="flex items-center gap-2 group">
                <button
                  className="flex items-center gap-2 flex-1 text-left text-xs text-white/50 hover:text-white/80 transition-colors min-w-0"
                  onClick={() => onOpenWorkspace(ws)}
                  title="Open in Desktop"
                >
                  <LayoutGrid className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="truncate">{ws.name}</span>
                </button>
                <button
                  className="text-white/15 hover:text-white/50 transition-colors shrink-0"
                  onClick={() => router.push(`/workspace/${ws.id}`)}
                  title="Open in full view"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <button
            className="mt-2 text-xs text-blue-400/60 hover:text-blue-400 transition-colors"
            onClick={() => router.push("/workspaces")}
          >
            View all → {workspaces.length}
          </button>
        </>
      )}
    </div>
  );
}
