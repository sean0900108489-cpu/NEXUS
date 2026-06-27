/**
 * NEXUS Window OS — Window Layout Utilities
 *
 * Pure functions for arranging windows on the desktop.
 * No UI, no side effects — just math.
 *
 * @module kernel/window/window-layout
 */

import type { NexusWindow, NexusWindowLayout } from "./window-types";

// ── Constants ──────────────────────────────────────────────────────

const SNAP_RATIO = 0.5;
const CASCADE_OFFSET = 28;
const CASCADE_MAX = 6;

// ── Snap ───────────────────────────────────────────────────────────

/**
 * Snap a window to the left half of the desktop.
 */
export function snapWindowLeft(
  win: NexusWindow,
  desktopBounds: { width: number; height: number },
): NexusWindowLayout {
  return {
    ...win.layout,
    x: 0,
    y: 0,
    width: Math.floor(desktopBounds.width * SNAP_RATIO),
    height: desktopBounds.height,
  };
}

/**
 * Snap a window to the right half of the desktop.
 */
export function snapWindowRight(
  win: NexusWindow,
  desktopBounds: { width: number; height: number },
): NexusWindowLayout {
  const halfW = Math.floor(desktopBounds.width * SNAP_RATIO);
  return {
    ...win.layout,
    x: halfW,
    y: 0,
    width: desktopBounds.width - halfW,
    height: desktopBounds.height,
  };
}

/**
 * Maximize a window to fill the desktop.
 */
export function layoutMaximize(
  win: NexusWindow,
  desktopBounds: { width: number; height: number },
): NexusWindowLayout {
  return {
    ...win.layout,
    x: 0,
    y: 0,
    width: desktopBounds.width,
    height: desktopBounds.height,
  };
}

// ── Cascade ────────────────────────────────────────────────────────

/**
 * Compute cascade layouts for all visible windows.
 * Windows are offset by CASCADE_OFFSET from each other.
 */
export function cascadeWindows(
  windows: NexusWindow[],
  desktopBounds: { width: number; height: number },
): Map<string, NexusWindowLayout> {
  const result = new Map<string, NexusWindowLayout>();
  const visible = windows.filter((w) => !w.minimized);

  visible.forEach((win, index) => {
    const offset = Math.min(index, CASCADE_MAX) * CASCADE_OFFSET;
    result.set(win.id, {
      ...win.layout,
      x: Math.min(offset, desktopBounds.width - win.layout.width),
      y: Math.min(offset, desktopBounds.height - win.layout.height - 48),
    });
  });

  return result;
}

// ── Constrain ──────────────────────────────────────────────────────

/**
 * Clamp a window layout to stay within the desktop bounds.
 * Ensures at least part of the title bar is always visible.
 */
export function constrainToViewport(
  layout: NexusWindowLayout,
  desktopBounds: { width: number; height: number },
  minVisiblePx = 120,
): NexusWindowLayout {
  const maxX = Math.max(0, desktopBounds.width - minVisiblePx);
  const maxY = Math.max(0, desktopBounds.height - minVisiblePx);

  return {
    ...layout,
    x: Math.max(-layout.width + minVisiblePx, Math.min(layout.x, maxX)),
    y: Math.max(0, Math.min(layout.y, maxY)),
    width: Math.max(280, Math.min(layout.width, desktopBounds.width)),
    height: Math.max(160, Math.min(layout.height, desktopBounds.height)),
  };
}

// ── Batch ──────────────────────────────────────────────────────────

/**
 * Constrain all windows to the current viewport.
 * Useful after a window resize to prevent windows going offscreen.
 */
export function constrainAllToViewport(
  windows: NexusWindow[],
  desktopBounds: { width: number; height: number },
): Map<string, NexusWindowLayout> {
  const result = new Map<string, NexusWindowLayout>();
  for (const win of windows) {
    result.set(win.id, constrainToViewport(win.layout, desktopBounds));
  }
  return result;
}
