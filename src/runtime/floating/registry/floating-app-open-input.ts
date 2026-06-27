import type { FloatingOpenWindowInput } from "@/runtime/floating/core/floating-window-types";
import type { FloatingAppDefinition } from "./floating-app-types";

export type FloatingAppOpenInputOptions = {
  resourceId?: string;
  state?: Record<string, unknown>;
  workspaceId?: string;
};

export function createFloatingAppOpenInput(
  app: FloatingAppDefinition,
  options: FloatingAppOpenInputOptions = {},
): FloatingOpenWindowInput {
  return {
    kind: app.kind,
    title: app.title,
    scope: app.scope,
    defaultSize: app.defaultSize,
    ...(options.resourceId !== undefined ? { resourceId: options.resourceId } : {}),
    ...(options.workspaceId !== undefined ? { workspaceId: options.workspaceId } : {}),
    ...(options.state !== undefined ? { state: options.state } : {}),
    ...(typeof app.singleton === "boolean" ? { singleton: app.singleton } : {}),
    ...(typeof app.allowMultiple === "boolean"
      ? { allowMultiple: app.allowMultiple }
      : {}),
  };
}
