export type {
  FloatingOpenWindowInput,
  FloatingWindowInstance,
  FloatingWindowLayout,
  FloatingWindowLifecycleOptions,
  FloatingWindowScope,
  FloatingWindowSize,
  FloatingWindowState,
} from "./core/floating-window-types";
export {
  cascadeFloatingWindows,
  constrainFloatingLayoutToBounds,
  maximizeFloatingWindow,
  restoreFloatingWindow,
} from "./core/floating-window-layout";
export {
  closeFloatingWindow,
  createEmptyFloatingWindowState,
  focusFloatingWindow,
  maximizeFloatingWindowInState,
  minimizeFloatingWindow,
  openFloatingWindow,
  restoreFloatingWindowInState,
  updateFloatingWindowTitle,
} from "./core/floating-window-lifecycle";
export type {
  FloatingAppDataBoundary,
  FloatingAppDefinition,
  FloatingAppProps,
  FloatingWebAppBridgeManifest,
  FloatingWebAppManifest,
  FloatingWebAppPermission,
} from "./registry/floating-app-types";
export {
  createFloatingAppRegistry,
  type FloatingAppRegistry,
} from "./registry/floating-app-registry";
export { createFloatingAppOpenInput } from "./registry/floating-app-open-input";
export type { FloatingAppOpenInputOptions } from "./registry/floating-app-open-input";
export {
  createDefaultWorkspaceFloatingAppRegistry,
  DEFAULT_WORKSPACE_FLOATING_APPS,
} from "./registry/default-floating-apps";
export type {
  FloatingHostAdapter,
  FloatingHostAdapterOptions,
  FloatingHostId,
} from "./adapters/floating-host-adapter";
export { createMemoryFloatingHostAdapter } from "./adapters/memory-floating-host";
export {
  FloatingWindowFrame,
  type FloatingWindowFrameProps,
} from "./react/FloatingWindowFrame";
export {
  FloatingWindowManager,
  type FloatingWindowManagerProps,
} from "./react/FloatingWindowManager";
export {
  FloatingAppLauncher,
  type FloatingAppLauncherProps,
} from "./react/FloatingAppLauncher";
export { useFloatingHostAdapter } from "./react/useFloatingHostAdapter";
export {
  FloatingWebAppContainer,
  type FloatingWebAppContainerProps,
} from "./web-app-host/FloatingWebAppContainer";
export {
  FLOATING_WEB_APP_CONTEXT_MESSAGE_TYPE,
  buildFloatingWebAppContextBridgeMessage,
  getFloatingWebAppManifestOrigin,
  isAllowedFloatingWebAppOrigin,
  isFloatingWebAppContextBridgeMessage,
  parseFloatingWebAppMessageEvent,
} from "./web-app-host/floating-web-app-context-bridge";
export type {
  FloatingWebAppContextBridgeBuildInput,
  FloatingWebAppContextBridgeBuildResult,
  FloatingWebAppContextBridgeMessage,
  FloatingWebAppMessageEventLike,
} from "./web-app-host/floating-web-app-context-bridge";
