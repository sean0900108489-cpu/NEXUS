export type WorkspaceComposerImageQuality = "standard" | "high" | "ultra";

export type WorkspaceComposerImageAspectRatio = "1:1" | "16:9" | "9:16";

export type WorkspaceComposerImageSettings = {
  aspectRatio: WorkspaceComposerImageAspectRatio;
  modelId: string;
  quality: WorkspaceComposerImageQuality;
};

export const WORKSPACE_COMPOSER_IMAGE_QUALITY_OPTIONS = [
  {
    label: "Standard",
    value: "standard",
  },
  {
    label: "High",
    value: "high",
  },
  {
    label: "Ultra",
    value: "ultra",
  },
] as const satisfies ReadonlyArray<{
  label: string;
  value: WorkspaceComposerImageQuality;
}>;

export const WORKSPACE_COMPOSER_IMAGE_ASPECT_RATIO_OPTIONS = [
  {
    label: "1:1",
    value: "1:1",
  },
  {
    label: "16:9",
    value: "16:9",
  },
  {
    label: "9:16",
    value: "9:16",
  },
] as const satisfies ReadonlyArray<{
  label: string;
  value: WorkspaceComposerImageAspectRatio;
}>;

export const WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS = [
  {
    label: "GPT Image 2",
    value: "img2",
  },
  {
    label: "Riverflow v2.5 Fast",
    value: "riverflow-v2.5-fast",
  },
] as const satisfies ReadonlyArray<{
  label: string;
  value: string;
}>;

export const DEFAULT_WORKSPACE_COMPOSER_IMAGE_SETTINGS = {
  aspectRatio: "1:1",
  modelId: "img2",
  quality: "standard",
} as const satisfies WorkspaceComposerImageSettings;

export function isWorkspaceComposerImageQuality(
  value: unknown,
): value is WorkspaceComposerImageQuality {
  return (
    value === "standard" ||
    value === "high" ||
    value === "ultra"
  );
}

export function isWorkspaceComposerImageAspectRatio(
  value: unknown,
): value is WorkspaceComposerImageAspectRatio {
  return value === "1:1" || value === "16:9" || value === "9:16";
}

export function normalizeWorkspaceComposerImageSettings(
  value: Partial<WorkspaceComposerImageSettings> | undefined,
): WorkspaceComposerImageSettings {
  return {
    aspectRatio: isWorkspaceComposerImageAspectRatio(value?.aspectRatio)
      ? value.aspectRatio
      : DEFAULT_WORKSPACE_COMPOSER_IMAGE_SETTINGS.aspectRatio,
    modelId: value?.modelId?.trim()
      ? value.modelId.trim()
      : DEFAULT_WORKSPACE_COMPOSER_IMAGE_SETTINGS.modelId,
    quality: isWorkspaceComposerImageQuality(value?.quality)
      ? value.quality
      : DEFAULT_WORKSPACE_COMPOSER_IMAGE_SETTINGS.quality,
  };
}
