import { describe, it, expect } from "vitest";
import {
  canModelAcceptImages,
  guardImageAttachments,
  buildModelCapabilities,
  assertModelCapability,
} from "./model-capability-guard";

describe("canModelAcceptImages", () => {
  it("returns true when vision is true", () => {
    expect(canModelAcceptImages({ text: true, vision: true, fileInput: false, pdfInput: false, imageGeneration: false, tools: false })).toBe(true);
  });

  it("returns false when vision is false", () => {
    expect(canModelAcceptImages({ text: true, vision: false, fileInput: false, pdfInput: false, imageGeneration: false, tools: false })).toBe(false);
  });
});

describe("guardImageAttachments", () => {
  it("passes when no images", () => {
    const result = guardImageAttachments(false, { text: true, vision: false, fileInput: false, pdfInput: false, imageGeneration: false, tools: false });
    expect(result.ok).toBe(true);
  });

  it("passes when images + vision model", () => {
    const result = guardImageAttachments(true, { text: true, vision: true, fileInput: false, pdfInput: false, imageGeneration: false, tools: false });
    expect(result.ok).toBe(true);
  });

  it("rejects images + non-vision model", () => {
    const result = guardImageAttachments(true, { text: true, vision: false, fileInput: false, pdfInput: false, imageGeneration: false, tools: false });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("model_not_vision_capable");
    }
  });
});

describe("buildModelCapabilities", () => {
  it("builds from server catalog entry", () => {
    const caps = buildModelCapabilities({
      supports_vision: true,
      supports_tools: true,
      supports_file_input: false,
    });
    expect(caps.vision).toBe(true);
    expect(caps.tools).toBe(true);
    expect(caps.fileInput).toBe(false);
    expect(caps.text).toBe(true); // always true
  });

  it("defaults to false for missing fields", () => {
    const caps = buildModelCapabilities({});
    expect(caps.vision).toBe(false);
    expect(caps.fileInput).toBe(false);
    expect(caps.pdfInput).toBe(false);
    expect(caps.imageGeneration).toBe(false);
  });
});

describe("assertModelCapability", () => {
  it("passes when all required capabilities present", () => {
    const result = assertModelCapability({ text: true, vision: true, fileInput: false, pdfInput: false, imageGeneration: false, tools: true }, ["vision", "tools"]);
    expect(result.ok).toBe(true);
  });

  it("fails when required capability missing", () => {
    const result = assertModelCapability({ text: true, vision: false, fileInput: false, pdfInput: false, imageGeneration: false, tools: false }, ["vision"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("missing_capability_vision");
    }
  });
});
