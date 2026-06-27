/**
 * NEXUS Window OS — Window Kernel Store
 *
 * Pure window lifecycle management. This store knows NOTHING about
 * global-chat, notes, forum, marketplace, or any business feature.
 *
 * Responsibilities:
 * - openWindow / closeWindow
 * - focusWindow (z-index management)
 * - minimizeWindow / maximizeWindow / restoreWindow
 * - moveWindow / resizeWindow
 * - Persist window layout to localStorage (local-first, no Supabase)
 *
 * @module kernel/window/window-store
 */

"use client";

import { create } from "zustand";
import type {
  NexusWindow,
  NexusWindowKind,
  NexusWindowKernelSnapshot,
  NexusWindowScope,
} from "./window-types";

// ── Helpers ────────────────────────────────────────────────────────

let windowIdCounter = 0;

function makeWindowId(kind: NexusWindowKind): string {
  windowIdCounter += 1;
  return `nexus-window:${kind}:${Date.now().toString(36)}-${windowIdCounter.toString(36)}`;
}

function now(): string {
  return new Date().toISOString();
}

// ── localStorage Persistence ───────────────────────────────────────

const PERSIST_KEY = "nexus-window-os:v1";

function readPersistedSnapshot(): NexusWindowKernelSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NexusWindowKernelSnapshot>;
    if (parsed.version !== 1 || !Array.isArray(parsed.windows)) return null;
    return parsed as NexusWindowKernelSnapshot;
  } catch {
    return null;
  }
}

function writePersistedSnapshot(snapshot: NexusWindowKernelSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage full or unavailable — silently degrade
    console.warn("[WindowStore] Failed to persist window layout.");
  }
}

function snapshotFromState(
  windows: NexusWindow[],
  maxZIndex: number,
  focusedWindowId: string | null,
): NexusWindowKernelSnapshot {
  return {
    version: 1,
    windows: windows.map((w) => ({
      id: w.id,
      kind: w.kind,
      title: w.title,
      resourceId: w.resourceId,
      workspaceId: w.workspaceId,
      scope: w.scope,
      layout: { ...w.layout },
      minimized: w.minimized,
      maximized: w.maximized,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    })),
    maxZIndex,
    focusedWindowId,
    savedAt: now(),
  };
}

function hydrateWindows(
  snapshot: NexusWindowKernelSnapshot,
): { windows: NexusWindow[]; maxZIndex: number; focusedWindowId: string | null } {
  // Restore the window ID counter to avoid collisions
  const maxExistingCounter = snapshot.windows.reduce((max, w) => {
    const match = /-([0-9a-z]+)$/.exec(w.id);
    if (match) {
      const num = parseInt(match[1], 36);
      if (!isNaN(num) && num > max) return num;
    }
    return max;
  }, 0);
  windowIdCounter = maxExistingCounter;

  const windows: NexusWindow[] = snapshot.windows.map((w) => ({
    id: w.id,
    kind: w.kind,
    title: w.title,
    resourceId: w.resourceId,
    workspaceId: w.workspaceId,
    scope: w.scope,
    layout: { ...w.layout },
    minimized: w.minimized,
    maximized: w.maximized,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }));

  return {
    windows,
    maxZIndex: snapshot.maxZIndex,
    focusedWindowId: snapshot.focusedWindowId,
  };
}

// ── State Shape ────────────────────────────────────────────────────

type WindowKernelState = {
  /** All open windows, ordered by creation time */
  windows: NexusWindow[];

  /** Current highest z-index (for stacking) */
  maxZIndex: number;

  /** Currently focused window ID */
  focusedWindowId: string | null;

  /** True once the initial hydration from localStorage is complete */
  hydrated: boolean;
};

// ── Actions ────────────────────────────────────────────────────────

type WindowKernelActions = {
  /**
   * Hydrate from localStorage (call once on boot).
   * If no saved state exists, initialises empty.
   */
  hydrateFromPersistence: () => void;

  /**
   * Open a new window of the given kind.
   * Returns the created window ID so callers can track it.
   *
   * If `singleton` is true and a window of this kind already exists,
   * focuses the existing window instead and returns its ID.
   */
  openWindow: (params: {
    kind: NexusWindowKind;
    title: string;
    scope: NexusWindowScope;
    defaultSize: { width: number; height: number };
    resourceId?: string;
    workspaceId?: string;
    state?: Record<string, unknown>;
    /** If true, reuses an existing window of the same kind if open */
    singleton?: boolean;
  }) => string;

  /** Close a window by ID */
  closeWindow: (windowId: string) => void;

  /** Bring a window to front (set highest z-index) */
  focusWindow: (windowId: string) => void;

  /** Minimize a window to the taskbar */
  minimizeWindow: (windowId: string) => void;

  /** Maximize a window to fill the desktop viewport */
  maximizeWindow: (windowId: string, desktopBounds: { width: number; height: number }) => void;

  /** Restore a minimized or maximized window to its previous layout */
  restoreWindow: (windowId: string) => void;

  /** Move a window to new x,y coordinates */
  moveWindow: (windowId: string, x: number, y: number) => void;

  /** Resize a window to new width,height */
  resizeWindow: (windowId: string, width: number, height: number) => void;

  /** Update a window's opaque state bag (for app use only) */
  updateWindowState: (windowId: string, state: Record<string, unknown>) => void;

  /** Update a window's title */
  updateWindowTitle: (windowId: string, title: string) => void;
};

export type WindowKernelStore = WindowKernelState & WindowKernelActions;

// ── Persistence Debounce ───────────────────────────────────────────

let persistTimer: ReturnType<typeof setTimeout> | undefined;

function schedulePersist(
  windows: NexusWindow[],
  maxZIndex: number,
  focusedWindowId: string | null,
) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    writePersistedSnapshot(
      snapshotFromState(windows, maxZIndex, focusedWindowId),
    );
  }, 300); // 300ms debounce
}

// ── Store ──────────────────────────────────────────────────────────

export const useWindowStore = create<WindowKernelStore>((set, get) => ({
  windows: [],
  maxZIndex: 0,
  focusedWindowId: null,
  hydrated: false,

  hydrateFromPersistence: () => {
    if (get().hydrated) return;
    const snapshot = readPersistedSnapshot();
    if (snapshot && snapshot.windows.length > 0) {
      const hydrated = hydrateWindows(snapshot);
      set({ ...hydrated, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },

  openWindow: (params) => {
    // Check singleton: if a window of this kind already exists, focus it
    if (params.singleton) {
      const existing = get().windows.find(
        (w) => w.kind === params.kind && !w.minimized,
      );
      if (existing) {
        // Focus and restore if minimized
        const nextZ = get().maxZIndex + 1;
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === existing.id
              ? {
                  ...w,
                  minimized: false,
                  layout: { ...w.layout, zIndex: nextZ },
                  updatedAt: now(),
                }
              : w,
          ),
          maxZIndex: nextZ,
          focusedWindowId: existing.id,
        }));
        return existing.id;
      }
      // If a minimized singleton window exists, restore it
      const minimized = get().windows.find(
        (w) => w.kind === params.kind && w.minimized,
      );
      if (minimized) {
        const nextZ = get().maxZIndex + 1;
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === minimized.id
              ? {
                  ...w,
                  minimized: false,
                  layout: { ...w.layout, zIndex: nextZ },
                  updatedAt: now(),
                }
              : w,
          ),
          maxZIndex: nextZ,
          focusedWindowId: minimized.id,
        }));
        return minimized.id;
      }
    }

    const id = makeWindowId(params.kind);
    const nextZ = get().maxZIndex + 1;

    const window: NexusWindow = {
      id,
      kind: params.kind,
      title: params.title,
      resourceId: params.resourceId,
      workspaceId: params.workspaceId,
      scope: params.scope,
      layout: {
        x: Math.max(40, (get().windows.length * 30) + 40),
        y: Math.max(40, (get().windows.length * 30) + 40),
        width: params.defaultSize.width,
        height: params.defaultSize.height,
        zIndex: nextZ,
      },
      minimized: false,
      maximized: false,
      createdAt: now(),
      updatedAt: now(),
      state: params.state,
    };

    set((s) => {
      const next = {
        windows: [...s.windows, window],
        maxZIndex: nextZ,
        focusedWindowId: id,
      };
      schedulePersist(next.windows, nextZ, id);
      return next;
    });

    return id;
  },

  closeWindow: (windowId) => {
    set((s) => {
      const next = {
        windows: s.windows.filter((w) => w.id !== windowId),
        focusedWindowId:
          s.focusedWindowId === windowId ? null : s.focusedWindowId,
      };
      schedulePersist(next.windows, s.maxZIndex, next.focusedWindowId);
      return next;
    });
  },

  focusWindow: (windowId) => {
    const nextZ = get().maxZIndex + 1;

    set((s) => {
      const next = {
        windows: s.windows.map((w) =>
          w.id === windowId
            ? { ...w, layout: { ...w.layout, zIndex: nextZ }, updatedAt: now() }
            : w,
        ),
        maxZIndex: nextZ,
        focusedWindowId: windowId,
      };
      schedulePersist(next.windows, nextZ, windowId);
      return next;
    });
  },

  minimizeWindow: (windowId) => {
    set((s) => {
      const next = {
        windows: s.windows.map((w) =>
          w.id === windowId
            ? { ...w, minimized: true, updatedAt: now() }
            : w,
        ),
      };
      schedulePersist(next.windows, s.maxZIndex, s.focusedWindowId);
      return next;
    });
  },

  maximizeWindow: (windowId, desktopBounds) => {
    set((s) => {
      const next = {
        windows: s.windows.map((w) =>
          w.id === windowId
            ? {
                ...w,
                maximized: true,
                minimized: false,
                layout: {
                  x: 0,
                  y: 0,
                  width: desktopBounds.width,
                  height: desktopBounds.height,
                  zIndex: w.layout.zIndex,
                },
                updatedAt: now(),
              }
            : w,
        ),
      };
      schedulePersist(next.windows, s.maxZIndex, s.focusedWindowId);
      return next;
    });
  },

  restoreWindow: (windowId) => {
    set((s) => {
      const next = {
        windows: s.windows.map((w) =>
          w.id === windowId
            ? { ...w, minimized: false, maximized: false, updatedAt: now() }
            : w,
        ),
      };
      schedulePersist(next.windows, s.maxZIndex, s.focusedWindowId);
      return next;
    });
  },

  moveWindow: (windowId, x, y) => {
    set((s) => {
      const next = {
        windows: s.windows.map((w) =>
          w.id === windowId
            ? {
                ...w,
                layout: { ...w.layout, x, y },
                updatedAt: now(),
              }
            : w,
        ),
      };
      schedulePersist(next.windows, s.maxZIndex, s.focusedWindowId);
      return next;
    });
  },

  resizeWindow: (windowId, width, height) => {
    set((s) => {
      const next = {
        windows: s.windows.map((w) =>
          w.id === windowId
            ? {
                ...w,
                layout: { ...w.layout, width, height },
                updatedAt: now(),
              }
            : w,
        ),
      };
      schedulePersist(next.windows, s.maxZIndex, s.focusedWindowId);
      return next;
    });
  },

  updateWindowState: (windowId, state) => {
    set((s) => {
      const next = {
        windows: s.windows.map((w) =>
          w.id === windowId ? { ...w, state, updatedAt: now() } : w,
        ),
      };
      schedulePersist(next.windows, s.maxZIndex, s.focusedWindowId);
      return next;
    });
  },

  updateWindowTitle: (windowId, title) => {
    set((s) => {
      const next = {
        windows: s.windows.map((w) =>
          w.id === windowId ? { ...w, title, updatedAt: now() } : w,
        ),
      };
      schedulePersist(next.windows, s.maxZIndex, s.focusedWindowId);
      return next;
    });
  },
}));
