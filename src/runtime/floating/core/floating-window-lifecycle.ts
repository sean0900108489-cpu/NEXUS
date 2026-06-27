import {
  maximizeFloatingWindow,
  restoreFloatingWindow,
} from "./floating-window-layout";
import type {
  FloatingOpenWindowInput,
  FloatingWindowInstance,
  FloatingWindowLifecycleOptions,
  FloatingWindowSize,
  FloatingWindowState,
} from "./floating-window-types";

export function createEmptyFloatingWindowState(): FloatingWindowState {
  return {
    windows: [],
    maxZIndex: 0,
    focusedWindowId: null,
  };
}

export function openFloatingWindow(
  state: FloatingWindowState,
  input: FloatingOpenWindowInput,
  options: FloatingWindowLifecycleOptions = {},
): { state: FloatingWindowState; windowId: string } {
  if (input.singleton) {
    const existing = state.windows.find((win) => win.kind === input.kind);
    if (existing) {
      const nextState = focusFloatingWindow(
        {
          ...state,
          windows: state.windows.map((win) =>
            win.id === existing.id ? { ...win, minimized: false } : win,
          ),
        },
        existing.id,
        options,
      );
      return { state: nextState, windowId: existing.id };
    }
  }

  const nextZIndex = state.maxZIndex + 1;
  const createdAt = getNow(options);
  const id = createWindowId(input.kind, state.windows.length + 1, options);
  const offset = state.windows.length * 30 + 40;
  const win: FloatingWindowInstance = {
    id,
    kind: input.kind,
    title: input.title,
    scope: input.scope,
    resourceId: input.resourceId,
    workspaceId: input.workspaceId,
    layout: {
      x: offset,
      y: offset,
      width: input.defaultSize.width,
      height: input.defaultSize.height,
      zIndex: nextZIndex,
    },
    minimized: false,
    maximized: false,
    createdAt,
    updatedAt: createdAt,
    state: input.state,
  };

  return {
    windowId: id,
    state: {
      windows: [...state.windows, win],
      maxZIndex: nextZIndex,
      focusedWindowId: id,
    },
  };
}

export function closeFloatingWindow(
  state: FloatingWindowState,
  windowId: string,
): FloatingWindowState {
  return {
    ...state,
    windows: state.windows.filter((win) => win.id !== windowId),
    focusedWindowId: state.focusedWindowId === windowId ? null : state.focusedWindowId,
  };
}

export function focusFloatingWindow(
  state: FloatingWindowState,
  windowId: string,
  options: FloatingWindowLifecycleOptions = {},
): FloatingWindowState {
  const nextZIndex = state.maxZIndex + 1;
  const updatedAt = getNow(options);

  return {
    windows: state.windows.map((win) =>
      win.id === windowId
        ? {
            ...win,
            minimized: false,
            layout: { ...win.layout, zIndex: nextZIndex },
            updatedAt,
          }
        : win,
    ),
    maxZIndex: nextZIndex,
    focusedWindowId: windowId,
  };
}

export function minimizeFloatingWindow(
  state: FloatingWindowState,
  windowId: string,
  options: FloatingWindowLifecycleOptions = {},
): FloatingWindowState {
  const updatedAt = getNow(options);

  return {
    ...state,
    windows: state.windows.map((win) =>
      win.id === windowId ? { ...win, minimized: true, updatedAt } : win,
    ),
  };
}

export function restoreFloatingWindowInState(
  state: FloatingWindowState,
  windowId: string,
  options: FloatingWindowLifecycleOptions = {},
): FloatingWindowState {
  const updatedAt = getNow(options);

  return {
    ...state,
    windows: state.windows.map((win) =>
      win.id === windowId ? { ...restoreFloatingWindow(win), updatedAt } : win,
    ),
  };
}

export function updateFloatingWindowTitle(
  state: FloatingWindowState,
  windowId: string,
  title: string,
  options: FloatingWindowLifecycleOptions = {},
): FloatingWindowState {
  const target = state.windows.find((win) => win.id === windowId);
  if (!target || target.title === title) return state;

  const updatedAt = getNow(options);

  return {
    ...state,
    windows: state.windows.map((win) =>
      win.id === windowId ? { ...win, title, updatedAt } : win,
    ),
  };
}

export function maximizeFloatingWindowInState(
  state: FloatingWindowState,
  windowId: string,
  bounds: FloatingWindowSize,
  options: FloatingWindowLifecycleOptions = {},
): FloatingWindowState {
  const updatedAt = getNow(options);

  return {
    ...state,
    windows: state.windows.map((win) =>
      win.id === windowId
        ? { ...maximizeFloatingWindow(win, bounds), updatedAt }
        : win,
    ),
  };
}

function createWindowId(
  kind: string,
  index: number,
  options: FloatingWindowLifecycleOptions,
): string {
  if (options.createId) return options.createId(kind, index);
  return `floating-window:${kind}:${Date.now().toString(36)}-${index.toString(36)}`;
}

function getNow(options: FloatingWindowLifecycleOptions): string {
  return options.now ? options.now() : new Date().toISOString();
}
