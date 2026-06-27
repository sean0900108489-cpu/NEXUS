"use client";

import type { FloatingAppDefinition } from "@/runtime/floating/registry/floating-app-types";

export type FloatingAppLauncherProps = {
  apps: FloatingAppDefinition[];
  onOpen: (app: FloatingAppDefinition) => void;
};

export function FloatingAppLauncher({ apps, onOpen }: FloatingAppLauncherProps) {
  if (apps.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Floating apps"
      className="nexus-floating-app-launcher absolute right-3 top-3 z-[90] flex max-w-[calc(100%-1.5rem)] items-center gap-1 overflow-x-auto overscroll-x-contain rounded-md border border-white/10 bg-black/60 p-1 text-white shadow-xl backdrop-blur-xl"
      data-floating-app-count={apps.length}
      data-floating-app-launcher="workspace"
      role="toolbar"
    >
      {apps.map((app) => (
        <button
          aria-label={`Open ${app.title}`}
          className="flex h-8 w-32 shrink-0 items-center gap-2 rounded px-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:w-40"
          data-floating-app-kind={app.kind}
          key={app.kind}
          onClick={() => onOpen(app)}
          title={`Open ${app.title}`}
          type="button"
        >
          <span
            aria-hidden="true"
            className="grid size-5 shrink-0 place-items-center rounded border border-white/10 bg-white/5 text-[10px] uppercase text-cyan-200/80"
          >
            {resolveAppIconLabel(app)}
          </span>
          <span className="min-w-0 truncate">{app.title}</span>
        </button>
      ))}
    </div>
  );
}

function resolveAppIconLabel(app: FloatingAppDefinition) {
  if (app.icon?.trim()) {
    return app.icon.slice(0, 2);
  }

  return app.title.slice(0, 2);
}
