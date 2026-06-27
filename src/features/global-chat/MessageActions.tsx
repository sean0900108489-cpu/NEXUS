/**
 * NEXUS Window OS — Global Chat Message Actions
 *
 * Per-message actions: Save as Note, Append to Current Note.
 * Uses current-note-store bridge — never touches notes API directly.
 *
 * @module features/global-chat
 */

"use client";

import { useCallback } from "react";
import { StickyNote, FilePlus } from "lucide-react";
import type { ChatMessage } from "./global-chat-api";
import { useCurrentNoteStore } from "@/features/notes/current-note-store";
import { useWindowStore } from "@/kernel/window/window-store";
import { getWindowApp } from "@/kernel/window/window-registry";
import { useNotificationStore } from "@/kernel/notifications/notification-store";
import { attachmentToResourceRef } from "@/kernel/resource/resource-actions";

export function MessageActions({ message }: { message: ChatMessage }) {
  const createNoteFromContent = useCurrentNoteStore((s) => s.createNoteFromContent);
  const appendContent = useCurrentNoteStore((s) => s.appendContentToCurrentNote);
  const currentNoteId = useCurrentNoteStore((s) => s.currentNoteId);
  const addResource = useCurrentNoteStore((s) => s.addResourceToCurrentNote);
  const openWindow = useWindowStore((s) => s.openWindow);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleSaveAsNote = useCallback(() => {
    // Build resource refs from message attachments
    const linkedResources = (message.attachments ?? []).map((att) =>
      attachmentToResourceRef(att),
    );

    const note = createNoteFromContent({
      title: message.content.slice(0, 40) || "Chat Note",
      content: message.content,
      linkedResources: linkedResources.length > 0 ? linkedResources : undefined,
    });

    if (!note) {
      addNotification({
        type: "error",
        title: "Failed to save note",
        message: "Could not create note from message.",
        autoDismissMs: 4000,
      });
      return;
    }

    addNotification({
      type: "success",
      title: "Saved as note",
      message: note.title,
      autoDismissMs: 3000,
    });

    // Open Notes window
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
  }, [message, createNoteFromContent, openWindow, addNotification]);

  const handleAppendToNote = useCallback(() => {
    if (!currentNoteId) {
      addNotification({
        type: "warning",
        title: "No active note",
        message: "Open or create a note first to append content.",
        autoDismissMs: 4000,
      });
      return;
    }

    const ok = appendContent(message.content);
    if (!ok) {
      addNotification({
        type: "error",
        title: "Failed to append",
        message: "Could not append content to the current note.",
        autoDismissMs: 4000,
      });
      return;
    }

    // Also add attachments as linked resources
    if (message.attachments?.length) {
      for (const att of message.attachments) {
        addResource(attachmentToResourceRef(att));
      }
    }

    addNotification({
      type: "success",
      title: "Appended to note",
      autoDismissMs: 2000,
    });
  }, [message, currentNoteId, appendContent, addResource, addNotification]);

  if (!message.content?.trim() && !message.attachments?.length) return null;

  return (
    <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
