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

  it("renders an ROI-gated Style Runtime Budget read-only report", () => {
    const source = readStyleLabSource();

    expect(source).toContain("Style Runtime Budget");
    expect(source).toContain('data-testid="style-runtime-budget-panel"');
    expect(source).toContain('data-testid="style-runtime-budget-verdict"');
    expect(source).toContain('data-testid="style-runtime-budget-eligibility"');
    expect(source).toContain('data-testid="style-runtime-budget-traceability"');
    expect(source).toContain(
      'data-testid="style-runtime-budget-degradation-hints"',
    );
    expect(source).toContain("createStyleRuntimeBudgetSummaryFromRenderPlan");
    expect(source).toContain("createStyleRuntimeBudgetSummary");
    expect(source).toContain("styleRuntimeBudgetEligibility");
    expect(source).toContain("Preview Diagnostics");
    expect(source).toContain("CSS Vars");
    expect(source).toContain("Apply Cost");
    expect(source).toContain("High-Cost FX");
    expect(source).toContain("Critical Gaps");
    expect(source).toContain("Checksum");
    expect(source).toContain("Direct Aliases");
    expect(source).toContain("Families");
  });

  it("renders local Style Runtime Preview Diagnostics for smoke apply and revert", () => {
    const source = readStyleLabSource();

    expect(source).toContain("Style Runtime Preview Diagnostics");
    expect(source).toContain(
      'data-testid="style-runtime-preview-diagnostics-panel"',
    );
    expect(source).toContain(
      'data-testid="style-runtime-preview-diagnostics-status"',
    );
    expect(source).toContain(
      'data-testid="style-runtime-preview-diagnostics-eligibility"',
    );
    expect(source).toContain(
      'data-testid="style-runtime-preview-diagnostics-trace"',
    );
    expect(source).toContain("styleRuntimePreviewDiagnosticsTargetScope");
    expect(source).toContain("style-lab-production-chrome-smoke");
    expect(source).toContain("applyDurationMs");
    expect(source).toContain("revertDurationMs");
    expect(source).toContain("residueCheck");
    expect(source).toContain("sessionId");
    expect(source).toContain("performance?.now");
    expect(source).toContain("countProductionChromeSmokeInlineVariables");
    expect(source).toContain("productionChromeSmokeTargetRef.current");
    expect(source).toContain("target.style.setProperty");
    expect(source).toContain("target.style.removeProperty");
    expect(source).toContain("failStyleRuntimePreviewDiagnostics");
    expect(source).toContain("No smoke variables available; apply failed closed.");
    expect(source).toContain("Smoke target ref missing; apply failed closed.");
    expect(source).toContain("Smoke target ref missing; revert failed closed.");
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

  it("renders a static Warm Glass icon and button chrome recipe specimen", () => {
    const source = readStyleLabSource();

    expect(source).toContain("warmGlassControlChromeIconButtons");
    expect(source).toContain("warmGlassControlChromeStatusBadges");
    expect(source).toContain("warmGlassControlChromeAffordances");
    expect(source).toContain("warmGlassControlChromeCapabilityRows");
    expect(source).toContain(
      'data-testid="warm-glass-control-chrome-specimen"',
    );
    expect(source).toContain(
      'data-testid="warm-glass-control-icon-action-cluster"',
    );
    expect(source).toContain('data-testid="warm-glass-control-command-field"');
    expect(source).toContain(
      'data-testid="warm-glass-primary-action-button"',
    );
    expect(source).toContain(
      'data-testid="warm-glass-secondary-action-button"',
    );
    expect(source).toContain(
      'data-testid="warm-glass-control-status-badges"',
    );
    expect(source).toContain(
      'data-testid="warm-glass-control-affordance-examples"',
    );
    expect(source).toContain("Run Execution");
    expect(source).toContain("Sync Analysis");
    expect(source).toContain("Transmit mission packet");
    expect(source).toContain("Live");
    expect(source).toContain("Idle");
    expect(source).toContain("Syncing");
    expect(source).toContain("Local");
    expect(source).toContain("Supported now");
    expect(source).toContain("Specimen only");
    expect(source).toContain("Missing");
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
      /warmGlassControlChrome[\s\S]*document\.documentElement/,
      /warmGlassControlChrome[\s\S]*window\.localStorage/,
      /warmGlassControlChrome[\s\S]*indexedDB/,
      /warmGlassControlChrome[\s\S]*fetch\s*\(/,
      /warmGlassControlChrome[\s\S]*https?:\/\//,
      /warmGlassControlChrome[\s\S]*\burl\s*\(/,
      /styleRuntimeBudget[\s\S]*document\.documentElement/,
      /styleRuntimeBudget[\s\S]*window\.localStorage/,
      /styleRuntimeBudget[\s\S]*indexedDB/,
      /styleRuntimeBudget[\s\S]*fetch\s*\(/,
      /styleRuntimeBudget[\s\S]*https?:\/\//,
      /styleRuntimeBudget[\s\S]*\burl\s*\(/,
      /styleRuntimePreviewDiagnostics[\s\S]*document\.documentElement/,
      /styleRuntimePreviewDiagnostics[\s\S]*window\.localStorage/,
      /styleRuntimePreviewDiagnostics[\s\S]*indexedDB/,
      /styleRuntimePreviewDiagnostics[\s\S]*fetch\s*\(/,
      /styleRuntimePreviewDiagnostics[\s\S]*https?:\/\//,
      /styleRuntimePreviewDiagnostics[\s\S]*\burl\s*\(/,
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
