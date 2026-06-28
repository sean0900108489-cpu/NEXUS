"use client";

import {
  Copy,
  GripHorizontal,
  Lock,
  Maximize2,
  Minus,
  Unlock,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";

import type { FloatingWindowInstance } from "@/runtime/floating";
import {
  calculateFloatingWindowResizeSize,
  calculateFloatingWindowDragPosition,
  shouldStartFloatingWindowDrag,
} from "./floating-window-frame-interactions";

const DEFAULT_MIN_FLOATING_WINDOW_SIZE = { width: 280, height: 180 };

export type FloatingWindowFrameProps = {
  window: FloatingWindowInstance;
  focused: boolean;
  children: ReactNode;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  minSize?: { width: number; height: number };
  zIndexBase?: number;
};

export function FloatingWindowFrame(props: FloatingWindowFrameProps) {
  const { window: win, focused, children } = props;
  const dragRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startWindowX: number;
    startWindowY: number;
  } | null>(null);
  const resizeRef = useRef<{
    startHeight: number;
    startPointerX: number;
    startPointerY: number;
    startWidth: number;
  } | null>(null);
  const [positionLocked, setPositionLocked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const minSize = props.minSize ?? DEFAULT_MIN_FLOATING_WINDOW_SIZE;
  const zIndexBase = props.zIndexBase ?? 0;

  const handleDragStart = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      props.onFocus();

      if (
        !shouldStartFloatingWindowDrag({
          maximized: win.maximized,
          positionLocked,
        })
      ) {
        return;
      }

      dragRef.current = {
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startWindowX: win.layout.x,
        startWindowY: win.layout.y,
      };
      setIsDragging(true);

      const handleDragMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;
        const nextPosition = calculateFloatingWindowDragPosition({
          pointerX: moveEvent.clientX,
          pointerY: moveEvent.clientY,
          ...dragRef.current,
        });
        props.onMove(nextPosition.x, nextPosition.y);
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
    [positionLocked, props, win.layout.x, win.layout.y, win.maximized],
  );

  const togglePositionLock = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setPositionLocked((current) => !current);
      props.onFocus();
    },
    [props],
  );

  const handleResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      props.onFocus();

      if (win.maximized) return;

      resizeRef.current = {
        startHeight: win.layout.height,
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startWidth: win.layout.width,
      };
      setIsResizing(true);

      const handleResizeMove = (moveEvent: MouseEvent) => {
        if (!resizeRef.current) return;
        const nextSize = calculateFloatingWindowResizeSize({
          minHeight: minSize.height,
          minWidth: minSize.width,
          pointerX: moveEvent.clientX,
          pointerY: moveEvent.clientY,
          ...resizeRef.current,
        });
        props.onResize(nextSize.width, nextSize.height);
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
    [
      minSize.height,
      minSize.width,
      props,
      win.layout.height,
      win.layout.width,
      win.maximized,
    ],
  );

  if (win.minimized) {
    return null;
  }

  const layoutStyle: CSSProperties = {
    position: "absolute",
    left: win.layout.x,
    top: win.layout.y,
    width: win.layout.width,
    height: win.layout.height,
    zIndex: zIndexBase + win.layout.zIndex,
  };

  return (
    <section
      aria-label={`${win.title} floating window`}
      className={[
        "nexus-floating-window-frame",
        focused ? "nexus-floating-window-frame--focused" : "",
        "flex flex-col overflow-hidden rounded-md border border-white/10 bg-neutral-950/95 text-white shadow-2xl backdrop-blur-xl",
        isDragging || isResizing ? "select-none" : "",
      ].filter(Boolean).join(" ")}
      data-floating-window-id={win.id}
      data-floating-window-kind={win.kind}
      data-floating-window-scope={win.scope}
      data-focused={focused ? "true" : "false"}
      data-min-height={minSize.height}
      data-min-width={minSize.width}
      data-position-locked={positionLocked ? "true" : "false"}
      onMouseDown={props.onFocus}
      role="dialog"
      style={layoutStyle}
    >
      <header className="nexus-floating-window-frame__titlebar flex h-10 shrink-0 items-center border-b border-white/10 bg-white/[0.04]">
        <button
          aria-label={`Move ${win.title} window`}
          className={[
            "nexus-floating-window-frame__move-handle flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left text-xs font-medium text-white/75",
            shouldStartFloatingWindowDrag({
              maximized: win.maximized,
              positionLocked,
            })
              ? "cursor-grab active:cursor-grabbing"
              : "cursor-default",
          ].join(" ")}
          onMouseDown={handleDragStart}
          type="button"
        >
          <GripHorizontal aria-hidden="true" className="size-4 shrink-0 text-white/35" />
          <span className="min-w-0 truncate">{win.title}</span>
        </button>
        <div className="nexus-floating-window-frame__controls flex items-center gap-1 px-2">
          <button
            aria-label={positionLocked ? "Unlock window position" : "Lock window position"}
            className="grid size-7 place-items-center rounded border border-white/10 bg-white/[0.04] text-white/65 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            onClick={togglePositionLock}
            title={positionLocked ? "Unlock position" : "Lock position"}
            type="button"
          >
            {positionLocked ? (
              <Unlock aria-hidden="true" className="size-3.5" />
            ) : (
              <Lock aria-hidden="true" className="size-3.5" />
            )}
            <span className="sr-only">
              {positionLocked ? "Unlock window position" : "Lock window position"}
            </span>
          </button>
          <button
            aria-label="Minimize window"
            className="grid size-7 place-items-center rounded border border-white/10 bg-white/[0.04] text-white/65 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            onClick={props.onMinimize}
            title="Minimize"
            type="button"
          >
            <Minus aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Minimize window</span>
          </button>
          <button
            aria-label={win.maximized ? "Restore window" : "Maximize window"}
            className="grid size-7 place-items-center rounded border border-white/10 bg-white/[0.04] text-white/65 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            onClick={win.maximized ? props.onRestore : props.onMaximize}
            title={win.maximized ? "Restore" : "Maximize"}
            type="button"
          >
            {win.maximized ? (
              <Copy aria-hidden="true" className="size-3.5" />
            ) : (
              <Maximize2 aria-hidden="true" className="size-3.5" />
            )}
            <span className="sr-only">
              {win.maximized ? "Restore window" : "Maximize window"}
            </span>
          </button>
          <button
            aria-label="Close window"
            className="grid size-7 place-items-center rounded border border-red-300/20 bg-red-400/10 text-red-100 transition hover:border-red-300/40 hover:bg-red-400/20"
            onClick={props.onClose}
            title="Close"
            type="button"
          >
            <X aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Close window</span>
          </button>
        </div>
      </header>
      <div className="nexus-floating-window-frame__content min-h-0 flex-1 overflow-hidden">{children}</div>
      {isDragging || isResizing ? (
        <div
          aria-hidden="true"
          className={[
            "nexus-floating-window-frame__interaction-shield absolute inset-0 z-10",
            isResizing ? "cursor-se-resize" : "cursor-grabbing",
          ].join(" ")}
          data-floating-window-interaction-shield="true"
        />
      ) : null}
      {!win.maximized ? (
        <button
          aria-label="Resize window"
          className="nexus-floating-window-frame__resize-handle absolute bottom-0 right-0 z-20 grid size-5 cursor-se-resize place-items-center text-white/25 hover:text-white/55"
          onMouseDown={handleResizeStart}
          type="button"
        >
          <GripHorizontal aria-hidden="true" className="size-3 rotate-45" />
          <span className="sr-only">Resize window</span>
        </button>
      ) : null}
    </section>
  );
}
