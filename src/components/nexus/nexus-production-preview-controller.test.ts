import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus production preview controller first cut", () => {
  const source = readFileSync(
    new URL("nexus-production-preview-controller.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("../../app/page.tsx", import.meta.url),
    "utf8",
  );

  it("targets only the approved outer shell frame selector", () => {
    expect(source).toContain(
      "NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR",
    );
    expect(source).toContain("document.querySelectorAll<HTMLElement>");
    expect(source).toContain(
      "data-nexus-production-preview-controller=\"first-cut\"",
    );
    expect(source).toContain("productionPreviewControllerStyle");
    expect(source).toContain("data-nexus-production-preview-label=\"temporary\"");
    expect(source).toContain("Preview test");
    expect(pageSource).toContain("nexusPreviewFirstCut");
    expect(pageSource).toContain("enabled={productionPreviewFirstCutEnabled}");
    expect(source).toContain(
      "data-nexus-production-preview-action=\"apply\"",
    );
    expect(source).toContain(
      "data-nexus-production-preview-action=\"revert\"",
    );
  });

  it("keeps production preview local, non-persistent, and free of backend coupling", () => {
    const forbiddenPatterns = [
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/sync\//,
      /from\s+["']@\/lib\/supabase\//,
      /from\s+["']@\/app\/api\//,
      /\blocalStorage\b/,
      /\bindexedDB\b/,
      /\bfetch\s*\(/,
      /\.documentElement\.style/,
      /\.body\.style/,
      /document\.body/,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source, `controller should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  it("contains fail-closed target count, preflight, and rollback evidence checks", () => {
    expect(source).toContain("targetCount: targets.length");
    expect(source).toContain("plan.verdict !== \"ready\"");
    expect(source).toContain("preflight.verdict");
    expect(source).toContain("hasAuthenticatedEvidence: true");
    expect(source).toContain("hasRollbackPlan: true");
    expect(source).toContain("production-route-container");
    expect(source).toContain("Production preview first cut is disabled.");
  });

  it("restores previous inline values and removes introduced variables through the transaction planner", () => {
    expect(source).toContain("snapshotInlineValues");
    expect(source).toContain("createProductionPreviewRevertPlan");
    expect(source).toContain("target.style.removeProperty(operation.name)");
    expect(source).toContain("target.style.setProperty(operation.name");
    expect(source).toContain("createProductionPreviewResidueCheck");
  });
});
