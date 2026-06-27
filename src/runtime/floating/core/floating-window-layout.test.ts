import { describe, expect, it } from "vitest";

import {
  constrainFloatingLayoutToBounds,
  maximizeFloatingWindow,
  restoreFloatingWindow,
} from "./floating-window-layout";
import type { FloatingWindowInstance } from "./floating-window-types";

describe("floating window layout", () => {
  it("maximizes with previous layout and restores it exactly", () => {
    const win = makeWindow({
      layout: { x: 48, y: 72, width: 520, height: 420, zIndex: 7 },
    });

    const maximized = maximizeFloatingWindow(win, { width: 1280, height: 720 });

    expect(maximized.maximized).toBe(true);
    expect(maximized.minimized).toBe(false);
    expect(maximized.previousLayout).toEqual({ x: 48, y: 72, width: 520, height: 420, zIndex: 7 });
    expect(maximized.layout).toEqual({ x: 0, y: 0, width: 1280, height: 720, zIndex: 7 });

    expect(restoreFloatingWindow(maximized)).toMatchObject({
      maximized: false,
      minimized: false,
      layout: { x: 48, y: 72, width: 520, height: 420, zIndex: 7 },
      previousLayout: undefined,
    });
  });

  it("constrains layout to host bounds while keeping a visible handle", () => {
    const constrained = constrainFloatingLayoutToBounds(
      { x: -700, y: 900, width: 640, height: 480, zIndex: 3 },
      { width: 390, height: 320 },
      { width: 280, height: 180 },
      96,
    );

    expect(constrained).toEqual({
      x: -544,
      y: 224,
      width: 390,
      height: 320,
      zIndex: 3,
    });
  });
});

function makeWindow(overrides: Partial<FloatingWindowInstance> = {}): FloatingWindowInstance {
  return {
    id: "window-1",
    kind: "feed",
    title: "Feed",
    scope: "workspace",
    layout: { x: 0, y: 0, width: 400, height: 300, zIndex: 1 },
    minimized: false,
    maximized: false,
    createdAt: "2026-06-27T00:00:00.000Z",
    updatedAt: "2026-06-27T00:00:00.000Z",
    ...overrides,
  };
}
