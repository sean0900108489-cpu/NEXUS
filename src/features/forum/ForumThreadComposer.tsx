/**
 * NEXUS Window OS — Forum Thread Composer
 *
 * Create a new thread with title, body, and attachments.
 *
 * @module features/forum
 */

"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { GlobalChatAttachmentPicker } from "@/features/global-chat/GlobalChatAttachmentPicker";
import { GlobalChatAttachmentPreviewList } from "@/features/global-chat/GlobalChatAttachmentPreviewList";
import { attachmentApi } from "@/features/attachments/attachment-api";
import type { ComposerAttachment, ComposerAttachmentKind } from "@/features/attachments/attachment-api";
import { useNotificationStore } from "@/kernel/notifications/notification-store";

export function ForumThreadComposer({
  onSubmit,
  onCancel,
}: {
  onSubmit: (title: string, body: string, attachments: ComposerAttachment[]) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [items, setItems] = useState<Array<{ attachment: ComposerAttachment; file: File | null }>>([]);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const attachments = items.map((i) => i.attachment);
  const hasReadyAttachments = items.some((i) => i.attachment.status === "ready");
  const hasFailed = items.some((i) => i.attachment.status === "failed");

  const uploadFile = useCallback(async (file: File): Promise<ComposerAttachment> => {
    const optId = `local-${Date.now()}`;
    const optimistic: ComposerAttachment = {
      id: optId,
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
      addNotification({ type: "success", title: "Upload complete", message: file.name, autoDismissMs: 2000 });
      return result.attachment;
    }
    addNotification({ type: "error", title: "Upload failed", message: result.error, autoDismissMs: 4000 });
    return { ...optimistic, status: "failed" as const };
  }, [addNotification]);

  const handleFileSelect = useCallback(async (file: File) => {
    const validation = attachmentApi.validate(file);
    if (!validation.ok) {
      addNotification({ type: "warning", title: "Cannot upload", message: validation.error.message, autoDismissMs: 4000 });
      return;
    }
    const optimistic: ComposerAttachment = {
      id: `local-${Date.now()}`,
      kind: attachmentApi.resolveKind(file.type || "application/octet-stream") as ComposerAttachmentKind,
      filename: file.name, mimeType: file.type || "application/octet-stream",
      size: file.size, source: "local_upload", status: "uploading",
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, { attachment: optimistic, file }]);
    const result = await uploadFile(file);
    setItems((prev) => prev.map((i) => i.attachment.id === optimistic.id ? { attachment: result, file } : i));
  }, [addNotification, uploadFile]);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.attachment.id !== id));
  }, []);

  const handleSubmit = useCallback(() => {
    const ready = items.filter((i) => i.attachment.status === "ready").map((i) => i.attachment);
    if (!title.trim() && !body.trim()) return;
    onSubmit(title, body, ready);
  }, [title, body, items, onSubmit]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        <input
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20"
          placeholder="Thread title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full flex-1 min-h-[120px] bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 resize-none"
          placeholder="Write your post..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <GlobalChatAttachmentPreviewList attachments={attachments} onRemove={handleRemove} />
        {hasFailed && (
          <div className="text-[10px] text-yellow-400 bg-yellow-500/5 px-2 py-1 rounded">
            Some uploads failed.
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 p-3 border-t border-white/5">
        <GlobalChatAttachmentPicker onFileSelect={handleFileSelect} disabled={false} />
        <div className="flex-1" />
        <button className="px-2 py-1 text-xs text-white/30 hover:text-white/50 transition-colors" onClick={onCancel}>Cancel</button>
        <button
          className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-30"
          onClick={handleSubmit}
          disabled={!title.trim() && !body.trim()}
        >
          Post Thread
        </button>
      </div>
    </div>
  );
}
