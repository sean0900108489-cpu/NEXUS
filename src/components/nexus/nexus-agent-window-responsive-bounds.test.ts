import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { clampAgentWindowLayoutToBounds } from "@/components/nexus/nexus-agent-window";

describe("Nexus agent window responsive bounds", () => {
  const agentWindowSource = readFileSync(
    new URL("nexus-agent-window.tsx", import.meta.url),
    "utf8",
  );
  const nexusOpsSource = readFileSync(
    new URL("nexus-ops.tsx", import.meta.url),
    "utf8",
  );
  const agentWindowFunctionSource =
    agentWindowSource.match(/export function AgentWindow\([\s\S]*$/)?.[0] ?? "";

  it("passes current workspace bounds into panel agent windows", () => {
    expect(nexusOpsSource).toContain("workspaceBounds={workspaceSize}");
    expect(agentWindowFunctionSource).toContain("workspaceBounds");
  });

  it("refreshes workspace bounds on window resize as well as ResizeObserver", () => {
    expect(nexusOpsSource).toContain("new ResizeObserver(updateSize)");
    expect(nexusOpsSource).toContain('window.addEventListener("resize", updateSize)');
    expect(nexusOpsSource).toContain(
      'window.removeEventListener("resize", updateSize)',
    );
    expect(nexusOpsSource).toContain("WORKSPACE_SIZE_REMEASURE_INTERVAL_MS");
    expect(nexusOpsSource).toContain("window.setInterval(");
    expect(nexusOpsSource).toContain(
      "window.clearInterval(workspaceSizeInterval)",
    );
  });

  it("clamps rendered Rnd geometry to the current workspace bounds", () => {
    expect(agentWindowSource).toContain("AGENT_WINDOW_BOUNDS_MARGIN");
    expect(agentWindowSource).toContain("AGENT_WINDOW_COMPACT_MIN_WIDTH");
    expect(agentWindowSource).toContain("AGENT_WINDOW_COMPACT_MIN_HEIGHT");
    expect(agentWindowSource).toContain(
      "AGENT_WINDOW_BOUNDS_REMEASURE_INTERVAL_MS",
    );
    expect(agentWindowSource).toContain('closest(".nexus-workspace")');
    expect(agentWindowSource).toContain("export function clampAgentWindowLayoutToBounds");
    expect(agentWindowFunctionSource).toContain("effectiveLayout");
    expect(agentWindowFunctionSource).toContain("effectiveWorkspaceBounds");
    expect(agentWindowFunctionSource).toContain("effectiveMinWidth");
    expect(agentWindowFunctionSource).toContain("effectiveMinHeight");
    expect(agentWindowFunctionSource).toContain(
      "position={{ x: effectiveLayout.x, y: effectiveLayout.y }}",
    );
    expect(agentWindowFunctionSource).toContain(
      "size={{ width: effectiveLayout.width, height: effectiveLayout.height }}",
    );
    expect(agentWindowFunctionSource).not.toContain(
      "position={{ x: agent.layout.x, y: agent.layout.y }}",
    );
    expect(agentWindowFunctionSource).not.toContain(
      "size={{ width: agent.layout.width, height: agent.layout.height }}",
    );
  });

  it("keeps the stored layout unchanged until workspace bounds are available", () => {
    const layout = {
      x: 900,
      y: 120,
      width: 520,
      height: 500,
      zIndex: 7,
    };

    expect(clampAgentWindowLayoutToBounds(layout, undefined)).toEqual(layout);
  });

  it("scales desktop panel windows proportionally before applying edge safety", () => {
    const largeScreenLayout = {
      x: 900,
      y: 120,
      width: 520,
      height: 500,
      zIndex: 7,
    };

    const layout = clampAgentWindowLayoutToBounds(largeScreenLayout, {
      width: 1100,
      height: 900,
    });
    const positionScale = layout.x / largeScreenLayout.x;
    const widthScale = layout.width / largeScreenLayout.width;
    const heightScale = layout.height / largeScreenLayout.height;

    expect(layout.width).toBeLessThan(largeScreenLayout.width);
    expect(layout.height).toBeLessThan(largeScreenLayout.height);
    expect(layout.x).toBeGreaterThan(600);
    expect(positionScale).toBeCloseTo(widthScale, 1);
    expect(heightScale).toBeCloseTo(widthScale, 1);
    expect(layout.x + layout.width).toBeLessThanOrEqual(1088);
  });
});
