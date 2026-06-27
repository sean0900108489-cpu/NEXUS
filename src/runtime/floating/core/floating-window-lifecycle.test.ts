import { describe, expect, it } from "vitest";

import {
  createEmptyFloatingWindowState,
  focusFloatingWindow,
  maximizeFloatingWindowInState,
  minimizeFloatingWindow,
  openFloatingWindow,
  restoreFloatingWindowInState,
  updateFloatingWindowTitle,
} from "./floating-window-lifecycle";

describe("floating window lifecycle", () => {
  it("opens singleton windows by focusing the existing instance", () => {
    const first = openFloatingWindow(createEmptyFloatingWindowState(), {
      kind: "feed",
      title: "Feed",
      scope: "workspace",
      defaultSize: { width: 620, height: 480 },
      singleton: true,
    }, testOptions);

    const second = openFloatingWindow(first.state, {
      kind: "feed",
      title: "Feed",
      scope: "workspace",
      defaultSize: { width: 620, height: 480 },
      singleton: true,
    }, testOptions);

    expect(second.windowId).toBe(first.windowId);
    expect(second.state.windows).toHaveLength(1);
    expect(second.state.focusedWindowId).toBe(first.windowId);
    expect(second.state.maxZIndex).toBe(2);
  });

  it("supports multiple windows, focus, minimize, maximize, and restore", () => {
    const first = openFloatingWindow(createEmptyFloatingWindowState(), {
      kind: "notes",
      title: "Notes",
      scope: "workspace",
      defaultSize: { width: 500, height: 400 },
      allowMultiple: true,
    }, testOptions);
    const second = openFloatingWindow(first.state, {
      kind: "notes",
      title: "Notes",
      scope: "workspace",
      defaultSize: { width: 500, height: 400 },
      allowMultiple: true,
    }, testOptions);

    expect(second.state.windows).toHaveLength(2);
    expect(second.windowId).not.toBe(first.windowId);

    const focused = focusFloatingWindow(second.state, first.windowId, testOptions);
    expect(focused.focusedWindowId).toBe(first.windowId);
    expect(focused.windows.find((win) => win.id === first.windowId)?.layout.zIndex).toBe(3);

    const minimized = minimizeFloatingWindow(focused, first.windowId, testOptions);
    expect(minimized.windows.find((win) => win.id === first.windowId)?.minimized).toBe(true);

    const maximized = maximizeFloatingWindowInState(
      minimized,
      first.windowId,
      { width: 1200, height: 800 },
      testOptions,
    );
    const maximizedWindow = maximized.windows.find((win) => win.id === first.windowId);
    expect(maximizedWindow).toMatchObject({
      minimized: false,
      maximized: true,
      previousLayout: { x: 40, y: 40, width: 500, height: 400, zIndex: 3 },
      layout: { x: 0, y: 0, width: 1200, height: 800, zIndex: 3 },
    });

    const restored = restoreFloatingWindowInState(maximized, first.windowId, testOptions);
    expect(restored.windows.find((win) => win.id === first.windowId)).toMatchObject({
      minimized: false,
      maximized: false,
      previousLayout: undefined,
      layout: { x: 40, y: 40, width: 500, height: 400, zIndex: 3 },
    });
  });

  it("does not mutate state when a title update repeats the same title", () => {
    const opened = openFloatingWindow(createEmptyFloatingWindowState(), {
      kind: "developer-inspector",
      title: "Developer Inspector",
      scope: "account",
      defaultSize: { width: 680, height: 520 },
      singleton: true,
    }, testOptions);

    const repeated = updateFloatingWindowTitle(
      opened.state,
      opened.windowId,
      "Developer Inspector",
      testOptions,
    );

    expect(repeated).toBe(opened.state);

    const renamed = updateFloatingWindowTitle(
      opened.state,
      opened.windowId,
      "Dev Inspector",
      {
        ...testOptions,
        now: () => "2026-06-27T00:01:00.000Z",
      },
    );

    expect(renamed).not.toBe(opened.state);
    expect(renamed.windows.find((win) => win.id === opened.windowId)).toMatchObject({
      title: "Dev Inspector",
      updatedAt: "2026-06-27T00:01:00.000Z",
    });
  });
});

const testOptions = {
  createId: (kind: string, index: number) => `test-${kind}-${index}`,
  now: () => "2026-06-27T00:00:00.000Z",
};
