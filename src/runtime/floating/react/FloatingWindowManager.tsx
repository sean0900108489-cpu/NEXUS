"use client";

import type { ReactNode } from "react";

import type { FloatingHostAdapter } from "@/runtime/floating/adapters/floating-host-adapter";
import type { FloatingAppRegistry } from "@/runtime/floating/registry/floating-app-registry";
import { FloatingWindowFrame } from "./FloatingWindowFrame";

export type FloatingWindowManagerProps = {
  host: FloatingHostAdapter;
  registry: FloatingAppRegistry;
  emptyFallback?: ReactNode;
};

export function FloatingWindowManager({
  host,
  registry,
  emptyFallback = null,
}: FloatingWindowManagerProps) {
  const windows = host.getWindows();

  if (windows.length === 0) {
    return (
      <div data-floating-window-manager={host.hostId}>
        {emptyFallback}
      </div>
    );
  }

  return (
    <div data-floating-window-manager={host.hostId}>
      {windows.map((win) => {
        const app = registry.get(win.kind);
        const AppComponent = app?.component;

        return (
          <FloatingWindowFrame
            key={win.id}
            focused={host.getFocusedWindowId() === win.id}
            onClose={() => host.closeWindow(win.id)}
            onFocus={() => host.focusWindow(win.id)}
            onMaximize={() => host.maximizeWindow(win.id)}
            onMinimize={() => host.minimizeWindow(win.id)}
            onMove={(x, y) => host.moveWindow(win.id, x, y)}
            onResize={(width, height) => host.resizeWindow(win.id, width, height)}
            onRestore={() => host.restoreWindow(win.id)}
            window={win}
          >
            {AppComponent ? (
              <AppComponent
                close={() => host.closeWindow(win.id)}
                setTitle={(title) => host.updateWindowTitle(win.id, title)}
                window={win}
              />
            ) : (
              <FloatingWindowNotFound kind={win.kind} />
            )}
          </FloatingWindowFrame>
        );
      })}
    </div>
  );
}

function FloatingWindowNotFound({ kind }: { kind: string }) {
  return (
    <div role="status">
      No floating app registered for kind <code>{kind}</code>.
    </div>
  );
}
