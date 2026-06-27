/**
 * NEXUS Window OS — Notes Toolbar
 *
 * Toolbar for the Notes editor: save, delete, open library, attach resource.
 *
 * @module features/notes
 */

"use client";

import { Save, Loader2, Trash2, FolderOpen, Link2 } from "lucide-react";
import { useWindowStore } from "@/kernel/window/window-store";
import { getWindowApp } from "@/kernel/window/window-registry";

export function NotesToolbar({
  updatedAt,
  selectedNoteId,
  saving,
  onSave,
  onDelete,
}: {
  updatedAt: string | null;
  selectedNoteId: string | null;
  saving: boolean;
  onSave: () => void;
  onDelete: () => void;
}) {
  const openWindow = useWindowStore((s) => s.openWindow);

  const handleOpenArtifactLibrary = () => {
    const appDef = getWindowApp("artifact-library");
    if (!appDef) return;
    openWindow({
      kind: "artifact-library",
      title: appDef.title,
      scope: appDef.scope,
      defaultSize: appDef.defaultSize,
      singleton: appDef.singleton,
    });
  };

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 shrink-0">
      <span className="text-[10px] text-white/20">
        {updatedAt
          ? `Updated ${new Date(updatedAt).toLocaleString()}`
          : ""}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/30 hover:text-white/60 transition-colors rounded"
          onClick={handleOpenArtifactLibrary}
          title="Open Artifact Library"
        >
          <FolderOpen className="w-3 h-3" />
          <span className="hidden sm:inline">Library</span>
        </button>
        <button
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/30 hover:text-white/60 transition-colors rounded"
          onClick={onSave}
          disabled={saving}
          title="Save note"
        >
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">Save</span>
        </button>
        {selectedNoteId && (
          <button
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-400/40 hover:text-red-400 transition-colors rounded"
            onClick={onDelete}
            title="Delete note"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
