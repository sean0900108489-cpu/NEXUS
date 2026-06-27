"use client";

import { ArtifactLibraryWindow } from "@/features/artifact-library/ArtifactLibraryWindow";
import { DeveloperInspectorWindow } from "@/features/developer/DeveloperInspectorWindow";
import { FeedWindow } from "@/features/feed/FeedWindow";
import { ForumWindow } from "@/features/forum/ForumWindow";
import { GlobalChatWindow } from "@/features/global-chat/GlobalChatWindow";
import { NotesWindow } from "@/features/notes/NotesWindow";
import { ProfilePreviewWindow } from "@/features/profiles/ProfilePreviewWindow";
import { ServiceBoardWindow } from "@/features/service-board/ServiceBoardWindow";
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
  {
    kind: "artifact-library",
    title: "Artifacts",
    scope: "account",
    defaultSize: { width: 720, height: 520 },
    minSize: { width: 400, height: 320 },
    icon: "folder-open",
    singleton: true,
    allowMultiple: false,
    capabilities: ["resource-library", "resource-preview", "search", "media-upload"],
    archetype: "resource-app",
    component: ArtifactLibraryFloatingApp,
  },
  {
    kind: "profile-preview",
    title: "Profile",
    scope: "account",
    defaultSize: { width: 420, height: 420 },
    minSize: { width: 300, height: 280 },
    icon: "user",
    singleton: false,
    allowMultiple: true,
    capabilities: ["profiles"],
    archetype: "admin-app",
    component: ProfilePreviewFloatingApp,
  },
  {
    kind: "notes",
    title: "Notes",
    scope: "account",
    defaultSize: { width: 680, height: 500 },
    minSize: { width: 400, height: 320 },
    icon: "sticky-note",
    singleton: true,
    allowMultiple: false,
    capabilities: ["composer", "notes-capture", "resource-preview"],
    archetype: "knowledge-app",
    component: NotesFloatingApp,
  },
  {
    kind: "forum",
    title: "Forum",
    scope: "account",
    defaultSize: { width: 700, height: 520 },
    minSize: { width: 420, height: 340 },
    icon: "message-square",
    singleton: true,
    allowMultiple: false,
    capabilities: [
      "feed",
      "thread",
      "composer",
      "comments",
      "media-upload",
      "notes-capture",
      "profiles",
    ],
    archetype: "community-app",
    component: ForumFloatingApp,
  },
  {
    kind: "global-chat",
    title: "Global Chat",
    scope: "account",
    defaultSize: { width: 640, height: 520 },
    minSize: { width: 380, height: 280 },
    icon: "message-circle",
    singleton: false,
    allowMultiple: true,
    capabilities: [
      "chat",
      "composer",
      "media-upload",
      "resource-preview",
      "notes-capture",
    ],
    archetype: "chat-app",
    component: GlobalChatFloatingApp,
  },
  {
    kind: "service-board",
    title: "Service Board",
    scope: "account",
    defaultSize: { width: 760, height: 560 },
    minSize: { width: 440, height: 340 },
    icon: "briefcase",
    singleton: true,
    allowMultiple: false,
    lifecycle: "demo",
    capabilities: ["marketplace", "profiles", "comments", "search"],
    archetype: "marketplace-app",
    component: ServiceBoardFloatingApp,
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

function ArtifactLibraryFloatingApp({
  close,
  setTitle,
  window,
}: FloatingAppProps) {
  return (
    <ArtifactLibraryWindow
      close={close}
      setTitle={setTitle}
      window={toNexusWindow(window)}
    />
  );
}

function ProfilePreviewFloatingApp({
  close,
  setTitle,
  window,
}: FloatingAppProps) {
  return (
    <ProfilePreviewWindow
      close={close}
      setTitle={setTitle}
      window={toNexusWindow(window)}
    />
  );
}

function NotesFloatingApp({ close, setTitle, window }: FloatingAppProps) {
  return (
    <NotesWindow
      close={close}
      setTitle={setTitle}
      window={toNexusWindow(window)}
    />
  );
}

function ForumFloatingApp({ close, setTitle, window }: FloatingAppProps) {
  return (
    <ForumWindow
      close={close}
      setTitle={setTitle}
      window={toNexusWindow(window)}
    />
  );
}

function GlobalChatFloatingApp({ close, setTitle, window }: FloatingAppProps) {
  return (
    <GlobalChatWindow
      close={close}
      setTitle={setTitle}
      window={toNexusWindow(window)}
    />
  );
}

function ServiceBoardFloatingApp({ close, setTitle, window }: FloatingAppProps) {
  return (
    <ServiceBoardWindow
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
