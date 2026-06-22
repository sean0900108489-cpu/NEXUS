/** Client-side upload client for attachments. */

import type { ComposerAttachment, ComposerAttachmentSource } from "./attachment-types";
import { resolveAttachmentKind } from "./attachment-types";
import { validateAttachment } from "./attachment-validation";

export type UploadAttachmentInput = {
  file: File;
  scope: "global-chat" | "workspace";
  workspaceId?: string;
  source?: ComposerAttachmentSource;
};

export type UploadAttachmentResult =
  | { ok: true; attachment: ComposerAttachment }
  | { ok: false; error: string };

function makeId(prefix: string): string {
  return `${prefix}_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}

/** Upload a file as a composer attachment. Returns the attachment record. */
export async function uploadAttachment(input: UploadAttachmentInput): Promise<UploadAttachmentResult> {
  const validation = validateAttachment(input.file);
  if (!validation.ok) {
    return { ok: false, error: validation.error.message };
  }

  const attachmentId = makeId("att");
  const mimeType = input.file.type || "application/octet-stream";
  const kind = resolveAttachmentKind(mimeType);
  const now = new Date().toISOString();

  // Optimistic attachment record
  const optimistic: ComposerAttachment = {
    id: attachmentId,
    kind,
    filename: input.file.name,
    mimeType,
    size: input.file.size,
    source: input.source ?? "local_upload",
    status: "uploading",
    createdAt: now,
  };

  try {
    const formData = new FormData();
    formData.append("file", input.file);
    formData.append("scope", input.scope);
    if (input.workspaceId) {
      formData.append("workspaceId", input.workspaceId);
    }

    const response = await fetch("/api/attachments", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = body?.error?.message ?? `Upload failed with status ${response.status}`;
      return { ok: false, error: message };
    }

    const data = (await response.json()) as {
      attachment: {
        id: string;
        kind: string;
        filename: string;
        mimeType: string;
        size: number;
        source: string;
        storageKey: string;
        signedUrl?: string;
        previewUrl?: string;
        createdAt: string;
      };
    };

    return {
      ok: true,
      attachment: {
        ...optimistic,
        ...data.attachment,
        status: "ready",
        kind: (data.attachment.kind as ComposerAttachment["kind"]) ?? kind,
        source: (data.attachment.source as ComposerAttachmentSource) ?? optimistic.source,
      } satisfies ComposerAttachment,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return { ok: false, error: message };
  }
}

/** Delete an attachment by ID. */
export async function deleteAttachment(attachmentId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
    return response.ok;
  } catch {
    return false;
  }
}

/** Get a signed URL for an attachment. */
export async function getAttachmentSignedUrl(attachmentId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/attachments/${attachmentId}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { signedUrl?: string };
    return data.signedUrl ?? null;
  } catch {
    return null;
  }
}
