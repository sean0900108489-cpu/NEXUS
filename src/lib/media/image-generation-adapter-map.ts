import {
  normalizeWorkspaceComposerImageSettings,
  type WorkspaceComposerImageAspectRatio,
  type WorkspaceComposerImageQuality,
  type WorkspaceComposerImageSettings,
} from "@/lib/composer/image-generation-settings";

export type OpenAiCompatibleImageSize = "1024x1024" | "1536x1024" | "1024x1536";

export type OpenAiCompatibleImageGenerationPayload = {
  model: string;
  n: 1;
  prompt: string;
  quality: string;
  size: OpenAiCompatibleImageSize;
};

const OPENAI_COMPATIBLE_MODEL_BY_PRODUCT_ID: Record<string, string> = {
  "riverflow-v2.5-fast": "sourceful/riverflow-v2.5-fast",
  img2: "gpt-image-2",
};

const OPENAI_COMPATIBLE_SIZE_BY_RATIO = {
  "1:1": "1024x1024",
  "16:9": "1536x1024",
  "9:16": "1024x1536",
} as const satisfies Record<
  WorkspaceComposerImageAspectRatio,
  OpenAiCompatibleImageSize
>;

export function resolveOpenAiCompatibleImageSize(
  aspectRatio: WorkspaceComposerImageAspectRatio,
) {
  return OPENAI_COMPATIBLE_SIZE_BY_RATIO[aspectRatio];
}

export function resolveOpenAiCompatibleImageModel(model: string) {
  const productModelId = model.trim();

  return OPENAI_COMPATIBLE_MODEL_BY_PRODUCT_ID[productModelId] ?? productModelId;
}

export function resolveOpenAiCompatibleImageQuality(
  quality: WorkspaceComposerImageQuality,
  model: string,
) {
  const providerModel = resolveOpenAiCompatibleImageModel(model);

  if (providerModel.startsWith("dall-e")) {
    return quality === "standard" ? "standard" : "hd";
  }

  if (providerModel.startsWith("gpt-image")) {
    if (quality === "standard") {
      return "low";
    }

    if (quality === "high") {
      return "medium";
    }

    return "high";
  }

  return quality;
}

export function buildOpenAiCompatibleImageGenerationPayload(input: {
  model: string;
  prompt: string;
  settings?: Partial<WorkspaceComposerImageSettings>;
}): OpenAiCompatibleImageGenerationPayload {
  const settings = normalizeWorkspaceComposerImageSettings(input.settings);
  const model = resolveOpenAiCompatibleImageModel(input.model.trim() || settings.modelId);

  return {
    model,
    n: 1,
    prompt: input.prompt,
    quality: resolveOpenAiCompatibleImageQuality(settings.quality, model),
    size: resolveOpenAiCompatibleImageSize(settings.aspectRatio),
  };
}
