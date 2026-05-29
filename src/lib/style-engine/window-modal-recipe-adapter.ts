export const NEXUS_WINDOW_MODAL_RECIPE_ADAPTER_VERSION =
  "nexus-window-modal-recipe-adapter-v1" as const;

export const NEXUS_WINDOW_MODAL_RECIPE_FORBIDDEN_BEHAVIOR_KEYS = [
  "ariaModal",
  "autoFocus",
  "bounds",
  "clickOutside",
  "closeOnEscape",
  "commandExecution",
  "disableDragging",
  "dragHandleClassName",
  "enableResizing",
  "filterCommands",
  "focusTrap",
  "keyboardShortcut",
  "onClose",
  "onCommand",
  "onDragStart",
  "onDragStop",
  "onResizeStop",
  "pointerEvents",
  "role",
  "scrollOwner",
  "zIndex",
] as const;

export type NexusWindowModalRecipeAdapterV1 = {
  version: typeof NEXUS_WINDOW_MODAL_RECIPE_ADAPTER_VERSION;
  window: {
    surface: string;
    bodySurface: string;
    chromeSurface: string;
    chromeBorder: string;
    chromeText: string;
    border: string;
    shadow: string;
    radius: string;
    handleVisual: string;
    resizeVisual: string;
    focusGlow: string;
  };
  modal: {
    backdrop: string;
    surface: string;
    border: string;
    shadow: string;
    radius: string;
    headerSurface: string;
    titleText: string;
    bodyText: string;
    footerSurface: string;
    dangerCallout: string;
    focusRing: string;
  };
  commandPalette: {
    overlay: string;
    surface: string;
    input: string;
    itemDefault: string;
    itemHover: string;
    itemActive: string;
    icon: string;
    emptyState: string;
  };
};

export const DEFAULT_NEXUS_WINDOW_MODAL_RECIPE_ADAPTER_V1 = {
  version: NEXUS_WINDOW_MODAL_RECIPE_ADAPTER_VERSION,
  window: {
    surface: "var(--nexus-surface-panel)",
    bodySurface: "var(--nexus-surface-workspace)",
    chromeSurface: "var(--nexus-surface-panel-muted)",
    chromeBorder: "var(--nexus-border-subtle)",
    chromeText: "var(--nexus-text-secondary)",
    border: "var(--nexus-border-strong)",
    shadow: "var(--nexus-shadow-panel)",
    radius: "var(--nexus-radius-panel)",
    handleVisual: "var(--nexus-accent-primary)",
    resizeVisual: "var(--nexus-border-subtle)",
    focusGlow: "var(--nexus-border-glow)",
  },
  modal: {
    backdrop: "var(--nexus-surface-overlay)",
    surface: "var(--nexus-surface-panel)",
    border: "var(--nexus-border-strong)",
    shadow: "var(--nexus-shadow-panel)",
    radius: "var(--nexus-radius-panel)",
    headerSurface: "var(--nexus-surface-panel-muted)",
    titleText: "var(--nexus-text-primary)",
    bodyText: "var(--nexus-text-secondary)",
    footerSurface: "var(--nexus-surface-panel-muted)",
    dangerCallout: "var(--nexus-status-danger)",
    focusRing: "var(--nexus-border-glow)",
  },
  commandPalette: {
    overlay: "var(--nexus-surface-overlay)",
    surface: "var(--nexus-surface-panel)",
    input: "var(--nexus-surface-input)",
    itemDefault: "var(--nexus-surface-panel-muted)",
    itemHover: "var(--nexus-surface-raised)",
    itemActive: "var(--nexus-accent-primary)",
    icon: "var(--nexus-accent-primary)",
    emptyState: "var(--nexus-text-muted)",
  },
} as const satisfies NexusWindowModalRecipeAdapterV1;

export function createDefaultWindowModalRecipeAdapterV1(): NexusWindowModalRecipeAdapterV1 {
  const adapter = DEFAULT_NEXUS_WINDOW_MODAL_RECIPE_ADAPTER_V1;

  return {
    version: adapter.version,
    window: { ...adapter.window },
    modal: { ...adapter.modal },
    commandPalette: { ...adapter.commandPalette },
  };
}
