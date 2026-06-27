/**
 * NEXUS Window OS — Global Chat Composer
 *
 * Message input with attachment support:
 * - File picker + validation + upload
 * - Attachment lifecycle: queued → uploading → ready | failed
 * - Retry failed uploads (reuses stored File reference)
 * - Notification center integration for upload events
 * - Inline preview list with remove
 *
 * @module features/global-chat
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { GlobalChatAttachmentPicker } from "./GlobalChatAttachmentPicker";
import { GlobalChatAttachmentPreviewList } from "./GlobalChatAttachmentPreviewList";
import { attachmentApi } from "@/features/attachments/attachment-api";
import type { ComposerAttachment, ComposerAttachmentKind } from "@/features/attachments/attachment-api";
import { useNotificationStore } from "@/kernel/notifications/notification-store";

// ── Internal Attachment State ──────────────────────────────────────

type ComposerAttachItem = {
  /** The attachment record (status-driven) */
  attachment: ComposerAttachment;
  /** Original File reference, kept for retry */
  file: File | null;
};

// ── Component ──────────────────────────────────────────────────────

export function GlobalChatComposer({
  onSend,
  disabled,
  sending,
}: {
  onSend: (content: string, attachments: ComposerAttachment[]) => void;
  disabled: boolean;
  sending: boolean;
}) {
  const [value, setValue] = useState("");
  const [items, setItems] = useState<ComposerAttachItem[]>([]);
  const addNotification = useNotificationStore((s) => s.addNotification);

  // ── Build attachment list for sub-components ────────────

  const attachments = items.map((i) => i.attachment);

  // ── Upload a single file ────────────────────────────────

  const uploadFile = useCallback(
    async (file: File): Promise<ComposerAttachment> => {
      const optimisticId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const optimistic: ComposerAttachment = {
        id: optimisticId,
        kind: attachmentApi.resolveKind(file.type || "application/octet-stream") as ComposerAttachmentKind,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        source: "local_upload",
        status: "uploading",
        createdAt: new Date().toISOString(),
      };

      const result = await attachmentApi.upload({ file, scope: "global-chat" });

      if (result.ok) {
        addNotification({
          type: "success",
          title: "Upload complete",
          message: file.name,
          autoDismissMs: 3000,
        });
        return result.attachment;
      }

      addNotification({
        type: "error",
        title: "Upload failed",
        message: result.error,
        autoDismissMs: 5000,
      });
      return { ...optimistic, status: "failed" as const };
    },
    [addNotification],
  );

  // ── Handle file selection ───────────────────────────────

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate
      const validation = attachmentApi.validate(file);
      if (!validation.ok) {
        const errorMsg = validation.error.message;

        // Classify for notification
        const isSizeError =
          validation.error.code === "image_too_large" ||
          validation.error.code === "document_too_large" ||
          validation.error.code === "text_too_large" ||
          validation.error.code === "file_too_large";

        const isTypeError = validation.error.code === "unsafe_file_type";

        addNotification({
          type: "warning",
          title: isSizeError ? "File too large" : isTypeError ? "Unsupported file type" : "Cannot upload",
          message: errorMsg,
          autoDismissMs: 6000,
        });
        return;
      }

      // Create optimistic entry with File ref
      const optimistic: ComposerAttachment = {
        id: `local-${Date.now()}`,
        kind: attachmentApi.resolveKind(file.type || "application/octet-stream") as ComposerAttachmentKind,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        source: "local_upload",
        status: "uploading",
        createdAt: new Date().toISOString(),
      };

      setItems((prev) => [
        ...prev,
        { attachment: optimistic, file },
      ]);

      const result = await uploadFile(file);

      setItems((prev) =>
        prev.map((item) =>
          item.attachment.id === optimistic.id
            ? { attachment: result, file }
            : item,
        ),
      );
    },
    [addNotification, uploadFile],
  );

  // ── Retry failed upload ─────────────────────────────────

  const handleRetry = useCallback(
    async (attachmentId: string) => {
      const item = items.find((i) => i.attachment.id === attachmentId);
      if (!item?.file) {
        addNotification({
          type: "warning",
          title: "Cannot retry",
          message: "Original file is no longer available. Please re-select the file.",
          autoDismissMs: 5000,
        });
        // Remove the failed attachment since it can't be retried
        setItems((prev) => prev.filter((i) => i.attachment.id !== attachmentId));
        return;
      }

      // Set status back to uploading
      setItems((prev) =>
        prev.map((i) =>
          i.attachment.id === attachmentId
            ? { ...i, attachment: { ...i.attachment, status: "uploading" as const } }
            : i,
        ),
      );

      const result = await uploadFile(item.file);

      setItems((prev) =>
        prev.map((i) =>
          i.attachment.id === attachmentId
            ? { ...i, attachment: result }
            : i,
        ),
      );
    },
    [items, addNotification, uploadFile],
  );

  // ── Remove attachment ───────────────────────────────────

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.attachment.id !== id));
  }, []);

  // ── Submit ──────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    const readyAttachments = items
      .filter((i) => i.attachment.status === "ready")
      .map((i) => i.attachment);
    const hasContent = trimmed.length > 0;
    const hasReadyAttachments = readyAttachments.length > 0;

    if ((!hasContent && !hasReadyAttachments) || disabled || sending) return;

    onSend(trimmed, readyAttachments);
    setValue("");
    setItems([]);
  }, [value, disabled, sending, items, onSend]);

  // ── Derived state ───────────────────────────────────────

  const hasReadyAttachments = items.some((i) => i.attachment.status === "ready");
  const hasUploading = items.some((i) => i.attachment.status === "uploading");
  const hasFailed = items.some((i) => i.attachment.status === "failed");

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="shrink-0 border-t border-white/5 bg-white/[0.02]">
      {/* Attachment preview list */}
      <GlobalChatAttachmentPreviewList
        attachments={attachments}
        onRemove={handleRemove}
        onRetry={handleRetry}
      />

      {/* Upload status banner */}
      {hasFailed && (
        <div className="px-3 py-1 text-[10px] text-yellow-400 bg-yellow-500/5 flex items-center gap-2">
          <span>Some uploads failed. Click the attachment to retry.</span>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2 p-3">
        <GlobalChatAttachmentPicker
          onFileSelect={handleFileSelect}
          disabled={disabled || sending}
        />

        <input
          className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 disabled:opacity-30"
          placeholder={
            sending
              ? "Sending..."
              : hasUploading
                ? "Uploading..."
                : "Type a message..."
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={disabled || sending}
        />

        <button
          className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-30 flex items-center gap-1.5"
          onClick={handleSubmit}
          disabled={disabled || (!value.trim() && !hasReadyAttachments) || sending}
        >
          {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {sending ? "Sending" : "Send"}
        </button>
      </div>
    </div>
  );
}
