"use client";

/** React hook for managing the composer attachment queue. */

import { useState, useCallback, useRef } from "react";
import type { ComposerAttachment } from "./attachment-types";
import { uploadAttachment, type UploadAttachmentInput } from "./attachment-upload-client";

export type UseAttachmentQueueReturn = {
  attachments: ComposerAttachment[];
  isUploading: boolean;
  addAttachment: (input: UploadAttachmentInput) => Promise<void>;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  readyAttachments: ComposerAttachment[];
  hasImageAttachments: boolean;
};

export function useAttachmentQueue(): UseAttachmentQueueReturn {
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const uploadingRef = useRef(false);

  const isUploading = attachments.some((a) => a.status === "uploading");
  const readyAttachments = attachments.filter((a) => a.status === "ready");
  const hasImageAttachments = readyAttachments.some((a) => a.kind === "image");

  const addAttachment = useCallback(async (input: UploadAttachmentInput) => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;

    // Add optimistic placeholder
    const optimistic: ComposerAttachment = {
      id: `att_${Date.now()}`,
      kind: "unknown",
      filename: input.file.name,
      mimeType: input.file.type,
      size: input.file.size,
      source: "local_upload",
      status: "uploading",
      createdAt: new Date().toISOString(),
    };

    setAttachments((prev) => [...prev, optimistic]);

    const result = await uploadAttachment(input);

    setAttachments((prev) =>
      prev.map((a) => {
        if (a.id === optimistic.id) {
          if (result.ok) {
            return result.attachment;
          }
          return { ...a, status: "failed" as const };
        }
        return a;
      }),
    );

    uploadingRef.current = false;
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  return {
    attachments,
    isUploading,
    addAttachment,
    removeAttachment,
    clearAttachments,
    readyAttachments,
    hasImageAttachments,
  };
}
