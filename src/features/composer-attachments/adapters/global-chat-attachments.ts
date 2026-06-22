/** Global Chat attachment adapter — wires shared attachment core to Global Chat message flow. */

import type { ComposerAttachment } from "../shared/attachment-types";
import type { ComposerAttachmentReference } from "../shared/attachment-types";

/** Build attachment references for Global Chat message payload. */
export function buildGlobalChatAttachmentReferences(
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

/** Scope path prefix for Global Chat Supabase Storage uploads. */
export function buildGlobalChatStoragePath(userId: string, attachmentId: string, filename: string): string {
  return `${userId}/global-chat/${attachmentId}/${filename}`;
}
