/**
 * NEXUS Window OS — Global Chat Attachment Preview List
 *
 * Shows selected attachments before sending.
 * Supports remove and retry actions.
 *
 * @module features/global-chat
 */

"use client";

import { AttachmentPreviewCard } from "@/features/attachments/AttachmentPreviewCard";
import type { ComposerAttachment } from "@/features/attachments/attachment-api";

export function GlobalChatAttachmentPreviewList({
  attachments,
  onRemove,
  onRetry,
}: {
  attachments: ComposerAttachment[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 border-t border-white/5 bg-white/[0.01]">
      {attachments.map((att) => (
        <div key={att.id} className="max-w-[200px]">
          <AttachmentPreviewCard
            attachment={att}
            onRemove={() => onRemove(att.id)}
            onRetry={onRetry ? () => onRetry(att.id) : undefined}
            compact
          />
        </div>
      ))}
    </div>
  );
}
