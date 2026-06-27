/**
 * NEXUS Feature API — Attachments
 *
 * Feature-level API client for attachment upload and retrieval.
 * Wraps the existing composer-attachments infrastructure.
 *
 * Window components use this — NOT fetch() directly, NOT Supabase directly.
 *
 * @module features/attachments
 */

"use client";

import {
  uploadAttachment as coreUpload,
  deleteAttachment as coreDelete,
  getAttachmentSignedUrl as coreGetUrl,
} from "@/features/composer-attachments/shared/attachment-upload-client";
import { validateAttachment } from "@/features/composer-attachments/shared/attachment-validation";
import { resolveAttachmentKind } from "@/features/composer-attachments/shared/attachment-types";
import type { ComposerAttachment } from "@/features/composer-attachments/shared/attachment-types";
import type { ComposerAttachmentReference } from "@/features/composer-attachments/shared/attachment-types";

// ── Re-export types ────────────────────────────────────────────────

export type {
  ComposerAttachment,
  ComposerAttachmentReference,
  ComposerAttachmentKind,
  ComposerAttachmentStatus,
  ComposerAttachmentSource,
} from "@/features/composer-attachments/shared/attachment-types";

// ── API ────────────────────────────────────────────────────────────

export const attachmentApi = {
  /**
   * Upload a file as an attachment.
   * Returns the attachment record or an error.
   */
  async upload(params: {
    file: File;
    scope: "global-chat" | "workspace";
    workspaceId?: string;
  }): Promise<{ ok: true; attachment: ComposerAttachment } | { ok: false; error: string }> {
    return coreUpload({
      file: params.file,
      scope: params.scope,
      workspaceId: params.workspaceId,
    });
  },

  /**
   * Delete an attachment by ID.
   */
  async delete(attachmentId: string): Promise<boolean> {
    return coreDelete(attachmentId);
  },

  /**
   * Get a fresh signed URL for an attachment.
   */
  async getSignedUrl(attachmentId: string): Promise<string | null> {
    return coreGetUrl(attachmentId);
  },

  /**
   * Validate a file before upload (client-side only).
   */
  validate(file: File): { ok: true } | { ok: false; error: { code: string; message: string } } {
    return validateAttachment(file);
  },

  /**
   * Resolve the attachment kind from a MIME type.
   */
  resolveKind(mimeType: string): string {
    return resolveAttachmentKind(mimeType);
  },
};

/**
 * Build attachment references for sending in a message payload.
 */
export function buildAttachmentReferences(
  attachments: ComposerAttachment[],
): ComposerAttachmentReference[] {
  return attachments
    .filter((a) => a.status === "ready")
    .map((a) => ({
      id: a.id,
      kind: a.kind,
      filename: a.filename,
      mimeType: a.mimeType,
      storageKey: a.storageKey ?? a.signedUrl,
    }));
}

/**
 * Format file size for display.
 */
export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if an attachment is an image (for preview).
 */
export function isImageAttachment(attachment: ComposerAttachment): boolean {
  return attachment.kind === "image" || attachment.mimeType.startsWith("image/");
}
