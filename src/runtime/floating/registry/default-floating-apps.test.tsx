import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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

    const registry = createDefaultWorkspaceFloatingAppRegistry();
    expect(registry.list().map((app) => app.kind)).toEqual([
      "developer-inspector",
      "feed",
    ]);
    expect(registry.get("developer-inspector")).toBe(
      DEFAULT_WORKSPACE_FLOATING_APPS[0],
    );
    expect(registry.get("feed")).toBe(DEFAULT_WORKSPACE_FLOATING_APPS[1]);
  });

  it("keeps feature-level imports inside the default registry boundary", () => {
    expect(existsSync(defaultAppsModuleUrl)).toBe(true);

    const source = readFileSync(defaultAppsModuleUrl, "utf8");

    expect(source).toContain("@/features/developer/DeveloperInspectorWindow");
    expect(source).toContain("@/features/feed/FeedWindow");
    expect(source).toContain("function DeveloperInspectorFloatingApp");
    expect(source).toContain("function FeedFloatingApp");
  });
});
