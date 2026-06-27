/**
 * NEXUS Window OS — WindowFrame
 *
 * Shared window chrome for ALL window apps.
 * Handles:
 * - Title bar with window title
 * - Close / minimize / maximize / restore buttons
 * - Drag handle (via onMouseDown)
 * - Resize handle (bottom-right corner)
 * - Focus on click
 * - Shell-level styling only (NO business logic)
 *
 * @module kernel/window/WindowFrame
 */

"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import type { NexusWindow } from "./window-types";
import { useWindowStore } from "./window-store";

// ── Constants ──────────────────────────────────────────────────────

const MIN_WINDOW_WIDTH = 280;
const MIN_WINDOW_HEIGHT = 160;
const RESIZE_HANDLE_SIZE = 12;
const TASKBAR_HEIGHT = 48; // reserved space at bottom

// ── Props ──────────────────────────────────────────────────────────

type WindowFrameProps = {
  window: NexusWindow;
  desktopBounds: { width: number; height: number };
  children: ReactNode;
};

// ── Component ──────────────────────────────────────────────────────

export function WindowFrame({ window: win, desktopBounds, children }: WindowFrameProps) {
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const maximizeWindow = useWindowStore((s) => s.maximizeWindow);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const resizeWindow = useWindowStore((s) => s.resizeWindow);

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // ── Focus ────────────────────────────────────────────────

  const handleFocus = useCallback(() => {
    focusWindow(win.id);
  }, [focusWindow, win.id]);

  // ── Drag ─────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (e: ReactMouseEvent) => {
      if (win.maximized) return;
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: win.layout.x,
        origY: win.layout.y,
      };
      setIsDragging(true);

      const handleDragMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        moveWindow(win.id, dragRef.current.origX + dx, dragRef.current.origY + dy);
      };

      const handleDragEnd = () => {
        dragRef.current = null;
        setIsDragging(false);
        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
      };

      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
    },
    [win.id, win.layout.x, win.layout.y, win.maximized, moveWindow],
  );

  // ── Resize ───────────────────────────────────────────────

  const handleResizeStart = useCallback(
    (e: ReactMouseEvent) => {
      if (win.maximized) return;
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: win.layout.width,
        origH: win.layout.height,
      };
      setIsResizing(true);

      const handleResizeMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = ev.clientX - resizeRef.current.startX;
        const dy = ev.clientY - resizeRef.current.startY;
        const newW = Math.max(MIN_WINDOW_WIDTH, resizeRef.current.origW + dx);
        const newH = Math.max(MIN_WINDOW_HEIGHT, resizeRef.current.origH + dy);
        resizeWindow(win.id, newW, newH);
      };

      const handleResizeEnd = () => {
        resizeRef.current = null;
        setIsResizing(false);
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
      };

      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
    },
    [win.id, win.layout.width, win.layout.height, win.maximized, resizeWindow],
  );

  // ── Button Handlers ──────────────────────────────────────

  const handleMinimize = useCallback(
    (e: ReactMouseEvent) => {
      e.stopPropagation();
      minimizeWindow(win.id);
    },
    [minimizeWindow, win.id],
  );

  const handleMaxRestore = useCallback(
    (e: ReactMouseEvent) => {
      e.stopPropagation();
      if (win.maximized) {
        restoreWindow(win.id);
      } else {
        maximizeWindow(win.id, desktopBounds);
      }
    },
    [win.maximized, win.id, maximizeWindow, restoreWindow, desktopBounds],
  );

  const handleClose = useCallback(
    (e: ReactMouseEvent) => {
      e.stopPropagation();
      closeWindow(win.id);
    },
    [closeWindow, win.id],
  );

  // ── Layout Calculation ───────────────────────────────────

  const layout = win.maximized
    ? { x: 0, y: 0, width: desktopBounds.width, height: desktopBounds.height }
    : win.layout;

  const isFocused = useWindowStore((s) => s.focusedWindowId === win.id);

  // ── Render ───────────────────────────────────────────────

  if (win.minimized) {
    return null; // minimized windows are shown only in the taskbar
  }

  return (
    <div
      className={`nexus-window-frame absolute flex flex-col rounded-lg border border-white/10 shadow-2xl overflow-hidden transition-shadow duration-150 ${
        isFocused
          ? "shadow-black/50 ring-1 ring-white/20 z-50"
          : "shadow-black/30 z-10"
      } ${isDragging ? "cursor-grabbing select-none" : ""} ${isResizing ? "select-none" : ""}`}
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        zIndex: win.layout.zIndex,
        background: "rgba(18, 18, 24, 0.95)",
        backdropFilter: "blur(16px)",
      }}
      onClick={handleFocus}
      onMouseDown={handleFocus}
    >
      {/* ── Title Bar ─────────────────────────────── */}
      <div
        className="flex items-center h-9 px-2 bg-white/5 border-b border-white/5 select-none shrink-0"
        onMouseDown={handleDragStart}
        style={{ cursor: win.maximized ? "default" : "grab" }}
      >
        {/* Window controls (macOS-style left) */}
        <div className="flex items-center gap-1.5 mr-3">
          <button
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors flex items-center justify-center"
            onClick={handleClose}
            aria-label="Close window"
            title="Close"
          >
            <X className="w-2 h-2 text-red-900 opacity-0 hover:opacity-100 transition-opacity" />
          </button>
          <button
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors flex items-center justify-center"
            onClick={handleMinimize}
            aria-label="Minimize window"
            title="Minimize"
          >
            <Minus className="w-2 h-2 text-yellow-900 opacity-0 hover:opacity-100 transition-opacity" />
          </button>
          <button
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors flex items-center justify-center"
            onClick={handleMaxRestore}
            aria-label={win.maximized ? "Restore window" : "Maximize window"}
            title={win.maximized ? "Restore" : "Maximize"}
          >
            {win.maximized ? (
              <Copy className="w-2 h-2 text-green-900 opacity-0 hover:opacity-100 transition-opacity" />
            ) : (
              <Square className="w-2 h-2 text-green-900 opacity-0 hover:opacity-100 transition-opacity" />
            )}
          </button>
        </div>

        {/* Title */}
        <div className="flex-1 text-center text-xs text-white/50 font-medium truncate pointer-events-none">
          {win.title}
        </div>

        {/* Spacer for symmetry */}
        <div className="w-[68px]" />
      </div>

      {/* ── Content Area ─────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto">
        {children}
      </div>

      {/* ── Resize Handle ─────────────────────────────── */}
      {!win.maximized && (
        <div
          className="absolute bottom-0 right-0 cursor-se-resize"
          style={{
            width: RESIZE_HANDLE_SIZE,
            height: RESIZE_HANDLE_SIZE,
          }}
          onMouseDown={handleResizeStart}
          aria-label="Resize window"
        />
      )}
    </div>
  );
}
