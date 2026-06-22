import { describe, it, expect } from "vitest";
import {
  validateAttachment,
  isImageMimeType,
  isDocumentMimeType,
  isTextMimeType,
  getExtension,
  UNSAFE_EXTENSIONS,
} from "./attachment-validation";

describe("getExtension", () => {
  it("returns the file extension", () => {
    expect(getExtension("photo.png")).toBe(".png");
    expect(getExtension("document.PDF")).toBe(".pdf");
    expect(getExtension("noextension")).toBe("");
    expect(getExtension(".hidden")).toBe(".hidden");
  });
});

describe("isImageMimeType", () => {
  it("accepts png, jpeg, webp", () => {
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("image/jpeg")).toBe(true);
    expect(isImageMimeType("image/webp")).toBe(true);
  });

  it("rejects gif and svg", () => {
    expect(isImageMimeType("image/gif")).toBe(false);
    expect(isImageMimeType("image/svg+xml")).toBe(false);
  });
});

describe("isDocumentMimeType", () => {
  it("accepts pdf and docx", () => {
    expect(isDocumentMimeType("application/pdf")).toBe(true);
    expect(isDocumentMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
  });
});

describe("isTextMimeType", () => {
  it("accepts text types", () => {
    expect(isTextMimeType("text/plain")).toBe(true);
    expect(isTextMimeType("text/markdown")).toBe(true);
    expect(isTextMimeType("text/csv")).toBe(true);
    expect(isTextMimeType("application/json")).toBe(true);
  });
});

describe("validateAttachment", () => {
  it("rejects unsafe extensions", () => {
    const result = validateAttachment({ name: "virus.exe", type: "application/octet-stream", size: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unsafe_file_type");
    }
  });

  it("rejects unsafe shell scripts", () => {
    const result = validateAttachment({ name: "install.sh", type: "text/plain", size: 100 });
    expect(result.ok).toBe(false);
  });

  it("accepts valid image", () => {
    const result = validateAttachment({ name: "photo.png", type: "image/png", size: 1024 });
    expect(result.ok).toBe(true);
  });

  it("accepts valid document", () => {
    const result = validateAttachment({ name: "report.pdf", type: "application/pdf", size: 1024 });
    expect(result.ok).toBe(true);
  });

  it("accepts valid text file", () => {
    const result = validateAttachment({ name: "notes.md", type: "text/markdown", size: 100 });
    expect(result.ok).toBe(true);
  });

  it("rejects oversized images", () => {
    const result = validateAttachment({ name: "big.png", type: "image/png", size: 11 * 1024 * 1024 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("image_too_large");
    }
  });

  it("rejects oversized documents", () => {
    const result = validateAttachment({ name: "big.pdf", type: "application/pdf", size: 21 * 1024 * 1024 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("document_too_large");
    }
  });
});

describe("UNSAFE_EXTENSIONS", () => {
  it("contains common unsafe types", () => {
    expect(UNSAFE_EXTENSIONS.has(".exe")).toBe(true);
    expect(UNSAFE_EXTENSIONS.has(".sh")).toBe(true);
    expect(UNSAFE_EXTENSIONS.has(".bat")).toBe(true);
    expect(UNSAFE_EXTENSIONS.has(".dll")).toBe(true);
  });
});
