"use client";

import type { ComposerAttachment } from "../shared/attachment-types";
import { AttachmentChip } from "./AttachmentChip";

type AttachmentPreviewTrayProps = {
  attachments: ComposerAttachment[];
  onRemove: (id: string) => void;
  onInsertAsText?: (id: string) => void;
  showInsertAsText?: boolean;
};

export function AttachmentPreviewTray({ attachments, onRemove, onInsertAsText, showInsertAsText }: AttachmentPreviewTrayProps) {
  if (!attachments.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 border-t border-white/10 px-3 py-2">
      {attachments.map((attachment) => (
        <AttachmentChip
          key={attachment.id}
          attachment={attachment}
          onRemove={onRemove}
          onInsertAsText={onInsertAsText}
          showInsertAsText={showInsertAsText}
        />
      ))}
    </div>
  );
}
