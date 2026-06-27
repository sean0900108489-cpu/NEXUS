/**
 * NEXUS Window OS — Artifact Library Item Card
 *
 * Single item in the artifact grid.
 *
 * @module features/artifact-library
 */

"use client";

import {
  Image,
  FileText,
  Table2,
  File,
  Loader2,
  StickyNote,
} from "lucide-react";
import { formatAttachmentSize } from "@/features/attachments/attachment-api";
import type { ArtifactLibraryItem } from "./artifact-library-api";
import { useCurrentNoteStore } from "@/features/notes/current-note-store";
import { useNotificationStore } from "@/kernel/notifications/notification-store";
import { createResourceRef } from "@/kernel/resource/resource-ref";

// ── Icon Resolver ──────────────────────────────────────────────────

function itemIcon(item: ArtifactLibraryItem) {
  if (item.kind === "image" || item.mimeType.startsWith("image/")) {
    return <Image className="w-8 h-8 text-white/20" />;
  }
  if (item.kind === "table" || item.mimeType.includes("spreadsheet") || item.mimeType.includes("csv")) {
    return <Table2 className="w-8 h-8 text-white/20" />;
  }
  if (item.kind === "text" || item.kind === "document") {
    return <FileText className="w-8 h-8 text-white/20" />;
  }
  return <File className="w-8 h-8 text-white/20" />;
}

// ── Component ──────────────────────────────────────────────────────

export function ArtifactLibraryItemCard({
  item,
  thumbUrl,
  thumbLoading,
  onClick,
}: {
  item: ArtifactLibraryItem;
  thumbUrl: string | null;
  thumbLoading: boolean;
  onClick: () => void;
}) {
  const isImage = item.kind === "image" || item.mimeType.startsWith("image/");
  const addResource = useCurrentNoteStore((s) => s.addResourceToCurrentNote);
  const currentNoteId = useCurrentNoteStore((s) => s.currentNoteId);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleAddToNote = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!currentNoteId) {
      addNotification({
        type: "warning",
        title: "No active note",
        message: "Open or create a note first to attach resources.",
        autoDismissMs: 4000,
      });
      return;
    }

    const ref = createResourceRef("attachment", item.id, item.filename, {
      kind: item.kind,
      mimeType: item.mimeType,
    });

    const ok = addResource(ref);

    if (ok) {
      addNotification({
        type: "success",
        title: "Added to note",
        message: item.filename,
        autoDismissMs: 2500,
      });
    } else {
      addNotification({
        type: "info",
        title: "Already linked",
        message: `${item.filename} is already in the current note.`,
        autoDismissMs: 3000,
      });
    }
  };

  return (
    <button
      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left w-full group"
      onClick={onClick}
      title={`${item.filename}\n${item.mimeType} · ${formatAttachmentSize(item.size)}`}
    >
      {/* Thumbnail / Icon */}
      <div className="w-full aspect-square flex items-center justify-center rounded-md bg-white/[0.03] overflow-hidden">
        {isImage && thumbLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-white/15" />
        ) : isImage && thumbUrl ? (
          <img
            src={thumbUrl}
            alt={item.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          itemIcon(item)
        )}
      </div>

      {/* Info */}
      <div className="w-full min-w-0">
        <p className="text-xs text-white/70 truncate">{item.filename}</p>
        <p className="text-[10px] text-white/25 mt-0.5">
          {formatAttachmentSize(item.size)} · {item.scope}
        </p>
      </div>

      {/* Add to Note action */}
      <button
        className="w-full text-center text-[10px] text-white/20 hover:text-white/50 hover:bg-white/5 rounded py-1 transition-colors opacity-0 group-hover:opacity-100"
        onClick={handleAddToNote}
        title="Add to current note"
      >
        <span className="flex items-center justify-center gap-1">
          <StickyNote className="w-3 h-3" />
          Add to Note
        </span>
      </button>
    </button>
  );
}
