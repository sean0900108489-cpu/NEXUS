/**
 * NEXUS Window OS — Kernel Public API
 */

export { useWindowStore } from "./window-store";
export type { WindowKernelStore } from "./window-store";

export {
  registerWindowApp,
  getWindowApp,
  getRegisteredKinds,
  isRegistered,
  getAllRegisteredApps,
  clearWindowRegistry,
} from "./window-registry";

export { DEFAULT_WINDOW_APPS } from "./default-window-apps";

export {
  snapWindowLeft,
  snapWindowRight,
  layoutMaximize,
  cascadeWindows,
  constrainToViewport,
  constrainAllToViewport,
} from "./window-layout";

export { WindowFrame } from "./WindowFrame";
export { WindowManager } from "./WindowManager";
export { NexusDesktopShell } from "./NexusDesktopShell";

export type {
  NexusWindow,
  NexusWindowKind,
  NexusWindowScope,
  NexusWindowLayout,
  NexusWindowKernelSnapshot,
  NexusWindowAppDefinition,
  NexusWindowAppProps,
  NexusLauncherItem,
} from "./window-types";
