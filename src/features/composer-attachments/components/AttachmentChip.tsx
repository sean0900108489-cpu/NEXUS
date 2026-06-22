"use client";

import { FileUp, Image, FileText, X } from "lucide-react";
import type { ComposerAttachment } from "../shared/attachment-types";
import { cx } from "@/components/nexus/nexus-utils";

type AttachmentChipProps = {
  attachment: ComposerAttachment;
  onRemove: (id: string) => void;
  onInsertAsText?: (id: string) => void;
  showInsertAsText?: boolean;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function AttachmentChip({ attachment, onRemove, onInsertAsText, showInsertAsText }: AttachmentChipProps) {
  const Icon = attachment.kind === "image" ? Image : attachment.kind === "text" ? FileText : FileUp;

  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em]",
        attachment.status === "ready" && "border-neutral-300/30 bg-neutral-300/10 text-neutral-100",
        attachment.status === "uploading" && "border-white/15 bg-white/[0.045] text-neutral-200",
        attachment.status === "failed" && "border-red-300/30 bg-red-500/10 text-red-200",
      )}
      title={attachment.status === "failed" ? "Upload failed" : `${attachment.filename} - ${formatFileSize(attachment.size)}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="max-w-[180px] truncate">{attachment.filename}</span>
      <span className="text-neutral-500">
        {attachment.status === "ready" ? "ready" : attachment.status === "uploading" ? "uploading" : "failed"}
      </span>
      {showInsertAsText && attachment.status === "ready" && attachment.kind === "text" ? (
        <button
          aria-label={`Insert ${attachment.filename} as text`}
          className="ml-0.5 grid h-4 w-4 place-items-center rounded-full text-neutral-400 transition hover:text-neutral-100"
          onClick={() => onInsertAsText?.(attachment.id)}
          type="button"
        >
          <FileText className="h-2.5 w-2.5" />
        </button>
      ) : null}
      <button
        aria-label={`Remove ${attachment.filename}`}
        className="grid h-4 w-4 place-items-center rounded-full text-neutral-400 transition hover:text-neutral-100"
        onClick={() => onRemove(attachment.id)}
        type="button"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
