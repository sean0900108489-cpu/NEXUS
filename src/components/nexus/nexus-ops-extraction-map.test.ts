import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("NexusOps extraction map markers", () => {
  it("keeps graph and workspace behavior markers visible for protected-core planning", () => {
    const source = readNexusOpsSource();

    expect(source).toContain('import { NexusGraph } from "@/components/nexus/nexus-graph";');
    expect(source).toContain("<NexusGraph");
    expect(source).toContain("updateGraphNodePosition");
    expect(source).toContain("connectGraphAgents");
    expect(source).toContain("connectWorkflowRuntimeNodes");
    expect(source).toContain("runWorkflowRuntimeLiteFlow");
  });

  it("keeps store, sync, Supabase, streaming, and tool execution markers visible", () => {
    const source = readNexusOpsSource();

    expect(source).toContain('import { useNexusStore } from "@/store/nexus-store";');
    expect(source).toContain("supabaseStateSyncManager");
    expect(source).toContain("localSyncQueueAdapter");
    expect(source).toContain("handleSend");
    expect(source).toContain("/api/v1/agents/${agentId}/stream");
    expect(source).toContain("readStreamEvents");
    expect(source).toContain("runTool");
  });

  it("keeps drag, resize, focus, z-index, window, and modal markers visible", () => {
    const source = readNexusOpsSource();

    expect(source).toContain('dynamic(() => import("react-rnd")');
    expect(source).toContain("<Rnd");
    expect(source).toContain("onDragStop");
    expect(source).toContain("onResizeStop");
    expect(source).toContain("style={{ zIndex: agent.layout.zIndex }}");
    expect(source).toContain("focusAgent");
    expect(source).toContain("<DatapadWindow");
    expect(source).toContain("<PromptVaultManager");
    expect(source).toContain("<AgentBranchModal");
    expect(source).toContain("<MacroComposerModal");
  });

  it("keeps extraction-safe visual shell candidate markers visible", () => {
    const source = readNexusOpsSource();
    const bodyFrameSource = readBodyFrameSource();
    const outerShellFrameSource = readOuterShellFrameSource();
    const rightFloatingDockFrameSource = readRightFloatingDockFrameSource();
    const topBarFrameSource = readTopBarFrameSource();

    expect(source).toContain(
      'import { NexusOpsBodyFrame } from "@/components/nexus/nexus-ops-body-frame";',
    );
    expect(source).toContain(
      'import { NexusOpsOuterShellFrame } from "@/components/nexus/nexus-ops-outer-shell-frame";',
    );
    expect(source).toContain(
      'import { NexusOpsRightFloatingDockFrame } from "@/components/nexus/nexus-ops-right-floating-dock-frame";',
    );
    expect(source).toContain(
      'import { NexusOpsTopBarFrame } from "@/components/nexus/nexus-ops-top-bar-frame";',
    );
    expect(source).toContain("<NexusOpsBodyFrame>");
    expect(source).toContain("</NexusOpsBodyFrame>");
    expect(source).toContain("<NexusOpsOuterShellFrame>");
    expect(source).toContain("</NexusOpsOuterShellFrame>");
    expect(source).toContain("<NexusOpsRightFloatingDockFrame>");
    expect(source).toContain("</NexusOpsRightFloatingDockFrame>");
    expect(source).toContain("<NexusOpsTopBarFrame>");
    expect(source).toContain("</NexusOpsTopBarFrame>");
    expect(bodyFrameSource).toContain('className="flex min-h-0 flex-1 gap-2 p-2"');
    expect(bodyFrameSource).toContain(
      "var(--nexus-body-frame-bg, rgb(18 18 18))",
    );
    expect(source).toContain("const workspaceBodyMaterialStyle");
    expect(source).toContain("...workspaceBodyMaterialStyle");
    expect(source).toContain("style={workspaceBodyMaterialStyle}");
    expect(
      source.match(/style=\{workspaceBodyMaterialStyle\}/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
    expect(outerShellFrameSource).toContain('className="nexus-shell');
    expect(rightFloatingDockFrameSource).toContain(
      'aria-label="Right workspace tools"',
    );
    expect(rightFloatingDockFrameSource).toContain(
      'className="pointer-events-none fixed right-3 top-1/2 z-[130] hidden -translate-y-1/2 xl:block"',
    );
    expect(rightFloatingDockFrameSource).toContain(
      'className="nexus-right-floating-dock-rail pointer-events-auto grid gap-2 border border-white/10 bg-black/35 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl"',
    );
    expect(topBarFrameSource).toContain(
      'className="nexus-top-bar-frame relative z-[110] flex h-11 shrink-0 items-center border-b border-white/10 px-3"',
    );
    expect(topBarFrameSource).toContain(
      "var(--nexus-body-frame-bg, color-mix(in srgb, var(--theme-primary, #e5e5e5) 10%, rgb(16 16 16 / 0.84)))",
    );
    expect(source).toContain('className="nexus-workspace');
    expect(source).toContain('className="nexus-panel');
    expect(source).toContain("<TopBar");
    expect(source).toContain("<LeftDock");
    expect(source).toContain("<RightFloatingDock");
    expect(source).toContain("<AgentSettingsSidebar");
    expect(source).toContain("<CommandPalette");
  });
});

function readNexusOpsSource() {
  return readFileSync(new URL("nexus-ops.tsx", import.meta.url), "utf8");
}

function readBodyFrameSource() {
  return readFileSync(new URL("nexus-ops-body-frame.tsx", import.meta.url), "utf8");
}

function readOuterShellFrameSource() {
  return readFileSync(
    new URL("nexus-ops-outer-shell-frame.tsx", import.meta.url),
    "utf8",
  );
}

function readRightFloatingDockFrameSource() {
  return readFileSync(
    new URL("nexus-ops-right-floating-dock-frame.tsx", import.meta.url),
    "utf8",
  );
}

function readTopBarFrameSource() {
  return readFileSync(
    new URL("nexus-ops-top-bar-frame.tsx", import.meta.url),
    "utf8",
  );
}
