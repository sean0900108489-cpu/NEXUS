/**
 * NEXUS Window OS — WindowManager
 *
 * Reads open windows from the Window Kernel Store.
 * For each window, looks up the matching app component from the App Registry.
 * Renders a WindowFrame wrapping the app component.
 *
 * Each window is wrapped in its own ErrorBoundary — a crash in one app
 * does NOT crash the entire Desktop.
 *
 * Knows NOTHING about any specific feature's business logic.
 *
 * @module kernel/window/WindowManager
 */

"use client";

import { Component, Suspense, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useWindowStore } from "./window-store";
import { getWindowApp } from "./window-registry";
import { WindowFrame } from "./WindowFrame";
import type { NexusWindow } from "./window-types";

// ── Props ──────────────────────────────────────────────────────────

type WindowManagerProps = {
  /** The available desktop area (viewport minus taskbar) */
  desktopBounds: { width: number; height: number };
};

// ── Error Boundary (per-window isolation) ─────────────────────────

type WindowErrorBoundaryProps = {
  children: React.ReactNode;
  windowId: string;
};

type WindowErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class WindowErrorBoundary extends Component<
  WindowErrorBoundaryProps,
  WindowErrorBoundaryState
> {
  constructor(props: WindowErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): WindowErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[WindowErrorBoundary] Window ${this.props.windowId} crashed:`,
      error,
      info.componentStack,
    );
  }

  handleClose = () => {
    useWindowStore.getState().closeWindow(this.props.windowId);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-white/40">
          <AlertTriangle className="w-10 h-10 text-red-400/60" />
          <p className="text-sm font-medium text-red-300/80">
            This window crashed
          </p>
          <p className="text-xs text-center max-w-xs text-white/30">
            {this.state.error?.message ?? "Unknown error"}
          </p>
          <button
            className="mt-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-300 hover:bg-red-500/20 transition-colors"
            onClick={this.handleClose}
          >
            Close Window
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ── Loading Fallback ───────────────────────────────────────────────

function WindowLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full text-white/30 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
        Loading...
      </div>
    </div>
  );
}

// ── Not Found ──────────────────────────────────────────────────────

function WindowNotFound({ window: win }: { window: NexusWindow }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-white/40 p-4">
      <span className="text-lg">⚠️</span>
      <span className="text-sm text-center">
        No app registered for kind:{" "}
        <code className="text-white/60 bg-white/5 px-1 rounded">
          {win.kind}
        </code>
      </span>
      <span className="text-xs text-white/20">
        Register an app with registerWindowApp() before opening.
      </span>
    </div>
  );
}

// ── Single Window Renderer ─────────────────────────────────────────

function WindowRenderer({
  window: win,
  desktopBounds,
}: {
  window: NexusWindow;
  desktopBounds: { width: number; height: number };
}) {
  const appDef = getWindowApp(win.kind);

  const content = useMemo(() => {
    if (!appDef) {
      return <WindowNotFound window={win} />;
    }

    const AppComponent = appDef.component;
    const { closeWindow, updateWindowTitle } = useWindowStore.getState();

    return (
      <AppComponent
        window={win}
        setTitle={(title) => updateWindowTitle(win.id, title)}
        close={() => closeWindow(win.id)}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.id, win.kind, appDef]);

  return (
    <WindowErrorBoundary windowId={win.id}>
      <WindowFrame window={win} desktopBounds={desktopBounds}>
        <Suspense fallback={<WindowLoadingFallback />}>{content}</Suspense>
      </WindowFrame>
    </WindowErrorBoundary>
  );
}

// ── Component ──────────────────────────────────────────────────────

export function WindowManager({ desktopBounds }: WindowManagerProps) {
  const windows = useWindowStore((s) => s.windows);

  if (windows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center select-none">
        <div className="text-center text-white/15">
          <p className="text-5xl mb-3 font-light">NEXUS</p>
          <p className="text-sm">No windows open</p>
          <p className="text-xs mt-1 text-white/10">
            Use the launcher below to open an app
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      {windows.map((win) => (
        <WindowRenderer
          key={win.id}
          window={win}
          desktopBounds={desktopBounds}
        />
      ))}
    </div>
  );
}
