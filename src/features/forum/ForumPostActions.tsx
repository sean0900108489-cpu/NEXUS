/**
 * NEXUS Window OS — Forum Post Actions
 *
 * Per-post/reply actions: Save as Note, Append to Current Note.
 * Uses current-note-store bridge only.
 *
 * @module features/forum
 */

"use client";

import { useCallback } from "react";
import { StickyNote, FilePlus } from "lucide-react";
import { useCurrentNoteStore } from "@/features/notes/current-note-store";
import { useWindowStore } from "@/kernel/window/window-store";
import { getWindowApp } from "@/kernel/window/window-registry";
import { useNotificationStore } from "@/kernel/notifications/notification-store";
import type { NexusResourceRef } from "@/kernel/resource/resource-ref";

export function ForumPostActions({
  body,
  attachments,
}: {
  body: string;
  attachments: { type: string; id: string; label?: string; meta?: Record<string, unknown> }[];
}) {
  const createNoteFromContent = useCurrentNoteStore((s) => s.createNoteFromContent);
  const appendContent = useCurrentNoteStore((s) => s.appendContentToCurrentNote);
  const currentNoteId = useCurrentNoteStore((s) => s.currentNoteId);
  const addResource = useCurrentNoteStore((s) => s.addResourceToCurrentNote);
  const openWindow = useWindowStore((s) => s.openWindow);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleSaveAsNote = useCallback(() => {
    const resources: NexusResourceRef[] = attachments.map((att) => ({
      type: att.type as NexusResourceRef["type"],
      id: att.id,
      label: att.label,
      meta: att.meta,
    }));

    const note = createNoteFromContent({
      title: body.slice(0, 40) || "Forum Note",
      content: body,
      linkedResources: resources.length > 0 ? resources : undefined,
    });

    if (!note) {
      addNotification({ type: "error", title: "Failed to save note", autoDismissMs: 4000 });
      return;
    }

    addNotification({ type: "success", title: "Saved as note", message: note.title, autoDismissMs: 3000 });

    const appDef = getWindowApp("notes");
    if (appDef) {
      openWindow({
        kind: "notes", title: appDef.title, scope: appDef.scope,
        defaultSize: appDef.defaultSize, singleton: appDef.singleton,
      });
    }
  }, [body, attachments, createNoteFromContent, openWindow, addNotification]);

  const handleAppendToNote = useCallback(() => {
    if (!currentNoteId) {
      addNotification({ type: "warning", title: "No active note", message: "Open a note first.", autoDismissMs: 4000 });
      return;
    }

    const ok = appendContent(body);
    if (!ok) {
      addNotification({ type: "error", title: "Failed to append", autoDismissMs: 4000 });
      return;
    }

    for (const att of attachments) {
      addResource({ type: att.type as NexusResourceRef["type"], id: att.id, label: att.label, meta: att.meta });
    }

    addNotification({ type: "success", title: "Appended to note", autoDismissMs: 2000 });
  }, [body, attachments, currentNoteId, appendContent, addResource, addNotification]);

  if (!body?.trim() && !attachments?.length) return null;

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
        onClick={(e) => { e.stopPropagation(); handleSaveAsNote(); }}
        title="Save as Note"
      >
        <FilePlus className="w-3 h-3" />
        <span className="hidden sm:inline">Save as Note</span>
      </button>
      {currentNoteId && (
        <button
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
          onClick={(e) => { e.stopPropagation(); handleAppendToNote(); }}
          title="Append to Current Note"
        >
          <StickyNote className="w-3 h-3" />
          <span className="hidden sm:inline">Append</span>
        </button>
      )}
    </div>
  );
}
