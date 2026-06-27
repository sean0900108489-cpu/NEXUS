import { describe, expect, it } from "vitest";

import { createMemoryFloatingHostAdapter } from "./memory-floating-host";

describe("memory floating host adapter", () => {
  it("exposes the shared host contract over an in-memory window state", () => {
    const host = createMemoryFloatingHostAdapter({
      hostId: "workspace",
      bounds: { width: 1000, height: 700 },
      lifecycle: {
        createId: (kind, index) => `memory-${kind}-${index}`,
        now: () => "2026-06-27T00:00:00.000Z",
      },
    });

    const windowId = host.openWindow({
      kind: "feed",
      title: "Feed",
      scope: "workspace",
      defaultSize: { width: 620, height: 480 },
      singleton: true,
    });

    host.focusWindow(windowId);
    host.minimizeWindow(windowId);
    host.maximizeWindow(windowId);

    expect(host.getBounds()).toEqual({ width: 1000, height: 700 });
    expect(host.getWindows()).toEqual([
      expect.objectContaining({
        id: windowId,
        kind: "feed",
        minimized: false,
        maximized: true,
        previousLayout: { x: 40, y: 40, width: 620, height: 480, zIndex: 2 },
        layout: { x: 0, y: 0, width: 1000, height: 700, zIndex: 2 },
      }),
    ]);

    host.restoreWindow(windowId);
    expect(host.getWindows()[0]).toMatchObject({
      minimized: false,
      maximized: false,
      previousLayout: undefined,
      layout: { x: 40, y: 40, width: 620, height: 480, zIndex: 2 },
    });
  });
});
