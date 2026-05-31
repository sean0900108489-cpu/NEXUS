import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus Style Lab Warm Glass Ops coverage panel", () => {
  it("renders the Warm Glass Ops coverage report and fixture loader", () => {
    const source = readStyleLabSource();

    expect(source).toContain("Warm Glass Ops Coverage");
    expect(source).toContain('data-testid="warm-glass-ops-coverage-panel"');
    expect(source).toContain('data-testid="warm-glass-ops-load-fixture"');
    expect(source).toContain("loadWarmGlassSkinPackFixture");
    expect(source).toContain("createWarmGlassOpsSkinPackV2Fixture");
    expect(source).toContain("warmGlassOpsCoverageFamilies");
    expect(source).toContain("warmGlassOpsGapRows");
    expect(source).toContain("directAliasCoveragePercent");
    expect(source).toContain("directlyDrivenAliasCount");
    expect(source).toContain("totalAliasCount");
  });

  it("renders a local Warm Glass scene preview with supported and missing capability groups", () => {
    const source = readStyleLabSource();

    expect(source).toContain("Warm Glass Scene Preview");
    expect(source).toContain('data-testid="warm-glass-scene-preview-panel"');
    expect(source).toContain('data-testid="warm-glass-scene-preview-target"');
    expect(source).toContain('data-testid="warm-glass-scene-agent-bank"');
    expect(source).toContain('data-testid="warm-glass-scene-workspace-board"');
    expect(source).toContain('data-testid="warm-glass-scene-metrics-panel"');
    expect(source).toContain('data-testid={`warm-glass-scene-${group.id}`}');
    expect(source).toContain('id: "supported"');
    expect(source).toContain('id: "simulated"');
    expect(source).toContain('id: "missing"');
    expect(source).toContain("warmGlassScenePreviewVariables");
    expect(source).toContain("--nexus-agent-window-bg");
    expect(source).toContain("--nexus-command-palette-bg");
    expect(source).toContain("--nexus-modal-shell-bg");
    expect(source).toContain("--nexus-datapad-shell-bg");
  });

  it("renders a static Warm Glass right metrics recipe specimen", () => {
    const source = readStyleLabSource();

    expect(source).toContain("warmGlassRightMetricsGoalRows");
    expect(source).toContain("warmGlassRightMetricsContextRows");
    expect(source).toContain("warmGlassRightMetricsHistoryRows");
    expect(source).toContain("warmGlassRightMetricsSpecimenStyle");
    expect(source).toContain('data-testid="warm-glass-right-metrics-specimen"');
    expect(source).toContain(
      'data-testid="warm-glass-right-metrics-selected-agent"',
    );
    expect(source).toContain(
      'data-testid="warm-glass-right-metrics-collaboration-map"',
    );
    expect(source).toContain(
      'data-testid="warm-glass-right-metrics-context-stack"',
    );
    expect(source).toContain(
      'data-testid="warm-glass-right-metrics-goal-metrics"',
    );
    expect(source).toContain(
      'data-testid="warm-glass-right-metrics-run-execution"',
    );
    expect(source).toContain(
      'data-testid="warm-glass-right-metrics-memory-history"',
    );
  });

  it("renders a static Warm Glass agent card bank recipe specimen", () => {
    const source = readStyleLabSource();

    expect(source).toContain("warmGlassAgentCardRows");
    expect(source).toContain("warmGlassAgentBankSpecimenStyle");
    expect(source).toContain('data-testid="warm-glass-agent-card-bank-specimen"');
    expect(source).toContain('data-testid="warm-glass-agent-card-bank-header"');
    expect(source).toContain('data-testid="warm-glass-agent-card-bank-roster"');
    expect(source).toContain('data-testid="warm-glass-agent-card-bank-action"');
    expect(source).toContain('data-testid="warm-glass-agent-card-avatar"');
    expect(source).toContain(
      'data-testid="warm-glass-agent-status-indicator"',
    );
    expect(source).toContain("Architect");
    expect(source).toContain("Explorer");
    expect(source).toContain("Sentinel");
    expect(source).toContain("Auditor");
    expect(source).toContain("Steward");
  });

  it("renders a static Warm Glass segmented top navigation recipe specimen", () => {
    const source = readStyleLabSource();

    expect(source).toContain("warmGlassSegmentedNavRows");
    expect(source).toContain("warmGlassSegmentedNavCounters");
    expect(source).toContain("warmGlassSegmentedNavSpecimenStyle");
    expect(source).toContain(
      'data-testid="warm-glass-segmented-top-nav-specimen"',
    );
    expect(source).toContain("warm-glass-segmented-active-segment");
    expect(source).toContain(
      'data-testid="warm-glass-segmented-top-nav-counters"',
    );
    expect(source).toContain(
      'data-testid="warm-glass-segmented-top-nav-actions"',
    );
    expect(source).toContain("View: Panels");
    expect(source).toContain("View: Graph");
    expect(source).toContain("Cyberpunk");
    expect(source).toContain("Apple");
    expect(source).toContain("Tesla");
    expect(source).toContain("Terminal");
    expect(source).toContain("Agents");
    expect(source).toContain("Streams");
    expect(source).toContain("Tokens");
    expect(source).toContain("Tasks");
  });

  it("keeps the coverage panel detached from production runtime mutation", () => {
    const source = readStyleLabSource();
    const forbiddenPatterns = [
      /from\s+["']@\/components\/nexus\/nexus-ops["']/,
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/sync\//,
      /from\s+["']@\/lib\/supabase\//,
      /\bfetch\s*\(/,
      /\bsupabase\b/i,
      /warmGlassOps[\s\S]*document\.documentElement/,
      /warmGlassOps[\s\S]*window\.localStorage/,
      /warmGlassOps[\s\S]*indexedDB/,
      /warmGlassScene[\s\S]*document\.documentElement/,
      /warmGlassScene[\s\S]*window\.localStorage/,
      /warmGlassScene[\s\S]*indexedDB/,
      /warmGlassScene[\s\S]*fetch\s*\(/,
      /warmGlassScene[\s\S]*https?:\/\//,
      /warmGlassScene[\s\S]*\burl\s*\(/,
      /warmGlassRightMetrics[\s\S]*document\.documentElement/,
      /warmGlassRightMetrics[\s\S]*window\.localStorage/,
      /warmGlassRightMetrics[\s\S]*indexedDB/,
      /warmGlassRightMetrics[\s\S]*fetch\s*\(/,
      /warmGlassRightMetrics[\s\S]*https?:\/\//,
      /warmGlassRightMetrics[\s\S]*\burl\s*\(/,
      /warmGlassAgent[\s\S]*document\.documentElement/,
      /warmGlassAgent[\s\S]*window\.localStorage/,
      /warmGlassAgent[\s\S]*indexedDB/,
      /warmGlassAgent[\s\S]*fetch\s*\(/,
      /warmGlassAgent[\s\S]*https?:\/\//,
      /warmGlassAgent[\s\S]*\burl\s*\(/,
      /warmGlassSegmented[\s\S]*document\.documentElement/,
      /warmGlassSegmented[\s\S]*window\.localStorage/,
      /warmGlassSegmented[\s\S]*indexedDB/,
      /warmGlassSegmented[\s\S]*fetch\s*\(/,
      /warmGlassSegmented[\s\S]*https?:\/\//,
      /warmGlassSegmented[\s\S]*\burl\s*\(/,
    ];

    expect(source).toContain("createWarmGlassOpsProductionAliasCoverageReportV1");
    expect(source).not.toContain("asset-background-image");
    expect(source).not.toContain("ChatGPT Image 2026");
    expect(source).not.toContain("/Users/sean/Downloads");

    for (const pattern of forbiddenPatterns) {
      expect(source, `Style Lab coverage should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});

function readStyleLabSource() {
  return readFileSync(new URL("nexus-style-lab.tsx", import.meta.url), "utf8");
}
