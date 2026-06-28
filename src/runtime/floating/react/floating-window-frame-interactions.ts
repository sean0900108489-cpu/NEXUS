export type FloatingWindowDragInput = {
  pointerX: number;
  pointerY: number;
  startPointerX: number;
  startPointerY: number;
  startWindowX: number;
  startWindowY: number;
};

export type FloatingWindowDragGateInput = {
  maximized: boolean;
  positionLocked: boolean;
};

export type FloatingWindowResizeInput = {
  minHeight: number;
  minWidth: number;
  pointerX: number;
  pointerY: number;
  startHeight: number;
  startPointerX: number;
  startPointerY: number;
  startWidth: number;
};

export function calculateFloatingWindowDragPosition({
  pointerX,
  pointerY,
  startPointerX,
  startPointerY,
  startWindowX,
  startWindowY,
}: FloatingWindowDragInput) {
  return {
    x: startWindowX + pointerX - startPointerX,
    y: startWindowY + pointerY - startPointerY,
  };
}

export function shouldStartFloatingWindowDrag({
  maximized,
  positionLocked,
}: FloatingWindowDragGateInput) {
  return !maximized && !positionLocked;
}

export function calculateFloatingWindowResizeSize({
  minHeight,
  minWidth,
  pointerX,
  pointerY,
  startHeight,
  startPointerX,
  startPointerY,
  startWidth,
}: FloatingWindowResizeInput) {
  return {
    height: Math.max(minHeight, startHeight + pointerY - startPointerY),
    width: Math.max(minWidth, startWidth + pointerX - startPointerX),
  };
}
