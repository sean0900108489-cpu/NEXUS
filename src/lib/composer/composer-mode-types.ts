export type WorkspaceComposerMode = "language" | "image";

export type WorkspaceComposerModeByAgentId = Record<string, WorkspaceComposerMode>;

export const DEFAULT_WORKSPACE_COMPOSER_MODE =
  "language" as const satisfies WorkspaceComposerMode;

export function isWorkspaceComposerMode(
  value: unknown,
): value is WorkspaceComposerMode {
  return value === "language" || value === "image";
}

export function normalizeWorkspaceComposerMode(
  value: unknown,
): WorkspaceComposerMode {
  return isWorkspaceComposerMode(value)
    ? value
    : DEFAULT_WORKSPACE_COMPOSER_MODE;
}

export function getWorkspaceComposerMode(
  modesByAgentId: WorkspaceComposerModeByAgentId,
  agentId?: string,
) {
  return normalizeWorkspaceComposerMode(agentId ? modesByAgentId[agentId] : undefined);
}

export function toggleWorkspaceComposerMode(
  mode: WorkspaceComposerMode,
): WorkspaceComposerMode {
  return mode === "image" ? "language" : "image";
}
