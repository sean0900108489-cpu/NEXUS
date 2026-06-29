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
    expect(source).not.toContain("@/features/artifact-library/ArtifactLibraryWindow");
    expect(source).not.toContain("@/features/profiles/ProfilePreviewWindow");
    expect(source).not.toContain("@/features/notes/NotesWindow");
    expect(source).not.toContain("@/features/forum/ForumWindow");
    expect(source).not.toContain("@/features/global-chat/GlobalChatWindow");
    expect(source).not.toContain("@/features/service-board/ServiceBoardWindow");
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

  it("measures Workspace bounds after the auth-gated Workspace node mounts", () => {
    const source = readFileSync(nexusOpsModuleUrl, "utf8");

    expect(source).toContain("const [workspaceMeasureNode, setWorkspaceMeasureNode]");
    expect(source).toContain("const setWorkspaceMeasureRef = useCallback");
    expect(source).toContain("workspaceRef.current = node");
    expect(source).toContain("setWorkspaceMeasureNode(node)");
    expect(source).toContain("const node = workspaceMeasureNode;");
    expect(source).toContain("}, [workspaceMeasureNode]);");
    expect(source).toContain("ref={setWorkspaceMeasureRef}");
  });

  it("lets Workspace swap agent and floating app layer priority", () => {
    const source = readFileSync(nexusOpsModuleUrl, "utf8");

    expect(source).toContain("type WorkspaceWindowLayerPreference");
    expect(source).toContain("WORKSPACE_LOWER_WINDOW_LAYER_BASE");
    expect(source).toContain("WORKSPACE_UPPER_WINDOW_LAYER_BASE");
    expect(source).toContain("workspaceWindowLayerPreference");
    expect(source).toContain("workspaceLayerZIndexes");
    expect(source).toContain("data-workspace-window-layer-preference");
    expect(source).toContain("Toggle floating window layer priority");
    expect(source).toContain("zIndexBase={workspaceLayerZIndexes.agents}");
    expect(source).toContain("zIndexBase={workspaceLayerZIndexes.floatingApps}");
  });
});
