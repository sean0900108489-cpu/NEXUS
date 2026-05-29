import type {
  NexusStyleManifestV1,
  NexusStyleRecipesV1,
  NexusStyleTokenGroupNameV1,
} from "./manifest";

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

export type NexusWindowModalRecipeCssVariablesV1 = Record<
  `--nexus-recipe-${string}`,
  string
>;

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

export function createWindowModalRecipeAdapterFromManifestV1(
  manifest: NexusStyleManifestV1,
): NexusWindowModalRecipeAdapterV1 {
  const fallback = DEFAULT_NEXUS_WINDOW_MODAL_RECIPE_ADAPTER_V1;
  const recipeToken = (
    recipeGroup: keyof NexusStyleRecipesV1,
    slot: string,
    fallbackValue: string,
  ) => readRecipeToken(manifest, recipeGroup, slot, fallbackValue);
  const token = (
    group: NexusStyleTokenGroupNameV1,
    name: string,
    fallbackValue: string,
  ) => readManifestToken(manifest, group, name, fallbackValue);

  return {
    version: NEXUS_WINDOW_MODAL_RECIPE_ADAPTER_VERSION,
    window: {
      surface: recipeToken("window", "surface", fallback.window.surface),
      bodySurface: token("surface", "workspace", fallback.window.bodySurface),
      chromeSurface: token(
        "surface",
        "panelMuted",
        fallback.window.chromeSurface,
      ),
      chromeBorder: recipeToken("window", "border", fallback.window.chromeBorder),
      chromeText: recipeToken("window", "text", fallback.window.chromeText),
      border: recipeToken("window", "border", fallback.window.border),
      shadow: recipeToken("window", "shadow", fallback.window.shadow),
      radius: token("radius", "surface", fallback.window.radius),
      handleVisual: token("accent", "primary", fallback.window.handleVisual),
      resizeVisual: token("border", "subtle", fallback.window.resizeVisual),
      focusGlow: token("border", "glow", fallback.window.focusGlow),
    },
    modal: {
      backdrop: recipeToken("modal", "backdrop", fallback.modal.backdrop),
      surface: recipeToken("modal", "surface", fallback.modal.surface),
      border: recipeToken("modal", "border", fallback.modal.border),
      shadow: token("shadow", "panel", fallback.modal.shadow),
      radius: token("radius", "surface", fallback.modal.radius),
      headerSurface: token(
        "surface",
        "panelMuted",
        fallback.modal.headerSurface,
      ),
      titleText: recipeToken("modal", "text", fallback.modal.titleText),
      bodyText: token("text", "secondary", fallback.modal.bodyText),
      footerSurface: token("surface", "panelMuted", fallback.modal.footerSurface),
      dangerCallout: token("status", "danger", fallback.modal.dangerCallout),
      focusRing: token("border", "glow", fallback.modal.focusRing),
    },
    commandPalette: {
      overlay: recipeToken(
        "commandPalette",
        "overlay",
        fallback.commandPalette.overlay,
      ),
      surface: recipeToken(
        "commandPalette",
        "surface",
        fallback.commandPalette.surface,
      ),
      input: recipeToken("commandPalette", "input", fallback.commandPalette.input),
      itemDefault: recipeToken(
        "commandPalette",
        "itemDefault",
        fallback.commandPalette.itemDefault,
      ),
      itemHover: recipeToken(
        "commandPalette",
        "itemHover",
        fallback.commandPalette.itemHover,
      ),
      itemActive: recipeToken(
        "commandPalette",
        "itemActive",
        fallback.commandPalette.itemActive,
      ),
      icon: recipeToken("commandPalette", "icon", fallback.commandPalette.icon),
      emptyState: recipeToken(
        "commandPalette",
        "emptyState",
        fallback.commandPalette.emptyState,
      ),
    },
  };
}

export function emitWindowModalRecipeCssVariablesV1(
  adapter: NexusWindowModalRecipeAdapterV1,
): NexusWindowModalRecipeCssVariablesV1 {
  return {
    "--nexus-recipe-command-palette-empty-state":
      adapter.commandPalette.emptyState,
    "--nexus-recipe-command-palette-icon": adapter.commandPalette.icon,
    "--nexus-recipe-command-palette-input": adapter.commandPalette.input,
    "--nexus-recipe-command-palette-item-active":
      adapter.commandPalette.itemActive,
    "--nexus-recipe-command-palette-item-default":
      adapter.commandPalette.itemDefault,
    "--nexus-recipe-command-palette-item-hover":
      adapter.commandPalette.itemHover,
    "--nexus-recipe-command-palette-overlay": adapter.commandPalette.overlay,
    "--nexus-recipe-command-palette-surface": adapter.commandPalette.surface,
    "--nexus-recipe-modal-backdrop": adapter.modal.backdrop,
    "--nexus-recipe-modal-body-text": adapter.modal.bodyText,
    "--nexus-recipe-modal-border": adapter.modal.border,
    "--nexus-recipe-modal-danger-callout": adapter.modal.dangerCallout,
    "--nexus-recipe-modal-focus-ring": adapter.modal.focusRing,
    "--nexus-recipe-modal-footer-surface": adapter.modal.footerSurface,
    "--nexus-recipe-modal-header-surface": adapter.modal.headerSurface,
    "--nexus-recipe-modal-radius": adapter.modal.radius,
    "--nexus-recipe-modal-shadow": adapter.modal.shadow,
    "--nexus-recipe-modal-surface": adapter.modal.surface,
    "--nexus-recipe-modal-title-text": adapter.modal.titleText,
    "--nexus-recipe-window-body-surface": adapter.window.bodySurface,
    "--nexus-recipe-window-border": adapter.window.border,
    "--nexus-recipe-window-chrome-border": adapter.window.chromeBorder,
    "--nexus-recipe-window-chrome-surface": adapter.window.chromeSurface,
    "--nexus-recipe-window-chrome-text": adapter.window.chromeText,
    "--nexus-recipe-window-focus-glow": adapter.window.focusGlow,
    "--nexus-recipe-window-handle-visual": adapter.window.handleVisual,
    "--nexus-recipe-window-radius": adapter.window.radius,
    "--nexus-recipe-window-resize-visual": adapter.window.resizeVisual,
    "--nexus-recipe-window-shadow": adapter.window.shadow,
    "--nexus-recipe-window-surface": adapter.window.surface,
  };
}

function readRecipeToken(
  manifest: NexusStyleManifestV1,
  recipeGroup: keyof NexusStyleRecipesV1,
  slot: string,
  fallback: string,
) {
  const reference = manifest.recipes[recipeGroup][slot];

  return resolveManifestTokenReference(manifest, reference, fallback);
}

function resolveManifestTokenReference(
  manifest: NexusStyleManifestV1,
  reference: unknown,
  fallback: string,
) {
  if (typeof reference !== "string" || reference.length === 0) {
    return fallback;
  }

  const [group, name] = reference.split(".");

  if (isTokenGroup(group) && name) {
    return readManifestToken(manifest, group, name, reference);
  }

  return reference;
}

function readManifestToken(
  manifest: NexusStyleManifestV1,
  group: NexusStyleTokenGroupNameV1,
  name: string,
  fallback: string,
) {
  const value = manifest.tokens[group][name];

  return value === undefined ? fallback : String(value);
}

function isTokenGroup(value: string | undefined): value is NexusStyleTokenGroupNameV1 {
  return (
    value === "surface" ||
    value === "text" ||
    value === "accent" ||
    value === "status" ||
    value === "border" ||
    value === "shadow" ||
    value === "radius" ||
    value === "blur" ||
    value === "workspace" ||
    value === "typography" ||
    value === "density" ||
    value === "motion"
  );
}
