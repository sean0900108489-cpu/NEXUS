/** Workspace attachment adapter — wires shared attachment core to Workspace message flow. */

import type { ComposerAttachment } from "../shared/attachment-types";
import type { ComposerAttachmentReference } from "../shared/attachment-types";

/** Build attachment references for Workspace message payload.
 *  Retains artifact/provenance metadata for workspace-specific handling. */
export function buildWorkspaceAttachmentReferences(
  attachments: ComposerAttachment[],
): ComposerAttachmentReference[] {
  return attachments
    .filter((a) => a.status === "ready")
    .map((a) => ({
      id: a.id,
      kind: a.kind,
      filename: a.filename,
      mimeType: a.mimeType,
      storageKey: a.signedUrl ?? a.storageKey,
    }));
}

/** Scope path prefix for Workspace Supabase Storage uploads. */
export function buildWorkspaceStoragePath(
  userId: string,
  workspaceId: string,
  attachmentId: string,
  filename: string,
): string {
  return `${userId}/workspace/${workspaceId}/${attachmentId}/${filename}`;
}
