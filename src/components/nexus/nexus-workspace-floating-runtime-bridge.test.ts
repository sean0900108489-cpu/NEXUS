import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const nexusOpsModuleUrl = new URL("./nexus-ops.tsx", import.meta.url);

describe("NexusOps shared floating runtime bridge", () => {
  it("uses the shared floating runtime instead of importing pilot feature internals", () => {
    const source = readFileSync(nexusOpsModuleUrl, "utf8");

    expect(source).toContain("createDefaultWorkspaceFloatingAppRegistry");
    expect(source).toContain("FloatingWindowManager");
    expect(source).toContain("FloatingAppLauncher");
    expect(source).toContain("useFloatingHostAdapter");
    expect(source).not.toContain("@/features/developer/DeveloperInspectorWindow");
    expect(source).not.toContain("@/features/feed/FeedWindow");
  });

  it("opens floating apps through registry-backed Workspace launch surfaces", () => {
    const source = readFileSync(nexusOpsModuleUrl, "utf8");

    expect(source).toContain("workspaceFloatingRegistry.list()");
    expect(source).toContain("openWorkspaceFloatingApp");
    expect(source).toContain("createFloatingAppOpenInput(app");
    expect(source).toContain("workspaceFloatingApps.map((app)");
    expect(source).toContain("id: `open-floating-app-${app.kind}`");
    expect(source).toContain("apps={workspaceFloatingApps}");
    expect(source).toContain("onOpen={openWorkspaceFloatingApp}");
    expect(source).toContain("<FloatingWindowManager");
    expect(source).not.toContain('id: "open-developer-inspector-floating"');
  });
});
