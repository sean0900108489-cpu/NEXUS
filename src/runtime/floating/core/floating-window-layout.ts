import type {
  FloatingWindowInstance,
  FloatingWindowLayout,
  FloatingWindowSize,
} from "./floating-window-types";

const DEFAULT_MIN_SIZE: FloatingWindowSize = { width: 280, height: 160 };
const DEFAULT_MIN_VISIBLE_PX = 120;
const CASCADE_OFFSET = 28;
const CASCADE_MAX = 6;

export function constrainFloatingLayoutToBounds(
  layout: FloatingWindowLayout,
  bounds: FloatingWindowSize,
  minSize: FloatingWindowSize = DEFAULT_MIN_SIZE,
  minVisiblePx = DEFAULT_MIN_VISIBLE_PX,
): FloatingWindowLayout {
  const maxX = Math.max(0, bounds.width - minVisiblePx);
  const maxY = Math.max(0, bounds.height - minVisiblePx);

  return {
    ...layout,
    x: Math.max(-layout.width + minVisiblePx, Math.min(layout.x, maxX)),
    y: Math.max(0, Math.min(layout.y, maxY)),
    width: Math.max(minSize.width, Math.min(layout.width, bounds.width)),
    height: Math.max(minSize.height, Math.min(layout.height, bounds.height)),
  };
}

export function maximizeFloatingWindow(
  win: FloatingWindowInstance,
  bounds: FloatingWindowSize,
  padding = 0,
): FloatingWindowInstance {
  return {
    ...win,
    minimized: false,
    maximized: true,
    previousLayout: win.maximized ? win.previousLayout : { ...win.layout },
    layout: {
      x: padding,
      y: padding,
      width: Math.max(0, bounds.width - padding * 2),
      height: Math.max(0, bounds.height - padding * 2),
      zIndex: win.layout.zIndex,
    },
  };
}

export function restoreFloatingWindow(win: FloatingWindowInstance): FloatingWindowInstance {
  return {
    ...win,
    layout: win.previousLayout ? { ...win.previousLayout } : win.layout,
    previousLayout: undefined,
    minimized: false,
    maximized: false,
  };
}

export function cascadeFloatingWindows(
  windows: FloatingWindowInstance[],
  bounds: FloatingWindowSize,
): Map<string, FloatingWindowLayout> {
  const layouts = new Map<string, FloatingWindowLayout>();
  const visible = windows.filter((win) => !win.minimized);

  visible.forEach((win, index) => {
    const offset = Math.min(index, CASCADE_MAX) * CASCADE_OFFSET;
    layouts.set(
      win.id,
      constrainFloatingLayoutToBounds(
        {
          ...win.layout,
          x: offset,
          y: offset,
        },
        bounds,
      ),
    );
  });

  return layouts;
}
