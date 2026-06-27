/**
 * NEXUS Window OS — Attachment Preview Card
 *
 * Shared component for displaying an attachment thumbnail/info.
 * Supports: remove, retry (for failed uploads), and image thumbnails.
 *
 * @module features/attachments
 */

"use client";

import { FileText, Image, File, X, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { formatAttachmentSize, isImageAttachment } from "./attachment-api";
import type { ComposerAttachment } from "./attachment-api";

// ── Component ──────────────────────────────────────────────────────

export function AttachmentPreviewCard({
  attachment,
  onRemove,
  onOpen,
  onRetry,
  compact = false,
}: {
  attachment: ComposerAttachment;
  onRemove?: () => void;
  onOpen?: () => void;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const isImage = isImageAttachment(attachment);
  const isFailed = attachment.status === "failed";
  const isUploading = attachment.status === "uploading" || attachment.status === "queued";

  return (
    <div
      className={`relative group flex items-center gap-2 rounded-md border transition-colors ${
        isFailed
          ? "border-yellow-500/30 bg-yellow-500/5"
          : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
      } ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
    >
      {/* Icon / Thumbnail */}
      <div className="shrink-0">
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white/30" />
        ) : isFailed ? (
          <AlertCircle className="w-4 h-4 text-yellow-400" />
        ) : isImage && attachment.signedUrl ? (
          <img
            src={attachment.signedUrl}
            alt={attachment.filename}
            className="w-8 h-8 rounded object-cover"
          />
        ) : isImage ? (
          <Image className="w-4 h-4 text-white/30" />
        ) : (
          <FileText className="w-4 h-4 text-white/30" />
        )}
      </div>

      {/* Info */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onOpen}
        title={onOpen ? "Click to preview" : undefined}
      >
        <p className={`text-xs truncate ${isFailed ? "text-yellow-300" : "text-white/70"}`}>
          {attachment.filename}
        </p>
        {!compact && (
          <p className="text-[10px] text-white/25 mt-0.5">
            {formatAttachmentSize(attachment.size)} · {attachment.mimeType || "unknown"}
            {isUploading && " · uploading..."}
            {isFailed && " · failed — click retry"}
          </p>
        )}
      </div>

      {/* Retry button (failed only) */}
      {isFailed && onRetry && (
        <button
          className="shrink-0 text-yellow-400/60 hover:text-yellow-400 transition-colors p-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          title="Retry upload"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Remove button */}
      {onRemove && (
        <button
          className="shrink-0 text-white/20 hover:text-red-400 transition-colors p-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove attachment"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
