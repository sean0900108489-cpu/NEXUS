import { describe, expect, it } from "vitest";

import {
  calculateFloatingWindowResizeSize,
  calculateFloatingWindowDragPosition,
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
});
