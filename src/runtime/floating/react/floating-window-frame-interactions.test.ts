import { describe, expect, it } from "vitest";

import {
  calculateFloatingWindowResizeGeometry,
  calculateFloatingWindowResizeSize,
  calculateFloatingWindowDragPosition,
  shouldStartFloatingWindowResize,
  shouldStartFloatingWindowDrag,
} from "./floating-window-frame-interactions";

describe("floating window frame interactions", () => {
  it("calculates a dragged window position from pointer deltas", () => {
    expect(
      calculateFloatingWindowDragPosition({
        pointerX: 180,
        pointerY: 140,
        startPointerX: 120,
        startPointerY: 90,
        startWindowX: 24,
        startWindowY: 32,
      }),
    ).toEqual({ x: 84, y: 82 });
  });

  it("keeps dragged windows inside the host bounds", () => {
    expect(
      calculateFloatingWindowDragPosition({
        bounds: { width: 900, height: 640 },
        height: 320,
        pointerX: 940,
        pointerY: 700,
        startPointerX: 120,
        startPointerY: 90,
        startWindowX: 24,
        startWindowY: 32,
        width: 500,
      }),
    ).toEqual({ x: 400, y: 320 });
  });

  it("does not start dragging when the window is maximized or locked", () => {
    expect(
      shouldStartFloatingWindowDrag({
        maximized: false,
        positionLocked: false,
      }),
    ).toBe(true);
    expect(
      shouldStartFloatingWindowDrag({
        maximized: true,
        positionLocked: false,
      }),
    ).toBe(false);
    expect(
      shouldStartFloatingWindowDrag({
        maximized: false,
        positionLocked: true,
      }),
    ).toBe(false);
  });

  it("does not start resizing when the window is maximized or locked", () => {
    expect(
      shouldStartFloatingWindowResize({
        maximized: false,
        positionLocked: false,
      }),
    ).toBe(true);
    expect(
      shouldStartFloatingWindowResize({
        maximized: true,
        positionLocked: false,
      }),
    ).toBe(false);
    expect(
      shouldStartFloatingWindowResize({
        maximized: false,
        positionLocked: true,
      }),
    ).toBe(false);
  });

  it("calculates resized dimensions from pointer deltas while respecting app min size", () => {
    expect(
      calculateFloatingWindowResizeSize({
        minHeight: 260,
        minWidth: 360,
        pointerX: 650,
        pointerY: 520,
        startHeight: 420,
        startPointerX: 600,
        startPointerY: 480,
        startWidth: 640,
      }),
    ).toEqual({ height: 460, width: 690 });

    expect(
      calculateFloatingWindowResizeSize({
        minHeight: 260,
        minWidth: 360,
        pointerX: 280,
        pointerY: 190,
        startHeight: 420,
        startPointerX: 600,
        startPointerY: 480,
        startWidth: 640,
      }),
    ).toEqual({ height: 260, width: 360 });
  });

  it("resizes from any edge or corner while preserving the opposite edge", () => {
    const start = {
      minHeight: 260,
      minWidth: 360,
      pointerX: 140,
      pointerY: 120,
      startHeight: 420,
      startPointerX: 100,
      startPointerY: 100,
      startWidth: 640,
      startWindowX: 80,
      startWindowY: 70,
    };

    expect(calculateFloatingWindowResizeGeometry({ ...start, direction: "e" }))
      .toEqual({ height: 420, width: 680, x: 80, y: 70 });
    expect(calculateFloatingWindowResizeGeometry({ ...start, direction: "s" }))
      .toEqual({ height: 440, width: 640, x: 80, y: 70 });
    expect(calculateFloatingWindowResizeGeometry({ ...start, direction: "w" }))
      .toEqual({ height: 420, width: 600, x: 120, y: 70 });
    expect(calculateFloatingWindowResizeGeometry({ ...start, direction: "n" }))
      .toEqual({ height: 400, width: 640, x: 80, y: 90 });
    expect(calculateFloatingWindowResizeGeometry({ ...start, direction: "nw" }))
      .toEqual({ height: 400, width: 600, x: 120, y: 90 });
    expect(calculateFloatingWindowResizeGeometry({ ...start, direction: "se" }))
      .toEqual({ height: 440, width: 680, x: 80, y: 70 });
  });

  it("clamps edge resizing to min size and host bounds", () => {
    const start = {
      bounds: { width: 900, height: 640 },
      minHeight: 260,
      minWidth: 360,
      pointerX: 700,
      pointerY: 520,
      startHeight: 420,
      startPointerX: 100,
      startPointerY: 100,
      startWidth: 640,
      startWindowX: 80,
      startWindowY: 70,
    };

    expect(calculateFloatingWindowResizeGeometry({ ...start, direction: "se" }))
      .toEqual({ height: 570, width: 820, x: 80, y: 70 });
    expect(calculateFloatingWindowResizeGeometry({
      ...start,
      direction: "nw",
      pointerX: 900,
      pointerY: 700,
    })).toEqual({ height: 260, width: 360, x: 360, y: 230 });
    expect(calculateFloatingWindowResizeGeometry({
      ...start,
      direction: "nw",
      pointerX: -80,
      pointerY: -60,
    })).toEqual({ height: 490, width: 720, x: 0, y: 0 });
  });
});
