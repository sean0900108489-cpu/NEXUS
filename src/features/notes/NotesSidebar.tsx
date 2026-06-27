/**
 * NEXUS Window OS — Notes Sidebar
 *
 * Note list with create button.
 *
 * @module features/notes
 */

"use client";

import { Plus, StickyNote } from "lucide-react";
import type { NexusNote } from "./notes-api";

export function NotesSidebar({
  notes,
  selectedNoteId,
  onSelect,
  onCreate,
}: {
  notes: NexusNote[];
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="w-48 sm:w-56 shrink-0 border-r border-white/5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Notes
        </span>
        <button
          className="text-white/40 hover:text-white transition-colors p-0.5"
          onClick={onCreate}
          title="New note"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {notes.map((note) => (
          <button
            key={note.id}
            className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
              selectedNoteId === note.id
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
            }`}
            onClick={() => onSelect(note.id)}
          >
            <div className="flex items-center gap-1.5">
              <StickyNote className="w-3 h-3 shrink-0" />
              <span className="truncate">{note.title || "Untitled"}</span>
            </div>
            <span className="text-[10px] text-white/15 mt-0.5 block">
              {new Date(note.updatedAt).toLocaleDateString()}
              {note.linkedResources.length > 0 &&
                ` · ${note.linkedResources.length} ref${note.linkedResources.length > 1 ? "s" : ""}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
