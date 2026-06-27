/**
 * NEXUS Window OS — NexusDesktopShell
 *
 * Top-level desktop shell that:
 * - Hydrates window state from localStorage on boot
 * - Renders the WindowManager for all open windows
 * - Provides a taskbar with launcher buttons (icons from registry)
 * - Enforces singleton window rules
 * - Shows taskbar items for minimized windows
 * - Measures desktop bounds (viewport minus taskbar)
 * - Provides Command Palette (Cmd/Ctrl+K)
 * - Provides Notification Center (floating toasts)
 * - Constrains windows to viewport on resize
 * - Auto-maximizes new windows on small screens
 *
 * Does NOT contain any feature business logic.
 * All window content comes from the App Registry.
 * Launcher icons are derived from the registry's `icon` field.
 *
 * @module kernel/window/NexusDesktopShell
 */

"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MessageCircle,
  User,
  StickyNote,
  MessageSquare,
  LayoutGrid,
  Settings,
  FlaskConical,
  Store,
  Image as ImageIcon,
  FolderOpen,
  Code,
  Search,
} from "lucide-react";
import { useWindowStore } from "./window-store";
import { getAllRegisteredApps, getWindowApp } from "./window-registry";
import { WindowManager } from "./WindowManager";
import {
  constrainAllToViewport,
  cascadeWindows,
  snapWindowLeft,
  snapWindowRight,
} from "./window-layout";
import { registerCommand, getAllCommands } from "@/kernel/commands/command-registry";
import { createDefaultCommands } from "@/kernel/commands/default-commands";
import { NotificationCenter } from "@/kernel/notifications/NotificationCenter";
import type { NexusWindowKind } from "./window-types";

// ── Constants ──────────────────────────────────────────────────────

const TASKBAR_HEIGHT = 48;

// ── Icon Resolver ──────────────────────────────────────────────────

const KNOWN_ICONS: Record<string, ReactNode> = {
  "message-circle": <MessageCircle className="w-5 h-5" />,
  user: <User className="w-5 h-5" />,
  "sticky-note": <StickyNote className="w-5 h-5" />,
  "message-square": <MessageSquare className="w-5 h-5" />,
  "layout-grid": <LayoutGrid className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
  flask: <FlaskConical className="w-5 h-5" />,
  store: <Store className="w-5 h-5" />,
  image: <ImageIcon className="w-5 h-5" />,
  "folder-open": <FolderOpen className="w-5 h-5" />,
  code: <Code className="w-5 h-5" />,
};

function resolveIcon(iconName?: string): ReactNode {
  if (!iconName) return <span className="text-sm">📦</span>;
  if (/^[\p{Emoji}]/u.test(iconName)) {
    return <span className="text-sm">{iconName}</span>;
  }
  return KNOWN_ICONS[iconName] ?? <span className="text-sm">📦</span>;
}

// ── Component ──────────────────────────────────────────────────────

export function NexusDesktopShell() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [desktopBounds, setDesktopBounds] = useState({ width: 1200, height: 780 });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const paletteInputRef = useRef<HTMLInputElement | null>(null);

  const windows = useWindowStore((s) => s.windows);
  const focusedWindowId = useWindowStore((s) => s.focusedWindowId);
  const storeHydrated = useWindowStore((s) => s.hydrated);
  const hydrated = storeHydrated;
  const openWindow = useWindowStore((s) => s.openWindow);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const resizeWindow = useWindowStore((s) => s.resizeWindow);
  const hydrateFromPersistence = useWindowStore((s) => s.hydrateFromPersistence);

  // ── Hydration ───────────────────────────────────────────

  useEffect(() => {
    hydrateFromPersistence();
  }, [hydrateFromPersistence]);

  // ── Desktop Measurement ─────────────────────────────────

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      const maxW = Math.max(rect.width, 320);
      const maxH = Math.max(rect.height - TASKBAR_HEIGHT, 200);
      setDesktopBounds((prev) => {
        if (prev.width === maxW && prev.height === maxH) return prev;

        // Constrain all windows to new viewport on resize
        const layouts = constrainAllToViewport(
          useWindowStore.getState().windows,
          { width: maxW, height: maxH },
        );
        for (const [id, layout] of layouts) {
          moveWindow(id, layout.x, layout.y);
          resizeWindow(id, layout.width, layout.height);
        }

        return { width: maxW, height: maxH };
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [moveWindow, resizeWindow]);

  // ── Launcher ─────────────────────────────────────────────

  const isSmallScreen = desktopBounds.width < 640 || desktopBounds.height < 400;

  const handleLaunch = useCallback(
    (kind: NexusWindowKind) => {
      const appDef = getWindowApp(kind);
      if (!appDef) return;

      const windowId = openWindow({
        kind,
        title: appDef.title,
        scope: appDef.scope,
        defaultSize: appDef.defaultSize,
        singleton: appDef.singleton,
      });

      if (isSmallScreen) {
        requestAnimationFrame(() => {
          useWindowStore.getState().maximizeWindow(windowId, desktopBounds);
        });
      }
    },
    [openWindow, desktopBounds, isSmallScreen],
  );

  // ── Layout Actions ──────────────────────────────────────

  const handleCascade = useCallback(() => {
    const state = useWindowStore.getState();
    const layouts = cascadeWindows(state.windows, desktopBounds);
    for (const [id, layout] of layouts) {
      state.moveWindow(id, layout.x, layout.y);
    }
  }, [desktopBounds]);

  const handleSnapLeft = useCallback(() => {
    const state = useWindowStore.getState();
    const focused = state.windows.find((w) => w.id === state.focusedWindowId);
    if (!focused) return;
    const layout = snapWindowLeft(focused, desktopBounds);
    state.moveWindow(focused.id, layout.x, layout.y);
    state.resizeWindow(focused.id, layout.width, layout.height);
  }, [desktopBounds]);

  const handleSnapRight = useCallback(() => {
    const state = useWindowStore.getState();
    const focused = state.windows.find((w) => w.id === state.focusedWindowId);
    if (!focused) return;
    const layout = snapWindowRight(focused, desktopBounds);
    state.moveWindow(focused.id, layout.x, layout.y);
    state.resizeWindow(focused.id, layout.width, layout.height);
  }, [desktopBounds]);

  const handleMaximizeFocused = useCallback(() => {
    const state = useWindowStore.getState();
    if (!state.focusedWindowId) return;
    state.maximizeWindow(state.focusedWindowId, desktopBounds);
  }, [desktopBounds]);

  // ── Commands ────────────────────────────────────────────

  useEffect(() => {
    if (!hydrated) return;

    const commands = createDefaultCommands({
      openWindow: (kind) => handleLaunch(kind as NexusWindowKind),
      snapLeft: handleSnapLeft,
      snapRight: handleSnapRight,
      cascadeWindows: handleCascade,
      maximizeFocused: handleMaximizeFocused,
      resetLayout: handleCascade,
    });

    for (const cmd of commands) {
      registerCommand(cmd);
    }
  }, [hydrated, handleLaunch, handleSnapLeft, handleSnapRight, handleCascade, handleMaximizeFocused]);

  // ── Keyboard Shortcut: Cmd/Ctrl+K → Palette ─────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        setPaletteQuery("");
      }
      if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen]);

  // Focus palette input when opened
  useEffect(() => {
    if (paletteOpen) {
      setTimeout(() => paletteInputRef.current?.focus(), 50);
    }
  }, [paletteOpen]);

  // ── Palette commands ─────────────────────────────────────

  const allCommands = getAllCommands();

  const filteredCommands = useMemo(() => {
    if (!paletteQuery.trim()) return allCommands;
    const q = paletteQuery.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.detail?.toLowerCase().includes(q) ||
        cmd.id.toLowerCase().includes(q),
    );
  }, [allCommands, paletteQuery]);

  // ── Data ─────────────────────────────────────────────────

  const launcherApps = getAllRegisteredApps();
  const minimizedWindows = windows.filter((w) => w.minimized);

  // ── Boot Screen ──────────────────────────────────────────

  if (!hydrated) {
    return (
      <div className="nexus-desktop-shell h-dvh w-dvw overflow-hidden bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center text-white/10 animate-pulse">
          <p className="text-3xl font-light">NEXUS</p>
          <p className="text-xs mt-2">Window OS</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="nexus-desktop-shell h-dvh w-dvw overflow-hidden bg-[#0a0a0f] flex flex-col"
    >
      {/* Desktop Area */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 70%)",
        }}
      >
        <WindowManager desktopBounds={desktopBounds} />
      </div>

      {/* Notification Center (floating) */}
      <NotificationCenter />

      {/* Command Palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPaletteOpen(false)}
          />

          {/* Palette */}
          <div className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <Search className="w-4 h-4 text-white/30 shrink-0" />
              <input
                ref={paletteInputRef}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
                placeholder="Type a command..."
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setPaletteOpen(false);
                  if (e.key === "Enter" && filteredCommands.length > 0) {
                    filteredCommands[0].run();
                    setPaletteOpen(false);
                  }
                }}
              />
              <kbd className="text-[10px] text-white/15 bg-white/5 px-1.5 py-0.5 rounded">
                esc
              </kbd>
            </div>

            {/* Command List */}
            <div className="max-h-72 overflow-y-auto p-1">
              {filteredCommands.length === 0 ? (
                <p className="px-3 py-4 text-xs text-white/20 text-center">
                  No commands match <span>{paletteQuery}</span>
                </p>
              ) : (
                filteredCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-left hover:bg-white/5 transition-colors"
                    onClick={() => {
                      cmd.run();
                      setPaletteOpen(false);
                    }}
                  >
                    <span className="text-xs text-white/70 flex-1 truncate">
                      {cmd.label}
                    </span>
                    {cmd.detail && (
                      <span className="text-[10px] text-white/25 hidden sm:inline truncate max-w-[200px]">
                        {cmd.detail}
                      </span>
                    )}
                    {cmd.shortcut && (
                      <kbd className="text-[10px] text-white/15 bg-white/5 px-1.5 py-0.5 rounded shrink-0">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Taskbar */}
      <div
        className="flex items-center gap-0.5 px-1.5 sm:px-2 shrink-0 select-none overflow-x-auto"
        style={{
          height: TASKBAR_HEIGHT,
          background: "rgba(18, 18, 28, 0.85)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {/* Launcher Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {launcherApps.map((appDef) => {
            const isOpen = windows.some(
              (w) => w.kind === appDef.kind && !w.minimized,
            );
            const icon = resolveIcon(appDef.icon);

            return (
              <button
                key={appDef.kind}
                className={`flex items-center gap-1 px-2 sm:gap-1.5 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                  isOpen
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => handleLaunch(appDef.kind)}
                title={`${appDef.title}${appDef.singleton ? " (singleton)" : ""}`}
              >
                {icon}
                <span className="hidden sm:inline">{appDef.title}</span>
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-2" />

        {/* Minimized Windows */}
        <div className="flex items-center gap-0.5 shrink-0">
          {minimizedWindows.slice(0, 8).map((win) => {
            const appDef = getWindowApp(win.kind);
            const icon = resolveIcon(appDef?.icon);

            return (
              <button
                key={win.id}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-150 max-w-[120px] sm:max-w-[160px] truncate ${
                  focusedWindowId === win.id
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => {
                  restoreWindow(win.id);
                  focusWindow(win.id);
                }}
                title={win.title}
              >
                {icon}
                <span className="truncate hidden sm:inline">{win.title}</span>
              </button>
            );
          })}
        </div>

        {/* Clock */}
        <div className="ml-1 sm:ml-3 text-[10px] sm:text-xs text-white/30 px-1 sm:px-2 shrink-0 hidden xs:block">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
