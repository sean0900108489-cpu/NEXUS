/**
 * NEXUS Window OS — Save To Note Button Primitive
 *
 * Uses current-note-store bridge only. Never accesses notes localStorage or
 * notes-api directly.
 *
 * @module features/interactions
 */

"use client";

import { FilePlus, StickyNote } from "lucide-react";
import { useCurrentNoteStore } from "@/features/notes/current-note-store";
import { useWindowStore } from "@/kernel/window/window-store";
import { getWindowApp } from "@/kernel/window/window-registry";
import { useNotificationStore } from "@/kernel/notifications/notification-store";
import type { NexusResourceRef } from "@/kernel/resource/resource-ref";

type SaveToNoteMode = "save" | "append";

export function SaveToNoteButton({
  mode,
  title,
  content,
  linkedResources,
  onSaved,
}: {
  mode: SaveToNoteMode;
  title?: string;
  content: string;
  linkedResources?: NexusResourceRef[];
  onSaved?: () => void;
}) {
  const currentNoteId = useCurrentNoteStore((s) => s.currentNoteId);
  const createNoteFromContent = useCurrentNoteStore((s) => s.createNoteFromContent);
  const appendContent = useCurrentNoteStore((s) => s.appendContentToCurrentNote);
  const addResource = useCurrentNoteStore((s) => s.addResourceToCurrentNote);
  const openWindow = useWindowStore((s) => s.openWindow);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleSave = () => {
    if (!content.trim() && !linkedResources?.length) return;

    if (mode === "save") {
      const note = createNoteFromContent({
        title,
        content,
        linkedResources,
      });

      if (!note) {
        addNotification({ type: "error", title: "Failed to save note", autoDismissMs: 4000 });
        return;
      }

      const appDef = getWindowApp("notes");
      if (appDef) {
        openWindow({
          kind: "notes",
          title: appDef.title,
          scope: appDef.scope,
          defaultSize: appDef.defaultSize,
          singleton: appDef.singleton,
        });
      }

      onSaved?.();
      addNotification({ type: "success", title: "Saved as note", message: note.title, autoDismissMs: 2500 });
      return;
    }

    if (!currentNoteId) {
      addNotification({ type: "warning", title: "No active note", message: "Open a note first.", autoDismissMs: 3500 });
      return;
    }

    if (!appendContent(content)) {
      addNotification({ type: "error", title: "Failed to append", autoDismissMs: 3500 });
      return;
    }

    for (const ref of linkedResources ?? []) {
      addResource(ref);
    }

    onSaved?.();
    addNotification({ type: "success", title: "Appended to note", autoDismissMs: 2200 });
  };

  const Icon = mode === "save" ? FilePlus : StickyNote;
  const label = mode === "save" ? "Save as Note" : "Append to Current Note";

  return (
    <button
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/40 transition-colors hover:bg-white/5 hover:text-white/75"
      onClick={(event) => {
        event.stopPropagation();
        handleSave();
      }}
      title={label}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{mode === "save" ? "Save" : "Append"}</span>
    </button>
  );
}
