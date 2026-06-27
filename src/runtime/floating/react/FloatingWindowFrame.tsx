"use client";

import type { CSSProperties, ReactNode } from "react";

import type { FloatingWindowInstance } from "@/runtime/floating";

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
};

export function FloatingWindowFrame(props: FloatingWindowFrameProps) {
  const { window: win, focused, children } = props;

  if (win.minimized) {
    return null;
  }

  const layoutStyle: CSSProperties = {
    position: "absolute",
    left: win.layout.x,
    top: win.layout.y,
    width: win.layout.width,
    height: win.layout.height,
    zIndex: win.layout.zIndex,
  };

  return (
    <section
      aria-label={`${win.title} floating window`}
      className={[
        "nexus-floating-window-frame",
        focused ? "nexus-floating-window-frame--focused" : "",
      ].filter(Boolean).join(" ")}
      data-floating-window-id={win.id}
      data-floating-window-kind={win.kind}
      data-floating-window-scope={win.scope}
      data-focused={focused ? "true" : "false"}
      onMouseDown={props.onFocus}
      role="dialog"
      style={layoutStyle}
    >
      <header className="nexus-floating-window-frame__titlebar">
        <button
          aria-label={`Move ${win.title} window`}
          className="nexus-floating-window-frame__move-handle"
          onClick={props.onFocus}
          onMouseDown={(event) => {
            event.preventDefault();
            props.onFocus();
            props.onMove(win.layout.x, win.layout.y);
          }}
          type="button"
        >
          <span aria-hidden="true">{win.title}</span>
        </button>
        <div className="nexus-floating-window-frame__controls">
          <button aria-label="Minimize window" onClick={props.onMinimize} type="button">
            Minimize
          </button>
          <button
            aria-label={win.maximized ? "Restore window" : "Maximize window"}
            onClick={win.maximized ? props.onRestore : props.onMaximize}
            type="button"
          >
            {win.maximized ? "Restore" : "Maximize"}
          </button>
          <button aria-label="Close window" onClick={props.onClose} type="button">
            Close
          </button>
        </div>
      </header>
      <div className="nexus-floating-window-frame__content">{children}</div>
      {!win.maximized ? (
        <button
          aria-label="Resize window"
          className="nexus-floating-window-frame__resize-handle"
          onClick={() => props.onResize(win.layout.width, win.layout.height)}
          type="button"
        >
          <span aria-hidden="true">Resize</span>
        </button>
      ) : null}
    </section>
  );
}
