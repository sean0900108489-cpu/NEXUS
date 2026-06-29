import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createFloatingAppOpenInput } from "./floating-app-open-input";

const defaultAppsModuleUrl = new URL("./default-floating-apps.tsx", import.meta.url);

describe("default workspace floating apps", () => {
  it("registers the Workspace pilot apps in launcher order", async () => {
    expect(existsSync(defaultAppsModuleUrl)).toBe(true);

    const {
      DEFAULT_WORKSPACE_FLOATING_APPS,
      createDefaultWorkspaceFloatingAppRegistry,
    } = await import("./default-floating-apps");

    expect(DEFAULT_WORKSPACE_FLOATING_APPS.map((app) => app.kind)).toEqual([
      "developer-inspector",
      "feed",
      "artifact-library",
      "profile-preview",
      "notes",
      "forum",
      "global-chat",
      "service-board",
      "external-web-app",
      "nexus-planning-web-app",
    ]);
    expect(DEFAULT_WORKSPACE_FLOATING_APPS[0]).toMatchObject({
      title: "Dev Inspector",
      scope: "account",
      defaultSize: { width: 680, height: 520 },
      minSize: { width: 420, height: 340 },
      singleton: true,
      allowMultiple: false,
      lifecycle: "internal",
      capabilities: ["commands"],
      archetype: "admin-app",
    });
    expect(DEFAULT_WORKSPACE_FLOATING_APPS[1]).toMatchObject({
      title: "Feed",
      scope: "account",
      defaultSize: { width: 680, height: 540 },
      minSize: { width: 400, height: 340 },
      singleton: true,
      allowMultiple: false,
      capabilities: ["feed", "composer", "profiles", "resource-preview", "notes-capture"],
      archetype: "social-feed-app",
    });
    expect(DEFAULT_WORKSPACE_FLOATING_APPS[2]).toMatchObject({
      kind: "artifact-library",
      title: "Artifacts",
      scope: "account",
      defaultSize: { width: 720, height: 520 },
      minSize: { width: 400, height: 320 },
      singleton: true,
      allowMultiple: false,
      capabilities: ["resource-library", "resource-preview", "search", "media-upload"],
      archetype: "resource-app",
    });
    expect(DEFAULT_WORKSPACE_FLOATING_APPS[3]).toMatchObject({
      kind: "profile-preview",
      title: "Profile",
      scope: "account",
      defaultSize: { width: 420, height: 420 },
      minSize: { width: 300, height: 280 },
      singleton: false,
      allowMultiple: true,
      capabilities: ["profiles"],
      archetype: "admin-app",
    });
    expect(DEFAULT_WORKSPACE_FLOATING_APPS[4]).toMatchObject({
      kind: "notes",
      title: "Notes",
      scope: "account",
      defaultSize: { width: 680, height: 500 },
      minSize: { width: 400, height: 320 },
      singleton: true,
      allowMultiple: false,
      capabilities: ["composer", "notes-capture", "resource-preview"],
      archetype: "knowledge-app",
    });
    expect(DEFAULT_WORKSPACE_FLOATING_APPS[5]).toMatchObject({
      kind: "forum",
      title: "Forum",
      scope: "account",
      defaultSize: { width: 700, height: 520 },
      minSize: { width: 420, height: 340 },
      singleton: true,
      allowMultiple: false,
      capabilities: ["feed", "thread", "composer", "comments", "media-upload", "notes-capture", "profiles"],
      archetype: "community-app",
    });
    expect(DEFAULT_WORKSPACE_FLOATING_APPS[6]).toMatchObject({
      kind: "global-chat",
      title: "Global Chat",
      scope: "account",
      defaultSize: { width: 640, height: 520 },
      minSize: { width: 380, height: 280 },
      singleton: false,
      allowMultiple: true,
      capabilities: ["chat", "composer", "media-upload", "resource-preview", "notes-capture"],
      archetype: "chat-app",
    });
    expect(DEFAULT_WORKSPACE_FLOATING_APPS[7]).toMatchObject({
      kind: "service-board",
      title: "Service Board",
      scope: "account",
      defaultSize: { width: 760, height: 560 },
      minSize: { width: 440, height: 340 },
      singleton: true,
      allowMultiple: false,
      lifecycle: "demo",
      capabilities: ["marketplace", "profiles", "comments", "search"],
      archetype: "marketplace-app",
    });
    expect(DEFAULT_WORKSPACE_FLOATING_APPS[8]).toMatchObject({
      kind: "external-web-app",
      title: "Local Web App",
      scope: "workspace",
      defaultSize: { width: 960, height: 720 },
      minSize: { width: 520, height: 360 },
      singleton: false,
      allowMultiple: true,
      lifecycle: "demo",
      capabilities: ["workspace", "commands"],
      archetype: "admin-app",
      webApp: {
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
      },
    });
    expect(DEFAULT_WORKSPACE_FLOATING_APPS[9]).toMatchObject({
      kind: "nexus-planning-web-app",
      title: "NEXUS Planning",
      scope: "workspace",
      defaultSize: { width: 1120, height: 760 },
      minSize: { width: 560, height: 380 },
      singleton: false,
      allowMultiple: true,
      lifecycle: "demo",
      capabilities: ["workspace"],
      archetype: "admin-app",
      webApp: {
        id: "nexus-planning-board",
        kind: "external-web-app",
        title: "NEXUS Planning",
        entry: "http://localhost:5174",
        mode: "iframe",
        permissions: ["frame:render", "workspace:read"],
        bridge: {
          commandBridge: false,
          authBridge: false,
          storageBridge: false,
          apiBridge: false,
          workspaceContext: true,
        },
      },
    });

    const registry = createDefaultWorkspaceFloatingAppRegistry();
    expect(registry.list().map((app) => app.kind)).toEqual([
      "developer-inspector",
      "feed",
      "artifact-library",
      "profile-preview",
      "notes",
      "forum",
      "global-chat",
      "service-board",
      "external-web-app",
      "nexus-planning-web-app",
    ]);
    expect(registry.get("developer-inspector")).toBe(
      DEFAULT_WORKSPACE_FLOATING_APPS[0],
    );
    expect(registry.get("feed")).toBe(DEFAULT_WORKSPACE_FLOATING_APPS[1]);
    expect(registry.get("artifact-library")).toBe(DEFAULT_WORKSPACE_FLOATING_APPS[2]);
    expect(registry.get("profile-preview")).toBe(DEFAULT_WORKSPACE_FLOATING_APPS[3]);
    expect(registry.get("notes")).toBe(DEFAULT_WORKSPACE_FLOATING_APPS[4]);
    expect(registry.get("forum")).toBe(DEFAULT_WORKSPACE_FLOATING_APPS[5]);
    expect(registry.get("global-chat")).toBe(DEFAULT_WORKSPACE_FLOATING_APPS[6]);
    expect(registry.get("service-board")).toBe(DEFAULT_WORKSPACE_FLOATING_APPS[7]);
    expect(registry.get("external-web-app")).toBe(DEFAULT_WORKSPACE_FLOATING_APPS[8]);
    expect(registry.get("nexus-planning-web-app")).toBe(
      DEFAULT_WORKSPACE_FLOATING_APPS[9],
    );
  });

  it("uses each connected web app manifest title and iframe entry", async () => {
    const { DEFAULT_WORKSPACE_FLOATING_APPS } = await import("./default-floating-apps");
    const externalApps = DEFAULT_WORKSPACE_FLOATING_APPS.filter((app) => app.webApp);

    expect(externalApps.map((app) => app.title)).toEqual([
      "Local Web App",
      "NEXUS Planning",
    ]);
    expect(externalApps.map((app) => app.title)).not.toContain("Web App Host");

    const htmlByKind = Object.fromEntries(
      externalApps.map((app) => [
        app.kind,
        renderToStaticMarkup(
          <app.component
            close={() => undefined}
            setTitle={() => undefined}
            window={{
              id: `floating-window:${app.kind}:test`,
              kind: app.kind,
              title: app.title,
              scope: app.scope,
              workspaceId: "workspace-test",
              layout: { x: 0, y: 0, width: 960, height: 720, zIndex: 1 },
              minimized: false,
              maximized: false,
              createdAt: "2026-06-29T00:00:00.000Z",
              updatedAt: "2026-06-29T00:00:00.000Z",
            }}
          />,
        ),
      ]),
    );

    expect(htmlByKind["external-web-app"]).toContain('src="http://localhost:5173"');
    expect(htmlByKind["external-web-app"]).toContain('title="Local Web App"');
    expect(htmlByKind["nexus-planning-web-app"]).toContain(
      'src="http://localhost:5174"',
    );
    expect(htmlByKind["nexus-planning-web-app"]).toContain('title="NEXUS Planning"');
  });

  it("opens the R5 service board through registry metadata without desktop wiring", async () => {
    const { createDefaultWorkspaceFloatingAppRegistry } = await import("./default-floating-apps");

    const app = createDefaultWorkspaceFloatingAppRegistry().get("service-board");

    expect(app).toBeDefined();
    expect(createFloatingAppOpenInput(app!, { workspaceId: "workspace-r5" })).toEqual({
      kind: "service-board",
      title: "Service Board",
      scope: "account",
      defaultSize: { width: 760, height: 560 },
      workspaceId: "workspace-r5",
      singleton: true,
      allowMultiple: false,
    });
  });

  it("declares app-owned data boundaries without moving persistence into the shared runtime", async () => {
    const { DEFAULT_WORKSPACE_FLOATING_APPS } = await import("./default-floating-apps");

    const namespaces = DEFAULT_WORKSPACE_FLOATING_APPS.map(
      (app) => app.dataBoundary?.namespace,
    );

    expect(namespaces).toEqual([
      "developer_inspector",
      "feed",
      "artifact_library",
      "profile_preview",
      "notes",
      "forum",
      "global_chat",
      "service_board",
      "external_web_app",
      "nexus_planning_web_app",
    ]);
    expect(new Set(namespaces).size).toBe(DEFAULT_WORKSPACE_FLOATING_APPS.length);

    const serviceBoard = DEFAULT_WORKSPACE_FLOATING_APPS.find(
      (app) => app.kind === "service-board",
    );

    expect(serviceBoard?.dataBoundary).toEqual({
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
    });

    const externalWebApp = DEFAULT_WORKSPACE_FLOATING_APPS.find(
      (app) => app.kind === "external-web-app",
    );

    expect(externalWebApp?.dataBoundary).toMatchObject({
      namespace: "external_web_app",
      currentState: "external-project",
      durability: "external-owned",
      ownerScope: "external-project",
    });
  });

  it("keeps feature-level imports inside the default registry boundary", () => {
    expect(existsSync(defaultAppsModuleUrl)).toBe(true);

    const source = readFileSync(defaultAppsModuleUrl, "utf8");

    expect(source).toContain("@/features/developer/DeveloperInspectorWindow");
    expect(source).toContain("@/features/feed/FeedWindow");
    expect(source).toContain("@/features/artifact-library/ArtifactLibraryWindow");
    expect(source).toContain("@/features/profiles/ProfilePreviewWindow");
    expect(source).toContain("@/features/notes/NotesWindow");
    expect(source).toContain("@/features/forum/ForumWindow");
    expect(source).toContain("@/features/global-chat/GlobalChatWindow");
    expect(source).toContain("@/features/service-board/ServiceBoardWindow");
    expect(source).toContain("function DeveloperInspectorFloatingApp");
    expect(source).toContain("function FeedFloatingApp");
    expect(source).toContain("function ArtifactLibraryFloatingApp");
    expect(source).toContain("function ProfilePreviewFloatingApp");
    expect(source).toContain("function NotesFloatingApp");
    expect(source).toContain("function ForumFloatingApp");
    expect(source).toContain("function GlobalChatFloatingApp");
    expect(source).toContain("function ServiceBoardFloatingApp");
    expect(source).toContain("@/runtime/floating/web-app-host/FloatingWebAppContainer");
    expect(source).toContain("function ExternalWebAppFloatingApp");
  });
});
