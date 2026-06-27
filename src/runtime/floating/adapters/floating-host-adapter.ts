import type {
  FloatingOpenWindowInput,
  FloatingWindowInstance,
  FloatingWindowLifecycleOptions,
  FloatingWindowSize,
} from "@/runtime/floating/core/floating-window-types";

export type FloatingHostId = "workspace" | "desktop" | (string & {});

export type FloatingHostAdapter = {
  hostId: FloatingHostId;
  getBounds: () => FloatingWindowSize;
  getWindows: () => FloatingWindowInstance[];
  getFocusedWindowId: () => string | null;
  openWindow: (input: FloatingOpenWindowInput) => string;
  closeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  moveWindow: (windowId: string, x: number, y: number) => void;
  resizeWindow: (windowId: string, width: number, height: number) => void;
  updateWindowState: (windowId: string, state: Record<string, unknown>) => void;
  updateWindowTitle: (windowId: string, title: string) => void;
};

export type FloatingHostAdapterOptions = {
  hostId: FloatingHostId;
  bounds: FloatingWindowSize;
  lifecycle?: FloatingWindowLifecycleOptions;
};
