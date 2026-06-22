/** Canonical composer attachment type shared across Global Chat and Workspace. */

export type ComposerAttachmentKind = "image" | "document" | "text" | "table" | "unknown";

export type ComposerAttachmentSource = "local_upload" | "artifact_vault" | "connector";

export type ComposerAttachmentStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "processing"
  | "ready"
  | "failed";

export type ComposerAttachment = {
  id: string;
  kind: ComposerAttachmentKind;
  filename: string;
  mimeType: string;
  size: number;
  source: ComposerAttachmentSource;
  status: ComposerAttachmentStatus;
  storageKey?: string;
  signedUrl?: string;
  artifactId?: string;
  previewUrl?: string;
  textExtract?: string;
  createdAt: string;
};

/** Lightweight reference sent in message payloads. */
export type ComposerAttachmentReference = {
  id: string;
  kind: ComposerAttachmentKind;
  filename: string;
  mimeType: string;
  storageKey?: string;
};

/** Resolve attachment kind from MIME type. */
export function resolveAttachmentKind(mimeType: string): ComposerAttachmentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf" || mimeType.includes("word") || mimeType.includes("document")) return "document";
  if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "text/csv") return "text";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") return "table";
  return "unknown";
}
