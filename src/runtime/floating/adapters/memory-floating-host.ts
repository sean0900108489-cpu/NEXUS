import {
  closeFloatingWindow,
  createEmptyFloatingWindowState,
  focusFloatingWindow,
  maximizeFloatingWindowInState,
  minimizeFloatingWindow,
  openFloatingWindow,
  restoreFloatingWindowInState,
  updateFloatingWindowTitle,
} from "@/runtime/floating/core/floating-window-lifecycle";
import type { FloatingWindowState } from "@/runtime/floating/core/floating-window-types";
import type {
  FloatingHostAdapter,
  FloatingHostAdapterOptions,
} from "./floating-host-adapter";

export function createMemoryFloatingHostAdapter(
  options: FloatingHostAdapterOptions,
): FloatingHostAdapter {
  let state: FloatingWindowState = createEmptyFloatingWindowState();

  const setState = (nextState: FloatingWindowState) => {
    state = nextState;
  };

  return {
    hostId: options.hostId,

    getBounds() {
      return { ...options.bounds };
    },

    getWindows() {
      return state.windows;
    },

    getFocusedWindowId() {
      return state.focusedWindowId;
    },

    openWindow(input) {
      const result = openFloatingWindow(state, input, options.lifecycle);
      setState(result.state);
      return result.windowId;
    },

    closeWindow(windowId) {
      setState(closeFloatingWindow(state, windowId));
    },

    focusWindow(windowId) {
      setState(focusFloatingWindow(state, windowId, options.lifecycle));
    },

    minimizeWindow(windowId) {
      setState(minimizeFloatingWindow(state, windowId, options.lifecycle));
    },

    restoreWindow(windowId) {
      setState(restoreFloatingWindowInState(state, windowId, options.lifecycle));
    },

    maximizeWindow(windowId) {
      setState(
        maximizeFloatingWindowInState(
          state,
          windowId,
          options.bounds,
          options.lifecycle,
        ),
      );
    },

    moveWindow(windowId, x, y) {
      updateWindow(windowId, (win) => ({
        ...win,
        maximized: false,
        previousLayout: undefined,
        layout: { ...win.layout, x, y },
      }));
    },

    resizeWindow(windowId, width, height) {
      updateWindow(windowId, (win) => ({
        ...win,
        maximized: false,
        previousLayout: undefined,
        layout: { ...win.layout, width, height },
      }));
    },

    updateWindowState(windowId, nextState) {
      updateWindow(windowId, (win) => ({ ...win, state: nextState }));
    },

    updateWindowTitle(windowId, title) {
      setState(updateFloatingWindowTitle(state, windowId, title, options.lifecycle));
    },
  };

  function updateWindow(
    windowId: string,
    updater: (win: FloatingWindowState["windows"][number]) => FloatingWindowState["windows"][number],
  ) {
    const updatedAt = options.lifecycle?.now?.() ?? new Date().toISOString();
    setState({
      ...state,
      windows: state.windows.map((win) =>
        win.id === windowId ? { ...updater(win), updatedAt } : win,
      ),
    });
  }
}
