import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus Style Lab Surface Style Ops coverage panel", () => {
  it("renders the Surface Style Ops coverage report and fixture loader", () => {
    const source = readStyleLabSource();

    expect(source).toContain("Surface Style Ops Coverage");
    expect(source).toContain('data-testid="surface-style-ops-coverage-panel"');
    expect(source).toContain('data-testid="surface-style-ops-load-fixture"');
    expect(source).toContain("loadSurfaceStyleSkinPackFixture");
    expect(source).toContain("createSurfaceStyleOpsSkinPackV2Fixture");
    expect(source).toContain("surfaceStyleOpsCoverageFamilies");
    expect(source).toContain("surfaceStyleOpsGapRows");
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

  it("renders a Style Runtime Preview Preflight Gate from budget and diagnostics evidence", () => {
    const source = readStyleLabSource();

    expect(source).toContain("Style Runtime Preview Preflight Gate");
    expect(source).toContain(
      'data-testid="style-runtime-preview-preflight-gate"',
    );
    expect(source).toContain(
      'data-testid="style-runtime-preview-preflight-verdict"',
    );
    expect(source).toContain(
      'data-testid="style-runtime-preview-preflight-next-action"',
    );
    expect(source).toContain(
      'data-testid="style-runtime-preview-preflight-evidence"',
    );
    expect(source).toContain("Style Lab only / not production authorization");
    expect(source).toContain("StyleRuntimePreviewPreflightVerdict");
    expect(source).toContain('verdict: "PASS"');
    expect(source).toContain('verdict: "HOLD"');
    expect(source).toContain('verdict: "BLOCK"');
    expect(source).toContain("Budget is safe, but local diagnostics have not completed.");
    expect(source).toContain(
      "Budget is safe and local apply/revert completed with residue pass.",
    );
    expect(source).toContain("Run local apply/revert smoke");
    expect(source).toContain("Ready for preview diagnostics evidence");
    expect(source).toContain("styleRuntimePreviewPreflight.evidenceRows");
    expect(source).toContain("styleRuntimePreviewDiagnostics.status");
    expect(source).toContain("styleRuntimePreviewDiagnostics.residueCheck");
    expect(source).toContain("surfaceStyleStyleRuntimeBudgetSummary.verdict");
    expect(source).toContain("surfaceStyleStyleRuntimeBudgetSummary.checksum");
  });

  it("renders a local Surface Style scene preview with supported and missing capability groups", () => {
    const source = readStyleLabSource();

    expect(source).toContain("Surface Style Scene Preview");
    expect(source).toContain('data-testid="surface-style-scene-preview-panel"');
    expect(source).toContain('data-testid="surface-style-scene-preview-target"');
    expect(source).toContain('data-testid="surface-style-scene-agent-bank"');
    expect(source).toContain('data-testid="surface-style-scene-workspace-board"');
    expect(source).toContain('data-testid="surface-style-scene-metrics-panel"');
    expect(source).toContain('data-testid={`surface-style-scene-${group.id}`}');
    expect(source).toContain('id: "supported"');
    expect(source).toContain('id: "simulated"');
    expect(source).toContain('id: "missing"');
    expect(source).toContain("surfaceStyleScenePreviewVariables");
    expect(source).toContain("--nexus-agent-window-bg");
    expect(source).toContain("--nexus-command-palette-bg");
    expect(source).toContain("--nexus-modal-shell-bg");
    expect(source).toContain("--nexus-datapad-shell-bg");
  });

  it("renders a static Surface Style right metrics recipe specimen", () => {
    const source = readStyleLabSource();

    expect(source).toContain("surfaceStyleRightMetricsGoalRows");
    expect(source).toContain("surfaceStyleRightMetricsContextRows");
    expect(source).toContain("surfaceStyleRightMetricsHistoryRows");
    expect(source).toContain("surfaceStyleRightMetricsSpecimenStyle");
    expect(source).toContain('data-testid="surface-style-right-metrics-specimen"');
    expect(source).toContain(
      'data-testid="surface-style-right-metrics-selected-agent"',
    );
    expect(source).toContain(
      'data-testid="surface-style-right-metrics-collaboration-map"',
    );
    expect(source).toContain(
      'data-testid="surface-style-right-metrics-context-stack"',
    );
    expect(source).toContain(
      'data-testid="surface-style-right-metrics-goal-metrics"',
    );
    expect(source).toContain(
      'data-testid="surface-style-right-metrics-run-execution"',
    );
    expect(source).toContain(
      'data-testid="surface-style-right-metrics-memory-history"',
    );
  });

  it("renders a static Surface Style agent card bank recipe specimen", () => {
    const source = readStyleLabSource();

    expect(source).toContain("surfaceStyleAgentCardRows");
    expect(source).toContain("surfaceStyleAgentBankSpecimenStyle");
    expect(source).toContain('data-testid="surface-style-agent-card-bank-specimen"');
    expect(source).toContain('data-testid="surface-style-agent-card-bank-header"');
    expect(source).toContain('data-testid="surface-style-agent-card-bank-roster"');
    expect(source).toContain('data-testid="surface-style-agent-card-bank-action"');
    expect(source).toContain('data-testid="surface-style-agent-card-avatar"');
    expect(source).toContain(
      'data-testid="surface-style-agent-status-indicator"',
    );
    expect(source).toContain("Architect");
    expect(source).toContain("Explorer");
    expect(source).toContain("Sentinel");
    expect(source).toContain("Auditor");
    expect(source).toContain("Steward");
  });

  it("renders a static Surface Style segmented top navigation recipe specimen", () => {
    const source = readStyleLabSource();

    expect(source).toContain("surfaceStyleSegmentedNavRows");
    expect(source).toContain("surfaceStyleSegmentedNavCounters");
    expect(source).toContain("surfaceStyleSegmentedNavSpecimenStyle");
    expect(source).toContain(
      'data-testid="surface-style-segmented-top-nav-specimen"',
    );
    expect(source).toContain("surface-style-segmented-active-segment");
    expect(source).toContain(
      'data-testid="surface-style-segmented-top-nav-counters"',
    );
    expect(source).toContain(
      'data-testid="surface-style-segmented-top-nav-actions"',
    );
    expect(source).toContain("View: Panels");
    expect(source).toContain("View: Graph");
    expect(source).toContain("Surface Shell");
    expect(source).toContain("Apple");
    expect(source).toContain("Tesla");
    expect(source).toContain("Terminal");
    expect(source).toContain("Agents");
    expect(source).toContain("Streams");
    expect(source).toContain("Tokens");
    expect(source).toContain("Tasks");
  });

  it("renders a static Surface Style icon and button chrome recipe specimen", () => {
    const source = readStyleLabSource();

    expect(source).toContain("surfaceStyleControlChromeIconButtons");
    expect(source).toContain("surfaceStyleControlChromeStatusBadges");
    expect(source).toContain("surfaceStyleControlChromeAffordances");
    expect(source).toContain("surfaceStyleControlChromeCapabilityRows");
    expect(source).toContain(
      'data-testid="surface-style-control-chrome-specimen"',
    );
    expect(source).toContain(
      'data-testid="surface-style-control-icon-action-cluster"',
    );
    expect(source).toContain('data-testid="surface-style-control-command-field"');
    expect(source).toContain(
      'data-testid="surface-style-primary-action-button"',
    );
    expect(source).toContain(
      'data-testid="surface-style-secondary-action-button"',
    );
    expect(source).toContain(
      'data-testid="surface-style-control-status-badges"',
    );
    expect(source).toContain(
      'data-testid="surface-style-control-affordance-examples"',
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
      /surfaceStyleOps[\s\S]*document\.documentElement/,
      /surfaceStyleOps[\s\S]*window\.localStorage/,
      /surfaceStyleOps[\s\S]*indexedDB/,
      /surfaceStyleScene[\s\S]*document\.documentElement/,
      /surfaceStyleScene[\s\S]*window\.localStorage/,
      /surfaceStyleScene[\s\S]*indexedDB/,
      /surfaceStyleScene[\s\S]*fetch\s*\(/,
      /surfaceStyleScene[\s\S]*https?:\/\//,
      /surfaceStyleScene[\s\S]*\burl\s*\(/,
      /surfaceStyleRightMetrics[\s\S]*document\.documentElement/,
      /surfaceStyleRightMetrics[\s\S]*window\.localStorage/,
      /surfaceStyleRightMetrics[\s\S]*indexedDB/,
      /surfaceStyleRightMetrics[\s\S]*fetch\s*\(/,
      /surfaceStyleRightMetrics[\s\S]*https?:\/\//,
      /surfaceStyleRightMetrics[\s\S]*\burl\s*\(/,
      /surfaceStyleAgent[\s\S]*document\.documentElement/,
      /surfaceStyleAgent[\s\S]*window\.localStorage/,
      /surfaceStyleAgent[\s\S]*indexedDB/,
      /surfaceStyleAgent[\s\S]*fetch\s*\(/,
      /surfaceStyleAgent[\s\S]*https?:\/\//,
      /surfaceStyleAgent[\s\S]*\burl\s*\(/,
      /surfaceStyleSegmented[\s\S]*document\.documentElement/,
      /surfaceStyleSegmented[\s\S]*window\.localStorage/,
      /surfaceStyleSegmented[\s\S]*indexedDB/,
      /surfaceStyleSegmented[\s\S]*fetch\s*\(/,
      /surfaceStyleSegmented[\s\S]*https?:\/\//,
      /surfaceStyleSegmented[\s\S]*\burl\s*\(/,
      /surfaceStyleControlChrome[\s\S]*document\.documentElement/,
      /surfaceStyleControlChrome[\s\S]*window\.localStorage/,
      /surfaceStyleControlChrome[\s\S]*indexedDB/,
      /surfaceStyleControlChrome[\s\S]*fetch\s*\(/,
      /surfaceStyleControlChrome[\s\S]*https?:\/\//,
      /surfaceStyleControlChrome[\s\S]*\burl\s*\(/,
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
      /styleRuntimePreviewPreflight[\s\S]*document\.documentElement/,
      /styleRuntimePreviewPreflight[\s\S]*window\.localStorage/,
      /styleRuntimePreviewPreflight[\s\S]*indexedDB/,
      /styleRuntimePreviewPreflight[\s\S]*fetch\s*\(/,
      /styleRuntimePreviewPreflight[\s\S]*https?:\/\//,
      /styleRuntimePreviewPreflight[\s\S]*\burl\s*\(/,
    ];

    expect(source).toContain("createSurfaceStyleOpsProductionAliasCoverageReportV1");
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
