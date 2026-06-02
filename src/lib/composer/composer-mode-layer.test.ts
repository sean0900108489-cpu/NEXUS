import { describe, expect, it } from "vitest";

import {
  getWorkspaceComposerActions,
  getWorkspaceComposerModeToggleAction,
} from "./composer-actions";
import {
  DEFAULT_WORKSPACE_COMPOSER_MODE,
  getWorkspaceComposerMode,
  normalizeWorkspaceComposerMode,
  toggleWorkspaceComposerMode,
} from "./composer-mode-types";
import {
  DEFAULT_WORKSPACE_COMPOSER_IMAGE_SETTINGS,
  normalizeWorkspaceComposerImageSettings,
  WORKSPACE_COMPOSER_IMAGE_ASPECT_RATIO_OPTIONS,
  WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS,
  WORKSPACE_COMPOSER_IMAGE_QUALITY_OPTIONS,
} from "./image-generation-settings";

describe("V21 composer mode layer", () => {
  it("defaults missing chatroom composer state to language mode", () => {
    expect(DEFAULT_WORKSPACE_COMPOSER_MODE).toBe("language");
    expect(normalizeWorkspaceComposerMode(undefined)).toBe("language");
    expect(normalizeWorkspaceComposerMode("image")).toBe("image");
    expect(getWorkspaceComposerMode({}, "agent-a")).toBe("language");
    expect(getWorkspaceComposerMode({ "agent-a": "image" }, "agent-a")).toBe(
      "image",
    );
  });

  it("toggles between language and image without changing agent capability", () => {
    expect(toggleWorkspaceComposerMode("language")).toBe("image");
    expect(toggleWorkspaceComposerMode("image")).toBe("language");
  });

  it("exposes contextual composer actions outside the attachment registry", () => {
    expect(getWorkspaceComposerModeToggleAction("language")).toMatchObject({
      id: "toggle-image-generation",
      label: "Image generation",
    });
    expect(getWorkspaceComposerModeToggleAction("image")).toMatchObject({
      id: "toggle-image-generation",
      label: "Language model",
    });
    expect(getWorkspaceComposerActions("language")).toHaveLength(1);
  });

  it("normalizes image settings for future provider adapters", () => {
    expect(DEFAULT_WORKSPACE_COMPOSER_IMAGE_SETTINGS).toEqual({
      aspectRatio: "1:1",
      modelId: "img2",
      quality: "standard",
    });
    expect(
      normalizeWorkspaceComposerImageSettings({
        aspectRatio: "16:9",
        modelId: " nano-banana ",
        quality: "ultra",
      }),
    ).toEqual({
      aspectRatio: "16:9",
      modelId: "nano-banana",
      quality: "ultra",
    });
    expect(normalizeWorkspaceComposerImageSettings({ quality: "bad" as never }))
      .toEqual(DEFAULT_WORKSPACE_COMPOSER_IMAGE_SETTINGS);
    expect(WORKSPACE_COMPOSER_IMAGE_QUALITY_OPTIONS.map((option) => option.value))
      .toEqual(["standard", "high", "ultra"]);
    expect(
      WORKSPACE_COMPOSER_IMAGE_ASPECT_RATIO_OPTIONS.map((option) => option.value),
    ).toEqual(["1:1", "16:9", "9:16"]);
    expect(WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS.map((option) => option.value))
      .toContain("nano-banana");
  });
});
