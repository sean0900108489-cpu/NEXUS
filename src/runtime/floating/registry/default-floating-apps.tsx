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
import { FloatingWebAppContainer } from "@/runtime/floating/web-app-host/FloatingWebAppContainer";
import { createFloatingAppRegistry } from "./floating-app-registry";
import type {
  FloatingAppDefinition,
  FloatingAppProps,
  FloatingWebAppManifest,
} from "./floating-app-types";
import type {
  FloatingWindowInstance,
  FloatingWindowScope,
} from "@/runtime/floating/core/floating-window-types";

export const LOCAL_EXTERNAL_WEB_APP_MANIFEST: FloatingWebAppManifest = {
  id: "local-web-app-pilot",
  kind: "external-web-app",
  title: "Local Web App",
  entry: "http://localhost:5173",
  mode: "iframe",
  permissions: ["frame:render", "workspace:read"],
  sandbox: [
    "allow-scripts",
    "allow-same-origin",
    "allow-forms",
    "allow-popups",
    "allow-downloads",
    "allow-modals",
  ],
  bridge: {
    commandBridge: false,
    authBridge: false,
    storageBridge: false,
    apiBridge: false,
    workspaceContext: true,
  },
};

export const NEXUS_PLANNING_WEB_APP_MANIFEST: FloatingWebAppManifest = {
  id: "nexus-planning-board",
  kind: "external-web-app",
  title: "NEXUS Planning",
  entry: "http://localhost:5174",
  mode: "iframe",
  permissions: ["frame:render", "workspace:read"],
  sandbox: [
    "allow-scripts",
    "allow-same-origin",
    "allow-forms",
    "allow-popups",
    "allow-downloads",
    "allow-modals",
  ],
  bridge: {
    commandBridge: false,
    authBridge: false,
    storageBridge: false,
    apiBridge: false,
    workspaceContext: true,
  },
};

export const COMMUNITY_BOARD_WEB_APP_MANIFEST: FloatingWebAppManifest = {
  id: "nexus-community-board",
  kind: "external-web-app",
  title: "Community Board",
  entry: "http://localhost:5175",
  mode: "iframe",
  permissions: ["frame:render", "workspace:read", "user:read"],
  sandbox: [
    "allow-scripts",
    "allow-same-origin",
    "allow-forms",
    "allow-popups",
    "allow-downloads",
    "allow-modals",
  ],
  bridge: {
    commandBridge: false,
    authBridge: false,
    storageBridge: false,
    apiBridge: true,
    workspaceContext: true,
    userContext: true,
  },
};

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
    dataBoundary: {
      namespace: "developer_inspector",
      currentState: "runtime-only",
      durability: "none",
      ownerScope: "runtime",
    },
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
    dataBoundary: {
      namespace: "feed",
      currentState: "local-storage",
      durability: "planned-supabase",
      ownerScope: "account-or-workspace",
      localStorageKeys: [
        "nexus-feed:v1:items",
        "nexus-interactions:v1:{targetType}:{targetId}",
      ],
      tables: ["feed_items", "feed_item_resources"],
      rls: "planned-owner-and-workspace-policies",
    },
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
    dataBoundary: {
      namespace: "artifact_library",
      currentState: "existing-supabase",
      durability: "existing-supabase",
      ownerScope: "account-or-workspace",
      apiRoutes: [
        "/api/attachments",
        "/api/attachments/[id]",
        "/api/v1/artifacts",
        "/api/v1/artifacts/[artifactId]",
      ],
      tables: ["user_attachments", "artifacts", "artifact_references"],
      rls: "existing-owner-and-workspace-policies",
    },
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
    dataBoundary: {
      namespace: "profile_preview",
      currentState: "planned-supabase",
      durability: "planned-supabase",
      ownerScope: "account",
      tables: ["user_profiles"],
      rls: "planned-owner-profile-policies",
    },
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
    dataBoundary: {
      namespace: "notes",
      currentState: "local-storage",
      durability: "planned-supabase",
      ownerScope: "account-or-workspace",
      localStorageKeys: ["nexus-notes:v2:index", "nexus-notes:v2:note:{id}"],
      tables: ["user_notes", "note_resources"],
      rls: "planned-owner-and-workspace-policies",
    },
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
    dataBoundary: {
      namespace: "forum",
      currentState: "local-storage",
      durability: "planned-supabase",
      ownerScope: "account-or-workspace",
      localStorageKeys: [
        "nexus-forum:v1:threads-index",
        "nexus-forum:v1:thread:{id}",
        "nexus-forum:v1:replies:{threadId}",
      ],
      tables: ["forum_threads", "forum_replies", "forum_post_resources"],
      rls: "planned-owner-and-published-thread-policies",
    },
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
    dataBoundary: {
      namespace: "global_chat",
      currentState: "existing-supabase",
      durability: "existing-supabase",
      ownerScope: "account",
      apiRoutes: [
        "/api/global-chat",
        "/api/global-chats",
        "/api/global-chats/[conversationId]",
      ],
      tables: ["global_conversations", "global_messages"],
      rls: "existing-owner-chat-policies",
    },
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
    dataBoundary: {
      namespace: "service_board",
      currentState: "local-demo",
      durability: "planned-supabase",
      ownerScope: "account",
      apiRoutes: [
        "/api/service-board/requests",
        "/api/service-board/requests/[requestId]",
        "/api/service-board/requests/[requestId]/offers",
      ],
      tables: [
        "service_board_requests",
        "service_board_offers",
        "service_board_request_resources",
      ],
      rls: "planned-owner-and-workspace-policies",
    },
    component: ServiceBoardFloatingApp,
  },
  {
    kind: "external-web-app",
    title: LOCAL_EXTERNAL_WEB_APP_MANIFEST.title,
    scope: "workspace",
    defaultSize: { width: 960, height: 720 },
    minSize: { width: 520, height: 360 },
    icon: "app",
    singleton: false,
    allowMultiple: true,
    lifecycle: "demo",
    capabilities: ["workspace", "commands"],
    archetype: "admin-app",
    dataBoundary: {
      namespace: "external_web_app",
      currentState: "external-project",
      durability: "external-owned",
      ownerScope: "external-project",
    },
    webApp: LOCAL_EXTERNAL_WEB_APP_MANIFEST,
    component: ExternalWebAppFloatingApp,
  },
  {
    kind: "nexus-planning-web-app",
    title: NEXUS_PLANNING_WEB_APP_MANIFEST.title,
    scope: "workspace",
    defaultSize: { width: 1120, height: 760 },
    minSize: { width: 560, height: 380 },
    icon: "app",
    singleton: false,
    allowMultiple: true,
    lifecycle: "demo",
    capabilities: ["workspace"],
    archetype: "admin-app",
    dataBoundary: {
      namespace: "nexus_planning_web_app",
      currentState: "external-project",
      durability: "external-owned",
      ownerScope: "external-project",
    },
    webApp: NEXUS_PLANNING_WEB_APP_MANIFEST,
    component: NexusPlanningWebAppFloatingApp,
  },
  {
    kind: "community-board-web-app",
    title: COMMUNITY_BOARD_WEB_APP_MANIFEST.title,
    scope: "workspace",
    defaultSize: { width: 940, height: 680 },
    minSize: { width: 520, height: 380 },
    icon: "app",
    singleton: false,
    allowMultiple: true,
    lifecycle: "demo",
    capabilities: ["feed", "composer", "comments", "profiles"],
    archetype: "community-app",
    dataBoundary: {
      namespace: "community_board_web_app",
      currentState: "external-project",
      durability: "existing-supabase",
      ownerScope: "external-project",
      apiRoutes: ["/api/community/posts"],
      tables: ["community_posts", "community_replies"],
      rls: "authenticated-read-published-author-write",
    },
    webApp: COMMUNITY_BOARD_WEB_APP_MANIFEST,
    component: CommunityBoardWebAppFloatingApp,
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

function ExternalWebAppFloatingApp(props: FloatingAppProps) {
  return (
    <FloatingWebAppContainer
      {...props}
      manifest={LOCAL_EXTERNAL_WEB_APP_MANIFEST}
    />
  );
}

function NexusPlanningWebAppFloatingApp(props: FloatingAppProps) {
  return (
    <FloatingWebAppContainer
      {...props}
      manifest={NEXUS_PLANNING_WEB_APP_MANIFEST}
    />
  );
}

function CommunityBoardWebAppFloatingApp(props: FloatingAppProps) {
  return (
    <FloatingWebAppContainer
      {...props}
      manifest={COMMUNITY_BOARD_WEB_APP_MANIFEST}
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
