/** Client and server-side attachment validation. */

export const ALLOWED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ALLOWED_TEXT_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/xml",
] as const;

export const ALLOWED_TABLE_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const UNSAFE_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
  ".sh", ".bash", ".zsh", ".csh", ".fish",
  ".dll", ".so", ".dylib",
  ".vbs", ".ps1", ".psm1", ".psd1",
  ".jar", ".class",
  ".app", ".apk", ".ipa",
  ".reg", ".hta", ".jse", ".wsf", ".wsh",
]);

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_TEXT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type AttachmentValidationError = {
  code: string;
  message: string;
};

export type AttachmentValidationResult =
  | { ok: true }
  | { ok: false; error: AttachmentValidationError };

/** Validate a file for upload. Checks MIME type, extension, and size. */
export function validateAttachment(file: { name: string; type: string; size: number }): AttachmentValidationResult {
  const ext = getExtension(file.name);
  const mimeType = file.type.toLowerCase() || "application/octet-stream";

  // Reject unsafe extensions
  if (UNSAFE_EXTENSIONS.has(ext.toLowerCase())) {
    return { ok: false, error: { code: "unsafe_file_type", message: `File type '${ext}' is not allowed for security reasons.` } };
  }

  // Determine category
  if (isImageMimeType(mimeType)) {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return { ok: false, error: { code: "image_too_large", message: `Image exceeds ${MAX_IMAGE_SIZE_BYTES / (1024*1024)}MB limit.` } };
    }
    return { ok: true };
  }

  if (isDocumentMimeType(mimeType)) {
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return { ok: false, error: { code: "document_too_large", message: `Document exceeds ${MAX_DOCUMENT_SIZE_BYTES / (1024*1024)}MB limit.` } };
    }
    return { ok: true };
  }

  if (isTextMimeType(mimeType) || isTableMimeType(mimeType)) {
    if (file.size > MAX_TEXT_SIZE_BYTES) {
      return { ok: false, error: { code: "text_too_large", message: `Text file exceeds ${MAX_TEXT_SIZE_BYTES / (1024*1024)}MB limit.` } };
    }
    return { ok: true };
  }

  // Unknown but not explicitly unsafe — allow with size cap
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return { ok: false, error: { code: "file_too_large", message: `File exceeds ${MAX_DOCUMENT_SIZE_BYTES / (1024*1024)}MB limit.` } };
  }

  return { ok: true };
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/") && ALLOWED_IMAGE_MIME_TYPES.some((t) => mimeType === t || mimeType.startsWith(t.replace("/*", "/")));
}

export function isDocumentMimeType(mimeType: string): boolean {
  return ALLOWED_DOCUMENT_MIME_TYPES.some((t) => mimeType === t);
}

export function isTextMimeType(mimeType: string): boolean {
  return ALLOWED_TEXT_MIME_TYPES.some((t) => mimeType === t) || mimeType.startsWith("text/");
}

export function isTableMimeType(mimeType: string): boolean {
  return ALLOWED_TABLE_MIME_TYPES.some((t) => mimeType === t);
}

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > -1 ? filename.slice(dot).toLowerCase() : "";
}

/** All MIME types allowed for upload (union of all categories). */
export const ALL_UPLOADABLE_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_DOCUMENT_MIME_TYPES,
  ...ALLOWED_TEXT_MIME_TYPES,
  ...ALLOWED_TABLE_MIME_TYPES,
] as const;
