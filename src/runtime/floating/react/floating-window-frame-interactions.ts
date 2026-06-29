export type FloatingWindowDragInput = {
  bounds?: FloatingWindowInteractionBounds;
  height?: number;
  pointerX: number;
  pointerY: number;
  startPointerX: number;
  startPointerY: number;
  width?: number;
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

export type FloatingWindowResizeDirection =
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

export type FloatingWindowInteractionBounds = {
  height: number;
  width: number;
};

export type FloatingWindowResizeGeometryInput = FloatingWindowResizeInput & {
  bounds?: FloatingWindowInteractionBounds;
  direction: FloatingWindowResizeDirection;
  startWindowX: number;
  startWindowY: number;
};

export function calculateFloatingWindowDragPosition({
  bounds,
  height,
  pointerX,
  pointerY,
  startPointerX,
  startPointerY,
  width,
  startWindowX,
  startWindowY,
}: FloatingWindowDragInput) {
  const x = startWindowX + pointerX - startPointerX;
  const y = startWindowY + pointerY - startPointerY;

  if (!bounds || width === undefined || height === undefined) {
    return { x, y };
  }

  return {
    x: clamp(x, 0, Math.max(0, bounds.width - width)),
    y: clamp(y, 0, Math.max(0, bounds.height - height)),
  };
}

export function shouldStartFloatingWindowDrag({
  maximized,
  positionLocked,
}: FloatingWindowDragGateInput) {
  return !maximized && !positionLocked;
}

export function shouldStartFloatingWindowResize({
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
  const geometry = calculateFloatingWindowResizeGeometry({
    direction: "se",
    minHeight,
    minWidth,
    pointerX,
    pointerY,
    startHeight,
    startPointerX,
    startPointerY,
    startWidth,
    startWindowX: 0,
    startWindowY: 0,
  });

  return { height: geometry.height, width: geometry.width };
}

export function calculateFloatingWindowResizeGeometry({
  bounds,
  direction,
  minHeight,
  minWidth,
  pointerX,
  pointerY,
  startHeight,
  startPointerX,
  startPointerY,
  startWidth,
  startWindowX,
  startWindowY,
}: FloatingWindowResizeGeometryInput) {
  const deltaX = pointerX - startPointerX;
  const deltaY = pointerY - startPointerY;
  const startRight = startWindowX + startWidth;
  const startBottom = startWindowY + startHeight;
  let x = startWindowX;
  let y = startWindowY;
  let width = startWidth;
  let height = startHeight;

  if (direction.includes("e")) {
    width = Math.max(minWidth, startWidth + deltaX);
    if (bounds) {
      width = Math.min(width, Math.max(minWidth, bounds.width - x));
    }
  }

  if (direction.includes("s")) {
    height = Math.max(minHeight, startHeight + deltaY);
    if (bounds) {
      height = Math.min(height, Math.max(minHeight, bounds.height - y));
    }
  }

  if (direction.includes("w")) {
    const nextX = startWindowX + deltaX;
    x = clamp(nextX, 0, startRight - minWidth);
    width = startRight - x;
  }

  if (direction.includes("n")) {
    const nextY = startWindowY + deltaY;
    y = clamp(nextY, 0, startBottom - minHeight);
    height = startBottom - y;
  }

  return { height, width, x, y };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}
