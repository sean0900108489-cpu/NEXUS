"use client";

import { useCallback, useMemo, useRef, useState } from "react";

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
import type {
  FloatingWindowInstance,
  FloatingWindowState,
} from "@/runtime/floating/core/floating-window-types";
import type {
  FloatingHostAdapter,
  FloatingHostAdapterOptions,
} from "@/runtime/floating/adapters/floating-host-adapter";

export function useFloatingHostAdapter(
  options: FloatingHostAdapterOptions,
): FloatingHostAdapter {
  const stateRef = useRef<FloatingWindowState>(createEmptyFloatingWindowState());
  const [state, setState] = useState<FloatingWindowState>(() =>
    createEmptyFloatingWindowState(),
  );

  const commitState = useCallback((nextState: FloatingWindowState) => {
    if (Object.is(stateRef.current, nextState)) return;
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const updateWindow = useCallback(
    (
      windowId: string,
      updater: (win: FloatingWindowInstance) => FloatingWindowInstance,
    ) => {
      const updatedAt = options.lifecycle?.now?.() ?? new Date().toISOString();
      const current = stateRef.current;

      commitState({
        ...current,
        windows: current.windows.map((win) =>
          win.id === windowId ? { ...updater(win), updatedAt } : win,
        ),
      });
    },
    [commitState, options.lifecycle],
  );

  const adapter = useMemo<FloatingHostAdapter>(
    () => ({
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
        const result = openFloatingWindow(
          stateRef.current,
          input,
          options.lifecycle,
        );
        commitState(result.state);
        return result.windowId;
      },

      closeWindow(windowId) {
        commitState(closeFloatingWindow(stateRef.current, windowId));
      },

      focusWindow(windowId) {
        commitState(
          focusFloatingWindow(stateRef.current, windowId, options.lifecycle),
        );
      },

      minimizeWindow(windowId) {
        commitState(
          minimizeFloatingWindow(stateRef.current, windowId, options.lifecycle),
        );
      },

      restoreWindow(windowId) {
        commitState(
          restoreFloatingWindowInState(
            stateRef.current,
            windowId,
            options.lifecycle,
          ),
        );
      },

      maximizeWindow(windowId) {
        commitState(
          maximizeFloatingWindowInState(
            stateRef.current,
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
        commitState(
          updateFloatingWindowTitle(
            stateRef.current,
            windowId,
            title,
            options.lifecycle,
          ),
        );
      },
    }),
    [
      commitState,
      options.bounds,
      options.hostId,
      options.lifecycle,
      state.focusedWindowId,
      state.windows,
      updateWindow,
    ],
  );

  return adapter;
}
