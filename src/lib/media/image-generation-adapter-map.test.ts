import { describe, expect, it } from "vitest";

import {
  buildOpenAiCompatibleImageGenerationPayload,
  resolveOpenAiCompatibleImageModel,
  resolveOpenAiCompatibleImageQuality,
  resolveOpenAiCompatibleImageSize,
} from "./image-generation-adapter-map";

describe("image generation adapter map", () => {
  it("maps product aspect ratios into OpenAI-compatible sizes", () => {
    expect(resolveOpenAiCompatibleImageSize("1:1")).toBe("1024x1024");
    expect(resolveOpenAiCompatibleImageSize("16:9")).toBe("1536x1024");
    expect(resolveOpenAiCompatibleImageSize("9:16")).toBe("1024x1536");
  });

  it("maps DALL-E quality into current OpenAI-compatible quality values", () => {
    expect(resolveOpenAiCompatibleImageQuality("standard", "dall-e-3")).toBe(
      "standard",
    );
    expect(resolveOpenAiCompatibleImageQuality("high", "dall-e-3")).toBe("hd");
    expect(resolveOpenAiCompatibleImageQuality("ultra", "dall-e-3")).toBe("hd");
  });

  it("maps product image models into OpenAI provider model ids", () => {
    expect(resolveOpenAiCompatibleImageModel("img2")).toBe("gpt-image-2");
    expect(resolveOpenAiCompatibleImageModel("gpt-image-1")).toBe("gpt-image-1");
    expect(resolveOpenAiCompatibleImageModel("nano-banana")).toBe("nano-banana");
  });

  it("maps GPT Image product quality labels into OpenAI quality tiers", () => {
    expect(resolveOpenAiCompatibleImageQuality("standard", "img2")).toBe("low");
    expect(resolveOpenAiCompatibleImageQuality("high", "img2")).toBe("medium");
    expect(resolveOpenAiCompatibleImageQuality("ultra", "img2")).toBe("high");
  });

  it("passes non-OpenAI model quality labels through for adapter-specific handling", () => {
    expect(resolveOpenAiCompatibleImageQuality("ultra", "nano-banana")).toBe(
      "ultra",
    );
  });

  it("builds provider-ready payloads from product image settings", () => {
    expect(
      buildOpenAiCompatibleImageGenerationPayload({
        model: "img2",
        prompt: "interface material study",
        settings: {
          aspectRatio: "16:9",
          quality: "high",
        },
      }),
    ).toEqual({
      model: "gpt-image-2",
      n: 1,
      prompt: "interface material study",
      quality: "medium",
      size: "1536x1024",
    });
  });
});
