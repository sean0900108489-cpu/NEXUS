import { describe, it, expect } from "vitest";
import {
  buildMultimodalContentParts,
  isMultimodalContent,
  hasImageParts,
  toTextOnlyMessage,
} from "./build-multimodal-content-parts";

describe("buildMultimodalContentParts", () => {
  it("returns plain string when no attachments", () => {
    const result = buildMultimodalContentParts({ userText: "Hello", attachments: [] });
    expect(typeof result).toBe("string");
    expect(result).toBe("Hello");
  });

  it("returns plain string with file references for non-image attachments", () => {
    const result = buildMultimodalContentParts({
      userText: "Review this",
      attachments: [{ id: "1", kind: "document", filename: "doc.pdf", mimeType: "application/pdf" }],
    });
    expect(typeof result).toBe("string");
    expect(result).toContain("[Attachment: doc.pdf");
  });

  it("returns content parts when image attachments present", () => {
    const result = buildMultimodalContentParts({
      userText: "What's in this image?",
      attachments: [
        { id: "1", kind: "image", filename: "photo.png", mimeType: "image/png", storageKey: "https://example.com/photo.png" },
      ],
    });
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result.some(p => p.type === "text")).toBe(true);
      expect(result.some(p => p.type === "image_url")).toBe(true);
      const img = result.find(p => p.type === "image_url") as { type: "image_url"; image_url: { url: string } };
      expect(img.image_url.url).toBe("https://example.com/photo.png");
    }
  });

  it("handles empty user text with images", () => {
    const result = buildMultimodalContentParts({
      userText: "",
      attachments: [
        { id: "1", kind: "image", filename: "photo.png", mimeType: "image/png", storageKey: "https://example.com/photo.png" },
      ],
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("isMultimodalContent", () => {
  it("returns true for content parts with images", () => {
    const parts = [{ type: "text" as const, text: "hi" }, { type: "image_url" as const, image_url: { url: "x" } }];
    expect(isMultimodalContent(parts)).toBe(true);
  });

  it("returns false for plain string", () => {
    expect(isMultimodalContent("hello")).toBe(false);
  });
});

describe("toTextOnlyMessage", () => {
  it("preserves string content messages", () => {
    const msg = toTextOnlyMessage({ role: "user", content: "hello" });
    expect(msg.content).toBe("hello");
    expect(msg.role).toBe("user");
  });

  it("extracts text from content parts", () => {
    const msg = toTextOnlyMessage({
      role: "user",
      content: [
        { type: "text", text: "part 1" },
        { type: "image_url", image_url: { url: "x" } },
        { type: "text", text: "part 2" },
      ],
    });
    expect(msg.content).toBe("part 1\npart 2");
  });
});
