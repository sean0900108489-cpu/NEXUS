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
