"use client";

import { DeveloperInspectorWindow } from "@/features/developer/DeveloperInspectorWindow";
import { FeedWindow } from "@/features/feed/FeedWindow";
import type {
  NexusWindow,
  NexusWindowKind,
  NexusWindowScope,
} from "@/kernel/window/window-types";
import { createFloatingAppRegistry } from "./floating-app-registry";
import type { FloatingAppDefinition, FloatingAppProps } from "./floating-app-types";
import type {
  FloatingWindowInstance,
  FloatingWindowScope,
} from "@/runtime/floating/core/floating-window-types";

export const DEFAULT_WORKSPACE_FLOATING_APPS: FloatingAppDefinition[] = [
  {
    kind: "developer-inspector",
    title: "Dev Inspector",
    scope: "account",
    defaultSize: { width: 680, height: 520 },
    minSize: { width: 420, height: 340 },
    icon: "code",
    singleton: true,
    allowMultiple: false,
    lifecycle: "internal",
    capabilities: ["commands"],
    archetype: "admin-app",
    component: DeveloperInspectorFloatingApp,
  },
  {
    kind: "feed",
    title: "Feed",
    scope: "account",
    defaultSize: { width: 680, height: 540 },
    minSize: { width: 400, height: 340 },
    icon: "rss",
    singleton: true,
    allowMultiple: false,
    capabilities: ["feed", "composer", "profiles", "resource-preview", "notes-capture"],
    archetype: "social-feed-app",
    component: FeedFloatingApp,
  },
];

export function createDefaultWorkspaceFloatingAppRegistry() {
  const registry = createFloatingAppRegistry();

  DEFAULT_WORKSPACE_FLOATING_APPS.forEach((app) => {
    registry.register(app);
  });

  return registry;
}

function DeveloperInspectorFloatingApp({
  close,
  setTitle,
  window,
}: FloatingAppProps) {
  return (
    <DeveloperInspectorWindow
      close={close}
      setTitle={setTitle}
      window={toNexusWindow(window)}
    />
  );
}

function FeedFloatingApp({ close, setTitle, window }: FloatingAppProps) {
  return (
    <FeedWindow
      close={close}
      setTitle={setTitle}
      window={toNexusWindow(window)}
    />
  );
}

function toNexusWindow(window: FloatingWindowInstance): NexusWindow {
  return {
    id: window.id,
    kind: window.kind as NexusWindowKind,
    title: window.title,
    resourceId: window.resourceId,
    workspaceId: window.workspaceId,
    scope: toNexusWindowScope(window.scope),
    layout: window.layout,
    minimized: window.minimized,
    maximized: window.maximized,
    createdAt: window.createdAt,
    updatedAt: window.updatedAt,
    state: window.state,
  };
}

function toNexusWindowScope(scope: FloatingWindowScope): NexusWindowScope {
  if (scope === "resource") {
    return "workspace";
  }

  return scope;
}
