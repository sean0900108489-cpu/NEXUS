import { existsSync, readFileSync } from "node:fs";
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
  });
});
