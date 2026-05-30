import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Home route production page shell guard", () => {
  it("keeps NexusOps wrapped by the inert production page shell boundary", () => {
    const source = readPageSource();

    expect(source).toMatch(
      /import\s+\{\s*NexusProductionPageShellBoundary\s*\}\s+from\s+["']@\/components\/nexus\/nexus-production-page-shell-boundary["'];/,
    );
    expect(source).toMatch(
      /<NexusProductionPageShellBoundary\s+shellId="workspace">[\s\S]*?<NexusOps\s*\/>[\s\S]*?<\/NexusProductionPageShellBoundary>/,
    );
  });

  it("keeps the production page shell id fixed to workspace", () => {
    const source = readPageSource();

    expect(source).toContain('shellId="workspace"');
    expect(source).not.toMatch(/shellId=\{[^}]+\}/);
    expect(source).not.toMatch(/shellId="(home|settings|styleLab)"/);
  });

  it("does not import style-engine registries, layout presets, render plans, or token bridge modules", () => {
    const source = readPageSource();
    const forbiddenPatterns = [
      /from\s+["']@\/lib\/style-engine(?:\/|["'])/,
      /v2-[^"']*registry/i,
      /layout[-_\s]?preset/i,
      /feature[-_\s]?registry/i,
      /render[-_\s]?plan/i,
      /token[-_\s]?bridge/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source, `page.tsx should not match ${pattern}`).not.toMatch(pattern);
    }
  });

  it("does not import store, sync, backend, Supabase, API, or routing authority", () => {
    const source = readPageSource();
    const forbiddenPatterns = [
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/sync\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/supabase\//,
      /from\s+["']@supabase\//,
      /from\s+["']@\/app\/api\//,
      /from\s+["']next\/navigation["']/,
      /\buseRouter\b/,
      /\bredirect\s*\(/,
      /\brouter\./,
      /\bfetch\s*\(/,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source, `page.tsx should not match ${pattern}`).not.toMatch(pattern);
    }
  });

  it("does not expose route or layout feature placement authority", () => {
    const source = readPageSource();
    const forbiddenPatterns = [
      /\bfeaturePlacement\b/i,
      /\bfeatureMount\b/i,
      /\bslotArrangement\b/i,
      /\blayoutPreset\b/i,
      /\bpageShellRegistry\b/i,
      /\bfeatureRegistry\b/i,
      /\bcomponentPath\b/i,
      /\bdynamicImport\b/i,
      /\bdynamic\s*\(/,
      /\bposition\s*:/,
      /\boverflow\s*:/,
      /\bzIndex\b/,
      /\bpointerEvents\b/,
      /\bon[A-Z][A-Za-z]+\s*=/,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source, `page.tsx should not match ${pattern}`).not.toMatch(pattern);
    }
  });
});

function readPageSource() {
  return readFileSync(new URL("page.tsx", import.meta.url), "utf8");
}
