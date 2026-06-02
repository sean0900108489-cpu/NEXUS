import type { WorkspaceComposerMode } from "./composer-mode-types";

export type WorkspaceComposerActionId = "toggle-image-generation";

export type WorkspaceComposerAction = {
  detail: string;
  id: WorkspaceComposerActionId;
  label: string;
  status: "implemented";
};

export function getWorkspaceComposerModeToggleAction(
  mode: WorkspaceComposerMode,
): WorkspaceComposerAction {
  return mode === "image"
    ? {
        detail: "Return this chatroom composer to language model routing.",
        id: "toggle-image-generation",
        label: "Language model",
        status: "implemented",
      }
    : {
        detail: "Route the next prompt through image generation in this chatroom.",
        id: "toggle-image-generation",
        label: "Image generation",
        status: "implemented",
      };
}

export function getWorkspaceComposerActions(mode: WorkspaceComposerMode) {
  return [getWorkspaceComposerModeToggleAction(mode)] as const;
}
