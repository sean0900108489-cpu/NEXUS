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
    ];

    expect(source).toContain("createWarmGlassOpsProductionAliasCoverageReportV1");
    expect(source).not.toContain("asset-background-image");

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
